# Updating the Roots family-history site

The site lives at `/roots/` (Brandon's tree) and `/roots/holly/` (Holly's tree).
The design (`public/roots/assets/`) and the data (`public/roots/data/*.json`) are kept apart:
the page loads its JSON when it opens, so a data change never needs a site rebuild.

## Change people, dates, sources or stories

1. Edit the research files. They stay where they are and are never copied into the site:
   - Brandon's tree: `/workspace/douthat/tree-people.json`
   - Holly's tree: `/workspace/grizzard/tree-people.json`
   - Featured stories: Markdown files in `scripts/roots/stories/`. The front matter sets `title`, `tree`, `person` (the id of the person whose card links to it), `kicker` and `summary`.
2. Regenerate the site data. Supply the family password in the environment; it is never written to any file:

   ```sh
   ROOTS_PASSWORD='<family password>' node scripts/roots/build-data.mjs
   ```

   You can point the script at other source files with `ROOTS_BRANDON_JSON`, `ROOTS_HOLLY_JSON` and `ROOTS_STORIES_DIR`.
3. If the research added new places, geocode them first (step 2 then puts them on the maps). See "Maps and places" below.
4. Commit `public/roots/data/brandon.json`, `holly.json` and `scripts/roots/places-cache.json`, then deploy as usual.

## Maps and places

Every birth, baptism, marriage, home, workplace, death, burial, arrival or departure port and military post found in the records gets a pin on the person's card map and on the tree-wide **Places** map.

- **Geocode new places** (needs network; uses OpenStreetMap Nominatim at one request per second with an identifying User-Agent):

  ```sh
  node scripts/roots/geocode-places.mjs           # only places not already cached
  node scripts/roots/geocode-places.mjs --retry   # also retry places that failed before
  node scripts/roots/geocode-places.mjs --all     # redo everything (slow; rarely needed)
  ```

  Results go into `scripts/roots/places-cache.json`, which is committed, so places are never looked up twice and `build-data.mjs` itself never uses the network. Places that only living people have go into `places-cache-private.json`, which git ignores.
- **Fix a wrong pin** in `scripts/roots/places-overrides.json`:
  - `queries`: give a better search for a place key. For example, `"church of san siro": "San Siro, Valmozzola"`. Then run the geocoder with `--retry`, or delete that key from the cache and run it again.
  - `coords`: pin a place by hand with `{"lat":…, "lon":…, "a":0|1|2, "m":"what it is", "n":"note shown on the card"}`. Here `a` means 0 = exact, 1 = approximate, 2 = area. Use this for places that no longer exist, such as a Civil War camp.
  - `people`: per-person fixes for deceased people only. `drop` removes a misread place, `kind` changes what a place means (for example `worked` instead of `served`), and `add` adds a place the text describes but the reader can't find.
  - The key is the place in lower case, with abbreviations spelled out. The geocoder prints the keys it looks up.
- **Approximate and area pins** are drawn hollow. A state, county or country pin goes at its centre, and the place list on the card says so.
- **Basemap:** `public/roots/assets/basemap.json` is built from public-domain Natural Earth data by `python3 scripts/roots/build-basemap.py <folder with the Natural Earth geojson>`. Rebuild it only to add a new detailed area, set in `DETAIL` in that script.

## Photos and articles

A person in the research JSON can carry `photos` (or `images`/`media`) and `articles` (or `clippings`, `newspaper_articles`, `links`). Each item can be a URL string or an object:

```json
{"title": "Aldo in uniform, 1944", "file": "/workspace/douthat/photos/aldo-1944.jpg", "credit": "Chiesa family collection", "source": "scan by Brandon", "date": "1944", "license": "family photo, used with permission"}
{"title": "Obituary", "url": "https://…", "credit": "Daily Press (Newport News)", "date": "1979-10-26", "kind": "article"}
```

Cards show these in a **Photos & articles** section, with the credit, source, date and licence under each item. A local image (`file`/`path`) is copied into `public/roots/media/<tree>/`, but only for people who have died. Anything under a `private` folder is never copied. The build warns about any item that has no credit. Media for living people goes into the encrypted section.

## Wording safety net

`build-data.mjs` removes any sentence that describes someone as "single … with/had dependents". That wording was found to be wrong for Aldo Chiesa. The build prints a line whenever it removes one. "without dependents" is not affected.

## What the build script does to protect living relatives

