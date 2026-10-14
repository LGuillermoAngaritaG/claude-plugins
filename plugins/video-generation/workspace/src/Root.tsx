import React from 'react';
import {Composition} from 'remotion';
import {FPS, Video, VideoDef, frames} from './engine';
import {H, W} from './kit';

/** The video definitions a module exports, whatever they are named, tagged with the series folder they live in. */
export const defsIn = (mod: Record<string, unknown>, series: string) =>
  Object.values(mod)
    .filter((v): v is VideoDef => typeof v === 'object' && v !== null && 'scenes' in v && 'script' in v)
    .map((def) => ({def, series}));

/** A Remotion root with one composition per video, named `<series>-<id>`. */
export const rootOf = (videos: {def: VideoDef; series: string}[]): React.FC => {
  // One component per video: scene components are functions, so they cannot travel as props.
  const comps = videos.map(({def, series}) => ({id: `${series}-${def.id}`, def, Comp: () => <Video def={def} series={series} />}));
  return () => (
    <>
      {comps.map(({id, def, Comp}) => (
        <Composition key={id} id={id} component={Comp} durationInFrames={frames(def)} fps={FPS} width={def.look?.w ?? W} height={def.look?.h ?? H} />
      ))}
    </>
  );
};
