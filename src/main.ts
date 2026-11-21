import './style.css';
import { Game, type GameData } from './game/Game';
import { setOrigin } from './game/geo';
import type { LineData } from './game/Track';

async function json<T>(url: string, required = true): Promise<T | null> {
  const res = await fetch(url);
  if (!res.ok) { if (required) throw new Error(`${url}: HTTP ${res.status}`); return null; }
  return (await res.json()) as T;
}

async function boot(): Promise<void> {
  const line = (await json<LineData>('./data/line1.json'))!;
  setOrigin(line.origin.lat, line.origin.lon);
  const [profile, stations, tIndex, tBin, imagery, corridor] = await Promise.all([
    json<GameData['profile']>('./data/line1_profile.json', false),
    json<{ stations: GameData['stations'] }>('./data/line1_stations.json', false),
    json<NonNullable<GameData['terrain']>['index']>('./data/terrain/index.json', false),
    fetch('./data/terrain/terrain.bin').then((r) => (r.ok ? r.arrayBuffer() : null)),
    json<GameData['imagery']>('./imagery/index.json', false).catch(() => null), // optional: baked locally, not in git
    json<GameData['corridor']>('./data/corridor.json', false),
  ]);
  const data: GameData = {
    line, profile, stations: stations?.stations ?? [],
    terrain: tIndex && tBin ? { index: tIndex, bin: tBin } : null,
    imagery, corridor,
  };
  const game = new Game(document.getElementById('app')!, data);
  const w = window as unknown as { __ttcSim: unknown; __ttcSimTeleport: (s: number) => void };
  w.__ttcSim = game.debug; // read by the smoke test
  w.__ttcSimTeleport = (s) => game.teleport(s);
  game.start();
}

boot().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML('beforeend', `<pre style="color:#f66;position:absolute;top:40%;left:20px">${String(err)}</pre>`);
});
