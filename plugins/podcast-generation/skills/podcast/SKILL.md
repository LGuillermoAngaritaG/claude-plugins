---
name: podcast
description: Turn a topic, notes or a document into an audio episode rendered fully on this Mac with local Kokoro voices, in English or Spanish. Six types: two hosts, a student teaching an expert, an adversarial debate, an expert panel, a story built on real history, and a professor's lecture. Use when the user asks for a podcast, an audio episode, an audio briefing, a lecture or story to listen to, or something they can listen to instead of read. Covers the brief, writing the script, reading it back, checking pronunciation, building the audio and delivering the file.
allowed-tools: Bash(${CLAUDE_PLUGIN_ROOT}/scripts/podcast.sh *)
---

# Podcast

Write an episode script of one of six types, check it, render it to audio on this
machine, and hand over an `.m4a` file. Nothing leaves the Mac: the voices, the model and the audio
processing are all local.

## When to use

- The user asks for a podcast, an episode, an audio version, an audio briefing, or
  "something I can listen to on a walk".
- The source can be anything you can read: notes, a document, a topic you research, a
  video script, a week of work. The episode explains it; it does not read it out.
- Not for a single narrator reading a text verbatim.

## Types

Pick the type with the user. Each has its own short guide in `types/` beside this file:
read it before writing, and follow it together with the shared rules below.

| type | use it for | voices | guide |
| :-- | :-- | :-- | :-- |
| `two-host` | the default: one host asks, one explains | 2 | `types/two-host.md` |
| `student` | a student teaches an expert, who completes and corrects | 2 | `types/student.md` |
| `adversarial` | two views on a question where informed people disagree | 2 | `types/adversarial.md` |
| `panel` | a host and experts, each explaining one part from their field | 4 to 5 in English, 3 in Spanish | `types/panel.md` |
| `story` | a narrated story built on real historical events | 1, plus short character lines | `types/story.md` |
| `professor` | one professor's lecture, with a story and a historical event | 1 | `types/professor.md` |

If the user does not say, use `two-host`. A topic that people argue about suggests
`adversarial`; a topic with several fields in it suggests `panel`; a topic with a famous
history suggests `story` or `professor`. Say which type you chose and why.

## Setup

Run `bash ${CLAUDE_PLUGIN_ROOT}/scripts/install.sh` once (`--dry-run` first shows what it
does; the plugin README has the details). It leaves a venv with kokoro-onnx and the two
model files under `~/.local/share/two-host-podcast`, plus ffmpeg from Homebrew. Check the
setup with:

```bash
~/.local/share/two-host-podcast/venv/bin/python ${CLAUDE_PLUGIN_ROOT}/scripts/render.py --check
```

If the check fails, tell the user and offer to run the installer; it downloads about three
hundred fifty megabytes.

## Where things go

- If the folder you work in already has a podcast guide or a podcasts folder, follow it.
  Otherwise use one folder per series: `podcasts/<series>/`. A single episode is a series
  of one. One language per series.
- Scripts are `E1_<name>.md`, `E2_<name>.md`, with the audio beside them under the same
  name. This naming lets the lint compare the episodes of a series.
- Episodes planned together start with a `plan.md`: the listener, the promise, what each
  episode covers, and production notes. A single episode needs none.

## The workflow

1. **Agree the brief.** Topic, type, listener, length in minutes, language (English or
   Spanish). If one is missing, choose it and say what you chose. Defaults: two-host,
   English, five minutes. If the user writes in Spanish, the episode is in Spanish.
2. **Write the script** in the format below, following the guide of the type and the
   writing rules. For `story` and `professor`, and for any real history, write the facts
   file first (see "Facts and history"). Plan two hundred
   words for each minute in English and one hundred ninety five in Spanish (measured at
   the build defaults; the guides of `professor`, `story` and `panel` give their own).
   One short test episode of each type is in `${CLAUDE_PLUGIN_ROOT}/examples/types/`.
   The opening names three things; if the brief asks for more,
   group them into three.
3. **Read it back as a listener** (checklist below). The lint cannot hear, and most real
   fixes come from this step.
4. **Check how it will be said** (see "Pronunciation").
5. **Build it** with one command. It lints the script, renders the `.m4a` beside it and
   checks the length against the target:

   ```bash
   ${CLAUDE_PLUGIN_ROOT}/scripts/podcast.sh podcasts/<series>/E1_<name>.md 5        # English, 5 minutes
   ${CLAUDE_PLUGIN_ROOT}/scripts/podcast.sh podcasts/<series>/E1_<name>.md 20 es    # Spanish, 20 minutes
   ```

   Rendering takes between a third and the full length of the episode: run it in the
   background, or with a timeout of ten minutes or more. `LINT_ONLY=1` in front lints
   without rendering. If the lint fails, fix every finding and run again; never render a
   script that fails. If the length is off by more than ten percent the command fails and
   says what percent of the words to cut or add (it also prints a `SPEED=` value: change
   the words first). The `.m4a` it wrote is then not the finished episode.
