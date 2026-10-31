// How daily blood pressure pills work: a Cell to Cure Short in the particle look, upright. Plan: plan.md.
// Scenes: a.tsx (hook, levers, end), ace.tsx (ace), b.tsx (water, arb), c.tsx (calcium, beta, daily); the look is kits/particles.tsx.
import {VideoDef} from '../../../engine';
import channel from '../../../channels/cell-to-cure.json';
import * as A from './a';
import * as B from './b';
import * as C from './c';
import * as ACE from './ace';
import script from './script.json';
import timing from './timing.json';
import {PARTICLES} from '../../../kits/particles';

export const bpMedicines: VideoDef = {
  id: '01-bp-medicines',
  look: PARTICLES,
  channel,
  script,
  timing,
  // A literal map: scripts/check.py reads it.
  scenes: {hook: A.scenes.hook, levers: A.scenes.levers, water: B.scenes.water, ace: ACE.scenes.ace, arb: B.scenes.arb, calcium: C.scenes.calcium, beta: C.scenes.beta, daily: C.scenes.daily, end: A.scenes.end},
  sounds: {...A.sounds, ...B.sounds, ...C.sounds, ...ACE.sounds},
};
