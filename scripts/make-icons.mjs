// Erzeugt die App-Icons (PNG) aus einem selbst gezeichneten Pixel-Raster – ohne externe Abhängigkeiten.
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const G = [
  '................................',
  '................................',
  '..............................s.',
  '...s.....................m......',
  '........................mmm.....',
  '.........s.............mmmm.....',
  '........................mm......',
  '.................f..............',
  '.................fFF............',
  '.................fFFF...........',
  '.................f..............',
  '................wWw.............',
  '...............wWWWw............',
  '..............wWWaWWw...........',
  '.............aWaaaaWaa..........',
  '............aaaaaaaaaaa.........',
  '.....b.....aaaaaaaaaaaaa........',
  '....bbb...aaaaaaaaaaaaaaa..b....',
  '...bbbbb.aaaaaaaaaaaaaaaaabbb...',
  '..bbbbbbbaaaaaaaaaaaaaaaabbbbb..',
  '.bbbbbbbbbaaaaaaaaaaaaaabbbbbbb.',
  'bbbbbbbbbbbbbbbpbbbbbbbbbbbbbbbb',
  'ttbbbbbbbbbbbbppbbbbbbbbbbbbbbtt',
  'ttbbbbbbbbbbbpbbbbbbbbbbbbbbbbtt',
  'ttttbbbbbbbbbppbbbbbbbbbbbbbtttt',
  'ttttgggggggggggppggggggggggggttt',
  'gggggggggggggggggppggggggggggggg',
  'gggggggggggggggggggppggggggggggg',
  'ggggggggggggggggggggppgggggggggg',
  'ggggggggggggggggggggppgggggggggg',
  'gggggggggggggggggggppggggggggggg',
  'gggggggggggggggggggppggggggggggg',
];
const C = {
  '.': [0x2a, 0x1e, 0x3f], s: [0xec, 0xe5, 0xd6], m: [0xec, 0xe5, 0xd6], f: [0xec, 0xe5, 0xd6], F: [0xd9, 0x78, 0x3a],
  w: [0xcf, 0xc6, 0xde], W: [0xec, 0xe5, 0xd6], a: [0x5a, 0x4a, 0x7a], b: [0x33, 0x28, 0x4a], t: [0x20, 0x33, 0x2f],
  g: [0x1b, 0x16, 0x26], p: [0xd9, 0x78, 0x3a],
};

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, pad = 0) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  const inner = size - pad * 2;
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let col = [0x17, 0x14, 0x1a];
      const ix = x - pad, iy = y - pad;
      if (ix >= 0 && iy >= 0 && ix < inner && iy < inner) {
        const gx = Math.floor((ix / inner) * 32), gy = Math.floor((iy / inner) * 32);
        col = C[G[gy][gx]] ?? C['.'];
      }
      raw.set(col, y * (size * 3 + 1) + 1 + x * 3);
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
mkdirSync('public', { recursive: true });
writeFileSync('public/icon-180.png', png(180));
writeFileSync('public/icon-192.png', png(192));
writeFileSync('public/icon-512.png', png(512, 0));
writeFileSync('public/favicon.png', png(64));
console.log('Icons erzeugt.');
