/** Polyline track with chainage lookups. Coordinates are local metres (x east, z south). */
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

export interface LineData {
  name: string;
  direction: string;
  source: Record<string, string>;
  lengthM: number;
  track: [number, number][];
  stations: Station[];
}

export interface TrackPose {
  x: number;
  z: number;
  /** unit tangent in direction of increasing chainage */
  tx: number;
  tz: number;
}

/** Track gauge used by the Toronto subway (1495 mm, "Toronto gauge"). */
export const TRACK_GAUGE_M = 1.495;

export class Track {
  readonly pts: [number, number][];
  readonly cum: number[];
  readonly length: number;

  constructor(pts: [number, number][]) {
    this.pts = pts;
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

  /** Position and tangent at chainage s (clamped to the line; extrapolates linearly past ends). */
  poseAt(s: number): TrackPose {
    const sc = Math.max(0, Math.min(this.length, s));
    const i = Math.min(this.segAt(sc), this.pts.length - 2);
    const a = this.pts[i], b = this.pts[i + 1];
    const L = this.cum[i + 1] - this.cum[i] || 1e-9;
    const tx = (b[0] - a[0]) / L, tz = (b[1] - a[1]) / L;
    const d = s - this.cum[i];
    return { x: a[0] + tx * d, z: a[1] + tz * d, tx, tz };
  }
}
