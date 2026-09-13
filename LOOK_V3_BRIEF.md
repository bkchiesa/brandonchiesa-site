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

1. **Intro once** — `public/video/intro.mp4`, full-bleed, **no UI chrome**.
2. **Crossfade** to `public/video/loop.mp4` as `object-fit: cover` (center-crop, no tile).
3. **Ink-blot reveals** — Work · Make · Go · Roots · Now bloom to labels, then idle.
4. **On select** — opaque leather texture panel (`leather_panel.png`) over the continuing loop. Soft veil behind the card is OK. **No glassmorphism.** Brandon rejected the `leather_pad*` family — do not wire those files.

Skip / `prefers-reduced-motion` / `?skip=1` land on the house over the loop (or the loop poster).

## Menu

- Horizontal blot row on desktop.
- Stack (or wrap) is OK on mobile.
- Blot contact/sprites are **still in revise**. Do not treat current stills as final. Expect r3 liquid/rounded swaps on the same filenames.
- Keep blot hooks. Default `data-label-mode="in-blot"` (HTML copy is a11y-only). `on-plate` overlays HTML inside the plate; `under` sits captions below. Bloom frames incoming — flip the attribute only; do not lock caption geometry.

## Art hooks (Pixel / Ink)

Source drops:

- `finals/v3/menu/` → `public/art/v3/blot_*.png` and `public/art/v3/anim/{intro,passive,active}/`
- `finals/v3/cards/` → `public/art/v3/leather_panel.png`

Runtime contract is `src/lib/art.ts` (`ART.v3`, frame helpers). Do not rename public files. Cards use `leather_panel.png` only. Never wire `leather_pad*`.

## Rooms

Keep routes: `/work/` `/make/` `/go/` `/roots/` `/now/`. Existing Work facts and stubs stay in the leather inset. SEO, Person JSON-LD, bank disclaimer stay.
