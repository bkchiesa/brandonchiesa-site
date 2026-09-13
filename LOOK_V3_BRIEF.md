# Look v3 brief (locked)

Pixel / Brandon / Guido. Living-archive house. **Not Look v2 cartography.**

This is a personal website. It is not affiliated with, and does not represent, First Citizens Bank.

Look v2 and PR #1 stay **held**. This brief is the video-shell direction only. Merge of the v3 shell stays **held**. Leather chrome is PASS; blot contact/sprites are still in revise (r3 liquid/rounded incoming).

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
4. **On select** — opaque **flat leather texture panel** (`leather_pad_flat.png`) over the continuing loop. `leather_pad_veil.png` for contrast behind the card. **No glassmorphism.** Do not use the 3D `leather_pad.png` prop as the default card.

Skip / `prefers-reduced-motion` / `?skip=1` land on the house over the loop (or the loop poster).

## Menu

- Horizontal blot row on desktop.
- Stack (or wrap) is OK on mobile.
- Blot contact/sprites are **still in revise**. Do not treat current stills as final. Expect r3 liquid/rounded swaps on the same filenames.
- Keep blot hooks. Default `data-label-mode="in-blot"` (HTML copy is a11y-only). `on-plate` overlays HTML inside the plate; `under` sits captions below. Bloom frames incoming — flip the attribute only; do not lock caption geometry.

## Art hooks (Pixel / Ink)

Source drops:

- `finals/v3/menu/` → `public/art/v3/blot_*.png` and `public/art/v3/anim/{intro,passive,active}/`
- `finals/v3/cards/` → `public/art/v3/leather_pad_flat.png` (+ `leather_pad_veil.png`)

Runtime contract is `src/lib/art.ts` (`ART.v3`, frame helpers). Do not rename public files. Cards prefer `leather_pad_flat.png`. `leather_pad.png` (3D) stays available but unwired.

## Rooms

Keep routes: `/work/` `/make/` `/go/` `/roots/` `/now/`. Existing Work facts and stubs stay in the leather inset. SEO, Person JSON-LD, bank disclaimer stay.
