/* Roots · Living Tree. Loads /roots/data/<tree>.json at runtime; no build step for the page itself. */
(function () {
"use strict";
const TREE = document.body.dataset.tree || "brandon";
const BASE = "/roots/";
const DATA_URL = BASE + "data/" + TREE + ".json";
const SLOT = 170, CW = 152, CH = 62, ROWH = 124, PADX = 120, PADY = 70;
const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ic = (k, st) => (I[k] || "").replace('class="ico"', `class="ico"${st ? ` style="${st}"` : ""}`);
const isMobile = () => matchMedia("(max-width: 760px)").matches;
const RATING_LABEL = { proven: "Proven", probable: "Probable", compiled: "Compiled", hypothesis: "Hypothesis", family: "Family-provided", claim: "Family claim" };
const WAR = {
  rev: { label: "Revolutionary War", short: "Rev. War", icon: "flag", cls: "rev" },
  "1812": { label: "War of 1812", short: "War of 1812", icon: "flag", cls: "" },
  civil: { label: "Civil War", short: "Civil War", icon: "swords", cls: "cw" },
  ww1: { label: "World War I", short: "WWI", icon: "star", cls: "ww" },
  ww2: { label: "World War II", short: "WWII", icon: "star", cls: "" },
  korea: { label: "Korea", short: "Korea", icon: "star", cls: "" },
  vietnam: { label: "Vietnam", short: "Vietnam", icon: "star", cls: "" },
  service: { label: "Military service", short: "Service", icon: "star", cls: "" },
};
const WAR_ORDER = ["rev", "1812", "civil", "ww1", "ww2", "korea", "vietnam", "service"];

let D, P = {}, KIDS = {}, PRIV = null, FOCAL, LAYOUT, view = { s: 1, x: 0, y: 0 }, state = { sel: null, filter: null };

// ---------- data ----------
async function load() {
  const r = await fetch(DATA_URL, { cache: "no-cache" });
  if (!r.ok) throw new Error("Could not load " + DATA_URL);
  D = await r.json();
  P = {}; KIDS = {};
  for (const p of D.people) P[p.id] = p;
  for (const p of D.people) for (const q of p.par) (KIDS[q] = KIDS[q] || []).push(p.id);
  FOCAL = P[D.focal] ? D.focal : D.people[0].id;
  await tryAutoUnlock();
}
const YR = /\b(1[5-9]\d\d|20[0-2]\d)\b/;
const by = (id) => { const p = view_(id); const m = String((p.b && p.b.d) || "").match(YR); return m ? +m[1] : 9999; };
function view_(id) { // person merged with private details when unlocked
  const p = P[id]; if (!p) return null;
  if (PRIV && PRIV[id]) {
    const x = PRIV[id];
    if (x.full) return Object.assign({}, p, x, { liv: true, unlocked: true });
    if (x.extra) {
      const m = Object.assign({}, p);
      for (const [k, v] of Object.entries(x.extra)) {
        if (k === "relx") { m.rel = v; continue; }
        if (k === "milsrc") { if (m.mil) m.mil = Object.assign({}, m.mil, { src: m.mil.src.concat(v) }); }
        else m[k] = (m[k] || []).concat(v);
      }
      m.ev = (m.ev || []).slice().sort((a, b) => a.y - b.y); m.hasPrivExtra = true; return m;
    }
  }
  return p;
}
const kidsOf = (id) => (KIDS[id] || []).filter((k) => P[k]);
const parentsOf = (id) => (P[id] ? P[id].par : []);
function siblingsOf(id) {
  const s = new Set(); for (const q of parentsOf(id)) for (const k of kidsOf(q)) if (k !== id) s.add(k);
  return [...s].sort((a, b) => by(a) - by(b));
}
function fatherMother(id) {
  const par = parentsOf(id).filter((x) => P[x]);
  if (par.length < 2) return par;
  const f = par.find((x) => P[x].sex === "M") || par[0];
  const m = par.find((x) => x !== f);
  return [f, m];
}

// ---------- direct line + relationships ----------
let DIRECT = new Map(); // id -> generations above focal
function computeDirect() {
  DIRECT = new Map([[FOCAL, 0]]);
  const q = [FOCAL];
  while (q.length) { const id = q.shift(); for (const p of parentsOf(id)) if (P[p] && !DIRECT.has(p)) { DIRECT.set(p, DIRECT.get(id) + 1); q.push(p); } }
}
function relLabel(id) {
  const who = TREE === "holly" ? "Holly’s" : "Brandon’s";
  if (id === FOCAL) return TREE === "holly" ? "Holly" : "Brandon";
  const p = P[id];
  if (DIRECT.has(id)) {
    const g = DIRECT.get(id), w = p.sex === "F" ? "mother" : p.sex === "M" ? "father" : "parent";
    if (g === 1) return who + " " + w;
    if (g === 2) return who + " grand" + w;
    if (g === 3) return who + " great-grand" + w;
    return `${who} ${g - 2}× great-grand${w}`;
  }
  if (P[FOCAL].sp.includes(id)) return TREE === "holly" ? "Holly’s husband" : "Brandon’s wife";
  if (siblingsOf(FOCAL).includes(id)) return who + (p.sex === "F" ? " sister" : p.sex === "M" ? " brother" : " sibling");
  for (const [a, g] of DIRECT) if (g >= 1 && siblingsOf(a).includes(id)) {
    const w = p.sex === "F" ? "aunt" : p.sex === "M" ? "uncle" : "aunt/uncle";
    if (g === 1) return who + " " + w;
    if (g === 2) return who + " great-" + w;
    return `${who} ${g - 1}× great-${w}`;
  }
  for (const [a] of DIRECT) if (P[a].sp.includes(id)) return "Spouse of " + P[a].n;
  return "Relative";
}

// ---------- layout (contour-packed family blocks) ----------
function newBlock() { return { n: new Map(), c: new Map() }; }
function addNode(b, id, x, g) { b.n.set(id, { x, g }); const c = b.c.get(g); if (!c) b.c.set(g, [x, x]); else { c[0] = Math.min(c[0], x); c[1] = Math.max(c[1], x); } }
function shiftB(b, dx) { if (!dx) return; for (const v of b.n.values()) v.x += dx; for (const c of b.c.values()) { c[0] += dx; c[1] += dx; } }
function mergeB(a, b) { for (const [id, v] of b.n) addNode(a, id, v.x, v.g); return a; }
function sepNeeded(L, R, gap = 1) { let need = -Infinity; for (const [g, c] of R.c) { const l = L.c.get(g); if (l) need = Math.max(need, l[1] + gap - c[0]); } return need; }
function packRow(blocks, gap) {
  const out = newBlock(); let first = true;
  for (const b of blocks) { if (!first) { const d = sepNeeded(out, b, gap); if (d > -Infinity) shiftB(b, d); } mergeB(out, b); first = false; }
  return out;
}
function layout() {
  const placed = new Set(), reserved = new Set();
  function descBlock(x, g) {
    const b = newBlock(); placed.add(x); addNode(b, x, 0, g);
    let i = 1; for (const s of P[x].sp) if (P[s] && !placed.has(s) && !reserved.has(s)) { placed.add(s); addNode(b, s, i++, g); }
    const unit = [...b.n.keys()];
    const kids = []; const seen = new Set();
    for (const u of unit) for (const k of kidsOf(u)) if (!placed.has(k) && !seen.has(k)) { seen.add(k); kids.push(k); }
    kids.sort((a, c) => by(a) - by(c));
    const blocks = []; for (const k of kids) if (!placed.has(k)) blocks.push(descBlock(k, g - 1));
    if (blocks.length) {
      const kb = packRow(blocks, 1);
      const row = kids.map((k) => kb.n.get(k)).filter((v) => v && v.g === g - 1).map((v) => v.x);
      const kc = (Math.min(...row) + Math.max(...row)) / 2, uc = (i - 1) / 2;
      shiftB(kb, uc - kc);
      mergeB(b, kb);
    }
    return b;
  }
  function ancBlock(p, g, side) {
    const fm = fatherMother(p).filter((x) => x && !placed.has(x));
    const [f, m] = fm;
    let sibs = [];
    if (fm.length) { const s = new Set(); for (const q of fm) for (const k of kidsOf(q)) if (k !== p && !placed.has(k)) s.add(k); sibs = [...s].sort((a, c) => by(a) - by(c)); }
    let order;
    if (side === "R") order = sibs.concat([p]);
    else if (side === "L") order = [p].concat(sibs);
    else order = sibs.concat([p]).sort((a, c) => by(a) - by(c));
    placed.add(p); sibs.forEach((s) => placed.add(s)); fm.forEach((q) => placed.add(q));
    const blocks = order.map((id) => {
      if (id === p && side !== "C") {
        // p plus any other spouse (not the co-parent, which the caller places) on the outer side
        const b = newBlock(); addNode(b, p, 0, g); let j = 1;
        for (const s of P[p].sp) if (P[s] && !placed.has(s) && !reserved.has(s)) { placed.add(s); addNode(b, s, side === "R" ? -j : j, g); j++; }
        return b;
      }
      placed.delete(id); return descBlock(id, g);
    });
    fm.forEach((q) => placed.delete(q));
    const S = packRow(blocks, 1);
    if (!fm.length) return S;
    const sibCenter = () => { const xs = order.map((id) => S.n.get(id)).filter((v) => v && v.g === g).map((v) => v.x); return (Math.min(...xs) + Math.max(...xs)) / 2; };
    // place the sibship S inside the gap below its parents: as centred as possible, never overlapping
    const fitBetween = (Lb, Rb, desired, moveR) => {
      for (let it = 0; it < 6; it++) {
        const a = Lb ? sepNeeded(Lb, S, 1.15) : -Infinity;      // minimum shift
        const b = Rb ? -sepNeeded(S, Rb, 1.15) : Infinity;      // maximum shift
        if (a <= b + 1e-6) { shiftB(S, Math.min(Math.max(desired(), a), b)); return; }
        moveR(a - b);
      }
      shiftB(S, Math.max(0, Lb ? sepNeeded(Lb, S, 1.15) : 0));
    };
    if (fm.length === 2) {
      reserved.add(f); reserved.add(m);
      const BF = ancBlock(f, g + 1, "R"), BM = ancBlock(m, g + 1, "L");
      reserved.delete(f); reserved.delete(m);
      const d = Math.max(sepNeeded(BF, BM, 1.15), BF.n.get(f).x + 1 - BM.n.get(m).x);
      shiftB(BM, d);
      const center = () => (BF.n.get(f).x + BM.n.get(m).x) / 2;
      fitBetween(BF, BM, () => center() - sibCenter(), (dx) => shiftB(BM, dx));
      return mergeB(mergeB(BF, BM), S);
    }
    const q = fm[0];
    const B1 = ancBlock(q, g + 1, side === "L" ? "L" : side === "R" ? "R" : "C");
    fitBetween(B1, null, () => B1.n.get(q).x - sibCenter(), () => {});
    return mergeB(B1, S);
  }
  const main = ancBlock(FOCAL, 0, "C");
  const pos = {}; let minX = Infinity, maxX = -Infinity, minG = Infinity, maxG = -Infinity;
  for (const [id, v] of main.n) { pos[id] = { x: v.x, g: v.g }; minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x); minG = Math.min(minG, v.g); maxG = Math.max(maxG, v.g); }
  for (const v of Object.values(pos)) v.x -= minX;
  const unplaced = D.people.filter((p) => !pos[p.id]).map((p) => p.id);
  return { pos, w: maxX - minX, minG, maxG, unplaced };
}
const X = (x) => PADX + x * SLOT;
const Y = (g) => PADY + (LAYOUT.maxG - g) * ROWH;

// ---------- flags & filters ----------
const FILTERS = {
  imm: { label: "Immigrants", icon: "ship", test: (p) => p.imm },
  war: { label: "Served in war", icon: "swords", test: (p) => p.wars && p.wars.length },
  jt: { label: "Jamestown line", icon: "crown", test: (p) => p.jt },
  proven: { label: "Proven only", icon: "check", test: (p) => !p.liv && p.st === "proven" },
};
function badgesFor(p) {
  const out = [];
  if (p.imm) out.push(`<span class="badge-i" title="Immigrant">${I.ship}</span>`);
  for (const w of (p.wars || []).slice(0, 2)) { const W = WAR[w] || WAR.service; out.push(`<span class="badge-i ${W.cls}" title="${esc(W.label)}">${I[W.icon]}</span>`); }
  if (p.jt) out.push(`<span class="badge-i jt" title="Jamestown line">${I.crown}</span>`);
  return out.join("");
}

// ---------- rendering ----------
let world, stage;
function render() {
  const app = $("#app");
  const title = TREE === "holly" ? `The Grizzard <i>&amp;</i> Babb Family` : `The Chiesa <i>&amp;</i> Grizzard Family`;
  const hasJT = D.people.some((p) => p.jt);
  app.innerHTML = `<div class="paper"></div>
  <header class="top">
    <a class="brand" href="${BASE}${TREE === "holly" ? "holly/" : ""}" aria-label="Roots home">${CREST}<div><h1>${title}</h1><div class="sub">${esc(D.subtitle || "")}</div></div></a>
    <div class="search" id="search">${searchBox("q")}</div>
    <nav class="nav"><button class="on" data-nav="tree">Explore</button><button data-nav="stories">Stories</button><button data-nav="places">Places</button><button data-nav="key">Key</button></nav>
    <button class="btn-lock" id="lockBtn">${I.lock}<span class="lbl">Family sign-in</span></button>
  </header>
  <div class="tools" id="tools">
    <div class="seg"><a href="${BASE}" class="${TREE === "brandon" ? "on" : ""}"><span class="dot"></span>Brandon’s tree</a><a href="${BASE}holly/" class="${TREE === "holly" ? "on" : ""}"><span class="dot"></span>Holly’s tree</a></div>
    <div class="vsep"></div>
    ${Object.entries(FILTERS).filter(([k]) => k !== "jt" || hasJT).map(([k, f]) => `<button class="chip" data-f="${k}">${I[f.icon]}${f.label}<span class="cnt">${D.people.filter(f.test).length}</span></button>`).join("")}
    <div class="meta">${ic("filter", "color:#b0893c")}<span>Living relatives show names only · details need the family password</span></div>
  </div>
  <div class="stage" id="stage"><div class="world" id="world"></div></div>
  <div id="edges"></div>
  <div class="ruler" id="ruler"></div>
  <div class="zoom" id="zoom"><button data-z="in" aria-label="Zoom in">${I.plus}</button><button data-z="out" aria-label="Zoom out">${I.minus}</button><div class="lvl" id="lvl">100%</div><button data-z="fit" aria-label="Fit whole tree">${I.fit}</button><button data-z="home" aria-label="Center on ${TREE === "holly" ? "Holly" : "Brandon"}">${I.target}</button></div>
  <div class="mini" id="mini"></div>
  <div class="legend" id="legend">${legendHTML()}</div>
  <div id="feat"></div>
  <div id="toast"></div>
  <nav class="tabbar" id="tabbar">
    <button class="on" data-tab="tree">${I.tree}Tree</button><button data-tab="stories">${I.book}Stories</button><button data-tab="search">${I.search}Search</button><button data-tab="key">${I.filter}Key</button><button data-tab="lock">${I.lock}<span id="tabLock">Sign in</span></button>
  </nav>
  <div class="msearch hide" id="msearch"><div class="row"><div class="search" style="flex:1">${searchBox("mq")}</div><button data-close>Cancel</button></div></div>
  <div id="layer"></div>`;
  world = $("#world"); stage = $("#stage");
  $("#edges").addEventListener("click", (e) => { const b = e.target.closest("[data-go]"); if (b) focusPerson(b.dataset.go); });
  drawTree();
  bindUI();
  updateLock();
  renderFeature();
  requestAnimationFrame(() => { home(false); handleHash(); });
}
function searchBox(id) { return `<label>${I.search}<input id="${id}" type="search" placeholder="Search people & places…" autocomplete="off" aria-label="Search people and places"><span class="kbd">/</span></label><div class="results" id="${id}r" hidden></div>`; }
function legendHTML() {
  return `<button class="x" aria-label="Close key">${I.close}</button>
  <span><span class="sw direct"></span>Direct line</span><span><span class="sw"></span>Proven</span><span><span class="sw probable"></span>Probable / index</span><span><span class="sw compiled"></span>Compiled tree</span><span><span class="sw hypothesis"></span>Hypothesis</span><span><span class="sw family"></span>Family-provided</span><span><span class="sw claim"></span>Family claim</span><span><span class="sw living"></span>Living</span><span class="sep"></span>
  <span><span class="badge-i">${I.ship}</span>Immigrant</span><span><span class="badge-i">${I.star}</span>WWI / WWII</span><span><span class="badge-i cw">${I.swords}</span>Civil War</span><span><span class="badge-i rev">${I.flag}</span>Rev. War / 1812</span>${D.people.some((p) => p.jt) ? `<span><span class="badge-i jt">${I.crown}</span>Jamestown</span>` : ""}`;
}
function partnerId() { return P[FOCAL].sp.find((s) => LAYOUT && LAYOUT.pos[s]); }
function drawTree() {
  LAYOUT = layout();
  computeDirect();
  const { pos } = LAYOUT;
  let html = "";
  const paths = [];
  const pid = partnerId();
  for (const [id, v] of Object.entries(pos)) {
    const p = view_(id), l = X(v.x) - CW / 2, t = Y(v.g);
    const isPartner = id === pid;
    const locked = p.liv && !p.unlocked;
    const cls = ["card", locked ? "living" : (p.st || "probable"), DIRECT.has(id) ? "direct" : "", id === FOCAL ? "focal" : "", isPartner ? "partner" : ""].join(" ");
    let sub;
    if (isPartner) sub = `${TREE === "holly" ? "Open Brandon’s tree" : "Open Holly’s tree"} ›`;
    else if (locked) sub = `${ic("lock")}Living`;
    else if (p.liv) sub = esc(p.yrs || "Living");
    else sub = esc(p.yrs || "");
    html += `<div class="${cls}" data-id="${esc(id)}" style="left:${l}px;top:${t}px;width:${CW}px;height:${CH}px" role="button" tabindex="0" aria-label="${esc(p.n)}"><div class="ph${p.sex === "F" ? " f" : ""}"></div><div class="tx"><div class="nm">${esc(p.n)}</div>${sub ? `<div class="dt">${sub}</div>` : ""}</div>${locked ? (p.jt ? `<div class="ic">${badgesFor({ jt: true })}</div>` : "") : `<div class="ic">${badgesFor(p)}</div>`}</div>`;
  }
  const groups = {};
  for (const [id, v] of Object.entries(pos)) {
    const par = parentsOf(id).filter((q) => pos[q] && pos[q].g === v.g + 1);
    if (!par.length) continue;
    const key = par.slice().sort().join("|");
    (groups[key] = groups[key] || { par, kids: [] }).kids.push(id);
  }
  const drawnMar = new Set();
  const lineCls = (k) => { const p = P[k]; const st = p.liv ? "proven" : p.st; return st === "proven" || st === "family" ? "" : st === "claim" ? "hypothesis" : st; };
  for (const { par, kids } of Object.values(groups)) {
    const pg = pos[par[0]].g, py = Y(pg) + CH / 2, ky = Y(pg - 1), barY = ky - 18;
    let mx;
    if (par.length >= 2) {
      const xs = par.map((q) => X(pos[q].x)).sort((a, b) => a - b);
      const k = par.slice().sort().join("|");
      if (!drawnMar.has(k)) { drawnMar.add(k); paths.push([`M${xs[0] + CW / 2},${py}H${xs[xs.length - 1] - CW / 2}`, "mar", par, []]); }
      mx = (xs[0] + xs[xs.length - 1]) / 2;
    } else mx = X(pos[par[0]].x);
    const startY = par.length >= 2 ? py : Y(pg) + CH;
    const kxs = kids.map((k) => X(pos[k].x));
    const dk = kids.some((k) => DIRECT.has(k)) && par.some((q) => DIRECT.has(q));
    paths.push([`M${mx},${startY}V${barY}`, dk ? "direct" : "", par, kids]);
    if (kids.length > 1 || Math.abs(kxs[0] - mx) > 0.5) paths.push([`M${Math.min(mx, ...kxs)},${barY}H${Math.max(mx, ...kxs)}`, "", par, kids]);
    kids.forEach((k, i) => paths.push([`M${kxs[i]},${barY}V${ky}`, lineCls(k) + (DIRECT.has(k) && dk ? " direct" : ""), par, [k]]));
  }
  for (const [id, v] of Object.entries(pos)) for (const s of P[id].sp) {
    if (!pos[s] || pos[s].g !== v.g) continue; const k = [id, s].sort().join("|"); if (drawnMar.has(k)) continue; drawnMar.add(k);
    const a = Math.min(X(v.x), X(pos[s].x)), b = Math.max(X(v.x), X(pos[s].x)); paths.push([`M${a + CW / 2},${Y(v.g) + CH / 2}H${b - CW / 2}`, "mar", [id, s], []]);
  }
  const W = X(LAYOUT.w) + PADX + CW, H = Y(LAYOUT.minG) + CH + PADY;
  LAYOUT.W = W; LAYOUT.H = H; LAYOUT.paths = paths;
  world.style.width = W + "px"; world.style.height = H + "px";
  world.innerHTML = `<svg class="links" width="${W}" height="${H}">${paths.map(([d, c], i) => `<path d="${d}" class="${c}" data-i="${i}"/>`).join("")}</svg>${html}<div id="tags"></div>`;
  drawRuler(); drawMini(); applyFilter();
}
function drawRuler() {
  const el = $("#ruler"); if (!el) return;
  let h = `<div class="ttl">GEN</div>`;
  const rows = {};
  for (const [id, v] of Object.entries(LAYOUT.pos)) (rows[v.g] = rows[v.g] || []).push(P[id]);
  const gs = Object.keys(rows).map(Number).sort((a, b) => b - a);
  for (const g of gs) {
    const yrs = rows[g].filter((p) => !p.liv).map((p) => { const m = String((p.b && p.b.d) || "").match(YR); return m ? +m[1] : null; }).filter(Boolean).sort((a, b) => a - b);
    let lab = "Living";
    if (yrs.length) { const lo = yrs[Math.floor((yrs.length - 1) * 0.1)], hi = yrs[Math.ceil((yrs.length - 1) * 0.9)]; lab = lo === hi ? `b. ${lo}` : `b. ${lo}–${hi}`; }
    h += `<div class="g" data-g="${g}"><b>${roman(g - LAYOUT.minG + 1)}</b><span>${lab}</span></div>`;
  }
  el.innerHTML = h;
  positionRuler();
}
function positionRuler() {
  const el = $("#ruler"); if (!el) return;
  const rowPx = Math.abs(Y(1) - Y(0)) * view.s, step = rowPx >= 30 ? 1 : Math.ceil(30 / Math.max(rowPx, 1));
  el.classList.toggle("compact", rowPx < 40);
  for (const d of el.querySelectorAll(".g")) { const g = +d.dataset.g; d.style.top = (Y(g) * view.s + view.y + (CH * view.s) / 2 - (rowPx < 40 ? 10 : 16)) + "px"; d.style.visibility = (g - LAYOUT.minG) % step ? "hidden" : ""; }
}
function roman(n) { const m = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]]; let s = ""; for (const [v, r] of m) while (n >= v) { s += r; n -= v; } return s; }
function drawMini() {
  const el = $("#mini"); if (!el) return;
  const w = 216, sx = w / LAYOUT.W, h = Math.max(60, Math.min(130, LAYOUT.H * sx)), sy = h / LAYOUT.H;
  let s = `<svg viewBox="0 0 ${w} ${h}" height="${h}" id="minisvg">`;
  for (const [id, v] of Object.entries(LAYOUT.pos)) {
    const p = P[id], st = p.liv ? "living" : p.st;
    const col = { proven: "#5d6b3b", probable: "#b0893c", compiled: "#9b9585", hypothesis: "#a8402f", family: "#2c3e5e", claim: "#6a4c7a", living: "#b8ab8a" }[st] || "#b0893c";
    s += `<rect x="${((X(v.x) - CW / 2) * sx).toFixed(1)}" y="${(Y(v.g) * sy).toFixed(1)}" width="${Math.max(2, CW * sx).toFixed(1)}" height="${Math.max(2.5, CH * sy).toFixed(1)}" rx="1" fill="${col}" opacity="${DIRECT.has(id) ? 1 : 0.55}"/>`;
  }
  s += `<rect id="minivp" fill="rgba(30,45,71,.08)" stroke="#1e2d47" stroke-width="1.2" rx="2"/></svg>`;
  el.innerHTML = `<div class="h"><span>OVERVIEW</span><span style="letter-spacing:.2px;font-weight:500">${LAYOUT.maxG - LAYOUT.minG + 1} generations · ${Object.keys(LAYOUT.pos).length} people</span></div>${s}`;
  LAYOUT.mini = { sx, sy };
  $("#minisvg").addEventListener("click", (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    centerOn((e.clientX - r.left) / r.width * LAYOUT.W, (e.clientY - r.top) / r.height * LAYOUT.H, view.s, true);
  });
}
function updateMini() {
  const vp = $("#minivp"); if (!vp || !LAYOUT.mini || !stage) return;
  const { sx, sy } = LAYOUT.mini, r = stage.getBoundingClientRect();
  vp.setAttribute("x", (-view.x / view.s) * sx); vp.setAttribute("y", (-view.y / view.s) * sy);
  vp.setAttribute("width", (r.width / view.s) * sx); vp.setAttribute("height", (r.height / view.s) * sy);
}

