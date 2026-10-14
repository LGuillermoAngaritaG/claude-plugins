import React from 'react';
import {SceneProps, VideoDef} from '../../../engine';
import {lin} from '../../../kit';
import {AD, AiMark, Clip, EndCard, Headline, Panel} from '../../../kits/ad';
import script from './script.json';
import timing from './timing.json';

const CLIPS = 'art/acme/01-notes/clips';

const Hook: React.FC<SceneProps> = ({t}) => (
  <>
    <Clip src={`${CLIPS}/c01.mp4`} />
    <Headline t={t} at={0.1}>Three meetings ago...</Headline>
    <AiMark />
  </>
);

const Search: React.FC<SceneProps> = () => <Clip src={`${CLIPS}/c02.mp4`} />;

const Product: React.FC<SceneProps> = ({t}) => (
  <>
    <Clip src={`${CLIPS}/c04.mp4`} />
    <Panel t={t} at={0.2} h={300}>
      <div data-box="" style={{padding: '40px 48px', fontSize: 44, fontWeight: 600, lineHeight: 1.35}}>
        12:04 What budget did we agree for the third quarter?
        <span style={{opacity: lin(t, 1.2, 0.4)}}> On June 12 you agreed on 48,000.</span>
      </div>
    </Panel>
  </>
);

const End: React.FC<SceneProps> = ({t}) => <EndCard t={t} name="Acme Notes" line="Every meeting, written down" cta="Try it free" url="acme.example" />;

export const notes: VideoDef = {
  id: '01-notes',
  look: AD,
  script,
  timing,
  scenes: {hook: Hook, search: Search, product: Product, end: End},
  bed: {name: 'art/acme/01-notes/bed.mp3', vol: 0.1},
};
