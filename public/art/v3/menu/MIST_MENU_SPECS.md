# Mist Menu — DojoDev wire specs (Look v3)

**Status:** Brandon LOCKED 2026-09-13 — concept **#1 Mist labels** + **#5 hover** (soft underline).  
**Plate:** exact loop still `refs/stills/loop_07s.png` (1280×720). Do **not** regenerate landscape.

## Scrap for menu chrome
- **Scrap blot sprites / anims for the menu** (intro / passive / active packs, `blot_*.png` settled sprites, bloom frames). Hold blot assets on disk if useful elsewhere; they are **not** menu chrome.
- No chips, rails, cairns, parchment pills, brass bars, or other blot shapes behind labels.
- Menu = **HTML/CSS text** over the full-bleed loop video (same framing as `loop_07s`).

## Locked behavior
| State | Treatment |
|-------|-----------|
| **Idle** | Five cream serif labels float mid-frame: `Work` `Make` `Go` `Roots` `Now` — **spaced words, no interpuncts** (mist #1, not brass/horizon dots). |
| **Hover** | Soft thin cream underline under the hovered word only (~2px, soft edges, slight gap below baseline). **Not** color invert / fill swap. |
| **Selected** | Keep existing **`leather_panel`** reveal for room content. Loop continues behind. Panel path unchanged. |

## Typography tokens (at 1280 CSS px width)
Scale linearly with viewport (`calc` / `clamp` from 1280 reference).

| Token | Value | Notes |
|-------|-------|-------|
| `font-family` | `"DejaVu Serif", "Liberation Serif", "PT Serif", Georgia, "Times New Roman", serif` | Comp used **DejaVu Serif Regular** (`/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf`). Prefer a web-licensed serif of similar metric (e.g. PT Serif / Source Serif) in production. |
| `font-size` | **32px** @ 1280 | ~2.5% of width (`2.5vw` capped). |
| `font-weight` | `400` | Regular; no bold on idle. |
| `letter-spacing` | **~0.025em** (~0.8px @ 32) | Subtle tracking; words stay readable. |
| `color` | `#F3EEE4` | Cream / ivory. |
| `opacity` | **0.95** | Or `rgba(243, 238, 228, 0.95)`. |
| Word gap | **~56px** @ 1280 between label boxes | Airy mist spacing; flex `gap` ~ `4.375vw` (tune to match comps). |
| Vertical | Mid-frame | Glyph optical center ≈ **y = 362** @ 720 (~50.3% from top). Baseline ≈ 377. |

### Text-shadow (multi-pass forest contrast)
Approximate Pillow multi-pass with stacked CSS shadows (dark, soft):

```css
color: rgba(243, 238, 228, 0.95);
text-shadow:
  0 2px 5px rgba(20, 24, 18, 0.37),
  0 1px 3px rgba(20, 24, 18, 0.45),
  1px 1px 1px rgba(20, 24, 18, 0.30),
  0 0 1px rgba(20, 24, 18, 0.18);
```

## Hover underline
```css
/* preferred: ::after so underline softens independently */
.nav-label {
  position: relative;
  text-decoration: none;
}
.nav-label::after {
  content: "";
  position: absolute;
  left: 1px;
  right: 1px;
  top: calc(100% + 5px); /* ~5px gap below baseline box */
  height: 2px;
  background: rgba(243, 238, 228, 0.90);
  border-radius: 1px;
  opacity: 0;
  filter: blur(0.6px);
  box-shadow: 0 0 2px rgba(243, 238, 228, 0.35);
  transition: opacity 160ms ease;
}
.nav-label:hover::after,
.nav-label:focus-visible::after {
  opacity: 1;
}
```
- Underline color matches cream (warm white), **not** a brand accent invert.
- Soft edges via light blur / soft shadow; keep ~2px visual weight.

## Layout sketch
```html
<nav class="mist-menu" aria-label="Rooms">
  <a class="nav-label" href="#work">Work</a>
  <a class="nav-label" href="#make">Make</a>
  <a class="nav-label" href="#go">Go</a>
  <a class="nav-label" href="#roots">Roots</a>
  <a class="nav-label" href="#now">Now</a>
</nav>
```
```css
.mist-menu {
  position: absolute;
  left: 50%;
  top: 50.3%;
  transform: translate(-50%, -50%);
  display: flex;
  gap: 56px; /* @ 1280 ref */
  z-index: 2;
  pointer-events: auto;
}
```
Video / loop sits full-bleed underneath (`object-fit: cover`). No menu sprite layer.

## Comp asset paths
| File | Role |
|------|------|
| `/workspace/brandon-site-art/finals/v3/menu/mist_idle_on_loop.png` | Idle on exact `loop_07s` |
| `/workspace/brandon-site-art/finals/v3/menu/mist_hover_make_on_loop.png` | Same + soft underline under **Make** |
| `/workspace/brandon-site-art/finals/v3/menu/mist_contact.png` | Stacked idle \| hover contact with captions |
| Concepts (ref only, do not overwrite) | `finals/v3/menu/concepts/01_mist_labels.png`, `05_horizon_type.png` |

## Out of scope / do not touch
- `leather_panel` / `finals/v3/cards/` — keep selected-room reveal as-is.
- `concepts/` folder — reference only.
- Do not regenerate blot art for this menu path.

## Soft concerns
- DejaVu is the **comp** face; swap to a licensed web serif with similar width before ship.
- Cream on bright mist patches needs the multi-pass shadow; if still thin on some loop frames, nudge shadow opacity slightly rather than adding chrome.
- Word-gap may need ±8px tuning once live over motion video vs the still.
