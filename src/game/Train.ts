import * as THREE from 'three';
import { CAR_COUNT, CAR_LENGTH_M } from './Physics';
import type { Track } from './Track';

/**
 * Placeholder TR-style consist built from boxes. Tribute livery colours only (stainless
 * body, dark window band, red accent stripe); no operator logos, fleet numbers or marks.
 * ESTIMATE dimensions: body width 3.1 m, roof 3.65 m above rail, floor 1.05 m.
 */
export const LIVERY = {
  body: 0xc4c9ce,
  windowBand: 0x1b2127,
  accent: 0xc8202f,
  cabFront: 0x2a2f35,
  underframe: 0x2b2b2b,
};
const BODY_W = 3.1, ROOF_Y = 3.65, FLOOR_Y = 1.05, GAP = 0.6;

function makeCar(lead: boolean): THREE.Group {
  const g = new THREE.Group();
  const len = CAR_LENGTH_M - GAP;
  const mat = (c: number, metal = 0.2) => new THREE.MeshStandardMaterial({ color: c, metalness: metal, roughness: 0.45 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(BODY_W, ROOF_Y - FLOOR_Y, len), mat(LIVERY.body, 0.6));
  body.position.y = (ROOF_Y + FLOOR_Y) / 2;
  g.add(body);
  const win = new THREE.Mesh(new THREE.BoxGeometry(BODY_W + 0.02, 0.9, len - 1.2), mat(LIVERY.windowBand));
  win.position.y = 2.55;
  g.add(win);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(BODY_W + 0.03, 0.22, len - 0.4), mat(LIVERY.accent));
  stripe.position.y = 1.85;
  g.add(stripe);
  const under = new THREE.Mesh(new THREE.BoxGeometry(BODY_W - 0.4, 0.7, len - 2), mat(LIVERY.underframe));
  under.position.y = 0.55;
  g.add(under);
  if (lead) {
    const cab = new THREE.Mesh(new THREE.BoxGeometry(BODY_W + 0.04, ROOF_Y - FLOOR_Y - 0.2, 0.3), mat(LIVERY.cabFront));
    cab.position.set(0, (ROOF_Y + FLOOR_Y) / 2, len / 2);
    g.add(cab);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(BODY_W + 0.05, 0.5, 0.32), mat(LIVERY.accent));
    nose.position.set(0, 1.6, len / 2 + 0.01);
    g.add(nose);
    for (const x of [-1.05, 1.05]) {
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.05), new THREE.MeshBasicMaterial({ color: 0xfff4d6 }));
      lamp.position.set(x, 1.3, len / 2 + 0.18);
      g.add(lamp);
    }
  }
  return g;
}

export class Train {
  readonly group = new THREE.Group();
  private cars: THREE.Group[] = [];

  constructor() {
    for (let i = 0; i < CAR_COUNT; i++) {
      const c = makeCar(i === 0);
      this.cars.push(c);
      this.group.add(c);
    }
  }

  /** Place each car along the track; headS is the chainage of the front of the lead car. */
  place(track: Track, headS: number): void {
    for (let i = 0; i < CAR_COUNT; i++) {
      const front = track.poseAt(headS - i * CAR_LENGTH_M - GAP / 2);
      const back = track.poseAt(headS - (i + 1) * CAR_LENGTH_M + GAP / 2);
      const car = this.cars[i];
      car.position.set((front.x + back.x) / 2, 0, (front.z + back.z) / 2);
      car.rotation.y = Math.atan2(front.x - back.x, front.z - back.z);
    }
  }
}
