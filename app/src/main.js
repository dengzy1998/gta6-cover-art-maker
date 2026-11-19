// main.js — wires the Vice Cover Studio page: photo slots, panel crop,
// caption fields, size and grade presets, and the PNG export. A `?shot=`
// query sets up a fixed scene for a screenshot instead (./shots.js).
import { drawCover, panelAt, panelPolygons, SIZES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const titleInput = document.getElementById('titleInput');
const subtitleInput = document.getElementById('subtitleInput');
const placeInput = document.getElementById('placeInput');
const statusLine = document.getElementById('status');
const panelLabel = document.getElementById('panelLabel');
const zoomRange = document.getElementById('zoomRange');
const panXRange = document.getElementById('panXRange');
const panYRange = document.getElementById('panYRange');
const exportBtn = document.getElementById('exportBtn');

const PANEL_NAMES = ['Hero panel', 'Panel two', 'Panel three'];
const SAMPLE_NAMES = ['neon', 'boulevard', 'pier'];

// One crop per panel: which photo it shows, and how that photo is
// zoomed and slid inside it. A photo may fill several panels at once.
const state = {
  size: 'wide',
  layout: 'normal',
  grade: 'sunset',
  title: 'VICE NIGHTS',
  subtitle: 'One city. No rules.',
  place: 'VICE CITY',
  photos: [null, null, null],
  crops: [
    { photo: 0, zoom: 1, ox: 0, oy: 0 },
    { photo: 1, zoom: 1, ox: 0, oy: 0 },
    { photo: 2, zoom: 1, ox: 0, oy: 0 },
  ],
};
let selectedPanel = 0;

function redraw() {
  const size = SIZES[state.size];
  if (canvas.width !== size.w || canvas.height !== size.h) {
    canvas.width = size.w;
    canvas.height = size.h;
  }
  drawCover(canvas, state);
  syncPanelControls();
}

function syncPanelControls() {
  const crop = state.crops[selectedPanel];
  panelLabel.textContent = `${PANEL_NAMES[selectedPanel]} — photo ${crop.photo + 1}`;
  zoomRange.value = String(crop.zoom);
  panXRange.value = String(crop.ox);
  panYRange.value = String(crop.oy);
  document.querySelectorAll('[data-panel-pick]').forEach((btn) => {
    btn.classList.toggle('active', Number(btn.dataset.panelPick) === selectedPanel);
  });
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${url}`));
    img.src = url;
  });
}

function setSlot(slot, img, label) {
  state.photos[slot] = img;
  const card = document.querySelector(`.slot[data-slot="${slot}"]`);
  const thumb = card.querySelector('.thumb');
  thumb.src = img ? img.src : '';
  thumb.classList.toggle('empty', !img);
  card.querySelector('.slot-name').textContent = label || (img ? `Photo ${slot + 1}` : 'Empty slot');
  redraw();
}

async function loadSampleInto(slot, name) {
  try {
    const img = await loadImage(`samples/${name}.jpg`);
    setSlot(slot, img, `Sample: ${name}`);
    statusLine.textContent = `Loaded sample ${name} into slot ${slot + 1}.`;
  } catch {
    statusLine.textContent = `Sample ${name} did not load.`;
  }
}

// Photo slots: file pick, sample buttons, and "fill all panels".
document.querySelectorAll('.slot').forEach((card) => {
  const slot = Number(card.dataset.slot);
  card.querySelector('input[type=file]').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const img = await loadImage(URL.createObjectURL(file));
      setSlot(slot, img, file.name);
      statusLine.textContent = `Loaded ${file.name} into slot ${slot + 1}.`;
    } catch {
      statusLine.textContent = 'That file did not open as an image.';
    }
    e.target.value = '';
  });
  card.querySelectorAll('[data-sample]').forEach((btn) => {
    btn.addEventListener('click', () => loadSampleInto(slot, btn.dataset.sample));
  });
  card.querySelector('.fill-all').addEventListener('click', () => {
    for (const crop of state.crops) crop.photo = slot;
    statusLine.textContent = `All three panels now show slot ${slot + 1}.`;
    redraw();
  });
});

// Panel picking: the three buttons, or click a panel on the canvas.
document.querySelectorAll('[data-panel-pick]').forEach((btn) => {
  btn.addEventListener('click', () => {
    selectedPanel = Number(btn.dataset.panelPick);
    syncPanelControls();
  });
});

// Drag a panel's photo to slide it; the wheel zooms it.
let drag = null;
function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * canvas.width,
    y: ((e.clientY - rect.top) / rect.height) * canvas.height,
  };
}
canvas.addEventListener('pointerdown', (e) => {
  const p = canvasPoint(e);
  const hit = panelAt(p.x, p.y, state.size, state.layout, canvas.width, canvas.height);
  if (hit < 0) return;
  selectedPanel = hit;
  const crop = state.crops[hit];
  drag = { panel: hit, x: p.x, y: p.y, ox: crop.ox, oy: crop.oy, moved: false };
  canvas.setPointerCapture(e.pointerId);
  syncPanelControls();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const p = canvasPoint(e);
  const polys = panelPolygons(state.size, state.layout, canvas.width, canvas.height);
  const poly = polys[drag.panel];
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const [x, y] of poly) {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  const crop = state.crops[drag.panel];
  crop.ox = Math.max(-0.6, Math.min(0.6, drag.ox + (p.x - drag.x) / (x1 - x0)));
  crop.oy = Math.max(-0.6, Math.min(0.6, drag.oy + (p.y - drag.y) / (y1 - y0)));
  if (Math.abs(p.x - drag.x) + Math.abs(p.y - drag.y) > 4) drag.moved = true;
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const crop = state.crops[selectedPanel];
  crop.zoom = Math.max(1, Math.min(3, crop.zoom * Math.exp(-e.deltaY * 0.0012)));
  redraw();
}, { passive: false });

// Crop sliders for the selected panel.
zoomRange.addEventListener('input', () => {
  state.crops[selectedPanel].zoom = Number(zoomRange.value);
  redraw();
});
panXRange.addEventListener('input', () => {
  state.crops[selectedPanel].ox = Number(panXRange.value);
  redraw();
});
panYRange.addEventListener('input', () => {
  state.crops[selectedPanel].oy = Number(panYRange.value);
  redraw();
});
document.getElementById('resetCrop').addEventListener('click', () => {
  state.crops[selectedPanel] = { photo: state.crops[selectedPanel].photo, zoom: 1, ox: 0, oy: 0 };
  statusLine.textContent = `${PANEL_NAMES[selectedPanel]} crop reset.`;
  redraw();
});

// Caption fields.
titleInput.addEventListener('input', () => { state.title = titleInput.value; redraw(); });
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; redraw(); });
placeInput.addEventListener('input', () => { state.place = placeInput.value; redraw(); });

// Size, grade and layout presets.
document.querySelectorAll('[data-size]').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.size = btn.dataset.size;
    document.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('active', b === btn));
    statusLine.textContent = `Size: ${SIZES[state.size].label}.`;
    redraw();
  });
});
document.querySelectorAll('[data-grade]').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.grade = btn.dataset.grade;
    document.querySelectorAll('[data-grade]').forEach((b) => b.classList.toggle('active', b === btn));
    statusLine.textContent = `Grade: ${btn.textContent.trim()}.`;
    redraw();
  });
});
document.getElementById('flipLayout').addEventListener('click', () => {
  state.layout = state.layout === 'normal' ? 'flip' : 'normal';
  statusLine.textContent = state.layout === 'flip' ? 'Hero flipped to the other side.' : 'Hero back on its usual side.';
  redraw();
});

// Export: the preview canvas already paints at export resolution, so the
// PNG it writes is the poster at full size.
exportBtn.addEventListener('click', () => {
  const size = SIZES[state.size];
  canvas.toBlob((blob) => {
    if (!blob) {
      statusLine.textContent = 'Export failed in this browser.';
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${size.w}x${size.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    statusLine.textContent = `Saved vice-cover-${size.w}x${size.h}.png (${size.w} x ${size.h}).`;
  }, 'image/png');
});

// Headless hook used by the screenshot and test harness: returns the
// exported PNG as a data URL at the current size.
window.__exportPNG = () => new Promise((resolve) => {
  canvas.toBlob((blob) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  }, 'image/png');
});

// Apply a fixed scene (from ?shot=) and paint it.
async function applyScene(scene) {
  state.size = SIZES[scene.size] ? scene.size : 'wide';
  state.grade = scene.grade || 'sunset';
  state.layout = scene.layout || 'normal';
  state.title = scene.title;
  state.subtitle = scene.subtitle;
  state.place = scene.place;
  titleInput.value = scene.title;
  subtitleInput.value = scene.subtitle;
  placeInput.value = scene.place;
  document.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('active', b.dataset.size === state.size));
  document.querySelectorAll('[data-grade]').forEach((b) => b.classList.toggle('active', b.dataset.grade === state.grade));
  for (let i = 0; i < 3; i++) {
    const name = scene.photos[i];
    if (!name) continue;
    try {
      const img = await loadImage(`samples/${name}.jpg`);
      setSlot(i, img, `Sample: ${name}`);
    } catch { /* keep the slot empty */ }
  }
  redraw();
}

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, applyScene);
} else {
  // First paint already shows a full poster from the three samples.
  Promise.all(SAMPLE_NAMES.map((name, i) => loadSampleInto(i, name))).then(() => {
    redraw();
  });
  redraw();
}