// ---------- pan & zoom ----------
function applyView(anim) {
  world.style.transition = anim ? "transform .45s cubic-bezier(.2,.7,.2,1)" : "none";
  world.style.transform = `translate(${view.x}px,${view.y}px) scale(${view.s})`;
  const l = $("#lvl"); if (l) l.textContent = Math.round(view.s * 100) + "%";
  const ruler = $("#ruler"); if (ruler) ruler.querySelectorAll(".g").forEach((d) => (d.style.transition = anim ? "top .45s cubic-bezier(.2,.7,.2,1)" : "none"));
  positionRuler(); updateMini(); updateEdges();
}
// pointers to the focal person's parents when they are off screen (wide trees put them far apart)
function updateEdges() {
  const el = $("#edges"); if (!el || !stage || !LAYOUT) return;
  const r = stage.getBoundingClientRect(); let h = "";
  const [fa, mo] = fatherMother(FOCAL);
  for (const [id, rel] of [[fa, "Father"], [mo, "Mother"]]) {
    const v = id && LAYOUT.pos[id]; if (!v) continue;
    const sx = r.left + view.x + X(v.x) * view.s, sy = r.top + view.y + (Y(v.g) + CH / 2) * view.s;
    const half = (CW / 2) * view.s; let side = "";
    if (sx + half < r.left + 8) side = "l"; else if (sx - half > r.right - 8) side = "r";
    if (!side) continue;
    const y = Math.max(r.top + 70, Math.min(r.bottom - 150, sy));
    h += `<button class="edge ${side}" data-go="${esc(id)}" style="top:${Math.round(y)}px">${side === "l" ? "‹ " : ""}<span><small>${rel}</small>${esc(P[id].n)}</span>${side === "r" ? " ›" : ""}</button>`;
  }
  if (el.innerHTML !== h) el.innerHTML = h;
}
const clampS = (s) => Math.max(0.1, Math.min(2.2, s));
function zoomAt(cx, cy, f) { const s = clampS(view.s * f); const k = s / view.s; view.x = cx - (cx - view.x) * k; view.y = cy - (cy - view.y) * k; view.s = s; applyView(false); }
function centerOn(wx, wy, s, anim) { const r = stage.getBoundingClientRect(); view.s = clampS(s); view.x = r.width / 2 - wx * view.s; view.y = r.height / 2 - wy * view.s; applyView(anim); }
function fit(anim) { const r = stage.getBoundingClientRect(); const s = clampS(Math.min(r.width / LAYOUT.W, r.height / LAYOUT.H) * 0.96); centerOn(LAYOUT.W / 2, LAYOUT.H / 2, s, anim); }
function home(anim) {
  const f = LAYOUT.pos[FOCAL]; if (!f) return fit(anim);
  const r = stage.getBoundingClientRect();
  // frame the focal person, parents and grandparents
  const ids = [...DIRECT].filter(([, g]) => g <= (isMobile() ? 1 : 2)).map(([id]) => id).concat(P[FOCAL].sp.filter((s) => LAYOUT.pos[s]));
  const xs = ids.map((i) => X(LAYOUT.pos[i].x)), ys = ids.map((i) => Y(LAYOUT.pos[i].g));
  const bw = Math.max(...xs) - Math.min(...xs) + CW + 80, bh = Math.max(...ys) - Math.min(...ys) + CH + 80;
  const s = clampS(Math.min(r.width / bw, r.height / bh, isMobile() ? 0.62 : 0.9));
  if (s >= (isMobile() ? 0.5 : 0.6)) {
    view.s = s;
    view.x = r.width / 2 - ((Math.min(...xs) + Math.max(...xs)) / 2) * s;
    view.y = r.height / 2 - ((Math.min(...ys) + Math.max(...ys)) / 2 + CH / 2) * s;
  } else { // parents sit far apart on a wide tree: start on the focal family at a readable size
    view.s = isMobile() ? 0.62 : 0.85;
    view.x = r.width / 2 - X(f.x) * view.s;
    view.y = r.height * (isMobile() ? 0.62 : 0.64) - Y(f.g) * view.s;
  }
  applyView(anim);
}
function focusPerson(id, anim = true) {
  const v = LAYOUT.pos[id]; if (!v) return;
  const r = stage.getBoundingClientRect();
  const s = clampS(Math.max(view.s, isMobile() ? 0.6 : 0.8));
  const panelW = !isMobile() ? Math.min(620, r.width - 32) + 16 : 0;
  const cx = Math.max(160, (r.width - panelW) / 2), cy = isMobile() ? 70 : r.height / 2;
  view.s = s; view.x = cx - X(v.x) * s; view.y = cy - (Y(v.g) + CH / 2) * s; applyView(anim);
}
function bindPanZoom() {
  const pts = new Map(); let moved = 0, pinch = null, downAt = null;
  stage.addEventListener("pointerdown", (e) => {
    if (e.button && e.button !== 0) return;
    stage.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) { moved = 0; downAt = { x: e.clientX, y: e.clientY }; }
    if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; moved += 100; }
    stage.classList.add("drag");
  });
  stage.addEventListener("pointermove", (e) => {
    if (!pts.has(e.pointerId)) return;
    const prev = pts.get(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size >= 2 && pinch) {
      const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); const r = stage.getBoundingClientRect();
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      view.x += mx - pinch.mx; view.y += my - pinch.my;
      zoomAt(mx - r.left, my - r.top, d / pinch.d);
      pinch = { d, mx, my }; return;
    }
    const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
    moved = Math.max(moved, Math.abs(e.clientX - downAt.x) + Math.abs(e.clientY - downAt.y));
    view.x += dx; view.y += dy; applyView(false);
  });
  const end = (e) => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; if (!pts.size) stage.classList.remove("drag"); };
  stage.addEventListener("pointerup", (e) => {
    const tap = moved < 8 && pts.size === 1; end(e);
    if (tap) { const el = document.elementFromPoint(e.clientX, e.clientY); const c = el && el.closest(".card"); if (c) onCardClick(c.dataset.id); }
  });
  stage.addEventListener("pointercancel", end);
  stage.addEventListener("wheel", (e) => {
    e.preventDefault(); const r = stage.getBoundingClientRect();
    if (e.ctrlKey || e.deltaMode !== 0 || Math.abs(e.deltaY) >= Math.abs(e.deltaX)) zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0016) * (e.deltaMode ? 30 : 1)));
    else { view.x -= e.deltaX; applyView(false); }
  }, { passive: false });
  world.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.classList.contains("card")) onCardClick(e.target.dataset.id); });
  addEventListener("resize", () => { positionRuler(); updateMini(); });
}
function onCardClick(id) {
  if (id === partnerId()) { location.href = BASE + (TREE === "holly" ? "" : "holly/"); return; }
  openPerson(id);
}

