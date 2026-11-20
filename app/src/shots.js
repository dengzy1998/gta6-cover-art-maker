// shots.js — fixed scenes for screenshots: ?shot=editor shows the page
// with sample photos loaded; ?shot=cover shows the cover alone, filling
// the viewport. Query knobs: photo..photo7 (sample names, one per panel
// of the current layout), caption, subtitle, tagline, quote, roles
// (comma-separated cast labels), place, size (square/portrait/wide),
// grade (sunset/neon/noir), layout (normal/flip/cast).
// window.__shotReady is set once the scene has painted, so a screenshot
// can wait on it.
export async function runShot(shot, query, setup) {
  const photos = [];
  for (let i = 0; i < 7; i++) {
    photos.push(query.get(i === 0 ? 'photo' : `photo${i + 1}`));
  }
  const rolesParam = query.get('roles');
  const scene = {
    photos,
    title: query.get('caption') ?? 'VICE NIGHTS',
    subtitle: query.get('subtitle') ?? 'One city. No rules.',
    tagline: query.get('tagline') ?? '',
    quote: query.get('quote') ?? '',
    roles: rolesParam ? rolesParam.split(',').map((r) => r.trim()) : null,
    place: query.get('place') ?? 'VICE CITY',
    size: query.get('size') ?? 'wide',
    grade: query.get('grade') ?? 'sunset',
    layout: query.get('layout') ?? 'normal',
  };
  if (shot === 'cover') document.body.classList.add('shot-cover');
  await setup(scene);
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
