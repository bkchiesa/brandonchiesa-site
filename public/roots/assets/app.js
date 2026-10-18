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
const RATING_LABEL = { proven: "Proven", probable: "Probable", compiled: "Compiled", hypothesis: "Hypothesis", family: "Family-provided" };
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
    <nav class="nav"><button class="on" data-nav="tree">Explore</button><button data-nav="stories">Stories</button><button data-nav="key">Key</button></nav>
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
  <span><span class="sw direct"></span>Direct line</span><span><span class="sw"></span>Proven</span><span><span class="sw probable"></span>Probable / index</span><span><span class="sw compiled"></span>Compiled tree</span><span><span class="sw hypothesis"></span>Hypothesis</span><span><span class="sw family"></span>Family-provided</span><span><span class="sw living"></span>Living</span><span class="sep"></span>
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
  const lineCls = (k) => { const p = P[k]; const st = p.liv ? "proven" : p.st; return st === "proven" || st === "family" ? "" : st; };
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
  for (const d of el.querySelectorAll(".g")) { const g = +d.dataset.g; d.style.top = (Y(g) * view.s + view.y + (CH * view.s) / 2 - 16) + "px"; }
}
function roman(n) { const m = [[10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]]; let s = ""; for (const [v, r] of m) while (n >= v) { s += r; n -= v; } return s; }
function drawMini() {
  const el = $("#mini"); if (!el) return;
  const w = 216, sx = w / LAYOUT.W, h = Math.max(60, Math.min(130, LAYOUT.H * sx)), sy = h / LAYOUT.H;
  let s = `<svg viewBox="0 0 ${w} ${h}" height="${h}" id="minisvg">`;
  for (const [id, v] of Object.entries(LAYOUT.pos)) {
    const p = P[id], st = p.liv ? "living" : p.st;
    const col = { proven: "#5d6b3b", probable: "#b0893c", compiled: "#9b9585", hypothesis: "#a8402f", family: "#2c3e5e", living: "#b8ab8a" }[st] || "#b0893c";
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
    const O = ["proven", "family", "probable", "compiled", "hypothesis"];
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
    <h2>${esc(p.n)}</h2>${p.aka && p.aka.length && !locked ? `<div class="born">also ${esc(p.aka.join(", "))}</div>` : ""}
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
    h += `<div class="cols"><div>${tl ? `<div class="sec">Life timeline</div><div class="tl">${tl}</div>` : ""}</div><div><div class="sec">Places</div><div class="mapbox" id="pmap"><svg viewBox="0 0 520 184"></svg><div class="mapcap" id="pmapcap">Loading map…</div></div><div class="sec">Family</div>${fam || `<p class="flt-sub">No relatives recorded yet.</p>`}</div></div>`;
    if (p.mil && p.mil.lines.length) h += `<div class="sec">Military record</div><div class="milbox"><dl>${p.mil.lines.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("")}</dl>${p.mil.src && p.mil.src.length ? `<div class="cite">Sources: ${p.mil.src.map(linkify).join("; ")}</div>` : ""}</div>`;
    const nodate = (p.facts || []).filter((f) => !YR.test(f.t));
    const extras = [].concat(
      (p.occ || []).map((o) => ({ t: `Occupation: ${o.t}${o.y ? " (" + o.y + ")" : ""}${o.p ? ", " + o.p : ""}`, r: o.r, s: o.s })),
      (p.res || []).filter((o) => !YR.test(o.y || "")).map((o) => ({ t: `Lived at ${o.p}${o.t ? ": " + o.t : ""}`, r: o.r, s: o.s })),
      (p.news || []).map((o) => ({ t: `${o.paper || "Newspaper"}${o.y ? ", " + o.y : ""}: ${o.t}`, r: o.r, s: o.s })),
      nodate);
    if (extras.length) h += `<div class="sec">More from the records</div><ul class="flist">${extras.map((f) => `<li>${esc(f.t)}${ratingTag(f.r)}${f.s ? `<div class="cite">${linkify(f.s)}</div>` : ""}</li>`).join("")}</ul>`;
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
const GAZ = [
  [/san siro|branzone|valmozzola|san martino|mormorola|calosa/i, "Valmozzola", 44.57, 9.88], [/borgotaro|borgo val di taro/i, "Borgotaro", 44.49, 9.77], [/parma/i, "Parma", 44.80, 10.33], [/piacenza/i, "Piacenza", 45.05, 9.69], [/genoa|genova/i, "Genoa", 44.41, 8.93],
  [/le havre|havre/i, "Le Havre", 49.49, 0.11], [/marseille/i, "Marseille", 43.3, 5.37], [/naples|napoli/i, "Naples", 40.85, 14.27],
  [/bronx|st\.? raymond/i, "Bronx", 40.84, -73.87], [/brooklyn/i, "Brooklyn", 40.65, -73.95], [/queens|woodside|calvary cemetery/i, "Queens", 40.74, -73.9],
  [/ellis island|manhattan|harlem|new york|nyc|\bn\.\s?y\b/i, "New York", 40.75, -73.98],
  [/east haven|new haven|conn\b|connecticut/i, "New Haven, Conn.", 41.3, -72.9], [/new jersey|\bn\.\s?j\b|newark|hoboken|paterson/i, "New Jersey", 40.73, -74.17],
  [/newport news|hampton roads|warwick co/i, "Newport News", 37.08, -76.47], [/hampton\b/i, "Hampton", 37.03, -76.35], [/norfolk|portsmouth|chesapeake/i, "Norfolk", 36.85, -76.29], [/suffolk|nansemond/i, "Suffolk", 36.73, -76.58],
  [/jamestown|james city|james island|james citty|james iland/i, "Jamestown", 37.21, -76.78], [/williamsburg/i, "Williamsburg", 37.27, -76.71], [/surry/i, "Surry Co.", 37.12, -76.89], [/isle of wight/i, "Isle of Wight Co.", 36.9, -76.7],
  [/southampton|drewryville|capron|newsoms|courtland|boykins|franklin, va/i, "Southampton Co.", 36.68, -77.1], [/sussex|waverly|wakefield|stony creek|albemarle parish/i, "Sussex Co.", 36.92, -77.26], [/greensville|emporia/i, "Greensville Co.", 36.68, -77.54],
  [/brunswick|lawrenceville/i, "Brunswick Co.", 36.76, -77.85], [/mecklenburg/i, "Mecklenburg Co.", 36.68, -78.37], [/amelia/i, "Amelia Co.", 37.34, -77.98], [/farmville|prince edward/i, "Farmville", 37.3, -78.39], [/dinwiddie|petersburg/i, "Petersburg", 37.23, -77.4], [/richmond|henrico/i, "Richmond", 37.54, -77.43],
  [/roanoke rapids|weldon|halifax co\.?,? n/i, "Roanoke Rapids, N.C.", 36.46, -77.65], [/northampton co|jackson, n|seaboard|garysburg|rich square/i, "Northampton Co., N.C.", 36.42, -77.4], [/edgecombe|tarboro/i, "Edgecombe Co., N.C.", 35.9, -77.6], [/hertford|bertie/i, "Hertford Co., N.C.", 36.36, -76.98],
  [/essex|tappahannock|occupacia|cockleshell/i, "Essex Co.", 37.94, -76.94], [/king and queen|king & queen/i, "King & Queen Co.", 37.67, -76.88], [/caroline/i, "Caroline Co.", 38.03, -77.35], [/orange co|st\.? mark/i, "Orange Co.", 38.25, -78.0], [/culpeper/i, "Culpeper", 38.47, -77.99], [/amherst/i, "Amherst Co.", 37.58, -79.05], [/bedford/i, "Bedford", 37.33, -79.52], [/lynchburg|campbell co/i, "Lynchburg", 37.41, -79.14], [/martinsville|henry co/i, "Martinsville", 36.69, -79.87],
  [/tazewell|jeffersonville|burkes garden|richlands/i, "Tazewell Co.", 37.11, -81.52], [/mercer|matoaka|princeton, w|bluefield|arista|iroquois/i, "Mercer Co., W.Va.", 37.4, -81.1], [/wyoming co|mullens|pineville/i, "Wyoming Co., W.Va.", 37.6, -81.55], [/mcdowell|welch/i, "McDowell Co., W.Va.", 37.38, -81.6], [/raleigh co|beckley/i, "Beckley, W.Va.", 37.78, -81.19],
  [/russell co|abingdon|fincastle|montgomery co|wythe/i, "Southwest Virginia", 36.9, -81.8], [/spartanburg/i, "Spartanburg, S.C.", 34.95, -81.93], [/baltimore/i, "Baltimore", 39.29, -76.61], [/philadelphia/i, "Philadelphia", 39.95, -75.16], [/washington, d|district of columbia/i, "Washington, D.C.", 38.9, -77.04],
  [/london/i, "London", 51.5, -0.12], [/england|britain/i, "England", 52.5, -1.5], [/scotland/i, "Scotland", 56.5, -4], [/ireland/i, "Ireland", 53.3, -7.7], [/germany|bavaria|palatinate/i, "Germany", 50.0, 8.5], [/france/i, "France", 46.6, 2.4],
  [/west virginia|w\.\s?va\b/i, "West Virginia", 38.4, -80.8], [/north carolina|\bn\.\s?c\b/i, "North Carolina", 35.8, -78.8], [/virginia|\bva\b/i, "Virginia", 37.5, -78.6], [/italy|italia/i, "Italy", 44.6, 10.0],
];
const MP = { L0: -82, L1: 18, B0: 33, B1: 58, W: 520 };
function proj(lat, lon) { const k = Math.cos(Math.PI / 4); const H = MP.W * (MP.B1 - MP.B0) / ((MP.L1 - MP.L0) * k); return [(lon - MP.L0) / (MP.L1 - MP.L0) * MP.W, (MP.B1 - lat) / (MP.B1 - MP.B0) * H]; }
function geocode(s) { if (!s) return null; for (const [re, label, lat, lon] of GAZ) if (re.test(s)) return { label, lat, lon }; return null; }
let MAPDATA = null;
async function drawPersonMap(p) {
  const stops = [];
  const push = (place, y) => { const g = geocode(place); if (!g) return; const last = stops[stops.length - 1]; if (last && last.label === g.label) return; stops.push(Object.assign({ y }, g)); };
  push(p.b && p.b.p, null);
  for (const e of p.ev || []) if (e.k !== "Born" && e.k !== "Died" && e.k !== "Buried") push(e.t, e.y);
  push(p.d && p.d.p, null);
  if (p.bur && p.bur.place) push(p.bur.place, null);
  if (!MAPDATA) { try { MAPDATA = await (await fetch(BASE + "assets/map.json")).json(); } catch { MAPDATA = { h: 184, d: "" }; } }
  const box = $("#pmap"); if (!box || state.sel !== p.id) return;
  const W = 520, H = MAPDATA.h || 184;
  const inMap = stops.filter((s) => s.lon >= MP.L0 && s.lon <= MP.L1 && s.lat >= MP.B0 && s.lat <= MP.B1);
  let vb = [0, 0, W, H];
  if (inMap.length) {
    const pts = inMap.map((s) => proj(s.lat, s.lon)); const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    let w = Math.min(W, Math.max(x1 - x0, 50) * 1.6 + 40), h = w * (H / W);
    if (y1 - y0 + 50 > h) { h = Math.min(H, y1 - y0 + 50); w = h * (W / H); }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    vb = [Math.max(0, Math.min(W - w, cx - w / 2)), Math.max(0, Math.min(H - h, cy - h / 2)), w, h];
  }
  const k = vb[2] / W;
  let svg = `<rect x="-50" y="-50" width="${W + 100}" height="${H + 100}" fill="#efe5cc"/><path d="${MAPDATA.d}" fill="#dccaa0" stroke="#b49f73" stroke-width="${0.6 * k}"/>`;
  const P2 = inMap.map((s) => proj(s.lat, s.lon));
  for (let i = 1; i < P2.length; i++) { const [ax, ay] = P2[i - 1], [bx, by2] = P2[i]; const mx = (ax + bx) / 2, my = Math.min(ay, by2) - Math.hypot(bx - ax, by2 - ay) * 0.22; svg += `<path d="M${ax},${ay} Q${mx},${my} ${bx},${by2}" fill="none" stroke="${Math.abs(bx - ax) > 150 ? "#b0893c" : "#5d6b3b"}" stroke-width="${1.8 * k}" stroke-dasharray="${5 * k} ${4 * k}"/>`; }
  const labs = [];
  P2.forEach(([x, y], i) => { const s = inMap[i]; const dup = labs.some(([px, py]) => Math.abs(px - x) < 45 * k && Math.abs(py - y) < 12 * k); labs.push([x, y]);
    svg += `<circle cx="${x}" cy="${y}" r="${4.2 * k}" fill="#a8402f" stroke="#fff8e8" stroke-width="${1.5 * k}"/>${dup ? "" : `<text x="${x + 7 * k}" y="${y + (i % 2 ? 13 : -6) * k}" font-family="Inter,sans-serif" font-size="${10 * k}" font-weight="600" fill="#2a2924" paint-order="stroke" stroke="#efe5cc" stroke-width="${2.5 * k}">${esc(s.label)}</text>`}`; });
  if (vb[2] > 300) { const [ox, oy] = proj(41, -45); svg += `<text x="${ox}" y="${oy}" font-family="Cormorant Garamond,serif" font-style="italic" font-size="${13 * k}" fill="#8a7a55">Atlantic Ocean</text>`; }
  const el = box.querySelector("svg"); el.setAttribute("viewBox", vb.map((v) => v.toFixed(1)).join(" ")); el.innerHTML = svg;
  const outside = stops.filter((s) => !inMap.includes(s));
  $("#pmapcap").innerHTML = stops.length ? stops.map((s) => `<b>${esc(s.label)}</b>${s.y ? " " + s.y : ""}`).join(" → ") + (outside.length ? " · some places fall outside this map" : "") : "No mapped places yet for this person.";
}

// ---------- stories ----------
function openStories() {
  const feats = D.stories || [];
  let h = `<div class="flt-h"><span class="bi">${I.book}</span><h3>Stories</h3></div><div class="flt-sub">Featured stories and short sketches drawn from the records. Each claim keeps its rating on the person’s card.</div>`;
  for (const s of feats) h += `<button class="stcard big" data-story="${esc(s.slug)}"><div class="k">${esc(s.kicker)}</div><h4>${esc(s.title)}</h4><p>${esc(s.summary)}</p></button>`;
  if (D.people.some((p) => p.jt)) h += `<button class="stcard big" id="jtStory"><div class="k">Lineage · 1607–1624</div><h4>The Jamestown line</h4><p>From Thomas Gray, an Ancient Planter on the 1624/25 muster at James Island, down to Holly, link by link, with every link rated.</p></button>`;
  const sk = D.people.filter((p) => !p.liv && ((p.hl && p.hl.length) || (p.stories && p.stories.length))).sort((a, b) => by(a.id) - by(b.id));
  h += `<div class="sec">From the records · ${sk.length} people</div>`;
  for (const p of sk) { const s0 = p.stories && p.stories[0]; const t = (p.hl && p.hl[0]) || (s0 ? (s0.title ? s0.title + ": " : "") + s0.t : ""); h += `<button class="stcard" data-open="${esc(p.id)}"><div class="k">${esc(p.yrs || "")}</div><h4>${esc(p.n)}</h4><p>${esc(t.length > 220 ? t.slice(0, 217) + "…" : t)}</p></button>`; }
  const off = (LAYOUT.unplaced || []).filter((id) => P[id]);
  if (off.length) { h += `<div class="sec">Also in the records · not drawn on the chart</div><div class="flt-sub">In-laws’ families and unconnected leads. Open a card to see how each one fits.</div>`; for (const id of off) h += personRow(P[id], P[id].sp.filter((s) => P[s]).map((s) => "spouse of " + esc(P[s].n)).concat(P[id].par.filter((q) => P[q]).length ? ["child of " + P[id].par.filter((q) => P[q]).map((q) => esc(P[q].n)).join(" & ")] : []).join(" · "), P[id].liv ? "" : P[id].st); }
  openLayer("stories", h, "wide");
  setTab("stories");
  const j = $("#jtStory"); if (j) j.onclick = () => { closeLayer(); setFilter("jt"); };
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
  document.querySelectorAll(".tabbar button").forEach((b) => b.classList.toggle("on", b.dataset.tab === t));
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
  document.querySelectorAll(".nav button").forEach((b) => b.addEventListener("click", () => { const n = b.dataset.nav; if (n === "stories") openStories(); else if (n === "key") toggleKey(); else { closeLayer(); } }));
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
}

// ---------- boot ----------
load().then(render).catch((e) => { $("#app").innerHTML = `<div class="boot">Sorry, the family tree could not load. ${esc(e.message)}</div>`; console.error(e); });
})();
