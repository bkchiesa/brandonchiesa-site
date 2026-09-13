# Look v3 video

| File | Use |
| --- | --- |
| `intro.mp4` | Play once on first house load (~10s, 1168×784). Full-bleed, no UI chrome. |
| `loop.mp4` | Seamless looping background after intro (~15s, 1280×720). `object-fit: cover`. |
| `intro.jpg` `loop.jpg` | Posters for first paint, reduced motion, and autoplay-blocked fallback. |

Overwrite the files; keep the names. Paths are hooked in `src/lib/art.ts` as `VIDEO`.
