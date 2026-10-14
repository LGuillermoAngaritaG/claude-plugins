// The ad look: footage that fills the screen (AI clips from the ai-clips skill, or still frames with a slow camera),
// a headline, product screens drawn in code on a panel, captions that follow the voice, and an end card.
// Upright, 1080 x 1920. Skill: ad-video.
import React, {useContext} from 'react';
import {Img, OffthreadVideo, staticFile} from 'remotion';
import {Live, Look, SceneProps, Seed, pick} from '../engine';
import {lerp, lin, ramp} from '../kit';
import {captions, font} from './shared';
export {Shot} from './story';

export const W = 1080;
export const H = 1920;
export const A = {bg: '#050506', white: '#ffffff', ink: '#16161a', muted: '#6b6b70', line: '#e4e4e7', paper: '#f7f6f2'};
export const SANS = 'Montserrat, sans-serif';
font('Montserrat', 'Montserrat.ttf', '100 900');

// What differs from one ad to the next: the colour of the spoken word and of the marks. A brand colour replaces it.
const accent = (seed: string) => pick(seed, 'accent', ['#ffd84d', '#7fe0ff', '#ff8a65', '#b6f36a']);
/** The accent of this ad: the word being said, underlines, the button of the end card unless the brand sets its own. */
export const useAccent = () => accent(useContext(Seed));

// Inside the safe box, centred on it: x 120 to 888.
const MID = 504;
const Caption = captions({x: MID, y: 1100, size: 66, max: 15, family: SANS, weight: 900, color: A.white, hot: accent, upper: true, shadow: '0 0 14px #000, 0 4px 26px #000, 0 0 3px #000'});
// Over every scene: a shade at the top and at the bottom, so white text reads on any footage, then the captions.
const Over: React.FC<SceneProps> = (p) => (
  <>
    <div style={{position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,.5) 0%, transparent 22%, transparent 42%, rgba(0,0,0,.55) 58%, rgba(0,0,0,.35) 75%, rgba(0,0,0,.2) 100%)'}} />
    <Caption {...p} />
  </>
);

export const AD: Look = {
  w: W,
  h: H,
  bg: A.bg,
  // The strictest of the safe zones of TikTok In-Feed, Reels ads (top 14 %, bottom 35 %, sides 6 %) and Shorts (right 192 px):
  // the bottom third and the right edge are covered by the app. Footage can run under them; text cannot.
  safe: [120, 288, 888, 1248],
  minText: 40,
  fonts: ['900 60px Montserrat', '600 60px Montserrat'],
  cut: true,
  overlay: Over,
};

/**
 * A video file under public/ that fills the screen: an AI clip, a screen recording, real footage. `from` skips that many
 * seconds into it. Its own sound is off unless `vol` is given. A clip only covers its own length: a scene longer than the
 * clip needs a second clip or a `Shot`.
 */
export const Clip: React.FC<{src: string; from?: number; vol?: number; o?: number}> = ({src, from = 0, vol = 0, o = 1}) => {
  const style: React.CSSProperties = {position: 'absolute', inset: 0, width: W, height: H, objectFit: 'cover', opacity: o};
  // The dead-screen check of scripts/stills.mjs walks scenes outside the player: there the clip is a plain box.
  if (!useContext(Live)) return o <= 0 ? null : <div data-clip="" style={style} />;
  return o <= 0 ? null : <OffthreadVideo src={staticFile(src)} trimBefore={Math.round(from * 30)} volume={vol} style={style} />;
};

/** The words that sell the scene, big, near the top: the hook, a claim, a number. One or two short lines. */
export const Headline: React.FC<{t: number; at?: number; y?: number; size?: number; color?: string; children: React.ReactNode}> = ({t, at = 0, y = 420, size = 80, color = A.white, children}) =>
  t < at ? null : (
    <div
      data-box=""
      style={{position: 'absolute', left: MID, top: y, width: 740, transform: `translate(-50%, -50%) scale(${lerp(1.12, 1, ramp(t, at, 0.25)).toFixed(3)})`, opacity: lin(t, at, 0.12), textAlign: 'center', font: `900 ${size}px/1.08 ${SANS}`, letterSpacing: -1.5, color, textShadow: '0 4px 28px rgba(0,0,0,.6)'}}
    >
      {children}
    </div>
  );

