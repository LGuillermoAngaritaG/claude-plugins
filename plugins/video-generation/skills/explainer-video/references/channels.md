# Channels

A channel is a YouTube channel with its own look, voice and rules. Its profile is
`src/channels/<channel>.json` in the workspace: the user's data, which `workspace.sh --apply` never touches. A video
made for a channel starts with

```bash
python3 scripts/new.py explainer <series>/<id> "<title>" --channel <channel>
```

That writes `"channel"` and the channel's `"voice"` and `"speed"` into `script.json`, and an
`index.tsx` that imports the profile and sets `channel` on the `VideoDef`. A video with no channel looks as before.

## The fields

| Field | Used by | What it does |
|---|---|---|
| `name` | you | The channel's name, as viewers see it. |
| `grounds` | the engine | The background colours; each video gets one, picked from its name. |
| `accent` | the kit | Tag dots, card titles and bars. Two colours that must stay apart keep their own `K` colour. |
| `ink` | the kit | Words on the ground (`Label`, `Counter`, `Bar`). Set it for a dark ground. |
| `caption_hot` | the kit | The colour of the word being said in the captions. Leave it out for yellow. |
| `art_style` | `art.py` | Words added to the picture style: colours and what to avoid. The rules of the type stay. |
| `voice`, `speed` | `new.py` | The local Phonon voice and its pace, copied into each new script. Hadley at 1.05 for every channel since 2026-10-27; `check.py` refuses a pace under 155 words a minute. |
| `minutes` | you | The usual length of a video. |
| `shorts` | you | How many one-minute Shorts to mark in, and cut from, each long video. |
| `closing` | `check.py` | The exact words the last line of every long video must say (Shorts are left out). |
| `fact_reviewers` | you | 2 means a second blind reviewer checks every claim (see SKILL.md, Stage 1). |
| `sources` | you | Which sources count for this channel. Use them first; never use what it rules out. |
| `review` | you | Extra rules: give them to the script reviewer and to each anti-slop reviewer with their checklist. |
| `note` | `publish.py` | The line every description of the channel ends on: the advice note ("not medical advice...") or a safety line true for every video of the channel; a warning for one topic goes in that video's `publish.json` `"note"`. |
| `about` | `publish.py` | The channel in one line, and how its videos are made ("produced with AI-assisted narration and visuals"). Last line of a long video's description. |
| `tags` | `publish.py` | The channel's YouTube tags; each video adds its own. |
| `youtube_category` | `upload.py` | The YouTube category id: `"27"` Education when left out, `"28"` Science & Technology. |
| `thumbnail` | `thumbnail.py` | `side` ("left" or "right": the third the words go on), `style` (the picture's look, from the channel's thumbnail template), `ink`, `hot`, `edge` (the colours of the words, the highlighted line and their outline). |

`K` keeps its meaning in every channel (blue cold or low, red hot or wrong, green right). Use `K` when a colour means
something, the accent when it only marks a thing.

## 3D

React context does not reach inside a `Stage` (three.js has its own React tree), so `useTheme()` returns nothing
there. Take a 3D colour from the profile in the scene, and pass it down:

```tsx
import channel from '../../../channels/<channel>.json';
<Lathe ... glow={channel.accent} heat={flash(t, said(words, i, 'spring')) * 0.8} />
```

## Writing a profile

Take the colours from the channel's own art (avatar, banner, thumbnail): the ground is the main light colour of the
banner, the accent a strong colour that reads on white. For a dark ground set `ink` light and `caption_hot` to a
light colour. Look at a two-scene sample with `stills.mjs` before the first real video: ground, tag dots, card title,
bar, captions, and words that must read on the ground.

The voice: Hadley at 1.05 unless the user picks another. To compare, read the channel's hook line with a few Phonon
voices (`npm run -s tts -- --hear "<line>" <voice>`, the voices at huggingface.co/gradium/phonon-voices) and let the
user choose. Then write it in `voice`.
