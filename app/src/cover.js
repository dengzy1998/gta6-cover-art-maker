// cover.js — paints the Vice Cover poster.
//
// One canvas, three photo panels cut on the diagonal, a sunset or neon
// grade, palm and halftone dressing, and huge outlined caption lettering.
// Everything is drawn with the 2D canvas API and system fonts only: no
// borrowed artwork, no logo, no font file. Photos stay on the machine;
// this module only ever draws images the caller hands it.

export const SIZES = {
  square: { w: 1080, h: 1080, label: 'Square 1080 x 1080' },
  portrait: { w: 1080, h: 1350, label: 'Portrait 1080 x 1350' },
  wide: { w: 1920, h: 1080, label: 'Wide 1920 x 1080' },
};

export const GRADES = ['sunset', 'neon', 'noir'];

// The cast poster's seven role labels, hero first. The editor shows one
// editable input per label; the painter stamps each on its panel as a
// dark chip with a pink slash.
export const CAST_ROLES = [
  'THE BOSS', 'THE SIREN', 'THE WHEELMAN', 'THE VAMP',
  'THE DRIVER', 'THE FIXER', 'THE LOOKOUT',
];

export const CAST_CREDITS = [
  'PALM PICTURES PRESENTS A VICE COVER STUDIO PRODUCTION',
  'CASTING BY NEON ROW · MUSIC BY THE LOW TIDES · PRINTED IN VICE CITY',
];

// A panel is a polygon: an array of [x, y] corners in canvas pixels.
// panelPolygons returns three of them — hero first, then the two small
// ones — for a size and a layout. "flip" mirrors the hero to the other
// side, so the poster can be re-composed with one click.
export function panelPolygons(sizeKey, layout, w, h) {
  const m = Math.max(10, Math.round(Math.min(w, h) * 0.013));
  const s = Math.max(8, Math.round(Math.min(w, h) * 0.012));
  const L = m, R = w - m, T = m, B = h - m;
  if (layout === 'cast') return castPanelPolygons(sizeKey, w, h, L, R, T, B, s);
  let polys;
  if (sizeKey === 'wide') {
    const topX = 0.585, botX = 0.545;
    const midY = h * 0.52;
    const midX = topX - (topX - botX) * ((midY - T) / (B - T));
    polys = [
      [[L, T], [w * topX, T], [w * botX, B], [L, B]],
      [[w * topX + s, T], [R, T], [R, midY - s / 2], [w * midX + s, midY - s / 2]],
      [[w * midX + s, midY + s / 2], [R, midY + s / 2], [R, B], [w * botX + s, B]],
    ];
  } else {
    // Square and portrait share the shape: a big hero on top, two panels
    // below split by a slanted seam. The hero's bottom edge slopes.
    const heroBotL = sizeKey === 'portrait' ? h * 0.56 : h * 0.64;
    const heroBotR = sizeKey === 'portrait' ? h * 0.48 : h * 0.56;
    const heroAt = (x) => heroBotL + (heroBotR - heroBotL) * ((x - L) / (R - L));
    const seamTopX = w * 0.52, seamBotX = w * 0.46;
    const seamTopY = heroAt(seamTopX);
    polys = [
      [[L, T], [R, T], [R, heroBotR], [L, heroBotL]],
      [[L, heroBotL + s], [seamTopX, seamTopY + s], [seamBotX, B], [L, B]],
      [[seamTopX + s, seamTopY + s], [R, heroBotR + s], [R, B], [seamBotX + s, B]],
    ];
  }
  if (layout === 'flip') {
    const flipX = sizeKey === 'wide';
    polys = polys.map((poly) =>
      poly.map(([x, y]) => (flipX ? [w - x, y] : [x, h - y])),
    );
  }
  return polys;
}

