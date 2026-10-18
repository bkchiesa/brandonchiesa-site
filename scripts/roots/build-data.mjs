#!/usr/bin/env node
// Build the public data files for /roots from the researchers' tree-people.json files.
//
//   ROOTS_PASSWORD=... node scripts/roots/build-data.mjs
//
// Inputs (override with env vars):
//   ROOTS_BRANDON_JSON  default /workspace/douthat/tree-people.json
//   ROOTS_HOLLY_JSON    default /workspace/grizzard/tree-people.json
//   ROOTS_STORIES_DIR   default scripts/roots/stories (markdown with front matter)
// Output: public/roots/data/brandon.json, public/roots/data/holly.json
//
// The source files are never modified. Living people keep only their name in
// the public output; every other detail about them (and any text elsewhere
// that names them) is encrypted with AES-GCM using a key derived from
// ROOTS_PASSWORD via PBKDF2-SHA256. The password itself is never written out.

import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { webcrypto as crypto } from "node:crypto";
import { existsSync } from "node:fs";
import { copyFile } from "node:fs/promises";
import { treePlaces } from "./places-lib.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../..");
const OUT = path.join(REPO, "public/roots/data");
const PBKDF2_ITER = 600000;

const TREES = [
  { key: "brandon", file: process.env.ROOTS_BRANDON_JSON || "/workspace/douthat/tree-people.json",
    focal: "brandon-chiesa-1983", title: "The Chiesa Family", partnerTree: "holly",
    subtitle: "Valmozzola · New York · Tazewell · Essex · Newport News" },
  { key: "holly", file: process.env.ROOTS_HOLLY_JSON || "/workspace/grizzard/tree-people.json",
    focal: "holly-grizzard-1981", title: "The Grizzard Family", partnerTree: "brandon",
    subtitle: "Holly's lines · Southampton · Sussex · Brunswick · Jamestown" },
];
const STORIES_DIR = process.env.ROOTS_STORIES_DIR || path.join(HERE, "stories");

// ---------- helpers ----------
const isStr = (v) => typeof v === "string" && v.trim() !== "";
function normRating(s) {
  const t = String(s || "").toLowerCase();
  if (!t) return null;
  if (/hypoth/.test(t)) return "hypothesis";
  if (/family claim|\bclaim/.test(t)) return "claim";
  if (/family/.test(t)) return "family";
  if (/compiled/.test(t)) return "compiled";
  if (/probable|index|transcri|likely/.test(t)) return "probable";
  if (/proven|record-image|image read|certificate/.test(t)) return "proven";
  return null;
}
function ratingInText(s) {
  // only explicit markers inside a source string
  const m = String(s).match(/\b(PROVEN|PROBABLE|HYPOTHESIS|COMPILED|index entry only|index only|compiled)\b/);
  return m ? normRating(m[1]) : null;
}
const BANNED = /\bsingle\b[^.;]{0,40}?\b(?:with|had|has|having)\s+(?:\w+\s+)?dependents\b/i;
const BANNED_CLAUSE = /(?:^|(?<=[.;]))[^.;]*\bsingle\b[^.;]{0,40}?\b(?:with|had|has|having)\s+(?:\w+\s+)?dependents\b[^.;]*[.;]?\s*/gi;
const BANNED_HITS = { n: 0 };
function cleanText(s) {
  if (typeof s !== "string") return s;
  let t = s;
  // SSNs and their placeholders
  t = t.replace(/,?\s*(?:\.\.\.\s*)?SSN:?\s*\[SSN omitted\]\s*(?:\.\.\.)?/gi, " ");
  t = t.replace(/\[SSN omitted\]/gi, "");
  t = t.replace(/\b\d{3}-\d{2}-\d{4}\b/g, "[removed]");
  // internal working-file references
  t = t.replace(/\s*\((?:saved|transcription|see)[^()]*?(?:\/workspace\/|fs-shots\/|\.txt)[^()]*\)/gi, "");
  t = t.replace(/;?\s*(?:transcription\s+)?fs-shots\/[\w./-]+(?:\s+Round\s+\w+)?/gi, "");
  t = t.replace(/\/workspace\/[\w./-]+/g, "[research file]");
  // Aldo Chiesa's 1944 enlistment card was misread as "single, with dependents"; never publish that wording
  if (BANNED.test(t)) { BANNED_HITS.n++; t = t.replace(BANNED_CLAUSE, "").replace(/[;,:]\s*$/, ""); }
  t = t.replace(/\s{2,}/g, " ").replace(/\s+([,;.)])/g, "$1").replace(/\(\s*\)/g, "").trim();
  return t;
}
const YEAR_RE = /\b(1[5-9]\d\d|20[0-2]\d)\b/;
const yearOf = (s) => { const m = String(s || "").match(YEAR_RE); return m ? +m[1] : null; };

