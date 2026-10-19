// Shared by build-data.mjs and geocode-places.mjs: find the places mentioned in a person record
// and turn each one into a stable cache key. No network access here.

const isStr = (v) => typeof v === "string" && v.trim() !== "";
const YEAR_RE = /\b(1[5-9]\d\d|20[0-2]\d)\b/;
const yearOf = (s) => { const m = String(s || "").match(YEAR_RE); return m ? +m[1] : null; };

const STATES = { VA: "Virginia", "W.Va": "West Virginia", WV: "West Virginia", NC: "North Carolina", "N.C": "North Carolina", SC: "South Carolina", "S.C": "South Carolina", NY: "New York", "N.Y": "New York", NJ: "New Jersey", "N.J": "New Jersey", CT: "Connecticut", Conn: "Connecticut", MD: "Maryland", Md: "Maryland", TN: "Tennessee", Tenn: "Tennessee", MO: "Missouri", IL: "Illinois", FL: "Florida", ID: "Idaho", NV: "Nevada", PA: "Pennsylvania", Va: "Virginia", CA: "California" };
// Spell out abbreviations so "Lynchburg, Va." and "Lynchburg, Virginia" are the same place.
export function expandPlace(raw) {
  let s = cleanPlace(raw);
  s = s.replace(/\bCos?\.(?=,|\s|$)/g, "County").replace(/\bCem\.(?=,|\s|$)/g, "Cemetery").replace(/\bDist\.(?=,|\s|$)/g, "District").replace(/\bSt\.(?= [A-Z])/g, "Saint").replace(/\bUMC\b/g, "United Methodist Church").replace(/\bE\.(?= \d)/g, "East").replace(/\b(\d+(?:st|nd|rd|th)) St\b\.?/g, "$1 Street");
  s = s.split(",").map((part) => { const t = part.trim().replace(/\.$/, ""); return STATES[t] || t; }).join(", ");
  return s;
}
// Cache key: lower-case, spelled out, punctuation-free.
export function placeKey(raw) {
  return expandPlace(raw).toLowerCase().replace(/[.']/g, "").replace(/\s+/g, " ").trim();
}

// Remove the commentary researchers add to place strings, keeping the place itself.
export function cleanPlace(raw) {
  let s = String(raw || "");
  s = s.replace(/\([^)]*\)/g, " ").replace(/\[[^\]]*\]/g, " ").replace(/[()?]/g, " ");
  s = s.replace(/\s+vs\.?\s+.*$/i, "").replace(/\bresidence ZIP \d+,?/i, "").replace(/\b(present|present-day|modern)\s+/i, "").replace(/\s+(area|vicinity|section)\b/gi, "");
  s = s.replace(/\b([A-Z][a-z]+)\s*\/\s*[A-Z][a-z]+(?=\s+Co)/, "$1").replace(/\b([A-Z][a-z]+(?: [A-Z][a-z]+)?) and [A-Z][a-z]+(?: [A-Z][a-z]+)? Cos\./, "$1 Co.").replace(/^([A-Z][a-z]+) and [A-Z][a-z]+,/, "$1,");
  s = s.replace(/,\s*New York \d{1,2}\b/, ", New York");
  s = s.replace(/,\s*(Jan(uary)?|Feb(ruary)?|Mar(ch)?|Apr(il)?|May|June?|July?|Aug(ust)?|Sept?(ember)?|Oct(ober)?|Nov(ember)?|Dec(ember)?)\.?\s*$/i, "").replace(/\bVa\.$/, "Va");
  s = s.split(/;|\s[-–—]\s|\bper\b|\bsee\b|\bunknown\b|\bpresumably\b|\bprobably\b|\bor\b(?= [A-Z])/)[0];
  s = s.replace(/\bno\.\s*\d+\b/gi, " ").replace(/\b\d{1,5}\s+(?=[A-Z][a-z]+ (St|Street|Ave|Avenue|Rd|Road)\b)/g, "");
  s = s.replace(/^(?:at|in|near|of|buried|bur\.|b\.|d\.)\s+/i, "");
  s = s.replace(/'[^']*'\s*on\b.*$/i, "");
  s = s.replace(/\s+/g, " ").replace(/\s+,/g, ",").replace(/,+/g, ",").replace(/^[,\s]+|[,\s.]+$/g, "");
  return s;
}

