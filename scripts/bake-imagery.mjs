/**
 * Fetch Ontario Imagery Web Map Service (OIWMS) orthophoto tiles for every terrain tile and
 * build two textures per tile: *_lo.jpg (the z15 tile, 256 px, ~3.5 m/px) and *_hi.jpg
 * (4x4 z17 tiles stitched, 1024 px, ~0.86 m/px) for tiles within HI_RADIUS of the track.
 *
 * Imagery: Ontario Imagery Web Map Service, Ontario Ministry of Natural Resources (Toronto area:
 * South Central Ontario Orthophotography Project 2023). Open Government Licence - Ontario.
 * Raw tiles are cached in cache/oiwms/ and outputs written to public/imagery/; both are
 * git-ignored (we link the service instead of redistributing the imagery).
 * Usage: node scripts/bake-imagery.mjs   (needs public/data/terrain/index.json)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import jpeg from 'jpeg-js';
import { toLocal, tileLat, tileLon } from './lib-geo.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://ws.lioservices.lrc.gov.on.ca/arcgis2/rest/services/LIO_Imagery/Ontario_Imagery_Web_Map_Service/MapServer/tile';
const HI_RADIUS = 250; // m from track centreline to the nearest tile edge that earns a hi-res texture
const cacheDir = path.join(root, 'cache/oiwms'), outDir = path.join(root, 'public/imagery');
fs.mkdirSync(cacheDir, { recursive: true }); fs.mkdirSync(outDir, { recursive: true });
const index = JSON.parse(fs.readFileSync(path.join(root, 'public/data/terrain/index.json'), 'utf8'));
const track = JSON.parse(fs.readFileSync(path.join(root, 'public/data/line1.json'), 'utf8')).track;

let fetched = 0, cached = 0, failed = 0;
async function tile(z, x, y) {
  const f = path.join(cacheDir, `${z}_${y}_${x}.jpg`);
  if (fs.existsSync(f)) { cached++; return fs.readFileSync(f); }
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${BASE}/${z}/${y}/${x}`, { headers: { 'User-Agent': 'ttc-sim-bake/0.2 (personal fan project)' } });
      if (res.ok) { const b = Buffer.from(await res.arrayBuffer()); fs.writeFileSync(f, b); fetched++; return b; }
    } catch {}
    await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
  }
  failed++; return null;
}
function distToTrack(x, z) {
  let best = Infinity;
  for (let i = 0; i < track.length - 1; i += 1) {
    const a = track[i], b = track[i + 1], vx = b[0] - a[0], vz = b[1] - a[1], L2 = vx * vx + vz * vz || 1e-9;
    const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / L2));
    best = Math.min(best, Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t));
  }
  return best;
}
const out = [];
const queue = [...index.tiles];
async function worker() {
  while (queue.length) {
    const t = queue.shift();
    const name = `${t.z}_${t.x}_${t.y}`;
    const lo = await tile(t.z, t.x, t.y);
    if (lo) fs.writeFileSync(path.join(outDir, `${name}_lo.jpg`), lo);
    // Hi-res only where the tile is close to the line (distance from tile centre minus half-diagonal).
    const [cx, cz] = toLocal((tileLat(t.y, t.z) + tileLat(t.y + 1, t.z)) / 2, (tileLon(t.x, t.z) + tileLon(t.x + 1, t.z)) / 2);
    const near = distToTrack(cx, cz) - 630 < HI_RADIUS;
    let hi = false;
    if (near && !fs.existsSync(path.join(outDir, `${name}_hi.jpg`))) {
      const W = 1024, buf = Buffer.alloc(W * W * 4);
      let ok = true;
      for (let j = 0; j < 4 && ok; j++) for (let i = 0; i < 4; i++) {
        const b = await tile(t.z + 2, t.x * 4 + i, t.y * 4 + j);
        if (!b) { ok = false; break; }
        const img = jpeg.decode(b, { useTArray: true, formatAsRGBA: true });
        for (let row = 0; row < 256; row++) Buffer.from(img.data.buffer, img.data.byteOffset + row * 256 * 4, 256 * 4).copy(buf, ((j * 256 + row) * W + i * 256) * 4);
      }
      if (ok) { fs.writeFileSync(path.join(outDir, `${name}_hi.jpg`), jpeg.encode({ data: buf, width: W, height: W }, 82).data); hi = true; }
    } else if (near) hi = true;
    out.push({ ...t, lo: !!lo, hi });
    process.stdout.write(`\rimagery ${out.length}/${index.tiles.length} (fetched ${fetched}, cached ${cached}, failed ${failed})`);
  }
}
await Promise.all([...Array(4)].map(worker));
console.log();
fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify({
  attribution: 'Imagery: Ontario Imagery Web Map Service, Ontario Ministry of Natural Resources (South Central Ontario Orthophotography Project 2023). Contains information licensed under the Open Government Licence – Ontario.',
  service: BASE.replace(/\/tile$/, ''),
  fetched: new Date().toISOString(),
  tiles: out.map(({ z, x, y, lo, hi }) => ({ z, x, y, lo, hi })),
}));
console.log(`imagery: ${out.filter((t) => t.lo).length} lo, ${out.filter((t) => t.hi).length} hi, ${failed} failed tile fetches`);
