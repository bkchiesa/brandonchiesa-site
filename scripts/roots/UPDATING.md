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
3. Commit `public/roots/data/brandon.json` and `holly.json`, then deploy as usual. Only these two files change.

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
