# Career Panel Interior — DojoDev wire specs (Look v3)

**Status:** Career room visual polish 2026-09-13 — leather panel interior, three sections.  
**House system:** Same as mist menu — cream serif, brass rules, soft hierarchy.  
**Prefer:** **HTML/CSS text** over baked labels. Sprites below are optional support only.  
**Do not:** bake production body copy into PNGs; name real employers; touch `leather_panel.png`, mist labels, or blot assets.

## Panel & content inset

| Token | Value | Notes |
|-------|-------|-------|
| Panel asset | `finals/v3/cards/leather_panel.png` | 1600×900 RGBA — darker cognac/espresso grain. **BG only** — do not edit. |
| Content inset | ~**7.5%** L/R, ~**7.8%** top/bottom | @1600×900 ≈ **120px** sides, **70px** top/bottom. Keep room copy inside this inset. |
| Layout | Three stacked sections | **Education** → **Work** → **Volunteering** (top to bottom). |
| Section gap | ~**28–36px** between section blocks | Airy; optional quieter brass divider between blocks. |

## Typography (same face family as mist)

Scale from panel CSS width (reference **1600** panel / or scale from mist’s 1280 vw tokens proportionally).

| Token | Header | Body |
|-------|--------|------|
| `font-family` | `"DejaVu Serif", "Liberation Serif", "PT Serif", Georgia, "Times New Roman", serif` | same |
| `font-size` | **~34px** @1600 panel (~2.1% of panel width) | **~18px** @1600 (~1.1%) |
| `font-weight` | `400` (regular; no bold needed) | `400` |
| `letter-spacing` | ~**0.02–0.025em** | ~**0.01em** |
| `color` | `#F3EEE4` cream | slightly dimmer cream/taupe **`#D2C8B9`** |
| `opacity` | **0.95** (`rgba(243,238,228,0.95)`) | **0.72–0.82** (`rgba(210,200,185,0.78)` starter) |
| Line height | ~1.2 | ~1.45 |

### Text-shadow (leather contrast — subtler than mist forest)

```css
/* headers */
.career-section__title {
  color: rgba(243, 238, 228, 0.95);
  text-shadow:
    0 2px 4px rgba(12, 8, 6, 0.45),
    0 1px 2px rgba(12, 8, 6, 0.55),
    1px 1px 1px rgba(12, 8, 6, 0.30);
}

/* body — keep quieter */
.career-section__body {
  color: rgba(210, 200, 185, 0.78);
  text-shadow: 0 1px 2px rgba(8, 6, 4, 0.40);
}
```

## Brass rules (section underlines / dividers)

Same faded worn-brass family as mist hover underline (`#B59A62` mid), **thinner / quieter** for interior hierarchy.

| Token | Hex | Notes |
|-------|-----|-------|
| `--mist-brass-mid` | `#B59A62` | Primary (shared with mist) |
| `--mist-brass-hi` | `#C9B07A` | Highlight flecks |
| `--mist-brass-lo` | `#8F7548` | Shadow grain |
| Fallback solid | `rgba(181, 154, 98, 0.55)` | Quieter than mist hover (0.78) |

| File | Size | Role |
|------|------|------|
| `finals/v3/cards/career/brass_rule.png` | **1200×6** RGBA | Soft-edged horizontal strip; fade at ends. Under headers or as section divider. |
| `finals/v3/cards/career/brass_rule_tile.png` | **64×6** RGBA | Optional 1D-seamless tile for `repeat-x`. |

**Usage:**
- **Under each section header:** ~4–6px visual weight; width ≈ content column (or ~60–80% of inset width). Opacity ~**0.75–0.90**.
- **Optional between sections:** same asset, thinner visual (scale height to 3–4px) or opacity ~**0.45–0.60** so it reads as soft divider, not a second underline.
- Soft edges live in PNG alpha — prefer texture over hard CSS `border-bottom`.

```css
.career-section__title {
  position: relative;
  padding-bottom: 0.45em;
  margin-bottom: 0.75em;
}
.career-section__title::after {
  content: "";
  position: absolute;
  left: 0;
  right: 20%; /* or fixed max-width */
  bottom: 0;
  height: 5px; /* @~1600 panel; scale with vw */
  max-width: 920px;
  background-color: rgba(181, 154, 98, 0.55); /* fallback */
  background-image: url("/art/cards/career/brass_rule.png");
  background-size: 100% 100%;
  background-repeat: no-repeat;
  background-position: left center;
  opacity: 0.85;
  pointer-events: none;
}

/* optional quieter divider between sections */
.career-section + .career-section {
  border: none;
  margin-top: 1.75rem;
}
.career-section + .career-section::before {
  content: "";
  display: block;
  height: 4px;
  margin: 0 auto 1.5rem;
  max-width: 1000px;
  background-image: url("/art/cards/career/brass_rule.png");
  background-size: 100% 100%;
  opacity: 0.5;
}
```

## Recommended wire (HTML/CSS first)

```html
<section class="career-room" aria-label="Career">
  <article class="career-section">
    <h2 class="career-section__title">Education</h2>
    <div class="career-section__body"><!-- real copy from CMS / markdown --></div>
  </article>
  <article class="career-section">
    <h2 class="career-section__title">Work</h2>
    <div class="career-section__body"><!-- generic / no-employer-safe copy --></div>
  </article>
  <article class="career-section">
    <h2 class="career-section__title">Volunteering</h2>
    <div class="career-section__body"></div>
  </article>
</section>
```

Leather panel remains the selected-room reveal surface (`background-image` / panel component). Room content sits in the inset above.

## Optional sprites (support only)

Prefer live text. If DojoDev wants img/`background-image` lockups:

| File | Size | Notes |
|------|------|-------|
| `section_header_education.png` | 280×64 RGBA | Cream “Education” + brass rule; **true alpha** |
| `section_header_work.png` | 280×64 RGBA | “Work” |
| `section_header_volunteering.png` | 280×71 RGBA | “Volunteering” (taller for descenders) |

Comp face: DejaVu Serif Regular. Swap to licensed web serif (PT Serif / Source Serif) in production — same as mist.

## Comp / glance mock

| File | Role |
|------|------|
| `career_panel_interior_mock.png` | 1600×900 — full leather panel with three sections, brass under headers, **faint placeholder body only** (not production copy). Generic no-employer disclaimer in footer. |

**Content policy:** keep Career room; generic no-employer disclaimer. Do **not** put First Citizens or other real employer names in comps or baked assets.

## Asset paths (box)

```
/workspace/brandon-site-art/finals/v3/cards/career/
  brass_rule.png
  brass_rule_tile.png
  section_header_education.png   # optional
  section_header_work.png        # optional
  section_header_volunteering.png # optional
  career_panel_interior_mock.png # glance / QA only
  CAREER_PANEL_SPECS.md
```

Panel BG (unchanged): `/workspace/brandon-site-art/finals/v3/cards/leather_panel.png`  
Mist brass (shared tokens; menu hover): `finals/v3/menu/mist_underline_brass.png` (+ tile)

## Out of scope

- Do not modify `leather_panel.png`, mist menu labels/comps, or blot assets.
- Do not bake resume body copy into production PNGs.
- Coding / Videography room interiors — separate pass if needed.