6. **Deliver** (see "Delivering").

## Script format

```markdown
<!-- 2026-01-15 two-host -->
**HOST_A:** Welcome in. Today we look at how bread rises, in three things: yeast, time and heat.
**HOST_B:** Three things, and the first one is alive. Yeast is a tiny fungus that eats sugar.
**HOST_A:** So when the dough sits on the counter, the yeast is
**HOST_B:** eating, exactly, and breathing out the gas that makes the bubbles.
```

- The first line is today's date and the type as a comment, `<!-- YYYY-MM-DD type -->`.
  Without a type the lint treats the script as two-host.
- Then one turn per line, `**HOST_A:** text` up to `**HOST_E:** text`. Nothing else: no
  headings, no blank turns, no stage directions. A line that is not a turn is never
  spoken, so the renderer refuses to start while one exists.
- The type decides which speakers may talk, whether one speaker may take two turns in a
  row, and whose share of the words the lint checks. The guide of the type gives each.
- Each letter has its own voice. English: A `af_bella`, B `am_michael`, C `bf_emma`,
  D `am_fenrir`, E `bm_george`. Spanish: A `ef_dora`, B `em_alex`, C `em_santa`; Spanish
  has no more voices, so a Spanish script stops at HOST_C. Change one with
  `--voice B=NAME` on the renderer.
- When one speaker takes two turns in a row (professor, story), the renderer leaves a
  longer pause between them: use it as a paragraph break.

## Writing rules

Everything in a turn is read aloud by a speech engine, to a listener who cannot see it.

- **Numbers as words.** "fifteen grams", "nineteen eighty four", "about a third". A digit
  is a lint failure, because the engine reads digits unpredictably.
