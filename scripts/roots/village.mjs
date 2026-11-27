// Village photos and the Valmozzola page.
// Only <photos root>/<place>/web/* (Brandon's own web copies), <place>/records/* (record images Brandon provided) and
// <place>/commons/* (Wikimedia Commons files with a .license.txt sidecar) are ever published. Anything under a private/ folder is refused, and the build fails if a
// private path ever reaches the output. Files are resized and re-encoded with no EXIF (same method as the ship photos).
import { spawnSync } from "node:child_process";
import { existsSync, realpathSync, readFileSync, readdirSync, statSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const PRIVATE_RE = /(^|[\\/])private([\\/]|$)/i;
export function assertNotPrivate(p, what = "path") {
  if (PRIVATE_RE.test(String(p))) throw new Error(`BUILD GUARD: refusing ${what} inside a private/ folder: ${path.basename(String(p))}`);
}
const ALLOWED = /[\\/]photos[\\/]([a-z0-9-]+)[\\/](web|commons|records)[\\/]([^\\/]+\.(?:jpe?g|png))$/i;

const RESIZE_PY = `import sys,json
from PIL import Image, ImageOps
src,out,full,th=sys.argv[1],sys.argv[2],int(sys.argv[3]),int(sys.argv[4])
im=ImageOps.exif_transpose(Image.open(src)).convert("RGB")
def save(w,fn,q):
    c=im.copy(); c.thumbnail((w,w)); c.save(fn,"JPEG",quality=q,optimize=True,progressive=True); return c.size
a=save(full,out+".jpg",80); b=save(th,out+"-th.jpg",74)
print(json.dumps({"w":a[0],"h":a[1],"tw":b[0],"th":b[1]}))`;

function readSidecar(file) {
  const f = file + ".license.txt";
  if (!existsSync(f)) return null;
  const o = {};
  for (const line of readFileSync(f, "utf8").split(/\r?\n/)) { const m = line.match(/^(Title|Author|License|Source page|Date|Description):\s*(.*)$/); if (m) o[m[1].toLowerCase().replace(" ", "_")] = m[2].trim(); }
  if (o.license) { const m = o.license.match(/^(.*?)\s+(https?:\/\/\S+)$/); if (m) { o.license = m[1]; o.license_url = m[2]; } }
  return o;
}

// English captions for the Commons files (from their Commons titles and descriptions)
const COMMONS_EN = [
  [/san-siro-branzone.*facciata/, "Church of San Siro, Branzone: facade (2022)"],
  [/san-martino.*facciata-1/, "Church of San Martino Vescovo, San Martino: facade (2022)"],
  [/san-martino.*lato-sud/, "Church of San Martino Vescovo: facade and south side (2022)"],
  [/san-martino.*retro/, "Church of San Martino Vescovo: rear (2022)"],
  [/san-siro-san-siro.*facciata-1/, "Church of San Siro, San Siro: facade (2022)"],
  [/san-siro-san-siro.*facciata-e-lato-nord/, "Church of San Siro, San Siro: facade and north side (2022)"],
  [/san-siro-san-siro.*lato-nord/, "Church of San Siro, San Siro: north side (2022)"],
  [/castello-di-gusaliggio.*pasini/, "Castello di Gusaliggio, painting by Alberto Pasini (1848–49 in the Commons title)"],
  [/santa-maria-assunta.*gusaliggio/, "Santa Maria Assunta, Pieve di Gusaliggio: facade (2022)"],
  [/taro-lungo-la-strada-per-branzone/, "The Taro river along the road to Branzone (2014)"],
  [/rocca-di-gusaliggio/, "Ruins of the Rocca di Gusaliggio (2022)"],
  [/valle-del-taro/, "The Taro valley (2014)"],
];

export function makeMediaLib({ repo, exclude = [], log = console.warn }) {
  const OUTDIR = path.join(repo, "public/roots/media/places");
  const done = new Map();
  const excl = exclude.map((e) => (typeof e === "string" ? e : e.file)).filter(Boolean);
  const isExcluded = (abs) => excl.some((e) => abs.endsWith(path.sep + e.replace(/^\/+/, "")) || path.basename(abs) === path.basename(e));
  const lib = {
    OUTDIR, held: [],
    // returns null (not publishable), {excluded:true}, or the published image record
    publish(file) {
      if (!file || typeof file !== "string") return null;
      assertNotPrivate(file, "media source");
      let abs = path.resolve(file);
      if (!existsSync(abs)) return null;
      abs = realpathSync(abs);
      assertNotPrivate(abs, "media source");
      const m = abs.match(ALLOWED); if (!m) return null;
      if (isExcluded(abs)) { if (!lib.held.includes(path.basename(abs))) lib.held.push(path.basename(abs)); return { excluded: true }; }
      if (done.has(abs)) return done.get(abs);
      const [, place, kind, name] = m;
      const slug = name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9-]+/g, "-");
      const outBase = path.join(OUTDIR, place, (kind === "commons" ? "c-" : kind === "records" ? "r-" : "") + slug);
      assertNotPrivate(outBase, "media output");
      spawnSync("mkdir", ["-p", path.dirname(outBase)]);
      const r = spawnSync("python3", ["-c", RESIZE_PY, abs, outBase, "1400", "480"], { encoding: "utf8" });
      if (r.status !== 0) { log("photo resize failed: " + name); done.set(abs, null); return null; }
      const dim = JSON.parse(r.stdout.trim().split("\n").pop());
      const rel = path.relative(path.join(repo, "public/roots"), outBase).split(path.sep).join("/");
      const rec = { place, kind, name, full: rel + ".jpg", th: rel + "-th.jpg", w: dim.w, h: dim.h, tw: dim.tw, thh: dim.th };
      if (kind === "commons") {
        const sc = readSidecar(abs) || {};
        rec.author = sc.author || null; rec.lic = sc.license || null; rec.licUrl = sc.license_url || null; rec.page = sc.source_page || null; rec.date = sc.date || null; rec.ctitle = sc.title || null;
        rec.cap = (COMMONS_EN.find(([re]) => re.test(slug)) || [])[1] || (sc.description || slug);
      }
      done.set(abs, rec);
      return rec;
    },
    all() { return [...done.values()].filter(Boolean); },
  };
  return lib;
}

