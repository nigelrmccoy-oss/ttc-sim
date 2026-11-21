import './style.css';
import { Game } from './game/Game';
import type { LineData } from './game/Track';

async function boot(): Promise<void> {
  const res = await fetch('./data/line1.json');
  if (!res.ok) throw new Error(`line1.json: HTTP ${res.status}`);
  const data = (await res.json()) as LineData;
  const game = new Game(document.getElementById('app')!, data);
  (window as unknown as { __ttcSim: unknown }).__ttcSim = game.debug; // read by the smoke test
  game.start();
}

boot().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML('beforeend', `<pre style="color:#f66;position:absolute;top:40%;left:20px">${String(err)}</pre>`);
});
