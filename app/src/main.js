// Neon Panels editor: wires the controls to the poster engine (src/poster.js). Photos are read from the
// person's own machine with FileReader and drawn on the canvas — nothing is uploaded anywhere. A `?shot=`
// query builds a fixed scene for a screenshot instead (src/shots.js).
import { SIZES, LAYOUTS, GRADES, makePanels, fillPanels, panelAt, panelRect, drawPoster } from './poster.js';
import { runShot } from './shots.js';

const PREVIEW_W = 864;
const FOCALS = [[0, -0.1], [-0.55, -0.35], [0.55, -0.3], [0.1, 0.45], [-0.45, 0.4], [0.45, 0.35]];

const state = {
  size: '1080x1350',
  layout: 'mural',
  grade: 'sunset',
  gradeAmount: 0.85,
  title: 'Neon Shores',
  subtitle: 'One Last Ride',
  panels: makePanels('mural'),
  selected: 0,
};
const photos = []; // { img, name }
let currentPhoto = -1;

const $ = (id) => document.getElementById(id);
const preview = $('preview');
const tray = $('tray');
const status = $('status');

function previewHeight() {
  const [w, h] = SIZES[state.size];
  return Math.round(PREVIEW_W * h / w);
}

function redraw() {
  preview.width = PREVIEW_W;
  preview.height = previewHeight();
  drawPoster(preview.getContext('2d'), preview.width, preview.height, state, { overlay: true, selected: state.selected });
  $('panelLabel').textContent = `Panel ${state.selected + 1} of ${state.panels.length}`;
  const panel = state.panels[state.selected];
  $('zoomRange').value = panel.zoom;
  $('zoomVal').textContent = `${panel.zoom.toFixed(2)}×`;
}

function loadImageFromUrl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function addPhoto(img, name) {
  photos.push({ img, name });
  currentPhoto = photos.length - 1;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.title = `${name} — click to place it in the selected panel`;
  const thumb = document.createElement('img');
  thumb.src = img.src;
  thumb.alt = name;
  btn.appendChild(thumb);
  btn.addEventListener('click', () => {
    currentPhoto = photos.indexOf(photos.find((p) => p.img === img));
    state.panels[state.selected].photo = img;
    markCurrentThumb();
    redraw();
  });
  tray.appendChild(btn);
  markCurrentThumb();
  return currentPhoto;
}

function markCurrentThumb() {
  [...tray.children].forEach((el, i) => el.classList.toggle('current', i === currentPhoto));
}

function anyPanelFilled() {
  return state.panels.some((p) => p.photo);
}

/** Reads image files from the person's machine (file picker or drag and drop) and places them. */
function readFiles(fileList) {
  const files = [...fileList].filter((f) => f.type.startsWith('image/'));
  if (!files.length) return;
  let first = true;
  for (const file of files) {
    const reader = new FileReader();
    reader.onload = async () => {
      const img = await loadImageFromUrl(reader.result);
      addPhoto(img, file.name);
      if (first && !anyPanelFilled()) fillPanels(state.panels, img);
      else if (first) state.panels[state.selected].photo = img;
      first = false;
      status.textContent = `${photos.length} photo${photos.length === 1 ? '' : 's'} loaded — nothing leaves this machine.`;
      redraw();
    };
    reader.readAsDataURL(file);
  }
}

async function loadSamples() {
  const beach = await loadImageFromUrl('samples/neon-beach.jpg');
  const strip = await loadImageFromUrl('samples/palm-strip.jpg');
  addPhoto(beach, 'Sample — neon beach');
  addPhoto(strip, 'Sample — palm strip');
  mixFill(beach, strip);
  status.textContent = 'Samples loaded. Add your own photos to make it yours.';
  redraw();
}

/** Hero panel gets `hero`, the remaining panels alternate `a` and `b`, each with its own crop. */
function mixFill(hero, other) {
  state.panels.forEach((panel, i) => {
    const [fx, fy] = FOCALS[i % FOCALS.length];
    panel.photo = i === 0 ? hero : (i % 2 ? other : hero);
    panel.zoom = 1.18;
    panel.ox = fx;
    panel.oy = fy;
  });
}

function setLayout(key) {
  const old = state.panels;
  const next = makePanels(key);
  const shared = old.every((p) => !p.photo || p.photo === old[0].photo) && old[0].photo ? old[0].photo : null;
  next.forEach((panel, i) => { if (old[i]) Object.assign(panel, old[i]); });
  if (shared) next.forEach((panel) => { if (!panel.photo) { panel.photo = shared; panel.zoom = 1.18; } });
  state.layout = key;
  state.panels = next;
  state.selected = Math.min(state.selected, next.length - 1);
  $('layoutSel').value = key;
}

function exportPng() {
  const [w, h] = SIZES[state.size];
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  drawPoster(canvas.getContext('2d'), w, h, state, {});
  canvas.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-panels-${state.size}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    status.textContent = `Saved neon-panels-${state.size}.png (${w} × ${h}).`;
  }, 'image/png');
}