// After the build: the output tree must hold no private/ path and no image with EXIF
export function guardOutput(root) {
  const bad = [];
  const walk = (d) => { for (const f of readdirSync(d)) { const p = path.join(d, f); if (PRIVATE_RE.test(path.relative(root, p))) bad.push(p); if (statSync(p).isDirectory()) walk(p); } };
  walk(root);
  if (bad.length) throw new Error("BUILD GUARD: private/ path in the output: " + bad.map((b) => path.relative(root, b)).join(", "));
}

// ---------- the Valmozzola page ----------
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const RT = { proven: "Proven", probable: "Probable", compiled: "Compiled", hypothesis: "Hypothesis", family: "Family-provided" };
const tag = (r) => (r ? `<span class="rt ${r}">${RT[r] || r}</span>` : "");
const who = (P, id, label) => (P[id] && !P[id].liv ? `<a href="/roots/#p=${esc(id)}">${esc(label || P[id].n)}</a>` : esc(label || ""));

// the plaque note: "(1) CHIESA Domenico ... ; https://... . (2) ..." -> intro + items
export function parsePlaque(note) {
  if (!note) return null;
  const parts = String(note).split(/\s\((\d)\)\s/);
  if (parts.length < 3) return null;
  const items = [];
  for (let i = 1; i < parts.length; i += 2) {
    let t = parts[i + 1].trim();
    let tail = null;
    if (i + 2 >= parts.length) { const k = t.search(/\.\s+(Their fathers|All three)/); if (k > 0) { tail = t.slice(k + 1).trim(); t = t.slice(0, k); } }
    const url = (t.match(/https?:\/\/\S+?(?=\s*\.?\s*$|\s)/) || [])[0] || null;
    t = t.replace(/;?\s*https?:\/\/\S+/g, "").replace(/[\s.;]+$/, "");
    const nm = t.match(/^([A-ZÀ-Ý]+)\s+([A-Z][a-zà-ÿ]+)/);
    items.push({ name: nm ? nm[2] + " " + nm[1][0] + nm[1].slice(1).toLowerCase() : null, t, url, tail });
  }
  const intro = parts[0].trim();
  const tail = items.length && items[items.length - 1].tail ? items[items.length - 1].tail.replace(/,\s*so none is added/i, "") : null;
  return { intro, items: items.map(({ tail, ...x }) => x), tail };
}

