// "DeepSeek's Super-agent prototype" (the script, voice and facts of signal-over-hype-kinetic/02) in the diagram look
// (kits/diagram.tsx): one engineering diagram of the system that builds up through the video. Every event is placed in
// whole-video seconds (`G`, from the word times), so the diagram keeps its state across scenes; each scene only draws
// it, moves the camera over it and adds its heading and real pages.
import React from 'react';
import {Shot} from '../../../kits/news';
import {VideoDef} from '../../../engine';
import {CORAL, DIAGRAM, Edge, GREY, Group, HOT, Node, Packet, Progress, Proof, State, TEAL, View, clock, sceneOf, whooshes} from '../../../kits/diagram';
import channel from '../../../channels/signal-over-hype.json';
import script from './script.json';
import shotsJson from './shots.json';
import timing from './timing.json';

const {T0, line, W} = clock(script, timing as never);
const SH = shotsJson as unknown as Record<string, Shot>;
const READ = 'Read Oct 31, 2026';

// ---- the diagram: each part inside the box of the place it lives in ----

type P = [number, number];
// the old way: you and a chatbot, one prompt at a time
const UC: P = [-260, -900];
const AC: P = [260, -900];
// GitHub (top left), the chat app and the operator (top right)
const PR: P = [-300, 0];
const REPO: P = [-300, 190];
const CHAT: P = [380, 0];
const PERSON: P = [545, 220];
// your machine: the DeepSeek Harness (the policy as its gate, the super-agent, panel, keys, tickets, work folders),
// the shell and your files
const POLICY: P = [0, 600];
const ROUTER: P = [0, 800];
const PANEL: P = [440, 800];
const KEY: P = [-440, 800];
const TX = [-360, 0, 360];
const TY = 1000;
const WY = 1185;
const TERM: P = [-360, 1445];
const HOME: P = [360, 1445];
const IDEAS: P[] = [[-380, -330], [380, -330]];

// a comment: from the repository into the policy's left side, and on down to the super-agent if it is allowed
const IN: P[] = [[-300, 265], [-300, 600], [0, 600], [0, 800]];
const STOP = 473 / 835; // where IN meets the policy card
const FROMCHAT: P[] = [[300, 75], [300, 600], [162, 600]];
// a worker's answer back to the conversation in the repository, and its pull request
const BACK: P[] = [[TX[0] - 140, WY], [-770, WY], [-770, REPO[1]], [-457, REPO[1]]];
const TOPR: P[] = [[TX[0] - 140, WY], [-770, WY], [-770, PR[1]], [-488, PR[1]]];
const FAN = (x: number): P[] => (x === 0 ? [[0, 875], [0, 940]] : [[0, 875], [0, 905], [x, 905], [x, 940]]);
const RUN: P[] = [[0, 1245], [0, 1340], [TERM[0], 1340], [TERM[0], 1370]];
const TOPERSON: P[] = [[420, 725], [420, 340], [PERSON[0], 340], [PERSON[0], 290]];

