---
name: youtube-publish
description: >
  Gets finished videos ready to upload to YouTube: for each long video a title, a description (an intro, chapters with
  times, every source the video used, the channel's note and its AI-assisted line), tags, and a 1280 x 720 thumbnail
  whose words are drawn in code; for each Short a title and a short description with its own sources. Writes
  videos/<series>/publish.md and videos/<series>/parts/<id>.jpg and checks YouTube's limits. Use after a video or a
  channel's week is built: "get these ready for YouTube", "titles and descriptions", "make the thumbnails", "the
  publish kit", "what do I need to upload". It does not upload anything.
allowed-tools: Bash(${CLAUDE_PLUGIN_ROOT}/scripts/workspace.sh *)
---

# YouTube publish kit

The video is finished; this skill makes what goes around it. Most of it comes from the video's own files: the chapters
from `references.md` and the timing, the sources from `references.md`, the note, the about line and the channel's tags
from the channel profile. You write only what needs judgement: the title, the intro, the video's own tags and the
thumbnail's words and picture.

## Rules that matter most

1. **An honest title.** It says what the video answers, and it promises nothing the video does not keep: no "cure",
   no "secret", no "4x better" where the source says something narrower. Aim for 70 characters or fewer (search can
   cut longer ones); YouTube allows 100. A news title carries the date and says whose claim it is ("Microsoft's \"4x
   doctors\" claim", not "AI is 4x better than doctors").
2. **A plain intro**, two to four short sentences: the question, and what the viewer will understand. Use only numbers
   the video says, and say "in our example" where they are one.
3. **Every source the video used is in the description.** They come from `references.md`. A source missing there is
   missing here: fix `references.md`, never type sources into `publish.json`.
4. **Thumbnail words** are two to four words on two or three lines: the video's question or its payoff, true to the
   video. The picture has no text; the words are drawn in code, so they are spelled right.
5. **No upload, no publishing.** The user uploads. Say what is time-sensitive (a news briefing that says "today").

## Before you start

1. Run `${CLAUDE_PLUGIN_ROOT}/scripts/workspace.sh <workspace>` and fix what it reports.
2. Read the channel profile (`src/channels/<channel>.json`; the fields are in the explainer skill's
   `references/channels.md`). It needs `note`, `about`, `tags` and `thumbnail`. A channel without them: write them
   first, from the channel's launch kit, or ask the user for its colours and its line about AI-assisted production.
3. Read each video's `script.json`, `references.md` and its build report (the lines to listen to, what was left).

## Steps

1. **For each long video**, write `publish.json` beside its `script.json`:

   ```json
   {"title": "Inside a Microwave Oven: Why the Middle Stays Frozen",
    "intro": "Heat frozen soup in a microwave, and the edge can boil while the middle is still ice. ...",
    "tags": ["microwave oven", "magnetron"],
    "thumbnail": {"words": ["HOT EDGE,", "FROZEN", "MIDDLE"], "hot": 1,
                  "subject": "A microwave oven, large, split down the middle: ..."}}
   ```

   `tags` are the video's own; the channel's are added in front. A first scene that belongs to no chapter of
   `references.md` (a hook, a news intro) gets a chapter at 0:00 named by `"first_chapter"` (default "Intro").
   `thumbnail.hot` is the line drawn in the channel's highlight colour. `subject` is what the picture shows, in one
   or two sentences; the channel's style and the empty third are added for you.
2. **For each Short**, `publish.json` with `title` and `intro` only.
3. `python3 scripts/publish.py <series>` writes `videos/<series>/publish.md`. Fix every problem it prints: a
   description over 5,000 characters (shorten the intro), fewer than three chapters or one under 10 seconds (fix the
   chapter headings and their scene lists in `references.md`), a title over 100 characters.
4. `.venv/bin/python scripts/thumbnail.py <series>/<id>` for each long video: Codex draws the picture (about a minute)
   and the words are drawn on the empty third. Look at every thumbnail with the Read tool:
   - the words are readable and sit on plain background, not over the subject: if the picture fills the frame, set
     `"shrink": 0.72` and run it again (no new drawing);
   - the picture is true to the video: right parts, no text, no logos, no real person;
   - a wrong picture: change `subject` (it draws again), or set `"picture"` to an image under `public/` (a frame of
     the video, a picture you drew for it).
5. **Report**: the path of each `publish.md` and thumbnail, the upload settings below, the lines to listen to before
   publishing (from the build report), and anything time-sensitive. If the user wants a page to work from or share,
   make a Claude Doc from `publish.md` with the thumbnails uploaded.

## Upload settings (the same for every video)

| Setting | Choose |
|---|---|
| Audience | Not made for kids |
| Category | Education; a news channel: Science & Technology |
| Subtitles | The `.srt` beside each video, in the video's language |
| Altered or synthetic content | On only when a realistic-looking person, place or event is made or changed by AI. Illustrations and drawn clips do not need it; the description already says the video is made with AI-assisted narration and visuals |
| Thumbnail | Long video: `parts/<id>.jpg`. Short: pick a frame in the YouTube app |
| Shorts | Upload the long video first; in YouTube Studio set it as each Short's related video, and put its link in the Short's description |
