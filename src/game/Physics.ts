/**
 * Longitudinal train physics for a TR-style 6-car subway consist.
 *
 * Every numeric constant below marked ESTIMATE is a placeholder chosen to feel plausible,
 * not a published TTC/manufacturer figure. Replace with sourced values as they are found.
 *
 * Model: a single combined controller (lever -1..+1: negative = service brake, positive =
 * power) sets a target acceleration. The applied acceleration follows that target with a
 * jerk limit (m/s^3), which is what makes starts and stops smooth. Traction is capped by a
 * constant-power curve above base speed. Running resistance uses a Davis-style A + B v + C v^2.
 */

/** ESTIMATE: 6-car consist length, roughly 6 x 23 m cars. */
export const CONSIST_LENGTH_M = 138;
export const CAR_COUNT = 6;
export const CAR_LENGTH_M = CONSIST_LENGTH_M / CAR_COUNT;
/** ESTIMATE: loaded-ish mass of a 6-car set (kg). */
export const MASS_KG = 240_000;
/** ESTIMATE: max line speed used for the sim (km/h). */
export const LINE_SPEED_KMH = 80;
/** ESTIMATE: absolute top speed of the vehicle model (km/h). */
export const VMAX_KMH = 88;
/** ESTIMATE: initial (low-speed) traction acceleration, m/s^2. */
export const MAX_TRACTION_ACCEL = 1.1;
/** ESTIMATE: base speed where traction switches to constant power, m/s (~36 km/h). */
export const BASE_SPEED_MS = 10;
/** ESTIMATE: full service brake deceleration, m/s^2. */
export const MAX_SERVICE_BRAKE = 1.3;
/** ESTIMATE: emergency brake deceleration, m/s^2. */
export const EMERGENCY_BRAKE = 1.6;
/** ESTIMATE: comfort jerk limit for traction/service braking, m/s^3. */
export const JERK_LIMIT = 0.8;
/** ESTIMATE: jerk limit applied when the emergency brake is active, m/s^3. */
export const EMERGENCY_JERK_LIMIT = 3.0;
/** ESTIMATE: Davis resistance coefficients, expressed as deceleration (m/s^2): A + B v + C v^2. */
export const DAVIS_A = 0.012;
export const DAVIS_B = 0.0004;
export const DAVIS_C = 0.00006;

export const kmh = (ms: number) => ms * 3.6;
export const ms = (kmhValue: number) => kmhValue / 3.6;

export interface PhysicsState {
  /** chainage of the head of the train along the line, metres */
  s: number;
  /** speed, m/s (forward only for now; no reverser yet) */
  v: number;
  /** applied (jerk-limited) controller acceleration, m/s^2, excluding resistance */
  aCmd: number;
  /** net acceleration last step, m/s^2 */
  aNet: number;
}

/** ESTIMATE: traction fades linearly to zero over this band below VMAX (speed governor). */
export const GOVERNOR_BAND_KMH = 4;

export function tractionLimit(v: number): number {
  const base = v <= BASE_SPEED_MS ? MAX_TRACTION_ACCEL : (MAX_TRACTION_ACCEL * BASE_SPEED_MS) / v;
  const fade = Math.max(0, Math.min(1, (ms(VMAX_KMH) - v) / ms(GOVERNOR_BAND_KMH)));
  return base * fade;
}

export function resistance(v: number): number {
  if (v <= 0) return 0;
  return DAVIS_A + DAVIS_B * v + DAVIS_C * v * v;
}

/** Target controller acceleration for a lever position (-1..1) at speed v. */
export function targetAccel(lever: number, v: number, emergency: boolean): number {
  if (emergency) return -EMERGENCY_BRAKE;
  const l = Math.max(-1, Math.min(1, lever));
  if (l > 0) return l * tractionLimit(v);
  return l * MAX_SERVICE_BRAKE;
}

export class TrainPhysics {
  state: PhysicsState;
  lever = 0;
  emergency = false;

  constructor(startChainage = 0) {
    this.state = { s: startChainage, v: 0, aCmd: 0, aNet: 0 };
  }

  step(dt: number): void {
    const st = this.state;
    const target = targetAccel(this.lever, st.v, this.emergency);
    const j = (this.emergency ? EMERGENCY_JERK_LIMIT : JERK_LIMIT) * dt;
    st.aCmd += Math.max(-j, Math.min(j, target - st.aCmd));
    // Traction must also respect the power curve immediately (it can drop as speed rises).
    if (st.aCmd > 0) st.aCmd = Math.min(st.aCmd, tractionLimit(st.v));
    let a = st.aCmd - resistance(st.v);
    let v = st.v + a * dt;
    if (v <= 0) {
      // Brakes and resistance hold the train at rest; no rolling backwards (no grades yet).
      v = 0;
      if (st.aCmd <= 0) a = 0;
    }
    st.s += ((st.v + v) / 2) * dt;
    st.v = v;
    st.aNet = a;
  }
}
