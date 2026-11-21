/**
 * Keyboard + gamepad input. Produces a combined lever (-1 full service brake .. +1 full power).
 * Keyboard: W/ArrowUp moves the lever toward power, S/ArrowDown toward brake (rate-limited, so
 * holding a key notches smoothly), X snaps to coast, Space toggles the emergency brake.
 * Gamepad (stub, standard mapping): RT (button 7) = power, LT (button 6) = brake; when either
 * trigger is pressed it overrides the keyboard lever.
 */
export const LEVER_RATE_PER_S = 0.8;

export class Input {
  lever = 0;
  emergency = false;
  cameraToggled = false;
  private held = new Set<string>();

  constructor(target: Window = window) {
    target.addEventListener('keydown', (e) => {
      if (e.repeat) { this.held.add(e.code); return; }
      this.held.add(e.code);
      if (e.code === 'Space') { this.emergency = !this.emergency; e.preventDefault(); }
      if (e.code === 'KeyX') this.lever = 0;
      if (e.code === 'KeyC') this.cameraToggled = true;
    });
    target.addEventListener('keyup', (e) => this.held.delete(e.code));
    target.addEventListener('blur', () => this.held.clear());
  }

  update(dt: number): void {
    const up = this.held.has('KeyW') || this.held.has('ArrowUp');
    const down = this.held.has('KeyS') || this.held.has('ArrowDown');
    if (up && !down) this.lever = Math.min(1, this.lever + LEVER_RATE_PER_S * dt);
    if (down && !up) this.lever = Math.max(-1, this.lever - LEVER_RATE_PER_S * dt);

    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    for (const pad of pads) {
      if (!pad) continue;
      const rt = pad.buttons[7]?.value ?? 0;
      const lt = pad.buttons[6]?.value ?? 0;
      if (rt > 0.05 || lt > 0.05) this.lever = Math.max(-1, Math.min(1, rt - lt));
      break;
    }
  }

  consumeCameraToggle(): boolean {
    const t = this.cameraToggled;
    this.cameraToggled = false;
    return t;
  }
}
