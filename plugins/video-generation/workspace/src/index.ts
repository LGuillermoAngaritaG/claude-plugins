import {registerRoot} from 'remotion';
import {defsIn, rootOf} from './Root';

// Every video folder (src/videos/<series>/<id>/), found by webpack. This entry is for `remotion studio`.
// The scripts bundle one video at a time instead, so one broken video cannot block the others.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ctx = (require as any).context('./videos', true, /^\.\/[^/]+\/[^/]+\/index\.tsx$/);

registerRoot(rootOf(ctx.keys().flatMap((k: string) => defsIn(ctx(k), k.split('/')[1]))));
