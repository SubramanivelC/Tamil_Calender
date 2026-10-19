/* Probe specific screen coordinates of screenshots to identify which
 * surface is where: status-bar tint, page bg, card bg, tab bar. */
const { decodePng, hexAt } = require('./palette.cjs');
const POINTS = [
  [540, 60, 'status-bar area'],
  [540, 455, 'page bg between cards'],
  [540, 700, 'card interior'],
  [540, 1800, 'lower content'],
  [540, 2090, 'above bottom menu / view toggle'],
  [100, 2200, 'bottom tab bar (left)'],
  [540, 2200, 'bottom tab bar (center)'],
  [540, 2360, 'gesture nav bar zone'],
];
for (const f of process.argv.slice(2)) {
  const img = decodePng(f);
  console.log(`--- ${f}`);
  for (const [x, y, label] of POINTS)
    console.log(`  ${label} (${x},${y}) = ${hexAt(img, x, y)}`);
}
