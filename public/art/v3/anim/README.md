# Look v3 r3 — Blot packs (PASTEL LOCK)

## Door → hue (Pixel LOCK 2026-09-13)
- WORK: dusty ochre / warm clay
- MAKE: soft olive / sage
- GO: steely powder blue
- ROOTS: muted pine / gray-green
- NOW: warm fog gray / pale taupe (not lavender-violet)

## Canonical DojoDev paths
```
anim/intro/blot_{id}_intro_00..05.png      # intro_05 === passive_00
anim/passive/blot_{id}_passive_00..07.png
anim/active/blot_{id}_active_00..05.png
anim/active/blot_{id}_selected.png
```
Settled: `../blot_*.png` · loop contact: `../blot_menu_on_loop_still.png`
512 RGBA · soft gloss · cream labels
Cards: `leather_pad_flat` + `leather_pad_veil`. Do not default to the 3D `leather_pad` prop.
Dark pre-pastel archive: `work/v3-pre-pastel/settled/`

ids: `work` | `make` | `go` | `roots` | `now`

Door-folder copies under `anim/{door}/` are **legacy mirror** — do not prefer if they differ (esp. passive frame count).

Contacts: `anim/{intro,passive,active}/_contact_*.png` · `all_doors_anim_contact.png` · `intro/_handoff_proof.png`
