# Look v3 brief (locked)

Pixel / Brandon / Guido. Living-archive house. **Not Look v2 cartography.**

This is a personal website. It is not affiliated with, and does not represent, First Citizens Bank.

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

1. **Intro once** — `public/video/intro.mp4`, full-bleed. Dual-video overlap crossfade into the loop so the last intro valley matches loop t=0 (no hard cut).
2. **Banner** — name sits high; fades in at ~halfway through the intro; stays on the house. Reduce-motion skips the fade.
3. **Menu** — Pixel PASS mist labels (HTML/CSS). PT Serif 400, `#F3EEE4` @ 0.95, mid-frame at 50.3%. Hover is a soft cream underline only. Blot UI is off the live shell.
4. **On select** — `leather_panel.png` (1600×900 cognac/espresso, Pixel PASS) with a short reveal over the continuing loop. Soft veil OK. **No glassmorphism.** Never wire `leather_pad*` or `leather_panel_mock`. A half-step lighter lift can overwrite the same filename if Brandon asks.

Skip / `prefers-reduced-motion` / `?skip=1` land on the house over the loop (or the loop poster).

## Menu

- **Pixel PASS:** HTML/CSS mist labels. Spec: `public/art/v3/menu/MIST_MENU_SPECS.md`.
- PT Serif 400, ~32px @1280, `#F3EEE4` @ 0.95, gap `4.375vw`, vertical mid 50.3%.
- Hover/focus: 2px cream underline ~5px below baseline (slight blur). No color invert. No blots, brass, chips, or cairns.
- Blot assets may stay in `public/art/v3/`; they are not wired.
- Room routes stay: `/work/` `/make/` `/go/` `/roots/` `/now/`.

## Art hooks (Pixel / Ink)

Source drops:

- `finals/v3/menu/` → `public/art/v3/blot_*.png` and `public/art/v3/anim/{intro,passive,active}/`
- `finals/v3/cards/` → `public/art/v3/leather_panel.png`

Runtime contract is `src/lib/art.ts` (`ART.v3`, frame helpers). Do not rename public files. Cards use `leather_panel.png` only. Never wire `leather_pad*`.

## Rooms

Keep routes: `/work/` `/make/` `/go/` `/roots/` `/now/`. Existing Work facts and stubs stay in the leather inset. SEO, Person JSON-LD, bank disclaimer stay.
