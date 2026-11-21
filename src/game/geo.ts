/** Local metres <-> lat/lon (must match scripts/lib-geo.mjs) and web-mercator tile maths. */
const R = 6378137, K = Math.PI / 180;
export let OLAT = 43.7, OLON = -79.4;
export function setOrigin(lat: number, lon: number): void { OLAT = lat; OLON = lon; }
export const toLocal = (lat: number, lon: number): [number, number] => [(lon - OLON) * K * R * Math.cos(OLAT * K), -(lat - OLAT) * K * R];
export const toLatLon = (x: number, z: number): [number, number] => [OLAT - z / R / K, OLON + x / (R * Math.cos(OLAT * K)) / K];
/** Fractional web-mercator tile coordinates. */
export const tileXf = (lon: number, z: number) => ((lon + 180) / 360) * 2 ** z;
export const tileYf = (lat: number, z: number) => ((1 - Math.asinh(Math.tan(lat * K)) / Math.PI) / 2) * 2 ** z;
export const tileLon = (x: number, z: number) => (x / 2 ** z) * 360 - 180;
export const tileLat = (y: number, z: number) => Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / 2 ** z))) / K;
