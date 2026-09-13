# Brandon Chiesa — living archive

Personal house-with-rooms site. Tech × Renaissance.

**Look v2 is LOCKED:** blues + tans (navy / parchment / sparse clay / tiffany HUD — no greens) and a place-accurate westbound intro (Newport News Peninsula → James River piedmont → Blue Ridge). Production plates live in `public/art/` using the filenames in `src/lib/art.ts`.

**This is a personal website. It is not affiliated with, and does not represent, First Citizens Bank.**

Expected GitHub Pages URL (after Pages is enabled and the deploy workflow has run):

**https://bkchiesa.github.io/brandonchiesa-site/**

Custom domain can be added later; it is not required for v1.

## Run locally

Requires Node 22+.

```bash
npm install
npm run dev
```

Astro serves the project-pages base path, so open:

**http://localhost:4321/brandonchiesa-site/**

```bash
npm run build
npm run preview
```

`preview` also uses `/brandonchiesa-site/`.

## GitHub Pages

This repo is configured for **GitHub Actions** → Pages (Astro static `dist/`). `astro.config.mjs` sets `site` to `https://bkchiesa.github.io` and `base` to `/brandonchiesa-site`.

Pages is **not enabled on the repo yet** (the Pages API still 404s). After a maintainer sets **Settings → Pages → Source: GitHub Actions**:

1. Open **Actions → Deploy to GitHub Pages**.
2. **Run workflow** and choose this PR branch `cursor/personal-site-scaffold-c518` (or `main` after merge).
3. The first deploy creates the `github-pages` environment. The site is then at  
   `https://bkchiesa.github.io/brandonchiesa-site/`.

Push to `main` or to `cursor/personal-site-scaffold-c518` also triggers the workflow. This PR is not merged.

The workflow lives at `.github/workflows/deploy.yml`.

## v1 rooms

| Door | What shipped |
| --- | --- |
| **Intro** | ~10s **crossfade** of `public/art/intro_01_coast.png` → `intro_02_piedmont.png` → `intro_03_blueridge.png` (Newport News Peninsula → James River piedmont → Blue Ridge). Honors `prefers-reduced-motion`. Visible **Skip intro**. |
| **Menu** | `[BRANDON CHIESA]`, tagline, **horizontal** row of clickable `door_*.png` plates (desktop primary). Narrow phones also show `menu_doors_mobile.png` and can swipe the door row. `menu_doors_desktop.png` and `menu_icon_plates.png` are locked look references / fallbacks. Icons are wired in room headers. |
| **Work** | Education, career path, community — public facts only. Bank disclaimer in the footer. |
| **Make** | Hero card for [Sensei Moose’s Dojo](https://bkchiesa.github.io/Sensei-mooses-dojo/). Other cards are placeholders. |
| **Go** | Film-strip placeholders. Privacy-enhanced YouTube embed ready (`youtube-nocookie.com`); channel links for `@brandonchiesa3886` and `@chiesab`. Video IDs TBD. |
| **Roots** | Locked `room_hero_roots.png` (Valmozzola → Virginia). Map + tree wireframes. Copy stubs: Valmozzola → Chicago → Virginia. |
| **Now** | Empty field notes stub. |

Art swap: overwrite the files in `public/art/` (same names). Menu mobile plate and Roots hero are live.

## Palette (locked)

Navy `--navy`, parchment `--parchment`, sparse clay `--clay`, tiffany HUD `--tiffany`. No green foliage or green HUD.

## Art

Locked Look v2 plates live in `public/art/`. Door/icon plates drive the interactive menu; room pages use `room_hero_*`.

## SEO / agents

- Real HTML text (intro is overlay; the menu and rooms stay in the document).
- Person JSON-LD on every page.
- `robots.txt`, Astro sitemap, [`/llms.txt`](https://bkchiesa.github.io/brandonchiesa-site/llms.txt).
- Open Graph image: `og.png` (plus `og.svg`).
- Landmarks: skip link, header, nav, main, footer.

## Motion

- OS **Reduce motion** skips the intro.
- Footer **Reduce motion** persists in `localStorage`.
- Session skip: after one play (or Skip), refresh stays on the menu. Use **Replay intro** to fly again.
- `?skip=1` on the house URL also lands on the menu.
