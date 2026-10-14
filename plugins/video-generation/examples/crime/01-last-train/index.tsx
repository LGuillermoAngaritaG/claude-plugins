import React from 'react';
import {SceneProps, VideoDef, said} from '../../../engine';
import {lin} from '../../../kit';
import {Big, S, STORY, Shot, Stamp, StoryTitle, keys} from '../../../kits/story';
import art from './art.json';
import script from './script.json';
import timing from './timing.json';

const Title: React.FC<SceneProps> = ({t, dur}) => (
  <>
    <Shot art={art.train} p={lin(t, 0, dur)} move="in" />
    <StoryTitle t={t} kind="A fictional story" title={['THE LAST', 'TRAIN']} at={0.2} />
  </>
);

const Platform: React.FC<SceneProps> = ({t, dur, words}) => (
  <>
    <Shot art={art.platform} p={lin(t, 0, dur)} move="right" />
    <Stamp t={t} at={0.3} y={560}>
      HARLOW STATION
    </Stamp>
    <Stamp t={t} at={said(words, 0, 'eleven')} y={645} size={64} color={S.amber}>
      23:52
    </Stamp>
  </>
);

const Seat: React.FC<SceneProps> = ({t, dur}) => <Shot art={art.seat} p={lin(t, 0, dur)} move="in" />;

const Tunnel: React.FC<SceneProps> = ({t, dur, words}) => (
  <>
    <Shot art={art.tunnel} p={lin(t, 0, dur)} move="out" />
    <Big t={t} at={said(words, 1, 'forty')} y={420} size={170} color={S.red}>
      40 SECONDS
    </Big>
  </>
);

const Case: React.FC<SceneProps> = ({t, dur}) => <Shot art={art.case} p={lin(t, 0, dur)} move="in" />;

const Desk: React.FC<SceneProps> = ({t, dur, words}) => (
  <>
    <Shot art={art.desk} p={lin(t, 0, dur)} move="left" />
    <Stamp t={t} at={said(words, 0, 'switched')} y={320}>
      SWITCHED BY HAND
    </Stamp>
  </>
);

const End: React.FC<SceneProps> = ({t, b, dur}) => (
  <>
    <Shot art={art.desk} p={lin(t, 0, dur)} move="in" />
    <Shot art={art.brothers} p={lin(t, b[1], dur - b[1])} move="out" o={lin(t, b[1], 0.12)} />
  </>
);

export const lastTrain: VideoDef = {
  id: '01-last-train',
  look: STORY,
  art,
  script,
  timing,
  scenes: {title: Title, platform: Platform, seat: Seat, tunnel: Tunnel, case: Case, desk: Desk, end: End},
  bed: {name: 'drone', vol: 0.4},
  // Few and low: a deep impact on the three turns of the story, a riser into the forty seconds, keys under the typed lines.
  sounds: {
    title: () => [{at: 0.9, name: 'boom', vol: 0.5}],
    platform: (_, __, w) => [...keys(0.3, 'HARLOW STATION'), ...keys(said(w, 0, 'eleven'), '23:52')],
    seat: () => [{at: 0, name: 'hit', vol: 0.3}],
    tunnel: (_, __, w) => [{at: said(w, 1, 'forty') - 3.2, name: 'riser', vol: 0.3}, {at: said(w, 1, 'forty'), name: 'hit', vol: 0.45}],
    case: (b) => [{at: b[1], name: 'boom', vol: 0.5}],
    desk: (_, __, w) => keys(said(w, 0, 'switched'), 'SWITCHED BY HAND'),
    end: (b) => [{at: b[1], name: 'boom', vol: 0.55}],
  },
};