- **No paths, file names, URLs, commands or code.** Say what a thing is ("the project
  notes", "the company website"), never where it lives.
- **No symbols from a source.** Replace "g", "h", "f of x" with a plain phrase.
- **No dashes.** No em dash, no en dash, no hyphen standing in for a dash. Use a comma, a
  colon or a full stop. Hyphenated words such as "well-known" are fine.
- **Open with three things.** The opening is short: a welcome and the three things the
  episode will cover, in everyday words (a panel names one part per expert instead). The
  episode covers them in that order, and the recap near the end returns to them.
- **Close with a line.** After the recap, the final turn is a one-sentence sign-off. The
  guide of the type says who gives each.
- **Write for the ear.** Short sentences, one idea each. Say acronyms the way people say
  them. Give the concrete picture before the name.
- **Keep turns short.** Most turns fifteen to sixty words. Split anything over about
  ninety words with a short reply from the other host.
- **Mid-sentence handoff.** One speaker leaves a sentence unfinished, with no final
  punctuation, and the next finishes it; the renderer joins them with a short gap. Use it
  in the types with two or more voices.
- **Section seams.** In English, a turn containing "let's", "lets", "leads us to" or
  "last piece" is followed by a long pause, which marks a new section. Use those words
  only in the turn that closes a section. Spanish has no such words: every turn gets the
  same short gap.
- **People and private material.** Refer to people by their role unless the user wants
  names. If the source is private, keep the script and the audio on this machine.
- **Spanish.** Prefer plain Spanish words over anglicisms.

## Reading it back

Check each of these before you build:

- every term in the recap was introduced earlier, with the same word;
- each new term is explained in the turn that first uses it (the opening is exempt);
- no more than two measured quantities in one turn (a fraction with its result, "nine out
  of a hundred and eight, about eight percent", counts as one); the recap need not repeat
  every number;
- no piles of nouns ("leftover spin swirl") that are unclear by ear;
- each unfinished sentence is really finished by the other host's next words;
- the section seam words appear only where a section closes.

## Pronunciation

Nobody can listen during the work, so read the phonemes:

```bash
PY=~/.local/share/two-host-podcast/venv/bin/python
"$PY" ${CLAUDE_PLUGIN_ROOT}/scripts/phonemes.py podcasts/<series>/E1_<name>.md      # every turn, English
"$PY" ${CLAUDE_PLUGIN_ROOT}/scripts/phonemes.py podcasts/<series>/E1_<name>.md es   # every turn, Spanish
"$PY" ${CLAUDE_PLUGIN_ROOT}/scripts/phonemes.py --say "Strouhal number"            # one phrase, English
"$PY" ${CLAUDE_PLUGIN_ROOT}/scripts/phonemes.py --say-es "álabes directrices"      # one phrase, Spanish
```

If a word comes out wrong, write it by sound in the script and check again. For a long
script, read only the turns that have a name, a letter group, a money amount or a word
with two readings.

- **English.** A single letter is read as a word ("A star" becomes "uh star"): write
  "A-star". Letter groups that start with A are safer written closed ("AMD" reads right,
  "A M D" does not). The plural of a letter group is misread ("C P Us" ends in "us"):
  say "C P U units". Words with two readings can come out wrong: "use" and "lives" after
  a plural noun, "read" in the past, "close", "wind", "separate", "route", "suspect".
  Reword the line.
- **Spanish: English terms.** The voice reads them as Spanish. Write them by sound:

  | term | write as |
  | :-- | :-- |
  | Cheat Engine | Chit Enyin |
  | Python | Páiton |
  | offset | ófset |
  | hook | juk |
  | Lua | Lúa |
  | Claude | Clod |
  | PAT (letters) | pe, a, te |
  | A estrella, A* (the letter A) | Ah estrella |

  Read correctly as written: bot, píxel, waypoint, navmesh, addon, script, log,
  software, Sharma, kilovatios.
- **Spanish: a single letter.** A lone "A" is read as the preposition, without stress,
  and a lone "Á" is read "a acentuada". Write the letter by sound, as in the table.
- **Spanish: "sobre" and "bajo".** The voice reads them as prepositions, without stress,
  even when they are a verb or an adjective. Write around them: "el exceso de caudal",
  not "que sobre caudal"; "baja de noche", not "bajo de noche".

## Facts and history

A `story` or `professor` episode, and any episode that tells real history, keeps a facts
file beside the script, `E1_<name>.facts.md`: each event, person, date, number and quote
the script uses as fact, with its source and how sure it is. Write it before the script,
from sources you have actually read, and use only those facts as fact. Before building,
read the script once against the file: every real claim must be on it. A detail you
cannot source is cut, or told plainly as imagined.

For prices, procedures or science the listener will follow, go further. Done this way,
the checks once found over a hundred points to fix before any audio existed:

1. **Research first.** Verify the facts on primary sources and keep them as numbered
   fact sheets beside the scripts, each fact with its address, the date it
   was read and how sure it is.
2. **Plan.** `plan.md` fixes the listener, a table of words to use, the numbers to use,
   and the outline of each episode. With that, several writers can work at once.
3. **Write without rendering.** Each writer ends with a passed lint (`LINT_ONLY=1`) and a
   table of every number said, with the fact it comes from. Aim ten percent under the
   word target: the fixes add words.
4. **Check before the voice.** Someone who did not write the script goes through it claim
   by claim against the fact sheets: what is false, what is unsupported or too sure, what
   could cost the listener money or mislead them, and which terms come before their
   explanation. The writer then fixes the script from that list.
5. **Render**, and read across the episodes for advice that one part gives and another
   part contradicts.

## The lint on its own

```bash
"$PY" ${CLAUDE_PLUGIN_ROOT}/scripts/lint.py episode.md --minutes 8 --wpm 200
"$PY" ${CLAUDE_PLUGIN_ROOT}/scripts/lint.py episode.md --minutes 8 --ban "Project Falcon"
```

- Every run first drills itself on an invented fixture. If the drill fails, the lint is
  broken; do not trust its verdict.
- Rules that fail a script: date line, unknown type, lines that are not turns, a speaker
  the type or the language does not have, too few speakers for the type, same speaker
  twice where the type forbids it, dashes, digits, paths, file names, URLs, code, banned
  words (`--ban`, for names that must never be said aloud), the word band (ten percent
  either side of the target) and the share of words of the speaker the type names.
- `--lang es` limits the speakers to the three Spanish voices; the build passes it.
- It also prints readings: words, turns, words per host, projected minutes, longest turn.
- Episodes of a series are compared with each other; a departing share of words is a note
  to explain, not a failure.
- Findings report the rule and the line number only, never the text.

## Delivering

- Give the path of the `.m4a` and its length as printed by the build (read from the file,
  never estimated from the word count), the word count and the lint verdict.
- Say that nobody has listened to it yet, and name the two or three moments you are least
  sure of.
- If the material did not fit, deliver the full episode, say by how much it ran over, and
  offer a shorter cut. Do not cut the passages most worth hearing just to land in a band.
- Keep the script beside the audio with the same name, so it can be fixed and rebuilt.
- Do not upload, send or share the file unless the user asks.

## Troubleshooting

- "model file(s) missing": run the installer, or set `PODCAST_MODELS_DIR`.
- "ffmpeg was not found": `brew install ffmpeg`.
- "kokoro_onnx is not importable": use the venv Python, not the system one.
- "N line(s) are not turns": run the lint and fix each line it names.
- The episode sounds rushed: change the words first; `SPEED=1.1` in front of the build
  slows the voice.
