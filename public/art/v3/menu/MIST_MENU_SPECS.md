# Mist Menu — DojoDev wire specs (Look v3)

**Status:** Brandon LOCKED 2026-09-13 — concept **#1 Mist labels** + **#5 hover**. Soft polish: hover underline → **3× thicker faded worn-brass grain** (was ~2px cream).  
**Streamline (Brandon via Guido):** **THREE labels only** — `Career` `Coding` `Videography`. **Roots** and **Now** removed. Renames: Work→Career, Make→Coding, Go→Videography.  
**Plate:** exact loop still `refs/stills/loop_07s.png` (1280×720). Do **not** regenerate landscape.

## Scrap for menu chrome
- **Scrap blot sprites / anims for the menu** (intro / passive / active packs, `blot_*.png` settled sprites, bloom frames). Hold blot assets on disk if useful elsewhere; they are **not** menu chrome.
- No chips, rails, cairns, parchment pills, brass bars, or other blot shapes behind labels.
- Menu = **HTML/CSS text** over the full-bleed loop video (same framing as `loop_07s`).

## Locked behavior
| State | Treatment |
|-------|-----------|
| **Idle** | Three cream serif labels float mid-frame: `Career` `Coding` `Videography` — **spaced words, no interpuncts** (mist #1, not brass/horizon dots). |
| **Hover** | Soft **faded worn-brass** underline under the hovered word only (~**6px** visual weight @1280 = 3× prior cream). Soft edges + grain texture. **Not** color invert / fill swap; labels stay cream. Comp demo underline sits under **Coding**. |
| **Selected** | Keep existing **`leather_panel`** reveal for room content. Loop continues behind. Panel path unchanged. |

## Typography tokens (at 1280 CSS px width)
Scale linearly with viewport (`calc` / `clamp` from 1280 reference).

| Token | Value | Notes |
|-------|-------|-------|
| `font-family` | `"DejaVu Serif", "Liberation Serif", "PT Serif", Georgia, "Times New Roman", serif` | Comp used **DejaVu Serif Regular** (`/usr/share/fonts/truetype/dejavu/DejaVuSerif.ttf`). Prefer a web-licensed serif of similar metric (e.g. PT Serif / Source Serif) in production. |
| `font-size` | **32px** @ 1280 | ~2.5% of width (`2.5vw` capped). **No nudge** for Videography — fits at 32 with rebalanced gap. |
| `font-weight` | `400` | Regular; no bold on idle. |
| `letter-spacing` | **~0.025em** (~0.8px @ 32) | Subtle tracking; words stay readable. |
| `color` | `#F3EEE4` | Cream / ivory. |
| `opacity` | **0.95** | Or `rgba(243, 238, 228, 0.95)`. |
| Word gap | **~88px** @ 1280 between label boxes | Airy mist spacing for **3 longer words** (was ~56px for 5 short labels). Flex `gap` ~ `6.875vw` (tune to match comps). Side margin ≈326px @1280. |
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

## Hover underline (soft polish — brass grain)
**Thickness:** ~**6px** visual weight @1280 CSS px (3× the prior ~2px cream bar). Scale with viewport (`0.47vw` ≈ 6/1280, or `height: 0.469vw` capped). Soft alpha edges; optical core ≈6px inside a ~10px strip.

**Color tokens (faded worn brass — not neon / not chrome):**
| Token | Hex | Notes |
|-------|-----|-------|
| `--mist-brass-mid` | `#B59A62` | Primary fill / mean grain |
| `--mist-brass-hi` | `#C9B07A` | Soft highlight flecks |
| `--mist-brass-lo` | `#8F7548` | Shadow grain |
| `--mist-brass-deep` | `#6E5A38` | Wear pits |
| Fallback solid | `rgba(181, 154, 98, 0.78)` | If texture fails to load |

**Texture assets:**
| File | Size | Role |
|------|------|------|
| `finals/v3/menu/mist_underline_brass.png` | 192×10 RGBA | Soft-edged horizontal strip; scale to label width |
| `finals/v3/menu/mist_underline_brass_tile.png` | 64×10 RGBA | Optional 1D-seamless tile for `background-repeat: repeat-x` |

```css
/* preferred: ::after + brass texture strip */
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
  height: 6px; /* visual weight @1280; strip asset is 10px with soft alpha */
  background-color: rgba(181, 154, 98, 0.78); /* fallback */
  background-image: url("/art/menu/mist_underline_brass.png");
  background-size: 100% 100%; /* or: contain / 100% auto */
  background-repeat: no-repeat;
  background-position: center;
  border-radius: 1px;
  opacity: 0;
  filter: blur(0.35px); /* keep grain readable; avoid washing to chrome */
  transition: opacity 160ms ease;
}
.nav-label:hover::after,
.nav-label:focus-visible::after {
  opacity: 0.92; /* slight fade — worn, not neon bar */
}

/* optional seamless tile variant */
.nav-label.tile-underline::after {
  background-image: url("/art/menu/mist_underline_brass_tile.png");
  background-repeat: repeat-x;
  background-size: auto 100%;
}
```
- Labels stay mist cream (`#F3EEE4`); only the underline shifts to brass.
- Soft edges live in the PNG alpha — prefer texture over a hard CSS `border-bottom`.

## Layout sketch
```html
<nav class="mist-menu" aria-label="Rooms">
  <a class="nav-label" href="#career">Career</a>
  <a class="nav-label" href="#coding">Coding</a>
  <a class="nav-label" href="#videography">Videography</a>
</nav>
```
```css
.mist-menu {
  position: absolute;
  left: 50%;
  top: 50.3%;
  transform: translate(-50%, -50%);
  display: flex;
  gap: 88px; /* @ 1280 ref — 3 longer words; was 56px for 5 short */
  z-index: 2;
  pointer-events: auto;
}
```
Video / loop sits full-bleed underneath (`object-fit: cover`). No menu sprite layer.

## Comp asset paths
| File | Role |
|------|------|
| `/workspace/brandon-site-art/finals/v3/menu/mist_idle_on_loop.png` | Idle on exact `loop_07s` — Career Coding Videography |
| `/workspace/brandon-site-art/finals/v3/menu/mist_hover_coding_on_loop.png` | **Canonical** hover — ~6px faded brass underline under **Coding** |
| `/workspace/brandon-site-art/finals/v3/menu/mist_hover_make_on_loop.png` | **Alias** (byte-identical to `mist_hover_coding_on_loop.png`) for DojoDev path continuity |
| `/workspace/brandon-site-art/finals/v3/menu/mist_contact.png` | Stacked idle \| hover contact; captions note 3-label lock |
| `/workspace/brandon-site-art/finals/v3/menu/mist_underline_brass.png` | RGBA brass grain strip for CSS `::after` |
| `/workspace/brandon-site-art/finals/v3/menu/mist_underline_brass_tile.png` | Optional seamless 1D tile |
| Concepts (ref only, do not overwrite) | `finals/v3/menu/concepts/` — historical **5-option** comps; leave as-is |

## Removed
- **Roots** and **Now** — gone from mist menu (no hrefs, no comps in production idle/hover).
- Old short labels Work / Make / Go — renamed to Career / Coding / Videography.

## Out of scope / do not touch
- `leather_panel` / `finals/v3/cards/` — keep selected-room reveal as-is.
- `concepts/` folder — reference only (historical 5-option comps).
- Do not regenerate blot art for this menu path.
- Do not regenerate brass underline textures unless broken — reuse existing.

## Soft concerns
- DejaVu is the **comp** face; swap to a licensed web serif with similar width before ship.
- Cream on bright mist patches needs the multi-pass shadow; if still thin on some loop frames, nudge shadow opacity slightly rather than adding chrome.
- Word-gap may need ±8px tuning once live over motion video vs the still (Videography is wide — prefer airy over cramped).
- Brass underline: keep opacity ≤0.92 and avoid heavy glow — reads as worn metal, not a shiny accent bar.
