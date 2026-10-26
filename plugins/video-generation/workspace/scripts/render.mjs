// Renders videos to out/<series>/<id>.mp4, one after another.
// Usage: node scripts/render.mjs <series | series/id> [...] [--draft]
//   --draft  half size and lighter encoding, to out/<series>/<id>-draft.mp4: for the user to watch the motion and hear
//            the voice before the final render. It is not a finished file: build.sh never uses it.
import {renderMedia} from '@remotion/renderer';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {expand, open} from './lib.mjs';

const draft = process.argv.includes('--draft');
for (const video of expand(process.argv.slice(2).filter((a) => a !== '--draft'))) {
  const {serveUrl, composition, browserExecutable} = await open(video);
  const out = `out/${video}${draft ? '-draft' : ''}.mp4`;
  mkdirSync(dirname(out), {recursive: true});
  let tenth = 0;
  const onProgress = ({progress}) => {
    if (progress * 10 >= tenth + 1) console.log(`${video}: ${++tenth * 10}%`);
  };
  // gl 'angle' draws on the graphics chip: 3D scenes render about 13 times faster than in software, with the same picture.
  const quality = draft ? {scale: 0.5, jpegQuality: 70, crf: 30, x264Preset: 'veryfast'} : {jpegQuality: 95};
  await renderMedia({serveUrl, composition, codec: 'h264', outputLocation: out, imageFormat: 'jpeg', ...quality, chromiumOptions: {gl: 'angle'}, browserExecutable, onProgress});
  console.log(out);
}
