import * as THREE from 'three';
import { Input } from './Input';
import { CONSIST_LENGTH_M, LINE_SPEED_KMH, TrainPhysics, kmh } from './Physics';
import { Track, type LineData, type Station } from './Track';
import { Train } from './Train';
import { buildWorld } from './World';

const FIXED_DT = 1 / 120;
/** ESTIMATE: tolerance for a "good" platform stop, metres either side of the stop mark. */
export const STOP_TOLERANCE_M = 3;

export interface SimDebug {
  frames: number;
  headS: number;
  speedKmh: number;
  lever: number;
  stations: number;
  trackLengthM: number;
}

export class Game {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(62, 1, 0.1, 3000);
  readonly track: Track;
  readonly stations: Station[];
  readonly physics: TrainPhysics;
  readonly input = new Input();
  readonly train = new Train();
  private cabView = true;
  private acc = 0;
  private last = performance.now();
  readonly debug: SimDebug;

  constructor(container: HTMLElement, data: LineData) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.track = new Track(data.track);
    this.stations = data.stations;
    // Start with the head of the train at the first platform's stop mark, or one consist
    // length in if that would leave the tail off the end of the mapped line.
    const first = this.stations[0];
    const start = Math.max(CONSIST_LENGTH_M + 2, first?.platformEndM ?? first?.chainageM ?? 0);
    this.physics = new TrainPhysics(start);

    this.scene.background = new THREE.Color(0x0e1216);
    this.scene.fog = new THREE.Fog(0x0e1216, 150, 2500);
    this.scene.add(new THREE.HemisphereLight(0xcfd8e3, 0x2a2622, 1.1));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(300, 600, 200);
    this.scene.add(sun);

    buildWorld(this.scene, this.track, this.stations);
    this.scene.add(this.train.group);

    this.debug = { frames: 0, headS: start, speedKmh: 0, lever: 0, stations: this.stations.length, trackLengthM: this.track.length };
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  resize(): void {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  }

  start(): void {
    const loop = (now: number) => {
      this.frame(now);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  private nextStation(headS: number): Station | undefined {
    return this.stations.find((s) => (s.platformEndM ?? s.chainageM) > headS - STOP_TOLERANCE_M);
  }

  frame(now: number): void {
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.input.update(dt);
    if (this.input.consumeCameraToggle()) this.cabView = !this.cabView;
    this.physics.lever = this.input.lever;
    this.physics.emergency = this.input.emergency;
    this.acc += dt;
    while (this.acc >= FIXED_DT) {
      this.physics.step(FIXED_DT);
      this.acc -= FIXED_DT;
    }
    const st = this.physics.state;
    if (st.s >= this.track.length) { st.s = this.track.length; st.v = 0; st.aCmd = 0; }

    this.train.place(this.track, st.s);
    this.updateCamera(st.s);
    this.renderer.render(this.scene, this.camera);
    this.updateHud();

    this.debug.frames++;
    this.debug.headS = st.s;
    this.debug.speedKmh = kmh(st.v);
    this.debug.lever = this.physics.lever;
  }

  private updateCamera(headS: number): void {
    const p = this.track.poseAt(headS + 0.4);
    if (this.cabView) {
      // ESTIMATE: driver eye height ~2.6 m above rail, slightly left of centre.
      const lat = -0.6;
      this.camera.position.set(p.x - p.tz * lat, 2.6, p.z + p.tx * lat);
      const ahead = this.track.poseAt(headS + 60);
      this.camera.lookAt(ahead.x - ahead.tz * lat * 0.3, 1.8, ahead.z + ahead.tx * lat * 0.3);
    } else {
      const back = this.track.poseAt(headS - CONSIST_LENGTH_M - 25);
      this.camera.position.set(back.x - back.tz * 14, 22, back.z + back.tx * 14);
      const mid = this.track.poseAt(headS - CONSIST_LENGTH_M / 2);
      this.camera.lookAt(mid.x, 1.5, mid.z);
    }
  }

  private updateHud(): void {
    const st = this.physics.state;
    const v = kmh(st.v);
    const spd = document.getElementById('spd');
    const lines = document.getElementById('hud-lines');
    if (!spd || !lines) return;
    spd.textContent = v.toFixed(0);
    spd.className = v > LINE_SPEED_KMH + 0.5 ? 'bad' : '';
    const lever = this.physics.lever;
    const leverTxt = this.physics.emergency ? 'EMERGENCY' : lever > 0.01 ? `Power ${(lever * 100).toFixed(0)}%` : lever < -0.01 ? `Brake ${(-lever * 100).toFixed(0)}%` : 'Coast';
    const ns = this.nextStation(st.s);
    let stationTxt = 'End of line';
    if (ns) {
      const mark = ns.platformEndM ?? ns.chainageM;
      const d = mark - st.s;
      stationTxt = `Next: ${ns.name}  ${d >= 0 ? d.toFixed(0) + ' m' : 'overrun ' + (-d).toFixed(1) + ' m'}`;
      if (st.v === 0 && Math.abs(d) <= STOP_TOLERANCE_M) stationTxt = `Stopped at ${ns.name} (${d >= 0 ? d.toFixed(1) + ' m short' : (-d).toFixed(1) + ' m over'})`;
    }
    lines.textContent = [
      `Limit ${LINE_SPEED_KMH} km/h (estimate)`,
      `Controller: ${leverTxt}`,
      `Accel ${st.aNet.toFixed(2)} m/s²`,
      stationTxt,
      `Chainage ${(st.s / 1000).toFixed(3)} / ${(this.track.length / 1000).toFixed(2)} km`,
    ].join('\n');
  }
}
