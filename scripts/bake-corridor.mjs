/**
 * Turn the Overpass corridor extract (buildings, trees, roads within ~220 m of Line 1) into
 * public/data/corridor.json in local metres. Source: OpenStreetMap contributors (ODbL 1.0).
 * Heights: OSM height / building:levels tags; otherwise an ESTIMATE by building type (flagged).
 * Raw: scripts/raw/corridor-features.json (Overpass, see README for the query).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { toLocal } from './lib-geo.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const raw = JSON.parse(fs.readFileSync(path.join(root, 'scripts/raw/corridor-features.json'), 'utf8'));
const r1 = (v) => Math.round(v * 10) / 10;
const LEVEL_M = 3.2; // ESTIMATE storey height
const TYPE_HEIGHT = { house: 8, detached: 8, semidetached_house: 8, terrace: 9, garage: 3, garages: 3, shed: 3, roof: 5, apartments: 18, residential: 10, commercial: 10, retail: 7, industrial: 9, warehouse: 9, office: 20, school: 10, university: 14, college: 14, hospital: 20, church: 14, train_station: 8, transportation: 7, parking: 9, hotel: 30, construction: 6 };
const parseH = (v) => { if (!v) return null; const m = String(v).match(/[\d.]+/); if (!m) return null; const n = +m[0]; return /ft|'/.test(v) ? n * 0.3048 : n; };
const buildings = [], trees = [], roads = [];
let estH = 0;
const ring = (geom) => geom.map((g) => toLocal(g.lat, g.lon).map(r1)).flat();
for (const e of raw.elements) {
  const t = e.tags ?? {};
  if (t.building && (e.type === 'way' || e.type === 'relation')) {
    if (t.building === 'roof' || t.location === 'underground' || t.layer?.startsWith?.('-')) continue;
    let outer = null;
    if (e.type === 'way' && e.geometry) outer = e.geometry;
    if (e.type === 'relation') outer = e.members?.find((m) => m.role === 'outer' && m.geometry)?.geometry;
    if (!outer || outer.length < 4) continue;
    let h = parseH(t.height) ?? (t['building:levels'] ? +t['building:levels'] * LEVEL_M + 1 : null);
    const minH = parseH(t.min_height) ?? (t['building:min_level'] ? +t['building:min_level'] * LEVEL_M : 0);
    const est = h == null;
    if (est) { h = TYPE_HEIGHT[t.building] ?? 9; estH++; }
    buildings.push({ p: ring(outer), h: r1(h), mh: r1(minH), est: est ? 1 : 0, k: t.building });
  } else if (t.natural === 'tree' && e.type === 'node') {
    trees.push(...toLocal(e.lat, e.lon).map(r1));
  } else if (t.natural === 'tree_row' && e.geometry) {
    for (let i = 0; i < e.geometry.length - 1; i++) { // ESTIMATE: one tree every 8 m along a tree row
      const a = toLocal(e.geometry[i].lat, e.geometry[i].lon), b = toLocal(e.geometry[i + 1].lat, e.geometry[i + 1].lon);
      const n = Math.max(1, Math.floor(Math.hypot(b[0] - a[0], b[1] - a[1]) / 8));
      for (let k = 0; k < n; k++) trees.push(r1(a[0] + ((b[0] - a[0]) * k) / n), r1(a[1] + ((b[1] - a[1]) * k) / n));
    }
  } else if (t.highway && e.geometry) {
    if (t.tunnel === 'yes' || t.layer?.startsWith?.('-')) continue;
    roads.push({ c: t.highway, b: t.bridge === 'yes' ? 1 : 0, p: ring(e.geometry) });
  }
}
fs.writeFileSync(path.join(root, 'public/data/corridor.json'), JSON.stringify({
  source: 'OpenStreetMap contributors, ODbL 1.0, via Overpass API (features within ~220 m of relation 102388)',
  fetched: fs.statSync(path.join(root, 'scripts/raw/corridor-features.json')).mtime.toISOString(),
  heightNote: `building height from OSM height / building:levels x ${LEVEL_M} m + 1 m; est=1 marks an ESTIMATE by building type`,
  buildings, trees, roads,
}));
console.log(`buildings ${buildings.length} (${estH} estimated heights), trees ${trees.length / 2}, roads ${roads.length}`);
