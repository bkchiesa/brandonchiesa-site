#!/usr/bin/env node
// Geocode every place mentioned in the two trees and cache the coordinates, so build-data.mjs
// never needs the network. Only places not already cached are looked up.
//
//   node scripts/roots/geocode-places.mjs            # look up new places
//   node scripts/roots/geocode-places.mjs --retry    # also retry places that failed before
//
// Uses OpenStreetMap Nominatim (free; max 1 request a second, with an identifying User-Agent).
// Public places go to places-cache.json (committed). Places that appear only in living people's
// records go to places-cache-private.json, which is git-ignored so the public repo never holds them.
// Hand-fixed coordinates live in places-overrides.json under "coords" and always win.

import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { treePlaces, expandPlace } from "./places-lib.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FILES = [process.env.ROOTS_BRANDON_JSON || "/workspace/douthat/tree-people.json", process.env.ROOTS_HOLLY_JSON || "/workspace/grizzard/tree-people.json"];
const PUB = path.join(HERE, "places-cache.json"), PRIV = path.join(HERE, "places-cache-private.json"), OVR = path.join(HERE, "places-overrides.json");
const UA = "brandonchiesa-roots-family-site/1.0 (static family-history site build; https://github.com/bkchiesa/brandonchiesa-site)";
const RETRY = process.argv.includes("--retry"), ALL = process.argv.includes("--all");
const yearOf = (s) => { const m = String(s || "").match(/\b(1[5-9]\d\d|20[0-2]\d)\b/); return m ? +m[1] : null; };
const living = (p) => !!p.living || (yearOf(p.birth?.date) >= 1925 && !p.death?.date && !p.death?.place);

const readJson = async (f, d) => (existsSync(f) ? JSON.parse(await readFile(f, "utf8")) : d);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let last = 0;
async function nominatim(params) {
  const wait = last + 1100 - Date.now(); if (wait > 0) await sleep(wait);
  last = Date.now();
  const u = new URL("https://nominatim.openstreetmap.org/search");
  for (const [k, v] of Object.entries({ format: "jsonv2", addressdetails: 1, limit: 6, "accept-language": "en", ...params })) u.searchParams.set(k, v);
  for (let i = 0; i < 3; i++) {
    try { const r = await fetch(u, { headers: { "User-Agent": UA } }); if (r.ok) return await r.json(); if (r.status === 429) await sleep(5000); }
    catch { await sleep(2000); }
  }
  return [];
}

const US = ["Virginia", "West Virginia", "North Carolina", "South Carolina", "New York", "New Jersey", "Connecticut", "Maryland", "Tennessee", "Missouri", "Illinois", "Florida", "Idaho", "Nevada", "Pennsylvania", "California"];
const COUNTRY = { Italy: "it", England: "gb", Scotland: "gb", Ireland: "ie", France: "fr", Germany: "de", Panama: "pa", Netherlands: "nl", Belgium: "be" };
const POI = /\b(cemetery|hospital|church|chiesa|fort|camp|island|bluff|station|port of embarkation|parish|memorial|village|mill|district|township)\b/i;

function filterFor(parts) {
  const lastP = parts[parts.length - 1];
  if (US.includes(lastP) && parts.length > 1) return (r) => r.address?.country_code === "us" && (r.address.state === lastP || (lastP === "New York" && r.address.state === "New York"));
  if (COUNTRY[lastP]) return (r) => r.address?.country_code === COUNTRY[lastP];
  return () => true;
}
const SETTLEMENT = new Set(["city", "town", "village", "hamlet", "suburb", "neighbourhood", "quarter", "isolated_dwelling", "locality", "municipality", "borough"]);
function pick(results, parts) {
  let ok = results.filter(filterFor(parts));
  if (!ok.length) return null;
  // a plain place name should land on the settlement, not a county, reservoir, school or road named after it
  if (!POI.test(parts[0]) && !/\bCounty\b/.test(parts[0])) { const s = ok.filter((r) => SETTLEMENT.has(r.addresstype)); if (s.length) ok = s; else { const nonRoad = ok.filter((r) => !["highway", "amenity", "natural", "water", "waterway", "landuse", "office", "shop", "building"].includes(r.category)); if (nonRoad.length) ok = nonRoad; } }
  // a "County" query should land on the county boundary, not a road named after it
  if (/\bCounty\b/.test(parts[0])) { const c = ok.find((r) => r.addresstype === "county" || r.type === "administrative"); if (c) return c; }
  return ok[0];
}