- **Who counts as living:** anyone flagged `living`, plus anyone born 1925 or later with no death date or place.
- **What the public sees:** only a living person's name and family links, under an opaque id such as `living-3`. Source ids often contain birth years, so they are replaced.
- **What gets encrypted:** everything else about living people, and any text on other people's cards that names a living relative. It is encrypted with AES-GCM-256. The key comes from PBKDF2-SHA256 (600,000 iterations) with a new random salt on every build. The browser decrypts it with WebCrypto when someone enters the password, and keeps the key only for that browser tab session.
- **What gets removed:** addresses are never published for living people. `[SSN omitted]` placeholders and internal file paths are stripped.
- **Changing the password:** rebuild with a new `ROOTS_PASSWORD`. Old copies of the data cannot be opened with the new password, and the new data cannot be opened with the old one.

## Certainty levels

The build script maps each record's `status` to the PDF key:

| Status in the record | Shown as |
| --- | --- |
| proven, record-image | proven (solid olive) |
| probable, index-only | probable / index (dashed brown) |
| compiled | compiled tree (dashed grey) |
| hypothesis | hypothesis (dashed red) |
| family-provided | family-provided (dotted navy) |

## Changing the look

Edit `public/roots/assets/style.css` and `app.js`. These are plain files with no build step.

## Search engines

`/roots` pages carry `noindex`. `public/_headers` also sends `X-Robots-Tag` on Cloudflare Pages.

## Village photos and the Valmozzola page

