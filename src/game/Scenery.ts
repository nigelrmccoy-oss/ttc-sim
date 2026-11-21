import * as THREE from 'three';
import type { Terrain } from './Terrain';
import type { Track } from './Track';

export interface CorridorData {
  source: string;
  buildings: { p: number[]; h: number; mh: number; est: 0 | 1; k: string }[];
  trees: number[];
  roads: { c: string; b: 0 | 1; p: number[] }[];
}

/** ESTIMATE road widths (m) by OSM highway class. */
export const ROAD_WIDTH: Record<string, number> = {
  motorway: 14, trunk: 12, primary: 11, secondary: 9, tertiary: 8, residential: 6.5, unclassified: 6, service: 4,
  motorway_link: 6, trunk_link: 6, primary_link: 6,
};
const BUCKET_M = 500; // scenery merged per 500 m square so it culls like the track chunks

function facadeTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#b8ad9c'; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#4a5560';
  for (const x of [14, 74]) g.fillRect(x, 34, 40, 52); // two windows per 4 m bay, one storey per tile
  g.fillStyle = '#a49a8a'; g.fillRect(0, 120, 128, 8);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Spatial hash of track samples for "is this near the open-air line?" checks. */
class TrackIndex {
  private cells = new Map<string, number[]>();
  constructor(private track: Track) {
    for (let s = 0; s <= track.length; s += 10) {
      const p = track.poseAt(s);
      const k = `${Math.floor(p.x / 50)},${Math.floor(p.z / 50)}`;
      (this.cells.get(k) ?? this.cells.set(k, []).get(k)!).push(s);
    }
  }
  nearest(x: number, z: number): { s: number; d: number } | null {
    const cx = Math.floor(x / 50), cz = Math.floor(z / 50);
    let best: { s: number; d: number } | null = null;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (const s of this.cells.get(`${cx + a},${cz + b}`) ?? []) {
      const p = this.track.poseAt(s), d = Math.hypot(p.x - x, p.z - z);
      if (!best || d < best.d) best = { s, d };
    }
    return best;
  }
  /** true when (x,z) is within r m of a track section that is not in tunnel */
  nearOpen(x: number, z: number, r: number): boolean {
    const n = this.nearest(x, z);
    return !!n && n.d < r && this.track.classAt(n.s) !== 'tunnel';
  }
}

export interface SceneryStats { buildings: number; estimatedHeights: number; trees: number; roads: number; meshes: number }

