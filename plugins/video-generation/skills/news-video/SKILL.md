---
name: news-video
description: >
  Makes a daily news briefing (5 to 8 minutes, or the channel's length), landscape: three to five stories in fixed segments ("What actually
  shipped", "Hype check", "Why it matters to you"), each shown on its real web page (a screenshot with the site, the
  date and a marker on the words the voice says), every claim dated and sourced, a natural Google voice, and one stop
  for the user each morning: the story list. Built on the explainer pipeline and a channel profile (Signal Over Hype).
  Use it for "today's briefing", "the news video", "a briefing on what happened in AI", "the daily video of Signal
  Over Hype". Not for evergreen explainers (explainer-video), equations (math-video) or ads (ad-video).
allowed-tools: Bash(${CLAUDE_PLUGIN_ROOT}/scripts/workspace.sh *)
---

# News briefing

News goes stale in a day, so a briefing is fast and it is right: every story comes from its primary source, every
claim says who claims it and when, and the viewer sees the real page, not a picture of it. Accuracy and speed
together are what make it not slop.

## Rules that matter most

1. **Primary sources only**: the company's own announcement, the paper, the filing, the release notes, the regulator.
   A news site is a lead to the primary source, never the source.
2. **Say who claims it.** "The company says", "the paper reports". A benchmark is the maker's number until someone
   else repeats it. Speculation is said as speculation, or left out.
3. **Every claim has a date** in `facts.json` (when its source was published); `check.py` refuses one without. A
   story older than 48 hours says so.
4. **Show the real page.** No AI picture or clip of a real person, no Codex drawing of a product or a logo. A Codex
   picture only for a general idea with no real thing behind it.
5. **Quotes are exact**, with their link. Explain every term in plain words, as in every explainer.
6. **One stop:** the story list. Nothing else waits for the user; they watch the finished file before upload.

## Before you start

1. Read `${CLAUDE_PLUGIN_ROOT}/docs/pipeline.md`, then the explainer skill's `SKILL.md` (its narration rules, voice,
   checks and reviews hold here) and its `references/channels.md`. Run `${CLAUDE_PLUGIN_ROOT}/scripts/workspace.sh
   <workspace>` and fix what it reports.
2. Read the channel profile (`src/channels/<channel>.json`): its `sources` and `review` rules, its voice.
3. Read `src/videos/<channel>-<yyyy>-w<nn>/` of this week: the briefings already made (no story twice).

## The day

1. **Gather.** Read the channel's sources for the last 24 to 48 hours (company blogs and newsrooms, arXiv, release
   notes, regulators). Open every page you keep. Start the video in the week's series
   (`python3 scripts/new.py news <series>/<nn>-briefing "<Day, date>: <the top story in a few words>" --channel
   <channel>`) and write `stories.md` beside its script: 5 to 7 candidates, each with a headline, the primary link,
   its date, its segment, one line on why it matters, and for the hype check the claim and the evidence that tests it.
2. **The stop.** Send `stories.md` and a short message: the candidates by number and your pick of 3 to 5. The user
   picks, swaps or changes an angle. Build nothing before the answer.
3. **Script**, the channel's `minutes` (5 to 8 when it says none; the voice reads 175 to 190 words a minute): three
   to five stories, more for a longer briefing. When the channel asks for `shorts`, mark that many one-minute runs, one
   story each, and cut them after the build as the explainer skill's "Shorts" section says. The hook is the day's
   biggest story in one line. Then the segments: each opens with its own short scene ("First, what actually
   shipped."), then one scene per story. A story scene has `"shot"` (its page), `"cue"` (the word the voice says when
   the marker should draw; the line must say it), `"date"` (as said, "Oct 24, 2026") and its lines. The hype check
   tests one claim against the evidence and ends on a verdict. The end says what the day means for a person who
   uses these tools, in one or two lines, not a summary list. Write `facts.json` (every claim with `"date"`) and
   `references.md` (the primary links, for the description).
4. **Script review**: one reviewer with no context of your work gets `script.json`, `facts.json`, the explainer's
   `references/script-review.md`, the rules above and the channel's `review` rules. Fix what it finds.
5. **Voice and pages at the same time.** The voice as in the explainer skill (`voice.py`, then `align.py`). The pages:
   list them in `"shots"` in `script.json` (`{"<name>": {"url": "...", "find": "words on the page to mark"}}`) and run
   `node scripts/shots.mjs <series>/<id>`. Look at every picture with the Read tool: the right page, the words
   marked, nothing covering them. Take the pages on the day you build (`--again`): pages change. What the first
   briefing taught:
   - A page that blocks the capture (a "verify you are human" check) often opens in the Browser pane: read it there to
     confirm the facts, then show another primary page that names it (or a screenshot the user sends), and say on
     screen and in the voice whose claim it is ("OpenAI's own post, Oct 23"). Never try to get past the check.
   - A page whose text sits in a layer that does not scroll can get a wrong marker box: look at the picture, and set
     the box by hand in the scene.
   - Cut from one page to the next; a cross-fade lays two browser bars over each other.
6. **Scenes.** `new.py news` writes them: a story scene is one line (`<Page1 id="story1" {...p} />`), copy it for
   each story and keep the `scenes` map in script order. Write code only for what a page cannot show: the hype
   check's numbers (`Counter`, `Bar`, 2D in `Svg2D`), a comparison. `Source` labels the claim a viewer could act on.
7. **Check**: `npx tsc`, `check.py`, `stills.mjs` and look at every sheet (each page: the words in view and marked).
   Then one blind reviewer with the sheets, `script.json`, `facts.json`, the explainer's `references/review.md`, the
   rules above and the channel's `review` rules. Fix what it finds.
8. **Build** with `scripts/build.sh <series>/<id>`. No draft.

## Report

Then the `youtube-publish` skill: the title carries the date, and the news is time-sensitive, so say so.


The finished file and its length, the stories and their sources (`references.md` is the description's source list),
any claim you could not confirm, the speech-check lines kept, the cost of the voice, and the moments nobody has seen
move yet (the push and the marker on each page).
