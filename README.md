# gta6-cover-art-01

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/xavier015869/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/xavier015869/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

**Neon Panels** is a GTA-style cover art maker: a static web app (in `app/`, no build step, works fully offline) that turns your own photos into a multi-panel poster with bold caption lettering and a sunset/neon colour grade, exported as a PNG.

- **Your photos, your machine.** Add photos with the file picker or by dragging them onto the poster. They are read locally with `FileReader` and drawn on a canvas — never uploaded anywhere.
- **Multi-panel layouts.** Four poster layouts (Mural, Quad, Triptych, Duo). Put a different photo in each panel, or one photo in every panel with a different crop per panel. Click a panel to select it, drag its photo to pan, scroll or use the slider to zoom.
- **Words and colour.** Edit the big gradient caption and the rotated sticker line, pick one of four colour grades (Sunset, Neon, Golden hour, Noir) and dial its strength.
- **Post sizes.** Export a PNG at 1080 × 1080, 1080 × 1350 or 1920 × 1080.
- **Original design.** No Rockstar logos, artwork or fonts; the lettering uses a bold condensed system font stack, and the two bundled sample photos (`app/samples/`) were made with an image model for this entry.

`main.ts` hands the entry in: it copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with `buildDossier` from the vendored `vendor/makefun-app.ts`. The screenshots show a landscape cover the app exported, the editor with photos loaded, a portrait cover, and the editor in the Quad layout.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
python3 -m http.server 8080 -d app
```

The first command hands the entry in (copies `app/` and `screenshots/`, writes `dossier.json`). The second serves the app locally — open http://localhost:8080 in a desktop browser to make your own cover.

---

<sub>Entered on [make.fun](https://make.fun/?ref=9d3wsaqp&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