- Media entries whose `file` is under `photos/<place>/web/` (Brandon's own web copies) or `photos/<place>/commons/`
  (Wikimedia Commons, with a `<file>.license.txt` sidecar) are copied into `public/roots/media/places/<place>/`,
  resized (1400px plus a 480px thumbnail) and re-encoded with no EXIF. Nothing else on disk is ever copied.
- **Build guard:** any media path inside a `private/` folder stops the build, and after the build the whole
  `public/roots` tree is checked for `private/` paths. `public/roots/media/places` is rebuilt from scratch each run.
- **Holding a photo back:** add it to `media_exclude` in `places-overrides.json` (`{file, reason}`). The build prints
  the held-back file names. Remove the entry to publish it.
- Brandon's photos are credited "Photo by Brandon Chiesa, June 2026" and rated family-provided. Commons images show
  author, licence (linked) and the Commons file page.
- The Valmozzola page (`public/roots/valmozzola/index.html`) is generated by `scripts/roots/village.mjs`. Its text is
  written from the tree's notes; edit it there. The emigrant list and the gallery are built from the data.

### Record images and "Where they were born" (v10)

- `photos/<place>/records/` holds record images Brandon provided (birth acts, the 1915 marriage certificate).
  They publish as `media/places/<place>/r-<name>.jpg` (max 1600 px, no EXIF). Give the media entry
  `"kind": "record-image"`, a `transcription`, a `source` and `"rating": "proven"`; the card shows them under
  "Record images" with the credit "Record image provided by Brandon Chiesa".
- A web photo whose file name contains `birthplace` is paired on the Valmozzola page ("Where they were born") with
  the `records/nati-*` act of the same place. Records whose name contains `marriage` appear under "Who left for America".
- Keep "Brandon Chiesa" out of fact and source text (write "from Brandon"): the living-name check would move the
  fact to the private block. Media credits are exempt. Avoid modern years (1930+) next to given names and ages in
  facts, for the same reason.
- Duplicates: add the file to `media_exclude` in places-overrides.json (06-old-stone-house is held back as the same
  building as 07-marianna-birthplace).

### Citations naming Brandon, and death ranges (v11)

- "FamilySearch record viewed read-only by Brandon Chiesa, <date>" in facts, sources, notes and events no longer counts as
  naming a living relative (the check reads it as "the site owner"); the published text is unchanged. Other living-name
  and census-age matches still move the item to the private block.
- A death date such as "after Apr 1910 and before 19 Aug 1917" or "between 1738 and 1740" shows as 1910–1917 in the
  short years, instead of only the first year.

### Living-name age check: dates and access dates (v13)

The census-age check hides a public string when a living person's first name is followed by a number (an age) and the
string mentions a year from 1930 on. Two false-match causes are fixed:

- A number followed by a month name in any case ("Bruce, 22 Dec 1915", "Morris, 15 May 1926") is a date, not an age.
  The month guard used to match lowercase month names only.
- Research access dates in the 2020s ("index read 18 Oct 2026", "viewed read-only by …, 18 Oct 2026", "image read
  17 Oct 2026") no longer count as record years. A 1930s–2010s year after "read" (e.g. a stone that "read 1935") still counts.
- Text such as "(screenshots in [research file])" or "(screenshots x.png and -zoom.png)" is removed from published text.

When the check changes, dump the private block before and after (`tools/privdump.mjs`, local only), and review every
string that becomes public: it must not give a living person's age, birth date, address or other detail beyond the
name. `tools/agescan.mjs` uses the same rules.

### No "Confirmed by Brandon" anywhere (v14)

Brandon asked (18 Oct 2026) that the site never say he confirmed, approved, verified or reviewed anything.

- `confirmed_by_brandon` (on a person or on a parent link) is no longer published: no chart badge, card pill, card
  note, family-row mark or encrypted note. The researchers' field can stay in the tree JSON; the build ignores it.
- `display_border: "solid"` still draws the solid border. The legend read "Solid border: proven link" (changed in v15, below).
- Published text drops "by Brandon (Chiesa)" after confirmed / approved / verified / reviewed / checked / viewed
  (e.g. "FamilySearch record viewed read-only, 18 Oct 2026"), and drops "Brandon confirmed/approved/verified …" clauses.
- Credits for his own photos and record images ("Photo by Brandon Chiesa", "Record image provided by Brandon Chiesa")
  are attributions, not confirmations, and stay.

### Neutral attribution wording; legend "key Jamestown line (probable)" (v15)

Brandon asked (18 Oct 2026) that public text not say what he decided, chose, identified, recalled or read.
`cleanText` in `build-data.mjs` rewrites these when it builds the site; the tree JSON is not changed:

| Researchers' wording | Published as |
| --- | --- |
| "Brandon chose the act date, …" / "Brandon chose 5 May 1885 from the act" / "(Brandon chose this date …)" | "Date per the birth act (atto 34): …" / "5 May 1885, per the birth act (atto 34)" / "(date per the birth act, atto 34)" |
| "Brandon's copy of Nati 1885 atto 34" | "the record image of Nati 1885 atto 34" |
| "Brandon identified this as the birthplace" / "the house identification is Brandon's" | "Identified as the birthplace from the birth act's house number" |
| "Brandon recalls b. …" | "Family recollection: b. …" |
| "Brandon read it as possibly …" | "Possible reading: …" |
| "Read from Brandon's screenshots" / "viewed via screenshots" | "Read from record images" / "viewed as record images" |
| "(Brandon, Oct 2026, relayed by Guido)" | "(Oct 2026)" |

There is a fallback for any other "Brandon decided/identified/said …" wording. Roots' news1 round had already changed some of these lines to "the family chose …", "(date chosen by the family …)", "The family copy of …" and "family-provided screenshots". Those are published with the same wording as the table above. The Valmozzola page's fixed text was
reworded in `village.mjs` in the same way. Photo and record-image credits ("Photo by Brandon Chiesa", "Record image
provided by Brandon Chiesa", "Brandon's photos") are attributions and stay.

**Build guard:** after writing, the build scans the public JSON (not the encrypted block) and the Valmozzola page. It
fails if any of these patterns, or "Confirmed by Brandon", is still there.

**Legend and the eight solid-border cards (Brandon's decision, 18 Oct 2026):** the legend reads exactly "Solid border:
key Jamestown line (probable)". Cards with a solid border, or a solid parent link (the Thomas Gray → Martha Judkins
line, 8 cards), never show the word "proven". v15 relabelled the proven-rated items as "Documented"; v16 replaced that,
see below.

### Newspaper mentions get their own card section (v15)

`newspaper_mentions` (paper, date, text, confidence, citation) used to be folded into "More from the records". They now
have their own **In the newspapers** section on the card, with the paper and date in bold, the rating, and the
citation. They also stay in the life timeline as "In the paper". Entries pass the same living-name filter as other
text. A mention that names a living relative goes into the encrypted block. Obituary survivor lists are not
transcribed (Roots' rule).

Hand pin added in `places-overrides.json`: "Hilton Village, Warwick Co., Virginia" is in Newport News. The geocoder
had matched a Hilton Village in West Virginia.

### v16: the Gray–Judkins line reads Probable; a possibly living second wife is not named

- **Probable, not Documented.** Brandon rated this line probable, and Martha Judkins's identity is open after the 1839
  Sussex marriage register (which names the bride Martha W. Green). On the eight solid-border cards, `unproven()`
  in `build-data.mjs` now turns every proven rating (the card's own rating, facts, timeline) into **Probable**, with
  the normal Probable styling, and rewrites "proven" in their text as "probable". The "Documented" rating is gone from
  `app.js` and `style.css`. The solid borders and the legend ("Solid border: key Jamestown line (probable)") stay.
- **Alice May Mann.** Peter Samuel Burkett's second wife (married 5 Sep 1981) may be living. `cleanText` publishes
  "Married Alice May Mann (on) 5 Sep 1981(; she survived him)" and "2nd marriage 5 Sep 1981 Madison VA (FS …)" as
  "Remarried in 1981." The build guard fails if her name, that date or the FamilySearch id reaches public output.
- **Password.** `ROOTS_PASSWORD` was not found in any file, environment or note on the box, and it should not be
  saved in one. v15 and v16 were therefore built with a throwaway password, and the encrypted block already deployed
  was kept byte for byte. Before reusing it, the build compared the new plaintext with the deployed one (both built
  with the throwaway password); the deployed block is reused only when they match. One known difference remains: 8 living
  people's hidden source lines still read "family-provided, Brandon, <date>" instead of "family-provided, <date>".
  The next build with the real password fixes it. Holly's tree stays on the 14:17:56 backup for the same reason: Roots 2's
  later edits change the encrypted block, including which person each opaque "living-N" id means.

### v17: Fold3 service records (Brandon's tree); second-wife wording; three map pins

- Brandon's tree is built from Roots' fold3csr round (`/workspace/douthat/tree-people.json` as of 14:44:34; backup
  `tree-people.pre-fold3csr.json`). The new data: Confederate service records for W. L. Dishman, J. P. Dishman and
  Peter T. Burkett (`peter-burkett-sib`), places at Tappahannock and Hanover Academy, New York leads (in notes only),
  and "William Lewis" Dishman downgraded to probable. Holly's tree stays on the 14:17:56 backup.
- Roots rewrote the second marriage as "Remarried 5 Sep 1981; his second wife survived him". `cleanText` publishes it as
  "Remarried in 1981." The build guard (name, date, FamilySearch id) caught the date on the first build.
- Hand pins in `places-overrides.json`:
  - "General Hospital, Hanover Academy": near Taylorsville, Hanover Co., VA. The geocoder had matched a modern address near Ashland.
  - "Red Sulphur Springs, Monroe Co., Va.": Monroe Co., in Virginia in 1863 and West Virginia now. The geocoder had matched Greensboro, NC.
  - Tappahannock, Essex Co., VA geocoded correctly.
  - Place notes in overrides are shown on the cards, so they are written for readers, not as geocoder notes.
- Password rule unchanged: the deployed encrypted block was reused because a fresh build's hidden block matched it
  apart from the 8 known "family-provided, Brandon" lines.

### Going live (18 Oct 2026, Brandon's go-ahead)

- **Production path.** brandonchiesa.com is served by GitHub Pages. The `Deploy to GitHub Pages` workflow runs on pushes
  to `cursor/video-shell-v3`; `main` holds only the initial commit. Roots went live by fast-forwarding
  `cursor/video-shell-v3` to this branch. `public/roots/` is copied unchanged into `dist/roots/`.
- **What went live.** The v17 tree output that was on the preview: Brandon's tree from fold3csr, Holly's from the 14:17:56
  backup. The encrypted blocks are the ones already deployed; nothing was rebuilt. `public/_headers` applies only on
  Cloudflare. On GitHub Pages, the `<meta name="robots" content="noindex, nofollow, noarchive">` in each Roots page keeps
  it out of search engines.
- **Homepage button.** `src/components/RootsButton.astro` is used twice in `HouseMenu.astro`. On roomy screens it sits
  under the bio. On phones and short screens (max-width 699px or max-height 760px) it sits beside "Reduce motion", because
  there the bio fills the space above the footer; CSS shows exactly one of the two. The roots are an absolutely positioned
  SVG behind neighbouring content. Each path uses `pathLength="1"` and animates `stroke-dashoffset` from 1 to 0: about
  0.6–0.9 s to grow, 0.45 s to retract. Hover (pointer devices) and keyboard focus grow them. On touch, a tap grows them
  and the link is followed after 0.75 s. With reduced motion (the OS setting or the site's toggle) there is no drawing:
  the roots appear at once at 60% opacity, and a tap follows the link immediately. The site CSS caps `svg` at
  `max-width: 100%`, so the overlay sets `max-width: none`.