// The cast layout: seven panels, hero first. Wide posters put the hero
// in the middle with a column of three panels on each side; portrait and
// square posters give the hero the top band and stack two rows of three
// underneath. Every panel is a rectangle (the hero's sides slant a
// touch), separated by the same seam gap as the classic layouts.
function castPanelPolygons(sizeKey, w, h, L, R, T, B, s) {
  const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  if (sizeKey === 'wide') {
    const lx1 = L + (R - L) * 0.225;
    const hx0 = lx1 + s, hx1 = L + (R - L) * 0.775;
    const rx0 = hx1 + s;
    const rowH = (B - T - s * 2) / 3;
    const rows = [0, 1, 2].map((i) => [T + i * (rowH + s), T + i * (rowH + s) + rowH]);
    const slant = w * 0.014;
    const hero = [[hx0 + slant, T], [hx1, T], [hx1 - slant, B], [hx0, B]];
    return [
      hero,
      rect(L, rows[0][0], lx1, rows[0][1]),
      rect(L, rows[1][0], lx1, rows[1][1]),
      rect(L, rows[2][0], lx1, rows[2][1]),
      rect(rx0, rows[0][0], R, rows[0][1]),
      rect(rx0, rows[1][0], R, rows[1][1]),
      rect(rx0, rows[2][0], R, rows[2][1]),
    ];
  }
  const heroB = T + (B - T) * (sizeKey === 'portrait' ? 0.5 : 0.46);
  const colW = (R - L - s * 2) / 3;
  const cols = [0, 1, 2].map((i) => [L + i * (colW + s), L + i * (colW + s) + colW]);
  const rowH = (B - heroB - s * 2) / 2;
  const rows = [0, 1].map((i) => [
    heroB + s + i * (rowH + s), heroB + s + i * (rowH + s) + rowH,
  ]);
  return [
    rect(L, T, R, heroB),
    rect(cols[0][0], rows[0][0], cols[0][1], rows[0][1]),
    rect(cols[1][0], rows[0][0], cols[1][1], rows[0][1]),
    rect(cols[2][0], rows[0][0], cols[2][1], rows[0][1]),
    rect(cols[0][0], rows[1][0], cols[0][1], rows[1][1]),
    rect(cols[1][0], rows[1][0], cols[1][1], rows[1][1]),
    rect(cols[2][0], rows[1][0], cols[2][1], rows[1][1]),
  ];
}

function polyPath(ctx, poly) {
  ctx.beginPath();
  ctx.moveTo(poly[0][0], poly[0][1]);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
  ctx.closePath();
}

