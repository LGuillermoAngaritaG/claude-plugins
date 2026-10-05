# guille-plugins

My Claude Code plugins, in one marketplace.

## Install

```bash
claude plugin marketplace add LGuillermoAngaritaG/claude-plugins
claude plugin install status-bar@guille-plugins
claude plugin install python@guille-plugins
claude plugin install diagrams@guille-plugins
claude plugin install claudish-to-english@guille-plugins
```

To get later changes:

```bash
claude plugin marketplace update guille-plugins
```

## Plugins

| Plugin | What it does | Needs |
| --- | --- | --- |
| `status-bar` | A two-row band above the prompt: model, folder, git branch and diff, cost, timer, context use, and the 5-hour and 7-day limits. It also writes `~/.claude/rate-limit-cache.json` so other tools can read your usage. | Claude Code 2.1.286 or newer. It uses the function-hooks plugin API, which is early access and may change. |
| `python` | Three skills: `python-scaffold` starts a project with a layered layout, `python-development` adds code to that layout, `python-light-development` keeps a small project flat. | `uv` |
| `diagrams` | `improved-drawio` builds draw.io architecture diagrams on a computed grid, renders them, and checks the image before you see it. | Python with `playwright` and Chromium |
| `claudish-to-english` | Shows a plain-English rewrite of Claude Code messages next to the original. By Mike Gvozdev, MIT licence, moved here from my fork. | The Claude Code CLI, logged in |

## Develop

```bash
claude plugin validate .
claude plugin test plugins/status-bar
```

`status-bar`, `python` and `diagrams` set no `version`, so every pushed commit is a new release for them. `claudish-to-english` sets one, so its users get changes only when that number goes up.