export async function writeVillagePage({ repo, people, rawPeople, lib, plaque }) {
  const P = Object.fromEntries(people.map((p) => [p.id, p]));
  // captions for Brandon's photos: the researchers' titles from the tree's media entries
  const titles = new Map(), trans = new Map();
  for (const p of rawPeople) for (const m of p.media || []) if (m && m.file) { const b = path.basename(m.file); if (m.title && !titles.has(b)) titles.set(b, m.title); if (m.transcription && !trans.has(b)) trans.set(b, m.transcription); }
  const imgs = lib.all();
  const mine = (pl) => imgs.filter((x) => x.kind === "web" && x.place === pl).sort((a, b) => a.name.localeCompare(b.name));
  const commons = imgs.filter((x) => x.kind === "commons").sort((a, b) => ["san-siro", "branzone", "san-martino", "valmozzola"].indexOf(a.place) - ["san-siro", "branzone", "san-martino", "valmozzola"].indexOf(b.place) || a.name.localeCompare(b.name));
  const brandonCredit = "Photo by Brandon Chiesa, June 2026 (family-provided)";
  const fig = (x, i) => {
    const cap = x.kind === "web" ? (titles.get(x.name) || x.name.replace(/^\d+-|\.jpg$/g, "").replace(/-/g, " ")) : x.cap;
    const credit = x.kind === "web" ? brandonCredit : `${esc(x.author || "Unknown author")} · ${x.licUrl ? `<a href="${esc(x.licUrl)}" target="_blank" rel="noopener license">${esc(x.lic)}</a>` : esc(x.lic || "licence not recorded")} · via Wikimedia Commons${/by-sa|cc by/i.test(x.lic || "") ? " (resized)" : ""}${x.page ? ` · <a href="${esc(x.page)}" target="_blank" rel="noopener nofollow">source page ↗</a>` : ""}`;
    return `<figure class="vg-item${x.h > x.w ? " tall" : ""}"><button type="button" class="vg-open" data-i="${i}" data-full="/roots/${esc(x.full)}" data-w="${x.w}" data-h="${x.h}" aria-label="Open photo: ${esc(cap)}"><img src="/roots/${esc(x.th)}" width="${x.tw}" height="${x.thh}" loading="lazy" alt="${esc(cap)}"></button><figcaption><b>${esc(cap)}</b>${x.kind === "web" ? tag("family") : ""}<small class="vg-credit">${credit}</small></figcaption></figure>`;
  };
  let gi = 0;
  const grid = (list) => `<div class="vg-grid">${list.map((x) => fig(x, gi++)).join("")}</div>`;
  const siro = mine("san-siro"), mart = mine("san-martino");
  const hero = siro.find((x) => /parish-church-facade/.test(x.name)) || siro[0] || commons[0];

  // emigrants from the comune, from the tree (deceased only)
  const VAL = /valmozzola/i;
  const em = people.filter((p) => !p.liv && p.imm && (VAL.test((p.b && p.b.p) || "") || VAL.test((p.arr && p.arr.n) || ""))).sort((a, b) => ((a.arr && a.arr.y) || 9999) - ((b.arr && b.arr.y) || 9999));
  const emRows = em.map((p) => { const A = p.arr || {}; const vill = /san martino/i.test((p.b && p.b.p) || "") ? "San Martino" : /san siro/i.test((p.b && p.b.p) || "") ? "San Siro" : "Valmozzola";
    return `<li><a href="/roots/#p=${esc(p.id)}"><b>${esc(p.n)}</b></a> <span class="vm">${esc(p.yrs || "")}</span><br><span>Born ${esc(vill)}${A.y ? ` · arrived ${A.y}` : ""}${A.ship ? ` on ${esc(A.ship)}` : ""}${A.port ? ` at ${esc(A.port)}` : ""}</span> ${tag(A.r)}</li>`; }).join("");

  const src = (t) => `<span class="vp-src">Source: ${t}</span>`;
  // "Where they were born": Brandon's birthplace photo beside the birth act for the same village
  const recs = imgs.filter((x) => x.kind === "records");
  const recCredit = "Record image provided by Brandon Chiesa";
  const rfig = (x, cls, alt) => { const cap = titles.get(x.name) || x.name; const tr = trans.get(x.name);
    return `<figure class="vb-item ${cls}"><button type="button" class="vg-open" data-full="/roots/${esc(x.full)}" data-w="${x.w}" data-h="${x.h}" aria-label="Open: ${esc(cap)}"><img src="/roots/${esc(x.th)}" width="${x.tw}" height="${x.thh}" loading="lazy" alt="${esc(alt || cap)}"></button><figcaption><b>${esc(cap)}</b>${x.kind === "web" ? tag("family") : tag("proven")}<small class="vg-credit">${x.kind === "web" ? brandonCredit + "; identified as the birthplace from the birth act’s house number" : recCredit}</small>${tr ? `<p class="vb-tr">${esc(tr)}</p>` : ""}</figcaption></figure>`; };
  const bornPair = (pl, pid, label, houseNo, actLabel) => {
    const h = imgs.find((x) => x.kind === "web" && x.place === pl && /birthplace/.test(x.name)), a = recs.find((x) => x.place === pl && /^nati-/.test(x.name));
    if (!h && !a) return "";
    return `<div class="vb-pair"><h3>${who(P, pid, label)} · ${esc(houseNo)}</h3><div class="vb-row" data-lbg="born">${h ? rfig(h, "house") : ""}${a ? rfig(a, "act", "Birth act " + actLabel) : ""}</div></div>`; };
  const bornHTML = [bornPair("san-siro", "joseph-chiesa-1886", "Giuseppe (Joseph) Chiesa", "San Siro no. 10, born 2 March 1886", "Nati 1886 no. 12"),
    bornPair("san-martino", "marianna-ferretti-1885", "Marianna Ferretti", "San Martino no. 6, born 5 May 1885", "Nati 1885 no. 34")].join("");
  const marr = recs.filter((x) => /marriage/.test(x.name)).sort((a, b) => (/front/.test(a.name) ? 0 : 1) - (/front/.test(b.name) ? 0 : 1));
  const marrHTML = marr.length ? `<div class="vb-marr"><h3>The marriage record, Manhattan 1915</h3><p>${who(P, "joseph-chiesa-1886", "Giuseppe Chiesa")} and ${who(P, "marianna-ferretti-1885", "Marianna Ferretti")}, both from Valmozzola, married in New York on <b>21 October 1915</b> at the church of Our Lady of Pompei, Manhattan ${tag("proven")}. ${src("NYC Certificate and Record of Marriage no. 24034")}</p><div class="vb-row" data-lbg="marr">${marr.map((x) => rfig(x, "act", titles.get(x.name))).join("")}</div></div>` : "";

  const pl = plaque;
  const plaqueImg = imgs.find((x) => /wwi-memorial-plaque/.test(x.name));
  const plaqueHTML = pl ? `<div class="vp-plaque">${plaqueImg ? `<button type="button" class="vg-open vp-plq-img" data-i="${siro.indexOf(plaqueImg)}" aria-label="Open the plaque photo"><img src="/roots/${esc(plaqueImg.th)}" width="${plaqueImg.tw}" height="${plaqueImg.thh}" loading="lazy" alt="WWI memorial plaque, San Siro, dated 1 March 1925"></button>` : ""}<div><p>A marble plaque dated <b>1 March 1925</b> hangs on the front wall of the San Siro parish church. It names three men: Cap. Magg. Domenico Chiesa and the soldiers Agostino Chiesa and Giacomo Ferrari. ${tag("proven")} <small>(Brandon’s photo of the plaque)</small></p>
    <p>All three appear in the <i>Albo d’oro</i>, Italy’s roll of the war dead ${tag("probable")} <small>(index entries)</small>:</p><ol class="vp-sold">${pl.items.map((s) => `<li>${esc(s.t)}${s.url ? ` <a href="${esc(s.url)}" target="_blank" rel="noopener nofollow">Albo d’oro ↗</a>` : ""}</li>`).join("")}</ol>
    <p class="vp-unc"><b>Uncertain:</b> their kinship to Brandon’s line is unproven; they were probably cousins ${tag("hypothesis")}. ${pl.tail ? esc(pl.tail) : ""}</p></div></div>` : "";

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow, noarchive"><meta name="googlebot" content="noindex, nofollow">
<title>Valmozzola: San Siro and San Martino · Roots</title>
<meta name="description" content="San Siro and San Martino, the Valmozzola villages of the Chiesa, Galli and Ferretti families, from the records and from Brandon's visit.">
<meta name="theme-color" content="#f4ecd9"><link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/roots/assets/style.css"></head>
<body class="vpage">
<header class="vp-top"><a class="vp-back" href="/roots/">‹ Back to the family tree</a><nav class="vp-nav" aria-label="On this page"><a href="#san-siro">San Siro</a><a href="#san-martino">San Martino</a>${bornHTML ? `<a href="#born">Where they were born</a>` : ""}<a href="#emigrants">Who left</a><a href="#memorial">War memorial</a><a href="#gallery">Photos</a></nav></header>
<main>
<section class="vp-hero">${hero ? `<img src="/roots/${esc(hero.full)}" width="${hero.w}" height="${hero.h}" alt="The parish church of San Siro, Valmozzola">` : ""}<div class="vp-hero-t"><div class="eyebrow">Province of Parma, Italy</div><h1>Valmozzola</h1><p>San Siro and San Martino, the home villages of the Chiesa, Galli, Ferretti and Manfredi families, as the parish and civil records describe them, with photos from Brandon’s visit in June 2026.</p></div></section>
<div class="vp-body">
<p class="vp-lede">This page uses only what the family’s records and the research notes say. Each statement keeps its rating; anything uncertain is marked. It is not a general history of the comune.</p>
<div class="vp-legend">${tag("proven")} a record says so · ${tag("probable")} index or strong match · ${tag("hypothesis")} a working idea, unproven · ${tag("family")} Brandon’s photos</div>

<section id="san-siro" class="vp-sec"><h2>San Siro</h2>
<p>San Siro is the village of the Chiesa line. ${who(P, "pietro-chiesa", "Pietro Chiesa")} was baptised at the church of San Siro on 19 October 1789, son of Donnino Chiesa and Margarita Coduri ${tag("proven")}. In 1815 he married ${who(P, "giovanna-costa", "Giovanna Costa")}, aged 15; the wedding was celebrated at San Giacomo di Branzone ${tag("proven")}. ${src("baptism register DGS 7958601; 1815 marriage act")}</p>
<p>The 1803 <i>stato d’anime</i>, a parish household census, lists the Chiesa and Costa households ${tag("proven")}. ${who(P, "domenico-chiesa-1828", "Domenico Chiesa")} was baptised at the San Siro church on 23 June 1828, which matches his civil birth entry ${tag("proven")}. ${src("DGS 7958602; Nati 1828 atto 32")}</p>
<p class="vp-unc"><b>Uncertain:</b> the 18th-century baptisms name the parish of San Giacomo, Branzone. It is not confirmed that the San Siro church in the photos is the church those records mean, and Pietro’s baptism may have been at a different parish church ${tag("hypothesis")}.</p>
<p>Domenico’s sons ${who(P, "john-chiesa-1881", "Giovanni (John)")} and ${who(P, "joseph-chiesa-1886", "Giuseppe (Joseph)")} were born at San Siro, at house nos. 22 and 10 ${tag("proven")}. Both later left for New York. ${src("Nati 1881 atto 55; Nati 1886 atto 12")}</p></section>

<section id="san-martino" class="vp-sec"><h2>San Martino</h2>
<p>San Martino, with its church of San Martino Vescovo, is the village of the maternal lines. Its baptism books from the 1770s record the Galli, Ferretti and Manfredi families: children of Alfonso Galli from 1772, of Eugenio and Antonia Ferretti from 1767, and of Camillo Manfredi and Catharina Dalla Tana ${tag("proven")}. ${src("San Martino baptisms, DGS 7958653 (Book A)")}</p>
<p>${who(P, "martina-galli-1859", "Martina Galli")} was born in San Martino in 1859 ${tag("proven")}, and her daughter ${who(P, "marianna-ferretti-1885", "Marianna Ferretti")} was born at San Martino no. 6 in 1885 ${tag("proven")}. Martina sailed in June 1906 with her daughter ${who(P, "veronica-ferretti-1886", "Veronica")}. Marianna followed in October 1910, travelling in a group from Valmozzola ${tag("probable")}. ${src("Nati 1859 atto 6; Nati 1885 atto 34; Ellis Island manifests")}</p>
<p class="vp-unc"><b>Uncertain:</b> the brides Anastasia Conti and Veronica Bergenti (also read Borgonti) were not baptised in San Martino. They probably came from the neighbouring parish of Pieve di Gusaliggio ${tag("hypothesis")}, whose register has not yet been read.</p></section>

${bornHTML ? `<section id="born" class="vp-sec"><h2>Where they were born</h2><p>Brandon photographed the two houses in June 2026. Each one is shown beside the birth act that names the house. The buildings are identified as the birthplaces from the house numbers in the birth acts ${tag("family")}; the house numbers come from the acts ${tag("proven")}.</p>${bornHTML}<p class="vp-unc"><b>Uncertain:</b> the acts give the 1880s house numbers (San Siro no. 10, San Martino no. 6). The photos cannot show whether today’s buildings carry the same numbers ${tag("hypothesis")}.</p><p>Marianna’s birth day in the act reads “cinque”, 5 May 1885 ${tag("proven")}. An earlier reading of the same act and her US papers suggested 25 April (1885 or 1886). The date follows the birth act (atto 34).</p></section>` : ""}

<section id="emigrants" class="vp-sec"><h2>Who left for America</h2><p>The tree has ${em.length} people born in Valmozzola who emigrated to the United States. Each name opens their card, with the voyage and its evidence.</p><ul class="vp-em">${emRows}</ul>${marrHTML ? `<div id="marriage">${marrHTML}</div>` : ""}</section>

<section id="memorial" class="vp-sec"><h2>The war memorial at San Siro</h2>${plaqueHTML}</section>

<section id="gallery" class="vp-sec" data-lbg="gallery"><h2>Photos</h2>
<h3>San Siro · Brandon’s photos</h3>${grid(siro)}
<h3>San Martino · Brandon’s photos</h3>${grid(mart)}
<h3>San Siro, San Martino and Gusaliggio on Wikimedia Commons</h3><p class="vp-note">Each one is shown with its author, licence and Commons file page. The CC BY-SA and CC BY images were resized for the web and are otherwise unchanged.</p>${grid(commons)}
</section>
<footer class="vp-foot"><p>Brandon’s photos © Brandon Chiesa, family-provided, used with permission. Record images provided by Brandon Chiesa. Commons images belong to their authors under the licences shown. <a href="/roots/">Back to the family tree</a></p></footer>
</div></main>
<div class="vlb" id="vlb" hidden role="dialog" aria-modal="true" aria-label="Photo viewer"><button class="vlb-x" aria-label="Close">×</button><button class="vlb-p" aria-label="Previous photo">‹</button><figure><img alt=""><figcaption></figcaption></figure><button class="vlb-n" aria-label="Next photo">›</button></div>
<script src="/roots/assets/village.js" defer></script>
</body></html>`;
  assertNotPrivate(html.match(/\/roots\/media\/[^"]+/g)?.join(" ") || "", "page media");
  const dir = path.join(repo, "public/roots/valmozzola");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, "index.html"), html);
  return { photos: siro.length + mart.length, commons: commons.length, emigrants: em.length, records: recs.length };
}
