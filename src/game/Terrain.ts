import * as THREE from 'three';
import { tileLat, tileLon, tileXf, tileYf, toLatLon, toLocal } from './geo';

export interface TerrainIndex {
  grid: number;
  zoom: number;
  source: string;
  tiles: { z: number; x: number; y: number; offset: number; source: string }[];
}
export interface ImageryIndex {
  attribution: string;
  tiles: { z: number; x: number; y: number; lo: boolean; hi: boolean }[];
}

/** Distances (m, camera to tile centre) for geometry and imagery LOD. */
export const GEOM_LOD_FAR_M = 1400;
export const IMAGERY_HI_LOAD_M = 1300;
export const IMAGERY_HI_DROP_M = 2000;

interface Tile {
  x: number; y: number;
  heights: Int16Array;
  centre: THREE.Vector3;
  lod: THREE.LOD;
  material: THREE.MeshStandardMaterial;
  lo?: THREE.Texture;
  hi?: THREE.Texture;
  hiAvailable: boolean;
  hiLoading: boolean;
}

/**
 * Lidar terrain (NRCan HRDEM, carved around the line at bake time) as z15 web-mercator tiles,
 * draped with OIWMS orthoimagery when public/imagery/ has been baked. Two geometry LODs per tile
 * (129^2 and 33^2 vertices) and two texture LODs (256 px everywhere, 1024 px near the camera).
 */
export class Terrain {
  readonly group = new THREE.Group();
  private tiles = new Map<string, Tile>();
  private grid: number;
  private zoom: number;
  private loader = new THREE.TextureLoader();
  readonly attribution: string | null;
  readonly minHeight: number;

  constructor(index: TerrainIndex, bin: ArrayBuffer, imagery: ImageryIndex | null, maxAniso = 4) {
    this.grid = index.grid;
    this.zoom = index.zoom;
    this.attribution = imagery?.attribution ?? null;
    const imgMap = new Map((imagery?.tiles ?? []).map((t) => [`${t.x},${t.y}`, t]));
    let minH = Infinity;
    for (const t of index.tiles) {
      const heights = new Int16Array(bin, t.offset, this.grid * this.grid);
      for (let k = 0; k < heights.length; k += 97) minH = Math.min(minH, heights[k] / 10);
      const img = imgMap.get(`${t.x},${t.y}`);
      const material = new THREE.MeshStandardMaterial({ color: img?.lo ? 0xffffff : 0x5d6b4f, roughness: 0.95, metalness: 0 });
      const lod = new THREE.LOD();
      lod.addLevel(this.buildMesh(t.x, t.y, heights, 1, material), 0);
      lod.addLevel(this.buildMesh(t.x, t.y, heights, 4, material), GEOM_LOD_FAR_M);
      const lat = tileLat(t.y + 0.5, this.zoom), lon = tileLon(t.x + 0.5, this.zoom);
      const [cx, cz] = toLocal(lat, lon);
      const centre = new THREE.Vector3(cx, heights[(this.grid * this.grid) >> 1] / 10, cz);
      lod.position.set(0, 0, 0);
      lod.autoUpdate = true;
      this.group.add(lod);
      const tile: Tile = { x: t.x, y: t.y, heights, centre, lod, material, hiAvailable: !!img?.hi, hiLoading: false };
      if (img?.lo) {
        this.loader.load(`./imagery/${t.z}_${t.x}_${t.y}_lo.jpg`, (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = maxAniso;
          tile.lo = tex;
          if (!tile.hi) { material.map = tex; material.needsUpdate = true; }
        });
      }
      this.tiles.set(`${t.x},${t.y}`, tile);
    }
    this.minHeight = Number.isFinite(minH) ? minH : 0;
  }

  private buildMesh(tx: number, ty: number, h: Int16Array, step: number, material: THREE.Material): THREE.Mesh {
    const G = this.grid, n = Math.floor((G - 1) / step) + 1;
    const pos = new Float32Array(n * n * 3), uv = new Float32Array(n * n * 2);
    const lon0 = tileLon(tx, this.zoom), lon1 = tileLon(tx + 1, this.zoom);
    const lat0 = tileLat(ty, this.zoom), lat1 = tileLat(ty + 1, this.zoom);
    const my = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
    const my0 = my(lat0), my1 = my(lat1);
    for (let j = 0; j < n; j++) {
      const gj = j * step, fy = gj / (G - 1);
      const lat = ((2 * Math.atan(Math.exp(my0 + (my1 - my0) * fy)) - Math.PI / 2) * 180) / Math.PI;
      for (let i = 0; i < n; i++) {
        const gi = i * step, fx = gi / (G - 1);
        const [x, z] = toLocal(lat, lon0 + (lon1 - lon0) * fx);
        const k = j * n + i;
        pos[k * 3] = x; pos[k * 3 + 1] = h[gj * G + gi] / 10; pos[k * 3 + 2] = z;
        uv[k * 2] = fx; uv[k * 2 + 1] = 1 - fy;
      }
    }
    const idx: number[] = [];
    for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
      const a = j * n + i, b = a + 1, c = a + n, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, material);
    m.receiveShadow = true;
    return m;
  }

  /** Terrain height (m) at local x,z, or null outside the baked tiles. */
  heightAt(x: number, z: number): number | null {
    const [lat, lon] = toLatLon(x, z);
    const fx = tileXf(lon, this.zoom), fy = tileYf(lat, this.zoom);
    const t = this.tiles.get(`${Math.floor(fx)},${Math.floor(fy)}`);
    if (!t) return null;
    const G = this.grid;
    const gx = (fx - t.x) * (G - 1), gy = (fy - t.y) * (G - 1);
    const i = Math.min(G - 2, Math.floor(gx)), j = Math.min(G - 2, Math.floor(gy));
    const u = gx - i, v = gy - j, h = t.heights;
    const a = h[j * G + i], b = h[j * G + i + 1], c = h[(j + 1) * G + i], d = h[(j + 1) * G + i + 1];
    return ((a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v) / 10;
  }

  /** Swap 1024 px imagery in near the camera and drop it far away. Call a few times a second. */
  updateImagery(cam: THREE.Vector3): void {
    for (const t of this.tiles.values()) {
      if (!t.hiAvailable) continue;
      const d = Math.hypot(cam.x - t.centre.x, cam.z - t.centre.z);
      if (d < IMAGERY_HI_LOAD_M && !t.hi && !t.hiLoading) {
        t.hiLoading = true;
        this.loader.load(`./imagery/${this.zoom}_${t.x}_${t.y}_hi.jpg`, (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = 8;
          t.hi = tex; t.hiLoading = false;
          t.material.map = tex; t.material.needsUpdate = true;
        }, undefined, () => { t.hiLoading = false; t.hiAvailable = false; });
      } else if (d > IMAGERY_HI_DROP_M && t.hi) {
        t.material.map = t.lo ?? null;
        t.material.needsUpdate = true;
        t.hi.dispose();
        t.hi = undefined;
      }
    }
  }

  get hiResLoaded(): number {
    let n = 0;
    for (const t of this.tiles.values()) if (t.hi) n++;
    return n;
  }
}
