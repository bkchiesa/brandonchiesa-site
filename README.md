# Brandon Chiesa — living archive

Personal house-with-rooms site. Tech × Renaissance.

**Look v3 (this branch):** video-driven house locked in [`LOOK_V3_BRIEF.md`](LOOK_V3_BRIEF.md). Palette follows the **loop video** (olive/pine, ochre/tan, steely ridges, cream/charcoal) — not Look v2 navy/tiffany cartography. Merge **held**. Look v2 / PR #1 stay held.

**This is a personal site and is not affiliated with any employer.**

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
2. **Run workflow** and choose this PR branch `cursor/video-shell-v3` (or `main` after merge).
3. The first deploy creates the `github-pages` environment. The site is then at  
   `https://bkchiesa.github.io/brandonchiesa-site/`.

Push to `main` or to `cursor/video-shell-v3` also triggers the workflow. This PR is not merged.

The workflow lives at `.github/workflows/deploy.yml`.

## Look v3 house

| Beat | What shipped |
| --- | --- |
| **Intro** | `public/video/intro.mp4` plays **once**, full-bleed. Headline fades in at ~halfway. Escape or an invisible tap skips; reduce-motion / `?skip=1` / a prior session skip go to the house. Tap-to-start if autoplay is blocked. |
| **Loop** | Dual-video overlap crossfade into `public/video/loop.mp4` — loop starts at t=0 under the last intro valley. Cover, center-crop, no tile. Reduced motion uses the loop poster. |
| **Menu** | Mist labels (PT Serif HTML/CSS) mid-frame over the loop. Hover/selected use `mist_underline_brass.png` (~6px @1280). Spec: `public/art/v3/menu/MIST_MENU_SPECS.md`. Blot UI is **off** the live shell. |
| **Rooms** | Leather **texture panel** from `public/art/v3/leather_panel.png` with a short reveal over a dark veil. No frosted glass. `leather_pad*` is rejected and unwired. |
| **Motion** | Session skip: after one play (or Skip), refresh stays on the menu. **Replay intro** flies again. |

Art swap: overwrite the files in `public/art/v3/` and `public/video/` (same names). Hooks live in `src/lib/art.ts`. Merge is **held**. Cards are `leather_panel.png` only.

## Palette

Look v3 house chrome uses loop tokens (`--v3-pine`, `--v3-ochre`, `--v3-ridge`, `--v3-cream`, `--v3-charcoal`). Look v2 navy/parchment/tiffany stay in `global.css` for leftover room-card structure only — they are not the primary house look.

## SEO / agents

- Real HTML text (intro is overlay; the menu and rooms stay in the document).
- Person JSON-LD on every page.
- `robots.txt`, Astro sitemap, [`/llms.txt`](https://bkchiesa.github.io/brandonchiesa-site/llms.txt).
- Open Graph image: `og.png` (plus `og.svg`).
- Landmarks: skip link, header, nav, main, footer.

## Rooms

| Door | What shipped |
| --- | --- |
| **Career** (`/career/`) | Education, Work, and Community — each on its own leather card. Cream serif + brass rules. Generic employer disclaimer. Was `/work/`. |
| **Coding** (`/coding/`) | Three feature cards: [Sensei Moose’s Dojo](https://bkchiesa.github.io/Sensei-mooses-dojo/), [Italy Travel](https://bkchiesa.github.io/Chiesa-italy-2026/) (public app anonymized), and Coming soon. Was `/make/`. |
| **Videography** (`/videography/`) | Film-strip placeholders. Privacy-enhanced YouTube embed ready (`youtube-nocookie.com`); channel links for `@brandonchiesa3886` and `@chiesab`. Video IDs TBD. Was `/go/`. |

Roots and Now are unpublished for now (old URLs redirect to the house). They can return later.
