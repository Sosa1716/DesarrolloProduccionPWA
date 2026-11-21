import { mkdir, writeFile } from 'node:fs/promises';
import { deflateSync } from 'node:zlib';

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c >>> 0;
}
function crc32(buffer) {
  let c = 0xffffffff;
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(name, data) {
  const type = Buffer.from(name);
  const size = Buffer.alloc(4); size.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4); checksum.writeUInt32BE(crc32(Buffer.concat([type, data])));
  return Buffer.concat([size, type, data, checksum]);
}
function icon(size = 512, maskable = false) {
  const width = size;
  const height = size;
  const pixels = Buffer.alloc(width * height * 4);
  const rounded = (x, y, bx, by, bw, bh, r) => {
    const dx = Math.max(bx + r - x, 0, x - (bx + bw - r));
    const dy = Math.max(by + r - y, 0, y - (by + bh - r));
    return dx * dx + dy * dy <= r * r;
  };
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const offset = (y * width + x) * 4;
    let color = [16, 44, 37, 255];
    const px = x * 512 / width; const py = y * 512 / height;
    if (!maskable && !rounded(px, py, 18, 18, 476, 476, 102)) color = [0, 0, 0, 0];
    const cx = 256; const cy = 258; const size = maskable ? 133 : 162;
    const inStem = Math.abs(px - cx) < size * .14 && py >= cy - size * .88 && py <= cy + size * .8;
    const inTop = px >= cx - size * .62 && px <= cx + size * .62 && py >= cy - size * .88 && py <= cy - size * .6;
    const inFoot = px >= cx - size * .62 && px <= cx + size * .62 && py >= cy + size * .59 && py <= cy + size * .8;
    const inMiddle = px >= cx - size * .53 && px <= cx + size * .53 && py >= cy - size * .16 && py <= cy + size * .06;
    if (inStem || inTop || inFoot || inMiddle) color = [236, 244, 226, 255];
    pixels.set(color, offset);
  }
  const rows = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) pixels.copy(rows, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  const header = Buffer.alloc(13); header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4);
  header[8] = 8; header[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]);
}
await mkdir(new URL('../icons/', import.meta.url), { recursive: true });
for (const [name, size, maskable] of [['icon-192.png', 192, false], ['icon-512.png', 512, false], ['icon-512-maskable.png', 512, true]]) {
  await writeFile(new URL(`../icons/${name}`, import.meta.url), icon(size, maskable));
}
console.log('Iconos PNG generados: 192×192, 512×512 y 512×512 maskable.');