const Diagram: React.FC<{G: number}> = ({G}) => {
  // the old way
  const pp = [W('listens', 0, 'prompt', 0) - 0.2, W('listens', 0, 'prompt', 1) - 0.1, W('listens', 0, 'ask')];
  const prompts = [0.25, ...pp];
  const answers = [1.0, ...pp.map((a, i) => (i === 2 ? W('listens', 0, 'answers') : a + 0.55))];
  const busy = prompts.some((a, i) => G > a + 0.5 && G < answers[i] + 0.2);
  const waiting = (G > W('hook', 0, 'waiting') && G < T0.listens) || G > W('listens', 0, 'waits');
  // the system, part by part
  const how = W('hook', 2, 'how');
  const ghostAt = (i: number) => how + i * 0.1;
  const st = (on: number, s: State = 'on'): State => (G < on ? 'ghost' : s);
  const gh = W('hook', 1, 'GitHub');
  const repoOn = W('listens', 1, 'repository');
  const chatOn = W('listens', 1, 'team');
  const polOn = W('listens', 2, 'allowed');
  const empty = line('listens', 3) + 0.3;
  const listOver = T0.workers;
  const tk = W('workers', 0, 'ticket');
  const wk = W('workers', 1, 'worker');
  const folder = W('workers', 1, 'folder');
  const done = W('workers', 2, 'done');
  const ans = W('workers', 2, 'answers');
  const pull = W('workers', 2, 'pull');
  const auto = W('workers', 3, 'auto');
  const web = W('workers', 3, 'web');
  const person = W('workers', 3, 'person');
  const host = W('limits', 3, 'computer');
  const run = W('limits', 3, 'run');
  const read = W('limits', 4, 'read');
  const give = W('limits', 4, 'give');
  const account = W('limits', 4, 'account');
  const keys = W('limits', 4, 'keys');
  const ideas = W('limits', 2, 'ideas');
  const polRisk = G > empty && G < listOver;
  const asUser = G > host && G < give;
  const own = G > give;
  const flow = 1.6;
  const dim = '#4a555c';
  return (
    <>
      {/* the boxes: where each part lives */}
      <Group t={G} x={-470} y={-1010} w={940} h={220} at={0} label="A CHATBOT TODAY" />
      <Group t={G} x={-730} y={-430} w={1460} h={200} at={ideas - 0.3} label="THEIR ARTICLE: NOT BUILT YET" color={CORAL} />
      <Group t={G} x={-730} y={-100} w={690} h={390} at={gh - 0.2} label="GITHUB" color="#d6dde0" />
      <Group t={G} x={50} y={-100} w={680} h={210} at={ghostAt(0)} label="CHAT APP · OPTIONAL" />
      <Group t={G} x={360} y={140} w={370} h={150} at={ghostAt(1)} label="OPERATOR" />
      <Group t={G} x={-730} y={400} w={1460} h={1140} at={ghostAt(2)} right label={asUser ? 'YOUR MACHINE · AS YOUR OS USER' : 'YOUR MACHINE'} color={asUser ? CORAL : '#d6dde0'} />
      <Group t={G} x={-690} y={490} w={1380} h={835} at={W('hook', 1, 'DeepSeek') - 0.2} label={own ? "AGENT'S OWN OS ACCOUNT" : 'DEEPSEEK HARNESS'} color={own ? TEAL : '#7fb7bd'} />
      <Group t={G} x={-650} y={1095} w={1300} h={185} at={ghostAt(3)} bottom label="WORK FOLDERS · ONE PER TICKET" color={G > folder ? HOT : GREY} />

      {/* the old way */}
      <Edge t={G} pts={[[UC[0] + 150, -930], [AC[0] - 150, -930]]} at={0} flow={0} />
      <Edge t={G} pts={[[AC[0] - 150, -870], [UC[0] + 150, -870]]} at={0.2} flow={0} />
      <Node t={G} x={UC[0]} y={UC[1]} at={0} icon="user" label="YOU" sub="ONE PROMPT" state={G < T0.workers ? 'idle' : 'off'} />
      <Node t={G} x={AC[0]} y={AC[1]} at={0.1} icon="cpu" label="CHATBOT" sub={waiting && !busy ? 'WAITING...' : 'ANSWERING'} state={busy ? 'on' : waiting ? 'off' : 'idle'} badge="clock" badgeAt={W('hook', 0, 'waiting')} badgeColor={GREY} />
      {prompts.map((a, i) => (
        <React.Fragment key={i}>
          <Packet t={G} pts={[[UC[0] + 150, -930], [AC[0] - 150, -930]]} at={a} len={0.55} text="PROMPT" color="#ffffff" />
          <Packet t={G} pts={[[AC[0] - 150, -870], [UC[0] + 150, -870]]} at={answers[i]} len={0.55} text="ANSWER" />
        </React.Fragment>
      ))}

      {/* edges */}
      <Edge t={G} pts={[[-300, 265], [-300, 600], [-162, 600]]} at={gh} dash label="POLL · 1 MIN" labelAt={repoOn} labelOut={T0.workers} labelU={0.2} labelDy={0} flow={flow} flowAt={repoOn} />
      <Edge t={G} pts={FROMCHAT} at={ghostAt(1)} dash={G > chatOn} flow={G > chatOn ? 1 : 0} flowAt={chatOn} color={G > chatOn ? '#b9c3c8' : dim} />
      <Edge t={G} pts={[[0, 675], [0, 725]]} at={ghostAt(2)} color={G > polOn ? TEAL : dim} flow={G > repoOn && !polRisk ? flow : 0} flowAt={repoOn} />
      <Edge t={G} pts={[[168, 800], [260, 800]]} at={ghostAt(9)} color={G > web ? '#b9c3c8' : dim} flow={G > web ? 1 : 0} flowAt={web} />
      <Edge t={G} pts={TOPERSON} at={person - 0.4} color={CORAL} flow={1.2} flowAt={person} />
      {TX.map((x, i) => (
        <React.Fragment key={i}>
          <Edge t={G} pts={FAN(x)} at={ghostAt(3 + i)} color={G > (i === 1 ? tk : wk) - 0.4 ? TEAL : dim} flow={G > tk ? 0.8 : 0} flowAt={i === 1 ? tk : wk - 0.4} />
          <Edge t={G} pts={[[x, 1060], [x, 1125]]} at={ghostAt(4 + i)} color={G > wk ? TEAL : dim} flow={G > wk ? 1.2 : 0} flowAt={wk} flowTo={i === 0 ? done : 1e9} />
        </React.Fragment>
      ))}
      <Edge t={G} pts={BACK} at={ans - 0.5} color={HOT} flow={0.8} flowAt={pull + 1} label="SAME CONVERSATION" labelAt={W('workers', 2, 'same')} labelOut={pull + 0.8} labelU={0.45} labelDy={0} />
      <Edge t={G} pts={TOPR} at={pull - 0.6} color={HOT} flow={0.8} flowAt={pull + 0.6} />
      <Edge t={G} pts={RUN} at={run - 0.3} color="#ffffff" flow={2.4} flowAt={run} />
      <Edge t={G} pts={[[HOME[0], 1370], [HOME[0], 1245]]} at={read - 0.4} color={CORAL} flow={2.4} flowAt={read} cut={account} cutU={0.45} />

      {/* the parts */}
      <Node t={G} x={PR[0]} y={PR[1]} at={pull - 0.3} icon="merge" label="PULL REQ." sub={G > auto ? 'AUTO-MERGE: OFF' : 'OPENED'} state={G > auto ? 'risk' : 'on'} badge="x" badgeAt={auto + 0.2} />
      <Node t={G} x={REPO[0]} y={REPO[1]} at={gh} icon="repo" label="REPOSITORY" state={G < repoOn ? 'idle' : 'on'} />
      <Node t={G} x={CHAT[0]} y={CHAT[1]} at={ghostAt(0)} icon="chat" label="TEAM CHAT" state={st(chatOn, 'idle')} />
      <Node t={G} x={PERSON[0]} y={PERSON[1]} at={ghostAt(1)} icon="user" label="PERSON" state={st(person - 0.3, 'idle')} />
      <Node t={G} x={POLICY[0]} y={POLICY[1]} at={ghostAt(2)} icon="shield" label="POLICY" sub={polRisk ? 'LIST: EMPTY' : 'ALLOWED LIST'} state={polRisk ? 'risk' : st(polOn)} />
      <Node t={G} x={ROUTER[0]} y={ROUTER[1]} at={W('hook', 1, 'DeepSeek')} icon="hub" label="SUPER-AGENT" state="on" badge="flask" badgeAt={W('hook', 1, 'research')} badgeColor={HOT} />
      <Node t={G} x={PANEL[0]} y={PANEL[1]} at={ghostAt(9)} icon="monitor" label="WEB PANEL" sub={G > person - 0.3 ? 'NEEDS A PERSON' : undefined} state={st(web, G > person ? 'risk' : 'on')} />
      <Node t={G} x={KEY[0]} y={KEY[1]} at={keys - 0.3} icon="key" label="ITS KEYS" state="on" />
      {TX.map((x, i) => (
        <React.Fragment key={i}>
          <Node t={G} x={x} y={TY} w={280} at={ghostAt(3 + i)} icon="ticket" label={`TICKET ${i + 1}`} state={st(i === 1 ? tk - 0.1 : wk - 0.5 + i * 0.1)} />
          <Node t={G} x={x} y={WY} w={280} at={ghostAt(4 + i)} icon="cpu" label={`WORKER ${i + 1}`} state={i === 0 && G > done ? 'done' : st(wk + i * 0.12)} badge="check" badgeAt={i === 0 ? done : 1e9} badgeColor="#ffffff">
            {G > wk && <Progress t={G} at={wk + i * 0.12} len={6 + i * 2} w={236} done={i === 0 ? done : 1e9} />}
          </Node>
        </React.Fragment>
      ))}
      <Node t={G} x={TERM[0]} y={TERM[1]} at={ghostAt(7)} icon="terminal" label="SHELL" sub={G > W('limits', 3, 'without') ? 'NO APPROVAL' : G > run ? 'COMMANDS RUN' : undefined} state={st(run - 0.3, 'risk')} />
      <Node t={G} x={HOME[0]} y={HOME[1]} at={ghostAt(8)} icon="home" label="HOME FOLDER" sub={G > account ? 'OUT OF REACH' : G > read ? 'READABLE' : undefined} state={G > account ? 'off' : st(read - 0.4, 'risk')} />
      {IDEAS.map(([x, y], i) => (
        <Node key={i} t={G} x={x} y={y} at={ideas + i * 0.2} icon="question" label="ARTICLE IDEA" state="ghost" />
      ))}

      {/* comments at the policy: allowed ones pass to the super-agent, the others stop there */}
      {[W('listens', 2, 'list'), W('listens', 2, 'name') - 0.2].map((a, i) => (
        <Packet key={`p${i}`} t={G} pts={IN} at={a} len={1.4} text="@AGENT + REQUEST" />
      ))}
      {[W('listens', 2, 'comment') - 0.3, line('listens', 3) + 0.6, W('listens', 3, 'no') - 0.4, W('listens', 3, 'accepted') - 0.3].map((a, i) => (
        <Packet key={`r${i}`} t={G} pts={IN} at={a} len={1.4} text="COMMENT" color="#ffffff" stop={STOP} />
      ))}
      <Packet t={G} pts={[[0, 600], [0, 800], [0, 940]]} at={line('workers', 0) - 0.3} len={1.6} text="REQUEST" />
      <Packet t={G} pts={BACK} at={ans - 0.2} len={1.8} text="RESULT" />
      <Packet t={G} pts={TOPR} at={pull - 0.4} len={1.4} text="PULL REQUEST" />
      {[0, 1, 2].map((i) => (
        <Packet key={`c${i}`} t={G} pts={RUN} at={W('limits', 3, 'commands') + i * 0.6} len={0.9} text="$ RUN" color="#ffffff" />
      ))}
      {[0, 1].map((i) => (
        <Packet key={`h${i}`} t={G} pts={[[HOME[0], 1370], [HOME[0], 1245]]} at={account + 0.1 + i * 1.4} len={0.9} text="READ" color={CORAL} stop={0.4} />
      ))}
      {/* the end: requests running the whole loop */}
      {[0, 1, 2, 3].map((i) => (
        <Packet key={`l${i}`} t={G} pts={[...IN, ...FAN(TX[0]), [TX[0], WY], ...TOPR]} at={W('end', 0, 'map') + i * 1.3} len={4.2} text="REQUEST" />
      ))}
    </>
  );
};

