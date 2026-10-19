/* Minimal PNG decoder (verifies & unfilters truecolor RGBA non-interlaced)
 * and reports the dominant colors of a screenshot. */
const fs = require('fs');
const zlib = require('zlib');

function decodePng(path) {
  const buf = fs.readFileSync(path);
  let off = 8, w = 0, h = 0, bitDepth = 0, colorType = 0;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.toString('ascii', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 'IHDR') {
      w = data.readUInt32BE(0); h = data.readUInt32BE(4);
      bitDepth = data[8]; colorType = data[9];
      if (bitDepth !== 8 || colorType !== 6) throw new Error(`unsupported png ${bitDepth}-bit type=${colorType}`);
    } else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    off += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = 4, stride = w * bpp;
  const out = Buffer.alloc(h * stride);
  let pos = 0;
  for (let y = 0; y < h; y++) {
    const filter = raw[pos++];
    const row = raw.subarray(pos, pos + stride); pos += stride;
    const prev = y > 0 ? out.subarray((y - 1) * stride, y * stride) : Buffer.alloc(stride);
    const cur = out.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? cur[x - bpp] : 0;
      const b = prev[x];
      const c = x >= bpp ? prev[x - bpp] : 0;
      let v = row[x];
      switch (filter) {
        case 0: break;
        case 1: v = (v + a) & 0xff; break;
        case 2: v = (v + b) & 0xff; break;
        case 3: v = (v + ((a + b) >> 1)) & 0xff; break;
        case 4: {
          const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff; break;
        }
      }
      cur[x] = v;
    }
  }
  return { w, h, px: out };
}

function palette(file, step = 10) {
  const { w, h, px } = decodePng(file);
  const counts = new Map();
  for (let y = step >> 1; y < h; y += step)
    for (let x = step >> 1; x < w; x += step) {
      const o = (y * w + x) * 4;
      // quantize to 16-level per channel
      const key = `${px[o] >> 4 << 4},${px[o + 1] >> 4 << 4},${px[o + 2] >> 4 << 4}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  let total = 0;
  for (const c of counts.values()) total += c;
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  return sorted.map(([k, n]) => {
    const [r, g, b] = k.split(',').map(Number);
    return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')} ${(100 * n / total).toFixed(1)}%`;
  });
}

function hexAt({ w, px }, x, y) {
  const o = (y * w + x) * 4;
  return `#${[px[o], px[o + 1], px[o + 2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

for (const f of process.argv.slice(2)) {
  console.log(`--- ${f}`);
  for (const line of palette(f)) console.log('   ' + line);
}

module.exports = { decodePng, hexAt };
