import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { Input } from './Input';
import { CONSIST_LENGTH_M, LINE_SPEED_KMH, TrainPhysics, kmh } from './Physics';
import { buildScenery, type CorridorData, type SceneryStats } from './Scenery';
import { Terrain } from './Terrain';
import { Track, type LineData, type ProfileData, type StationInfo } from './Track';
import { Train } from './Train';
import { buildWorld, layoutStations, type StationLayout, type WorldStats } from './World';

const FIXED_DT = 1 / 120;
/** ESTIMATE: tolerance for a "good" platform stop, metres either side of the stop mark. */
export const STOP_TOLERANCE_M = 3;
/** Show the station info panel within this distance of the next stop mark. */
export const STATION_INFO_RANGE_M = 700;
/** Sun direction (ESTIMATE: mid-afternoon, from the south-west). */
const SUN_ELEVATION_DEG = 38, SUN_AZIMUTH_DEG = 215;
/** Shadow box around the camera (m). */
const SHADOW_HALF_M = 110;

export interface GameData {
  line: LineData;
  profile: ProfileData | null;
  stations: StationInfo[];
  terrain: { index: ConstructorParameters<typeof Terrain>[0]; bin: ArrayBuffer } | null;
  imagery: ConstructorParameters<typeof Terrain>[2];
  corridor: CorridorData | null;
}

export interface SimDebug {
  frames: number;
  headS: number;
  speedKmh: number;
  lever: number;
  stations: number;
  trackLengthM: number;
  gradePct: number;
  railElevM: number;
  section: string;
  fps: number;
  drawCalls: number;
  triangles: number;
  hiResTiles: number;
  world?: WorldStats;
  scenery?: SceneryStats;
}

export class Game {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(62, 1, 0.1, 4000);
  readonly track: Track;
  readonly layouts: StationLayout[];
  readonly physics: TrainPhysics;
  readonly input = new Input();
  readonly train = new Train();
  readonly terrain: Terrain | null = null;
  private sun = new THREE.DirectionalLight(0xfff4e5, 2.6);
  private hemi = new THREE.HemisphereLight(0xcfe0f5, 0x5a5146, 0.9);
  private headlight = new THREE.SpotLight(0xfff2d8, 120, 260, 0.5, 0.8, 1.0);
  private sunDir = new THREE.Vector3();
  private cabView = true;
  private acc = 0;
  private last = performance.now();
  private fpsT = 0;
  private fpsN = 0;
  private imageryT = 0;
  readonly debug: SimDebug;

  constructor(container: HTMLElement, data: GameData) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.75;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.track = new Track(data.line.track, data.profile);
    this.layouts = layoutStations(data.line.stations, data.stations);
    const first = data.line.stations[0];
    const start = Math.max(CONSIST_LENGTH_M + 2, first?.platformEndM ?? first?.chainageM ?? 0);
    this.physics = new TrainPhysics(start);

    // Sky, sun and fog.
    const sky = new Sky();
    sky.scale.setScalar(20000);
    const phi = THREE.MathUtils.degToRad(90 - SUN_ELEVATION_DEG), theta = THREE.MathUtils.degToRad(SUN_AZIMUTH_DEG);
    this.sunDir.setFromSphericalCoords(1, phi, theta);
    const u = sky.material.uniforms;
    u.turbidity.value = 6; u.rayleigh.value = 1.4; u.mieCoefficient.value = 0.004; u.mieDirectionalG.value = 0.8;
    u.sunPosition.value.copy(this.sunDir);
    this.scene.add(sky);
    this.scene.fog = new THREE.FogExp2(0xb9c6d3, 0.00042);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = sc.bottom = -SHADOW_HALF_M; sc.right = sc.top = SHADOW_HALF_M; sc.near = 1; sc.far = 900;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.6;
    this.scene.add(this.sun, this.sun.target, this.hemi);
    this.headlight.castShadow = false;
    this.scene.add(this.headlight, this.headlight.target);

