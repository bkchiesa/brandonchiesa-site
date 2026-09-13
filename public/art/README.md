# Art swap hooks

**Look v3 primary chrome** lives in `v3/`. Look v2 plates below stay as room heroes / locked references — they are **not** the house menu.

Pixel/Guido cleared plates live here. Overwrite the file; keep the name. `src/lib/art.ts` is the contract.

Navy / parchment / clay / tiffany. No greens.

## Intro (crossfade 1→2→3)

| File | Beat |
| --- | --- |
| `intro_01_coast.png` | Newport News / Virginia Peninsula |
| `intro_01_newport_news.png` | Same pixels as coast (alias) |
| `intro_02_piedmont.png` | James River piedmont |
| `intro_03_blueridge.png` | Blue Ridge |

## Menu (horizontal row desktop-first)

| File | Use |
| --- | --- |
| `door_work.png` `door_make.png` `door_go.png` `door_roots.png` `door_now.png` | Clickable door plates |
| `icon_work.png` `icon_make.png` `icon_go.png` `icon_roots.png` `icon_now.png` | Room header icons |
| `menu_doors_desktop.png` | Locked desktop look reference / fallback |
| `menu_doors_mobile.png` | Vertical plate on narrow viewports |
| `menu_icon_plates.png` | Five-up icon strip reference |

## Look v3 (video shell)

Blot contact is **held** until Pixel PASSes r3 (rounder / wetter) from `finals/v3/menu/`. Copy onto the blot paths below — do not chase interim PNG refreshes.

Leather **pad props are rejected** (`leather_pad.png`, `leather_pad_flat.png`). Room cards are a flat **texture panel**. Drop r3 at `v3/leather_panel.png` (one-line hook in `src/lib/art.ts` → `ART.v3.leatherPanel`). Until that file exists, the panel uses a CSS leather fill.

| File | Use |
| --- | --- |
| `v3/blot_work.png` `v3/blot_make.png` `v3/blot_go.png` `v3/blot_roots.png` `v3/blot_now.png` | House menu ink-blots (held / not final) |
| `v3/leather_panel.png` | **Preferred** flat leather texture fill (not shipped yet) |
| `v3/leather_pad.png` `v3/leather_pad_flat.png` | Rejected desk-pad props — do not wire |

## Room heroes

| File | Room |
| --- | --- |
| `room_hero_work.png` | Work |
| `room_hero_make.png` | Make |
| `room_hero_go.png` | Go |
| `room_hero_roots.png` | Roots |