const MILTEXT = /\b(enlist|army|navy|regiment|battalion|battery|infantry|cavalry|artillery|militia|discharg|muster|served|service|company|co\.\s+[a-z]\b|camp|fort|stationed|sailed home|transport|usat|uss)\b/i;
const POST_RE = /\b((?:Fort|Ft\.|Camp|Naval Station|Naval Air Station|Navy Yard)\s+(?!(?:Jr|Sr|PS|VA|Va|NC)\b)[A-Z][a-z][A-Za-z.'-]*(?:\s+(?!(?:Personnel|Casual|Detachment|Register|Hospital|Va|VA|Jr|Sr)\b)[A-Z][a-z][A-Za-z'-]+)?)/g;
const MIL_AT_RE = /\b(?:[Ee]nlisted|enl\.|[Ee]nrolled|mustered in|mustered|inducted|stationed|discharged|served|paroled)\b[^.;]{0,60}?\bat\s+([A-Z][A-Za-z'.-]+(?:[ ,]+(?:[A-Z][A-Za-z'.-]+|Co\.|County))*)/g;
const MIL_NAMED = [
  [/panama canal (?:department|zone)|canal zone/i, "Panama Canal Zone"],
  [/craney island/i, "Craney Island, Portsmouth, Virginia"],
  [/hampton roads port of embarkation|h\.r\.p\.e\./i, "Hampton Roads Port of Embarkation, Newport News, Virginia"],
];
const ARRIVE_RE = /\b(?:[Aa]rrived|[Aa]rrival|[Ll]anded)\b(?:\s+(?:at|in))?\s+([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){0,2})/g;
const FROM_RE = /\b(?:from|sailed from|departed|departing)\s+([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+)?)/g;
const PORT_NAMES = { "le havre": "Le Havre, France", havre: "Le Havre, France", genoa: "Genoa, Italy", genova: "Genoa, Italy", naples: "Naples, Italy", napoli: "Naples, Italy", palermo: "Palermo, Italy", marseille: "Marseille, France", cherbourg: "Cherbourg, France", liverpool: "Liverpool, England", bremen: "Bremen, Germany", hamburg: "Hamburg, Germany", rotterdam: "Rotterdam, Netherlands", antwerp: "Antwerp, Belgium", boulogne: "Boulogne-sur-Mer, France" };
const PORTS = /^(le havre|havre|genoa|genova|naples|napoli|palermo|marseille|cherbourg|southampton|liverpool|bremen|hamburg|rotterdam|antwerp|boulogne|new york|baltimore|philadelphia|boston|new orleans|ellis island)$/i;

