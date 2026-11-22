import { chromium } from 'playwright';
import fs from 'node:fs';
const svg = fs.readFileSync('assets/icon/ttc-sim.svg', 'utf8');
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 256, height: 256 } });
await p.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
await p.locator('svg').screenshot({ path: 'assets/icon/ttc-sim-256.png', omitBackground: true });
await b.close();
