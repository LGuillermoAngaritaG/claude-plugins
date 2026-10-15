# podcast-generation

The `podcast` skill lets Claude Code write a podcast script, check it,
check how it will be pronounced, and render it into an audio episode entirely on your Mac,
using the open Kokoro text to speech model. English and Spanish.

Six types: two hosts, a student teaching an expert, an adversarial debate, an expert
panel (four or five voices in English, three in Spanish), a story built on real history,
and a professor's lecture. Each type has a short guide in `skills/podcast/types/`, and
`examples/types/` has one short test episode of each.
After the one-time install below, no internet connection is needed to make episodes.

## What you need

- A Mac. Tested on Apple silicon with Python 3.12; see the Intel note below.
- About six hundred megabytes of free disk (the model files are about three hundred forty
  megabytes, the Python environment most of the rest), plus ffmpeg from Homebrew.
- An internet connection for the install only.
- Claude Code, if you want Claude to drive it. The scripts also work on their own.

## Install

```bash
claude plugin install podcast-generation@guille-plugins
bash ~/.claude/plugins/marketplaces/guille-plugins/plugins/podcast-generation/scripts/install.sh --dry-run
bash ~/.claude/plugins/marketplaces/guille-plugins/plugins/podcast-generation/scripts/install.sh
```

Or ask Claude to run the installer; the skill knows where it is. If Homebrew is not
installed, the script stops and points you to https://brew.sh. Running it twice is safe.

## What the installer does

1. Finds Homebrew and installs `uv` (a fast Python installer) and `ffmpeg` (audio
   conversion; it brings `ffprobe`, used to read the finished episode's duration).
2. Creates a Python 3.12 environment at `~/.local/share/two-host-podcast/venv`.
3. Installs these packages, at the versions tested together:

   | package | version |
   | :-- | :-- |
   | kokoro-onnx | 0.5.0 |
   | onnxruntime | 1.30.0 |
   | numpy | 2.2.6 |
   | soundfile | 0.13.1 |
   | phonemizer-fork | 3.3.2 |
   | espeakng-loader | 0.2.4 |

4. Downloads the two Kokoro v1.0 model files from the kokoro-onnx project's public release
   `model-files-v1.0` into `~/.local/share/two-host-podcast/models`, and checks each one
   against the SHA-256 sum of the copies this package was tested with:

   | file | bytes | SHA-256 |
   | :-- | :-- | :-- |
   | kokoro-v1.0.onnx | 325532387 | 7d5df8ecf7d4b1878015a32686053fd0eebe2bc377234608764cc0ef3636a6c5 |
   | voices-v1.0.bin | 28214398 | bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d |

   A download that does not match is deleted and the script stops, rather than install a
   file nobody has checked.
5. Runs two checks: the renderer's setup check, and the linter's self drill plus a lint
   of the sample script.

`PODCAST_HOME=/some/folder` puts the environment
and the models somewhere else (then also set `PODCAST_MODELS_DIR=/some/folder/models`).

## Check it works

```bash
PLUG=~/.claude/plugins/marketplaces/guille-plugins/plugins/podcast-generation
cp "$PLUG/examples/sample_script.md" ~/Desktop/sample_episode.md
"$PLUG/scripts/podcast.sh" ~/Desktop/sample_episode.md 3
open ~/Desktop/sample_episode.m4a
```

The sample is a three minute episode about brewing coffee.

## Use it from Claude Code

Start Claude Code in any folder and ask, for example: "Make me a five minute
podcast explaining how our onboarding process works, from these notes." Claude follows
the skill: it writes the script, reads it back, checks the pronunciation, builds it with
`scripts/podcast.sh`, and tells you where the `.m4a` is and how long it is.
You can also name a type: "a panel episode", "a professor lecture on resonance". Invoke
it by name with `/podcast-generation:podcast`.

## Intel Macs

The pinned versions were tested on Apple silicon. If `uv` cannot find a pinned wheel for
an Intel Mac, run `PODCAST_UNPINNED=1 bash scripts/install.sh` to let it choose versions
that fit, then check with `render.py --check` and render the sample before relying on it.

## Uninstall

```bash
claude plugin uninstall podcast-generation@guille-plugins
rm -rf ~/.local/share/two-host-podcast
brew uninstall ffmpeg uv     # only if nothing else on the Mac uses them
```

## Licences

kokoro-onnx is MIT licensed; the Kokoro model is Apache 2.0. Pronunciation uses
espeak-ng, bundled by espeakng-loader under its own licence. The scripts in this plugin
are offered as they are, free to use and change.