// Returns [{k, raw, y}] where k is one of born, baptised, married, lived, worked, died, buried, arrived, departed, served.
const REGION_HINTS = [[/panama/i, "Panama"], [/\bitaly\b|parma|valmozzola/i, "Italy"], [/west virginia|\bw\.?\s?va\b/i, "West Virginia"], [/north carolina|\bN\.\s?C\b/, "North Carolina"], [/virginia|\bVa\b\.?|\bVA\b/, "Virginia"], [/new york/i, "New York"], [/nevada/i, "Nevada"], [/california|san francisco/i, "California"]];
const CITY_HINTS = [[/^san francisco\b/i, "California"], [/^(norfolk|portsmouth|richmond|lynchburg|petersburg|emporia|hicksford|yorktown|craney island)\b/i, "Virginia"]];
const REGION_NAMES = new RegExp("^(" + ["Virginia", "West Virginia", "North Carolina", "South Carolina", "New York", "New York City", "New Jersey", "Connecticut", "Maryland", "Tennessee", "Missouri", "Illinois", "Florida", "Idaho", "Nevada", "Pennsylvania", "California", "Kentucky", "Georgia", "Ohio", "Texas", "Italy", "England", "Scotland", "Ireland", "Wales", "France", "Germany", "Panama", "Panama Canal Zone", "Canal Zone", "United States", "USA"].join("|") + ")$", "i");
const regionOf = (t) => { for (const [re, r] of REGION_HINTS) if (re.test(t || "")) return r; return null; };
export function extractPlaces(p, overrides = {}) {
  const out = [];
  const home = regionOf([p.birth?.place, p.death?.place].join(" "));
  const fullPlaces = [p.birth?.place, p.death?.place, p.baptism?.place, ...(p.residences || []).map((r) => r.place)].filter(isStr).map(cleanPlace).filter((x) => x.includes(","));
  const add = (k, raw, y, ctx, extra) => {
    if (!isStr(raw)) return;
    let c = cleanPlace(raw);
    if (c.length < 3 || /^(unknown|not stated|none|n\/a)$/i.test(c) || /\b(before|after|died|between)\b/i.test(c)) return;
    // street addresses: keep the street only for records before 1950; otherwise map the town
    if (/^\d+[A-Za-z]?\s/.test(c) && (!y || y >= 1950)) c = c.split(",").slice(1).join(",").trim() || c.replace(/^\d+\S*\s+/, "");
    // free-text matches carry no state or country: borrow one from the sentence, else from the person's home region
    // structured fields sometimes give only the hamlet ("San Martino"): borrow the rest from the person's fuller places
    const isRegion = REGION_NAMES.test(c);
    if (ctx === undefined && !isRegion && !c.includes(",")) { const full = fullPlaces.find((f) => f.toLowerCase().startsWith(c.toLowerCase() + ",")); if (full) c = full; else if (home && !new RegExp(home, "i").test(c)) c += ", " + home; }
    if (ctx !== undefined && ctx !== null && !isRegion && !c.includes(",")) { const city = CITY_HINTS.find(([re]) => re.test(c)); const r = (city && city[1]) || regionOf(ctx) || home; if (r && !new RegExp(r, "i").test(c)) c += ", " + r; }
    out.push({ k, raw: c, y: y || null, ...(extra || {}) });
  };
  // death place strings sometimes carry the burial too: "Woodside, Queens (buried Calvary Cemetery ...)"
  const splitBur = (s) => { const m = String(s || "").match(/^(.*?)[,;(\s]*\bburied\s+(?:in\s+|at\s+)?(.+)$/i); return m ? [m[1], m[2]] : [s, null]; };
  add("born", p.birth?.place, yearOf(p.birth?.date));
  if (p.baptism && typeof p.baptism === "object") add("baptised", p.baptism.place, yearOf(p.baptism.date));
  if (p.marriage && typeof p.marriage === "object") add("married", p.marriage.place, yearOf(p.marriage.date));
  // residences may carry their own coordinates ({place, lat, lon, when, rating, source}); those are used as given
  for (const r of p.residences || []) {
    if (!r || typeof r !== "object") continue;
    const lat = Number(r.lat), lon = Number(r.lon);
    const given = r.lat != null && r.lon != null && Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? { lat, lon } : null;
    add("lived", r.place, yearOf(r.date || r.when || r.year), undefined, given ? { ...given, note: isStr(r.when) && !yearOf(r.when) ? r.when : undefined } : isStr(r.when) && !yearOf(r.when) ? { note: r.when } : undefined);
  }
  for (const o of p.occupations || []) add("worked", o.place, yearOf(o.date));
  if (isStr(p.residence_at_death)) add("lived", p.residence_at_death, yearOf(p.death?.date));
  const [dp, bp] = splitBur(p.death?.place);
  add("died", dp, yearOf(p.death?.date));
  if (bp) add("buried", bp, yearOf(p.death?.date));
  if (p.burial && typeof p.burial === "object") add("buried", [p.burial.cemetery, p.burial.place].filter(isStr).join(", ") || p.burial.place, yearOf(p.burial.date) || yearOf(p.death?.date));
  else if (isStr(p.burial)) add("buried", p.burial, yearOf(p.death?.date));

  // structured arrival: the origin ("from") and the arrival port; when present it replaces the free-text scan below
  const A = p.arrival && typeof p.arrival === "object" ? p.arrival : null;
  if (A) {
    const ay = A.year != null && A.year !== "" && Number.isFinite(Number(A.year)) ? Number(A.year) : yearOf(A.date);
    const fromK = isStr(A.ship) || PORTS.test(cleanPlace(A.from || "").split(",")[0].trim()) ? "departed" : "emigrated";
    if (isStr(A.from)) add(fromK, A.from, ay, null);
    if (isStr(A.port)) add("arrived", A.port, ay, null);
  }
  // free text: arrivals, departures and military posts
  const texts = [];
  for (const [k, v] of Object.entries(p)) if (/^(facts|highlights)/.test(k) && Array.isArray(v)) for (const f of v) texts.push(typeof f === "string" ? f : f?.fact || "");
  for (const s of p.stories || []) texts.push(s.text || "");
  const mil = isStr(p.military) ? [p.military] : Array.isArray(p.military) ? p.military.map((x) => (typeof x === "string" ? x : x && (x.fact || x.text))).filter(isStr) : p.military && typeof p.military === "object" ? [p.military.unit, p.military.campaigns, p.military.service_dates, p.military.service, p.military.notes].flat().filter(isStr) : [];
  const seen = new Set();
  const addOnce = (k, raw, y, ctx) => { const key = k + "|" + placeKey(raw); if (seen.has(key)) return; seen.add(key); add(k, raw, y, ctx); };
  const isImm = (t) => /\b(manifest|passenger|immigra|emigra|ellis island|steerage|on the s\.?s\.?|aboard|steamship|naturaliz)\b/i.test(t) || /\barrived\b.*\bon\b.*\bfrom\b/i.test(t);
  for (const t of texts) {
    const y = yearOf(t);
    if (!A && /\barriv|\blanded\b/i.test(t) && isImm(t)) {
      for (const m of t.matchAll(ARRIVE_RE)) { let pl = m[1].replace(/\s+(on|from|in|at|aboard)$/, ""); if (PORTS.test(pl) || /new york/i.test(pl)) addOnce("arrived", /^new york/i.test(pl) && y && ((y >= 1892 && y <= 1896) || (y >= 1901 && y <= 1954)) ? "Ellis Island, New York" : pl, y, t); }
      for (const m of t.matchAll(FROM_RE)) if (PORTS.test(m[1])) addOnce("departed", PORT_NAMES[m[1].toLowerCase()] || m[1], y, null);
    }
    if (!A && /ellis island/i.test(t)) addOnce("arrived", "Ellis Island, New York", y, null);
    if (MILTEXT.test(t)) milScan(t, y);
  }
  // sources: an Ellis Island manifest citation is evidence of the arrival port
  if (!A) for (const s of p.sources || []) if (isStr(s) && /ellis island|statueofliberty\.org/i.test(s) && /manifest|passenger|arriv/i.test(s)) addOnce("arrived", "Ellis Island, New York", yearOf(s), null);
  for (const t of mil) milScan(t, yearOf(t));
  function milScan(t, y) {
    const near = (m) => t.slice(m.index, m.index + m[0].length + 50);
    for (const m of t.matchAll(POST_RE)) addOnce("served", m[1].replace(/^Ft\./, "Fort"), y, regionOf(near(m)) ? near(m) : t);
    for (const m of t.matchAll(MIL_AT_RE)) if (!/^(Fort|Ft\.|Camp)\b/.test(m[1])) addOnce("served", m[1], y, regionOf(near(m)) ? near(m) : t);
    for (const [re, name] of MIL_NAMED) if (re.test(t)) addOnce("served", name, y, null);
  }
  // hand corrections from places-overrides.json (people section)
  const o = (overrides.people || {})[p.id];
  let res = out.filter((x) => placeKey(x.raw).length >= 3);
  if (o) {
    const drop = new Set((o.drop || []).map((d) => d.toLowerCase()));
    res = res.filter((x) => !drop.has(placeKey(x.raw)) && !drop.has(x.k + "|" + placeKey(x.raw)));
    for (const x of res) { const nk = (o.kind || {})[placeKey(x.raw)]; if (nk) x.k = nk; }
    for (const a of o.add || []) res.push({ k: a.k, raw: cleanPlace(a.raw), y: a.y || null, note: a.note || null });
  }
  return res;
}

// Within one tree, a bare hamlet ("San Siro") usually appears elsewhere in full ("San Siro, Valmozzola").
// Returns a function that completes bare names from the tree's most common fuller form.
export function treeCompleter(entries) {
  const counts = new Map();
  for (const e of entries) {
    const parts = e.raw.split(",").map((x) => x.trim());
    if (parts.length < 2) continue;
    const head = parts[0].toLowerCase();
    const m = counts.get(head) || new Map(); m.set(e.raw, (m.get(e.raw) || 0) + 1); counts.set(head, m);
  }
  return (raw) => {
    if (raw.includes(",")) return raw;
    const m = counts.get(raw.trim().toLowerCase()); if (!m) return raw;
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)[0][0];
  };
}

// All place mentions for a tree, completed. Returns Map(personId -> [{k, raw, y, key, note}]).
export function treePlaces(people, overrides = {}, isLiving = (p) => !!p.living) {
  const per = new Map(); const all = [];
  for (const p of people) { const xs = extractPlaces(p, overrides); per.set(p.id, xs); all.push(...xs); }
  const complete = treeCompleter(all);
  for (const [id, xs] of per) {
    const seen = new Set(); const out = [];
    for (const x of xs) { x.raw = complete(x.raw); x.key = placeKey(x.raw); const d = x.k + "|" + x.key; if (seen.has(d)) continue; seen.add(d); out.push(x); }
    per.set(id, out);
  }
  return per;
}