function shortYears(p) {
  const by = yearOf(p.birth?.date), dy = yearOf(p.death?.date);
  const circ = (s) => (/\b(c\.|abt|about|circa|~|est)/i.test(String(s || "")) ? "c." : "");
  const bef = (s) => (/\bbefore|bef\.|by\b/i.test(String(s || "")) ? "bef. " : /\bafter|aft\./i.test(String(s || "")) ? "aft. " : "");
  if (by && dy) return `${circ(p.birth.date)}${by} – ${bef(p.death.date)}${dy}`;
  if (by) return `b. ${circ(p.birth.date)}${by}`;
  if (dy) return `d. ${bef(p.death.date)}${dy}`;
  return "";
}

// ---------- flags ----------
const FOREIGN = /\b(italy|parma|valmozzola|san siro|branzone|san martino|borgotaro|genova|genoa|england|london|scotland|ireland|france|germany|bavaria|wales|netherlands|switzerland|italia)\b/i;
const ARRIVAL = /\b(arrived|arrival|emigrat|immigra|naturaliz|passenger manifest|manifest|sailed|ancient planter|1624\/5 muster|ellis island|declaration of intention)\b/i;
const US_PLACE = /\b(new york|manhattan|bronx|brooklyn|queens|harlem|virginia|va\b|\bva\.|n\.?c\b|north carolina|new jersey|nj|connecticut|conn|california|nevada|west virginia|wv|maryland|pennsylvania|ohio|south carolina|jamestown|surry|usa|u\.s\.)/i;

function warsOf(p, allText) {
  const wars = new Set();
  const m = p.military;
  const add = (txt) => {
    const t = String(txt || "");
    if (/revolution|1776|1777|1778|1779|1780|1781|continental|ensign.*177/i.test(t)) wars.add("rev");
    if (/war of 1812|\b1812\b|\b1813\b|\b1814\b/i.test(t)) wars.add("1812");
    if (/\bcsa\b|confedera|civil war|union army|\b186[1-5]\b/i.test(t)) wars.add("civil");
    if (/\bww ?i\b(?!i)|world war i\b|\b191[78]\b/i.test(t)) wars.add("ww1");
    if (/\bww ?ii\b|ww2|world war ii|\b194[1-6]\b|\bwwii\b/i.test(t)) wars.add("ww2");
    if (/korea/i.test(t)) wars.add("korea");
    if (/vietnam/i.test(t)) wars.add("vietnam");
  };
  if (Array.isArray(m)) {
    // list form: [{fact, rating, source}, ...]
    const txt = m.map((x) => (typeof x === "string" ? x : (x && (x.fact || x.text)) || "")).join(" ");
    if (txt.trim()) { add(txt); if (!wars.size) wars.add("service"); }
  } else if (m && typeof m === "object") {
    const served = (m.branch || m.highest_rank || m.rank || m.unit || m.war) && !/civilian/i.test(m.side || "") && !/not online/i.test(m.status || "");
    const regOnly = !m.branch && !m.highest_rank && !m.unit && /registration only/i.test(JSON.stringify(m.sources || ""));
    if (served && !regOnly) {
      add([m.war, m.side, m.service_dates, m.campaigns, m.unit, m.branch, m.highest_rank, m.description].flat().join(" "));
      if (!wars.size) { const by = yearOf(p.birth?.date); if (by >= 1885 && by <= 1900) wars.add("ww1"); else if (by > 1900 && by <= 1927) wars.add("ww2"); else wars.add("service"); }
    }
  }
  // explicit text claims of service (e.g. "War of 1812 private")
  if (/war of 1812 (private|soldier|service|veteran)|served in the war of 1812/i.test(allText)) wars.add("1812");
  if (/revolutionary war (patriot|soldier|service)|dar patriot/i.test(allText)) wars.add("rev");
  return [...wars];
}

