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

export type Row = {k: string; v: string; at: number; note?: string};
/**
 * The answer card, a countdown the viewer waits through: a Short whose answer has several parts (picks, steps, tips,
 * differences) shows every slot from `from` (the hook, or the line that names the list), each with its key and a
 * locked answer, then opens one slot at the moment the voice gives it, and keeps all of them to the end. Empty slots
 * make the viewer stay for the last one. It sits in the top band under the section title (from y 390), clear of the
 * right sixth where YouTube puts its buttons, never at the bottom. `hot` lights the slot being said.
 */
export const AnswerCard: React.FC<{t: number; rows: Row[]; title?: string; from?: number; x?: number; y?: number; w?: number; ink?: string; hot?: string; ground?: string; family?: string; sans?: string}> = ({t, rows, title, from = 0, x = 80, y = 390, w = 780, ink = '#eef2f3', hot = '#3ed0cc', ground = 'rgba(12,20,26,0.78)', family = 'Menlo, monospace', sans = 'Inter, system-ui, sans-serif'}) => {
  if (t < from - 0.1) return null;
  const now = rows.reduce((n, r, i) => (t >= r.at - 0.1 ? i : n), -1);
  const h = rows.length > 5 ? 54 : 66;
  const ease = (u: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, u)), 3);
  return (
    <div data-box="" style={{position: 'absolute', left: x, top: y, width: w}}>
      {title && <div style={{font: `700 22px ${family}`, letterSpacing: 3, color: `${ink}88`, margin: '0 0 12px 6px'}}>{title}</div>}
      {rows.map((r, i) => {
        const enter = ease((t - from - i * 0.12) / 0.4); // the slots drop in one after another
        const open = ease((t - r.at + 0.1) / 0.45);
        const live = i === now && t < r.at + 3.5;
        const glow = live ? 1 - ease((t - r.at - 2.5) / 1) : 0;
        return (
          <div key={i} style={{display: 'flex', alignItems: 'center', height: h, marginBottom: 10, borderRadius: h / 2, overflow: 'hidden', opacity: enter, transform: `translateX(${(1 - enter) * -40}px)`,
            background: ground, border: `2px solid ${open > 0 ? hot : `${ink}22`}`, borderColor: open > 0 ? `${hot}${live ? 'ff' : '66'}` : `${ink}22`, boxShadow: glow > 0 ? `0 0 ${28 * glow}px ${hot}88` : undefined}}>
            <div style={{width: '30%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: open > 0 ? `${hot}${live ? '33' : '1c'}` : `${ink}0d`, font: `800 ${h * 0.46}px ${sans}`, color: open > 0 ? ink : `${ink}aa`, letterSpacing: -0.5}}>{r.k}</div>
            <div style={{position: 'relative', flex: 1, height: '100%', paddingLeft: 26}}>
              <div style={{position: 'absolute', left: 26, top: 0, height: '100%', display: 'flex', alignItems: 'center', gap: 10, opacity: 1 - open}}>
                {[0, 1, 2].map((d) => <div key={d} style={{width: 12, height: 12, borderRadius: 6, background: `${ink}${(0x30 + Math.round(40 * (0.5 + 0.5 * Math.sin(t * 4 - d - i)))).toString(16)}`}} />)}
              </div>
              <div style={{position: 'absolute', left: 26, top: 0, height: '100%', display: 'flex', alignItems: 'baseline', gap: 14, flexDirection: 'row', paddingTop: h * 0.28, opacity: open, transform: `translateY(${(1 - open) * 18}px)`}}>
                <span style={{font: `800 ${h * 0.44}px ${sans}`, color: live ? hot : ink, whiteSpace: 'nowrap'}}>{r.v}</span>
                {r.note && <span style={{font: `700 ${h * 0.32}px ${family}`, color: `${ink}99`, whiteSpace: 'nowrap'}}>{r.note}</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
