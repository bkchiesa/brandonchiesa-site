# Art swap hooks (Look v2 locked)

Pixel→Ink finals go here. Overwrite the file; keep the name. `src/lib/art.ts` is the contract.

## Intro (crossfade 1→2→3)

| File | Beat |
| --- | --- |
| `intro_01_coast.png` | Newport News / Virginia Peninsula |
| `intro_02_piedmont.png` | James River piedmont |
| `intro_03_blueridge.png` | Blue Ridge |

## Menu (horizontal row)

| File | Use |
| --- | --- |
| `door_work.png` `door_make.png` `door_go.png` `door_roots.png` `door_now.png` | Clickable door plates |
| `icon_work.png` `icon_make.png` `icon_go.png` `icon_roots.png` `icon_now.png` | Room header icons |
| `menu_doors_desktop.png` | Desktop strip reference (optional) |

## Room heroes

| File | Room |
| --- | --- |
| `room_hero_work.png` | Work |
| `room_hero_make.png` | Make |
| `room_hero_go.png` | Go |

Roots hero is a parchment stub until a cleared plate lands. Add `room_hero_roots.png` and wire it in `ART.heroes` only after Pixel QA.

## HOLD — do not ship in UI

- `menu_doors_mobile.png` — broken crop. Phones use the CSS door row.
- `room_hero_roots.png` — label glitch.

Look v2 tokens stay navy / parchment / clay / tiffany. No greens.