// ---------- living-name scrubbing ----------
const TITLES = new Set(["Rev", "Dr", "Jr", "Sr", "Mrs", "Mr", "Col", "Capt"]);
function nameTokens(name) {
  const n = String(name).replace(/\(.*?\)|".*?"|'.*?'/g, " ");
  return (n.match(/[A-Z][a-zA-Z]+|[A-Z]\./g) || []).filter((t) => !TITLES.has(t.replace(".", "")));
}
function nameVariants(p, byId, withParens = false) {
  const t = nameTokens(p.name);
  if (!t.length) return [];
  const sur = new Set([t[t.length - 1]]);
  for (const m of String(p.name).matchAll(/\(([A-Z][a-z]+)\)/g)) sur.add(m[1]);
  if (p.sex === "F") for (const s of p.spouses || []) { const st = byId[s] && nameTokens(byId[s].name); if (st && st.length) sur.add(st[st.length - 1]); }
  const gives = new Set([t[0]]);
  for (const m of String(p.name).matchAll(/"([^"]+)"/g)) gives.add(m[1].split(/\s+/)[0]);
  if (/^Mary Beth/.test(p.name)) { gives.delete("Mary"); gives.add("Mary Beth"); }
  if (withParens) for (const m of String(p.name).matchAll(/\(([A-Z][a-z]+)\)/g)) gives.add(m[1]);
  const out = [];
  for (const g of gives) for (const s of sur) if (g !== s && g.length > 2) out.push([g, s]);
  return out;
}
function buildLivingMatchers(people, byId) {
  const living = people.filter((p) => p._living);
  const deadKeys = new Set(people.filter((p) => !p._living).flatMap((p) => nameVariants(p, byId, true).map(([g, s]) => g + "|" + s)));
  const pats = [];
  for (const p of living) {
    for (const [g, s] of nameVariants(p, byId)) {
      if (deadKeys.has(g + "|" + s)) {
        // ambiguous with a deceased relative: only the full name counts
        const full = nameTokens(p.name);
        if (full.length > 2) pats.push({ id: p.id, re: new RegExp("\\b" + full.map((x) => x.replace(".", "\\.?")).join("\\s+") + "\\b(?!\\s+Sr\\b)") });
      } else {
        pats.push({ id: p.id, re: new RegExp("\\b" + g + "\\b(?:\\s+[A-Z][\\w.]*){0,2}\\s+" + s + "\\b") });
      }
    }
  }
  return (s) => pats.some((x) => x.re.test(s));
}

