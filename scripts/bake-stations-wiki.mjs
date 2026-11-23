/**
 * Pull Line 1 station facts from offline English Wikipedia (kiwix-serve, zim
 * wikipedia_en_all_maxi_2026-08) and cross-check against the OSM stop positions.
 *
 * Needs kiwix-serve on http://127.0.0.1:8095 (KIWIX env to override).
 * Writes public/data/line1_stations.json. Raw infobox text is cached in scripts/raw/wiki/.
 * Text from Wikipedia is CC BY-SA 4.0; we only store short facts + the article title.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KIWIX = process.env.KIWIX ?? 'http://127.0.0.1:8095';
const BOOK = 'wikipedia_en_all_maxi_2026-08';
const line = JSON.parse(fs.readFileSync(path.join(root, 'public/data/line1.json'), 'utf8'));
const rawDir = path.join(root, 'scripts/raw/wiki');
fs.mkdirSync(rawDir, { recursive: true });

// Article titles where "<name> station" is not the article (checked by hand against the zim).
const TITLE_OVERRIDES = {
  'Union': 'Union_station_(TTC)',
  'King': 'King_station_(Toronto)',
  'Queen': 'Queen_station_(Toronto)',
  'College': 'College_station_(Toronto)',
  'Spadina': 'Spadina_station',
  'Bloor-Yonge': 'Bloor–Yonge_station',
  'Sheppard-Yonge': 'Sheppard–Yonge_station',
};

const decode = (s) => s.replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
const strip = (h) => decode(h.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<sup[\s\S]*?<\/sup>/g, '').replace(/<br\s*\/?>/g, '; ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

async function get(url) {
  const res = await fetch(url);
  return res.ok ? { url: res.url, text: await res.text() } : null;
}

// Full article HTML is cached in scripts/raw/wiki-html/ (git-ignored) so later bakes run offline, without kiwix.
const htmlDir = path.join(root, 'scripts/raw/wiki-html');
fs.mkdirSync(htmlDir, { recursive: true });
const OFFLINE = process.env.WIKI_OFFLINE === '1';

async function fetchArticle(name) {
  const cacheFile = path.join(htmlDir, `${name.replace(/[^\w]+/g, '_')}.html`);
  if (fs.existsSync(cacheFile)) {
    const html = fs.readFileSync(cacheFile, 'utf8');
    const title = html.match(/^<!-- title: (.*?) -->/)?.[1];
    if (title) return { title, html };
  }
  if (OFFLINE) throw new Error(`WIKI_OFFLINE=1 but no cached article for ${name} in scripts/raw/wiki-html/ (run the bake once with kiwix on 127.0.0.1:8095)`);
  const art = await fetchArticleLive(name);
  if (art) fs.writeFileSync(cacheFile, `<!-- title: ${art.title} -->\n${art.html}`);
  return art;
}

async function fetchArticleLive(name) {
  const candidates = [TITLE_OVERRIDES[name], `${name.replace(/-/g, '–')} station`, `${name} station`, `${name} station (Toronto)`].filter(Boolean);
  for (const c of candidates) {
    const t = c.replace(/ /g, '_');
    const r = await get(`${KIWIX}/content/${BOOK}/${encodeURIComponent(t)}`);
    if (r && /Line 1 Yonge/.test(r.text) && /infobox/.test(r.text)) return { title: decodeURIComponent(r.url.split('/').pop()), html: r.text };
  }
  return null;
}

function infobox(html) {
  const i = html.indexOf('class="infobox');
  if (i < 0) return {};
  const end = html.indexOf('</table>', i);
  const box = html.slice(i, end);
  const rows = {};
  for (const m of box.matchAll(/<th[^>]*class="infobox-label"[^>]*>([\s\S]*?)<\/th>\s*<td[^>]*class="infobox-data[^"]*"[^>]*>([\s\S]*?)<\/td>/g)) {
    rows[strip(m[1])] = strip(m[2]);
  }
  const geo = box.match(/class="geo"[^>]*>\s*([-\d.]+);\s*([-\d.]+)/) ?? html.match(/class="geo"[^>]*>\s*([-\d.]+);\s*([-\d.]+)/);
  if (geo) rows.__lat = +geo[1], rows.__lon = +geo[2];
  return rows;
}

function leadText(html) {
  const body = html.slice(html.indexOf('</table>', html.indexOf('class="infobox')));
  const ps = [...body.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => strip(m[1])).filter((p) => p.length > 40);
  return { lead: ps.slice(0, 3).join(' '), all: ps.join(' ') };
}

const platformType = (s) => {
  if (!s) return null;
  const t = s.toLowerCase();
  const island = /island|centre platform|center platform/.test(t), side = /side/.test(t);
  return island && side ? 'island+side' : island ? 'island' : side ? 'side' : s;
};
const structure = (rows, lead) => {
  const s = (rows['Structure type'] ?? '').toLowerCase();
  if (/under/.test(s)) return 'underground';
  if (/elevated/.test(s)) return 'elevated';
  if (/open cut|cutting/.test(s)) return 'open cut';
  if (/above ground|at[- ]grade|surface|ground/.test(s)) return 'surface';
  if (/\bunderground\b[^.]{0,40}\bstation\b|\bstation\b[^.]{0,40}\bunderground\b/i.test(lead)) return 'underground';
  if (/\bopen[- ]cut\b/i.test(lead)) return 'open cut';
  return null;
};
const opened = (s) => {
  if (!s) return null;
  // Multi-line stations list each line's date; take the Line 1 one (or the first date).
  const l1 = s.match(/\(\s*(\d{4}-\d{2}-\d{2})\s*\)\s*\(Line 1\)/) ?? s.match(/Line 1:[^(]*\(\s*(\d{4}-\d{2}-\d{2})\s*\)/);
  const iso = l1 ?? s.match(/\(\s*(\d{4}-\d{2}-\d{2})\s*\)/);
  return iso ? iso[1] : s.split(';')[0].trim();
};
const NUM = { one: 1, single: 1, two: 2, three: 3, four: 4, five: 5 };
function levels(rows, text) {
  if (rows.Levels) return { value: rows.Levels, basis: 'infobox' };
  const m = text.match(/\b(one|two|three|four|five|single|\d)[- ](?:level|storey|story)\b/i) ?? text.match(/\b(one|two|three|four|five|\d) (?:levels|storeys|floors)\b/i);
  if (!m) return null;
  const n = NUM[m[1].toLowerCase()] ?? +m[1];
  return { value: n, basis: `article text: "${m[0]}"` };
}
function neighbourhood(lead) {
  const pats = [/in the ([A-Z][\w'.]*(?:[\s-][A-Z][\w'.]*)*) (?:neighbourhood|area|district)/, /neighbourhood of ([A-Z][\w'.]*(?:[\s-][A-Z][\w'.]*)*)/, /located in ([A-Z][\w'.]*(?:[\s-][A-Z][\w'.]*)*)/];
  for (const p of pats) { const m = lead.match(p); if (m && !/Toronto$|Ontario/.test(m[1])) return m[1]; }
  return null;
}

const R = 6378137;
const distM = (a, b) => Math.hypot((b.lon - a.lon) * Math.PI / 180 * R * Math.cos(a.lat * Math.PI / 180), (b.lat - a.lat) * Math.PI / 180 * R);
const osmRaw = JSON.parse(fs.readFileSync(path.join(root, 'scripts/raw/line1-relation-102388.json'), 'utf8'));
const osmNodes = new Map(osmRaw.elements.filter((e) => e.type === 'node').map((e) => [e.id, e]));

const out = [];
for (const st of line.stations) {
  const art = await fetchArticle(st.name);
  const osm = osmNodes.get(st.osmStopNode);
  if (!art) { out.push({ name: st.name, wikipedia: null, missing: true }); console.log(`MISSING  ${st.name}`); continue; }
  const rows = infobox(art.html);
  const { lead, all } = leadText(art.html);
  fs.writeFileSync(path.join(rawDir, `${st.name.replace(/[^\w]+/g, '_')}.json`), JSON.stringify({ title: art.title, rows, lead: lead.slice(0, 1500) }, null, 1));
  const wikiPos = rows.__lat != null ? { lat: rows.__lat, lon: rows.__lon } : null;
  const d = wikiPos ? distM(wikiPos, { lat: osm.lat, lon: osm.lon }) : null;
  const rec = {
    name: st.name,
    wikipedia: { title: art.title, source: `kiwix ${BOOK}`, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(art.title)}` },
    coordinates: wikiPos,
    osmStop: { lat: osm.lat, lon: osm.lon, node: st.osmStopNode },
    wikiVsOsmM: d == null ? null : Math.round(d),
    coordMismatch: d != null && d > 100,
    opened: opened(rows.Opened),
    platformsRaw: rows.Platforms ?? null,
    platformType: platformType(rows.Platforms),
    tracks: rows.Tracks ? +rows.Tracks.match(/\d+/)?.[0] || rows.Tracks : null,
    levels: levels(rows, all),
    structure: structure(rows, lead),
    structureRaw: rows['Structure type'] ?? null,
    neighbourhood: neighbourhood(lead) ?? neighbourhood(all),
    address: rows.Location ?? rows.Address ?? null,
  };
  out.push(rec);
  console.log(`${rec.coordMismatch ? 'MISMATCH' : 'ok      '} ${st.name.padEnd(28)} ${String(rec.wikiVsOsmM).padStart(5)} m  ${String(rec.platformType).padEnd(12)} ${String(rec.structure).padEnd(12)} ${rec.opened}  lv=${rec.levels?.value} nb=${rec.neighbourhood}`);
}
fs.writeFileSync(path.join(root, 'public/data/line1_stations.json'), JSON.stringify({
  source: {
    facts: `English Wikipedia via offline kiwix zim ${BOOK} (text CC BY-SA 4.0; per-station article titles below)`,
    osm: 'Stop positions: OpenStreetMap contributors, ODbL 1.0 (relation 102388)',
    extracted: `kiwix ${BOOK} (article HTML cached in scripts/raw/wiki-html/)`,
    note: 'coordMismatch = Wikipedia infobox coordinates more than 100 m from the OSM stop position (OSM marks the train stop point, Wikipedia usually the station building/centre).',
  },
  stations: out,
}, null, 1));
console.log(`wrote ${out.length} stations, ${out.filter((s) => s.missing).length} missing, ${out.filter((s) => s.coordMismatch).length} mismatched`);
