// Neon Panels poster engine: panel layouts, the colour grades and the full canvas rendering of a cover.
// Pure drawing code with no DOM wiring, so the editor (src/main.js) and the screenshot scenes (src/shots.js)
// render exactly the same poster the export writes.

export const SIZES = {
  '1080x1080': [1080, 1080],
  '1080x1350': [1080, 1350],
  '1920x1080': [1920, 1080],
};

// Panel rectangles as fractions of the poster [x, y, width, height]. The mural is the classic multi-panel
// poster: one hero panel, a stacked pair beside it and a three-panel strip along the foot.
export const LAYOUTS = {
  mural: {
    label: 'Mural — hero + five panels',
    rects: [
      [0, 0, 0.62, 0.56],
      [0.62, 0, 0.38, 0.28],
      [0.62, 0.28, 0.38, 0.28],
      [0, 0.56, 0.34, 0.44],
      [0.34, 0.56, 0.33, 0.44],
      [0.67, 0.56, 0.33, 0.44],
    ],
  },
  quad: {
    label: 'Quad — four equal panels',
    rects: [
      [0, 0, 0.5, 0.5],
      [0.5, 0, 0.5, 0.5],
      [0, 0.5, 0.5, 0.5],
      [0.5, 0.5, 0.5, 0.5],
    ],
  },
  triptych: {
    label: 'Triptych — three columns',
    rects: [
      [0, 0, 0.34, 1],
      [0.34, 0, 0.33, 1],
      [0.67, 0, 0.33, 1],
    ],
  },
  duo: {
    label: 'Duo — tall hero + two panels',
    rects: [
      [0, 0, 0.55, 1],
      [0.55, 0, 0.45, 0.5],
      [0.55, 0.5, 0.45, 0.5],
    ],
  },
};

// Colour grades: a filter applied while the photo is drawn, then two gradient passes (an overlay pass for
// the hue shift and a soft source-over tint) clipped inside each panel.
export const GRADES = {
  sunset: {
    label: 'Sunset — orange into magenta',
    filter: (a) => `saturate(${1 + 0.38 * a}) contrast(${1 + 0.12 * a}) brightness(${1 + 0.03 * a})`,
    stops: [[0, 'rgba(58,16,104,0.55)'], [0.52, 'rgba(255,94,58,0.28)'], [1, 'rgba(255,150,44,0.42)']],
    tint: 'rgba(255,64,120,0.16)',
    titleStops: ['#ffffff', '#ffd76a', '#ff5e8a'],
  },
  neon: {
    label: 'Neon — cyan and hot pink',
    filter: (a) => `saturate(${1 + 0.55 * a}) contrast(${1 + 0.16 * a})`,
    stops: [[0, 'rgba(6,8,64,0.5)'], [0.55, 'rgba(196,28,164,0.3)'], [1, 'rgba(0,214,255,0.34)']],
    tint: 'rgba(64,0,180,0.15)',
    titleStops: ['#ffffff', '#7df9ff', '#ff3ea5'],
  },
  gold: {
    label: 'Golden hour — amber wash',
    filter: (a) => `saturate(${1 + 0.3 * a}) contrast(${1 + 0.08 * a}) brightness(${1 + 0.06 * a}) sepia(${0.25 * a})`,
    stops: [[0, 'rgba(64,32,0,0.4)'], [0.6, 'rgba(255,138,0,0.24)'], [1, 'rgba(255,214,110,0.4)']],
    tint: 'rgba(255,160,32,0.14)',
    titleStops: ['#fffbe8', '#ffe259', '#ff7518'],
  },
  noir: {
    label: 'Noir — drained and moody',
    filter: (a) => `saturate(${1 - 0.78 * a}) contrast(${1 + 0.28 * a}) brightness(${1 - 0.06 * a})`,
    stops: [[0, 'rgba(8,10,28,0.5)'], [1, 'rgba(30,40,80,0.42)']],
    tint: 'rgba(20,30,70,0.18)',
    titleStops: ['#ffffff', '#cfd8ff', '#7d8fc9'],
  },
};

const TITLE_STACK = '"Arial Narrow Bold", "Liberation Sans Narrow", "DejaVu Sans Condensed", Impact, sans-serif';
const BODY_STACK = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';

// Focal points cycled when one photo fills every panel, so each panel crops a different part of it.
const FOCALS = [[0, -0.1], [-0.55, -0.35], [0.55, -0.3], [0.1, 0.45], [-0.45, 0.4], [0.45, 0.35], [0, 0], [-0.2, -0.5]];

