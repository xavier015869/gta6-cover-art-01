// Neon Panels — entry program for make.fun's gta6-cover-art-01 bounty (Node 22, standard library only).
// The app itself is the static site in app/ (open app/index.html in a desktop browser; it runs fully
// offline). This program hands the entry in: it copies app/ and screenshots/ from beside this file into
// the output directory and writes dossier.json there with buildDossier from the vendored make.fun
// library, byte for byte as the gate expects.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The caps below are the gate's own (see the kit's RULES.txt): at most 4 screenshots of 256 KiB each,
// at most 993 files and 48 MiB under app/, no path under app/ over 1,000 bytes, and the dossier's source
// text capped at 160 KiB. buildDossier refuses anything the scorer would refuse.
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossier);
console.log(`Neon Panels handed in: app/ and screenshots/ copied to ${out}, dossier.json written (${dossier.length} bytes).`);