// ---------- filters ----------
function applyFilter() {
  const f = state.filter && FILTERS[state.filter];
  const hl = new Set(); if (f) for (const p of D.people) if (LAYOUT.pos[p.id] && f.test(p)) hl.add(p.id);
  for (const c of world.querySelectorAll(".card")) { const id = c.dataset.id; c.classList.toggle("dim", !!f && !hl.has(id)); c.classList.toggle("hlc", !!f && hl.has(id) && state.filter !== "proven"); c.classList.toggle("sel", id === state.sel); }
  for (const p of world.querySelectorAll("svg.links path")) {
    const [, , par, kids] = LAYOUT.paths[+p.dataset.i]; const on = !f || (par || []).concat(kids || []).every((x) => hl.has(x));
    p.classList.toggle("dimp", !!f && !on); p.classList.toggle("hl", !!f && on && state.filter === "jt");
  }
  const tags = $("#tags"); let th = "";
  if (f && state.filter === "war") for (const id of hl) { const p = P[id], v = LAYOUT.pos[id]; const w = WAR[p.wars[0]] || WAR.service; th += `<div class="tag" style="left:${X(v.x)}px;top:${Y(v.g) + CH + 6}px">${I[w.icon]}${esc(w.short)}</div>`; }
  if (f && state.filter === "imm") for (const id of hl) { const p = P[id], v = LAYOUT.pos[id]; const y = immYear(p); th += `<div class="tag" style="left:${X(v.x)}px;top:${Y(v.g) + CH + 6}px">${I.ship}${y ? "Arrived " + y : "Immigrant"}</div>`; }
  if (tags) tags.innerHTML = th;
  for (const c of document.querySelectorAll(".chip[data-f]")) c.classList.toggle("on", c.dataset.f === state.filter);
  const t = $("#toast");
  if (t) t.innerHTML = f ? `<div class="toast">${ic("filter", "color:#dcc58f")}<span><b>${f.label}</b> · ${hl.size} highlighted${state.filter === "proven" ? "" : ", the rest dimmed"}</span><button id="clearF">Clear</button></div>` : "";
  const cf = $("#clearF"); if (cf) cf.onclick = () => setFilter(null);
}
function immYear(p) {
  const e = (p.ev || []).find((e) => /arriv|sail|landed|manifest|ellis/i.test(e.t)); if (e) return e.y;
  const t = (p.hl || []).concat((p.facts || []).map((f) => f.t)).join(" "); const m = t.match(/(?:arrived|landing|landed)[^.]*?\b(1[6-9]\d\d)\b/i); return m ? +m[1] : null;
}
function setFilter(k) {
  state.filter = k && state.filter !== k ? k : null; applyFilter();
  if (state.filter && state.filter !== "proven") openFilterPanel(state.filter);
  else { const pn = $("#layer .panel"); if (pn && pn.dataset.kind === "filter") closeLayer(); }
  if (state.filter && state.filter !== "proven") {
    const ids = D.people.filter((p) => LAYOUT.pos[p.id] && FILTERS[state.filter].test(p)).map((p) => p.id);
    if (ids.length) {
      const xs = ids.map((i) => X(LAYOUT.pos[i].x)), ys = ids.map((i) => Y(LAYOUT.pos[i].g)); const r = stage.getBoundingClientRect(); const panelW = isMobile() ? 0 : 420;
      const availH = isMobile() ? r.height * 0.45 : r.height;
      const bw = Math.max(...xs) - Math.min(...xs) + CW + 160, bh = Math.max(...ys) - Math.min(...ys) + CH + 120;
      const s = clampS(Math.min((r.width - panelW) / bw, availH / bh, 1));
      view.s = s; view.x = (r.width - panelW) / 2 - ((Math.min(...xs) + Math.max(...xs)) / 2) * s; view.y = availH / 2 - ((Math.min(...ys) + Math.max(...ys)) / 2 + CH / 2) * s; applyView(true);
    }
  }
}
function personRow(p, meta, extraCls = "") {
  const v = view_(p.id);
  return `<button class="prow ${extraCls}" data-open="${esc(p.id)}"><div class="tx"><div class="n">${esc(p.n)}<small>${esc(p.liv ? (v.unlocked ? v.yrs || "Living" : "Living") : p.yrs || "")}</small></div>${meta ? `<div class="m">${meta}</div>` : ""}</div>${p.liv ? "" : `<span class="status ${p.st}">${RATING_LABEL[p.st] || p.st}</span>`}${ic("chev").replace('class="ico"', 'class="ico chev"')}</button>`;
}
function openFilterPanel(k) {
  const f = FILTERS[k];
  const ppl = D.people.filter(f.test);
  let body = "";
  if (k === "war") {
    const groups = {}; for (const p of ppl) for (const w of p.wars) (groups[w] = groups[w] || []).push(p);
    body += `<div class="stats">${WAR_ORDER.filter((w) => groups[w]).map((w) => `<div><b>${groups[w].length}</b><span>${WAR[w].short}</span></div>`).join("")}</div>`;
    for (const w of WAR_ORDER) if (groups[w]) {
      body += `<div class="sec">${WAR[w].label}</div>`;
      for (const p of groups[w].sort((a, b) => by(a.id) - by(b.id))) { const m = p.mil && p.mil.lines.filter(([k]) => /Rank|Unit|Service|Branch|War|Side/.test(k)).slice(0, 3).map(([, v]) => esc(v.length > 90 ? v.slice(0, 88) + "…" : v)).join(" · "); body += personRow(p, m); }
    }
  } else if (k === "imm") {
    body += `<div class="flt-sub">Ancestors and relatives who crossed the ocean to settle in America, with the year they arrived when a record gives it.</div>`;
    for (const p of ppl.slice().sort((a, b) => (immYear(a) || by(a.id)) - (immYear(b) || by(b.id)))) { const y = immYear(p); body += personRow(p, `${y ? "Arrived " + y + " · " : ""}born ${esc((p.b && p.b.p) || "abroad")}`); }
  } else if (k === "jt") {
    const chains = {};
    for (const p of ppl) for (const c of (p.jtC && p.jtC.length ? p.jtC : ["Jamestown line"])) (chains[c] = chains[c] || []).push(p);
    const ordered = Object.entries(chains).sort((a, b) => b[1].length - a[1].length);
    body += `<div class="flt-sub">Descents from Jamestown-era settlers (1607–1624). Every person carries a rating, and a chain is only as strong as its weakest link.</div>`;
    const O = ["proven", "family", "probable", "compiled", "claim", "hypothesis"];
    for (const [c, list] of ordered) {
      list.sort((a, b) => (DIRECT.get(b.id) ?? -1) - (DIRECT.get(a.id) ?? -1) || by(a.id) - by(b.id));
      const stated = (c.match(/\((proven|probable|hypothesis|compiled)\)/i) || [])[1];
      const weakest = stated ? stated.toLowerCase() : list.reduce((w, p) => (p.liv ? w : O.indexOf(p.st) > O.indexOf(w) ? p.st : w), "proven");
      body += `<div class="chain-h">${esc(c.replace(/\s*\((probable|hypothesis|proven|compiled)\)\s*$/i, ""))}</div><div class="chain-sub">Chain rating <span class="rt ${weakest}">${RATING_LABEL[weakest]}</span> · ${list.length} people, oldest first</div><div class="chain">`;
      for (const p of list) body += personRow(p, DIRECT.has(p.id) ? esc(relLabel(p.id)) : "", p.liv ? "" : p.st);
      body += `</div>`;
    }
  }
  openLayer("filter", `<div class="flt-h"><span class="bi">${I[f.icon]}</span><h3>${f.label}</h3></div><div class="flt-sub">${ppl.length} ${ppl.length === 1 ? "person" : "people"} on this tree</div>${body}`, "narrow half");
}