function polyBox(poly) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of poly) {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

// Ray casting: is the point inside the polygon?
export function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Which panel index holds the point, or -1. Canvas pixels.
export function panelAt(x, y, sizeKey, layout, w, h) {
  const polys = panelPolygons(sizeKey, layout, w, h);
  for (let i = 0; i < polys.length; i++) {
    if (pointInPoly(x, y, polys[i])) return i;
  }
  return -1;
}

function drawPhotoPanel(ctx, poly, img, crop, w, h) {
  const box = polyBox(poly);
  ctx.save();
  polyPath(ctx, poly);
  ctx.clip();
  if (!img) {
    const g = ctx.createLinearGradient(box.x, box.y, box.x + box.w, box.y + box.h);
    g.addColorStop(0, '#3a1650');
    g.addColorStop(1, '#160a26');
    ctx.fillStyle = g;
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.font = `700 ${Math.max(14, Math.round(box.w * 0.035))}px "Arial Black", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ADD A PHOTO', box.x + box.w / 2, box.y + box.h / 2);
    ctx.restore();
    return;
  }
  // Cover-fit the photo into the panel, then apply the crop: zoom scales
  // around the centre, ox/oy slide the photo by a fraction of the panel.
  // The vertical anchor favours the top of the photo (0.3, not 0.5), so a
  // portrait photo in a wide panel keeps its subject's face in frame.
  const base = Math.max(box.w / img.naturalWidth, box.h / img.naturalHeight);
  const scale = base * (crop.zoom || 1);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  const dx = box.x + (box.w - dw) / 2 + (crop.ox || 0) * box.w;
  const dy = box.y + (box.h - dh) * 0.3 + (crop.oy || 0) * box.h;
  ctx.drawImage(img, dx, dy, dw, dh);
  ctx.restore();
}

function drawRetroSun(ctx, cx, cy, r) {
  // A striped sunset disc, drawn with a screen blend so the photo shows
  // through it: a glow, not a sticker pasted over a face.
  const grad = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  grad.addColorStop(0, '#ffd319');
  grad.addColorStop(0.55, '#ff7b3d');
  grad.addColorStop(1, '#ff2975');
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.92;
  ctx.shadowColor = 'rgba(255, 120, 60, 0.55)';
  ctx.shadowBlur = r * 0.3;
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = Math.max(1.5, r * 0.02);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(22, 6, 38, 0.85)';
  for (const f of [0.08, 0.3, 0.52]) {
    const y = cy + r * f;
    const half = Math.sqrt(Math.max(0, r * r - (y - cy) * (y - cy)));
    ctx.fillRect(cx - half, y, half * 2, Math.max(2, r * 0.07));
  }
  ctx.restore();
}

function drawPalm(ctx, x, y, s, color) {
  // One palm silhouette: a leaning trunk and six drooping fronds.
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(2, s * 0.07);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + s * 0.1, y - s * 0.55, x + s * 0.22, y - s * 0.95);
  ctx.stroke();
  const topX = x + s * 0.22, topY = y - s * 0.95;
  ctx.lineWidth = Math.max(1.5, s * 0.045);
  for (let i = 0; i < 6; i++) {
    const a = (-Math.PI * (0.08 + i * 0.17)) - Math.PI / 2 + Math.PI * 0.12;
    const ex = topX + Math.cos(a) * s * 0.55;
    const ey = topY + Math.sin(a) * s * 0.42 + s * 0.22;
    const cx = topX + Math.cos(a) * s * 0.3;
    const cy = topY - s * 0.12;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(cx, cy, ex, ey);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(topX - s * 0.02, topY + s * 0.03, s * 0.045, 0, Math.PI * 2);
  ctx.arc(topX + s * 0.05, topY + s * 0.05, s * 0.04, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHalftone(ctx, x, y, w, h, spacing) {
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  for (let gy = y; gy < y + h; gy += spacing) {
    for (let gx = x; gx < x + w; gx += spacing) {
      const fade = 1 - ((gx - x) / w) * 0.6 - ((gy - y) / h) * 0.4;
      if (fade <= 0.2) continue;
      ctx.beginPath();
      ctx.arc(gx, gy, Math.max(0.8, spacing * 0.16 * fade), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapTitle(ctx, text, size, maxW) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width <= maxW || !line) line = test;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 2);
}

function drawTitleBlock(ctx, w, h, title, subtitle) {
  const pad = Math.round(w * 0.03);
  const family = '"Arial Black", Impact, "Helvetica Neue", sans-serif';
  let size = Math.round(h * 0.115);
  let lines = [];
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  while (size > 20) {
    ctx.font = `900 ${size}px ${family}`;
    try { ctx.letterSpacing = `${Math.round(size * 0.02)}px`; } catch {}
    lines = wrapTitle(ctx, title.toUpperCase(), size, w - pad * 2);
    const widest = Math.max(...lines.map((ln) => ctx.measureText(ln).width), 0);
    if (widest <= w - pad * 2) break;
    size -= 4;
  }
  const subSize = Math.max(16, Math.round(h * 0.026));
  const gap = Math.round(size * 0.22);
  const padBottom = Math.round(h * 0.03);
  const blockH = lines.length * size * 1.02 + gap + subSize;
  // Anchor the block at the bottom: the subtitle baseline sits
  // padBottom above the foot, the title's last baseline above that.
  const hasSub = Boolean(subtitle && subtitle.trim());
  const subBaseline = h - padBottom;
  const titleLastBaseline = hasSub ? subBaseline - gap - subSize : subBaseline;
  let baseline = titleLastBaseline - (lines.length - 1) * size * 1.02;
  ctx.save();
  ctx.shadowColor = 'rgba(255, 41, 117, 0.55)';
  ctx.shadowBlur = size * 0.14;
  ctx.shadowOffsetY = size * 0.03;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#160423';
  ctx.lineWidth = Math.max(3, size * 0.07);
  for (const ln of lines) {
    const grad = ctx.createLinearGradient(0, baseline - size, 0, baseline + size * 0.1);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.35, '#ffe259');
    grad.addColorStop(0.7, '#ff7b3d');
    grad.addColorStop(1, '#ff2975');
    ctx.save();
    ctx.translate(pad, baseline);
    ctx.transform(1, 0, -0.05, 1, 0, 0);
    ctx.fillStyle = grad;
    ctx.strokeText(ln, 0, 0);
    ctx.fillText(ln, 0, 0);
    ctx.restore();
    baseline += size * 1.02;
  }
  ctx.restore();
  if (!hasSub) return blockH;
  // Subtitle with a short gradient rule above it.
  const ruleW = Math.round(w * 0.11);
  const rule = ctx.createLinearGradient(pad, 0, pad + ruleW, 0);
  rule.addColorStop(0, '#ff2975');
  rule.addColorStop(1, '#00e5ff');
  ctx.fillStyle = rule;
  ctx.fillRect(pad, subBaseline - subSize - Math.round(gap * 0.4), ruleW, Math.max(3, Math.round(subSize * 0.14)));
  ctx.font = `700 ${subSize}px "Arial Black", sans-serif`;
  try { ctx.letterSpacing = `${Math.round(subSize * 0.3)}px`; } catch {}
  ctx.fillStyle = '#eafcff';
  ctx.shadowColor = 'rgba(0, 229, 255, 0.6)';
  ctx.shadowBlur = subSize * 0.4;
  ctx.fillText(subtitle.toUpperCase(), pad, subBaseline);
  ctx.shadowBlur = 0;
  try { ctx.letterSpacing = '0px'; } catch {}
  return blockH;
}

function drawPlaceTag(ctx, w, h, place) {
  const pad = Math.round(w * 0.03);
  const fs = Math.max(15, Math.round(h * 0.02));
  ctx.font = `800 ${fs}px "Arial Black", sans-serif`;
  try { ctx.letterSpacing = `${Math.round(fs * 0.28)}px`; } catch {}
  const tw = ctx.measureText(place.toUpperCase()).width;
  const pw = tw + fs * 2.1, ph = fs * 2.1;
  const x = pad, y = pad;
  ctx.save();
  ctx.fillStyle = 'rgba(12, 2, 24, 0.62)';
  roundRect(ctx, x, y, pw, ph, ph / 2);
  ctx.fill();
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = Math.max(1.5, fs * 0.08);
  ctx.stroke();
  ctx.fillStyle = '#ff2975';
  ctx.beginPath();
  ctx.arc(x + fs * 0.75, y + ph / 2, fs * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(place.toUpperCase(), x + fs * 1.25, y + ph / 2 + fs * 0.05);
  ctx.restore();
  try { ctx.letterSpacing = '0px'; } catch {}
}

// --- Cast poster furniture -------------------------------------------
// Everything below is drawn over the seven panels to give the cast
// layout the density of a cinema one-sheet: a review strip across the
// top, a role chip on every panel, chrome lettering with a script
// subtitle and a tagline ribbon, then a billing block, a barcode and a
// gold award seal along the bottom. All invented names, all system
// fonts, all plain canvas shapes.

function drawRoleChip(ctx, poly, role, w, h) {
  if (!role || !role.trim()) return;
  const box = polyBox(poly);
  const fs = Math.max(11, Math.round(h * 0.017));
  ctx.save();
  ctx.font = `800 ${fs}px "Arial Black", sans-serif`;
  try { ctx.letterSpacing = `${Math.round(fs * 0.14)}px`; } catch {}
  const tw = ctx.measureText(role.toUpperCase()).width;
  const cw = tw + fs * 1.7, ch = fs * 1.85;
  const inset = Math.max(6, Math.round(w * 0.006));
  // Lower panels wear the chip at their top so the bottom furniture row
  // stays clear; upper panels and the hero wear it at their foot.
  const atTop = box.y > h * 0.5;
  const x = box.x + inset;
  const y = atTop ? box.y + inset : box.y + box.h - ch - inset;
  ctx.fillStyle = 'rgba(10, 2, 20, 0.82)';
  roundRect(ctx, x, y, cw, ch, ch * 0.22);
  ctx.fill();
  ctx.fillStyle = '#ff2975';
  ctx.save();
  ctx.translate(x + fs * 0.42, y + ch / 2);
  ctx.transform(1, 0, -0.35, 1, 0, 0);
  ctx.fillRect(-fs * 0.09, -ch * 0.3, fs * 0.18, ch * 0.6);
  ctx.restore();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(role.toUpperCase(), x + fs * 0.85, y + ch / 2 + fs * 0.04);
  ctx.restore();
  try { ctx.letterSpacing = '0px'; } catch {}
}

function drawTopStrip(ctx, w, h, quote) {
  const th = Math.round(h * 0.074);
  ctx.save();
  ctx.fillStyle = 'rgba(10, 2, 20, 0.78)';
  ctx.fillRect(0, 0, w, th);
  ctx.fillStyle = '#00e5ff';
  ctx.fillRect(0, th - Math.max(2, h * 0.003), w, Math.max(2, h * 0.003));
  // Five gold stars at the left.
  const starFs = Math.round(th * 0.52);
  ctx.font = `${starFs}px sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffd319';
  ctx.shadowColor = 'rgba(255, 211, 25, 0.7)';
  ctx.shadowBlur = starFs * 0.25;
  ctx.fillText('★★★★★', Math.round(w * 0.018), th / 2 + 1);
  ctx.shadowBlur = 0;
  // The review quote, centred, in an italic serif.
  if (quote && quote.trim()) {
    let qfs = Math.round(th * 0.4);
    ctx.textAlign = 'center';
    while (qfs > 10) {
      ctx.font = `italic 700 ${qfs}px Georgia, "Times New Roman", serif`;
      if (ctx.measureText(quote).width <= w * 0.52) break;
      qfs -= 1;
    }
    ctx.fillStyle = '#fdf6e3';
    ctx.fillText(quote, w / 2, th / 2 + 1);
  }
  // VOL. 1 box at the right.
  const bw = w * 0.085, bh = th * 0.66;
  const bx = w - Math.round(w * 0.018) - bw, by = (th - bh) / 2;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(1.5, h * 0.0022);
  ctx.strokeRect(bx, by, bw, bh);
  let volFs = Math.round(bh * 0.44);
  while (volFs > 8) {
    ctx.font = `900 ${volFs}px "Arial Black", sans-serif`;
    if (ctx.measureText('VOL. 1').width <= bw * 0.88) break;
    volFs -= 1;
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('VOL. 1', bx + bw / 2, th / 2 + 1);
  ctx.restore();
}

function drawBarcode(ctx, x, y, bw, bh) {
  // A deterministic bar pattern (fixed seed, so every export matches):
  // thin and thick black bars on a white card, digits underneath.
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, bw, bh);
  let seed = 1986;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  ctx.fillStyle = '#111111';
  let bx = x + bw * 0.06;
  const barH = bh * 0.72;
  while (bx < x + bw * 0.92) {
    const barW = (rnd() < 0.3 ? 2.6 : 1.2) * (bw / 90);
    if (rnd() < 0.78) ctx.fillRect(bx, y + bh * 0.07, barW, barH);
    bx += barW + (bw / 90) * (0.7 + rnd() * 1.1);
  }
  let digitFs = Math.round(bh * 0.17);
  while (digitFs > 6) {
    ctx.font = `700 ${digitFs}px monospace`;
    if (ctx.measureText('0 1986 060 2026').width <= bw * 0.92) break;
    digitFs -= 1;
  }
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('0 1986 060 2026', x + bw / 2, y + bh * 0.95);
  ctx.restore();
}

function drawAwardSeal(ctx, cx, cy, r) {
  ctx.save();
  const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.15, cx, cy, r);
  g.addColorStop(0, '#ffe98a');
  g.addColorStop(0.6, '#f5b921');
  g.addColorStop(1, '#c47f0a');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#8a5a00';
  ctx.lineWidth = Math.max(1.5, r * 0.05);
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.88, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#7a4d00';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.round(r * 0.78)}px sans-serif`;
  ctx.fillText('★', cx, cy - r * 0.18);
  ctx.font = `900 ${Math.round(r * 0.3)}px "Arial Black", sans-serif`;
  ctx.fillText('TOP PICK', cx, cy + r * 0.48);
  ctx.restore();
}

function drawCastPoster(ctx, w, h, state, polys) {
  const roles = state.roles && state.roles.length ? state.roles : CAST_ROLES;
  drawTopStrip(ctx, w, h, state.quote || '"A SUN-SOAKED KNOCKOUT." — THE PALM GAZETTE');
  for (let i = 0; i < polys.length; i++) {
    drawRoleChip(ctx, polys[i], roles[i] || '', w, h);
  }

  const family = '"Arial Black", Impact, "Helvetica Neue", sans-serif';
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  // Script subtitle: italic serif with a neon-pink glow, sitting just
  // above the title like a hand-lettered flourish.
  const script = (state.subtitle || '').trim();
  let cursorY = h * 0.565;
  if (script) {
    let sfs = Math.round(h * 0.05);
    while (sfs > 14) {
      ctx.font = `italic 700 ${sfs}px Georgia, "Times New Roman", serif`;
      if (ctx.measureText(script).width <= w * 0.8) break;
      sfs -= 2;
    }
    ctx.shadowColor = 'rgba(255, 41, 117, 0.9)';
    ctx.shadowBlur = sfs * 0.45;
    ctx.fillStyle = '#ff7ac0';
    ctx.fillText(script, w / 2, cursorY);
    ctx.shadowBlur = 0;
    cursorY += sfs * 0.32;
  }

  // Chrome-gradient main title, centred, reusing the classic poster's
  // sunset-metal gradient and dark outline.
  const title = (state.title || '').toUpperCase();
  let size = Math.round(h * 0.105);
  let lines = [];
  // Fit by width first, then by height: the title block plus its
  // tagline ribbon must clear the bottom furniture row — and, on
  // portrait/square posters, the last panel row's role chips, which
  // sit at that row's top edge.
  const lastRowTops = polys.map((p) => polyBox(p).y).filter((y) => y > h * 0.6);
  const ribbonLimit = w < h && lastRowTops.length
    ? Math.min(...lastRowTops) - h * 0.008
    : h * 0.855;
  while (size > 20) {
    ctx.font = `900 ${size}px ${family}`;
    try { ctx.letterSpacing = `${Math.round(size * 0.02)}px`; } catch {}
    lines = wrapTitle(ctx, title, size, w * 0.88);
    const widest = Math.max(...lines.map((ln) => ctx.measureText(ln).width), 0);
    const blockH = size * 0.92 + lines.length * size * 1.02;
    if (widest <= w * 0.88 && cursorY + blockH + h * 0.055 <= ribbonLimit) break;
    size -= 4;
  }
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#160423';
  ctx.lineWidth = Math.max(3, size * 0.07);
  ctx.shadowColor = 'rgba(255, 41, 117, 0.55)';
  ctx.shadowBlur = size * 0.14;
  ctx.shadowOffsetY = size * 0.03;
  let baseline = cursorY + size * 0.92;
  for (const ln of lines) {
    ctx.save();
    ctx.translate(w / 2, baseline);
    ctx.transform(1, 0, -0.05, 1, 0, 0);
    // The gradient is built in the translated local space, so the
    // sunset-metal ramp runs down each glyph: white, gold, orange, pink.
    const grad = ctx.createLinearGradient(0, -size, 0, size * 0.12);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.35, '#ffe259');
    grad.addColorStop(0.7, '#ff7b3d');
    grad.addColorStop(1, '#ff2975');
    ctx.fillStyle = grad;
    ctx.strokeText(ln, 0, 0);
    ctx.fillText(ln, 0, 0);
    ctx.restore();
    baseline += size * 1.02;
  }
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  try { ctx.letterSpacing = '0px'; } catch {}

  // Tagline ribbon under the title.
  const tagline = (state.tagline || '').trim().toUpperCase();
  let ribbonBottom = baseline;
  if (tagline) {
    const tfs = Math.max(13, Math.round(h * 0.023));
    ctx.font = `800 ${tfs}px "Arial Black", sans-serif`;
    try { ctx.letterSpacing = `${Math.round(tfs * 0.3)}px`; } catch {}
    const tw = ctx.measureText(tagline).width;
    const rw = tw + tfs * 2.6, rh = tfs * 2.0;
    const rx = w / 2 - rw / 2, ry = baseline + tfs * 0.35;
    ctx.fillStyle = 'rgba(10, 2, 20, 0.85)';
    ctx.fillRect(rx, ry, rw, rh);
    ctx.fillStyle = '#ff2975';
    ctx.fillRect(rx, ry, rw, Math.max(2, tfs * 0.12));
    ctx.fillRect(rx, ry + rh - Math.max(2, tfs * 0.12), rw, Math.max(2, tfs * 0.12));
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.fillText(tagline, w / 2, ry + rh / 2 + 1);
    ctx.textBaseline = 'alphabetic';
    try { ctx.letterSpacing = '0px'; } catch {}
    ribbonBottom = ry + rh;
  }
  ctx.restore();

  // Gold award seal overlapping the right panels like a sticker.
  drawAwardSeal(ctx, w * 0.885, h * 0.585, h * 0.05);

  // Bottom furniture row: COMING SOON at the left, the tiny-caps
  // billing block centred, a barcode at the right.
  ctx.save();
  const baseY = h * 0.972;
  ctx.textBaseline = 'alphabetic';
  const soonFs = Math.max(13, Math.round(h * 0.021));
  ctx.font = `900 ${soonFs}px "Arial Black", sans-serif`;
  try { ctx.letterSpacing = `${Math.round(soonFs * 0.18)}px`; } catch {}
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(255, 41, 117, 0.7)';
  ctx.shadowBlur = soonFs * 0.3;
  // On narrow posters the centred billing block would run into
  // COMING SOON, so it gets its own line above the credits there.
  const soonY = w < h ? baseY - Math.round(h * 0.0115) * 2.8 : baseY;
  ctx.fillText('COMING SOON', Math.round(w * 0.022), soonY);
  ctx.shadowBlur = 0;
  try { ctx.letterSpacing = '0px'; } catch {}
  const billFs = Math.max(9, Math.round(h * 0.0115));
  ctx.font = `700 ${billFs}px "Arial Narrow", Arial, sans-serif`;
  try { ctx.letterSpacing = `${Math.round(billFs * 0.12)}px`; } catch {}
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
  ctx.fillText(CAST_CREDITS[0], w / 2, baseY - billFs * 1.25);
  ctx.fillText(CAST_CREDITS[1], w / 2, baseY);
  try { ctx.letterSpacing = '0px'; } catch {}
  ctx.restore();
  drawBarcode(ctx, w * 0.9, h * 0.918, w * 0.078, h * 0.062);
}