// ---- scenes: the camera over the diagram, the heading, the pages ----

const OVER: [number, number, number] = [-30, 555, 0.38];
const VIEW: View[] = [
  [0, 0, -900, 1],
  [3.4, 0, -900, 1],
  [W('hook', 1, 'DeepSeek') + 0.4, -100, 460, 0.7],
  [line('hook', 2) - 0.2, -100, 460, 0.7],
  [line('hook', 2) + 1.2, ...OVER],
  [T0.listens - 0.1, ...OVER],
  [T0.listens + 0.7, 0, -900, 1],
  [line('listens', 1) - 0.4, 0, -900, 1],
  [line('listens', 1) + 0.5, -20, 260, 0.68],
  [line('listens', 2) - 0.3, -20, 260, 0.68],
  [line('listens', 2) + 0.5, -120, 520, 0.8],
  [T0.workers - 0.2, -120, 540, 0.82],
  [T0.workers + 0.6, 0, 850, 0.8],
  [line('workers', 1) - 0.1, 0, 870, 0.8],
  [line('workers', 1) + 0.6, 0, 1080, 0.78],
  [line('workers', 2) - 0.2, 0, 1080, 0.78],
  [line('workers', 2) + 0.6, -200, 650, 0.62],
  [W('workers', 2, 'pull') - 0.3, -200, 650, 0.62],
  [W('workers', 2, 'pull') + 0.5, -420, 330, 0.72],
  [W('workers', 3, 'web') - 0.4, -420, 330, 0.72],
  [W('workers', 3, 'web') + 0.4, 280, 560, 0.8],
  [T0.limits - 0.1, 280, 560, 0.8],
  [T0.limits + 0.8, ...OVER],
  [line('limits', 2) - 0.2, ...OVER],
  [line('limits', 2) + 0.5, 0, -150, 0.64],
  [line('limits', 3) - 0.2, 0, -150, 0.64],
  [line('limits', 3) + 0.6, 0, 1150, 0.62],
  [line('limits', 4) - 0.2, 0, 1160, 0.62],
  [line('limits', 4) + 0.5, 180, 1330, 0.8],
  [W('limits', 4, 'give') - 0.3, 180, 1330, 0.8],
  [W('limits', 4, 'give') + 0.5, 0, 980, 0.62],
  [T0.end - 0.1, 0, 980, 0.62],
  [T0.end + 0.6, 0, 700, 0.85],
  [W('end', 0, 'map') - 0.3, 0, 700, 0.85],
  [W('end', 0, 'map') + 0.9, ...OVER],
  [99, -30, 555, 0.41],
];