async function geocode(raw, hint) {
  const q = hint || expandPlace(raw).replace(/^(the )?(parish )?church of /i, "").replace(/,\s*Panama Canal Zone$/i, ", Panama");
  const parts = q.split(",").map((x) => x.trim()).filter(Boolean);
  // historic places Nominatim does not carry are pinned in overrides; here we try the full string, then broader ones
  for (let i = 0; i < parts.length; i++) {
    const sub = parts.slice(i);
    if (sub.length === 1 && i > 0 && (US.includes(sub[0]) || COUNTRY[sub[0]]) && parts.length > 1) {
      // only the state or country is left: try the most specific name inside that state before settling
      const near = await nominatim({ q: parts[0] + ", " + sub[0] });
      const hit = pick(near, [parts[0], sub[0]]);
      if (hit && POI.test(parts[0]) === false) return out(hit, q, "fuzzy", parts[0] + ", " + sub[0]);
    }
    const res = await nominatim({ q: sub.join(", ") });
    const hit = pick(res, sub);
    if (!hit) continue;
    if (i === 0) return out(hit, q, "exact", sub.join(", "));
    // matched a broader place: look for the specific name (a cemetery, hospital, hamlet) inside it
    const bb = hit.boundingbox.map(Number); const pad = 0.15;
    const vb = [bb[2] - pad, bb[1] + pad, bb[3] + pad, bb[0] - pad].join(",");
    const inner = await nominatim({ q: parts[0], viewbox: vb, bounded: 1 });
    if (inner.length) return out(inner[0], q, "exact", parts[0] + " (near " + sub.join(", ") + ")");
    return out(hit, q, sub.length === 1 && (US.includes(sub[0]) || COUNTRY[sub[0]]) ? "region" : "broader", sub.join(", "));
  }
  return { q, status: "not-found" };
}
function out(r, q, prec, matched) {
  return { q, status: "ok", lat: +(+r.lat).toFixed(5), lon: +(+r.lon).toFixed(5), prec, matched, osm: r.osm_type && r.osm_id ? `${r.osm_type}/${r.osm_id}` : null, display: r.display_name, kind: r.addresstype || r.type || null };
}

async function main() {
  const ov = await readJson(OVR, {});
  const pub = await readJson(PUB, {}), priv = await readJson(PRIV, {});
  const need = new Map(); // key -> {raw, isPublic}
  for (const f of FILES) {
    const people = JSON.parse(await readFile(f, "utf8"));
    const per = treePlaces(people, ov);
    for (const p of people) for (const x of per.get(p.id)) {
      const isPub = !living(p);
      const cur = need.get(x.key);
      if (!cur) need.set(x.key, { raw: x.raw, isPub }); else if (isPub) cur.isPub = true;
    }
  }
  let looked = 0, failed = 0;
  for (const [key, { raw, isPub }] of need) {
    if ((ov.coords || {})[key]) continue;
    const have = pub[key] || priv[key];
    if (have && !ALL && (have.status === "ok" || !RETRY)) {
      // keep each place in the right file if its public status changed
      if (isPub && !pub[key]) { pub[key] = have; delete priv[key]; }
      if (!isPub && pub[key] && !Object.values(need).length) {}
      continue;
    }
    const g = await geocode(raw, (ov.queries || {})[key]); looked++;
    if (g.status !== "ok") failed++;
    (isPub ? pub : priv)[key] = { raw, ...g, at: new Date().toISOString().slice(0, 10) };
    console.log(`${g.status === "ok" ? g.prec.padEnd(7) : "MISSING"}  ${isPub ? raw : "(private place)"}${g.status === "ok" ? "  ->  " + g.matched : ""}`);
    if (looked % 10 === 0) { await writeFile(PUB, JSON.stringify(sortObj(pub), null, 1)); await writeFile(PRIV, JSON.stringify(sortObj(priv), null, 1)); }
  }
  // hand-pinned places need no cache entry
  for (const k of Object.keys(ov.coords || {})) { delete pub[k]; delete priv[k]; }
  // places no longer mentioned in a public record must not stay in the public cache
  for (const k of Object.keys(pub)) if (!need.has(k) || !need.get(k).isPub) { if (need.has(k)) priv[k] = pub[k]; delete pub[k]; }
  await writeFile(PUB, JSON.stringify(sortObj(pub), null, 1)); await writeFile(PRIV, JSON.stringify(sortObj(priv), null, 1));
  const all = [...need.keys()];
  const okN = all.filter((k) => (ov.coords || {})[k] || (pub[k] || priv[k] || {}).status === "ok").length;
  console.log(`\n${all.length} places: ${okN} pinned (${Object.keys(ov.coords || {}).length} by hand), ${all.length - okN} not found; ${looked} looked up this run.`);
}
const sortObj = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
main().catch((e) => { console.error(e); process.exit(1); });
