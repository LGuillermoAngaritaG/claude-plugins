// Screenshots of real web pages for a news video: the announcement, the paper, the release notes, shown as they are.
// Usage: node scripts/shots.mjs <series/id> [name ...] [--again]
//   Reads "shots": {"<name>": {"url": "https://...", "find": "words to mark"}} from script.json, opens each page in the
//   browser the renders use (no window), hides banners that stay on screen (cookies, headers), scrolls the words a third
//   down the view and saves public/art/<series>/<id>/shots/<name>.png (1440 x 900 at 2x). shots.json beside the script
//   gets, per shot, the picture, the box of the words (in the 1440 x 900 view), the page title, the address it ended on
//   and when it was taken. A shot already taken of the same address and words is kept, unless --again.
//   A page that blocks it (an error status, a "checking your browser" page) or words it cannot find are reported and
//   the command exits 1: take another primary source, or ask the user for a screenshot.
import {spawn} from 'node:child_process';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {browser} from './lib.mjs';

const args = process.argv.slice(2);
const again = args.includes('--again');
const [video, ...only] = args.filter((a) => a !== '--again');
if (!video?.includes('/')) {
  console.log(readFileSync(new URL(import.meta.url), 'utf8').split('\nimport')[0]);
  process.exit(1);
}
const dir = `src/videos/${video}`;
const wanted = Object.entries(JSON.parse(readFileSync(`${dir}/script.json`, 'utf8')).shots ?? {}).filter(([n]) => !only.length || only.includes(n));
const list = existsSync(`${dir}/shots.json`) ? JSON.parse(readFileSync(`${dir}/shots.json`, 'utf8')) : {};
const todo = wanted.filter(([n, s]) => again || list[n]?.url !== s.url || list[n]?.find !== s.find || !existsSync(`public/${list[n].src}`));
if (!todo.length) {
  console.log(`${video}: ${wanted.length} shot(s), all taken`);
  process.exit(0);
}