const Hook = sceneOf(T0, 'hook', 'SUPER-AGENT', 'DEEPSEEK · RESEARCH PROTOTYPE', Diagram, VIEW, (G) => <Proof G={G} at={W('hook', 1, 'GitHub') + 0.2} off={line('hook', 2)} shot={SH.readme_listens} date={READ} />);
const Listens = sceneOf(T0, 'listens', '1 / IT LISTENS', 'ONE GITHUB REPOSITORY', Diagram, VIEW);
const Workers = sceneOf(T0, 'workers', '2 / A TICKET, A WORKER', 'ONE FOLDER EACH', Diagram, VIEW);
const Limits = sceneOf(T0, 'limits', '3 / WATCH OUT', 'RESEARCH CODE, NOT A PRODUCT', Diagram, VIEW, (G) => (
  <>
    <Proof G={G} at={W('limits', 1, 'not')} off={line('limits', 2)} shot={SH.readme_status} date={READ} mark={W('limits', 1, 'official')} />
    <Proof G={G} at={W('limits', 4, 'So')} off={W('limits', 4, 'give') - 0.1} shot={SH.deploy_isolation} date={READ} mark={W('limits', 4, 'guide')} />
  </>
));
const End = sceneOf(T0, 'end', 'BETWEEN PROMPTS', 'A MAP, NOT A LONE DEVELOPER', Diagram, VIEW);

/** Hot words: said bold and big. */
const HOT_WORDS = 'prompt stops waiting DeepSeek research prototype GitHub MIT works watch listening repository allowed list comment name request accepted ticket worker folder pull auto-merge person official production article built commands asking user home account keys alone map issues'.split(' ');
const moves = whooshes(T0, VIEW);

export const superagentDiagram: VideoDef = {
  id: '01-deepseek-superagent',
  look: DIAGRAM(HOT_WORDS),
  channel,
  script,
  timing,
  scenes: {hook: Hook, listens: Listens, workers: Workers, limits: Limits, end: End},
  sounds: {hook: () => moves('hook'), listens: () => moves('listens'), workers: () => moves('workers'), limits: () => moves('limits'), end: () => moves('end')},
};