/** A fresh set of panel states for a layout: no photo, unit zoom, centred. */
export function makePanels(layoutKey) {
  return LAYOUTS[layoutKey].rects.map(() => ({ photo: null, zoom: 1, ox: 0, oy: 0 }));
}

/** Puts one photo in every panel, each panel cropped to a different focal point of it. */
export function fillPanels(panels, img) {
  panels.forEach((panel, i) => {
    const [fx, fy] = FOCALS[i % FOCALS.length];
    panel.photo = img;
    panel.zoom = 1.18;
    panel.ox = fx;
    panel.oy = fy;
  });
}

/** The pixel rectangle of panel `index` on a W x H poster, inset by the keyline gutter. */
export function panelRect(W, H, layoutKey, index, gutter) {
  const [fx, fy, fw, fh] = LAYOUTS[layoutKey].rects[index];
  return { x: fx * W + gutter / 2, y: fy * H + gutter / 2, w: fw * W - gutter, h: fh * H - gutter };
}

/** Index of the panel under poster pixel (x, y), or -1. */
export function panelAt(W, H, layoutKey, x, y) {
  const gutter = Math.max(6, W * 0.007);
  for (let i = 0; i < LAYOUTS[layoutKey].rects.length; i++) {
    const r = panelRect(W, H, layoutKey, i, gutter);
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
  }
  return -1;
}

function drawPanelPhoto(ctx, rect, panel, grade, amount) {
  const img = panel.photo;
  const base = Math.max(rect.w / img.naturalWidth, rect.h / img.naturalHeight);
  const scale = base * panel.zoom;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = rect.x + (rect.w - dw) / 2 + panel.ox * (dw - rect.w) / 2;
  const dy = rect.y + (rect.h - dh) / 2 + panel.oy * (dh - rect.h) / 2;
  ctx.filter = grade.filter(amount);
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.filter = 'none';
  const grad = ctx.createLinearGradient(0, rect.y, 0, rect.y + rect.h);
  for (const [at, colour] of grade.stops) grad.addColorStop(at, colour);
  ctx.globalCompositeOperation = 'overlay';
  ctx.globalAlpha = 0.35 + 0.65 * amount;
  ctx.fillStyle = grad;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = amount;
  ctx.fillStyle = grade.tint;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.globalAlpha = 1;
}

function drawPlaceholder(ctx, rect, index) {
  const grad = ctx.createLinearGradient(rect.x, rect.y, rect.x + rect.w, rect.y + rect.h);
  grad.addColorStop(0, '#241243');
  grad.addColorStop(1, '#0d3a4a');
  ctx.fillStyle = grad;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const plus = Math.min(rect.w, rect.h) * 0.22;
  ctx.font = `300 ${plus}px ${BODY_STACK}`;
  ctx.fillText('+', rect.x + rect.w / 2, rect.y + rect.h / 2 - plus * 0.28);
  ctx.font = `600 ${Math.max(11, Math.min(rect.w, rect.h) * 0.075)}px ${BODY_STACK}`;
  ctx.fillText(`PANEL ${index + 1} — ADD A PHOTO`, rect.x + rect.w / 2, rect.y + rect.h / 2 + plus * 0.42);
  ctx.textBaseline = 'alphabetic';
}

function fitFontSize(ctx, text, maxWidth, startSize, stack) {
  let size = startSize;
  ctx.font = `${size}px ${stack}`;
  while (ctx.measureText(text).width > maxWidth && size > 14) {
    size -= 2;
    ctx.font = `${size}px ${stack}`;
  }
  return size;
}

