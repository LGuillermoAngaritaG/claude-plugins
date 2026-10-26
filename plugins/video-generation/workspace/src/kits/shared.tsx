import React, {useContext} from 'react';
import {staticFile} from 'remotion';
import {Channel, SceneProps, Seed, Theme, Word} from '../engine';

/** Registers a font file of public/fonts/. `weight` is one weight or a range, for a variable font: '400 700'. */
export const font = (family: string, file: string, weight = '400') => {
  document.fonts.add(new FontFace(family, `url(${staticFile(`fonts/${file}`)})`, {weight}));
};

/** The words of a scene in groups of at most `n` words and `max` letters, broken where a sentence or a clause ends: one group is on screen at a time. */
const groups = (words: Word[], max: number, n: number) => {
  const out: Word[][] = [];
  for (const w of words) {
    const g = out[out.length - 1];
    const full = !g || g.length === n || /[.,;:?!]$/.test(g[g.length - 1].w) || g.map((x) => x.w).join(' ').length + w.w.length + 1 > max;
    if (full) out.push([w]);
    else g.push(w);
  }
  return out;
};

type Style = {x?: number; y: number; size: number; family: string; weight: number; color: string; hot: (seed: string, theme: Channel | null) => string; upper?: boolean; shadow?: string; max?: number; words?: number};
/**
 * Captions that follow the voice, for a look's `overlay`: a few words at a time, the one being said in the `hot` colour.
 * They come from `words`, so they need the word times of scripts/align.py.
 */
export const captions = ({x = 540, y, size, family, weight, color, hot, upper, shadow, max = 16, words: n = 3}: Style): React.FC<SceneProps> => ({t, words}) => {
  const seed = useContext(Seed);
  const theme = useContext(Theme);
  const all = groups(words.flat(), max, n);
  const k = all.findIndex((g, i) => t >= g[0].at - 0.06 && t < (all[i + 1]?.[0].at ?? g[g.length - 1].end + 0.6) - 0.06);
  if (k < 0) return null;
  const now = all[k].reduce((n, w, i) => (t >= w.at - 0.06 ? i : n), 0); // the word being said: one at a time
  const pop = Math.min(1, 0.9 + (t - all[k][0].at + 0.06) * 1.2); // each group lands with a small push
  return (
    <div data-box="" style={{position: 'absolute', left: x, top: y, transform: `translate(-50%, -50%) scale(${pop.toFixed(3)})`, whiteSpace: 'nowrap', font: `${weight} ${size}px ${family}`, color, textShadow: shadow, textTransform: upper ? 'uppercase' : undefined}}>
      {all[k].map((w, i) => (
        <span key={i} style={{color: i === now ? hot(seed, theme) : undefined}}>
          {i ? ' ' : ''}
          {w.w.replace(/[.,;:]+$/, '')}
        </span>
      ))}
    </div>
  );
};