// ---------- panels ----------
function openLayer(kind, html, cls = "") {
  const layer = $("#layer");
  layer.innerHTML = `${isMobile() && kind !== "filter" ? `<div class="scrim" data-close></div>` : ""}<aside class="panel ${cls}" data-kind="${kind}" role="dialog" aria-label="${kind}"><div class="grab"></div><div class="pclose"><button data-close aria-label="Close">${I.close}</button></div><div class="scroll">${html}</div></aside>`;
  layer.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => { if (kind === "filter") { state.filter = null; applyFilter(); } closeLayer(); }));
  layer.querySelectorAll("[data-open]").forEach((b) => b.addEventListener("click", () => openPerson(b.dataset.open)));
  layer.querySelectorAll("[data-story]").forEach((b) => b.addEventListener("click", () => openStory(b.dataset.story)));
  bindSwipeClose(layer.querySelector(".panel"), kind);
  return layer;
}
function closeLayer() {
  $("#layer").innerHTML = ""; state.sel = null; applyFilter(); setTab("tree");
  if (location.hash) history.replaceState(null, "", location.pathname);
}
function bindSwipeClose(panel, kind) {
  if (!panel || !isMobile()) return; const grab = panel.querySelector(".grab"); let y0 = null;
  panel.addEventListener("touchstart", (e) => { const sc = panel.querySelector(".scroll"); y0 = (e.target === grab || (sc && sc.scrollTop <= 0)) ? e.touches[0].clientY : null; }, { passive: true });
  panel.addEventListener("touchmove", (e) => { if (y0 == null) return; const dy = e.touches[0].clientY - y0; if (dy > 0) panel.style.transform = `translateY(${dy}px)`; }, { passive: true });
  panel.addEventListener("touchend", (e) => { if (y0 == null) return; const dy = e.changedTouches[0].clientY - y0; panel.style.transform = ""; if (dy > 110) { if (kind === "filter") { state.filter = null; applyFilter(); } closeLayer(); } y0 = null; });
}