// ---------- normalize one person ----------
function factList(p) {
  const out = [];
  for (const [k, v] of Object.entries(p)) {
    if (!/^facts(_|$)/.test(k) || !Array.isArray(v)) continue;
    for (const f of v) {
      if (typeof f === "string") out.push({ t: f, r: normRating(f.match(/\((proven|probable|hypothesis|compiled)/i)?.[1]) });
      else if (f && f.fact) out.push({ t: f.fact, r: normRating(f.rating || f.confidence), s: f.source || f.citation || null });
    }
  }
  return out;
}

// heritage_notes: family traditions and the research verdicts on them, each with its own rating
function heritageList(p) {
  const arr = Array.isArray(p.heritage_notes) ? p.heritage_notes : [];
  const tidy = (x) => String(x || "").replace(/\bRound \d+ (verdict|check|finding)s?\b/gi, (m, w) => "Research " + w.toLowerCase()).replace(/\s*\(Round \d+\)/gi, "").replace(/\b(in|from) the Round \d+ request\b/gi, "");
  return arr.map((h) => (typeof h === "string" ? { t: tidy(h), r: normRating(h.match(/family claim|hypothesis|proven|probable|compiled/i)?.[0]) } : h && (h.text || h.note || h.fact) ? { t: tidy(h.text || h.note || h.fact), r: normRating(h.confidence || h.rating), s: tidy(h.citation || h.source) || null } : null)).filter(Boolean);
}
function normalize(p, tree) {
  const stRaw = p.status || "";
  const st = normRating(stRaw) || "probable";
  const facts = factList(p);
  const highlights = (p.highlights_r11 || []).filter(isStr);
  const stories = (p.stories || []).map((s) => ({ title: s.title, t: s.text, r: normRating(s.confidence), s: s.citation }));
  const occs = (p.occupations || []).map((o) => ({ t: o.occupation, y: o.date, p: o.place, r: normRating(o.confidence), s: o.citation }));
  if (isStr(p.occupation)) occs.push({ t: p.occupation, r: null });
  const res = (p.residences || []).map((o) => ({ p: o.place, y: o.date, t: o.detail, r: normRating(o.confidence), s: o.citation }));
  const news = (p.newspaper_mentions || []).map((o) => ({ paper: o.paper, y: o.date, t: o.text, r: normRating(o.confidence), s: o.citation }));
  const sources = (p.sources || []).filter(isStr).map((s) => ({ t: s, r: ratingInText(s) }));
  let mil = null;
  if (Array.isArray(p.military)) {
    const items = p.military.map((x) => (typeof x === "string" ? { t: x } : { t: x.fact || x.text || "", r: normRating(x.rating || x.confidence), s: x.source || x.citation || null })).filter((x) => x.t);
    if (items.length) mil = { lines: items.map((x) => ["Service", x.t + (x.r && x.r !== "proven" ? ` (${x.r})` : "")]), src: items.map((x) => x.s).filter(isStr) };
  } else if (p.military && typeof p.military === "object") {
    const m = p.military;
    const lines = [];
    const put = (k, v) => { if (v && (!Array.isArray(v) || v.length)) lines.push([k, Array.isArray(v) ? v.join("; ") : String(v)]); };
    put("War", m.war); put("Side", m.side); put("Branch", m.branch); put("Rank", m.highest_rank || m.rank); put("Unit", m.unit);
    put("Service", m.service_dates || m.service); put("Campaigns", m.campaigns); put("Wounds / POW", m.wounds_pow); put("Pension", m.pension);
    put("Identification", m.identification); put("Description", m.description); put("Status", m.status); put("Where the records are", m.where); put("Notes", m.notes);
    mil = { lines, src: (m.sources || []).filter(isStr) };
  }
  const notes = [p.notes, p.note, p.hypotheses && "Hypotheses: " + p.hypotheses, p.conflict && "Conflict: " + p.conflict, p.conflict_r11b && "Conflict: " + p.conflict_r11b, p.burial_hint && "Burial lead: " + p.burial_hint]
    .filter(isStr);
  const events = [];
  const ev = (y, label, text, r, big) => { if (y) events.push({ y, k: label, t: text, r: r || null, big: !!big }); };
  const by = yearOf(p.birth?.date);
  ev(by, "Born", [p.birth?.date, p.birth?.place].filter(isStr).join(" · "), st, true);
  if (p.baptism) ev(yearOf(p.baptism.date), "Baptised", [p.baptism.date, p.baptism.place].filter(isStr).join(" · "), ratingInText(p.baptism.source || ""));
  if (p.marriage) ev(yearOf(p.marriage.date), "Married", [p.marriage.date, p.marriage.place].filter(isStr).join(" · "), ratingInText(p.marriage.source || ""));
  for (const f of facts) { const y = yearOf(f.t); if (y && y !== by) ev(y, null, f.t, f.r); }
  for (const o of occs) ev(yearOf(o.y), "Occupation", [o.t, o.p].filter(isStr).join(" · "), o.r);
  for (const o of res) ev(yearOf(o.y), "Lived at", [o.p, o.t].filter(isStr).join(" · "), o.r);
  for (const o of news) ev(yearOf(o.y), "In the paper", `${o.paper ? o.paper + ": " : ""}${o.t || ""}`, o.r);
  const dy = yearOf(p.death?.date);
  ev(dy, "Died", [p.death?.date, p.death?.place].filter(isStr).join(" · "), st, true);
  if (p.burial && typeof p.burial === "object") ev(yearOf(p.burial.date), "Buried", [p.burial.date, p.burial.place, p.burial.plot].filter(isStr).join(" · "), normRating(p.burial.status));
  events.sort((a, b) => a.y - b.y);
  const allText = JSON.stringify([facts, highlights, stories, notes, p.military || null, p.sources]);
  const born = [p.birth?.place].join(" ");
  const later = [p.death?.place, ...res.map((r) => r.p)].join(" ");
  const imm = (FOREIGN.test(born) && (US_PLACE.test(later) || ARRIVAL.test(allText))) || (/naturaliz/i.test(allText) && !US_PLACE.test(born) && /petition|naturaliz/i.test(highlights.join(" ") + facts.map((f) => f.t).join(" ") + (p.notes || "")) && FOREIGN.test(allText + born));
  return {
    id: p.id, n: p.name, sex: p.sex || "", st, stRaw, yrs: shortYears(p),
    b: { d: p.birth?.date || null, p: p.birth?.place || null }, d: { d: p.death?.date || null, p: p.death?.place || null },
    par: p.parents || [], sp: p.spouses || [], aka: Array.isArray(p.aka) ? p.aka : p.aka ? [p.aka] : [],
    imm: !!imm, wars: warsOf(p, allText), jt: !!p.jamestown_branch, jtR: p.jamestown_chain_rating || null, jtC: p.jamestown_chains || [],
    hl: highlights, stories, facts, occ: occs, res, news, mil, notes, src: sources, ev: events,
    cod: p.cause_of_death || null, bur: p.burial && typeof p.burial === "object" ? p.burial : null,
    line: p.line_r8us || p.line_r7us || p.line_r10 || null,
    rel: relOf(p),
    her: heritageList(p),
  };
}

// strip text that names a living person out of a public record, returning the private remainder
// relationship to the tree's focal person, as the researchers wrote it (e.g. "first cousin (child of aunt ...)")
function relOf(p) {
  const r = p.relationship_to_holly || p.relationship_to_brandon || p.relationship_to_focal || p.relationship || null;
  return isStr(r) ? cleanText(r) : null;
}
const relBase = (r) => (r ? r.split(/\s*[(;]/)[0].trim() || null : null);
function splitPrivate(rec, namesLiving) {
  const priv = {};
  const keep = (arr, key, getText) => {
    if (!Array.isArray(rec[key])) return;
    const pub = [], pv = [];
    for (const x of rec[key]) (namesLiving(getText(x)) ? pv : pub).push(x);
    rec[key] = pub; if (pv.length) priv[key] = pv;
  };
  keep(null, "hl", (x) => x);
  keep(null, "facts", (x) => x.t + " " + (x.s || ""));
  keep(null, "stories", (x) => (x.title || "") + " " + x.t + " " + (x.s || ""));
  keep(null, "occ", (x) => JSON.stringify(x));
  keep(null, "res", (x) => JSON.stringify(x));
  keep(null, "news", (x) => JSON.stringify(x));
  keep(null, "notes", (x) => x);
  keep(null, "src", (x) => x.t);
  keep(null, "ev", (x) => x.t);
  keep(null, "md", (x) => JSON.stringify(x));
  // heritage notes: judge by the note itself; a citation that only names who relayed a family story is reworded
  if (Array.isArray(rec.her)) {
    const pub = [], pv = [];
    for (const x of rec.her) {
      if (namesLiving(x.t)) { pv.push(x); continue; }
      if (x.s && namesLiving(x.s)) { if (x.r === "claim") pub.push({ ...x, s: "Family tradition, passed on by the family (oral; no record cited)" }); else pv.push(x); }
      else pub.push(x);
    }
    rec.her = pub; if (pv.length) priv.her = pv;
  }
  if (rec.rel && rec.rel !== relBase(rec.rel) && namesLiving(rec.rel)) { priv.relx = rec.rel; rec.rel = relBase(rec.rel); }
  if (rec.mil) { const pv = rec.mil.src.filter(namesLiving); rec.mil.src = rec.mil.src.filter((s) => !namesLiving(s)); if (pv.length) priv.milsrc = pv; }
  return Object.keys(priv).length ? priv : null;
}

function deepClean(o) {
  if (typeof o === "string") return cleanText(o);
  if (Array.isArray(o)) return o.map(deepClean);
  if (o && typeof o === "object") { const r = {}; for (const [k, v] of Object.entries(o)) r[k] = deepClean(v); return r; }
  return o;
}

// ---------- places (coordinates come from the committed cache; no network here) ----------
const PLACE_DIR = HERE;
async function loadPlaceCache() {
  const rd = async (n) => (existsSync(path.join(PLACE_DIR, n)) ? JSON.parse(await readFile(path.join(PLACE_DIR, n), "utf8")) : {});
  const ov = await rd("places-overrides.json");
  return { ov, cache: { ...(await rd("places-cache-private.json")), ...(await rd("places-cache.json")) }, coords: ov.coords || {} };
}
const AREA_KINDS = new Set(["county", "state", "country", "region", "province"]);
const KIND_ORDER = { born: 0, baptised: 1, married: 3, lived: 4, worked: 4, departed: 5, arrived: 6, served: 7, died: 8, buried: 9 };
function placesFor(list, pc, missing) {
  const pl = [], plx = [];
  for (const x of list || []) {
    const hand = pc.coords[x.key], g = pc.cache[x.key];
    const lab = cleanText(x.raw);
    if (hand) pl.push({ k: x.k, l: lab, y: x.y, lat: hand.lat, lon: hand.lon, a: hand.approx || 0, m: hand.m || (hand.approx === 2 ? "area" : null), n: x.note || hand.note || null });
    else if (g && g.status === "ok") {
      const area = AREA_KINDS.has(g.kind) || g.prec === "region";
      pl.push({ k: x.k, l: lab, y: x.y, lat: g.lat, lon: g.lon, a: area ? 2 : g.prec === "exact" ? 0 : 1, m: area ? (g.kind === "county" ? "county" : g.kind === "country" ? "country" : "state") : g.prec === "exact" ? null : g.matched, n: x.note || null });
    }
    else { plx.push({ k: x.k, l: lab, y: x.y }); missing.add(x.key); }
  }
  pl.sort((a, b) => (a.y || 9999) - (b.y || 9999) || KIND_ORDER[a.k] - KIND_ORDER[b.k]);
  return { pl, plx };
}

// ---------- photos, articles and links (optional fields the researchers may add) ----------
// Accepts any of: photos, images, media, articles, clippings, newspaper_articles, links.
// Each item may be a string (URL) or {title|caption, url|link, file|path|image, credit|photographer|courtesy,
// source|citation, date, license, confidence|rating, type}. Local image files are copied into
// public/roots/media/<tree>/ for deceased people only; living people's media stay private and file-less.
const MEDIA_KEYS = ["photos", "images", "media", "articles", "clippings", "newspaper_articles", "links"];
const IMG_EXT = /\.(jpe?g|png|webp|gif|avif)$/i;
async function mediaFor(p, tree, isLiving, warn) {
  const out = [];
  let n = 0;
  for (const key of MEDIA_KEYS) {
    const arr = Array.isArray(p[key]) ? p[key] : p[key] ? [p[key]] : [];
    for (const it0 of arr) {
      const it = typeof it0 === "string" ? { url: it0 } : it0 || {};
      const url = it.url || it.page_url || it.link || it.href || null;
      const imgUrl = it.image_url || it.img_url || it.thumbnail || null;
      const lic0 = String(it.license || it.licence || "");
      // Thumbnails only where the source allows hotlinking (public domain / Wikimedia Commons / open licence).
      // "Link and credit only" or "do not re-host" stays a link card. Nothing is ever re-hosted.
      const mayHotlink = (/public domain|\bcc[- ]?(by|0|zero)\b|creative commons/i.test(lic0) || /upload\.wikimedia\.org/.test(imgUrl || "")) && !/link (and credit )?only|do not (copy|re-?host)/i.test(lic0);
      const file = it.file || it.path || it.image || it.local || null;
      let kind = it.type || it.kind || (/article|clipping/.test(key) ? "article" : /photo|image/.test(key) ? "photo" : key === "links" ? "link" : null);
      if (!kind) kind = IMG_EXT.test(file || url || "") ? "photo" : "link";
      const m = { kind, title: cleanText(it.title || it.caption || it.headline || it.description || ""), url: url && /^https?:\/\//.test(url) ? url : null,
        credit: cleanText(it.credit || it.photographer || it.courtesy || it.copyright || it.author || ""), src: cleanText([it.source || it.citation || it.publication || it.paper || "", it.page ? "p. " + String(it.page).replace(/^p(age)?\.?\s*/i, "") : ""].filter(Boolean).join(", ")), note: it.note ? cleanText(it.note) : null,
        date: it.date || it.year || null, lic: it.license || it.licence || null, r: normRating(it.confidence || it.rating || it.status), img: null };
      if (file && /(^|\/)private\//.test(file)) { warn.push(`${p.id}: file in a private folder skipped`); continue; }
      if (file) warn.push(`${p.id}: local file not published (the site links to sources and never re-hosts)`);
      if (!isLiving && imgUrl && /^https:\/\//.test(imgUrl) && mayHotlink) m.img = imgUrl;
      else if (!isLiving && url && IMG_EXT.test(url) && mayHotlink) m.img = url;
      if (!m.credit) warn.push(`${p.id}: ${kind} "${(m.title || url || file || "").slice(0, 50)}" has no credit`);
      if (m.url || m.img || m.title) out.push(m);
    }
  }
  return out;
}

// ---------- tiny markdown ----------
function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
function inline(s) {
  return esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\b((?:https?:\/\/)?(?:archive\.org|[\w-]+\.(?:org|com|gov))\/[^\s<,;)]+)/g, (m) => `<a href="${m.startsWith("http") ? m : "https://" + m}" target="_blank" rel="noopener">${m}</a>`);
}
function markdown(md) {
  const out = []; let list = null;
  for (const raw of md.split(/\r?\n/)) {
    const l = raw.trimEnd();
    if (/^- /.test(l)) { if (!list) { list = []; } list.push(`<li>${inline(l.slice(2))}</li>`); continue; }
    if (list) { out.push(`<ul>${list.join("")}</ul>`); list = null; }
    if (!l.trim()) continue;
    const h = l.match(/^(#{1,4})\s+(.*)/);
    if (h) out.push(`<h${h[1].length + 1}>${inline(h[2])}</h${h[1].length + 1}>`);
    else out.push(`<p>${inline(l)}</p>`);
  }
  if (list) out.push(`<ul>${list.join("")}</ul>`);
  return out.join("\n");
}
async function loadStories() {
  let files = [];
  try { files = (await readdir(STORIES_DIR)).filter((f) => f.endsWith(".md")).sort(); } catch { return []; }
  const out = [];
  for (const f of files) {
    const txt = await readFile(path.join(STORIES_DIR, f), "utf8");
    const m = txt.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    const meta = {}; let body = txt;
    if (m) { body = m[2]; for (const line of m[1].split("\n")) { const kv = line.match(/^(\w+):\s*(.*)$/); if (kv) meta[kv[1]] = kv[2].replace(/^"(.*)"$/, "$1"); } }
    out.push({ slug: f.replace(/\.md$/, ""), title: meta.title || f, tree: meta.tree || "brandon", person: meta.person || null, kicker: meta.kicker || "Featured story", summary: meta.summary || "", html: markdown(cleanText(body)) });
  }
  return out;
}

// ---------- crypto ----------
const b64 = (u8) => Buffer.from(u8).toString("base64");
async function deriveKey(password, salt) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt, iterations: PBKDF2_ITER }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
}
async function encrypt(key, salt, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(obj))));
  return { alg: "AES-GCM-256", kdf: "PBKDF2-SHA256", iter: PBKDF2_ITER, salt: b64(salt), iv: b64(iv), ct: b64(ct) };
}

