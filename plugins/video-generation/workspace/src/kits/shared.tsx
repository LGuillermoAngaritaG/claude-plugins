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
    <div data-box="" data-caption="" style={{position: 'absolute', left: x, top: y, transform: `translate(-50%, -50%) scale(${pop.toFixed(3)})`, whiteSpace: 'nowrap', font: `${weight} ${size}px ${family}`, color, textShadow: shadow, textTransform: upper ? 'uppercase' : undefined}}>
      {all[k].map((w, i) => (
        <span key={i} style={{color: i === now ? hot(seed, theme) : undefined}}>
          {i ? ' ' : ''}
          {w.w.replace(/[.,;:]+$/, '')}
        </span>
      ))}
    </div>
  );
};

export type Row = {k: string; v: string; at: number};
/**
 * The answer card: a Short whose answer has several parts (picks, steps, tips, differences) builds it one row at a
 * time, each row at the moment the voice gives it, and keeps it on screen to the end. It sits in the top band under
 * the section title (y 360 to 700), clear of the right sixth where YouTube puts its buttons; over five rows, older
 * rows shrink so the card never grows into the picture. `hot` marks the row being said.
 */
export const AnswerCard: React.FC<{t: number; rows: Row[]; title?: string; x?: number; y?: number; w?: number; ink?: string; hot?: string; ground?: string; family?: string}> = ({t, rows, title, x = 80, y = 360, w = 800, ink = '#eef2f3', hot = '#3ed0cc', ground = 'rgba(10,16,20,0.72)', family = 'Menlo, monospace'}) => {
  const shown = rows.filter((r) => t >= r.at - 0.1);
  if (!shown.length) return null;
  const now = shown.length - 1;
  const small = shown.length > 5;
  return (
    <div data-box="" style={{position: 'absolute', left: x, top: y, width: w, padding: '18px 26px', borderRadius: 18, background: ground, border: `2px solid ${hot}55`, fontFamily: family}}>
      {title && <div style={{font: `700 24px ${family}`, letterSpacing: 2, color: `${ink}99`, marginBottom: 10}}>{title}</div>}
      {shown.map((r, i) => {
        const p = Math.min(1, (t - r.at + 0.1) / 0.35);
        const live = i === now && t < r.at + 4;
        const size = small && i < now - 1 ? 26 : 34;
        return (
          <div key={i} style={{display: 'flex', gap: 24, padding: '6px 0', opacity: p, transform: `translateY(${(1 - p) * 12}px)`, borderTop: i ? `1px solid ${ink}22` : undefined}}>
            <div style={{width: '34%', font: `700 ${size}px ${family}`, color: live ? hot : `${ink}cc`}}>{r.k}</div>
            <div style={{flex: 1, font: `700 ${size}px ${family}`, color: live ? hot : ink}}>{r.v}</div>
          </div>
        );
      })}
    </div>
  );
};