// ---------- person card ----------
function famRow(label, ids) {
  ids = ids.filter((x) => P[x]); if (!ids.length) return "";
  return `<div class="fr"><div class="k">${label}</div><div class="ns">${ids.map((id) => { const q = P[id], v = view_(id); return `<button class="fp" data-open="${esc(id)}"><span class="av"></span><span class="n">${esc(q.n)}<small>${esc(q.liv ? (v.unlocked ? v.yrs || "Living" : "Living") : q.yrs || "")}</small></span></button>`; }).join("")}</div></div>`;
}
const ratingTag = (r) => (r ? ` <span class="rt ${r}">${RATING_LABEL[r] || r}</span>` : "");
function linkify(s) { return esc(s).replace(/(https?:\/\/[^\s<;,)"]+[^\s<;,.)"])/g, '<a href="$1" target="_blank" rel="noopener nofollow">$1</a>'); }
function openPerson(id) {
  const p = view_(id); if (!p) return;
  state.sel = id; applyFilter();
  history.replaceState(null, "", "#p=" + encodeURIComponent(id));
  const locked = p.liv && !p.unlocked;
  const kids = kidsOf(id).sort((a, b) => by(a) - by(b));
  const fam = famRow("Parents", parentsOf(id)) + famRow(p.sp.length > 1 ? "Spouses" : "Spouse", p.sp) + famRow("Children", kids) + famRow("Siblings", siblingsOf(id));
  const partner = P[FOCAL].sp.includes(id) && (TREE === "brandon" ? "holly" : "brandon");
  const W_ = (w) => WAR[w] || WAR.service;
  let h = `<div class="hd"><div class="frame${p.liv ? " living" : ""}"><div class="in"></div></div><div class="who">
    <div class="eyebrow">${esc(relLabel(id))}${DIRECT.has(id) && DIRECT.get(id) > 0 ? " · direct line" : ""}${p.line ? " · " + esc(p.line) + " line" : ""}</div>
    <h2>${esc(p.n)}</h2>${p.rel && relLabel(id).toLowerCase() !== ((TREE === "holly" ? "holly’s " : "brandon’s ") + p.rel).toLowerCase() ? `<div class="relto">${TREE === "holly" ? "Holly’s" : "Brandon’s"} ${esc(p.rel)}</div>` : ""}${p.aka && p.aka.length && !locked ? `<div class="born">also ${esc(p.aka.join(", "))}</div>` : ""}
    <div class="yrs">${locked ? "Living · details are private" : esc([p.b && p.b.d, p.d && p.d.d].filter(Boolean).join(" – ") || p.yrs || "")}</div>
    <div class="pills">${locked ? `<span class="status living">${ic("lock")}Living</span>` : `<span class="status ${p.st}">${p.st === "proven" ? ic("check") : ""}${RATING_LABEL[p.st] || esc(p.stRaw || "")}</span>`}
    ${!locked && p.imm ? `<span class="pill2"><span class="badge-i">${I.ship}</span>Immigrant${immYear(p) ? " · " + immYear(p) : ""}</span>` : ""}
    ${!locked ? (p.wars || []).map((w) => `<span class="pill2"><span class="badge-i ${W_(w).cls}">${I[W_(w).icon]}</span>${W_(w).label}</span>`).join("") : ""}
    ${p.jt ? `<span class="pill2"><span class="badge-i jt">${I.crown}</span>Jamestown line${p.jtR && !locked ? " · " + esc(p.jtR) : ""}</span>` : ""}
    ${!locked && p.occ && p.occ[0] ? `<span class="pill3" title="${esc(p.occ[0].t)}">${esc(String(p.occ[0].t).split(/[;(]/)[0].slice(0, 48))}</span>` : ""}</div>
  </div></div>`;
  if (partner) h += `<p style="margin-top:14px"><a class="btn-lock" style="display:inline-flex;text-decoration:none" href="${BASE}${partner === "holly" ? "holly/" : ""}">${I.tree}Open ${partner === "holly" ? "Holly’s" : "Brandon’s"} family tree</a></p>`;
  if (locked) {
    h += `<div class="lockbox"><h4>${I.lock} Private: living relative</h4><p>To protect living family, the public site shows only names. Family members can unlock birth dates, places and notes with the family password.</p>${pwForm("pw-card")}</div>`;
    h += `<div class="sec">Family</div>${fam}`;
  } else {
    const facts = [];
    if (p.b && (p.b.d || p.b.p)) facts.push(["BORN", p.b.d, p.b.p]);
    const arr = p.imm && (p.ev || []).find((e) => /arriv|landed|sail/i.test(e.t));
    if (arr) facts.push(["ARRIVED", String(arr.y), arr.t.length > 80 ? arr.t.slice(0, 78) + "…" : arr.t]);
    if (p.d && (p.d.d || p.d.p)) facts.push(["DIED", p.d.d, p.d.p]);
    if (p.bur && (p.bur.place || p.bur.date)) facts.push(["BURIED", p.bur.date, [p.bur.place, p.bur.plot].filter(Boolean).join(", ")]);
    if (facts.length) h += `<div class="facts">${facts.map(([k, a, b]) => `<div><small>${k}</small><b>${esc(a || "—")}</b>${b ? `<span>${esc(b)}</span>` : ""}</div>`).join("")}</div>`;
    if (p.unlocked) h += `<div class="privnote">${ic("lock")}Unlocked with the family password. Not visible on the public site.</div>`;
    if (p.cod) h += `<div class="flt-sub" style="margin-top:10px">Cause of death: ${esc(p.cod)}</div>`;
    const stories = (p.hl && p.hl.length ? [{ title: "From the records", t: p.hl.join("\n") }] : []).concat(p.stories || []);
    const featured = (D.stories || []).filter((s) => s.person === id);
    if (featured.length || stories.length) {
      h += `<div class="sec">Stories</div>`;
      for (const s of featured) h += `<button class="stcard big" data-story="${esc(s.slug)}"><div class="k">${esc(s.kicker)}</div><h4>${esc(s.title)}</h4><p>${esc(s.summary)}</p><p style="margin-top:6px;font-weight:600;color:var(--olive)">Read the story ›</p></button>`;
      for (const s of stories) h += `<div class="quote">${s.title ? `<h5>${esc(s.title)}${ratingTag(s.r)}</h5>` : ""}${String(s.t).split("\n").map((x) => `<p>${esc(x)}</p>`).join("")}${s.s ? `<div class="cite">Source: ${linkify(s.s)}</div>` : ""}</div>`;
    }
    const tl = (p.ev || []).map((e) => `<div class="ev ${e.r || ""}${e.big ? " big" : ""}"><div class="y">${e.y}</div><span class="d"></span><div class="t">${e.k ? `<b>${esc(e.k)}</b> · ` : ""}${esc(e.t)}${e.r && e.r !== "proven" && !e.big ? ratingTag(e.r) : ""}</div></div>`).join("");
    h += mediaHTML(p);
    h += `<div class="sec">Places</div><div class="mapbox wide" id="pmap"><svg viewBox="0 0 560 300" role="img" aria-label="Map of places in ${esc(p.n)}’s life"></svg><div class="mapcap" id="pmapcap">Loading map…</div></div><ol class="placelist" id="pmaplist"></ol>`;
    h += `<div class="cols"><div>${tl ? `<div class="sec">Life timeline</div><div class="tl">${tl}</div>` : ""}</div><div><div class="sec">Family</div>${fam || `<p class="flt-sub">No relatives recorded yet.</p>`}</div></div>`;
    if (p.mil && p.mil.lines.length) h += `<div class="sec">Military record</div><div class="milbox"><dl>${p.mil.lines.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>${p.mil.src && p.mil.src.length ? `<div class="cite">Sources: ${p.mil.src.map(linkify).join("; ")}</div>` : ""}</div>`;
    const nodate = (p.facts || []).filter((f) => !YR.test(f.t));
    const extras = [].concat(
      (p.occ || []).map((o) => ({ t: `Occupation: ${o.t}${o.y ? " (" + o.y + ")" : ""}${o.p ? ", " + o.p : ""}`, r: o.r, s: o.s })),
      (p.res || []).filter((o) => !YR.test(o.y || "")).map((o) => ({ t: `Lived at ${o.p}${o.t ? ": " + o.t : ""}`, r: o.r, s: o.s })),
      (p.news || []).map((o) => ({ t: `${o.paper || "Newspaper"}${o.y ? ", " + o.y : ""}: ${o.t}`, r: o.r, s: o.s })),
      nodate);
    if (extras.length) h += `<div class="sec">More from the records</div><ul class="flist">${extras.map((f) => `<li>${esc(f.t)}${ratingTag(f.r)}${f.s ? `<div class="cite">${linkify(f.s)}</div>` : ""}</li>`).join("")}</ul>`;
    if (p.her && p.her.length) h += `<div class="sec">Heritage &amp; family stories</div><ul class="flist her">${p.her.map((f) => `<li class="${f.r || ""}">${esc(f.t)}${ratingTag(f.r)}${f.s ? `<div class="cite">${linkify(f.s)}</div>` : ""}</li>`).join("")}</ul>`;
    if (p.notes && p.notes.length) h += `<div class="sec">Research notes</div><ul class="flist">${p.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>`;
    if (p.src && p.src.length) {
      const items = p.src.map((s) => `<li class="${s.r || ""}">${I.doc}<span>${linkify(s.t)}${ratingTag(s.r)}</span></li>`);
      h += `<div class="sec">Sources · ${p.src.length} record${p.src.length === 1 ? "" : "s"}</div><ul class="flist srcs" id="srcs">${items.slice(0, 6).join("")}</ul>${items.length > 6 ? `<button class="more-btn" id="moreSrc">Show all ${items.length} sources</button>` : ""}`;
      setTimeout(() => { const b = $("#moreSrc"); if (b) b.onclick = () => { $("#srcs").innerHTML = items.join(""); b.remove(); }; });
    }
    if (!PRIV && (D.privHint || []).includes(id)) h += `<div class="lockbox"><h4>${I.lock} Family-only notes</h4><p>Some records about this person mention living relatives, so they are hidden on the public site.</p>${pwForm("pw-card")}</div>`;
  }
  openLayer("person", h, "");
  bindPw($("#layer"));
  if (!locked) drawPersonMap(p);
  focusPerson(id, true);
}

// ---------- places map ----------
// Pins come from the build (geocoded once and cached); the basemap is Natural Earth, loaded on first use.
const PLACE_KIND = {
  born: ["Born", "#5d6b3b"], baptised: ["Baptised", "#5d6b3b"], married: ["Married", "#b0893c"], lived: ["Lived", "#1e2d47"], worked: ["Worked", "#1e2d47"],
  departed: ["Sailed from", "#8a5a2b"], arrived: ["Arrived", "#8a5a2b"], served: ["Military service", "#7a2f2f"], died: ["Died", "#2a2924"], buried: ["Buried", "#6b6250"],
};
let BASEMAP = null;
async function loadBasemap() {
  if (BASEMAP) return BASEMAP;
  try { BASEMAP = await (await fetch(BASE + "assets/basemap.json")).json(); } catch { BASEMAP = { land: { scale: 100, rings: [] }, detail: { boxes: [], rings: [] }, borders: { rings: [] }, states: { rings: [] } }; }
  const dec = (L) => { if (!L || !L.rings || L._d) return; const s = L.scale || 100; L._d = L.rings.map((r) => { const out = new Float32Array(r.length); let x = 0, y = 0; for (let i = 0; i < r.length; i += 2) { x += r[i]; y += r[i + 1]; out[i] = x / s; out[i + 1] = y / s; } return out; }); };
  ["land", "detail", "borders", "states"].forEach((k) => dec(BASEMAP[k]));
  return BASEMAP;
}
function mapPlaces(items) {
  // merge pins at the same spot (e.g. born and baptised in the same hamlet)
  const pins = [];
  for (const s of items) {
    const near = pins.find((q) => Math.abs(q.lat - s.lat) < 0.004 && Math.abs(q.lon - s.lon) < 0.004);
    if (near) near.items.push(s); else pins.push({ lat: s.lat, lon: s.lon, items: [s] });
  }
  return pins;
}
// Render pins on the basemap into an <svg>. opts: {seq: chronological stops, bounds: [lon0, lat0, lon1, lat1], count: pin => label number, size: pin => radius}
async function renderMap(svgEl, pins, opts = {}) {
  const BM = await loadBasemap();
  const W = 560, H = opts.H || 300;
  let la0, la1, lo0, lo1, exactOnly;
  if (opts.bounds) { [lo0, la0, lo1, la1] = opts.bounds; exactOnly = true; }
  else {
    // frame the specific places; a bare state or country pin should not drag the view across a continent
    const framePins = pins.filter((q) => q.items.some((s) => s.a !== 2 || s.m === "county" || s.m === "area"));
    const F = framePins.length ? framePins : pins;
    la0 = Math.min(...F.map((q) => q.lat)); la1 = Math.max(...F.map((q) => q.lat)); lo0 = Math.min(...F.map((q) => q.lon)); lo1 = Math.max(...F.map((q) => q.lon));
    exactOnly = F.every((q) => q.items.every((s) => s.a !== 2));
  }
  const minSpan = exactOnly ? 0.18 : 2.5;
  const mid = (la0 + la1) / 2, k = Math.cos((mid * Math.PI) / 180);
  let spanX = Math.max((lo1 - lo0) * k, minSpan), spanY = Math.max(la1 - la0, minSpan * 0.6);
  if (!opts.bounds) { spanX *= 1.35; spanY *= 1.45; }
  if (spanX / spanY < W / H) spanX = (spanY * W) / H; else spanY = (spanX * H) / W;
  const cx = ((lo0 + lo1) / 2) * k, cy = (la0 + la1) / 2;
  const sc = W / spanX;
  const X_ = (lon) => (lon * k - (cx - spanX / 2)) * sc, Y_ = (lat) => ((cy + spanY / 2) - lat) * sc;
  const vlo0 = cx / k - spanX / 2 / k, vlo1 = cx / k + spanX / 2 / k, vla0 = cy - spanY / 2, vla1 = cy + spanY / 2;
  const useDetail = (BM.detail.boxes || []).some((b) => vlo0 >= b[0] && vlo1 <= b[2] && vla0 >= b[1] && vla1 <= b[3]);
  const path = (rings, closed) => {
    let d = "";
    for (const r of rings || []) {
      let rx0 = Infinity, rx1 = -Infinity, ry0 = Infinity, ry1 = -Infinity;
      for (let i = 0; i < r.length; i += 2) { if (r[i] < rx0) rx0 = r[i]; if (r[i] > rx1) rx1 = r[i]; if (r[i + 1] < ry0) ry0 = r[i + 1]; if (r[i + 1] > ry1) ry1 = r[i + 1]; }
      if (rx1 < vlo0 - 1 || rx0 > vlo1 + 1 || ry1 < vla0 - 1 || ry0 > vla1 + 1) continue;
      for (let i = 0; i < r.length; i += 2) d += (i ? "L" : "M") + X_(r[i]).toFixed(1) + "," + Y_(r[i + 1]).toFixed(1);
      if (closed) d += "Z";
    }
    return d;
  };
  let svg = `<rect width="${W}" height="${H}" fill="#dfe6e0"/>`;
  svg += `<path d="${path((useDetail ? BM.detail : BM.land)._d, true)}" fill="#efe5cc" stroke="#b49f73" stroke-width=".7" fill-rule="evenodd"/>`;
  svg += `<path d="${path(BM.states._d, false)}" fill="none" stroke="#c9b68c" stroke-width=".6" stroke-dasharray="3 2"/>`;
  svg += `<path d="${path(BM.borders._d, false)}" fill="none" stroke="#a8916a" stroke-width=".9"/>`;
  const seq = (opts.seq || []).filter((s) => s.a !== 2);
  for (let i = 1; i < seq.length; i++) {
    const a = seq[i - 1], b = seq[i]; if (a.lat === b.lat && a.lon === b.lon) continue;
    const ax = X_(a.lon), ay = Y_(a.lat), bx = X_(b.lon), byy = Y_(b.lat); const mx = (ax + bx) / 2, my = Math.min(ay, byy) - Math.hypot(bx - ax, byy - ay) * 0.18;
    svg += `<path d="M${ax.toFixed(1)},${ay.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${bx.toFixed(1)},${byy.toFixed(1)}" fill="none" stroke="#8a7a55" stroke-width="1.2" stroke-dasharray="4 3" opacity=".7"/>`;
  }
  const drawn = [], placed = [], labs = [];
  const order = pins.map((q, i) => i).sort((a, b) => (opts.size ? opts.size(pins[b]) - opts.size(pins[a]) : 0));
  let pinSvg = "", labSvg = "";
  for (const i of order) {
    const q = pins[i]; const x = X_(q.lon), y = Y_(q.lat), s0 = q.items[0];
    if (x < -10 || x > W + 10 || y < -10 || y > H + 10) continue;
    const col = opts.color ? opts.color(q) : PLACE_KIND[s0.k] ? PLACE_KIND[s0.k][1] : "#a8402f";
    const approx = q.items.every((s) => s.a);
    const r = opts.size ? opts.size(q) : approx ? 8 : 9;
    const num = opts.count ? opts.count(q, i) : i + 1;
    drawn.push(i); placed.push({ i, q, x, y, r });
    pinSvg += `<g class="pin" data-i="${i}"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}" fill="${approx ? "#fff8e8" : col}" stroke="${col}" stroke-width="${approx ? 2 : 1.5}" ${approx ? 'stroke-dasharray="3 2"' : ""}/><text x="${x.toFixed(1)}" y="${(y + 3.6).toFixed(1)}" text-anchor="middle" font-family="Inter,sans-serif" font-size="10" font-weight="700" fill="${approx ? col : "#fff8e8"}">${num}</text></g>`;
  }
  // labels: try right, left, above, below; skip a label that would sit on another pin or label
  const hit = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
  for (const { q, x, y, r } of placed) {
    let name = (opts.label ? opts.label(q) : q.items[0].l).split(",")[0];
    if (name.length > 26) name = name.slice(0, 24) + "…";
    const w = name.length * 6.3 + 2, h = 12;
    const cands = [[x + r + 3, y + 4, "start"], [x - r - 3, y + 4, "end"], [x, y - r - 4, "middle"], [x, y + r + 12, "middle"]];
    for (const [lx, ly, anc] of cands) {
      const x0 = anc === "start" ? lx : anc === "end" ? lx - w : lx - w / 2, box = [x0, ly - 10, x0 + w, ly + 2];
      if (box[0] < 2 || box[2] > W - 2 || box[1] < 2 || box[3] > H - 22) continue;
      if (labs.some((b) => hit(b, box)) || placed.some((o) => hit([o.x - o.r, o.y - o.r, o.x + o.r, o.y + o.r], box))) continue;
      labs.push(box);
      labSvg += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="${anc}" font-family="Inter,sans-serif" font-size="11" font-weight="600" fill="#2a2924" paint-order="stroke" stroke="#efe5cc" stroke-width="3" pointer-events="none">${esc(name)}</text>`;
      break;
    }
  }
  svg += pinSvg + labSvg;
  const scaleKm = spanX * 111.32, nice = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000].find((v) => v > scaleKm / 6) || 2000;
  const barPx = (nice / scaleKm) * W;
  svg += `<g font-family="Inter,sans-serif" font-size="9.5" fill="#6b6250"><rect x="12" y="${H - 18}" width="${barPx.toFixed(1)}" height="3" fill="#6b6250"/><text x="${(16 + barPx).toFixed(1)}" y="${H - 13}">${nice} km</text><text x="${W - 8}" y="${H - 8}" text-anchor="end" opacity=".8">Basemap: Natural Earth · places: OpenStreetMap</text></g>`;
  svgEl.setAttribute("viewBox", `0 0 ${W} ${H}`); svgEl.innerHTML = svg;
  if (opts.onPin) svgEl.querySelectorAll(".pin").forEach((g) => g.addEventListener("click", () => opts.onPin(+g.dataset.i)));
  return drawn;
}
const osmLink = (s) => `https://www.openstreetmap.org/?mlat=${s.lat}&mlon=${s.lon}#map=${s.a === 2 ? 8 : s.a ? 12 : 15}/${s.lat}/${s.lon}`;
function precNote(s) { return s.a === 2 ? ` <small>(${s.m === "area" ? "an area" : "the " + esc(s.m || "region")}: pinned at its centre)</small>` : s.a ? ` <small>(approximate: pinned at ${esc(s.m || "the nearest known place")})</small>` : ""; }
async function drawPersonMap(p) {
  const box = $("#pmap"); if (!box) return;
  const pins = mapPlaces(p.pl || []);
  const list = $("#pmaplist");
  const nomap = (p.plx || []).length ? `<li class="nomap"><span class="num ap" style="--c:#8a7a55">?</span><span>Not yet on the map: ${esc(p.plx.map((x) => x.l).join(" · "))}</span></li>` : "";
  if (!pins.length) { box.classList.add("empty"); box.querySelector("svg").style.display = "none"; $("#pmapcap").textContent = "No places recorded for this person yet."; if (list) list.innerHTML = nomap; return; }
  await loadBasemap(); if (state.sel !== p.id) return;
  await renderMap(box.querySelector("svg"), pins, { seq: p.pl, onPin: (i) => { const li = list && list.querySelector(`[data-pin="${i}"]`); if (li) { li.classList.add("hl"); li.scrollIntoView({ block: "nearest", behavior: "smooth" }); setTimeout(() => li.classList.remove("hl"), 1400); } } });
  $("#pmapcap").textContent = pins.length === 1 ? "1 place" : `${pins.length} places, numbered in the order of the records`;
  if (list) list.innerHTML = pins.map((q, i) => q.items.map((s, j) => { const K = PLACE_KIND[s.k] || [s.k, "#a8402f"];
    return `<li data-pin="${j ? "" : i}"><span class="num${s.a ? " ap" : ""}" style="--c:${K[1]}">${j ? "" : i + 1}</span><span><b>${esc(K[0])}</b>${s.y ? " " + s.y : ""} · ${esc(s.l)}${precNote(s)}${s.n ? ` <small>· ${esc(s.n)}</small>` : ""} <a href="${osmLink(s)}" target="_blank" rel="noopener nofollow" class="osm">map ↗</a></span></li>`; }).join("")).join("") + nomap;
}

// ---------- family places (whole tree) ----------
const REGIONS = {
  brandon: [["All places", null], ["Valmozzola", [9.83, 44.53, 9.94, 44.6]], ["Parma & Liguria", [8.5, 44.0, 10.6, 45.0]], ["New York", [-74.15, 40.6, -73.75, 40.9]], ["Virginia & N.C.", [-83.8, 35.8, -75.6, 39.6]], ["Atlantic crossing", [-80, 34, 12, 52]]],
  holly: [["All places", null], ["Southampton & Sussex", [-77.75, 36.5, -76.75, 37.15]], ["Jamestown & Surry", [-77.1, 36.8, -76.4, 37.4]], ["Virginia & N.C.", [-80.5, 35.7, -75.6, 38.6]], ["Panama Canal Zone", [-80.1, 8.85, -79.45, 9.45]]],
};
async function openPlaces(region) {
  const all = [];
  for (const p0 of D.people) { const p = view_(p0.id); if (!p || (p.liv && !p.unlocked)) continue; for (const s of p.pl || []) all.push(Object.assign({ pid: p.id }, s)); }
  const pins = mapPlaces(all);
  const regs = REGIONS[TREE] || REGIONS.brandon;
  const cur = regs.find((r) => r[0] === region) || regs[0];
  let h = `<div class="flt-h"><span class="bi">${I.pin || I.tree}</span><h3>Family places</h3></div><div class="flt-sub">Every birth, home, voyage, military post and grave in the records, ${pins.length} places in all. Larger pins mean more people. Tap a pin to see who was there.</div>
    <div class="regions">${regs.map(([n]) => `<button class="chip${n === cur[0] ? " on" : ""}" data-region="${esc(n)}">${esc(n)}</button>`).join("")}</div>
    <div class="mapbox wide" id="fmap"><svg viewBox="0 0 560 360"></svg><div class="mapcap" id="fmapcap">Loading map…</div></div><div id="fmapwho" class="fmapwho"></div>`;
  openLayer("places", h, "wide"); setTab("places");
  document.querySelectorAll("[data-region]").forEach((b) => b.addEventListener("click", () => openPlaces(b.dataset.region)));
  const people = (q) => [...new Set(q.items.map((s) => s.pid))];
  const drawn = await renderMap($("#fmap svg"), pins, { H: 360, bounds: cur[1] || undefined, count: (q) => people(q).length, size: (q) => Math.min(13, 6 + Math.sqrt(people(q).length) * 1.6), color: (q) => (q.items.some((s) => s.k === "served") ? PLACE_KIND.served[1] : q.items.some((s) => s.k === "arrived" || s.k === "departed") ? PLACE_KIND.arrived[1] : "#5d6b3b"),
    label: (q) => q.items.slice().sort((a, b) => a.l.length - b.l.length)[0].l,
    onPin: (i) => showWho(pins[i]) });
  $("#fmapcap").textContent = `${drawn.length} of ${pins.length} places in this view · numbers show how many people`;
  function showWho(q) {
    const byP = new Map(); for (const s of q.items) { if (!byP.has(s.pid)) byP.set(s.pid, []); byP.get(s.pid).push(s); }
    const name = q.items.slice().sort((a, b) => a.l.length - b.l.length)[0].l;
    $("#fmapwho").innerHTML = `<div class="sec">${esc(name)}</div>` + [...byP].map(([pid, ss]) => personRow(P[pid], ss.map((s) => (PLACE_KIND[s.k] || [s.k])[0] + (s.y ? " " + s.y : "")).join(" · "), P[pid].st)).join("");
    $("#fmapwho").scrollIntoView({ block: "nearest", behavior: "smooth" });
  }
}

// ---------- photos and articles ----------
function mediaHTML(p) {
  const md = p.md || []; if (!md.length) return "";
  const photos = md.filter((m) => m.img), other = md.filter((m) => !m.img);
  const lic = (l) => String(l || "").replace(/\.?\s*(Link and credit only|Link only)[^.]*\.?/i, "").replace(/;?\s*do not (copy|re-?host)[^.;]*/i, "").trim();
  const credit = (m) => [m.credit ? "Credit: " + esc(m.credit) : "Credit not recorded", m.src && esc(m.src), m.date && esc(m.date), lic(m.lic) && esc(lic(m.lic))].filter(Boolean).join(" · ") + (m.note ? `<br>${esc(m.note)}` : "");
  let h = `<div class="sec">Photos &amp; articles</div>`;
  if (photos.length) h += `<div class="gallery">${photos.map((m) => `<figure><a href="${esc(m.url || m.img)}" target="_blank" rel="noopener nofollow"><img loading="lazy" src="${esc(/^https?:/.test(m.img) ? m.img : BASE + m.img)}" alt="${esc(m.title || "Photo of " + p.n)}"></a><figcaption>${m.title ? `<b>${esc(m.title)}</b>` : ""}${ratingTag(m.r)}<small>${credit(m)}</small></figcaption></figure>`).join("")}</div>`;
  if (other.length) h += `<ul class="flist media">${other.map((m) => `<li>${I.doc}<span>${m.url ? `<a href="${esc(m.url)}" target="_blank" rel="noopener nofollow">${esc(m.title || m.url)}</a>` : esc(m.title)}${m.kind && m.kind !== "link" ? ` <small class="mk">${esc(m.kind)}</small>` : ""}${ratingTag(m.r)}<div class="cite">${credit(m)}</div></span></li>`).join("")}</ul>`;
  return h;
}

// ---------- stories ----------
function openStories() {
  const feats = D.stories || [];
  let h = `<div class="flt-h"><span class="bi">${I.book}</span><h3>Stories</h3></div><div class="flt-sub">Featured stories and short sketches drawn from the records. Each claim keeps its rating on the person’s card.</div>`;
  for (const s of feats) h += `<button class="stcard big" data-story="${esc(s.slug)}"><div class="k">${esc(s.kicker)}</div><h4>${esc(s.title)}</h4><p>${esc(s.summary)}</p></button>`;
  h += `<button class="stcard big" id="placesCard"><div class="k">Map</div><h4>Family places</h4><p>Every birth, home, voyage, military post and grave in the records, on one map.</p></button>`;
  if (D.people.some((p) => p.jt)) h += `<button class="stcard big" id="jtStory"><div class="k">Lineage · 1607–1624</div><h4>The Jamestown line</h4><p>From Thomas Gray, an Ancient Planter on the 1624/25 muster at James Island, down to Holly, link by link, with every link rated.</p></button>`;
  const sk = D.people.filter((p) => !p.liv && ((p.hl && p.hl.length) || (p.stories && p.stories.length))).sort((a, b) => by(a.id) - by(b.id));
  h += `<div class="sec">From the records · ${sk.length} people</div>`;
  for (const p of sk) { const s0 = p.stories && p.stories[0]; const t = (p.hl && p.hl[0]) || (s0 ? (s0.title ? s0.title + ": " : "") + s0.t : ""); h += `<button class="stcard" data-open="${esc(p.id)}"><div class="k">${esc(p.yrs || "")}</div><h4>${esc(p.n)}</h4><p>${esc(t.length > 220 ? t.slice(0, 217) + "…" : t)}</p></button>`; }
  const off = (LAYOUT.unplaced || []).filter((id) => P[id]);
  if (off.length) { h += `<div class="sec">Also in the records · not drawn on the chart</div><div class="flt-sub">In-laws’ families and unconnected leads. Open a card to see how each one fits.</div>`; for (const id of off) h += personRow(P[id], P[id].sp.filter((s) => P[s]).map((s) => "spouse of " + esc(P[s].n)).concat(P[id].par.filter((q) => P[q]).length ? ["child of " + P[id].par.filter((q) => P[q]).map((q) => esc(P[q].n)).join(" & ")] : []).join(" · "), P[id].liv ? "" : P[id].st); }
  openLayer("stories", h, "wide");
  setTab("stories");
  const j = $("#jtStory"); if (j) j.onclick = () => { closeLayer(); setFilter("jt"); };
  const pc = $("#placesCard"); if (pc) pc.onclick = () => openPlaces();
}
function openStory(slug) {
  const s = (D.stories || []).find((x) => x.slug === slug); if (!s) return;
  openLayer("story", `<div class="story"><div class="eyebrow">${esc(s.kicker)}</div><h2>${esc(s.title)}</h2>${s.person && P[s.person] ? `<p style="font-family:var(--sans);font-size:13px"><button class="more-btn" data-open="${esc(s.person)}" style="margin:0">Open ${esc(P[s.person].n)}’s card ›</button></p>` : ""}${s.html}</div>`, "wide");
  history.replaceState(null, "", "#story=" + encodeURIComponent(slug));
  setTab("stories");
}
function renderFeature() {
  const el = $("#feat"); if (!el || isMobile()) return;
  let f;
  if (D.stories && D.stories[0]) { const s = D.stories[0]; f = { k: s.kicker, t: s.title.replace(/:.*/, ""), p: s.summary, go: "Read the story", icon: I.ship, act: () => openStory(s.slug) }; }
  else if (D.people.some((p) => p.jt)) f = { k: "Lineage · 1607–1624", t: "The Jamestown line", p: "Holly descends from Thomas Gray, an Ancient Planter on the 1624/25 muster. See every link and its rating.", go: "Show the line", icon: I.crown, act: () => setFilter("jt") };
  if (!f) return;
  const lh = $("#legend").getBoundingClientRect().height;
  el.innerHTML = `<div class="feat" style="bottom:${18 + lh + 12}px"><button class="close" aria-label="Hide">${ic("close", "width:12px;height:12px")}</button><div class="ph2">${f.icon}</div><div><div class="k">${esc(f.k)}</div><h4>${esc(f.t)}</h4><p>${esc(f.p)}</p><button class="go">${esc(f.go)} ${ic("chev", "width:12px;height:12px")}</button></div></div>`;
  el.querySelector(".go").onclick = f.act; el.querySelector(".close").onclick = () => (el.innerHTML = "");
}

// ---------- privacy: decrypt living details in the browser ----------
const ub64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const b64 = (u) => btoa(String.fromCharCode(...new Uint8Array(u)));
const KEYSTORE = "roots-family-key";
async function decryptWithKey(key) {
  const e = D.private; const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: ub64(e.iv) }, key, ub64(e.ct));
  return JSON.parse(new TextDecoder().decode(pt));
}
async function unlock(password) {
  const e = D.private; if (!e || !window.crypto || !crypto.subtle) throw new Error("unsupported");
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt: ub64(e.salt), iterations: e.iter }, base, { name: "AES-GCM", length: 256 }, true, ["decrypt"]);
  PRIV = await decryptWithKey(key); // wrong password -> AES-GCM authentication fails and this throws
  try { const raw = await crypto.subtle.exportKey("raw", key); const st = JSON.parse(sessionStorage.getItem(KEYSTORE) || "{}"); st[e.salt] = b64(raw); sessionStorage.setItem(KEYSTORE, JSON.stringify(st)); } catch (_) {}
}
async function tryAutoUnlock() {
  try {
    const st = JSON.parse(sessionStorage.getItem(KEYSTORE) || "{}"); const raw = D.private && st[D.private.salt]; if (!raw) return;
    const key = await crypto.subtle.importKey("raw", ub64(raw), { name: "AES-GCM" }, false, ["decrypt"]); PRIV = await decryptWithKey(key);
  } catch (_) { PRIV = null; }
}
function lockAgain() { PRIV = null; try { sessionStorage.removeItem(KEYSTORE); } catch (_) {} afterLockChange(); }
function afterLockChange() { const sel = state.sel; const v = Object.assign({}, view); drawTree(); Object.assign(view, v); applyView(false); updateLock(); if (sel) openPerson(sel); }
function updateLock() {
  const b = $("#lockBtn"); if (b) { b.classList.toggle("open", !!PRIV); b.innerHTML = PRIV ? `${I.check}<span class="lbl">Family view on</span>` : `${I.lock}<span class="lbl">Family sign-in</span>`; }
  const t = $("#tabLock"); if (t) t.textContent = PRIV ? "Family" : "Sign in";
}
function pwForm(id) { return `<form class="pwform" data-pw><input id="${id}" type="password" placeholder="Family password" autocomplete="current-password" aria-label="Family password" required><button type="submit">Unlock</button></form><div class="pwerr" aria-live="polite"></div>`; }
function bindPw(root) {
  (root || document).querySelectorAll("form[data-pw]").forEach((f) => f.addEventListener("submit", async (e) => {
    e.preventDefault(); const inp = f.querySelector("input"), err = f.nextElementSibling, btn = f.querySelector("button");
    btn.disabled = true; btn.textContent = "Checking…"; err.textContent = "";
    try { await unlock(inp.value); const m = $(".modal"); if (m) m.remove(); afterLockChange(); }
    catch (x) { err.textContent = x && x.message === "unsupported" ? "This browser can’t unlock private details." : "That password didn’t work. Please try again."; btn.disabled = false; btn.textContent = "Unlock"; inp.select(); }
  }));
}
function modal(html) {
  const m = document.createElement("div"); m.className = "modal"; m.innerHTML = `<div class="box" role="dialog"><div class="pclose"><button data-x aria-label="Close">${I.close}</button></div>${html}</div>`;
  document.body.appendChild(m); m.querySelector("[data-x]").onclick = () => m.remove(); m.onclick = (e) => { if (e.target === m) m.remove(); };
  return m;
}
function openSignIn() {
  if (PRIV) {
    const m = modal(`<h3>Family view is on</h3><p>Living relatives’ dates, places and notes are showing on this device until you close the browser tab.</p><div class="pwform"><button id="relock" type="button">Hide private details</button></div>`);
    m.querySelector("#relock").onclick = () => { m.remove(); lockAgain(); };
    return;
  }
  const m = modal(`<h3>Family sign-in</h3><p>The public tree shows living relatives by name only. Enter the family password to see their dates, places and notes on this device. Nothing is sent anywhere: the details are decrypted inside your browser.</p>${pwForm("pw-modal")}`);
  bindPw(m); setTimeout(() => m.querySelector("input").focus(), 30);
}

