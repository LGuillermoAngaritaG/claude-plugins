# A channel's week

For a channel that publishes often, the user approves a week of videos once, as outlines, instead of a plan and a
draft per video. Everything else about a video stays as SKILL.md says.

## Before

1. Read the channel's profile (`src/channels/<channel>.json`, `references/channels.md`), its earlier weeks
   (`src/videos/<channel>-*/`), and the user's topic list `src/channels/<channel>.topics.md` if there is one.
2. The week is one series, `<channel>-<yyyy>-w<nn>` (ISO week), videos `01-<topic>` to `07-<topic>`. A series holds
   one week, so its joined file stays small and its ids stay under 100.

## The outlines, the one stop

1. Pick seven topics: from the topic list first, else your own, none already done.
2. For each: `python3 scripts/new.py explainer <series>/<id> "<title>" --channel <channel>`, then enough research to
   source its riskiest claims (keep the sources: they start `facts.json` and `references.md`).
3. Write `src/videos/<series>/outlines.md` as `references/outline.md` shows.
4. Send the file and a short message: the seven titles, the clips and GPU time if any, the cost. If the week needs
   clips, say so; start the Colab notebook yourself when you can (`ai-clips` Stage 2), else ask for its URL and key
   now, once for the week.
5. The user answers by number: approved, changed, or replaced. Apply each change, send again only what changed,
   until every outline is approved. Nothing else is built before that.

## Each video, with no other stop

Each approved video runs Stage 1 in full (research, `facts.json`, `references.md`, script, the second fact reviewer
where the profile asks, the script review, `plan.md`) and Stage 2 in full, **without the plan stop and without the
draft stop**.

**Builders.** Give each video to two builder agents in turn (`video-builder`, never a `general-purpose` agent with
its prompt: see SKILL.md, "Before you write", step 2) with
`builder-brief.md` (beside this file), filled in for that video: a writer up to the pictures, then a fresh finisher
from its handoff note. Together they take the video and Shorts up to, not including, the render, and start their own
scene agents and blind reviewers. Start at most three writers at once: the speech check of `align.py` is what the Mac runs slowest,
and in the first channel week, with five builders and their helpers at once, each align of a 10-minute video took 20
to 50 minutes and the builders spent 1 to 2.5 of their 3 to 5.5 hours waiting for it. Each builder keeps its working
files in its own folder: in a shared one, one builder's brief was overwritten by another's.

**Renders.** You render, one video at a time (`scripts/build.sh <long> <shorts...>`, one series per call), as each
builder reports ready: look at the first sheet of its stills and its report first, then the file check (`qc.py`) of
every part. A long video took 4 to 12 minutes to render on a free Mac and up to 31 on a busy one. Fix what the file
check finds or explain it in the weekly report.

A video goes back to the user alone, with what changed and why, only when it can no longer keep its outline's
promise: a riskiest claim that turns out wrong or unsourced, a different payoff, a chapter that has to go. A wording
change, a better picture or a reordered scene does not need the user.

**Clips.** You run the week's clips in one GPU session, before the builders need them: right after the outlines are
approved, connect and load the video model; while it loads, draw every start picture (`"scene": true`, wide); run the
clips, look at six frames of each (`scripts/frames.py`), redo a wrong one while the GPU is up (a new start picture
often fixes a motion the model got wrong), import them, and kill the runtime. Four clips and one redo took about 19
minutes of GPU. Tell each builder its clip paths; a builder may cut a clip short where its last frames go wrong.

At about one clip a minute (`media.md`) a week is about 50 clips: plan two to three hours of GPU, inside the
server's 5-hour limit, and keep it going while the builders write scripts. Keep it safe:

- Run the clips in batches of about five (one job file and one `studio.py run` each) and import each batch as it
  lands, so a lost connection costs one batch, not the week.
- Start every `studio.py run` in the background with no loop or wrapper around it: when the URL stops answering it
  stops within about two minutes with exit code 3 (`SERVER GONE`), and that exit is the alarm. In week 45 the server
  stopped answering about 80 minutes in and nobody saw it for an hour: 16 of 24 clips became code animation.
- On exit code 3, follow `ai-clips` "When the server dies": notify the user, start the notebook again yourself when
  you started it, and run the same jobs into the same folders: finished clips are skipped. Turn a clip into code
  animation only when its builder cannot wait any longer, and list every clip you dropped in the weekly report.
- A clip whose subject is seen once (a bus in traffic, a kitchen) can come from text alone, with no start picture:
  leave out `image` and let the video's `"style"` keep the look. It saves a Codex picture; a subject that returns,
  or must match a picture of the video, starts from a picture.

## The weekly report

First get the week ready for YouTube with the `youtube-publish` skill (titles, descriptions with sources, tags,
thumbnails): the report then points to `videos/<series>/publish.md`.


One message for the week: each finished file with its length (`ffprobe`), what the reviewers found and what was left
and why, the two or three moments you are least sure of in each video, the speech-check lines kept, and the GPU
time. The user watches the files before they upload them: there was no draft, so say plainly which moving
parts and which tones nobody has seen or heard yet.