const W = 1440, H = 900;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = 9300 + (process.pid % 500);
const profile = mkdtempSync(join(tmpdir(), 'shots-'));
const proc = spawn(await browser(), [`--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--hide-scrollbars', `--window-size=${W},${H}`, 'about:blank'], {stdio: 'ignore'});
// The browser writes to its profile until it has exited: wait for that before removing it.
const quit = async () => {
  const gone = new Promise((r) => proc.once('exit', r));
  proc.kill();
  await gone;
  rmSync(profile, {recursive: true, force: true, maxRetries: 5});
};
let tab;
for (let i = 0; i < 80 && !tab; i++) {
  await sleep(250);
  tab = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json()).then((l) => l.find((t) => t.type === 'page')).catch(() => null);
}
if (!tab) await quit(), console.log(`${video}: the browser did not start`), process.exit(1);
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
const waiting = [];
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pending.has(d.id)) pending.get(d.id)(d.error ? {error: d.error.message} : d.result), pending.delete(d.id);
  else waiting.filter((w) => w.method === d.method).forEach((w) => w.done(d.params));
};
const send = (method, params = {}) => new Promise((r) => (pending.set(++id, r), ws.send(JSON.stringify({id, method, params}))));
const once = (method, ms) => new Promise((r) => {
  const w = {method, done: (p) => (waiting.splice(waiting.indexOf(w), 1), r(p))};
  waiting.push(w);
  setTimeout(() => waiting.includes(w) && (waiting.splice(waiting.indexOf(w), 1), r(null)), ms);
});
await send('Page.enable');
await send('Network.enable');
await send('Emulation.setDeviceMetricsOverride', {width: W, height: H, deviceScaleFactor: 2, mobile: false});
let status = 0;
waiting.push({method: 'Network.responseReceived', done: (p) => p.type === 'Document' && !status && (status = p.response.status)});

// In the page: hide what stays on screen while it scrolls, find the element that holds the words, and put it a
// third down the view. Returns its box, or null.
const inPage = (find) => {
  // Banners and headers, not a page that lives in a fixed layer (some sites put the whole article in one).
  for (const el of document.querySelectorAll('body *')) {
    const pos = getComputedStyle(el).position;
    if ((pos === 'fixed' || pos === 'sticky') && el.getBoundingClientRect().height < innerHeight * 0.4) el.style.setProperty('display', 'none', 'important');
  }
  const norm = (s) => s.replace(/\s+/g, ' ').trim().toLowerCase();
  const text = norm(document.body?.innerText ?? '');
  const blocked = /just a moment|checking your browser|verify you are human|access denied|attention required|enable javascript and cookies/.test(text.slice(0, 600));
  let box = null;
  if (find) {
    const seen = (el) => el.offsetParent !== null && el.getBoundingClientRect().width > 8 && el.getBoundingClientRect().height > 8;
    const hits = [...document.querySelectorAll('body *')].filter((el) => seen(el) && norm(el.innerText ?? '').includes(norm(find)));
    // The innermost elements that hold the words; of those, the one in the biggest type (a heading over a tag or a button).
    const size = (el) => parseFloat(getComputedStyle(el).fontSize);
    const el = hits.filter((h) => !hits.some((o) => o !== h && h.contains(o))).sort((a, b) => size(b) - size(a))[0];
    if (el) {
      const r0 = el.getBoundingClientRect();
      window.scrollTo({top: Math.max(0, window.scrollY + r0.top - innerHeight / 3), behavior: 'instant'}); // not the page's smooth scroll
      window.__shot = el; // measured again just before the picture, once the page has settled
      box = true;
    }
  }
  return {box, blocked, title: document.title, url: location.href};
};
// The box of the words themselves (not the whole width of their block), where they are now.
const boxNow = () => {
  if (!window.__shot) return null;
  const range = document.createRange();
  range.selectNodeContents(window.__shot);
  const r = range.getBoundingClientRect();
  return [r.left, r.top, r.width, r.height].map(Math.round);
};

const bad = [];
mkdirSync(`public/art/${video}/shots`, {recursive: true});
for (const [name, {url, find}] of todo) {
  status = 0;
  const loaded = once('Page.loadEventFired', 20000);
  const nav = await send('Page.navigate', {url});
  if (nav.error || nav.errorText) {
    bad.push(`${name}: ${url} did not open (${nav.error ?? nav.errorText})`);
    continue;
  }
  await loaded;
  await sleep(2500); // pages that draw after load
  const r = await send('Runtime.evaluate', {expression: `(${inPage})(${JSON.stringify(find ?? '')})`, returnByValue: true});
  const got = r.result?.value ?? {};
  await sleep(1800); // text that fades or slides in when it scrolls into view
  if (got.box) got.box = (await send('Runtime.evaluate', {expression: `(${boxNow})()`, returnByValue: true})).result?.value ?? null;
  const png = await send('Page.captureScreenshot', {format: 'png'});
  const src = `art/${video}/shots/${name}.png`;
  writeFileSync(`public/${src}`, Buffer.from(png.data, 'base64'));
  list[name] = {src, w: W, h: H, box: got.box ?? null, url, find: find ?? '', final: got.url, title: got.title, taken: new Date().toISOString()};
  const why = status >= 400 ? `the page answered ${status}` : got.blocked ? 'the page asks to check the browser' : find && !got.box ? `"${find}" is not on the page` : '';
  if (why) bad.push(`${name}: ${why} (${url}); look at public/${src}`);
  console.log(`${video}: ${name} ${why ? 'PROBLEM' : 'ok'}  ${got.title ?? ''}`.slice(0, 140));
}
writeFileSync(`${dir}/shots.json`, JSON.stringify(list, null, 1) + '\n');
ws.close();
await quit();
if (bad.length) console.log(`${bad.length} problem(s):\n  ${bad.join('\n  ')}`);
process.exit(bad.length ? 1 : 0);
