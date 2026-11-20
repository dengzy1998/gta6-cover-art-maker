// main.js — wires the Vice Cover Studio page: photo slots, panel crop,
// caption fields, layout / size / grade presets, and the PNG export.
// Two poster families share one editor: the classic three-panel cover
// and the seven-panel Cast Poster, whose panels, role chips and poster
// furniture all scale with the layout's panel count. A `?shot=` query
// sets up a fixed scene for a screenshot instead (./shots.js).
import { drawCover, panelAt, panelPolygons, SIZES, CAST_ROLES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const titleInput = document.getElementById('titleInput');
const subtitleInput = document.getElementById('subtitleInput');
const taglineInput = document.getElementById('taglineInput');
const quoteInput = document.getElementById('quoteInput');
const placeInput = document.getElementById('placeInput');
const statusLine = document.getElementById('status');
const panelLabel = document.getElementById('panelLabel');
const zoomRange = document.getElementById('zoomRange');
const panXRange = document.getElementById('panXRange');
const panYRange = document.getElementById('panYRange');
const exportBtn = document.getElementById('exportBtn');
const slotsBox = document.getElementById('slots');
const panelPicksBox = document.getElementById('panelPicks');
const roleInputsBox = document.getElementById('roleInputs');
const roleFields = document.getElementById('roleFields');

const PANEL_NAMES = ['Hero panel', 'Panel two', 'Panel three'];
const SAMPLES = [
  { name: 'boss', label: 'Boss' },
  { name: 'siren', label: 'Siren' },
  { name: 'wheelman', label: 'Wheelman' },
  { name: 'vamp', label: 'Vamp' },
  { name: 'neon', label: 'Neon' },
  { name: 'boulevard', label: 'Boulevard' },
  { name: 'pier', label: 'Pier' },
];
const MAX_PANELS = 7;

// One crop per panel: which photo it shows, and how that photo is
// zoomed and slid inside it. A photo may fill several panels at once.
// Arrays are sized for the biggest layout (the 7-panel cast poster);
// classic layouts simply use the first three.
const state = {
  size: 'wide',
  layout: 'normal',
  grade: 'sunset',
  title: 'VICE NIGHTS',
  subtitle: 'One city. No rules.',
  tagline: 'EVERY SAINT HAS A PRICE',
  quote: '"A SUN-SOAKED KNOCKOUT." — THE PALM GAZETTE',
  place: 'VICE CITY',
  roles: [...CAST_ROLES],
  photos: Array(MAX_PANELS).fill(null),
  crops: Array.from({ length: MAX_PANELS }, (_, i) => ({ photo: i, zoom: 1, ox: 0, oy: 0 })),
};
let selectedPanel = 0;

function panelCount() {
  const size = SIZES[state.size];
  return panelPolygons(state.size, state.layout, size.w, size.h).length;
}

function panelName(i) {
  if (state.layout === 'cast') return `${state.roles[i] || `Panel ${i + 1}`} panel`;
  return PANEL_NAMES[i] || `Panel ${i + 1}`;
}

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
  panelLabel.textContent = `${panelName(selectedPanel)} — photo ${crop.photo + 1}`;
  zoomRange.value = String(crop.zoom);
  panXRange.value = String(crop.ox);
  panYRange.value = String(crop.oy);
  panelPicksBox.querySelectorAll('[data-panel-pick]').forEach((btn) => {
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
  const card = slotsBox.querySelector(`.slot[data-slot="${slot}"]`);
  if (!card) return;
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

// Build the seven photo slots. Each takes a file from the machine or
// any of the seven samples, and can fill every panel with its photo.
function buildSlots() {
  for (let slot = 0; slot < MAX_PANELS; slot++) {
    const card = document.createElement('div');
    card.className = 'slot';
    card.dataset.slot = String(slot);
    card.innerHTML = `
      <img class="thumb empty" alt="Photo slot ${slot + 1}">
      <div class="slot-body">
        <span class="slot-name">${slot === 0 ? 'Slot 1 — hero' : `Slot ${slot + 1}`}</span>
        <label class="file-btn">Choose a photo <input type="file" accept="image/*"></label>
        <select class="sample-select" aria-label="Load a sample into slot ${slot + 1}">
          <option value="">Load a sample…</option>
          ${SAMPLES.map((s) => `<option value="${s.name}">${s.label}</option>`).join('')}
        </select>
        <button type="button" class="fill-all">Fill all panels with this photo</button>
      </div>`;
    slotsBox.appendChild(card);
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
    card.querySelector('.sample-select').addEventListener('change', (e) => {
      if (e.target.value) loadSampleInto(slot, e.target.value);
      e.target.value = '';
    });
    card.querySelector('.fill-all').addEventListener('click', () => {
      for (const crop of state.crops) crop.photo = slot;
      statusLine.textContent = `All panels now show slot ${slot + 1}.`;
      redraw();
    });
  }
}

// Panel pick buttons follow the layout: three for the classic cover,
// seven for the cast poster.
function buildPanelPicks() {
  panelPicksBox.innerHTML = '';
  for (let i = 0; i < panelCount(); i++) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.panelPick = String(i);
    btn.textContent = i === 0 ? 'Hero' : `Panel ${i + 1}`;
    if (state.layout === 'cast') btn.title = state.roles[i] || '';
    btn.addEventListener('click', () => {
      selectedPanel = i;
      syncPanelControls();
    });
    panelPicksBox.appendChild(btn);
  }
  if (selectedPanel >= panelCount()) selectedPanel = 0;
  syncPanelControls();
}

// One editable input per cast role label.
function buildRoleInputs() {
  roleInputsBox.innerHTML = '';
  state.roles.forEach((role, i) => {
    const label = document.createElement('label');
    label.textContent = `Panel ${i + 1} role`;
    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = 22;
    input.value = role;
    input.addEventListener('input', () => {
      state.roles[i] = input.value;
      buildPanelPicks();
      redraw();
    });
    label.appendChild(input);
    roleInputsBox.appendChild(label);
  });
}

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
  statusLine.textContent = `${panelName(selectedPanel)} crop reset.`;
  redraw();
});