// ---------- main ----------
async function main() {
  const password = process.env.ROOTS_PASSWORD;
  if (!password) { console.error("Set ROOTS_PASSWORD (the family password) in the environment. It is used only to encrypt living relatives' details."); process.exit(1); }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(password, salt);
  const stories = await loadStories();
  const pc = await loadPlaceCache();
  const missing = new Set(), warn = [];
  await mkdir(OUT, { recursive: true });
  const summary = [];
  for (const tree of TREES) {
    const raw = JSON.parse(await readFile(tree.file, "utf8"));
    const people = Array.isArray(raw) ? raw : raw.people || Object.values(raw);
    const byId = Object.fromEntries(people.map((p) => [p.id, p]));
    for (const p of people) {
      const by = yearOf(p.birth?.date);
      // presumed living: flagged, or born 1925+ with no death date or place
      p._living = !!p.living || (by && by >= 1925 && !isStr(p.death?.date) && !isStr(p.death?.place));
    }
    const namesLiving = buildLivingMatchers(people, byId);
    const perPlaces = treePlaces(people, pc.ov);
    const pub = [], priv = {};
    for (const p of people) {
      const rec = deepClean(normalize(p, tree));
      Object.assign(rec, placesFor(perPlaces.get(p.id), pc, missing));
      rec.md = await mediaFor(p, tree, p._living, warn);
      if (p._living) {
        // public: name and family links only
        pub.push({ id: rec.id, n: cleanText(p.name), sex: rec.sex, par: rec.par, sp: rec.sp, liv: true, ...(rec.rel ? { rel: relBase(rec.rel) } : {}) });
        const { id, n, par, sp, ...rest } = rec;
        priv[p.id] = { ...rest, full: true };
        continue;
      }
      const pv = splitPrivate(rec, namesLiving);
      if (pv) priv[p.id] = { extra: pv };
      pub.push(rec);
    }
    // relationships must point at known people
    const ids = new Set(pub.map((p) => p.id));
    for (const p of pub) { p.par = p.par.filter((x) => ids.has(x)); p.sp = p.sp.filter((x) => ids.has(x)); }
    // source ids often end in a birth year (e.g. "...-1983"); give living people opaque ids so the
    // shipped files never reveal their birth years
    const opaque = new Map(); let li = 0;
    for (const p of pub) if (p.liv) opaque.set(p.id, `living-${++li}`);
    const remap = (obj) => JSON.parse(JSON.stringify(obj).replace(/"((?:[^"\\]|\\.)*)"/g, (m, s) => (opaque.has(s) ? `"${opaque.get(s)}"` : m)));
    const privOut = remap(priv);
    const enc = await encrypt(key, salt, privOut);
    const data = remap({
      v: 1, tree: tree.key, built: new Date().toISOString(), title: tree.title, subtitle: tree.subtitle,
      focal: tree.focal, partnerTree: tree.partnerTree, people: pub,
      stories: stories.filter((s) => s.tree === tree.key),
      privHint: Object.keys(privOut).filter((id) => privOut[id].extra),
    });
    data.private = enc;
    await writeFile(path.join(OUT, tree.key + ".json"), JSON.stringify(data));
    summary.push(`${tree.key}: ${pub.length} people (${pub.filter((p) => p.liv).length} living, ${Object.keys(priv).length} private records encrypted), ${data.stories.length} featured stories`);
  }
  console.log(summary.join("\n"));
  if (missing.size) console.log(`${missing.size} place(s) have no coordinates yet; run: node scripts/roots/geocode-places.mjs`);
  if (BANNED_HITS.n) console.log(`Removed the 'single with dependents' wording in ${BANNED_HITS.n} place(s).`);
  if (warn.length) console.log("Media warnings:\n  " + [...new Set(warn)].join("\n  "));
}
main().catch((e) => { console.error(e); process.exit(1); });
