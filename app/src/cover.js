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

// A panel is a polygon: an array of [x, y] corners in canvas pixels.
// panelPolygons returns three of them — hero first, then the two small
// ones — for a size and a layout. "flip" mirrors the hero to the other
// side, so the poster can be re-composed with one click.
export function panelPolygons(sizeKey, layout, w, h) {
  const m = Math.max(10, Math.round(Math.min(w, h) * 0.013));
  const s = Math.max(8, Math.round(Math.min(w, h) * 0.012));
  const L = m, R = w - m, T = m, B = h - m;
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
    const crop = state.crops[i];
    const img = state.photos[crop.photo] ?? null;
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

  // Dressing, clipped to the hero panel: the striped sun tucked into the
  // top-right corner (sky in most photos) and halftone dots beside it.
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

  // Vignette over the whole poster.
  const vig = ctx.createRadialGradient(
    w / 2, h / 2, Math.min(w, h) * 0.45,
    w / 2, h / 2, Math.max(w, h) * 0.75,
  );
  vig.addColorStop(0, 'rgba(8, 0, 18, 0)');
  vig.addColorStop(1, 'rgba(8, 0, 18, 0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  // Dark scrim under the title so the lettering always reads.
  const scrim = ctx.createLinearGradient(0, h * 0.6, 0, h);
  scrim.addColorStop(0, 'rgba(12, 1, 24, 0)');
  scrim.addColorStop(1, 'rgba(12, 1, 24, 0.85)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, h * 0.6, w, h * 0.4);

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
