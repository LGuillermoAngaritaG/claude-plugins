import {bundle} from '@remotion/bundler';
import {execFileSync} from 'node:child_process';
import {ensureBrowser, selectComposition} from '@remotion/renderer';
import {existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {basename, dirname, join} from 'node:path';

// A video is named `<series>/<id>`: the folder src/videos/<series>/<id>/.

/** `series/id` stays as it is; a bare `series` becomes all its videos, in order. */
export const expand = (args) =>
  args.flatMap((a) =>
    a.includes('/') ? [a] : readdirSync(`src/videos/${a}`).filter((d) => /^\d/.test(d)).sort().map((d) => `${a}/${d}`),
  );

/**
 * The browser, run from a copy in ~/Library/Caches. When a script started directly from inside ~/Documents
 * (scripts/build.sh) runs it from node_modules/.remotion, macOS does not let its GPU helper read the browser's
 * own files: the helper dies six times and the browser quits ("browser has disconnected"). The copy is an
 * APFS clone, so it takes no disk space; it is made once per browser version.
 */
const browser = async () => {
  const {path} = await ensureBrowser();
  const dir = join(homedir(), 'Library/Caches/remotion-browser', readFileSync(join(path, '../../../VERSION'), 'utf8').trim());
  if (!existsSync(dir)) {
    const tmp = `${dir}.${process.pid}`;
    mkdirSync(dirname(dir), {recursive: true});
    execFileSync('cp', ['-cR', dirname(path), tmp]); // -c: a clone
    try {
      renameSync(tmp, dir);
    } catch {
      rmSync(tmp, {recursive: true, force: true}); // another run made the copy first
    }
  }
  return join(dir, basename(path));
};

/** Bundles one video on its own, so a half-written video elsewhere cannot break this one. */
export const open = async (video) => {
  const [series, id] = video.split('/');
  mkdirSync('out/entry', {recursive: true});
  const entry = `out/entry/${series}-${id}.tsx`;
  writeFileSync(
    entry,
    `import {registerRoot} from 'remotion';\nimport {defsIn, rootOf} from '../../src/Root';\nimport * as mod from '../../src/videos/${video}';\n\nregisterRoot(rootOf(defsIn(mod, '${series}')));\n`,
  );
  // The bundle goes to a temp folder. `public/` (all the narration) is linked into it, not copied,
  // and the folder is removed when the script ends: a copy per run fills the disk.
  const serveUrl = await bundle({entryPoint: entry, symlinkPublicDir: true});
  process.on('exit', () => rmSync(serveUrl, {recursive: true, force: true}));
  const browserExecutable = await browser();
  return {serveUrl, browserExecutable, composition: await selectComposition({serveUrl, id: `${series}-${id}`, browserExecutable})};
};

/**
 * The scenes of a video: `start` and `n` in frames, `b` = the second at which each narration line starts.
 * Same timing rules as src/engine.tsx (pauses of 0.4, 0.3 and 0.7 s unless the script sets "pace", 30 fps).
 */
export const scenesOf = (video) => {
  const read = (f) => JSON.parse(readFileSync(`src/videos/${video}/${f}.json`, 'utf8'));
  const [script, timing] = [read('script'), read('timing')];
  const [lead, gap, tail] = script.pace ?? [0.4, 0.3, 0.7];
  let start = 0;
  return script.scenes.map(({id}) => {
    let t = lead;
    let last = 0;
    const b = timing[id].map((c) => {
      const at = t;
      last = c.gap ?? gap;
      t += c.dur + last;
      return at;
    });
    const n = Math.round((t - last + tail) * 30);
    start += n;
    return {id, start: start - n, n, b};
  });
};
