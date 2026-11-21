import * as THREE from 'three';
import { Track, TRACK_GAUGE_M, type Station } from './Track';

/**
 * Sweep a rectangular cross-section along the track between chainages s0..s1.
 * Cross-section is given in track-local coords: lateral (+ = right of travel), y up.
 */
export function sweepBox(track: Track, s0: number, s1: number, latMin: number, latMax: number,
  yMin: number, yMax: number, step = 2): THREE.BufferGeometry {
  const n = Math.max(2, Math.ceil((s1 - s0) / step) + 1);
  const corners: [number, number][] = [[latMin, yMax], [latMax, yMax], [latMax, yMin], [latMin, yMin]];
  const pos: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i < n; i++) {
    const p = track.poseAt(s0 + ((s1 - s0) * i) / (n - 1));
    const rx = -p.tz, rz = p.tx; // right-hand normal
    for (const [lat, y] of corners) pos.push(p.x + rx * lat, y, p.z + rz * lat);
  }
  for (let i = 0; i < n - 1; i++) {
    for (let f = 0; f < 4; f++) {
      const a = i * 4 + f, b = i * 4 + ((f + 1) % 4), c = (i + 1) * 4 + f, d = (i + 1) * 4 + ((f + 1) % 4);
      idx.push(a, b, c, b, d, c);
    }
  }
  // End caps
  for (const [base, flip] of [[0, true], [(n - 1) * 4, false]] as [number, boolean][]) {
    if (flip) idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
    else idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** ESTIMATE: platform geometry relative to track centreline. */
export const PLATFORM_EDGE_OFFSET_M = 1.6;
export const PLATFORM_WIDTH_M = 4.5;
export const PLATFORM_HEIGHT_M = 1.05;

function signTexture(text: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#1f2a33';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#f4f6f8';
  ctx.font = '600 64px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, c.width / 2, c.height / 2 + 4);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildWorld(scene: THREE.Scene, track: Track, stations: Station[]): void {
  const L = track.length;
  // Build the running line in ~500 m chunks so three.js frustum culling can skip off-screen
  // pieces (one 38 km mesh is always "visible" and renders very slowly on software GL).
  const CHUNK_M = 500;
  const bedMat = new THREE.MeshStandardMaterial({ color: 0x4a4744, roughness: 1 });
  const railMat = new THREE.MeshStandardMaterial({ color: 0x9ea3a8, metalness: 0.8, roughness: 0.35 });
  const sleeperMat = new THREE.MeshStandardMaterial({ color: 0x5b5048, roughness: 1 });
  const sleeper = new THREE.BoxGeometry(2.6, 0.17, 0.24);
  const half = TRACK_GAUGE_M / 2;
  const spacing = 0.75; // ESTIMATE: sleeper spacing
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  const one = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  for (let s0 = 0; s0 < L; s0 += CHUNK_M) {
    const s1 = Math.min(L, s0 + CHUNK_M);
    scene.add(new THREE.Mesh(sweepBox(track, s0, s1, -1.9, 1.9, -0.3, 0.0, 4), bedMat));
    for (const side of [-1, 1]) {
      const inner = side * half;
      scene.add(new THREE.Mesh(sweepBox(track, s0, s1, Math.min(inner, inner + side * 0.07), Math.max(inner, inner + side * 0.07), 0.17, 0.32, 2), railMat));
    }
    const first = Math.ceil(s0 / spacing), last = Math.floor((s1 - 1e-6) / spacing);
    const count = Math.max(0, last - first + 1);
    if (!count) continue;
    const sleepers = new THREE.InstancedMesh(sleeper, sleeperMat, count);
    for (let k = 0; k < count; k++) {
      const pose = track.poseAt((first + k) * spacing);
      q.setFromAxisAngle(up, Math.atan2(pose.tx, pose.tz));
      m.compose(p.set(pose.x, 0.085, pose.z), q, one);
      sleepers.setMatrixAt(k, m);
    }
    sleepers.computeBoundingSphere();
    scene.add(sleepers);
  }

  const platMat = new THREE.MeshStandardMaterial({ color: 0xb9b4aa, roughness: 0.9 });
  const edgeMat = new THREE.MeshStandardMaterial({ color: 0xe8c51a, roughness: 0.8 }); // tactile edge strip
  for (const st of stations) {
    if (st.platformStartM == null || st.platformEndM == null) continue;
    const sign = st.platformSideEstimate === 'left' ? -1 : 1;
    const a = PLATFORM_EDGE_OFFSET_M, b = PLATFORM_EDGE_OFFSET_M + PLATFORM_WIDTH_M;
    const lat0 = sign > 0 ? a : -b, lat1 = sign > 0 ? b : -a;
    scene.add(new THREE.Mesh(sweepBox(track, st.platformStartM, st.platformEndM, lat0, lat1, 0, PLATFORM_HEIGHT_M, 2), platMat));
    const e0 = sign > 0 ? a : -a - 0.6, e1 = sign > 0 ? a + 0.6 : -a;
    scene.add(new THREE.Mesh(sweepBox(track, st.platformStartM, st.platformEndM, e0, e1, PLATFORM_HEIGHT_M, PLATFORM_HEIGHT_M + 0.01, 2), edgeMat));

    const mid = (st.platformStartM + st.platformEndM) / 2;
    const pose = track.poseAt(mid);
    const lat = sign * (PLATFORM_EDGE_OFFSET_M + PLATFORM_WIDTH_M - 0.3);
    const sign3d = new THREE.Mesh(new THREE.PlaneGeometry(8, 1), new THREE.MeshBasicMaterial({ map: signTexture(st.name), side: THREE.DoubleSide }));
    sign3d.position.set(pose.x - pose.tz * lat, PLATFORM_HEIGHT_M + 2.6, pose.z + pose.tx * lat);
    sign3d.rotation.y = Math.atan2(pose.tx, pose.tz) + (sign > 0 ? Math.PI / 2 : -Math.PI / 2);
    scene.add(sign3d);
  }

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(120_000, 120_000),
    new THREE.MeshStandardMaterial({ color: 0x1d2320, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.31;
  const c = track.poseAt(L / 2);
  ground.position.x = c.x; ground.position.z = c.z;
  scene.add(ground);
}
