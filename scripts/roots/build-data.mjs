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

import { readFile, writeFile, readdir, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { webcrypto as crypto } from "node:crypto";
import { existsSync } from "node:fs";
import { copyFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { treePlaces } from "./places-lib.mjs";
import { makeMediaLib, assertNotPrivate, guardOutput, writeVillagePage, parsePlaque } from "./village.mjs";

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
  // no public text says Brandon confirmed, approved, verified, reviewed or viewed something (Brandon's request, 18 Oct 2026)
  t = t.replace(/\b((?:confirmed|approved|verified|reviewed|checked|vouched for|viewed(?:\s+read-only)?))\s+by\s+Brandon(?:\s+[A-Z]\.)?(?:\s+Chiesa)?\b/g, "$1");
  t = t.replace(/\bBrandon(?:\s+Chiesa)?\s+(?:has\s+)?(?:confirmed|approved|verified|reviewed|vouched for)\b[^.;)]*[.;]?/g, "");
  // attribution lines that say what Brandon decided, chose, identified, recalled or read are reworded neutrally
  // (Brandon's request, 18 Oct 2026). Photo and record-image credits ("Photo by Brandon Chiesa") are kept.
  t = t.replace(/\b(?:Birth date decided [^:;.]*:\s*)?Brandon(?:\s+Chiesa)?\s+chose the act date(?:,\s*|\s+on\s+[^.;)]*)?/g, (m) => (/,\s*$/.test(m) ? "Date per the birth act (atto 34): " : "The date follows the birth act (atto 34)"));
  t = t.replace(/\bBrandon(?:\s+Chiesa)?\s+chose\s+(\d{1,2}\s+\w+\s+\d{4})\s+from the act\b/g, "$1, per the birth act (atto 34)");
  t = t.replace(/\(Brandon(?:\s+Chiesa)?\s+chose this date[^)]*\)/g, "(date per the birth act, atto 34)");
  t = t.replace(/\bBrandon(?:\s+Chiesa)?\s+chose\b/g, "Chosen:");
  t = t.replace(/(^|[.!?]\s+)?\bBrandon(?:’|')s\s+copy\s+of\b/g, (m, lead) => (lead !== undefined ? lead + "The" : "the") + " record image of");
  t = t.replace(/\bBrandon(?:\s+Chiesa)?\s+identified\s+(?:this|it)\s+as\s+the\s+birthplace\b/g, "Identified as the birthplace from the birth act’s house number");
  t = t.replace(/;?\s*the\s+(?:house|building)s?\s+identifications?\s+(?:is|are)\s+Brandon(?:’|')s\b/g, "; identified as the birthplace from the birth act’s house number");
  t = t.replace(/\bThe identification of the buildings is Brandon(?:’|')s\b/g, "The buildings are identified from the house numbers in the birth acts");
  t = t.replace(/\bBrandon(?:\s+Chiesa)?\s+(?:recalls|recalled|remembers|remembered)\s*/g, "Family recollection: ");
  t = t.replace(/\bBrandon(?:\s+Chiesa)?\s+read\s+(?:it|this|the name)\s+as\s+(?:possibly\s+)?/g, "Possible reading: ");
  t = t.replace(/\b(?:[Rr]ead|[Tt]ranscribed)\s+from\s+Brandon(?:’|')s\s+screenshots?\b/g, (m) => (m[0] === "R" || m[0] === "T" ? "Read from record images" : "read from record images"));
  t = t.replace(/\(Brandon(?:\s+Chiesa)?,\s*([^,()]*?\d{4})(?:,\s*relayed by [^)]*)?\)/g, "($1)");
  t = t.replace(/\b(viewed|read|seen)\s+via\s+screenshots?\b/g, "$1 as record images");
  t = t.replace(/\bBrandon(?:\s+Chiesa)?\s+(?:decided|identified|believes|thinks|says|said|notes|noted|reads|judged|picked|selected)\b/g, "The family record says");
  // Roots' own neutralization (news1) wrote "the family chose …"; publish the same act-based wording as above
  t = t.replace(/\b(?:Birth date decided [^:;.]*:\s*)?[Tt]he family chose the act date,\s*/g, "Date per the birth act (atto 34): ");
  t = t.replace(/\b[Tt]he family chose\s+(\d{1,2}\s+\w+\s+\d{4})\s+from the act\b/g, "$1, per the birth act (atto 34)");
  t = t.replace(/\(date chosen by the family[^)]*\)/g, "(date per the birth act, atto 34)");
  t = t.replace(/\b([Tt])he family copy of\b/g, "$1he record image of");
  t = t.replace(/\bfamily-provided screenshots?\b/g, "record images");
  // Peter Samuel Burkett's second wife may be living: her name and marriage date are not published (18 Oct 2026)
  t = t.replace(/\bMarried Alice May Mann(?:\s+on)?\s+5 Sep 1981(?:;\s*she survived him)?\.?/g, "Remarried in 1981.");
  t = t.replace(/\bRemarried(?:\s+on)?\s+5 Sep 1981(?:;\s*his second wife survived him)?\.?/g, "Remarried in 1981.");
  t = t.replace(/\b2nd marriage 5 Sep 1981 Madison VA\s*\(FS QV1S-W8Q1\)\.?/g, "Remarried in 1981.");
  // research screenshots ("(screenshots in [research file])", "(screenshots x.png and -zoom.png)") are working files
  t = t.replace(/\s*\(screenshots?\b[^()]*\)/gi, "").replace(/;?\s*screenshots?\s+[\w-]+\.(?:png|jpe?g)(?:\s*(?:,|and)\s*[\w-]*\.(?:png|jpe?g))*/gi, "");
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
  // a death range ("after Apr 1910 and before 19 Aug 1917") shows as 1910–1917, not "bef. 1910"
  const rng = String(p.death?.date || "").match(/\b(?:after|aft\.|between)\b[^;]*?\b(1[5-9]\d\d|20[0-2]\d)\b[^;]*?\b(?:and|before|bef\.|-|–)\b[^;]*?\b(1[5-9]\d\d|20[0-2]\d)\b/i);
  if (rng && +rng[2] > +rng[1]) return `${by ? circ(p.birth.date) + by + " – " : "d. "}${rng[1]}–${rng[2]}`;
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
  if (isStr(m)) { add(m); if (!wars.size) wars.add("service"); }
  else if (Array.isArray(m)) {
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
  // a day number followed by a month ("Bruce 18 Oct") is a date, not an age; month names in any case
  const MONTH_CI = "(?:" + ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].map((m) => [...m].map((c) => `[${c.toUpperCase()}${c}]`).join("")).join("|") + ")";
  const agePats = [];
  // census-style mentions by given name and age ("daughters Carole J., 11, and Sandra G., 6") reveal birth years
  for (const p of living) {
    const g = nameTokens(p.name)[0];
    if (g && g.length > 2 && /^[A-Z]/.test(g)) agePats.push(new RegExp("\\b" + g.replace(".", "\\.?") + "(?:\\s+[A-Z]\\.)?,?\\s+(?:\\(?[Aa]ged?\\s+)?\\d{1,2}\\b(?![\\d,]*\\s*" + MONTH_CI + ")"));
  }
  // only in records from 1930 on, when someone still living could appear as a child
  const modern = /\b(?:19[3-9]\d|20\d\d)\b/;
  // research access dates ("read 18 Oct 2026", "viewed read-only by …, 18 Oct 2026", "accessed 2026") are not record years;
  // only 2020s years count as access dates, so "read 1935" on a stone still counts as a record year
  const ACCESS = /\b(?:read|viewed|accessed|retrieved|checked|consulted|downloaded)\b(?:\s+read-only)?(?:\s+by\s+[^,;()\d]{1,40}?)?,?\s+(?:on\s+)?(?:\d{1,2}\s+[A-Za-z]{3,9}\.?\s+|[A-Za-z]{3,9}\.?\s+\d{1,2},?\s+)?20[2-9]\d\b/g;
  const recent = (s) => modern.test(String(s).replace(ACCESS, " "));
  return (s) => pats.some((x) => x.re.test(s)) || (recent(s) && agePats.some((re) => re.test(s)));
}

// ---------- normalize one person ----------
function factList(p) {
  const out = [];
  for (const [k, v] of Object.entries(p)) {
    if (!/^facts(_|$)/.test(k) || !Array.isArray(v)) continue;
    for (const f of v) {
      if (typeof f === "string") out.push({ t: f, r: normRating(f.match(/(?:\(|\brating:\s*)(proven|probable|hypothesis|compiled|family claim)/i)?.[1]) });
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
// display_border: "solid", per person and per parent link. confirmed_by_brandon is NOT published (Brandon asked, 18 Oct 2026:
// no "Confirmed by Brandon" badge, note or citation anywhere on the site); the solid border alone marks a proven link.
function linkMeta(p) {
  const out = {};
  const put = (pid, o) => {
    if (!isStr(pid) || !o || typeof o !== "object") return;
    const m = {};
    if (String(o.display_border || "").toLowerCase() === "solid") m.b = "solid";
    if (Object.keys(m).length) out[pid] = m;
  };
  for (const key of ["confirmed_parent_links", "parent_links", "link_meta", "relationship_links"]) {
    const v = p[key];
    if (Array.isArray(v)) for (const o of v) put(o && (o.parent || o.id || o.to || o.person), o);
    else if (v && typeof v === "object") for (const [pid, o] of Object.entries(v)) put(pid, o);
  }
  return Object.keys(out).length ? out : null;
}
// origin_claims: hypothesized origins (parentage, birthplace, voyage), each with its own rating and assessment
function originClaims(p) {
  const arr = Array.isArray(p.origin_claims) ? p.origin_claims : [];
  return arr.map((c) => {
    if (isStr(c)) return { t: cleanText(c), r: normRating(c.match(/hypothesis|proven|probable|compiled|family claim/i)?.[0]) };
    if (!c || typeof c !== "object" || !isStr(c.claim || c.text)) return null;
    const a = isStr(c.assessment || c.notes || c.note) ? cleanText(c.assessment || c.notes || c.note) : null;
    const x = /\bcontradict|\bruled out|\bimpossib|\bnot supported|\bdisproved|\bcannot be (him|the same)|\brefuted/i.test((a || "") + " " + (c.verdict || "") + " " + (c.status || ""));
    return { t: cleanText(c.claim || c.text), r: normRating(c.confidence || c.rating), a, s: isStr(c.citation || c.source) ? cleanText(c.citation || c.source) : null, x: x || undefined };
  }).filter(Boolean);
}
// arrival: {year, port, ship, from, date, note, rating, source}; null or empty fields are dropped
// Ship photos: only public-domain / CC0 local files are copied, resized and re-encoded into public/roots/media/ships/.
const SHIP_DIR = path.join(REPO, "public/roots/media/ships");
const PD_RE = /\b(public domain|PD-|CC0)\b/i;
const shipDone = new Map();
function shipPhoto(ph, tree) {
  if (!ph || typeof ph !== "object" || !isStr(ph.local_file) || !PD_RE.test(String(ph.license || ""))) return null;
  const base = path.dirname(tree.file), src = path.resolve(base, ph.local_file);
  if (!src.startsWith(base + path.sep) || !existsSync(src)) return null;
  const slug = path.basename(src).replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9-]+/g, "-");
  if (!shipDone.has(slug)) {
    const r = spawnSync("python3", ["-c", `import sys,json
from PIL import Image, ImageOps
src,out=sys.argv[1],sys.argv[2]
im=ImageOps.exif_transpose(Image.open(src)).convert("RGB")
def save(w,fn,q):
    c=im.copy(); c.thumbnail((w,w*2)); c.save(fn,"JPEG",quality=q,optimize=True,progressive=True); return c.size
a=save(960,out+".jpg",78); b=save(240,out+"-th.jpg",72)
print(json.dumps({"w":a[0],"h":a[1]}))`, src, path.join(SHIP_DIR, slug)], { encoding: "utf8" });
    if (r.status !== 0) { console.warn("ship photo failed:", path.basename(src)); shipDone.set(slug, null); }
    else shipDone.set(slug, JSON.parse(r.stdout.trim().split("\n").pop()));
  }
  const dim = shipDone.get(slug); if (!dim) return null;
  const t = (v) => (isStr(v) ? cleanText(v) : null);
  return { src: `media/ships/${slug}.jpg`, th: `media/ships/${slug}-th.jpg`, w: dim.w, h: dim.h, cr: t(ph.credit), lic: t(ph.license), pg: isStr(ph.source_page) ? ph.source_page : null, n: t(ph.note) };
}
function arrivalOf(p, tree) {
  const a = p.arrival;
  if (!a || typeof a !== "object") return null;
  // cleanText drops internal research-file references; tidy the punctuation they leave behind
  const str = (v) => (isStr(v) && !/^(unknown|null|n\/a|none)$/i.test(v.trim()) ? cleanText(v.replace(/\s*\(?\b(?:see|copy|copies)\b:?\s*(?:fs-shots|ship-photos)\/[^\s)]*\)?\.?/gi, "").replace(/\s*\b(?:copy|copies):\s*(?=[.;)]|$)/gi, "")).replace(/(?:[;,]\s*(?:see|and|also)?\s*)+$/i, "").replace(/[;,]\s*(?:see|and)\s*([.)])/gi, "$1").trim() || null : null);
  // a null year stays null: "before 24 Apr 1704" is a latest date, not an arrival year
  // a year written as text ("by spring 1616 ...") is a date phrase, not a year
  const dateTxt = isStr(a.date) ? a.date : isStr(a.year) && !/^\d{4}$/.test(a.year.trim()) ? a.year : null;
  const y = a.year != null && a.year !== "" && Number.isFinite(Number(a.year)) ? Number(a.year) : isStr(dateTxt) && !/^\s*(before|by|bef\.?)\b/i.test(dateTxt) ? yearOf(dateTxt) || null : null;
  const out = { y, date: str(dateTxt), ship: str(a.ship), from: str(a.from), port: str(a.port), r: normRating(a.rating || a.confidence) || null, n: str(a.note || a.notes), s: str(a.source || a.citation) };
  // passage details: {value, rating, source}; a fare given as "estimate: ..." is flagged as an estimate
  const vrs = (o) => { if (!o) return null; if (isStr(o)) o = { value: o }; if (typeof o !== "object" || !str(o.value)) return null; return { v: str(o.value), r: normRating(o.rating || o.confidence) || null, s: str(o.source || o.citation) }; };
  out.cls = vrs(a.class || a.passenger_class);
  const fare = vrs(a.fare);
  if (fare) { const est = /^\s*(estimate|est\.|approx|roughly|about|c\.)/i.test(fare.v) || (fare.r && fare.r !== "proven"); fare.v = fare.v.replace(/^\s*estimate\s*[:\-]\s*/i, ""); fare.v = fare.v.charAt(0).toUpperCase() + fare.v.slice(1); if (est) fare.est = true; }
  out.fare = fare; out.fareN = str(a.fare_note);
  if (isStr(a.ship) && !/^\s*$/.test(a.ship)) { out.ph = !p._living ? shipPhoto(a.ship_photo, tree) : null; out.phN = str(a.ship_photo_note) || (a.ship_photo && !out.ph ? "Ship photo not shown." : null); }
  for (const k of Object.keys(out)) if (out[k] == null) delete out[k];
  return Object.keys(out).length ? out : null;
}
// immigrant_claim / origin / line_stop: optional researcher notes, each {.., rating, source}
const txtOf = (v) => (isStr(v) ? cleanText(v) : null);
function claimOf(c) { if (!c) return null; if (isStr(c)) return { t: cleanText(c) }; if (typeof c !== "object") return null; const t = txtOf(c.claim || c.text || c.note); return t ? { t, r: normRating(c.rating || c.confidence) || null, s: txtOf(c.source || c.citation) } : null; }
function originOf(o) { if (!o) return null; if (isStr(o)) return { p: cleanText(o) }; if (typeof o !== "object") return null; const pl = txtOf(o.place || o.from || o.text); return pl ? { p: pl, r: normRating(o.rating || o.confidence) || null, s: txtOf(o.source || o.citation) } : null; }
function lineStopOf(l) {
  if (!l) return null; if (isStr(l)) return { why: cleanText(l) }; if (typeof l !== "object") return null;
  const e = txtOf(l.earliest_record);
  const o = { why: txtOf(l.reason || l.note), lb: txtOf(l.likely_born), e: e && !/^see facts\b/i.test(e) ? e : null, r: normRating(l.rating || l.confidence) || null, s: txtOf(l.source || l.citation) };
  for (const k of Object.keys(o)) if (o[k] == null) delete o[k];
  return Object.keys(o).length ? o : null;
}
function normalize(p, tree) {
  const stRaw = p.status || "";
  const st = normRating(stRaw) || "probable";
  const facts = factList(p);
  const highlights = (p.highlights_r11 || []).filter(isStr);
  const stories = (p.stories || []).map((s) => ({ title: s.title, t: s.text, r: normRating(s.confidence), s: s.citation }));
  const occs = (p.occupations || []).map((o) => ({ t: o.occupation, y: o.date, p: o.place, r: normRating(o.confidence), s: o.citation }));
  if (isStr(p.occupation)) occs.push({ t: p.occupation, r: null });
  const famSrc = (x) => (isStr(x) ? x.replace(/Family knowledge\s*\([^)]*\)/gi, "Family knowledge") : x);
  const res = (p.residences || []).filter((o) => o && typeof o === "object").map((o) => ({ p: o.place, y: o.date || o.when || o.year || null, t: o.detail || o.note, r: normRating(o.confidence || o.rating), s: famSrc(o.citation || o.source) }));
  const news = (p.newspaper_mentions || []).map((o) => ({ paper: o.paper, y: o.date, t: o.text, r: normRating(o.confidence), s: o.citation }));
  const sources = (p.sources || []).filter(isStr).map((s) => ({ t: s, r: ratingInText(s) }));
  let mil = null;
  if (isStr(p.military)) mil = { lines: [["Service", p.military]], src: [] };
  else if (Array.isArray(p.military)) {
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
  if (p.marriage) ev(yearOf(p.marriage.date), "Married", [p.marriage.date, p.marriage.place].filter(isStr).join(" · "), normRating(p.marriage.rating) || ratingInText(p.marriage.source || ""));
  for (const f of facts) { const y = yearOf(f.t); if (y && y !== by && f.r !== "claim") ev(y, null, f.t, f.r); }
  for (const o of occs) ev(yearOf(o.y), "Occupation", [o.t, o.p].filter(isStr).join(" · "), o.r);
  for (const o of res) ev(yearOf(o.y), "Lived at", [o.p, o.t].filter(isStr).join(" · "), o.r);
  for (const o of news) ev(yearOf(o.y), "In the paper", `${o.paper ? o.paper + ": " : ""}${o.t || ""}`, o.r);
  const arr = arrivalOf(p, tree);
  const arrY = arr && (arr.y || yearOf(arr.date));
  if (arr && arrY) {
    const t = [arr.date && arr.date !== String(arr.y) ? arr.date : null, arr.ship ? "on " + arr.ship : null, arr.from ? "from " + arr.from : null, arr.port ? "at " + arr.port : null].filter(Boolean).join(" · ") || "Arrived";
    // the structured arrival replaces free-text facts that tell the same crossing
    for (let i = events.length - 1; i >= 0; i--) if (events[i].k === null && events[i].y === arrY && ARRIVAL.test(events[i].t)) events.splice(i, 1);
    ev(arrY, arr.y ? "Arrived" : "Arrived by", t, arr.r, true);
  }
  const dy = yearOf(p.death?.date);
  ev(dy, "Died", [p.death?.date, p.death?.place].filter(isStr).join(" · "), st, true);
  if (p.burial && typeof p.burial === "object") ev(yearOf(p.burial.date), "Buried", [p.burial.date, p.burial.place, p.burial.plot].filter(isStr).join(" · "), normRating(p.burial.status));
  events.sort((a, b) => a.y - b.y);
  const allText = JSON.stringify([facts, highlights, stories, notes, p.military || null, p.sources]);
  const born = [p.birth?.place].join(" ");
  const later = [p.death?.place, ...res.map((r) => r.p)].join(" ");
  const immGuess = (FOREIGN.test(born) && (US_PLACE.test(later) || ARRIVAL.test(allText))) || (/naturaliz/i.test(allText) && !US_PLACE.test(born) && /petition|naturaliz/i.test(highlights.join(" ") + facts.map((f) => f.t).join(" ") + (p.notes || "")) && FOREIGN.test(allText + born));
  return {
    id: p.id, n: p.name, sex: p.sex || "", st, stRaw, yrs: shortYears(p),
    b: { d: p.birth?.date || null, p: p.birth?.place || null }, d: { d: p.death?.date || null, p: p.death?.place || null },
    par: p.parents || [], sp: p.spouses || [], aka: Array.isArray(p.aka) ? p.aka : p.aka ? [p.aka] : [],
    // trees whose researchers set the immigrant flag use it as given; older trees fall back to the text heuristic
    imm: tree && tree.flagImm ? p.immigrant === true : !!immGuess, arr: arr || undefined, immC: p.immigrant === true ? undefined : claimOf(p.immigrant_claim) || undefined, org: originOf(p.origin) || undefined, ls: lineStopOf(p.line_stop) || undefined, wars: warsOf(p, allText), jt: !!p.jamestown_branch, jtR: p.jamestown_chain_rating || null, jtC: p.jamestown_chains || [],
    hl: highlights, stories, facts, occ: occs, res, news, mil, notes, src: sources, ev: events,
    cod: p.cause_of_death || null, bur: p.burial && typeof p.burial === "object" ? p.burial : null,
    line: p.line_r8us || p.line_r7us || p.line_r10 || null,
    rel: relOf(p),
    her: heritageList(p),
    oc: originClaims(p),
    border: String(p.display_border || "").toLowerCase() === "solid" ? "solid" : null,
    lk: linkMeta(p),
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
  // Brandon (the site owner) is named in source citations ("viewed read-only by Brandon Chiesa"); that is not a
  // mention of a living relative, so the same own-name exemption as media credits applies to facts, sources and events.
  const own1 = (t) => String(t).replace(/\b(?:viewed|read|transcribed|checked|provided|photographed)(?:\s+read-only)?\s+by\s+Brandon(?:\s+[A-Z]\.)?\s+Chiesa\b/g, "viewed by the site owner");
  keep(null, "hl", (x) => x);
  keep(null, "facts", (x) => own1(x.t + " " + (x.s || "")));
  keep(null, "stories", (x) => (x.title || "") + " " + x.t + " " + (x.s || ""));
  keep(null, "occ", (x) => JSON.stringify(x));
  keep(null, "res", (x) => JSON.stringify(x));
  keep(null, "news", (x) => JSON.stringify(x));
  keep(null, "notes", (x) => own1(x));
  keep(null, "src", (x) => own1(x.t));
  keep(null, "ev", (x) => own1(x.t));
  const own0 = (t) => String(t).replace(/\bBrandon(?:\s+[A-Z]\.)?\s+Chiesa\b/g, "Brandon");
  keep(null, "md", (x) => own0(JSON.stringify(x)));
  for (const k of ["arr", "immC", "org", "ls"]) if (rec[k] && namesLiving(JSON.stringify(rec[k]))) { priv[k] = rec[k]; delete rec[k]; }
  keep(null, "oc", (x) => x.t + " " + (x.a || "") + " " + (x.s || ""));
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
  // the confirmer's own name is the point of the badge, so it does not count as naming a living relative
  const own = (t) => String(t).replace(/\bBrandon(?:\s+[A-Z]\.)?\s+Chiesa\b/g, "Brandon");
  if (rec.cfm && rec.cfm.note && namesLiving(own(rec.cfm.note))) { priv.cfmx = rec.cfm.note; rec.cfm = { ...rec.cfm, note: null }; }
  if (rec.lk) for (const [q, m] of Object.entries(rec.lk)) if (m.c && m.c.note && namesLiving(own(m.c.note))) { (priv.lkx = priv.lkx || {})[q] = m.c.note; m.c = { ...m.c, note: null }; }
  if (rec.rel && rec.rel !== relBase(rec.rel) && namesLiving(rec.rel)) { priv.relx = rec.rel; rec.rel = relBase(rec.rel); }
  if (rec.mil) { const pv = rec.mil.src.filter(namesLiving); rec.mil.src = rec.mil.src.filter((s) => !namesLiving(s)); if (pv.length) priv.milsrc = pv; }
  return Object.keys(priv).length ? priv : null;
}

const RATE_KEYS = new Set(["st", "stRaw", "r", "rating", "status", "confidence"]);
function unproven(o, k) {
  if (typeof o === "string") return RATE_KEYS.has(k) && /^proven$/i.test(o) ? "probable" : o.replace(/\bPROVEN\b/g, "PROBABLE").replace(/\bProven\b/g, "Probable").replace(/\bproven\b/g, "probable");
  if (Array.isArray(o)) return o.map((x) => unproven(x));
  if (o && typeof o === "object") { const r = {}; for (const [kk, v] of Object.entries(o)) r[kk] = unproven(v, kk); return r; }
  return o;
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
const KIND_ORDER = { born: 0, baptised: 1, married: 3, lived: 4, worked: 4, departed: 5, emigrated: 5, arrived: 6, served: 7, died: 8, buried: 9 };
// a hand note that only repeats the place name adds nothing; one that starts with it keeps the rest
function handNote(note, lab) {
  if (!isStr(note)) return null;
  const n = note.trim(), base = String(lab || "").split(",")[0].trim().toLowerCase();
  if (!base || !n.toLowerCase().startsWith(base)) return n;
  let rest = n.slice(base.length).replace(/^[^(A-Za-z]*?(?:county|co\.)?,?\s*(?:virginia|va\.?)?\s*/i, "").trim();
  rest = rest.replace(/^\(([^)]*)\)/, "$1").replace(/^[,;\s]+/, "").trim();
  if (rest && String(lab).toLowerCase().replace(/\bco\.(?=,|\s|$)/g, "county").includes(rest.toLowerCase())) return null;
  return rest.length > 3 ? rest[0].toUpperCase() + rest.slice(1) : null;
}
function placesFor(list, pc, missing) {
  const pl = [], plx = [];
  for (const x of list || []) {
    const hand = pc.coords[x.key], g = pc.cache[x.key];
    const lab = cleanText(x.raw);
    if (Number.isFinite(x.lat) && Number.isFinite(x.lon)) pl.push({ k: x.k, l: lab, y: x.y, lat: x.lat, lon: x.lon, a: 0, m: null, n: x.note || null });
    else if (hand) pl.push({ k: x.k, l: lab, y: x.y, lat: hand.lat, lon: hand.lon, a: hand.approx || 0, m: hand.m || (hand.approx === 2 ? "area" : null), n: x.note || handNote(hand.note, lab) });
    else if (g && g.status === "ok") {
      const area = AREA_KINDS.has(g.kind) || g.prec === "region";
      pl.push({ k: x.k, l: lab, y: x.y, lat: g.lat, lon: g.lon, a: area ? 2 : g.prec === "exact" ? 0 : 1, m: area ? (g.kind === "county" ? "county" : g.kind === "country" ? "country" : "state") : g.prec === "exact" ? null : g.matched, n: x.note || null });
    }
    else { plx.push({ k: x.k, l: lab, y: x.y }); missing.add(x.key); }
  }
  // undated homes sit between the first and last dated places rather than after the burial
  const ys = pl.map((x) => x.y).filter(Boolean), mid = ys.length ? (Math.min(...ys) + Math.max(...ys)) / 2 : 9999;
  const yk = (x) => x.y || (x.k === "lived" || x.k === "worked" ? mid : x.k === "born" ? -1 : 9999);
  pl.sort((a, b) => yk(a) - yk(b) || KIND_ORDER[a.k] - KIND_ORDER[b.k]);
  return { pl, plx };
}

// ---------- photos, articles and links (optional fields the researchers may add) ----------
// Accepts any of: photos, images, media, articles, clippings, newspaper_articles, links.
// Each item may be a string (URL) or {title|caption, url|link, file|path|image, credit|photographer|courtesy,
// source|citation, date, license, confidence|rating, type}. Local image files are copied into
// public/roots/media/<tree>/ for deceased people only; living people's media stay private and file-less.
const MEDIA_KEYS = ["photos", "images", "media", "articles", "clippings", "newspaper_articles", "links"];
const IMG_EXT = /\.(jpe?g|png|webp|gif|avif)$/i;
let MEDIA_LIB = null;
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
      if (file && /(^|\/)private\//i.test(file)) { warn.push(`${p.id}: file in a private folder skipped`); continue; }
      // village photos: only photos/<place>/web (Brandon's) and photos/<place>/commons (with licence sidecars)
      const loc = file && MEDIA_LIB ? MEDIA_LIB.publish(file) : null;
      if (loc && loc.excluded) continue;
      if (loc && !isLiving) {
        m.img = loc.th; m.full = loc.full; m.w = loc.w; m.h = loc.h; m.place = isStr(it.place) ? it.place : null;
        if (loc.kind === "records") { m.credit = "Record image provided by Brandon Chiesa"; m.rec = true; m.r = normRating(it.rating || it.status) || "proven"; m.lic = it.license || "Family copy, used with permission"; m.tr = it.transcription ? cleanText(it.transcription) : null; m.date = null; }
        else if (loc.kind === "web") { m.credit = "Photo by Brandon Chiesa"; m.date = "June 2026"; m.r = "family"; m.lic = "Family photo, used with permission"; m.src = ""; if (m.note && /person is visible|approved use/i.test(m.note)) m.note = null; }
        else { m.credit = loc.author ? loc.author + " / Wikimedia Commons" : m.credit; m.lic = loc.lic || m.lic; m.url = loc.page || m.url; m.licUrl = loc.licUrl || null; m.src = ""; if (loc.cap) m.title = loc.cap; m.r = null; }
        if (/Albo d.oro/i.test(m.note || "")) m.plq = parsePlaque(m.note);
        out.push(m); continue;
      }
      if (loc && isLiving) continue;
      if (file) warn.push(`${p.id}: local file not published (only photos/*/web and photos/*/commons are)`);
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
  MEDIA_LIB = makeMediaLib({ repo: REPO, exclude: (pc.ov && pc.ov.media_exclude) || [], log: (m) => console.warn(m) });
  await rm(MEDIA_LIB.OUTDIR, { recursive: true, force: true }); // no stale or newly excluded photos survive a rebuild
  let village = null;
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
    await mkdir(SHIP_DIR, { recursive: true });
    tree.flagImm = people.some((p) => typeof p.immigrant === "boolean" || (p.arrival && typeof p.arrival === "object"));
    const perPlaces = treePlaces(people, pc.ov);
    const pub = [], priv = {};
    for (const p of people) {
      const rec = deepClean(normalize(p, tree));
      Object.assign(rec, placesFor(perPlaces.get(p.id), pc, missing));
      rec.md = await mediaFor(p, tree, p._living, warn);
      // the war-memorial note is shown with its photo; do not repeat it under research notes
      const plq = (rec.md || []).find((m) => m.plq);
      if (plq && Array.isArray(rec.notes)) rec.notes = rec.notes.filter((n) => n.trim() !== (plq.note || "").trim());
      // the solid-border key Jamestown line is rated probable as a chain; Brandon asked (18 Oct 2026) that the word
      // "proven" not appear anywhere on these cards; Brandon rated the line probable (and Martha's identity is open after
      // the 1839 Sussex register), so their proven-rated items show as Probable, with the normal Probable styling
      if (rec.border === "solid" || Object.values(rec.lk || {}).some((m) => m.b === "solid")) Object.assign(rec, unproven(rec));
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
    if (tree.key === "brandon") village = { people: pub, rawPeople: people.filter((p) => !p._living) };
    summary.push(`${tree.key}: ${pub.length} people (${pub.filter((p) => p.liv).length} living, ${Object.keys(priv).length} private records encrypted), ${data.stories.length} featured stories`);
  }
  if (village) {
    const plq = village.people.flatMap((p) => p.md || []).find((m) => m.plq);
    const v = await writeVillagePage({ repo: REPO, ...village, lib: MEDIA_LIB, plaque: plq ? plq.plq : null });
    summary.push(`valmozzola page: ${v.photos} family photos, ${v.commons} Commons images, ${v.emigrants} emigrants, ${v.records} record images${MEDIA_LIB.held.length ? "; held back: " + MEDIA_LIB.held.join(", ") : ""}`);
  }
  guardOutput(path.join(REPO, "public/roots"));
  // attribution guard: no public text may say what Brandon decided, chose, identified, recalled, read, confirmed or
  // reviewed (credits such as "Photo by Brandon Chiesa" are fine). The encrypted private block is not scanned.
  {
    const ATTRIB = /\bBrandon(?:\s+Chiesa)?\s+(?:chose|decided|identified|recalls|recalled|remembers|read\s+(?:it|this)|confirmed|approved|verified|reviewed|vouched)\b|\b(?:confirmed|approved|verified|reviewed|vouched for)\s+by\s+Brandon\b|\bBrandon(?:’|')s\s+(?:copy|screenshots?|identification|decision|reading)\b|\bidentifications?\s+(?:is|are)\s+Brandon(?:’|')s\b|Confirmed by Brandon|\b[Tt]he family chose\b|chosen by the family|family-provided screenshots?|Alice May Mann|5 Sep 1981|QV1S-W8Q1/;
    const files = [...["brandon", "holly"].map((k) => path.join(OUT, k + ".json")), path.join(REPO, "public/roots/valmozzola/index.html")];
    const hits = [];
    for (const f of files) {
      if (!existsSync(f)) continue;
      let txt = await readFile(f, "utf8");
      if (f.endsWith(".json")) { const j = JSON.parse(txt); delete j.private; txt = JSON.stringify(j); }
      const m = txt.match(new RegExp(ATTRIB.source, "g"));
      if (m) hits.push(path.basename(f) + ": " + [...new Set(m)].join(" | "));
    }
    if (hits.length) throw new Error("BUILD GUARD: attribution wording naming Brandon in public output: " + hits.join("; "));
  }
  console.log(summary.join("\n"));
  if (missing.size) console.log(`${missing.size} place(s) have no coordinates yet; run: node scripts/roots/geocode-places.mjs`);
  if (BANNED_HITS.n) console.log(`Removed the 'single with dependents' wording in ${BANNED_HITS.n} place(s).`);
  if (warn.length) console.log("Media warnings:\n  " + [...new Set(warn)].join("\n  "));
}
main().catch((e) => { console.error(e); process.exit(1); });
