# Look v3 brief (locked)

Pixel / Brandon / Guido. Living-archive house. **Not Look v2 cartography.**

This is a personal site and is not affiliated with any employer.

Look v2 and PR #1 stay **held**. This brief is the video-shell direction only. Merge of the v3 shell stays **held**. Cards are `leather_panel.png` only.

## Palette (from the loop)

Match `public/video/loop.mp4` — not navy / parchment / tiffany HUD.

| Family | Use |
| --- | --- |
| Olive / pine greens | Forest, type on cream, pressed controls |
| Ochre / tan fields | Open ground, paper inset, soft underlays |
| Steely blue ridges | Distant hills, quiet accents (not tiffany) |
| Cream / charcoal clouds | Sky type, identity, menu chrome |

Do **not** carry Look v2 blues/tans cartography tokens as the primary house look.

## Flow

1. **House** — first paint is the home state over `public/video/loop.mp4`. No intro video, splash, or gate. The loop is already running (cover, center-crop).
2. **Banner** — name sits high and is visible immediately with the mist menu. Reduce-motion keeps the loop poster instead of the video.
3. **Menu** — Pixel PASS mist labels (HTML/CSS). PT Serif 400, `#F3EEE4` @ 0.95, mid-frame at 50.3%. Hover/selected use `mist_underline_brass.png` (~6px @1280, mid `#B59A62`). Idle labels stay cream. Blot UI is off the live shell.
4. **On select** — `leather_panel.png` (1600×900 cognac/espresso, Pixel PASS) with a short reveal over the continuing loop. Soft veil OK. **No glassmorphism.** Never wire `leather_pad*` or `leather_panel_mock`. A half-step lighter lift can overwrite the same filename if Brandon asks.

`prefers-reduced-motion` shows the loop poster. There is no intro to skip.

## Menu

- **Pixel PASS:** HTML/CSS mist labels. Spec: `public/art/v3/menu/MIST_MENU_SPECS.md`.
- PT Serif 400, ~32px @1280, `#F3EEE4` @ 0.95, vertical mid 50.3%. Live labels: Career, Coding, Videography, Contact.
- Hover/selected: Pixel PASS `mist_underline_brass.png` (~6px @1280, ~5px below baseline, mid `#B59A62`). Labels stay cream. No cream hairline. No blots, chips, or cairns.
- Blot assets may stay in `public/art/v3/`; they are not wired.
- Live rooms: Career, Coding, Videography, Contact — `/career/` `/coding/` `/videography/` `/contact/`. Roots and Now are unpublished (redirect home). Old `/work/` `/make/` `/go/` redirect to the new slugs.

## Art hooks (Pixel / Ink)

Source drops:

- `finals/v3/menu/` → `public/art/v3/blot_*.png` and `public/art/v3/anim/{intro,passive,active}/`
- `finals/v3/cards/` → `public/art/v3/leather_panel.png`

Runtime contract is `src/lib/art.ts` (`ART.v3`, frame helpers). Do not rename public files. Cards use `leather_panel.png` only. Never wire `leather_pad*`.

## Rooms

Live routes: `/career/` `/coding/` `/videography/` `/contact/`. Home name is bare; byline and bio sit on 22% leather letter-plates (full bio, no internal scroll). Career is a fixed Rolodex of three leather cards (Education, Work, Community) with cream serif + brass rules (`leather_panel.png` untouched); wheel moves the cards, not the page. ← Home is plated; room dismiss is a slow fade-out. Coding is three feature cards (Dojo, Italy Travel, Coming soon) on the leather/cream/brass pad — no Room B chrome. Videography is a channel-sectioned YouTube stills gallery on the same pad — no Room C chrome; tap a still to play on-site (`youtube-nocookie.com`). Contact is the same pad — no Room letters — links only: X `@bkchiesa` and LinkedIn `in/bkchiesa`. SEO, Person JSON-LD, generic employer disclaimer stay. `/work/` `/make/` `/go/` redirect; Roots and Now can return later.
