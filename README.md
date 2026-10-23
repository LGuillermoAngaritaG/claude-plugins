# guille-plugins

My Claude Code plugins, in one marketplace.

## Install

```bash
claude plugin marketplace add LGuillermoAngaritaG/claude-plugins
claude plugin install status-bar@guille-plugins
claude plugin install python@guille-plugins
claude plugin install diagrams@guille-plugins
claude plugin install claudish-to-english@guille-plugins
claude plugin install colab-video-studio@guille-plugins
claude plugin install podcast-generation@guille-plugins
claude plugin install ai-detection@guille-plugins
claude plugin install video-generation@guille-plugins
```

To get later changes:

```bash
claude plugin marketplace update guille-plugins
```

## Plugins

| Plugin | What it does | Needs |
| --- | --- | --- |
| `status-bar` | A two-row band above the prompt: model, folder, git branch and diff, cost, timer, context use, and the 5-hour and 7-day limits. It also writes `~/.claude/rate-limit-cache.json` so other tools can read your usage, and it notifies you (a toast, plus a desktop notification on macOS) when a turn finishes, when Claude asks a question or needs approval, and when the context passes 85%. | Claude Code 2.1.286 or newer. It uses the function-hooks plugin API, which is early access and may change. |
| `python` | Three skills: `python-scaffold` starts a project with a layered layout, `python-development` adds code to that layout, `python-light-development` keeps a small project flat. | `uv` |
| `diagrams` | `improved-drawio` builds draw.io architecture diagrams on a computed grid, renders them, and checks the image before you see it. | Python with `playwright` and Chromium |
| `claudish-to-english` | Shows a plain-English rewrite of Claude Code messages next to the original. By Mike Gvozdev, MIT licence, moved here from my fork. | The Claude Code CLI, logged in |
| `colab-video-studio` | `generate-video-clips` plans with you, waits for your approval, then makes video (LTX-2.5), speech (Chatterbox), sound effects (Stable Audio 3) and music (ACE-Step) on a Google Colab GPU through a key-protected server, downloads the results and shuts the GPU down. [Plugin documentation](plugins/colab-video-studio/README.md#known-limits) reports one test item per generator on a real L4 (October 2026), with quality untuned; this is project-reported testing and does not establish production validation. | Python 3, a Google account with Colab compute units. You run one notebook per session. |
| `podcast-generation` | `podcast` writes an episode in English or Spanish in one of six types (two hosts, student teaches expert, adversarial, expert panel, story, professor), reads it back, checks how each word will be pronounced, then lints it, renders it with local Kokoro voices and checks the length against the target. | macOS, Homebrew; its `scripts/install.sh` sets up the voice |
| `ai-detection` | `check-paper` runs eight AI-writing detector agents in parallel on a paper (Typst, LaTeX, Markdown, Word or PDF), each with a different public or local skill, and combines their verdicts, the passages several of them flag and the errors they notice. It never edits the paper. [Plugin documentation](plugins/ai-detection/README.md) | WebFetch for raw.githubusercontent.com; optional local humanize, humanizer, stop-slop-v3 and no-slop skills |
| `video-generation` | Five skills for narrated videos made on your Mac and AI clips: `math-video` (3Blue1Brown-style explainers), `sketch-video` (hand-drawn shorts), `story-video` (painted story shorts), `ad-video` (product ads inside the platform safe zones) and `ai-clips` (the Colab generator, also kept in `colab-video-studio`). It carries the Remotion engine, scripts, sounds and fonts, and copies them into a workspace folder of yours with `scripts/workspace.sh`. | macOS, Node.js, ffmpeg, uv, the Kokoro voice of `two-host-podcast`; `atelier` with Codex for pictures; Colab for AI clips |

## Develop

```bash
claude plugin validate .
claude plugin test plugins/status-bar
```

`status-bar`, `python` and `diagrams` set no `version`, so every pushed commit is a new release for them. `claudish-to-english` and `colab-video-studio` set one, so their users get changes only when that number goes up.
