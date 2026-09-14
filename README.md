# Brandon Chiesa — living archive

Personal house-with-rooms site. Tech × Renaissance.

**Look v3 (this branch):** video-driven house locked in [`LOOK_V3_BRIEF.md`](LOOK_V3_BRIEF.md). Palette follows the **loop video** (olive/pine, ochre/tan, steely ridges, cream/charcoal) — not Look v2 navy/tiffany cartography. Merge **held**. Look v2 / PR #1 stay held.

**This is a personal site and is not affiliated with any employer.**

Production URL (custom domain on GitHub Pages):

**https://brandonchiesa.com/**

The old project-pages path `https://bkchiesa.github.io/brandonchiesa-site/` may break until merge/DNS; the custom domain is the production target.

## Run locally

Requires Node 22+.

```bash
npm install
npm run dev
```

Astro serves the site at the domain root (`base: "/"`), so open:

**http://localhost:4321/**

```bash
npm run build
npm run preview
```

`preview` also uses `/`.

## GitHub Pages

This repo is configured for **GitHub Actions** → Pages (Astro static `dist/`). `astro.config.mjs` sets `site` to `https://brandonchiesa.com` and `base` to `/`. `public/CNAME` keeps the custom domain on deploy.

1. Open **Actions → Deploy to GitHub Pages**.
2. **Run workflow** and choose this PR branch `cursor/video-shell-v3` (or `main` after merge).
3. The site is then at `https://brandonchiesa.com/`.

Push to `main` or to `cursor/video-shell-v3` also triggers the workflow. This PR is not merged.

The workflow lives at `.github/workflows/deploy.yml`.

## Look v3 house

| Beat | What shipped |
| --- | --- |
| **Intro** | `public/video/intro.mp4` plays **once**, full-bleed. Headline fades in at ~halfway. Escape or an invisible tap skips; reduce-motion / `?skip=1` / a prior session skip go to the house. Tap-to-start if autoplay is blocked. |
| **Loop** | Dual-video overlap crossfade into `public/video/loop.mp4` — loop starts at t=0 under the last intro valley. Cover, center-crop, no tile. Reduced motion uses the loop poster. |
| **Menu** | Mist labels (PT Serif HTML/CSS) mid-frame over the loop: Career · Coding · Videography · Contact. Hover/selected use `mist_underline_brass.png` (~6px @1280). Spec: `public/art/v3/menu/MIST_MENU_SPECS.md`. Blot UI is **off** the live shell. |
| **Rooms** | Leather **texture panel** from `public/art/v3/leather_panel.png` with a short reveal over a dark veil. No frosted glass. `leather_pad*` is rejected and unwired. |
| **Motion** | Session skip: after one play (or Skip), refresh stays on the menu. **Replay intro** flies again. |

Art swap: overwrite the files in `public/art/v3/` and `public/video/` (same names). Hooks live in `src/lib/art.ts`. Merge is **held**. Cards are `leather_panel.png` only.

## Palette

Look v3 house chrome uses loop tokens (`--v3-pine`, `--v3-ochre`, `--v3-ridge`, `--v3-cream`, `--v3-charcoal`). Look v2 navy/parchment/tiffany stay in `global.css` for leftover room-card structure only — they are not the primary house look.

## SEO / agents

- Real HTML text (intro is overlay; the menu and rooms stay in the document).
- Person JSON-LD on every page.
- `robots.txt`, Astro sitemap, [`/llms.txt`](https://brandonchiesa.com/llms.txt).
- Open Graph image: `og.png` (plus `og.svg`).
- Landmarks: skip link, header, nav, main, footer.

## Rooms

| Door | What shipped |
| --- | --- |
| **Career** (`/career/`) | Education, Work, and Community — each on its own leather card. Cream serif + brass rules. Generic employer disclaimer. Was `/work/`. |
| **Coding** (`/coding/`) | Three feature cards: [Sensei Moose’s Dojo](https://bkchiesa.github.io/Sensei-mooses-dojo/), [Italy Travel](https://bkchiesa.github.io/Chiesa-italy-2026/) (public app anonymized), and Coming soon. Was `/make/`. |
| **Videography** (`/videography/`) | Channel-sectioned YouTube stills gallery (Guido inventory in `src/data/youtube_inventory.json`). `@brandonchiesa3886` and `@chiesab`. Tap a still to play on-site (`youtube-nocookie.com`); Open on YouTube is secondary. Was `/go/`. |
| **Contact** (`/contact/`) | Leather pad, no Room letters. X [`@bkchiesa`](https://x.com/bkchiesa). Work banking email pending — “Email coming soon,” no invented address. Generic employer disclaimer. |

Roots and Now are unpublished for now (old URLs redirect to the house). They can return later.