function drawTitle(ctx, W, H, state, grade) {
  const title = (state.title || '').trim().toUpperCase();
  const scrim = ctx.createLinearGradient(0, 0, 0, H * 0.34);
  scrim.addColorStop(0, 'rgba(6,2,16,0.62)');
  scrim.addColorStop(1, 'rgba(6,2,16,0)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, W, H * 0.34);
  if (!title) return;
  const maxWidth = W * 0.93;
  let lines = [title];
  let size = fitFontSize(ctx, title, maxWidth, H * 0.115, TITLE_STACK);
  if (ctx.measureText(title).width > maxWidth && title.includes(' ')) {
    const words = title.split(' ');
    const mid = Math.ceil(words.length / 2);
    lines = [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
    size = Math.min(...lines.map((line) => fitFontSize(ctx, line, maxWidth, H * 0.1, TITLE_STACK)));
  }
  ctx.font = `${size}px ${TITLE_STACK}`;
  try { ctx.letterSpacing = `${Math.round(size * 0.015)}px`; } catch { /* older engines ignore it */ }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const lineHeight = size * 1.04;
  const top = H * 0.035 + size;
  lines.forEach((line, i) => {
    const y = top + i * lineHeight;
    const fill = ctx.createLinearGradient(0, y - size, 0, y);
    fill.addColorStop(0, grade.titleStops[0]);
    fill.addColorStop(0.55, grade.titleStops[1]);
    fill.addColorStop(1, grade.titleStops[2]);
    ctx.lineWidth = size * 0.16;
    ctx.strokeStyle = '#150722';
    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(0,0,0,0.55)';
    ctx.shadowBlur = size * 0.12;
    ctx.shadowOffsetY = size * 0.05;
    ctx.strokeText(line, W / 2, y);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = fill;
    ctx.fillText(line, W / 2, y);
  });
  try { ctx.letterSpacing = '0px'; } catch { /* as above */ }
}

function drawSticker(ctx, W, H, state) {
  const text = (state.subtitle || '').trim().toUpperCase();
  if (!text) return;
  const size = Math.max(15, H * 0.026);
  ctx.font = `700 ${size}px ${TITLE_STACK}`;
  const tw = ctx.measureText(text).width;
  const padX = size * 0.9;
  const boxW = tw + padX * 2;
  const boxH = size * 1.9;
  ctx.save();
  ctx.translate(W * 0.045 + boxW / 2, H * 0.955 - boxH / 2);
  ctx.rotate(-0.055);
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = size * 0.5;
  ctx.shadowOffsetY = size * 0.18;
  ctx.fillStyle = '#ff2e88';
  ctx.strokeStyle = '#150722';
  ctx.lineWidth = size * 0.14;
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(-boxW / 2, -boxH / 2, boxW, boxH, size * 0.32);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillRect(-boxW / 2, -boxH / 2, boxW, boxH);
    ctx.strokeRect(-boxW / 2, -boxH / 2, boxW, boxH);
  }
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, size * 0.06);
  ctx.restore();
  ctx.textBaseline = 'alphabetic';
}

/**
 * Renders the whole poster onto ctx at W x H. state: {layout, grade, gradeAmount, title, subtitle, panels}.
 * opts.overlay draws the editor's selection marks (never part of an export); opts.selected is that panel.
 */
export function drawPoster(ctx, W, H, state, opts = {}) {
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  const amount = state.gradeAmount ?? 0.85;
  const gutter = Math.max(6, W * 0.007);
  ctx.fillStyle = '#0b0714';
  ctx.fillRect(0, 0, W, H);
  state.panels.forEach((panel, i) => {
    const rect = panelRect(W, H, state.layout, i, gutter);
    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    if (panel.photo) drawPanelPhoto(ctx, rect, panel, grade, amount);
    else drawPlaceholder(ctx, rect, i);
    ctx.restore();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2);
  });
  const shade = ctx.createLinearGradient(0, H * 0.72, 0, H);
  shade.addColorStop(0, 'rgba(4,0,10,0)');
  shade.addColorStop(1, 'rgba(4,0,10,0.34)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, W, H);
  const vig = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.78);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(0,0,0,0.3)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);
  drawTitle(ctx, W, H, state, grade);
  drawSticker(ctx, W, H, state);
  if (opts.overlay && opts.selected >= 0) {
    const rect = panelRect(W, H, state.layout, opts.selected, gutter);
    ctx.save();
    ctx.strokeStyle = '#ffe259';
    ctx.lineWidth = Math.max(3, W * 0.004);
    ctx.setLineDash([W * 0.014, W * 0.009]);
    ctx.strokeRect(rect.x - 2, rect.y - 2, rect.w + 4, rect.h + 4);
    ctx.setLineDash([]);
    state.panels.forEach((_, i) => {
      const r = panelRect(W, H, state.layout, i, gutter);
      const chip = Math.max(20, W * 0.026);
      ctx.fillStyle = i === opts.selected ? '#ffe259' : 'rgba(10,6,20,0.72)';
      ctx.beginPath();
      ctx.arc(r.x + chip * 0.85, r.y + chip * 0.85, chip * 0.62, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = i === opts.selected ? '#150722' : '#ffffff';
      ctx.font = `700 ${chip * 0.8}px ${BODY_STACK}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i + 1), r.x + chip * 0.85, r.y + chip * 0.9);
    });
    ctx.restore();
    ctx.textBaseline = 'alphabetic';
  }
}
