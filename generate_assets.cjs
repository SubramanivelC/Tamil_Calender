/**
 * Generates app brand assets (original design, no third-party assets):
 *   assets/icon.png          1024x1024  app icon (maroon bg, calendar sheet + day cell)
 *   assets/adaptive-icon.png 1024x1024  Android adaptive foreground
 *   assets/splash-icon.png   1024x1024  splash image (transparent bg)
 *   assets/favicon.png        48x48    web favicon
 *
 * Design intent: unmistakably a CALENDAR at a glance — a maroon sheet with a
 * gold header band, a grid of day cells, one highlighted gold "today" cell,
 * and a Tamil letter த in the header identifying it as a Tamil calendar.
 * Pure Node, no dependencies: writes PNGs via zlib.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 1024;
const SMALL = 48;

// ---- palette (from src/theme/colors.ts) ----
const MAROON = [118, 37, 54]; // #762536
const BURGUNDY = [75, 23, 36]; // #4B1724
const GOLD = [197, 160, 90]; // #C5A05A
const GOLD_SOFT = [222, 195, 140]; // #DEC38C
const IVORY = [255, 251, 245]; // #FFFBF5

function pngEncode(width, height, rgba) {
  const bytesPerPx = 4;
  const stride = width * bytesPerPx;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    // source row starts at y*w*4 in the plain RGBA buffer; copy exactly w*4 bytes
    rgba.copy(raw, y * (stride + 1) + 1, y * width * bytesPerPx, (y + 1) * width * bytesPerPx);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  const chunks = [];
  const crcTable = buildCrcTable();
  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const typeBuf = Buffer.from(type, 'ascii');
    const body = Buffer.concat([typeBuf, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(crcTable, body) >>> 0);
    return Buffer.concat([len, body, crc]);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  chunks.push(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  chunks.push(chunk('IHDR', ihdr));
  chunks.push(chunk('IDAT', idat));
  chunks.push(chunk('IEND', Buffer.alloc(0)));
  return Buffer.concat(chunks);
}

function buildCrcTable() {
  const t = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
}
function crc32(table, buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ---- drawing helpers ----
function makeCanvas(size, bg) {
  const buf = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    buf[i * 4] = bg[0];
    buf[i * 4 + 1] = bg[1];
    buf[i * 4 + 2] = bg[2];
    buf[i * 4 + 3] = bg.length === 4 ? bg[3] : 255;
  }
  return buf;
}

function setPx(buf, size, x, y, rgb, alpha) {
  // Snap to integer pixel grid: fractional coords (from /2 divisions) would
  // otherwise produce a fractional byte index and corrupt RGBA alignment.
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= size || y >= size) return;
  const i = (y * size + x) * 4;
  buf[i] = rgb[0];
  buf[i + 1] = rgb[1];
  buf[i + 2] = rgb[2];
  buf[i + 3] = alpha == null ? 255 : Math.round(alpha * 255);
}

function fillRect(buf, size, x0, y0, w, h, rgb, alpha) {
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) setPx(buf, size, x, y, rgb, alpha);
}

function fillCircle(buf, size, cx, cy, r, rgb, alpha) {
  const r2 = r * r;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy <= r2) setPx(buf, size, x, y, rgb, alpha);
    }
  }
}

function fillRoundRect(buf, size, x0, y0, w, h, r, rgb, alpha) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const dx = x < x0 + r ? x0 + r - x : x > x0 + w - 1 - r ? x - (x0 + w - 1 - r) : 0;
      const dy = y < y0 + r ? y0 + r - y : y > y0 + h - 1 - r ? y - (y0 + h - 1 - r) : 0;
      if (dx * dx + dy * dy <= r * r) setPx(buf, size, x, y, rgb, alpha);
    }
  }
}

/**
 * Tamil letter த drawn as a set of vector strokes:
 *   horizontal top bar + a looped bowl below-right.
 * Approximates the glyph cleanly at icon sizes.
 */
function drawTamilTha(buf, size, cx, cy, scale, rgb) {
  // stroke half-width
  const w = 14 * scale;
  function lineSeg(x1, y1, x2, y2, width) {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.ceil(len) + 1;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = x1 + (x2 - x1) * t;
      const py = y1 + (y2 - y1) * t;
      fillCircle(buf, size, px, py, width, rgb);
    }
  }
  // relative coordinates in a 100x100 glyph space
  const u = (v) => v * scale;
  const gx = cx - u(50); // top-left of glyph box
  const gy = cy - u(50);
  // top horizontal bar: from x 8..78 at y 18
  lineSeg(gx + u(8), gy + u(18), gx + u(78), gy + u(18), w);
  // small rightward end tick
  lineSeg(gx + u(78), gy + u(18), gx + u(78), gy + u(34), w);
  // bowl: vertical drop from bar then loop to the right
  lineSeg(gx + u(20), gy + u(18), gx + u(20), gy + u(52), w);
  // bowl curve approximated by arcs: circle center (46,52) r 26 from angle 180→20deg
  const ccx = gx + u(46), ccy = gy + u(52), cr = u(26);
  for (let a = Math.PI; a >= Math.PI / 9; a -= 0.012) {
    lineSeg(ccx + Math.cos(a) * cr, ccy - Math.sin(a) * cr, ccx + Math.cos(a) * cr + 0.5, ccy - Math.sin(a) * cr + 0.5, w);
  }
  // inner dot of the bowl
  fillCircle(buf, size, gx + u(46), gy + u(52), u(5), rgb);
}

