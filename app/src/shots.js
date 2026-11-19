// shots.js — fixed scenes for screenshots: ?shot=editor shows the page
// with sample photos loaded; ?shot=cover shows the cover alone, filling
// the viewport. Query knobs: photo, photo2, photo3 (sample names),
// caption, subtitle, place, size (square/portrait/wide), grade
// (sunset/neon/noir), layout (normal/flip). window.__shotReady is set
// once the scene has painted, so a screenshot can wait on it.
export async function runShot(shot, query, setup) {
  const scene = {
    photos: [
      query.get('photo') ?? 'neon',
      query.get('photo2') ?? 'boulevard',
      query.get('photo3') ?? 'pier',
    ],
    title: query.get('caption') ?? 'VICE NIGHTS',
    subtitle: query.get('subtitle') ?? 'One city. No rules.',
    place: query.get('place') ?? 'VICE CITY',
    size: query.get('size') ?? 'wide',
    grade: query.get('grade') ?? 'sunset',
    layout: query.get('layout') ?? 'normal',
  };
  if (shot === 'cover') document.body.classList.add('shot-cover');
  await setup(scene);
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
