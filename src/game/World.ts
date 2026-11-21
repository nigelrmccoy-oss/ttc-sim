import * as THREE from 'three';
import { Track, TRACK_GAUGE_M, TRACK_SPACING_M, type Station, type StationInfo } from './Track';

/** Track-local cross-section point: [lateral (+ = right of travel), height above rail top]. */
export type XS = [number, number];

/**
 * Sweep a cross-section polyline along the track between chainages s0..s1. The profile may
 * change with s (it must keep the same number of points). closed = join last point to first.
 * uScale: texture u = chainage / uScale (for ring / joint textures).
 */
export function sweep(track: Track, s0: number, s1: number, profile: (s: number) => XS[], step = 2, closed = false, uScale = 0): THREE.BufferGeometry {
  const n = Math.max(2, Math.ceil((s1 - s0) / step) + 1);
  const m = profile(s0).length;
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i < n; i++) {
    const s = s0 + ((s1 - s0) * i) / (n - 1);
    const p = track.poseAt(s);
    const rx = -p.tz, rz = p.tx;
    const prof = profile(s);
    let acc = 0;
    for (let k = 0; k < m; k++) {
      const [lat, y] = prof[k];
      if (k > 0) acc += Math.hypot(lat - prof[k - 1][0], y - prof[k - 1][1]);
      pos.push(p.x + rx * lat, p.y + y, p.z + rz * lat);
      uv.push(uScale ? s / uScale : s / 4, acc / 4);
    }
  }
  const segs = closed ? m : m - 1;
  for (let i = 0; i < n - 1; i++) for (let k = 0; k < segs; k++) {
    const k2 = (k + 1) % m;
    const a = i * m + k, b = i * m + k2, c = (i + 1) * m + k, d = (i + 1) * m + k2;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Closed rectangular section [latMin..latMax] x [yMin..yMax] relative to rail. */
export const boxXS = (latMin: number, latMax: number, yMin: number, yMax: number): XS[] =>
  [[latMin, yMax], [latMax, yMax], [latMax, yMin], [latMin, yMin]];

// ---- Dimensions: ESTIMATES unless noted ----
export const PLATFORM_EDGE_OFFSET_M = 1.6;
export const SIDE_PLATFORM_WIDTH_M = 4.5;
export const ISLAND_PLATFORM_WIDTH_M = 7.0;
export const PLATFORM_HEIGHT_M = 1.05;
export const BOX_HALF_CLEAR_M = 2.3;     // track centre to box wall
export const BOX_ROOF_M = 5.0;           // rail top to box roof
export const STATION_ROOF_M = 5.6;
/** Documented: TYSSE bored tunnels have a 5.4 m internal diameter (TBM magazine 2013; TAC 2012). */
export const BORE_ID_M = 5.4;
export const BORE_AXIS_ABOVE_RAIL_M = 1.7; // ESTIMATE (rail ~1 m above invert)
export const RING_WIDTH_M = 1.5;           // ESTIMATE lining ring width
export const BLEND_M = 80;                 // track spread taper at island platforms

export type PlatformSide = 'left' | 'right';
export interface StationLayout {
  st: Station;
  info: StationInfo | null;
  s0: number;
  s1: number;
  side: PlatformSide;
  island: boolean;
  /** where the side came from: Wikipedia platform type, or the OSM polygon side estimate */
  sideBasis: 'wikipedia' | 'osm-estimate';
}

export function layoutStations(stations: Station[], info: StationInfo[]): StationLayout[] {
  const byName = new Map(info.map((i) => [i.name, i]));
  return stations.filter((s) => s.platformStartM != null && s.platformEndM != null).map((st) => {
    const inf = byName.get(st.name) ?? null;
    const t = inf?.platformType ?? '';
    // Trains run on the right-hand track, so an island platform (between the tracks) is on the
    // driver's left and side platforms are on the right. 'island+side' stations get the island.
    const island = /island/.test(t);
    const side: PlatformSide = t ? (island ? 'left' : 'right') : st.platformSideEstimate === 'left' ? 'left' : 'right';
    return { st, info: inf, s0: st.platformStartM!, s1: st.platformEndM!, side, island, sideBasis: t ? 'wikipedia' : 'osm-estimate' };
  });
}

/** Lateral offset of the other running track (null where it runs in its own bore). */
export function otherTrackLat(track: Track, layouts: StationLayout[], s: number): number | null {
  if (track.constructionAt(s).startsWith('bored')) return null;
  let lat = -TRACK_SPACING_M;
  for (const l of layouts) {
    if (!l.island) continue;
    const spread = -(2 * PLATFORM_EDGE_OFFSET_M + ISLAND_PLATFORM_WIDTH_M);
    const w = s < l.s0 ? 1 - (l.s0 - s) / BLEND_M : s > l.s1 ? 1 - (s - l.s1) / BLEND_M : 1;
    if (w > 0) lat = Math.min(lat, -TRACK_SPACING_M + (spread + TRACK_SPACING_M) * smoothstep(w));
  }
  return lat;
}
const smoothstep = (t: number) => t * t * (3 - 2 * t);

function stationAt(layouts: StationLayout[], s: number, pad = 10): StationLayout | undefined {
  return layouts.find((l) => s >= l.s0 - pad && s <= l.s1 + pad);
}

/** Box cross-section (inner faces) at s: walls widen to wrap platforms at stations. */
function boxSection(track: Track, layouts: StationLayout[], s: number): XS[] {
  const o = otherTrackLat(track, layouts, s) ?? -TRACK_SPACING_M;
  const stn = stationAt(layouts, s, 0);
  let right = BOX_HALF_CLEAR_M, left = o - BOX_HALF_CLEAR_M, roof = BOX_ROOF_M;
  if (stn) {
    roof = STATION_ROOF_M;
    if (!stn.island) { right = PLATFORM_EDGE_OFFSET_M + SIDE_PLATFORM_WIDTH_M + 0.3; left = o - PLATFORM_EDGE_OFFSET_M - SIDE_PLATFORM_WIDTH_M - 0.3; }
  }
  return [[right, -0.4], [right, roof], [left, roof], [left, -0.4]];
}

function boredSection(): XS[] {
  const r = BORE_ID_M / 2, cy = BORE_AXIS_ABOVE_RAIL_M;
  const a0 = Math.asin((-0.4 - cy) / r); // where the circle meets the track bed
  const pts: XS[] = [];
  const n = 28;
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((Math.PI - 2 * a0) * i) / n; // right-bottom -> over the top -> left-bottom
    pts.push([r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return pts;
}

function ringTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#8d8a84'; g.fillRect(0, 0, 64, 64);
  g.fillStyle = '#6d6a65'; g.fillRect(0, 0, 3, 64);           // ring joint
  g.fillStyle = '#7b7873'; g.fillRect(0, 31, 64, 2);          // segment joint
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function signCanvas(text: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 2048; c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#17212a'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#f5f7f9';
  let size = 168;
  g.font = `700 ${size}px system-ui, sans-serif`;
  while (g.measureText(text).width > c.width - 120 && size > 60) { size -= 8; g.font = `700 ${size}px system-ui, sans-serif`; }
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, c.width / 2, c.height / 2 + 6);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export interface WorldStats { chunks: number; tunnelM: number; boredM: number; viaductM: number; portals: number }

export function buildWorld(scene: THREE.Scene, track: Track, layouts: StationLayout[]): WorldStats {
  const L = track.length;
  const CHUNK_M = 500; // per-chunk meshes so frustum culling can skip off-screen line
  const mats = {
    ballast: new THREE.MeshStandardMaterial({ color: 0x5a554f, roughness: 1 }),
    invert: new THREE.MeshStandardMaterial({ color: 0x55534f, roughness: 1 }),
    rail: new THREE.MeshStandardMaterial({ color: 0x9ea3a8, metalness: 0.85, roughness: 0.35 }),
    sleeper: new THREE.MeshStandardMaterial({ color: 0x6b625a, roughness: 1 }),
    // Small emissive terms stand in for tunnel and station lighting (no per-lamp lights: frame budget).
    box: new THREE.MeshStandardMaterial({ color: 0x8a8780, roughness: 0.92, side: THREE.DoubleSide, emissive: 0x1a1916 }),
    bore: new THREE.MeshStandardMaterial({ map: ringTexture(), roughness: 0.9, side: THREE.DoubleSide, emissive: 0x1a1916 }),
    stationWall: new THREE.MeshStandardMaterial({ color: 0xc9c4b6, roughness: 0.6, side: THREE.DoubleSide, emissive: 0x6a665c }),
    wall: new THREE.MeshStandardMaterial({ color: 0x9b978e, roughness: 0.9, side: THREE.DoubleSide }),
    deck: new THREE.MeshStandardMaterial({ color: 0xa29e95, roughness: 0.85 }),
    platform: new THREE.MeshStandardMaterial({ color: 0xb9b4aa, roughness: 0.9, emissive: 0x3a3832 }),
    edge: new THREE.MeshStandardMaterial({ color: 0xe8c51a, roughness: 0.8 }),
    lamp: new THREE.MeshBasicMaterial({ color: 0xfff1cf }),
  };
  const add = (g: THREE.BufferGeometry, m: THREE.Material, cast = false) => {
    const mesh = new THREE.Mesh(g, m);
    mesh.receiveShadow = true;
    mesh.castShadow = cast;
    scene.add(mesh);
    return mesh;
  };
  const half = TRACK_GAUGE_M / 2;
  const railXS = (c: number, side: number): XS[] => boxXS(Math.min(c + side * half, c + side * (half + 0.07)), Math.max(c + side * half, c + side * (half + 0.07)), -0.15, 0);
  const sleeper = new THREE.BoxGeometry(2.6, 0.17, 0.24);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
  const stats: WorldStats = { chunks: 0, tunnelM: 0, boredM: 0, viaductM: 0, portals: 0 };

  // Runs of equal "kind" inside [a,b), sampled every 5 m.
  const runs = (a: number, b: number, kindAt: (s: number) => string) => {
    const out: { k: string; s0: number; s1: number }[] = [];
    for (let s = a; s < b; s += 5) {
      const k = kindAt(s + 2.5), last = out[out.length - 1];
      if (last && last.k === k) last.s1 = Math.min(b, s + 5); else out.push({ k, s0: s, s1: Math.min(b, s + 5) });
    }
    return out;
  };
  const kindOf = (s: number) => {
    const c = track.classAt(s);
    if (c !== 'tunnel') return c;
    return track.constructionAt(s).startsWith('bored') && !stationAt(layouts, s, 20) ? 'bored' : 'box';
  };

  for (let c0 = 0; c0 < L; c0 += CHUNK_M) {
    const c1 = Math.min(L, c0 + CHUNK_M);
    stats.chunks++;
    for (const r of runs(c0, c1, kindOf)) {
      const len = r.s1 - r.s0;
      // Track bed: ballast outside, concrete invert in tunnels.
      add(sweep(track, r.s0, r.s1, () => boxXS(-1.9, 1.9, -0.6, -0.17), 4, true), r.k === 'open' || r.k === 'bridge' ? mats.ballast : mats.invert);
      if (r.k === 'box') {
        stats.tunnelM += len;
        add(sweep(track, r.s0, r.s1, (s) => boxSection(track, layouts, s), 4, false), stationAt(layouts, (r.s0 + r.s1) / 2, 0) ? mats.stationWall : mats.box, true);
      } else if (r.k === 'bored') {
        stats.tunnelM += len; stats.boredM += len;
        add(sweep(track, r.s0, r.s1, boredSection, 3, false, RING_WIDTH_M), mats.bore, true);
      } else if (r.k === 'bridge') {
        stats.viaductM += len;
        add(sweep(track, r.s0, r.s1, (s) => { const o = otherTrackLat(track, layouts, s) ?? -TRACK_SPACING_M; return boxXS(o - 2.6, 2.6, -1.8, -0.55); }, 4, true), mats.deck, true);
        for (const side of [1, -1]) add(sweep(track, r.s0, r.s1, (s) => { const o = otherTrackLat(track, layouts, s) ?? -TRACK_SPACING_M; const e = side > 0 ? 2.6 : o - 2.6; return boxXS(e - 0.25, e, -0.6, 0.9); }, 4, true), mats.deck, true);
        for (let s = r.s0 + 10; s < r.s1 - 5; s += 22) { // piers (ESTIMATE spacing)
          const p = track.poseAt(s), gnd = track.groundAt(s), h = p.y - 1.8 - gnd + 1;
          if (h < 1) continue;
          const pier = new THREE.Mesh(new THREE.BoxGeometry(5.5, h, 1.4), mats.deck);
          const lat = -TRACK_SPACING_M / 2;
          pier.position.set(p.x - p.tz * lat, p.y - 1.8 - h / 2, p.z + p.tx * lat);
          pier.rotation.y = Math.atan2(p.tx, p.tz);
          pier.castShadow = pier.receiveShadow = true;
          scene.add(pier);
        }
      } else {
        // Open sections: retaining walls where the line runs below the surrounding ground.
        const depth = (s: number) => Math.max(0, Math.min(12, track.groundAt(s) - track.railAt(s)));
        if (depth((r.s0 + r.s1) / 2) > 0.8 || depth(r.s0) > 0.8 || depth(r.s1) > 0.8) {
          for (const side of [1, -1]) add(sweep(track, r.s0, r.s1, (s) => {
            const o = otherTrackLat(track, layouts, s) ?? -TRACK_SPACING_M;
            const e = side > 0 ? 3.2 : o - 3.2;
            return [[e, -0.6], [e, Math.max(0.4, depth(s))]];
          }, 4, false), mats.wall, true);
        }
      }
      // Tunnel lights every 25 m on the right wall (ESTIMATE spacing).
      if (r.k === 'box' || r.k === 'bored') {
        for (let s = Math.ceil(r.s0 / 25) * 25; s < r.s1; s += 25) {
          if (stationAt(layouts, s, 0)) continue;
          const p = track.poseAt(s), lat = r.k === 'bored' ? 2.2 : BOX_HALF_CLEAR_M - 0.05;
          const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 1.2), mats.lamp);
          lamp.position.set(p.x - p.tz * lat, p.y + 3.4, p.z + p.tx * lat);
          lamp.rotation.y = Math.atan2(p.tx, p.tz);
          scene.add(lamp);
        }
      }
    }

    // Rails (our track everywhere; the other track where it shares the structure).
    for (const side of [-1, 1]) add(sweep(track, c0, c1, () => railXS(0, side), 2, true), mats.rail);
    const otherRuns = runs(c0, c1, (s) => (otherTrackLat(track, layouts, s) == null ? 'none' : 'yes')).filter((r) => r.k === 'yes');
    for (const r of otherRuns) for (const side of [-1, 1]) {
      add(sweep(track, r.s0, r.s1, (s) => { const o = otherTrackLat(track, layouts, s)!; return railXS(o, side); }, 2, true), mats.rail);
      add(sweep(track, r.s0, r.s1, (s) => { const o = otherTrackLat(track, layouts, s)!; return boxXS(o - 1.9, o + 1.9, -0.6, -0.17); }, 4, true), track.classAt((r.s0 + r.s1) / 2) === 'tunnel' ? mats.invert : mats.ballast);
    }
    // Sleepers (ESTIMATE 0.75 m spacing) for both tracks.
    const spacing = 0.75;
    const first = Math.ceil(c0 / spacing), last = Math.floor((c1 - 1e-6) / spacing);
    const lats: [number, number][] = [];
    for (let k = first; k <= last; k++) {
      lats.push([k * spacing, 0]);
      const o = otherTrackLat(track, layouts, k * spacing);
      if (o != null) lats.push([k * spacing, o]);
    }
    if (lats.length) {
      const inst = new THREE.InstancedMesh(sleeper, mats.sleeper, lats.length);
      lats.forEach(([s, lat], k) => {
        const p = track.poseAt(s);
        q.setFromAxisAngle(up, Math.atan2(p.tx, p.tz));
        m4.compose(v.set(p.x - p.tz * lat, p.y - 0.235, p.z + p.tx * lat), q, one);
        inst.setMatrixAt(k, m4);
      });
      inst.computeBoundingSphere();
      inst.receiveShadow = true;
      scene.add(inst);
    }
  }

  // Portals: a headwall across the line with an opening the size of the box.
  for (const portal of track.profile?.portals ?? []) {
    stats.portals++;
    const p = track.poseAt(portal.s);
    const o = otherTrackLat(track, layouts, portal.s) ?? -TRACK_SPACING_M;
    const top = Math.max(BOX_ROOF_M + 1.5, track.groundAt(portal.s) - p.y + 1.0);
    const shape = new THREE.Shape([new THREE.Vector2(o - 9, -0.6), new THREE.Vector2(9, -0.6), new THREE.Vector2(9, top), new THREE.Vector2(o - 9, top)]);
    shape.holes.push(new THREE.Path([new THREE.Vector2(o - BOX_HALF_CLEAR_M, -0.5), new THREE.Vector2(o - BOX_HALF_CLEAR_M, BOX_ROOF_M), new THREE.Vector2(BOX_HALF_CLEAR_M, BOX_ROOF_M), new THREE.Vector2(BOX_HALF_CLEAR_M, -0.5)]));
    const g = new THREE.ShapeGeometry(shape);
    // Shape x = lateral (right of travel), y = up; mesh faces along the track tangent.
    const basis = new THREE.Matrix4().makeBasis(new THREE.Vector3(-p.tz, 0, p.tx), new THREE.Vector3(0, 1, 0), new THREE.Vector3(-p.tx, 0, -p.tz)); // right-handed: right x up = -tangent
    const wall = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x9a968c, roughness: 0.9, side: THREE.DoubleSide }));
    wall.applyMatrix4(basis);
    wall.position.set(p.x, p.y, p.z);
    wall.castShadow = wall.receiveShadow = true;
    scene.add(wall);
    if (portal.name) { // the documented, named portal carries its name over the opening
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(7, 0.9), new THREE.MeshBasicMaterial({ map: signCanvas(portal.name.toUpperCase()), side: THREE.DoubleSide }));
      sign.applyMatrix4(basis);
      sign.position.set(p.x - p.tz * (o / 2), p.y + BOX_ROOF_M + 0.7, p.z + p.tx * (o / 2));
      scene.add(sign);
    }
  }

  // Platforms and station name signs.
  for (const l of layouts) {
    const sgn = l.side === 'left' ? -1 : 1;
    const W = l.island ? ISLAND_PLATFORM_WIDTH_M : SIDE_PLATFORM_WIDTH_M;
    const a = PLATFORM_EDGE_OFFSET_M, b = a + W;
    add(sweep(track, l.s0, l.s1, () => boxXS(sgn > 0 ? a : -b, sgn > 0 ? b : -a, -0.6, PLATFORM_HEIGHT_M), 2, true), mats.platform, true);
    add(sweep(track, l.s0, l.s1, () => boxXS(sgn > 0 ? a : -a - 0.6, sgn > 0 ? a + 0.6 : -a, PLATFORM_HEIGHT_M, PLATFORM_HEIGHT_M + 0.01), 2, true), mats.edge);
    if (!l.island) { // the opposite side platform for the other track
      add(sweep(track, l.s0, l.s1, (s) => { const o = otherTrackLat(track, layouts, s) ?? -TRACK_SPACING_M; return boxXS(o - a - W, o - a, -0.6, PLATFORM_HEIGHT_M); }, 2, true), mats.platform, true);
    }
    // Big, high-contrast name signs every ~30 m, readable from the cab at ~150 m (ESTIMATE layout).
    const tex = signCanvas(l.st.name);
    const signMat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.FrontSide });
    const geo = new THREE.PlaneGeometry(10, 1.25);
    for (let s = l.s0 + 12; s <= l.s1 - 8; s += 30) {
      const p = track.poseAt(s);
      const yaw = Math.atan2(p.tx, p.tz);
      const lat = l.island ? -(a + W / 2) : sgn * (b - 0.15);
      const y = p.y + PLATFORM_HEIGHT_M + (l.island ? 2.9 : 2.2);
      const faces = l.island ? [1, -1] : [sgn > 0 ? -1 : 1];
      for (const f of faces) { // f = 1: sign faces right of travel, -1: faces left
        const m = new THREE.Mesh(geo, signMat);
        m.position.set(p.x - p.tz * lat, y, p.z + p.tx * lat);
        m.rotation.y = yaw + (f > 0 ? -Math.PI / 2 : Math.PI / 2);
        scene.add(m);
      }
    }
  }
  return stats;
}