/** Draws a calendar sheet motif centered in the given canvas. */
function drawCalendarSheet(buf, size, cx, cy, sheetW, sheetH, scale) {
  const x0 = cx - sheetW / 2;
  const y0 = cy - sheetH / 2;

  // drop base: dark burgundy rounded sheet
  fillRoundRect(buf, size, x0 + 6 * scale, y0 + 10 * scale, sheetW, sheetH, 36 * scale, BURGUNDY);
  // main sheet: maroon body
  fillRoundRect(buf, size, x0, y0, sheetW, sheetH, 36 * scale, MAROON);

  // gold header band (rounded top only — overlay a rect on lower half)
  fillRoundRect(buf, size, x0, y0, sheetW, 150 * scale, 36 * scale, GOLD);
  fillRect(buf, size, x0, y0 + 110 * scale, sheetW, 40 * scale + 1, GOLD);

  // header binding rings (calendar rings on top edge)
  fillCircle(buf, size, x0 + 90 * scale, y0 - 8 * scale, 16 * scale, BURGUNDY);
  fillCircle(buf, size, x0 + 90 * scale, y0 - 8 * scale, 7 * scale, GOLD);
  fillCircle(buf, size, x0 + sheetW - 90 * scale, y0 - 8 * scale, 16 * scale, BURGUNDY);
  fillCircle(buf, size, x0 + sheetW - 90 * scale, y0 - 8 * scale, 7 * scale, GOLD);

  // Tamil த in the header (burgundy on gold)
  drawTamilTha(buf, size, cx, y0 + 74 * scale, 0.62 * scale, BURGUNDY);

  // day grid: 3 rows x 4 cols below header, inside body
  const gridTop = y0 + 190 * scale;
  const gridBot = y0 + sheetH - 56 * scale;
  const gridH = gridBot - gridTop;
  const rows = 3, cols = 4;
  const gapX = 26 * scale, gapY = 22 * scale;
  const cellW = (sheetW - 2 * 34 * scale - (cols - 1) * gapX) / cols;
  const cellH = (gridH - (rows - 1) * gapY) / rows;
  // highlighted cell = row 1 col 2 (0-based)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cxCell = x0 + 34 * scale + c * (cellW + gapX) + cellW / 2;
      const cyCell = gridTop + r * (cellH + gapY) + cellH / 2;
      if (r === 1 && c === 2) {
        // "today" — gold cell
        fillRoundRect(buf, size, cxCell - cellW / 2, cyCell - cellH / 2, cellW, cellH, 10 * scale, GOLD);
        // small burgundy dot center like a date marker
        fillCircle(buf, size, cxCell, cyCell, 9 * scale, BURGUNDY);
      } else {
        fillRoundRect(buf, size, cxCell - cellW / 2, cyCell - cellH / 2, cellW, cellH, 10 * scale, BURGUNDY);
        // soft inner line so cells read as day squares on deep maroon
        fillRoundRect(buf, size, cxCell - cellW / 2 + 6 * scale, cyCell - cellH / 2 + 6 * scale, cellW - 12 * scale, cellH - 12 * scale, 8 * scale, MAROON);
      }
    }
  }
}

function drawIcon(bgMode) {
  const buf = makeCanvas(SIZE, bgMode === 'solid' ? MAROON : [0, 0, 0, 0]);
  if (bgMode === 'solid') {
    // subtle radial vignette toward deep burgundy
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const dx = x - SIZE / 2, dy = y - SIZE / 2;
        const d = Math.sqrt(dx * dx + dy * dy) / (SIZE / 2);
        if (d > 0.55) {
          const i = (y * SIZE + x) * 4;
          const t = (d - 0.55) / 0.45;
          buf[i] = Math.round(MAROON[0] * (1 - t) + BURGUNDY[0] * t);
          buf[i + 1] = Math.round(MAROON[1] * (1 - t) + BURGUNDY[1] * t);
          buf[i + 2] = Math.round(MAROON[2] * (1 - t) + BURGUNDY[2] * t);
          buf[i + 3] = 255;
        }
      }
    }
  }
  const cx = SIZE / 2, cy = SIZE / 2;
  const scale = bgMode === 'solid' ? 1 : 0.62; // adaptive shrinks into safe zone
  drawCalendarSheet(buf, SIZE, cx, cy, 760 * scale, 780 * scale, scale);
  return buf;
}

function drawSplash() {
  // Transparent background, centered calendar sheet motif.
  const buf = makeCanvas(SIZE, [0, 0, 0, 0]);
  drawCalendarSheet(buf, SIZE, SIZE / 2, SIZE / 2, 560, 576, 0.72);
  return buf;
}

function drawFavicon() {
  const buf = makeCanvas(SMALL, MAROON);
  // mini calendar: gold header band + day grid dots
  fillRect(buf, SMALL, 6, 6, 36, 10, GOLD);
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++)
      fillRect(buf, SMALL, 9 + c * 11, 20 + r * 8, 7, 5, GOLD_SOFT);
  drawTamilTha(buf, SMALL, SMALL / 2, 10.5, 0.09, BURGUNDY);
  return buf;
}

const outDir = path.join(__dirname, 'assets');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'icon.png'), pngEncode(SIZE, SIZE, drawIcon('solid')));
fs.writeFileSync(path.join(outDir, 'adaptive-icon.png'), pngEncode(SIZE, SIZE, drawIcon('adaptive')));
fs.writeFileSync(path.join(outDir, 'splash-icon.png'), pngEncode(SIZE, SIZE, drawSplash()));
fs.writeFileSync(path.join(outDir, 'favicon.png'), pngEncode(SMALL, SMALL, drawFavicon()));
console.log('assets generated:', fs.readdirSync(outDir).join(', '));
