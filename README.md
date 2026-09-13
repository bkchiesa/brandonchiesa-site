# Brandon Chiesa — living archive

Personal house-with-rooms site. Tech × Renaissance: HUD grids and circuit cues mixed with map plates (compass, hatching, a westbound flyover). Monochrome menu. Public portfolio only.

**This is a personal website. It is not affiliated with, and does not represent, First Citizens Bank.**

Expected GitHub Pages URL (after the Actions workflow has run on `main`):

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

This repo is configured for **GitHub Actions** → Pages (Astro static `dist/`).

1. In the repo: **Settings → Pages → Source: GitHub Actions**.
2. Merge this scaffold to `main` (or run the **Deploy to GitHub Pages** workflow from `main` via `workflow_dispatch`).
3. The first deploy creates the `github-pages` environment. The site is then at  
   `https://bkchiesa.github.io/brandonchiesa-site/`.

The workflow lives at `.github/workflows/deploy.yml`. It does **not** deploy from this PR branch until it is on `main`.

`astro.config.mjs` sets `site` to `https://bkchiesa.github.io` and `base` to `/brandonchiesa-site`.

## v1 rooms

| Door | What shipped |
| --- | --- |
| **Intro** | ~10s Coast → Piedmont/River → Blue Ridge SVG flyover (camera west), then fade to menu. Honors `prefers-reduced-motion`. Visible **Skip intro**. |
| **Menu** | `[BRANDON CHIESA]`, tagline, five doors, **Skip intro / Replay intro** and **Reduce motion**. |
| **Work** | Education, career path, community — public facts only. Bank disclaimer in the footer. |
| **Make** | Hero card for [Sensei Moose’s Dojo](https://bkchiesa.github.io/Sensei-mooses-dojo/). Other cards are placeholders. |
| **Go** | Film-strip placeholders. Privacy-enhanced YouTube embed ready (`youtube-nocookie.com`); channel links for `@brandonchiesa3886` and `@chiesab`. Video IDs TBD. |
| **Roots** | Map + tree wireframes. Copy stubs: Valmozzola → Chicago → Virginia. |
| **Now** | Empty field notes stub. |

Art plates from Pixel/Ink can replace the SVG placeholders without changing the room structure.

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