    let world: WorldStats | undefined, scenery: SceneryStats | undefined;
    world = buildWorld(this.scene, this.track, this.layouts);
    if (data.terrain) {
      this.terrain = new Terrain(data.terrain.index, data.terrain.bin, data.imagery, this.renderer.capabilities.getMaxAnisotropy());
      this.scene.add(this.terrain.group);
      // Far-field ground below the baked corridor so the horizon is not empty.
      const far = new THREE.Mesh(new THREE.PlaneGeometry(80000, 80000), new THREE.MeshStandardMaterial({ color: 0x5f6b55, roughness: 1 }));
      far.rotation.x = -Math.PI / 2;
      far.position.set(0, this.terrain.minHeight - 15, 0);
      this.scene.add(far);
      if (data.corridor) scenery = buildScenery(this.scene, data.corridor, this.terrain, this.track);
      const attr = document.getElementById('attribution');
      if (attr) attr.textContent = [
        'Terrain: NRCan HRDEM (OGL-Canada)',
        this.terrain.attribution ? 'Imagery: Ontario Imagery Web Map Service, Ontario MNR (OGL-Ontario)' : null,
        'Map data © OpenStreetMap contributors (ODbL)',
        'Station facts: Wikipedia (CC BY-SA)',
      ].filter(Boolean).join(' · ');
    }
    this.scene.add(this.train.group);
    this.train.group.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });

    this.debug = {
      frames: 0, headS: start, speedKmh: 0, lever: 0, stations: data.line.stations.length, trackLengthM: this.track.length,
      gradePct: 0, railElevM: 0, section: '', fps: 0, drawCalls: 0, triangles: 0, hiResTiles: 0, world, scenery,
    };
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  /** Debug/test hook: put the head of the train at chainage s, stopped. */
  teleport(s: number): void {
    const st = this.physics.state;
    st.s = Math.max(CONSIST_LENGTH_M + 2, Math.min(this.track.length, s));
    st.v = 0; st.aCmd = 0;
    this.physics.lever = this.input.lever = 0;
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

  private nextStation(headS: number): StationLayout | undefined {
    return this.layouts.find((l) => l.s1 > headS - STOP_TOLERANCE_M);
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
      // Grade under the middle of the consist (ESTIMATE: single-point mass model).
      this.physics.grade = this.track.gradeAt(this.physics.state.s - CONSIST_LENGTH_M / 2);
      this.physics.step(FIXED_DT);
      this.acc -= FIXED_DT;
    }
    const st = this.physics.state;
    if (st.s >= this.track.length) { st.s = this.track.length; st.v = 0; st.aCmd = 0; }

    this.train.place(this.track, st.s);
    this.updateCamera(st.s);
    this.updateLights(st.s);
    this.imageryT += dt;
    if (this.terrain && this.imageryT > 0.5) { this.imageryT = 0; this.terrain.updateImagery(this.camera.position); }
    this.renderer.render(this.scene, this.camera);
    this.updateHud();

    this.fpsT += dt; this.fpsN++;
    if (this.fpsT >= 1) { this.debug.fps = this.fpsN / this.fpsT; this.fpsT = 0; this.fpsN = 0; }
    const info = this.renderer.info.render;
    Object.assign(this.debug, {
      frames: this.debug.frames + 1, headS: st.s, speedKmh: kmh(st.v), lever: this.physics.lever,
      gradePct: this.track.gradeAt(st.s) * 100, railElevM: this.track.railAt(st.s), section: this.track.constructionAt(st.s),
      drawCalls: info.calls, triangles: info.triangles, hiResTiles: this.terrain?.hiResLoaded ?? 0,
    });
  }

  private updateLights(headS: number): void {
    const cam = this.camera.position;
    this.sun.position.copy(cam).addScaledVector(this.sunDir, 400);
    this.sun.target.position.copy(cam);
    const p = this.track.poseAt(headS + 0.5), a = this.track.poseAt(headS + 60);
    this.headlight.position.set(p.x, p.y + 1.4, p.z);
    this.headlight.target.position.set(a.x, a.y + 0.5, a.z);
    // Inside tunnels, sky light is mostly blocked: dim the hemisphere fill.
    const inTunnel = this.track.classAt(headS) === 'tunnel' && this.cabView;
    this.hemi.intensity += ((inTunnel ? 0.3 : 0.9) - this.hemi.intensity) * 0.05;
    // Headlights only matter underground; outdoors they would just paint a hot spot on the ballast.
    this.headlight.intensity += ((this.track.classAt(headS) === 'tunnel' ? 120 : 0) - this.headlight.intensity) * 0.05;
  }

  private updateCamera(headS: number): void {
    const p = this.track.poseAt(headS + 0.4);
    if (this.cabView) {
      // ESTIMATE: driver eye height ~2.6 m above rail, slightly left of centre.
      const lat = -0.6;
      this.camera.position.set(p.x - p.tz * lat, p.y + 2.6, p.z + p.tx * lat);
      const ahead = this.track.poseAt(headS + 60);
      this.camera.lookAt(ahead.x - ahead.tz * lat * 0.3, ahead.y + 1.8, ahead.z + ahead.tx * lat * 0.3);
    } else {
      const back = this.track.poseAt(headS - CONSIST_LENGTH_M - 25);
      this.camera.position.set(back.x - back.tz * 14, back.y + 22, back.z + back.tx * 14);
      const mid = this.track.poseAt(headS - CONSIST_LENGTH_M / 2);
      this.camera.lookAt(mid.x, mid.y + 1.5, mid.z);
    }
  }

  private updateHud(): void {
    const st = this.physics.state;
    const v = kmh(st.v);
    const spd = document.getElementById('spd');
    const lines = document.getElementById('hud-lines');
    const panel = document.getElementById('station-info');
    if (!spd || !lines) return;
    spd.textContent = v.toFixed(0);
    spd.className = v > LINE_SPEED_KMH + 0.5 ? 'bad' : '';
    const lever = this.physics.lever;
    const leverTxt = this.physics.emergency ? 'EMERGENCY' : lever > 0.01 ? `Power ${(lever * 100).toFixed(0)}%` : lever < -0.01 ? `Brake ${(-lever * 100).toFixed(0)}%` : 'Coast';
    const ns = this.nextStation(st.s);
    let stationTxt = 'End of line';
    let d = Infinity;
    if (ns) {
      d = ns.s1 - st.s;
      stationTxt = `Next: ${ns.st.name}  ${d >= 0 ? d.toFixed(0) + ' m' : 'overrun ' + (-d).toFixed(1) + ' m'}`;
      if (st.v === 0 && Math.abs(d) <= STOP_TOLERANCE_M) stationTxt = `Stopped at ${ns.st.name} (${d >= 0 ? d.toFixed(1) + ' m short' : (-d).toFixed(1) + ' m over'})`;
    }
    const g = this.track.gradeAt(st.s);
    const gradeTxt = `Grade ${g >= 0 ? '+' : ''}${(g * 100).toFixed(1)}% (${(g * 1000).toFixed(0)}‰) ${g > 0.002 ? '▲' : g < -0.002 ? '▼' : '—'}`;
    lines.textContent = [
      `Limit ${LINE_SPEED_KMH} km/h (estimate)`,
      `Controller: ${leverTxt}`,
      `Accel ${st.aNet.toFixed(2)} m/s²`,
      gradeTxt,
      `${this.track.constructionAt(st.s)} · rail ${this.track.railAt(st.s).toFixed(1)} m`,
      stationTxt,
      `Chainage ${(st.s / 1000).toFixed(3)} / ${(this.track.length / 1000).toFixed(2)} km`,
    ].join('\n');
    if (panel) {
      const inf = ns?.info;
      if (ns && d < STATION_INFO_RANGE_M && d > -STOP_TOLERANCE_M - 1) {
        const lv = inf?.levels ? `${inf.levels.value}` : '—';
        panel.textContent = [
          ns.st.name,
          inf?.opened ? `Opened ${inf.opened}` : null,
          inf?.platformType ? `Platforms: ${inf.platformType}` : null,
          inf?.structure ? `Station: ${inf.structure}` : null,
          `Levels: ${lv}`,
          inf?.neighbourhood ? `Area: ${inf.neighbourhood}` : null,
          inf?.wikipedia ? `Source: Wikipedia, “${inf.wikipedia.title.replace(/_/g, ' ')}”` : null,
        ].filter(Boolean).join('\n');
        panel.style.display = 'block';
      } else panel.style.display = 'none';
    }
  }
}
