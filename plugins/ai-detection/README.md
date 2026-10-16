# ai-detection

Checks whether a paper reads as AI-written. Eight detector agents read the same text, each with a different AI-writing skill, and the `check-paper` skill combines their verdicts into one report. Nothing in the paper is edited.

## Install

```
/plugin install ai-detection --marketplace LGuillermoAngaritaG/claude-plugins
```

or from a shell:

```bash
claude plugin marketplace add LGuillermoAngaritaG/claude-plugins
claude plugin install ai-detection@guille-plugins
```

## Use

```
/ai-detection:check-paper path/to/paper.typ
/ai-detection:check-paper path/to/chapter-folder --context "materials-science review, authors write English as a second language"
/ai-detection:check-paper draft.pdf --out ai-check.md
```

It reads Markdown, plain text, Typst, LaTeX, reStructuredText, Word and PDF. For Typst and LaTeX it follows the includes from the main file.

## The eight detectors

| Agent | Skill | Where it comes from |
| --- | --- | --- |
| `humanize-score` | humanize, 53 patterns with a 0-100 score | your local `~/.claude/skills/humanize`; reported as not run if absent |
| `wikipedia-signs` | humanizer, Wikipedia "Signs of AI writing" | local `~/.claude/skills/humanizer`, else [blader/humanizer](https://github.com/blader/humanizer) |
| `stop-slop` | stop-slop Final Audit Pass and no-slop banned vocabulary | local `stop-slop-v3` and `no-slop`, else [Stop-Slop-v2](https://github.com/Chaosman-One/Stop-Slop-v2) and [no-slop](https://github.com/Byk3y/no-slop) |
| `blader-humanizer` | humanizer, current version | [blader/humanizer](https://github.com/blader/humanizer) |
| `claude-vibes` | ai-writing-detection, nine layers | [claude-vibes](https://github.com/mike-coulbourn/claude-vibes), pinned commit |
| `avoid-ai-writing` | detect-only mode, P0/P1/P2 | [avoid-ai-writing](https://github.com/conorbronsdon/avoid-ai-writing) |
| `anti-ai-slop` | checklist, banned words, 11-point self-check | [anti-ai-slop-writing](https://github.com/jalaalrd/anti-ai-slop-writing) |
| `wikipedia-deslop` | Wikipedia human style with deslop | [cat-agent-skills](https://github.com/microsoft/cat-agent-skills) and [howells/skills](https://github.com/howells/skills) |

The agents fetch the remote skills with WebFetch when they run, so they get each skill's current rules. This plugin copies none of them. Only the skill URLs are fetched; the paper's text is not sent anywhere.

## Report

- One row per detector: its verdict, a normalized low, medium or high, and a score where the skill has one.
- An overall verdict.
- Passages flagged by three or more detectors, with fixes.
- Errors the detectors noticed in passing, such as wrong numbers or broken references, after the skill checks each one.
- What reads as human.
- Caveats.

## Limits

These are heuristics run by a model. They estimate how likely an editor is to suspect LLM drafting; they do not establish who wrote a text. WebFetch can return a summary instead of a skill's verbatim file, and the agents say when that happens. A full run starts eight agents and can take 10 to 20 minutes on a long paper.

## Needs

Claude Code with WebFetch allowed for `raw.githubusercontent.com`. For Word or PDF input, Python with `python-docx` or `pypdf`.