// ---------- search ----------
function searchIndex() {
  return D.people.map((p) => { const v = view_(p.id); const open = !p.liv || v.unlocked; return { id: p.id, n: p.n, hay: [p.n].concat(open ? [...(v.aka || []), v.b && v.b.p, v.d && v.d.p, v.line] : []).filter(Boolean).join(" ").toLowerCase(), meta: open ? [v.yrs, v.b && v.b.p].filter(Boolean).join(" · ") : "Living" }; });
}
function bindSearch(inputId) {
  const inp = $("#" + inputId), box = $("#" + inputId + "r"); if (!inp) return; let sel = 0, hits = [];
  const pick = (id) => { box.hidden = true; inp.value = ""; inp.blur(); $("#msearch").classList.add("hide"); openPerson(id); };
  const draw = () => {
    const q = inp.value.trim().toLowerCase(); if (!q) { box.hidden = true; return; }
    const terms = q.split(/\s+/);
    hits = searchIndex().filter((x) => terms.every((t) => x.hay.includes(t))).sort((a, b) => (a.n.toLowerCase().startsWith(q) ? 0 : 1) - (b.n.toLowerCase().startsWith(q) ? 0 : 1)).slice(0, 12); sel = 0;
    box.innerHTML = hits.length ? hits.map((x, i) => `<button data-id="${esc(x.id)}" class="${i === 0 ? "on" : ""}"><span class="av"></span><span><div class="n">${esc(x.n)}</div><div class="m">${esc(x.meta)}</div></span></button>`).join("") : `<div class="empty">No one found for “${esc(inp.value)}”.</div>`;
    box.hidden = false; box.querySelectorAll("button").forEach((b) => b.addEventListener("mousedown", (e) => { e.preventDefault(); pick(b.dataset.id); }));
  };
  inp.addEventListener("input", draw);
  inp.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); if (!hits.length) return; sel = (sel + (e.key === "ArrowDown" ? 1 : -1) + hits.length) % hits.length; box.querySelectorAll("button").forEach((b, i) => b.classList.toggle("on", i === sel)); }
    if (e.key === "Enter" && hits[sel]) pick(hits[sel].id);
    if (e.key === "Escape") { box.hidden = true; inp.blur(); }
  });
  inp.addEventListener("blur", () => setTimeout(() => { if (!isMobile()) box.hidden = true; }, 150));
}

