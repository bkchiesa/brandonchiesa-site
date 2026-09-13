# Look v3 r3 — Blot animation sets (LOCKED / Pixel PASS)

## Canonical for DojoDev (prefer these)
```
anim/intro/blot_{id}_intro_00..05.png      # 6f bloom-in; intro_05 === passive_00
anim/passive/blot_{id}_passive_00..07.png  # 8f idle breathe
anim/active/blot_{id}_active_00..05.png    # 6f hover/selected
anim/active/blot_{id}_selected.png         # settled hold
```

ids: `work` | `make` | `go` | `roots` | `now`  
512×512 RGBA · soft gloss · shape source locked `../blot_*.png`  
`leather_panel` only — no pad props.

Door-folder copies under `anim/{door}/` are **legacy mirror** — do not prefer if they differ (esp. passive frame count).

Contacts: `anim/{intro,passive,active}/_contact_*.png` · `all_doors_anim_contact.png` · `intro/_handoff_proof.png`
