// Parts for a news briefing (the news-video skill), on top of the explainer look: a real page shown as it is
// (scripts/shots.mjs), and the name of a segment between stories. The channel's colours come from its profile.
import React, {useContext} from 'react';
import {Img, staticFile} from 'remotion';
import {Live} from '../engine';
import {K, SANS, ease, useFrame, useTheme} from './explainer';

/** One entry of shots.json: the picture, its view size, the box of the marked words in that view, the address. */
export type Shot = {src: string; w: number; h: number; box: number[] | null; final: string; title?: string};

/**
 * A screenshot of a real page in a plain browser frame, with the site and the date on its bar: proof of where a story
 * comes from, held two or three seconds, never the explanation. It does not zoom (`p` is left from older scenes and
 * ignored); from `mark` (seconds) a marker draws over the marked words. `date` is the day the page was published, as
 * the voice says it ("Oct 24, 2026"); give its claim a "date" in facts.json.
 */
export const Page: React.FC<{shot: Shot; t: number; p?: number; date: string; mark?: number; o?: number}> = ({shot, t, date, mark, o = 1}) => {
  const f = useFrame();
  const accent = useTheme()?.accent ?? K.blue;
  const Pic = useContext(Live) ? Img : 'img';
  if (o <= 0.01) return null;
  const tall = f.h > f.w;
  const w = tall ? 960 : 1280;
  const h = (w * shot.h) / shot.w;
  const left = (f.w - w) / 2;
  const top = tall ? 300 : 52;
  const k = w / shot.w;
  const [bx, by, bw, bh] = shot.box ?? [shot.w / 2, shot.h / 3, 0, 0];
  const ink = mark === undefined ? 0 : ease(t, mark, 0.7);
  const site = shot.final.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
  return (
    <div data-still="" style={{position: 'absolute', left, top, width: w, opacity: Math.min(1, o * 1.4), borderRadius: 18, overflow: 'hidden', boxShadow: '0 18px 50px rgba(0,0,0,.35)', background: '#ffffff'}}>
      <div style={{height: 54, display: 'flex', alignItems: 'center', gap: 18, padding: '0 22px', background: '#eceff1'}}>
        {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
          <span key={c} style={{width: 14, height: 14, borderRadius: 7, background: c}} />
        ))}
        <div data-box="" style={{font: `600 28px ${SANS}`, color: K.ink, marginLeft: 10}}>{site}</div>
        <div data-box="" style={{font: `700 28px ${SANS}`, color: K.muted, marginLeft: 'auto'}}>{date}</div>
      </div>
      <div style={{position: 'relative', width: w, height: h, overflow: 'hidden'}}>
        <div style={{position: 'absolute', inset: 0}}>
          <Pic src={staticFile(shot.src)} style={{display: 'block', width: w, height: h}} />
          {shot.box && ink > 0 && <div style={{position: 'absolute', left: bx * k - 6, top: by * k - 4, width: (bw * k + 12) * ink, height: bh * k + 8, background: accent, opacity: 0.28, borderRadius: 6}} />}
        </div>
      </div>
    </div>
  );
};

/** The name of a segment ("What actually shipped"), big in the middle with a short line in the accent, from `at`. */
export const Segment: React.FC<{t: number; at?: number; children: string}> = ({t, at = 0.2, children}) => {
  const theme = useTheme();
  const o = ease(t, at, 0.6);
  return o <= 0.01 ? null : (
    <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: o, transform: `translateY(${(1 - o) * 20}px)`}}>
      <div data-box="" style={{font: `900 84px ${SANS}`, color: theme?.ink ?? K.ink, textAlign: 'center', maxWidth: '80%'}}>{children}</div>
      <div style={{width: 160 * o, height: 8, borderRadius: 4, marginTop: 26, background: theme?.accent ?? K.blue}} />
    </div>
  );
};
