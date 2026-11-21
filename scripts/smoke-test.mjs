/**
 * Headless smoke test: serves dist/ with `vite preview`, loads it in headless Chromium
 * (SwiftShader WebGL), and checks: no console errors / page errors, a sized canvas exists,
 * the render loop is running, the frame is not blank, and holding W moves the train.
 * Screenshot goes to logs/smoke.png. Requires `npm run build` first.
 */
import { spawn } from 'node:child_process';
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
fs.mkdirSync(path.join(root, 'logs'), { recursive: true });
const freePort = () => new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });

let failed = 0;
const assert = (name, cond, detail = '') => {
  if (!cond) failed++;
  console[cond ? 'log' : 'error'](`  ${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};

const port = await freePort();
const server = spawn(path.join(root, 'node_modules/.bin/vite'), ['preview', '--port', String(port), '--strictPort', '--host', '127.0.0.1'],
  { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
const serverLog = fs.createWriteStream(path.join(root, 'logs/smoke-server.log'));
server.stdout.pipe(serverLog); server.stderr.pipe(serverLog);
const killServer = () => { try { process.kill(-server.pid, 'SIGTERM'); } catch {} };
process.on('exit', killServer);

let browser;
const hardTimeout = setTimeout(() => { console.error('smoke test timed out'); killServer(); process.exit(2); }, 180_000);
try {
  const url = `http://127.0.0.1:${port}/`;
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(url)).ok) break; } catch {}
    await new Promise((r) => setTimeout(r, 200));
  }
  browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ttcSim && window.__ttcSim.frames > 20, null, { timeout: 60_000 });

  const canvas = await page.evaluate(() => { const c = document.querySelector('#app canvas'); return c ? { w: c.width, h: c.height } : null; });
  assert('canvas renders', !!canvas && canvas.w > 100 && canvas.h > 100, JSON.stringify(canvas));
  const dbg = await page.evaluate(() => ({ ...window.__ttcSim }));
  assert('line data loaded', dbg.stations === 38 && dbg.trackLengthM > 36000, `${dbg.stations} stations, ${(dbg.trackLengthM / 1000).toFixed(2)} km`);

  const shot = await page.screenshot({ path: path.join(root, 'logs/smoke.png') });
  // Crude blank check: PNG of a single flat colour compresses to a few KB.
  assert('frame is not blank', shot.length > 20_000, `${shot.length} bytes`);

  // SwiftShader renders slowly and frame dt is capped at 0.1 s, so sim time runs slower than
  // wall time here; hold W long enough to see clear movement.
  const t0 = Date.now(), f0 = (await page.evaluate(() => window.__ttcSim.frames));
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(6000);
  await page.keyboard.up('KeyW');
  await page.waitForTimeout(1000);
  const after = await page.evaluate(() => ({ ...window.__ttcSim }));
  console.log(`  info  headless fps ≈ ${((after.frames - f0) / ((Date.now() - t0) / 1000)).toFixed(1)}`);
  assert('holding W moves the train', after.speedKmh > 0.2 && after.headS > dbg.headS + 0.01, `v=${after.speedKmh.toFixed(1)} km/h, moved ${(after.headS - dbg.headS).toFixed(1)} m`);
  await page.keyboard.press('KeyC');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(root, 'logs/smoke-chase.png') });
  const hud = await page.textContent('#hud');
  assert('HUD shows speed and next station', /km\/h/.test(hud) && /Next:|Stopped at/.test(hud));
  assert('no console errors', errors.length === 0, errors.slice(0, 5).join(' | '));
} catch (e) {
  failed++;
  console.error('  FAIL  smoke test crashed —', e?.message ?? e);
} finally {
  clearTimeout(hardTimeout);
  await browser?.close().catch(() => {});
  killServer();
}
console.log(failed ? `\n${failed} FAILED` : '\nsmoke test passed');
process.exit(failed ? 1 : 0);