// ---------- UI bindings ----------
function setTab(t) {
  document.querySelectorAll(".tabbar button").forEach((b) => b.classList.toggle("on", b.dataset.tab === (t === "places" ? "stories" : t)));
  document.querySelectorAll(".nav button").forEach((b) => b.classList.toggle("on", b.dataset.nav === (t === "key" || t === "lock" || t === "search" ? "tree" : t)));
}
function toggleKey() {
  const l = $("#legend");
  if (isMobile()) { l.classList.toggle("show"); setTab(l.classList.contains("show") ? "key" : "tree"); }
  else l.animate([{ boxShadow: "0 0 0 5px rgba(220,197,143,.95)" }, { boxShadow: "0 0 0 0 rgba(220,197,143,0)" }], { duration: 1400 });
}
function bindUI() {
  bindPanZoom();
  document.querySelectorAll(".chip[data-f]").forEach((c) => c.addEventListener("click", () => setFilter(c.dataset.f)));
  $("#zoom").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return; const r = stage.getBoundingClientRect(); const z = b.dataset.z;
    if (z === "in") zoomAt(r.width / 2, r.height / 2, 1.25); else if (z === "out") zoomAt(r.width / 2, r.height / 2, 0.8); else if (z === "fit") fit(true); else home(true);
  });
  $("#lockBtn").addEventListener("click", openSignIn);
  document.querySelectorAll(".nav button").forEach((b) => b.addEventListener("click", () => { const n = b.dataset.nav; if (n === "stories") openStories(); else if (n === "places") openPlaces(); else if (n === "key") toggleKey(); else { closeLayer(); } }));
  document.querySelectorAll(".tabbar button").forEach((b) => b.addEventListener("click", () => {
    const t = b.dataset.tab;
    if (t === "tree") { closeLayer(); $("#legend").classList.remove("show"); }
    else if (t === "stories") openStories();
    else if (t === "search") { $("#msearch").classList.remove("hide"); setTimeout(() => $("#mq").focus(), 30); }
    else if (t === "key") toggleKey();
    else if (t === "lock") openSignIn();
  }));
  $("#legend .x").addEventListener("click", () => { $("#legend").classList.remove("show"); setTab("tree"); });
  $("#msearch [data-close]").addEventListener("click", () => $("#msearch").classList.add("hide"));
  bindSearch("q"); bindSearch("mq");
  addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement.tagName !== "INPUT" && !isMobile()) { e.preventDefault(); $("#q").focus(); }
    if (e.key === "Escape" && !$(".modal") && document.activeElement.tagName !== "INPUT") closeLayer();
  });
  addEventListener("hashchange", handleHash);
}
function handleHash() {
  const h = decodeURIComponent(location.hash.slice(1));
  if (h.startsWith("p=") && P[h.slice(2)]) openPerson(h.slice(2));
  else if (h.startsWith("story=")) openStory(h.slice(6));
  else if (h === "jamestown" && D.people.some((p) => p.jt)) setFilter("jt");
  else if (h === "places" || h.startsWith("places=")) openPlaces(h.slice(7) || undefined);
}

// ---------- boot ----------
load().then(render).catch((e) => { $("#app").innerHTML = `<div class="boot">Sorry, the family tree could not load. ${esc(e.message)}</div>`; console.error(e); });
})();
