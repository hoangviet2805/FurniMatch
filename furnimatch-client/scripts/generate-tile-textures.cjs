const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const outputDir = path.resolve(__dirname, '../public/textures/tiles');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function createPng(width, height, getPixel) {
  const rawData = Buffer.alloc(height * (width * 4 + 1));
  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y);
      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a !== undefined ? a : 255;
    }
  }
  const compressed = zlib.deflateSync(rawData);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }

  function crc32(buf) {
    let crc = -1;
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
    }
    return (crc ^ (-1)) >>> 0;
  }

  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type);
    const payload = Buffer.concat([typeBuf, data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(payload), 0);
    return Buffer.concat([len, payload, crc]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', compressed),
    chunk('IEND', Buffer.alloc(0))
  ]);
}

// Simple noise functions
function pseudoNoise(x, y, seed = 1) {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 43.123) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x, y, scale = 50, seed = 1) {
  const sx = x / scale;
  const sy = y / scale;
  const x0 = Math.floor(sx), x1 = x0 + 1;
  const y0 = Math.floor(sy), y1 = y0 + 1;
  const fx = sx - x0, fy = sy - y0;
  const n00 = pseudoNoise(x0, y0, seed);
  const n10 = pseudoNoise(x1, y0, seed);
  const n01 = pseudoNoise(x0, y1, seed);
  const n11 = pseudoNoise(x1, y1, seed);
  const nx0 = n00 * (1 - fx) + n10 * fx;
  const nx1 = n01 * (1 - fx) + n11 * fx;
  return nx0 * (1 - fy) + nx1 * fy;
}

const W = 512, H = 512;

// 1. Calacatta White Marble
console.log('Generating Calacatta White Marble...');
const calacattaPng = createPng(W, H, (x, y) => {
  const n1 = smoothNoise(x, y, 120, 10);
  const n2 = smoothNoise(x, y, 40, 20);
  const veinDist = Math.abs(Math.sin((x + y * 0.8) / 70 + (n1 - 0.5) * 4));
  let r = 250, g = 250, b = 248;
  if (veinDist < 0.12) {
    const factor = (1 - veinDist / 0.12);
    const veinDark = 110 + n2 * 40;
    r = Math.floor(r * (1 - factor * 0.55) + veinDark * factor * 0.55);
    g = Math.floor(g * (1 - factor * 0.53) + (veinDark + 5) * factor * 0.53);
    b = Math.floor(b * (1 - factor * 0.50) + (veinDark + 15) * factor * 0.50);
  }
  return [r, g, b, 255];
});
fs.writeFileSync(path.join(outputDir, 'calacatta-marble.png'), calacattaPng);

// 2. Crema Travertine
console.log('Generating Crema Travertine...');
const travertinePng = createPng(W, H, (x, y) => {
  const wave = Math.sin(y / 25 + smoothNoise(x, y, 60, 3) * 3);
  const baseNoise = smoothNoise(x, y, 40, 5);
  let r = Math.floor(238 + wave * 8 + (baseNoise - 0.5) * 12);
  let g = Math.floor(226 + wave * 9 + (baseNoise - 0.5) * 12);
  let b = Math.floor(208 + wave * 10 + (baseNoise - 0.5) * 10);
  return [Math.min(255, Math.max(0, r)), Math.min(255, Math.max(0, g)), Math.min(255, Math.max(0, b)), 255];
});
fs.writeFileSync(path.join(outputDir, 'crema-travertine.png'), travertinePng);

// 3. Urban Concrete
console.log('Generating Urban Concrete...');
const concretePng = createPng(W, H, (x, y) => {
  const speck = pseudoNoise(x, y, 42);
  const n = smoothNoise(x, y, 80, 8);
  const base = 175 + (n - 0.5) * 25 + (speck - 0.5) * 20;
  const val = Math.min(255, Math.max(0, Math.floor(base)));
  return [val, val + 2, val + 4, 255];
});
fs.writeFileSync(path.join(outputDir, 'urban-concrete.png'), concretePng);

// 4. Sandstone Beige
console.log('Generating Sandstone Beige...');
const sandstonePng = createPng(W, H, (x, y) => {
  const speck = pseudoNoise(x, y, 99);
  const n = smoothNoise(x, y, 50, 15);
  const r = Math.floor(228 + (n - 0.5) * 16 + (speck - 0.5) * 14);
  const g = Math.floor(215 + (n - 0.5) * 16 + (speck - 0.5) * 14);
  const b = Math.floor(196 + (n - 0.5) * 14 + (speck - 0.5) * 12);
  return [Math.min(255, Math.max(0, r)), Math.min(255, Math.max(0, g)), Math.min(255, Math.max(0, b)), 255];
});
fs.writeFileSync(path.join(outputDir, 'sandstone-beige.png'), sandstonePng);

// 5. Oak Wood Planks
console.log('Generating Oak Wood Planks...');
const oakPng = createPng(W, H, (x, y) => {
  const plankH = H / 4;
  const plankIndex = Math.floor(y / plankH);
  const py = y % plankH;
  if (py < 2 || py > plankH - 2) {
    return [60, 40, 25, 255]; // plank groove
  }
  const grain = Math.sin(x / 4 + smoothNoise(x, y, 30, plankIndex) * 8);
  const plankTone = (plankIndex % 2 === 0 ? 10 : -10);
  const r = Math.floor(195 + plankTone + grain * 14);
  const g = Math.floor(155 + plankTone * 0.8 + grain * 12);
  const b = Math.floor(115 + plankTone * 0.6 + grain * 10);
  return [Math.min(255, Math.max(0, r)), Math.min(255, Math.max(0, g)), Math.min(255, Math.max(0, b)), 255];
});
fs.writeFileSync(path.join(outputDir, 'oak-wood-planks.png'), oakPng);

// 6. Nero Marquina Black Marble
console.log('Generating Nero Marquina...');
const neroPng = createPng(W, H, (x, y) => {
  const n1 = smoothNoise(x, y, 90, 77);
  const n2 = smoothNoise(x, y, 30, 88);
  const vein1 = Math.abs(Math.sin((x * 1.2 - y * 0.9) / 80 + (n1 - 0.5) * 5));
  let r = 20, g = 22, b = 26;
  if (vein1 < 0.08) {
    const factor = (1 - vein1 / 0.08);
    r = Math.floor(r * (1 - factor) + 245 * factor);
    g = Math.floor(g * (1 - factor) + 248 * factor);
    b = Math.floor(b * (1 - factor) + 255 * factor);
  }
  return [r, g, b, 255];
});
fs.writeFileSync(path.join(outputDir, 'nero-marquina.png'), neroPng);

console.log('All 6 tile texture PNG files successfully generated in public/textures/tiles!');