// Caption fields.
titleInput.addEventListener('input', () => { state.title = titleInput.value; redraw(); });
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; redraw(); });
taglineInput.addEventListener('input', () => { state.tagline = taglineInput.value; redraw(); });
quoteInput.addEventListener('input', () => { state.quote = quoteInput.value; redraw(); });
placeInput.addEventListener('input', () => { state.place = placeInput.value; redraw(); });

// Layout, size and grade presets.
function setLayout(layout) {
  state.layout = layout;
  document.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('active', b.dataset.layout === layout));
  roleFields.style.display = layout === 'cast' ? '' : 'none';
  buildPanelPicks();
  redraw();
}
document.querySelectorAll('[data-layout]').forEach((btn) => {
  btn.addEventListener('click', () => {
    setLayout(btn.dataset.layout);
    statusLine.textContent = btn.dataset.layout === 'cast'
      ? 'Cast poster: seven panels, role chips, billing block and all.'
      : `Layout: ${btn.textContent.trim()}.`;
  });
});
document.querySelectorAll('[data-size]').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.size = btn.dataset.size;
    document.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('active', b === btn));
    statusLine.textContent = `Size: ${SIZES[state.size].label}.`;
    buildPanelPicks();
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
  state.title = scene.title;
  state.subtitle = scene.subtitle;
  state.tagline = scene.tagline || state.tagline;
  state.quote = scene.quote || state.quote;
  state.place = scene.place;
  if (scene.roles && scene.roles.length) {
    state.roles = Array.from({ length: MAX_PANELS }, (_, i) => scene.roles[i] ?? CAST_ROLES[i]);
  }
  titleInput.value = scene.title;
  subtitleInput.value = scene.subtitle;
  taglineInput.value = state.tagline;
  quoteInput.value = state.quote;
  placeInput.value = scene.place;
  document.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('active', b.dataset.size === state.size));
  document.querySelectorAll('[data-grade]').forEach((b) => b.classList.toggle('active', b.dataset.grade === state.grade));
  buildRoleInputs();
  setLayout(scene.layout || 'normal');
  for (let i = 0; i < MAX_PANELS; i++) {
    const name = scene.photos[i];
    if (!name) continue;
    try {
      const img = await loadImage(`samples/${name}.jpg`);
      setSlot(i, img, `Sample: ${name}`);
    } catch { /* keep the slot empty */ }
  }
  redraw();
}

buildSlots();
buildRoleInputs();
setLayout('normal');

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, applyScene);
} else {
  // First paint already shows a full poster from the samples.
  Promise.all(SAMPLES.map((s, i) => loadSampleInto(i, s.name))).then(() => {
    statusLine.textContent = 'Samples loaded. Pick the Cast Poster layout for the full seven-panel one-sheet.';
    redraw();
  });
  redraw();
}
