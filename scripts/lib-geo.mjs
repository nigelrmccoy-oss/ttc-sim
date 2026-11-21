/** Shared geo helpers for the bake scripts (local metres <-> lat/lon, web mercator tiles, HRDEM). */
import proj4 from 'proj4';
import { fromUrl } from 'geotiff';
import { PNG } from 'pngjs';

export const R = 6378137, OLAT = 43.70, OLON = -79.40; // must match bake-line1.mjs
const K = Math.PI / 180;
export const toLocal = (lat, lon) => [(lon - OLON) * K * R * Math.cos(OLAT * K), -(lat - OLAT) * K * R];
export const toLatLon = (x, z) => [OLAT - z / R / K, OLON + x / (R * Math.cos(OLAT * K)) / K];

export const tileX = (lon, z) => Math.floor(((lon + 180) / 360) * 2 ** z);
export const tileY = (lat, z) => Math.floor(((1 - Math.asinh(Math.tan(lat * K)) / Math.PI) / 2) * 2 ** z);
export const tileLon = (x, z) => (x / 2 ** z) * 360 - 180;
export const tileLat = (y, z) => Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / 2 ** z))) / K;

proj4.defs('EPSG:3979', '+proj=lcc +lat_0=49 +lon_0=-95 +lat_1=49 +lat_2=77 +x_0=0 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');
export const to3979 = (lat, lon) => proj4('EPSG:4326', 'EPSG:3979', [lon, lat]);

export const HRDEM_DTM = 'https://canelevation-dem.s3.ca-central-1.amazonaws.com/hrdem-mosaic-1m/8_2-mosaic-1m-dtm.tif';
export const HRDEM_NODATA = -32767;
let tifP = null;
const hrdem = () => (tifP ??= fromUrl(HRDEM_DTM));

/**
 * Sample HRDEM DTM (bare earth, CGVD2013 metres) at many lat/lon points sharing one window.
 * res = metres per pixel to request (geotiff.js picks the matching overview). Returns NaN for nodata.
 */
export async function sampleHrdem(points, res = 1, pad = 10) {
  const xy = points.map(([lat, lon]) => to3979(lat, lon));
  const xs = xy.map((p) => p[0]), ys = xy.map((p) => p[1]);
  const bbox = [Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) + pad, Math.max(...ys) + pad];
  const w = Math.max(2, Math.ceil((bbox[2] - bbox[0]) / res)), h = Math.max(2, Math.ceil((bbox[3] - bbox[1]) / res));
  const tif = await hrdem();
  const r = await tif.readRasters({ bbox, width: w, height: h, resampleMethod: 'bilinear', fillValue: HRDEM_NODATA });
  const band = r[0];
  const px = (bbox[2] - bbox[0]) / w, py = (bbox[3] - bbox[1]) / h;
  return xy.map(([x, y]) => {
    const fx = (x - bbox[0]) / px - 0.5, fy = (bbox[3] - y) / py - 0.5;
    const x0 = Math.max(0, Math.min(w - 2, Math.floor(fx))), y0 = Math.max(0, Math.min(h - 2, Math.floor(fy)));
    const tx = Math.max(0, Math.min(1, fx - x0)), ty = Math.max(0, Math.min(1, fy - y0));
    const v = [band[y0 * w + x0], band[y0 * w + x0 + 1], band[(y0 + 1) * w + x0], band[(y0 + 1) * w + x0 + 1]];
    if (v.some((a) => a <= HRDEM_NODATA + 1 || !Number.isFinite(a))) return NaN;
    return (v[0] * (1 - tx) + v[1] * tx) * (1 - ty) + (v[2] * (1 - tx) + v[3] * tx) * ty;
  });
}

/** AWS Terrain Tiles (Terrarium PNG, z14 ~ 7 m here) fallback for points HRDEM does not cover. */
const terrCache = new Map();
export async function sampleTerrarium(lat, lon, z = 14) {
  const x = tileX(lon, z), y = tileY(lat, z), key = `${z}/${x}/${y}`;
  if (!terrCache.has(key)) {
    const res = await fetch(`https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${key}.png`);
    terrCache.set(key, PNG.sync.read(Buffer.from(await res.arrayBuffer())));
  }
  const png = terrCache.get(key);
  const fx = (((lon + 180) / 360) * 2 ** z - x) * 256;
  const fy = (((1 - Math.asinh(Math.tan(lat * K)) / Math.PI) / 2) * 2 ** z - y) * 256;
  const i = (Math.min(255, Math.floor(fy)) * 256 + Math.min(255, Math.floor(fx))) * 4;
  const d = png.data;
  return d[i] * 256 + d[i + 1] + d[i + 2] / 256 - 32768;
}