// --- Control wiring -------------------------------------------------------
$('photoInput').addEventListener('change', (e) => { readFiles(e.target.files); e.target.value = ''; });
$('sampleBtn').addEventListener('click', loadSamples);
$('fillAllBtn').addEventListener('click', () => {
  if (currentPhoto < 0) { status.textContent = 'Add a photo first, then fill every panel with it.'; return; }
  fillPanels(state.panels, photos[currentPhoto].img);
  redraw();
});
$('layoutSel').addEventListener('change', (e) => { setLayout(e.target.value); redraw(); });
$('sizeSel').addEventListener('change', (e) => { state.size = e.target.value; redraw(); });
$('gradeSel').addEventListener('change', (e) => { state.grade = e.target.value; redraw(); });
$('gradeRange').addEventListener('input', (e) => {
  state.gradeAmount = Number(e.target.value) / 100;
  $('gradeVal').textContent = `${e.target.value}%`;
  redraw();
});
$('titleInput').addEventListener('input', (e) => { state.title = e.target.value; redraw(); });
$('subInput').addEventListener('input', (e) => { state.subtitle = e.target.value; redraw(); });
$('zoomRange').addEventListener('input', (e) => {
  state.panels[state.selected].zoom = Number(e.target.value);
  $('zoomVal').textContent = `${Number(e.target.value).toFixed(2)}×`;
  redraw();
});
$('resetCropBtn').addEventListener('click', () => {
  Object.assign(state.panels[state.selected], { zoom: 1, ox: 0, oy: 0 });
  redraw();
});
$('exportBtn').addEventListener('click', exportPng);

// --- Poster pointer work: click selects a panel, drag pans its photo, wheel zooms it. ---
let drag = null;
function canvasPoint(e) {
  const r = preview.getBoundingClientRect();
  return [(e.clientX - r.left) * preview.width / r.width, (e.clientY - r.top) * preview.height / r.height];
}
preview.addEventListener('pointerdown', (e) => {
  const [x, y] = canvasPoint(e);
  const idx = panelAt(preview.width, preview.height, state.layout, x, y);
  if (idx < 0) return;
  state.selected = idx;
  const panel = state.panels[idx];
  drag = { idx, startX: x, startY: y, ox: panel.ox, oy: panel.oy };
  preview.setPointerCapture(e.pointerId);
  redraw();
});
preview.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const [x, y] = canvasPoint(e);
  const panel = state.panels[drag.idx];
  if (!panel.photo) return;
  const gutter = Math.max(6, preview.width * 0.007);
  const rect = panelRect(preview.width, preview.height, state.layout, drag.idx, gutter);
  const base = Math.max(rect.w / panel.photo.naturalWidth, rect.h / panel.photo.naturalHeight) * panel.zoom;
  const excessX = panel.photo.naturalWidth * base - rect.w;
  const excessY = panel.photo.naturalHeight * base - rect.h;
  if (excessX > 0) panel.ox = Math.max(-1, Math.min(1, drag.ox + (x - drag.startX) / (excessX / 2)));
  if (excessY > 0) panel.oy = Math.max(-1, Math.min(1, drag.oy + (y - drag.startY) / (excessY / 2)));
  redraw();
});
preview.addEventListener('pointerup', () => { drag = null; });
preview.addEventListener('wheel', (e) => {
  const [x, y] = canvasPoint(e);
  const idx = panelAt(preview.width, preview.height, state.layout, x, y);
  if (idx < 0) return;
  e.preventDefault();
  state.selected = idx;
  const panel = state.panels[idx];
  panel.zoom = Math.max(1, Math.min(3.5, panel.zoom * (e.deltaY < 0 ? 1.09 : 0.92)));
  redraw();
}, { passive: false });

// --- Drag and drop of photo files onto the page ---------------------------
const dropHint = $('dropHint');
window.addEventListener('dragover', (e) => { e.preventDefault(); dropHint.hidden = false; });
window.addEventListener('dragleave', (e) => { if (!e.relatedTarget) dropHint.hidden = true; });
window.addEventListener('drop', (e) => {
  e.preventDefault();
  dropHint.hidden = true;
  if (e.dataTransfer) readFiles(e.dataTransfer.files);
});

// --- Screenshot scenes ------------------------------------------------------
const shotApi = {
  setScene({ layout, grade, title, subtitle }) {
    setLayout(layout);
    state.grade = grade;
    state.title = title;
    state.subtitle = subtitle;
    $('layoutSel').value = layout;
    $('gradeSel').value = grade;
    $('titleInput').value = title;
    $('subInput').value = subtitle;
  },
  loadSample: async (path) => {
    const img = await loadImageFromUrl(path);
    addPhoto(img, `Sample — ${path.split('/').pop().replace('.jpg', '').replace('-', ' ')}`);
    return img;
  },
  fillWith: (img) => fillPanels(state.panels, img),
  mixFill,
  selectPanel: (i) => { state.selected = i; },
  renderEditor: redraw,
  showCover(w, h) {
    document.body.classList.add('shot-cover');
    const cover = $('coverCanvas');
    cover.hidden = false;
    cover.width = w;
    cover.height = h;
    drawPoster(cover.getContext('2d'), w, h, state, {});
  },
};

const params = new URLSearchParams(location.search);
if (params.get('shot')) runShot(params, shotApi);
else redraw();
