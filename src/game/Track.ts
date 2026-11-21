/** Polyline track with chainage lookups and a baked vertical profile. Local metres: x east, z south, y = elevation (m, CGVD2013). */
export interface Station {
  name: string;
  osmStopNode: number;
  osmPlatformWay: number | null;
  chainageM: number;
  stopOffsetM: number;
  platformLengthM: number | null;
  platformStartM: number | null;
  platformEndM: number | null;
  platformSideEstimate: 'left' | 'right' | null;
}

export interface StationInfo {
  name: string;
  wikipedia: { title: string; url: string } | null;
  coordinates: { lat: number; lon: number } | null;
  wikiVsOsmM: number | null;
  coordMismatch?: boolean;
  opened: string | null;
  platformType: string | null;
  levels: { value: number | string; basis: string } | null;
  structure: string | null;
  neighbourhood: string | null;
}

export interface LineData {
  name: string;
  direction: string;
  source: Record<string, string>;
  origin: { lat: number; lon: number };
  lengthM: number;
  track: [number, number][];
  stations: Station[];
}

export type SectionClass = 'tunnel' | 'open' | 'bridge';

export interface ProfileData {
  stepM: number;
  rail: number[];
  ground: number[];
  cls: SectionClass[];
  construction: string[];
  portals: { s: number; railM: number; facing: string; name: string | null }[];
  structure: Record<string, { value: number; basis: string }>;
  maxGrade: { pct: number; atM: number };
}

export interface TrackPose {
  x: number;
  y: number;
  z: number;
  /** unit tangent (horizontal) in direction of increasing chainage */
  tx: number;
  tz: number;
}

/** Track gauge used by the Toronto subway (1495 mm, "Toronto gauge"). */
export const TRACK_GAUGE_M = 1.495;
/** ESTIMATE: distance between running-track centres in twin-track box tunnels and open sections. */
export const TRACK_SPACING_M = 3.7;

export class Track {
  readonly pts: [number, number][];
  readonly cum: number[];
  readonly length: number;
  readonly profile: ProfileData | null;

  constructor(pts: [number, number][], profile: ProfileData | null = null) {
    this.pts = pts;
    this.profile = profile;
    this.cum = [0];
    for (let i = 1; i < pts.length; i++) {
      this.cum.push(this.cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    }
    this.length = this.cum[this.cum.length - 1];
  }

  private segAt(s: number): number {
    let lo = 0, hi = this.cum.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (this.cum[mid] <= s) lo = mid; else hi = mid;
    }
    return lo;
  }

  private sampleIdx(s: number): [number, number] {
    const p = this.profile!;
    const f = Math.max(0, Math.min(p.rail.length - 1, s / p.stepM));
    const i = Math.min(p.rail.length - 2, Math.floor(f));
    return [i, f - i];
  }

  /** Rail-top elevation at chainage s (0 when no profile is loaded). */
  railAt(s: number): number {
    if (!this.profile) return 0;
    const [i, t] = this.sampleIdx(s);
    const r = this.profile.rail;
    return r[i] + (r[i + 1] - r[i]) * t;
  }

  groundAt(s: number): number {
    if (!this.profile) return 0;
    const [i, t] = this.sampleIdx(s);
    const g = this.profile.ground;
    return g[i] + (g[i + 1] - g[i]) * t;
  }

  /** Grade as rise/run (positive = climbing in the direction of increasing chainage), over a 20 m base. */
  gradeAt(s: number): number {
    if (!this.profile) return 0;
    const a = Math.max(0, s - 10), b = Math.min(this.length, s + 10);
    return b > a ? (this.railAt(b) - this.railAt(a)) / (b - a) : 0;
  }

  classAt(s: number): SectionClass {
    if (!this.profile) return 'open';
    const [i, t] = this.sampleIdx(s);
    return this.profile.cls[t < 0.5 ? i : i + 1];
  }

  constructionAt(s: number): string {
    if (!this.profile) return 'at-grade';
    const [i, t] = this.sampleIdx(s);
    return this.profile.construction[t < 0.5 ? i : i + 1];
  }

  /** Position (with rail elevation) and horizontal tangent at chainage s (clamped to the line). */
  poseAt(s: number): TrackPose {
    const sc = Math.max(0, Math.min(this.length, s));
    const i = Math.min(this.segAt(sc), this.pts.length - 2);
    const a = this.pts[i], b = this.pts[i + 1];
    const L = this.cum[i + 1] - this.cum[i] || 1e-9;
    const tx = (b[0] - a[0]) / L, tz = (b[1] - a[1]) / L;
    const d = s - this.cum[i];
    return { x: a[0] + tx * d, y: this.railAt(sc), z: a[1] + tz * d, tx, tz };
  }
}