export function buildScenery(scene: THREE.Scene, data: CorridorData, terrain: Terrain, track: Track): SceneryStats {
  const idx = new TrackIndex(track);
  const stats: SceneryStats = { buildings: 0, estimatedHeights: 0, trees: 0, roads: 0, meshes: 0 };
  const bucket = (x: number, z: number) => `${Math.floor(x / BUCKET_M)},${Math.floor(z / BUCKET_M)}`;

  // ---------- Buildings ----------
  const facade = new THREE.MeshStandardMaterial({ map: facadeTexture(), roughness: 0.85 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x6e6c69, roughness: 0.95 });
  const walls = new Map<string, { pos: number[]; uv: number[] }>();
  const roofs = new Map<string, number[]>();
  for (const b of data.buildings) {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i < b.p.length; i += 2) pts.push(new THREE.Vector2(b.p[i], b.p[i + 1]));
    if (pts.length > 3 && pts[0].distanceTo(pts[pts.length - 1]) < 0.01) pts.pop();
    if (pts.length < 3) continue;
    if (pts.some((p) => idx.nearOpen(p.x, p.y, 6))) continue; // keep the open-air line clear
    let base = Infinity;
    for (const p of pts) { const h = terrain.heightAt(p.x, p.y); if (h != null) base = Math.min(base, h); }
    if (!Number.isFinite(base)) continue;
    base -= 0.3;
    const y0 = base + b.mh, y1 = base + Math.max(b.h, b.mh + 2.5);
    const c = pts.reduce((a, p) => a.add(p), new THREE.Vector2()).multiplyScalar(1 / pts.length);
    const key = bucket(c.x, c.y);
    const w = walls.get(key) ?? walls.set(key, { pos: [], uv: [] }).get(key)!;
    // Wall quads face outward when the ring is clockwise in (x, z) maths coordinates.
    if (!THREE.ShapeUtils.isClockWise(pts)) pts.reverse();
    let u = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], d = pts[(i + 1) % pts.length], len = a.distanceTo(d);
      w.pos.push(a.x, y0, a.y, d.x, y0, d.y, d.x, y1, d.y, a.x, y0, a.y, d.x, y1, d.y, a.x, y1, a.y);
      const u0 = u / 4, u1 = (u + len) / 4, v0 = 0, v1 = (y1 - y0) / 3.2;
      w.uv.push(u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1);
      u += len;
    }
    const tris = THREE.ShapeUtils.triangulateShape(pts, []);
    const r = roofs.get(key) ?? roofs.set(key, []).get(key)!;
    for (const t of tris) {
      const [p0, p1, p2] = [pts[t[0]], pts[t[1]], pts[t[2]]];
      const upY = (p1.y - p0.y) * (p2.x - p0.x) - (p1.x - p0.x) * (p2.y - p0.y); // y of (p1-p0)x(p2-p0)
      for (const p of upY >= 0 ? [p0, p1, p2] : [p0, p2, p1]) r.push(p.x, y1, p.y);
    }
    stats.buildings++;
    if (b.est) stats.estimatedHeights++;
  }
  for (const [key, w] of walls) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(w.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(w.uv, 2));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, facade);
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.Float32BufferAttribute(roofs.get(key)!, 3));
    rg.computeVertexNormals();
    const rm = new THREE.Mesh(rg, roofMat);
    rm.castShadow = rm.receiveShadow = true;
    scene.add(rm);
    stats.meshes += 2;
  }

  // ---------- Trees (instanced; ESTIMATE 7-13 m tall) ----------
  const trunk = new THREE.CylinderGeometry(0.18, 0.28, 3, 6).translate(0, 1.5, 0);
  const crown = new THREE.IcosahedronGeometry(2.6, 1).scale(1, 1.25, 1).translate(0, 5.2, 0);
  const treeMats = [new THREE.MeshStandardMaterial({ color: 0x5b4636, roughness: 1 }), new THREE.MeshStandardMaterial({ color: 0x4d6a36, roughness: 0.9, flatShading: true })];
  const treeBuckets = new Map<string, THREE.Matrix4[]>();
  const q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < data.trees.length; i += 2) {
    const x = data.trees[i], z = data.trees[i + 1];
    if (idx.nearOpen(x, z, 5)) continue;
    const h = terrain.heightAt(x, z);
    if (h == null) continue;
    const r = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1; // deterministic jitter
    const sc = 0.8 + r * 0.6;
    q.setFromAxisAngle(up, r * Math.PI * 2);
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, h - 0.1, z), q, new THREE.Vector3(sc, sc, sc));
    const key = bucket(x, z);
    (treeBuckets.get(key) ?? treeBuckets.set(key, []).get(key)!).push(m);
    stats.trees++;
  }
  for (const list of treeBuckets.values()) {
    for (const [g, mat] of [[trunk, treeMats[0]], [crown, treeMats[1]]] as const) {
      const inst = new THREE.InstancedMesh(g, mat, list.length);
      list.forEach((m, k) => inst.setMatrixAt(k, m));
      inst.computeBoundingSphere();
      inst.castShadow = true; inst.receiveShadow = true;
      scene.add(inst);
      stats.meshes++;
    }
  }

  // ---------- Roads draped on the terrain ----------
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x3b3b3d, roughness: 0.95, transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
  const roadBuckets = new Map<string, number[]>();
  const roadY = (x: number, z: number) => {
    const h = terrain.heightAt(x, z);
    if (h == null) return null;
    // Over the open cut the terrain is carved; keep the road at original street level (a bridge).
    const n = idx.nearest(x, z);
    if (n && n.d < 12 && track.classAt(n.s) !== 'tunnel') return Math.max(h, track.groundAt(n.s)) + 0.2;
    return h + 0.2;
  };
  for (const r of data.roads) {
    const w = (ROAD_WIDTH[r.c] ?? 6) / 2;
    const pts: [number, number][] = [];
    for (let i = 0; i < r.p.length - 2; i += 2) { // subdivide every ~6 m so it follows the terrain
      const ax = r.p[i], az = r.p[i + 1], bx = r.p[i + 2], bz = r.p[i + 3];
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 6));
      for (let k = 0; k < n; k++) pts.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]);
    }
    pts.push([r.p[r.p.length - 2], r.p[r.p.length - 1]]);
    if (pts.length < 2) continue;
    const key = bucket(pts[0][0], pts[0][1]);
    const out = roadBuckets.get(key) ?? roadBuckets.set(key, []).get(key)!;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
      const len = Math.hypot(bx - ax, bz - az) || 1;
      const nx = (-(bz - az) / len) * w, nz = ((bx - ax) / len) * w;
      const ya = roadY(ax, az), yb = roadY(bx, bz);
      if (ya == null || yb == null) continue;
      out.push(ax + nx, ya, az + nz, bx + nx, yb, bz + nz, ax - nx, ya, az - nz, ax - nx, ya, az - nz, bx + nx, yb, bz + nz, bx - nx, yb, bz - nz);
    }
    stats.roads++;
  }
  for (const arr of roadBuckets.values()) {
    if (!arr.length) continue;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, roadMat);
    m.receiveShadow = true;
    m.renderOrder = 1;
    scene.add(m);
    stats.meshes++;
  }
  return stats;
}
