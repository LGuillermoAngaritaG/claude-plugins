// Renders videos to out/<series>/<id>.mp4, one after another.
// Usage: node scripts/render.mjs <series | series/id> [...]
import {renderMedia} from '@remotion/renderer';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {expand, open} from './lib.mjs';

for (const video of expand(process.argv.slice(2))) {
  const {serveUrl, composition} = await open(video);
  const out = `out/${video}.mp4`;
  mkdirSync(dirname(out), {recursive: true});
  let tenth = 0;
  const onProgress = ({progress}) => {
    if (progress * 10 >= tenth + 1) console.log(`${video}: ${++tenth * 10}%`);
  };
  await renderMedia({serveUrl, composition, codec: 'h264', outputLocation: out, imageFormat: 'jpeg', jpegQuality: 95, onProgress});
  console.log(out);
}
