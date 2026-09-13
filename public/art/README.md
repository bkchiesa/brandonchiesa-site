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

State-folder anim packs are canonical. Ignore `v3/anim/{door}/` mirrors.

**Hold:** blot contact/sprites are still in revise (r3 liquid/rounded incoming). Keep these filenames. Leather chrome PASS: cards use `leather_pad_flat.png` + `leather_pad_veil.png`. Do not rename. See `LOOK_V3_BRIEF.md`.

| File | Use |
| --- | --- |
| `v3/blot_*.png` | Settled wet blot stills |
| `v3/anim/intro/blot_{id}_intro_00..05.png` | Bloom-in once |
| `v3/anim/passive/blot_{id}_passive_00..07.png` | Idle liquid loop (8f) |
| `v3/anim/active/blot_{id}_active_00..05.png` | Hover/focus loop |
| `v3/anim/active/blot_{id}_selected.png` | Pressed/selected still |
| `v3/leather_pad_flat.png` | Preferred room-card fill (flat texture panel) |
| `v3/leather_pad_veil.png` | Contrast plate behind the card |
| `v3/leather_pad.png` | 3D desk-pad prop — available, not the default card |
| `v3/leather_panel.png` | Texture-only fallback |

## Room heroes

| File | Room |
| --- | --- |
| `room_hero_work.png` | Work |
| `room_hero_make.png` | Make |
| `room_hero_go.png` | Go |
| `room_hero_roots.png` | Roots |