/**
 * A white panel that rises into the middle of the screen: the frame for a product screen drawn in code (the series draws
 * what is inside, copying the real product). `out` is when it leaves. It sits between x = 120 and 888, from `top` down,
 * and should end above y = 1040, clear of the captions: `h` at most 700 with the default top.
 */
export const Panel: React.FC<{t: number; at?: number; out?: number; top?: number; h: number; children: React.ReactNode}> = ({t, at = 0, out, top = 330, h, children}) => {
  const up = ramp(t, at, 0.45);
  const gone = out === undefined ? 0 : ramp(t, out, 0.3);
  if (up <= 0 || gone >= 1) return null;
  return (
    <div style={{position: 'absolute', left: 120, right: W - 888, top, height: h, background: '#fff', border: `2px solid ${A.line}`, borderRadius: 32, boxShadow: '0 30px 80px rgba(0,0,0,.4)', overflow: 'hidden', color: A.ink, fontFamily: SANS, opacity: Math.min(up * 2, 1 - gone), transform: `translateY(${((1 - up) * 160 + gone * 60).toFixed(1)}px)`}}>
      {children}
    </div>
  );
};

/**
 * The last scene: logo, name, one line on what it is, the call to action as a button, and where to go. Everything sits
 * inside the safe box, above the captions, which also run here: keep the end card dark, or they will not read.
 * `color` is the brand colour of the button. Its voice line needs about 2.5 s (seven or eight words).
 */
export const EndCard: React.FC<{t: number; name: string; line: string; cta: string; url?: string; logo?: string; color?: string; bg?: string}> = ({t, name, line, cta, url, logo, color, bg = A.bg}) => {
  const accent = useAccent();
  const y0 = logo ? 0 : -90;
  const at = (s: number, y: number, size: number): React.CSSProperties => ({position: 'absolute', left: MID, top: y + y0, whiteSpace: 'nowrap', fontSize: size, opacity: lin(t, s, 0.3), transform: `translate(-50%, -50%) translateY(${lerp(24, 0, ramp(t, s, 0.4)).toFixed(1)}px)`});
  return (
    <div style={{position: 'absolute', inset: 0, background: bg, fontFamily: SANS, color: A.white}}>
      {logo && <Img src={staticFile(logo)} style={{...at(0.1, 430, 0), width: 220, height: 220, borderRadius: 50}} />}
      <div data-box="" style={{...at(0.25, 620, Math.min(130, Math.round(1000 / name.length))), fontWeight: 900, letterSpacing: -4}}>{name}</div>
      <div data-box="" style={{...at(0.45, 740, 42), fontWeight: 600, color: '#c9c9cf'}}>{line}</div>
      <div data-box="" style={{...at(0.7, 870, 54), fontWeight: 800, background: color ?? accent, color: A.ink, padding: '28px 64px', borderRadius: 26}}>{cta}</div>
      {url && <div data-box="" style={{...at(0.9, 990, 40), fontWeight: 600, color: '#c9c9cf'}}>{url}</div>}
    </div>
  );
};

/**
 * A visible note that what you see was made with AI. Put it in every scene that shows a realistic AI person or an AI-made
 * picture of the product: EU law (AI Act, Article 50) asks for it, and so does the LTX licence. Bottom left, under the captions.
 */
export const AiMark: React.FC<{text?: string}> = ({text = 'AI-generated scenes'}) => (
  <div data-box="" style={{position: 'absolute', left: 130, top: 1212, transform: 'translateY(-50%)', font: `600 40px ${SANS}`, color: 'rgba(255,255,255,.88)', background: 'rgba(0,0,0,.45)', padding: '4px 16px', borderRadius: 10, whiteSpace: 'nowrap'}}>
    {text}
  </div>
);