// The whole poster. state:
//   size, layout, grade, title, subtitle, place,
//   photos: [image|null, image|null, image|null],
//   crops: [{photo, zoom, ox, oy}] one per panel.
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const polys = panelPolygons(state.size, state.layout, w, h);
  const seam = Math.max(8, Math.round(Math.min(w, h) * 0.012));

  // Sunset sky underneath everything: it shows through the seams and
  // around the edges, so the poster reads as one sunset scene.
  const sky = ctx.createLinearGradient(0, 0, w * 0.15, h);
  sky.addColorStop(0, '#2b1055');
  sky.addColorStop(0.45, '#8b2a6b');
  sky.addColorStop(0.75, '#ff5e62');
  sky.addColorStop(1, '#ff9a3d');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < polys.length; i++) {
    const crop = state.crops[i] || { photo: i, zoom: 1, ox: 0, oy: 0 };
    const img = state.photos[crop.photo] ?? state.photos[i] ?? null;
    drawPhotoPanel(ctx, polys[i], img, crop, w, h);
  }

  // White seams between the panels, and a white frame.
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = seam;
  ctx.lineJoin = 'round';
  for (const poly of polys) {
    polyPath(ctx, poly);
    ctx.stroke();
  }
  ctx.strokeRect(seam / 2, seam / 2, w - seam, h - seam);
  ctx.restore();

  // Grade: a colour wash over the photos.
  ctx.save();
  if (state.grade === 'neon') {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(0, 229, 255, 0.16)');
    g.addColorStop(0.5, 'rgba(255, 41, 117, 0.08)');
    g.addColorStop(1, 'rgba(255, 41, 117, 0.26)');
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  } else if (state.grade === 'noir') {
    ctx.globalCompositeOperation = 'saturation';
    ctx.fillStyle = 'rgba(128, 128, 128, 0.55)';
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'overlay';
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(40, 20, 80, 0.18)');
    g.addColorStop(1, 'rgba(255, 41, 117, 0.12)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(255, 140, 60, 0.10)');
    g.addColorStop(1, 'rgba(255, 41, 117, 0.22)');
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();

  const isCast = state.layout === 'cast';
  // Dressing, clipped to the hero panel: the striped sun tucked into the
  // top-right corner (sky in most photos) and halftone dots beside it.
  // The cast poster skips it — its top strip owns the hero's top edge.
  if (!isCast) {
    const hero = polys[0];
    const hb = polyBox(hero);
    ctx.save();
    polyPath(ctx, hero);
    ctx.clip();
    const sunR = Math.min(w, h) * 0.065;
    const sunX = hb.x + hb.w * 0.88;
    const sunY = hb.y + hb.h * 0.1;
    drawRetroSun(ctx, sunX, sunY, sunR);
    drawHalftone(ctx, hb.x + hb.w * 0.6, hb.y + hb.h * 0.03, hb.w * 0.24, hb.h * 0.18, Math.max(10, w * 0.011));
    ctx.restore();
  }

  // Vignette over the whole poster.
  const vig = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.45,
    w / 2, h / 2, Math.max(w, h) * 0.75,
  );
  vig.addColorStop(0, 'rgba(8, 0, 18, 0)');
  vig.addColorStop(1, 'rgba(8, 0, 18, 0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  // Dark scrim under the title so the lettering always reads. The cast
  // poster starts its scrim higher and runs it darker: its title block
  // sits mid-poster and its bottom row carries the billing furniture.
  const scrimTop = isCast ? h * 0.5 : h * 0.6;
  const scrim = ctx.createLinearGradient(0, scrimTop, 0, h);
  scrim.addColorStop(0, 'rgba(12, 1, 24, 0)');
  scrim.addColorStop(1, isCast ? 'rgba(12, 1, 24, 0.92)' : 'rgba(12, 1, 24, 0.85)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, scrimTop, w, h - scrimTop);

  if (isCast) {
    drawCastPoster(ctx, w, h, state, polys);
    return;
  }

  // Palm silhouettes in the dark bottom-right corner, behind the title.
  const palmColor = 'rgba(16, 5, 30, 0.88)';
  drawPalm(ctx, w * 0.88, h - 2, Math.min(w, h) * 0.17, palmColor);
  drawPalm(ctx, w * 0.96, h - 2, Math.min(w, h) * 0.12, palmColor);

  if (state.place) drawPlaceTag(ctx, w, h, state.place);
  if (state.title) drawTitleBlock(ctx, w, h, state.title, state.subtitle || '');

  // Small maker credit, bottom right.
  ctx.save();
  ctx.font = `700 ${Math.max(11, Math.round(h * 0.011))}px sans-serif`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.fillText('VICE COVER STUDIO', w - Math.round(w * 0.02), h - Math.round(h * 0.012));
  ctx.restore();
}
