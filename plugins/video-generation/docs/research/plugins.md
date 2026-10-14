# Research: building a Claude Code plugin for video skills

Date: 2026-10-14. Docs were fetched as raw Markdown from code.claude.com, platform.claude.com and
agentskills.io on this date. GitHub facts (stars, last push, license, file trees) come from the
GitHub API on this date. Local Claude Code version on this Mac: **2.1.289**.

Several features below carry a minimum version in the docs. Most are older than 2.1.289. A few
mentioned in passing need 2.1.295 or 2.1.296 (marked where relevant).

What I tested locally (not just read):
- Built a small test plugin (manifest with `userConfig`, two skills, `bin/`, `scripts/`) and ran
  `claude plugin validate` with and without `--strict`, `claude --plugin-dir ... plugin details`,
  and `claude --plugin-dir ... plugin list`. Results are quoted in A11.
- I could **not** run a headless `claude -p` session to check variable substitution at runtime:
  the OAuth session in this subagent had expired. Substitution behavior is therefore from the docs
  only.

---

# Part A: How to build a good plugin

## A1. Folder layout

The manifest is optional. Without it, Claude Code loads whatever it finds in the default folders.
The name then comes from the marketplace entry or the folder name. The manifest lives in
`.claude-plugin/plugin.json`. **Everything else goes at the plugin root, not inside
`.claude-plugin/`.** A `skills/` folder placed inside `.claude-plugin/` is a common reason why
skills go missing.

| Component | Default location | Notes |
|---|---|---|
| Manifest | `.claude-plugin/plugin.json` | Optional |
| Skills | `skills/<name>/SKILL.md` | One folder per skill. A lone `SKILL.md` at the root, with no `skills/` folder and no `skills` key, loads as a single skill |
| Commands | `commands/*.md` | Older format. The docs say to prefer skills for new work |
| Agents | `agents/*.md` | Subfolders become part of the name: `agents/review/security.md` loads as `plugin:review:security` |
| Hooks | `hooks/hooks.json` | The file must wrap the events in a top-level `"hooks"` key |
| MCP servers | `.mcp.json` | |
| LSP servers | `.lsp.json` | |
| Output styles | `output-styles/` | |
| Workflows | `workflows/*.js` | |
| Themes | `themes/` | Experimental |
| Monitors | `monitors/monitors.json` | Experimental. Interactive sessions only |
| Executables | `bin/` | Put on the Bash tool's `PATH` while the plugin is enabled (see A4) |
| Settings | `settings.json` | Only `agent` and `subagentStatusLine` take effect |
| Evals | `evals/` | For `claude plugin eval` (see A11) |
| Anything else | e.g. `scripts/`, `templates/`, `assets/` | Not special. Not scanned. Reached by path through `${CLAUDE_PLUGIN_ROOT}` |

A `CLAUDE.md` at the plugin root is **not** loaded. `claude plugin validate` warns about it. To
ship instructions, put them in a skill.

Suggested layout for our case (inference, not an official template):

```text
explainer-videos/
├── .claude-plugin/plugin.json
├── skills/
│   ├── make-video/          SKILL.md + references/ (router: picks math / sketch / story)
│   ├── math-video/          SKILL.md + references/ + assets/ (templates)
│   ├── sketch-video/        ...
│   ├── story-video/         ...
│   └── podcast/             ...
├── scripts/                 shared tools: tts.py, align.py, stills.mjs, build.sh, check.py
├── templates/               project skeleton copied into the user's project on first run
├── hooks/hooks.json         optional: SessionStart dependency install into ${CLAUDE_PLUGIN_DATA}
└── evals/                   optional: claude plugin eval cases
```

## A2. plugin.json fields

`name` is the only required key. These are the top-level keys the manifest reference lists today.
I did not invent any. An unknown top-level key is stripped at load time and `validate` warns
about it (I confirmed this locally).

| Field | Type | What it does |
|---|---|---|
| `$schema` | string | Editor help only. Ignored at load time |
| `name` | string | Required. Kebab-case. Every component is namespaced under it (`/name:skill`) |
| `displayName` | string | UI name. Not used for lookup |
| `version` | string | Not checked against semver. **Setting it pins users to that version until you change it** (see A10) |
| `description` | string | Short summary |
| `author` | object | `name` (required inside the object), `email`, `url` |
| `homepage` | string | Must parse as a URL, or the plugin fails to load |
| `repository` | string | Not validated |
| `license` | string | SPDX id |
| `keywords` | string[] | Discovery tags |
| `metadata` | object | Free-form. Claude Code does not read it (v2.1.222+) |
| `icon`, `documentationUrl`, `supportUrl`, `privacyPolicyUrl`, `termsOfServiceUrl` | strings | Only for Anthropic's directory listing. Ignored by Claude Code |
| `defaultEnabled` | boolean | Default `true` |
| `dependencies` | array | Other plugins that must be enabled: `"name"`, `"name@marketplace"`, or `{name, marketplace, version}` |
| `settings` | object | Only `agent` and `subagentStatusLine` take effect. A root `settings.json` wins over it |
| `userConfig` | object | Values the user is asked for (see A5) |
| `types` | path | For "mods" only |
| `channels` | array | Message channels bound to an MCP server |
| `skills` | path or paths | **Adds to** the default `skills/` scan |
| `commands` | path, paths, or object map | **Replaces** the default `commands/` scan |
| `agents` | path or paths (`.md` files only) | **Replaces** the default `agents/` scan |
| `hooks` | path, inline object, or array | **Merges** with `hooks/hooks.json` |
| `mcpServers` | path, `.mcpb`/`.dxt` bundle, URL, inline map, or array | **Merges** with `.mcp.json` |
| `lspServers` | path, inline map, or array | **Merges** with `.lsp.json` |
| `outputStyles` | path or paths | Replaces the default scan |
| `workflows` | path or paths | Replaces the default scan |
| `experimental.themes`, `experimental.monitors`, `experimental.evals` | | Shape may still change |

Path rules: every component path must start with `./`, must stay inside the plugin root, and must
exist. `..` is rejected as path traversal. A symlink that leads outside the plugin is rejected
(except links between plugins in one marketplace). On macOS and Linux a backslash anywhere in a
path is rejected.

Name rules: `claude plugin validate` gives an **error** for names that start with `claude-`,
`anthropic-`, `anthropics-` or `cc-plugin-`, and a **warning** when `claude` or `anthropic` appears
as a whole word elsewhere in the name.

## A3. Path variables, and whether `CLAUDE_PLUGIN_DATA` exists

Yes, `CLAUDE_PLUGIN_DATA` exists and is documented.

| Variable | Points to | Use it for | Lifetime |
|---|---|---|---|
| `${CLAUDE_PLUGIN_ROOT}` | The installed version's folder, e.g. `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/` | Reading scripts, templates, binaries bundled with the plugin | **Changes on every update.** The docs say not to write state there |
| `${CLAUDE_PLUGIN_DATA}` | `~/.claude/plugins/data/<id>/`, where `<id>` is the plugin id with every character other than letters, digits, `_` and `-` replaced by `-` (`my-plugin@my-mkt` becomes `my-plugin-my-mkt`) | `node_modules`, Python venvs, generated code, caches | Created on first reference. Survives updates. **Deleted when the plugin is uninstalled from its last scope**, unless `--keep-data` is passed |
| `${CLAUDE_PROJECT_DIR}` | The project root | Project-local files and outputs | The project's own lifetime |
| `${CLAUDE_SKILL_DIR}` | The folder that holds this skill's `SKILL.md` (for a plugin skill: the skill's subfolder, not the plugin root) | Files next to the skill | Same as plugin root |

Where substitution happens:

| Place | `${...}` substituted inline | Exported as environment variables |
|---|---|---|
| Hook commands | `command`, `args` | `CLAUDE_PLUGIN_ROOT`, `CLAUDE_PLUGIN_DATA`, `CLAUDE_PROJECT_DIR`, `CLAUDE_PLUGIN_OPTION_<KEY>` |
| Monitor commands | `command` | none |
| MCP stdio servers | `command`, `args`, `env` | `CLAUDE_PLUGIN_ROOT`, `CLAUDE_PLUGIN_DATA` |
| LSP servers | `command`, `args`, `env`, `workspaceFolder` | `CLAUDE_PLUGIN_ROOT`, `CLAUDE_PLUGIN_DATA`, `CLAUDE_PROJECT_DIR` |
| Skill, command, agent Markdown | anywhere in the body; also in Bash rules inside `allowed-tools` | not applicable |

**Important gotcha:** these variables are **not** in the environment of commands Claude runs
through the Bash tool, in the main session or in a subagent. They are only substituted as text
inside the skill body. So:
- In `SKILL.md`, write the full path with the variable, for example
  `` `python3 "${CLAUDE_PLUGIN_ROOT}/scripts/tts.py" ...` ``. Claude Code replaces it before Claude
  reads the skill.
- Inside a script, do not read `$CLAUDE_PLUGIN_ROOT` from the environment. Find the script's own
  folder instead (`Path(__file__).resolve().parent` in Python, `import.meta.url` in Node,
  `$(dirname "$0")` in sh). This last point is my inference from the docs, not a quoted rule.

On Windows the substituted paths use forward slashes.

## A4. Can plugin skills run plugin scripts? Is `bin/` on PATH?

**Scripts:** yes. The documented pattern is to name the script by an absolute path built from a
variable, and to pre-approve that exact path in `allowed-tools`:

```yaml
---
name: render-chart
description: Render a chart from a CSV file
allowed-tools: Bash(${CLAUDE_SKILL_DIR}/scripts/render.sh *)
---
Run `${CLAUDE_SKILL_DIR}/scripts/render.sh <csv-file>` to render the chart.
```

In a plugin skill, `${CLAUDE_PLUGIN_ROOT}` and `${CLAUDE_PLUGIN_DATA}` are substituted in the same
two places (body and `allowed-tools` Bash rules), so shared scripts at the plugin root work the
same way. The `allowed-tools` grant only lasts for the turn that invoked the skill. It is cleared
when the user sends the next message.

**Dynamic context injection** (`` !`command` `` or a fenced block opened with ` ```! `) runs a shell
command *before* Claude sees the skill and pastes its output in. Rules that matter for check
scripts:
- It runs in the session's current working directory, so use `${CLAUDE_SKILL_DIR}` or
  `${CLAUDE_PROJECT_DIR}` in paths.
- **A non-zero exit aborts the whole skill invocation.** A check script that exits 1 on problems
  needs `|| true`.
- It never prompts. Outside auto mode, a command that is not allowed by permission rules or
  `allowed-tools` aborts the invocation.
- Default timeout 2 minutes. stderr is merged into the output.
- Users can turn it off with the `disableSkillShellExecution` setting, so a skill should not
  depend on it for anything essential (inference).

**`bin/`:** yes. Files in `bin/` at the plugin root are on the `PATH` of the Bash tool's shell
while the plugin is enabled, so Claude can call them as bare commands. They come **after** the
user's own PATH entries, so a plugin cannot shadow `git` or `ffmpeg`. Caveat: **claude.ai and
Cowork refuse to install a plugin that has a top-level `bin/` folder.** If the plugin should ever
work in Cowork, keep executables in `scripts/` and call them by full path.

## A5. `userConfig` (user settings for the plugin)

Keys must be letters, digits and underscores, and cannot start with a digit. Each option is a
**strict** object: an unknown key fails validation and the plugin does not load.

| Field | Required | Notes |
|---|---|---|
| `type` | yes | `string`, `number`, `boolean`, `directory`, or `file` |
| `title` | yes | Label |
| `description` | yes | Help text |
| `required` | no | Empty value not accepted |
| `default` | no | string, number, boolean, or string array |
| `options` | no | Fixed choices for a `string` (needs v2.1.271+; older versions cannot load the plugin) |
| `multiple` | no | `string` may hold an array |
| `sensitive` | no | Masked input, stored in the OS secure store, not `settings.json` |
| `min` / `max` | no | For `number` |

How a value reaches the plugin:
- `${user_config.KEY}` is substituted in MCP and LSP config, exec-form hook `args`, and **skill and
  agent content**. In skill content only non-sensitive values are substituted.
- `CLAUDE_PLUGIN_OPTION_<KEY>` (uppercased) is exported to hook processes for every option.
- Shell-form hook commands, monitor commands and MCP `headersHelper` **reject**
  `${user_config.*}`.

Non-sensitive values are stored under `pluginConfigs` in the user's `settings.json`. Each option
also shows as a row in `/config` (v2.1.269+), except sensitive and `multiple` ones.

When the dialog appears: on install through `/plugin`, on `/plugin install` inside a session, and
when enabling from the Installed tab. **It does not appear with `--plugin-dir` or with the shell
command `claude plugin install`.** Use `/plugin configure <plugin>` in a session, or
`claude plugin install ... --config KEY=VALUE`, or `claude plugin configure --values-stdin`.

Possible use for us (inference): `default_voice`, `language`, `art_engine`, and an `output_dir`
of type `directory`. Do not use `userConfig` for anything the skill must read through Bash
environment variables: skills only see the substituted text.

## A6. Skill frontmatter fields available today (Claude Code docs)

All fields are optional. Only `description` is recommended. **Claude Code silently ignores a field
it does not recognize**, and I confirmed that `claude plugin validate` (2.1.289) does not warn about
an unknown skill frontmatter key either. Field names are lowercase with hyphens, except
`when_to_use`.

| Field | Meaning |
|---|---|
| `name` | Command name. In a plugin it replaces only the last segment: `skills/review/` with `name: fancy` becomes `/my-plugin:fancy` |
| `description` | What it does and when to use it. Used to decide auto-loading |
| `when_to_use` | Extra trigger text. Appended to `description`. **Combined cap: 1,536 characters** in the skill listing |
| `argument-hint` | Autocomplete hint, e.g. `[topic] [length]` |
| `arguments` | Named positional arguments for `$name` substitution |
| `disable-model-invocation` | `true`: only the user can run it. Also stops preloading into subagents and scheduled-task runs |
| `user-invocable` | `false`: hidden from the `/` menu, only Claude can load it |
| `allowed-tools` | Tools pre-approved for the turn that invokes the skill. Does not restrict other tools |
| `disallowed-tools` | Tools removed while the skill is active (until the next user message) |
| `model` | Model override for the rest of the turn (or the forked subagent's model with `context: fork`) |
| `effort` | `low`, `medium`, `high`, `xhigh`, `max` |
| `context` | `fork` runs the skill as the prompt of a new subagent, without the conversation history |
| `agent` | Subagent type for `context: fork` (`Explore`, `Plan`, `general-purpose`, or a custom one). Default `general-purpose` |
| `background` | With `context: fork`: `false` waits for the result in the same turn. Default `true` (v2.1.218+) |
| `hooks` | Hooks registered when the skill is invoked; they stay for the rest of the session |
| `paths` | Globs. Auto-loading only when working with matching files |
| `shell` | `bash` (default) or `powershell` for injected commands |
| `metadata` | Free-form map for your own tools |
| `license`, `compatibility` | From the Agent Skills spec. Accepted, not acted on |

Notes on `context: fork`:
- Despite the name, it does **not** copy the conversation. The skill text must stand alone.
- A backgrounded fork runs with a narrower tool set. If the steps need other tools, set
  `background: false`.
- Background fork edits are outside checkpoints, so `/rewind` does not undo them.
- It only makes sense for skills that contain a task, not reference guidelines.

String substitutions in skill content: `$ARGUMENTS`, `$ARGUMENTS[N]`, `$N`, `$name`,
`${CLAUDE_SESSION_ID}`, `${CLAUDE_EFFORT}`, `${CLAUDE_SKILL_DIR}`, `${CLAUDE_PROJECT_DIR}`, and in
plugin skills `${CLAUDE_PLUGIN_ROOT}` and `${CLAUDE_PLUGIN_DATA}`. Escape a literal `$1` as `\$1`.

Portability: claude.ai uploads, the Skills API, and `package_skill.py` accept only `name`,
`description`, `license`, `compatibility`, `metadata` and `allowed-tools`. Anything else is a hard
error there. The Agent Skills spec (agentskills.io) also says `name` must match the folder name,
use lowercase letters, digits and single hyphens, max 64 characters, and `description` max 1,024
characters. Claude Code itself is more lenient (1,536-character listing cap).

Skill lifecycle facts that change how to write a skill:
- Once invoked, the rendered `SKILL.md` stays in the conversation. It is **not re-read** on later
  turns, so write standing rules ("after every edit, run X"), not one-time steps.
- After auto-compaction, only the **first 5,000 tokens** of each invoked skill are re-attached,
  within a shared 25,000-token budget, most recent skill first. **Put the most important rules
  near the top.** Re-invoke the skill after compaction if it stops being followed.
- A rule that must hold every time belongs in a hook, not in skill text.
- The skill listing budget is about 1% of the context window. When it overflows, descriptions of
  the least-used skills are dropped first. `/skill-doctor` reports cost and usage.

## A7. Agent Skills best practices (Anthropic and agentskills.io)

Sources: Anthropic's "Skill authoring best practices", the Claude Code skills page, the
agentskills.io spec and guides, and the `skill-creator` skill in `anthropics/skills`.

Size and structure
- Keep the `SKILL.md` body **under 500 lines**. agentskills.io adds "under about 5,000 tokens".
- Move detail to separate files and **say when to read each one** (for example: open the API
  errors file only when a call fails), not a vague pointer to the whole folder.
- **Keep references one level deep from `SKILL.md`.** Claude may only preview files that are
  linked from other linked files.
- Give reference files longer than about 100 lines (skill-creator says 300) a table of contents at
  the top.
- Folder convention from the spec: `scripts/` (run, not read), `references/` (read on demand),
  `assets/` (templates, images, data used in the output).
- Organize by domain or variant when a skill covers several (`references/aws.md`,
  `references/gcp.md`), so Claude reads only the relevant file. This fits our three video types.

Descriptions
- Say both what it does and when to use it. Include the words users would actually type.
- Anthropic: write in the third person (the skill does X), not the first or second person.
- agentskills.io: imperative phrasing works well (tell the agent when to use it), focus on user intent,
  and be a bit "pushy". `skill-creator` says Claude tends to under-trigger skills, so list contexts
  even when the user does not name the domain.
- Put the key use case first (the listing truncates).
- Test triggering with about 20 queries (8-10 should trigger, 8-10 near-misses that should not),
  3 runs each, threshold about 0.5.

Content
- Only add what Claude would get wrong without the skill. Cut explanations of things it knows.
- Match freedom to fragility: free text for judgment calls, exact commands for fragile steps
  (run this exact script with these exact flags).
- **Give a default, not a menu** of equal options.
- One term per concept, used everywhere.
- No time-sensitive statements. Put legacy notes in an "old patterns" section.
- A **gotchas** section is often the most valuable part. Keep it in `SKILL.md`, not in a reference
  file, because Claude may not know when to open the file. Every correction you make in a session
  is a candidate gotcha.
- Use checklists for multi-step workflows, **validation loops** (run checker, fix, repeat), and
  **plan-validate-execute** (write a plan file, validate it with a script, then execute).
- Provide output templates for strict formats.

Scripts
- Prefer bundled scripts for deterministic work. They are more reliable than generated code, and
  only their output costs tokens.
- Say clearly whether Claude should **run** a script or **read** it.
- Scripts should handle errors themselves and print specific, actionable messages.
- No interactive prompts (they hang). Inputs by flags, env vars or stdin.
- A short `--help`. Structured output (JSON) on stdout, diagnostics on stderr.
- Idempotent, `--dry-run` for destructive steps, meaningful exit codes, bounded output size.
- Justify every constant (no "voodoo constants").
- Pin versions for one-off tools (`npx pkg@x.y.z`, `uvx tool@x.y.z`). PEP 723 inline dependencies
  with `uv run` make a Python script self-contained.
- Do not assume tools are installed: state prerequisites (`compatibility` field or a preflight
  step).

Path conflict to know about: the agentskills.io scripts guide says relative paths like
`scripts/x.py` resolve from the skill root, on the assumption that the agent runs commands there. In Claude
Code that is not true: the Bash tool runs in the session's working directory. In Claude Code, use
`${CLAUDE_SKILL_DIR}/scripts/x.py` or `${CLAUDE_PLUGIN_ROOT}/scripts/x.py`.

When to split a skill
- A skill should be one coherent unit of work, like a function. Too narrow means several skills
  load for one task and may conflict. Too broad means it is hard to trigger precisely.
- Split into references first (progressive disclosure). Split into separate skills when the
  triggers differ (different user requests), or when one part is user-only
  (`disable-model-invocation`) and another is background knowledge (`user-invocable: false`).
- Common pattern in big video plugins (Remotion, HyperFrames): one **router** skill that reads
  project state and sends Claude to the right workflow, plus one skill per workflow, plus shared
  "domain" skills.

Testing
- Build evaluations first: run Claude on real tasks without the skill, note failures, write about
  three scenarios, measure a baseline, then write the minimum skill.
- Test in a fresh session. Leftover context from writing the skill hides gaps.
- Test with every model you plan to use.

## A8. Where should a skill write project output?

Official guidance (direct):
- `${CLAUDE_PLUGIN_ROOT}` is a versioned cache folder that changes on every update. Do not write
  state there.
- `${CLAUDE_PLUGIN_DATA}` is for things that must survive updates: dependencies, generated code,
  caches.
- `${CLAUDE_PROJECT_DIR}` is the project root, available to hooks, MCP servers and skill content.

Inference from that guidance (not stated as one sentence in the docs):
- **Finished videos and podcasts, and every per-project work file, belong in the user's project**
  (`${CLAUDE_PROJECT_DIR}` or the current folder), never in the plugin data folder. The data folder
  is deleted on uninstall from the last scope, and it is per-plugin, not per-project.
- Caches that are expensive to rebuild but not precious (TTS cache, `node_modules`, Python venv,
  downloaded models) fit `${CLAUDE_PLUGIN_DATA}`.
- If two projects share a cache in the data folder, key it by content hash, not by project name.

What public video skills actually do (three conventions):
| Project | Where outputs go |
|---|---|
| HeyGen HyperFrames | User's project, under `videos/<project>/`. Its plugin rules say to treat the plugin folder as read-only and to put outputs and temp work in the project or a temp folder |
| browser-use video-use | `<videos_dir>/edit/` next to the user's footage. Hard rule: never write inside the skill's folder |
| Yusuke710 manim-skill | A per-video session folder under `${MANIM_SKILL_HOME:-~/.manim-skill}/<slug>/`. It explicitly never writes into the user's working directory |

For our project the first convention fits: `CLAUDE.md` already says outputs live in
`videos/<series>/` and caches in `out/` and `public/audio/`.

Dependencies: for a **marketplace-installed** plugin, Claude Code installs Node dependencies into
the cached copy automatically, but only when the plugin root has `package.json` plus a supported
lockfile (`bun.lock`, `npm-shrinkwrap.json` or `package-lock.json` v2/v3). Limits: registry
packages pinned in the lockfile only, `--ignore-scripts` (no postinstall), no npm `overrides`, 60
second timeout, and no way to turn it off. For anything else (Python packages such as Kokoro,
packages that need build scripts, yarn/pnpm), the docs recommend a `SessionStart` hook that
installs into `${CLAUDE_PLUGIN_DATA}` and re-installs when the manifest file changes (they give a
`diff -q package.json` example). The auto-install does **not** run for `--plugin-dir` plugins or
in-place local-marketplace plugins.

Whether Remotion's renderer works under the `--ignore-scripts` auto-install is **UNCONFIRMED**. I
did not check whether Remotion needs an install-time script.

## A9. Versions, caching and updates

- Marketplace plugins are copied to `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/`
  (root can be moved with `CLAUDE_CODE_PLUGIN_CACHE_DIR`). Files outside the plugin folder are not
  copied, so a script that reads `../shared` breaks after install.
- Version order: `version` in `plugin.json`, then `version` in the marketplace entry, then the
  source. For GitHub or git sources with no version field, the version is the 12-character commit
  SHA.
- **If `version` is set and you push new commits without changing it, users keep the old copy.**
  Either bump `version` every release, or leave it out so the commit SHA is used.
- On update or uninstall, the old version folder gets an `.orphaned_at` marker and is removed 14
  days later, so running sessions keep working.
- Loaded **in place** (no copy, edits apply after `/reload-plugins` or a new session):
  `--plugin-dir`, skills-directory plugins, and relative-path plugins in a marketplace added from a
  local path.
- `claude plugin tag` creates a `<name>--v<version>` git tag after checking that `plugin.json` and
  the marketplace entry agree.

Skills-directory plugins (useful during development): any folder under `~/.claude/skills/` that
contains `.claude-plugin/plugin.json` loads in every session as `<name>@skills-dir`, with no
install. `claude plugin init <name> [--with skills hooks ...]` scaffolds one there. The same layout
under `<project>/.claude/skills/<name>/` loads for everyone who opens that repo, with conditions:
the session must start at the repo root (no parent search), the folder must be trusted, and
monitors and `.mcpb` bundles do not load. Claude Code does not scan a project's `.claude/plugins/`.

Name conflicts, highest wins: managed settings, then `--plugin-dir` / `--plugin-url` /
`CLAUDE_CODE_PLUGIN_DIRS`, then an installed marketplace plugin, then a skills-directory plugin
(`~/.claude/skills` beats the project's `.claude/skills`), then a claude.ai-synced plugin. A
`--plugin-dir` copy silently replaces an installed plugin with the same manifest name, which is
handy for testing a new version.

## A10. Agents, hooks and settings inside a plugin (short)

- Plugin agents support `name`, `description`, `model`, `effort`, `maxTurns`, `tools`,
  `disallowedTools`, `skills`, `memory`, `background`, `omitClaudeMd`, `isolation` (only
  `"worktree"`), `color`, and `experimental.cacheTtl`. They **ignore** `permissionMode`, `hooks`,
  `mcpServers` and `initialPrompt`.
- A subagent with a `skills` field preloads those skills. A skill with `context: fork` picks an
  agent type. These are the two ways to combine them.
- Plugin `settings.json` can only set `agent` (run one of the plugin's agents as the main thread)
  and `subagentStatusLine`.
- Hooks: prefer exec form with `args`, so paths with spaces stay one argument. In shell form, wrap
  `"${CLAUDE_PLUGIN_ROOT}"` in double quotes; `validate` warns if you do not.

## A11. Testing a plugin locally

Commands (all documented; first two also run here):

| Step | Command | What it tells you |
|---|---|---|
| Static check | `claude plugin validate ./plugin [--strict] [--json]` | Manifest schema, paths, frontmatter that does not parse. Exit 0 pass, 1 fail, 2 validator crash. `--strict` turns warnings into failures (use in CI). Also works on a bare `skills/` folder or `.claude/` folder (v2.1.233+) |
| Inventory and token cost | `claude --plugin-dir ./plugin plugin details <name>@inline` | Components found, always-on and per-invoke token estimate |
| Load for one session | `claude --plugin-dir ./plugin` (repeatable; a folder of plugins works on v2.1.265+; also `.zip`; also `--plugin-url`; or `CLAUDE_CODE_PLUGIN_DIRS`) | Session-only plugin named `<name>@inline` |
| Apply edits | `/reload-plugins` in the session | Prints `Reloaded: N plugins · N skills ...` |
| See errors | `/plugin` (Installed and Errors tabs), `claude --plugin-dir ./plugin plugin list` | Load errors per component |
| Behavior | `claude plugin eval [target]` (v2.1.269+) | Runs eval cases with and without the plugin and scores the difference |
| Single-skill iteration | `skill-creator` plugin from `claude-plugins-official` | With/without-skill benchmark, blind A/B of two versions, description tuning |
| Hook debugging | `claude --debug`, then read the debug log | Which hooks matched, exit codes |

What I observed locally on 2.1.289 with a test plugin:
- An unknown top-level manifest key gave `Unknown field '...'. Claude Code ignores it at load time.`
  and `Validation passed with warnings` (exit 0). With `--strict`: `Validation failed (--strict
  treats warnings as errors)` (exit 1).
- An unknown key in a skill's frontmatter (`madeUpField`) produced **no warning**. So `validate`
  will not catch a misspelled field such as `allowed_tools`. Write a small lint of our own if this
  matters.
- `plugin details` listed both skills and estimated ~40 always-on tokens for two short
  descriptions.
- The `userConfig` block with `type: directory` and a `default` passed validation.

`claude plugin eval` format, in short: `evals/<case>/prompt.md` (frontmatter fields such as `runs`,
`max_turns`, `timeout_seconds`, `allowed_tools`, `model`, `env` with `EVAL_*` keys only) plus
`evals/<case>/graders/<name>.md`. Grader types: `regex`, `tool_used`, `tool_order`, `file_exists`,
`llm` (2 of 3 judge votes), `baseline`. Graders can look at the last message, the trace, the list
of created files, or the contents of one file (an `llm` judge sees PNG/JPEG/GIF/WebP as images,
so a contact sheet of stills could be graded). Each run starts in an empty temp folder with only
read-only tools unless you pass `--allow-tools Bash Write Edit`. Every run is a real model call
that counts against usage. A `tool_used` grader with `tool: Skill` measures how often a skill
triggers.

## A12. Distribution notes

- The user already has a GitHub marketplace on this Mac: `guille-plugins` from
  `LGuillermoAngaritaG/claude-plugins` (it holds `colab-video-studio`, `diagrams`,
  `claudish-to-english`). A new plugin could be added there.
- Several video plugins ship one repo for many agents: `.claude-plugin/plugin.json`,
  `.codex-plugin/plugin.json`, `.cursor-plugin/plugin.json` (HyperFrames, Pika, Runway). Codex
  reads `.codex-plugin/plugin.json` with a `"skills": "./skills/"` key (from OpenAI's plugin
  quickstart, seen via search; I did not read the full OpenAI schema). Codex-specific skill
  metadata in `agents/openai.yaml` (seen in Remotion's repo) is **UNCONFIRMED** as an official
  format.
- `npx skills add <owner/repo>` (vercel-labs/skills, the tool behind skills.sh) installs skills,
  not plugins. For Claude Code it writes to `.claude/skills/` (project) or `~/.claude/skills/`
  (`-g`), by symlink by default. skills.sh ranks by install count.

## A13. Gotchas checklist for our plugin

1. Never write into `${CLAUDE_PLUGIN_ROOT}`. Copy templates out of it into the project.
2. Never put finished videos in `${CLAUDE_PLUGIN_DATA}`: uninstall deletes it.
3. Scripts must find their own folder; the Bash tool does not export `CLAUDE_PLUGIN_ROOT`.
4. Use full `${CLAUDE_PLUGIN_ROOT}/...` paths in `SKILL.md`; relative `scripts/x` resolves against
   the user's working folder, not the skill.
5. Bump `version` on every release, or omit it.
6. No `bin/` if the plugin should ever install in Cowork or claude.ai.
7. Do not name it `claude-...`.
8. Most important rules in the first lines of each `SKILL.md` (compaction keeps the first 5,000
   tokens).
9. Check scripts used in `` !`...` `` must exit 0 or end with `|| true`.
10. `userConfig` dialog does not show with `--plugin-dir`; use `/plugin configure`.
11. `validate` does not catch misspelled skill frontmatter keys.
12. Plugins in the project's `.claude/skills/` only load when the session starts at the repo root.

---

# Part B: Public skills and plugins for making videos with agents

Maintenance column: GitHub stars, last push date and license as reported by the GitHub API on
2026-10-14. "Active" means a push within the last month. Install counts from skills.sh are as shown
on the site on this date.

## B1. Overview table

| Project | Link | Kind | Maintenance | What it does |
|---|---|---|---|---|
| HeyGen HyperFrames | https://github.com/heygen-com/hyperframes | Claude Code plugin (in Anthropic's official marketplace) plus standalone skills; ~20 skills | 63.5k stars, pushed 2026-10-14, Apache-2.0. Very active. Top skills.sh entries (hyperframes-cli ~1.0M installs) | Videos as HTML compositions with seekable animation, rendered to MP4. Workflows: faceless explainer, product launch from a URL, PR to video, music to video, talking-head recut, slideshow, Remotion port |
| Remotion agent skills | https://github.com/remotion-dev/skills | Agent skills (`npx skills add remotion-dev/skills`) | 5.1k stars, pushed 2026-10-12, **no license file detected**. Official, active. remotion-best-practices ~617k installs | Best practices for Remotion React video: router skill plus create, markup, studio, render, captions, maps, multimedia, interactivity, docs, upgrade |
| browser-use video-use | https://github.com/browser-use/video-use | Single skill plus Python helpers; vendors a Manim sub-skill | 28.9k stars, pushed 2026-10-08, MIT. Active | Edit real footage by conversation: transcribe, cut on word boundaries, grade, overlays, burned subtitles |
| OpenMontage | https://github.com/calesthio/OpenMontage | Workspace repo (not a plugin): YAML pipelines, Markdown skills, Python tools, Remotion composer | 68.2k stars, pushed 2026-10-12, **AGPL-3.0** | 12 production pipelines (explainer, talking head, clip factory, documentary, localization...), quality gates, budget control, decision log |
| claude-code-video-toolkit | https://github.com/digitalsamba/claude-code-video-toolkit | Workspace repo with `.claude/skills` and `.claude/commands` | 2.2k stars, pushed 2026-10-12, MIT. Active | Remotion templates, voiceover, music, image gen on your own cloud GPU, `/video`, `/scene-review`, `/versions` |
| adithya-s-k manim_skill | https://github.com/adithya-s-k/manim_skill | 3 skills: manim-composer (planning), manimce-best-practices, manimgl-best-practices | 1.2k stars, pushed 2026-01-23, MIT. Not recently updated | 3Blue1Brown-style math animation; planning skill writes `scenes.md` |
| Yusuke710 manim-skill | https://github.com/Yusuke710/manim-skill | Claude Code plugin, one skill plus tools | 171 stars, pushed 2026-10-07, MIT. Active, small | Manim CE with local Kokoro TTS, subtitle lint, per-scene classes, a local video viewer |
| davila7 claude-code-templates (manim) | https://github.com/davila7/claude-code-templates | Large template collection | 32.6k stars, pushed 2026-10-14, MIT | Includes a Manim skill (listed on skills.sh). Not inspected in detail |
| Runway skills | https://github.com/runwayml/skills | Claude Code plugin (in official marketplace), `uv run` scripts | 73 stars, pushed 2026-10-14, MIT. Active, official | Generate video, image, audio through the Runway API; model routing table with credit costs |
| Pika plugins | https://github.com/Pika-Labs/Pika-Plugins | Claude Code plugin with an MCP server | 40 stars, pushed 2026-07-20, Apache-2.0. Official | `/pika:ugc-ads`, explainer, podcast, etc. through hosted tools; cost gate before paid calls |
| fal-ai-community skills | https://github.com/fal-ai-community/skills | Agent skills | 251 stars, pushed 2026-09-29, no license detected | fal.ai model catalog, prompting, recipes, UGC, commercial, storytelling, cinematography |
| Arcads skills | https://github.com/krusemediallc/arcads-claude-code | Skills plus prompting library | 1.6k stars, pushed 2026-09-22, MIT | AI marketing videos through the Arcads API |
| UGC-Factory | https://github.com/charlesdove977/UGC-Factory | Single skill plus 15 style folders | 85 stars, pushed 2026-06-29, MIT | UGC ad pipeline on Higgsfield and Seedance, stitched with ffmpeg |
| everything-claude-code (ECC) | https://github.com/affaan-m/ECC | Huge general skill collection | 279k stars, pushed 2026-10-12, MIT | Contains `video-editing` and `fal-ai-media` skills among many others. Not inspected in detail |
| ffmpeg skills | e.g. https://github.com/TerminalSkills/skills (167 stars, active, Apache-2.0); https://github.com/ychoi-kr/claude-ffmpeg-skill (57 stars, last push 2025-10, MIT); https://github.com/JosiahSiegel/claude-plugin-marketplace (59 stars, last push 2026-06) | Reference-style skills | Mostly small; no clear leader | ffmpeg recipes: convert, trim, concat, subtitles, loudness, GIFs |
| short-video-maker | https://github.com/gyoridavid/short-video-maker | MCP server plus REST API | 1.4k stars, **last push 2025-06-21** (stale) | Shorts from text with TTS, captions, stock footage |
| outscal video-generator | https://github.com/outscal/video-generator | Skills | 68 stars, last push 2026-04-21, no license | Shorts script and video generation. Not inspected |

Repos I looked for but could not find on GitHub (search results named them): the faceless shorts
creator from learnwithhasan.com, and `Mayank8290/openclaw-video-skills`. Both **UNCONFIRMED**.

## B2. HeyGen HyperFrames (most to learn from)

Structure:
- Four manifests in one repo: `.claude-plugin/plugin.json` (plus `marketplace.json` with two
  entries: the full bundle and a "core-skills" subset that lists `skills` paths), `.codex-plugin`,
  `.cursor-plugin`, and a root `plugin.json` with an `agent-plugins.org` schema.
- `version` is set and bumped every release (0.8.157 today).
- A router skill `hyperframes` whose description says it is the mandatory entry point for any video
  request. It decides by **project state first** (existing project, specific edit, `BRIEF.md`
  exists, resume, fresh creation), and only then by intent.
- Workflow skills (`faceless-explainer`, `product-launch-video`, `pr-to-video`, ...) each with
  `references/`, `scripts/` (Node `.mjs` with `.test.mjs` next to them), and `sub-agents/` prompts.
- Shared domain skills (`hyperframes-core`, `-animation`, `-creative`, `-audio`, `-cli`,
  `media-use`). Workflows reference each other with `../other-skill/...` paths.

Ideas worth copying:
- **Plugin-aware mode.** A reference file tells the skill to look two levels up for a manifest. If
  found, it is a plugin install: do not self-update, call the CLI through a launcher script pinned
  to the plugin's version, run in the user's project, and treat the plugin folder as read-only.
- **Numbered steps with explicit gates.** Each step names its output file and a gate ("`frame.md`
  exists and the build script exited 0") before the next step may start.
- **Durable brief.** `BRIEF.md` is written right after setup; on resume the skill reads it and asks
  nothing. A half-built project is resumed, never re-interviewed.
- **Collaborative vs autonomous mode**, decided from the brief. Same gates, but in autonomous mode
  the approval points become heads-up summaries.
- **Deterministic scripts for the boring parts**: build the design spec from a preset, sync scene
  durations to real voice durations (and forbid editing the synced values by hand), build captions, assemble
  the index, inject transitions, then `lint`, `check`, and a `snapshot` contact sheet.
- **Named false positives.** The skill lists a known checker warning (1-4 px caption overflow) and
  says not to chase it. Our `stills.mjs` reports could use the same pattern.
- **One sub-agent per frame**, each given a bounded "packet" (only its storyboard block plus the
  rules it cites), and workers may only write their own output file.
- **Search before inventing**: check the catalog of existing blocks before hand-building a named
  look.
- **Voice choice is explicit**: if the user names a voice or gender, pass it; otherwise use the
  remembered preference, then the default, and say which one was used. Offline fallback uses
  Kokoro (same engine as our project).
- Usage check at the start and at milestones; report "unknown" instead of guessing.

## B3. Remotion agent skills (official)

Structure: one router `remotion-best-practices` whose body is a list of "if X, load
[file](./sub/REFERENCE.md)" lines, plus the same topics as standalone skills
(`remotion-create`, `remotion-markup`, `remotion-render`, ...). A sync script generates both
copies from one source. Each topic folder holds many small focused files (`timing.md`,
`audio.md`, `voiceover.md`, `transitions.md`, `measuring-text.md`, `sfx.md`, ...). Frontmatter
carries a `version` key (not a Claude Code field; ignored).

Ideas worth copying:
- **Preserve user changes**: if the code changed unexpectedly between turns, assume the user did it
  and do not overwrite.
- **Do not render unless asked**; open the live preview (Studio) early and keep it open so the user
  can steer.
- For checks, render a few frames as stills in one call:
  `npx remotion render <id> out/frames --frames=0,30,90 --image-format=png`.
- Rules that prevent silent render bugs: drive all animation from `useCurrentFrame()` and
  `interpolate()`, never CSS transitions or Tailwind animation classes; take `fps` from
  `useVideoConfig()` for every seconds-to-frames value; premount timed media one second early.
- Router plus small topic files keeps each load small.

License caveat: no license file was detected, so copy ideas, not text.

## B4. browser-use video-use

Ideas worth copying:
- **Hard rules vs worked examples.** A short numbered list of non-negotiable correctness rules
  (e.g. subtitles last in the filter chain, 30 ms audio fades at every cut, never cut inside a
  word, pad cuts 30-200 ms, cache transcripts per source). Everything else is labeled as an
  example the agent may change.
- **Ask, confirm, execute, iterate, persist.** A 4-8 sentence plan is proposed and confirmed before
  any cut.
- **Self-eval before showing**: filmstrip plus waveform images around every cut in the *rendered*
  output, first and last 2 seconds, a few mid points, `ffprobe` duration against the plan.
- **Measure audio instead of assuming**: `ffmpeg -af ebur128=peak=true` for loudness and true peak,
  and say plainly that the agent cannot listen and is reporting numbers. This maps directly onto
  our "nobody has listened yet" report rule.
- **Critic sub-agent** for anything published: asked to roast, with ranked problems and timecodes.
- **Cap self-eval at 3 passes**, then report remaining issues to the user.
- A per-project `project.md` memory, appended each session.
- Parallel sub-agents for independent animation slots.

## B5. OpenMontage

A large workspace (AGPL-3.0: **do not copy code** into a differently licensed plugin; ideas only).
Ideas worth copying:
- Pipelines as **YAML manifests** (stages, tools, review criteria, success gates) plus a Markdown
  "stage director" skill per pipeline. The agent is the orchestrator; Python only provides tools.
- **JSON Schemas for every artifact** (brief, script, scene plan, edit decisions, render report,
  final review) so a script can validate a plan before rendering.
- **Pre-compose gate** that blocks a render when the plan breaks its promise, including a
  "slideshow risk" score (repetition, decorative visuals, weak motion, text overuse).
- **Post-render review**: ffprobe, frames at 4 positions checked for black frames and broken
  overlays, audio checked for silence and clipping, subtitles present.
- Decision log with alternatives and reasons; budget estimate before paid calls.

## B6. claude-code-video-toolkit (Digital Samba)

Ideas worth copying:
- **Render baseline test**: a fixed composition covering easing, sequences, text, video, audio,
  transitions and shared components is rendered as stills before and after a dependency bump, then
  pixel-diffed. No golden images are stored, so machine differences give no false positives. CI
  posts the diff on the PR. A good way to protect the shared engine when Remotion is upgraded.
- `/scene-review`: walk scene by scene in Studio with Approve / Adjust / Refine / Flag / Skip
  before voiceover is generated.
- Brands as data folders (`brands/<name>/`), templates as full projects.

## B7. Manim skills

- **adithya-s-k/manim_skill**: a separate planning skill (`manim-composer`) that researches, asks a
  few audience and scope questions, and writes a `scenes.md` with hook, key insight, and per-scene
  purpose and duration, *before* any code. Implementation lives in separate CE and GL skills with
  `rules/`, `templates/` and `examples/`. Its `tests/` extract and render the code examples from the
  skill docs in parallel, so the docs cannot rot. Good idea for our `references/`.
- **Yusuke710/manim-skill**: a clear contract at the top (keep going until the final MP4 exists, or
  name the exact blocker), narration written first, local Kokoro TTS producing
  `timestamps.json` that the code must read before writing animation timing, one class per scene
  for selective re-render, low-resolution iteration defaults (854x480 at 15 fps), and a subtitle
  linter. Its plugin manifest's `repository` field points to a different repo name than the one it
  lives in (minor).

## B8. Generative-AI ad and media plugins (Runway, Pika, fal, Arcads, UGC-Factory)

These call paid hosted models, so they are less relevant to a local-only pipeline. Ideas that
still apply:
- **Cost or usage gate before expensive steps** (Pika: show balance and estimate, wait for an
  explicit "proceed"). For us: before Codex art generation for many frames, state how many images
  will be generated.
- **Model routing table** that maps user words ("fast", "cheap", "cinematic") to a default choice
  (Runway).
- Preflight section: check the tool exists (`command -v uv`) and the key is set, and never pass
  secrets as CLI flags (Runway).
- Style folders as data (UGC-Factory's 15 genre folders), selected by a routing reference.

Pitfall seen: the Runway `rw-generate-video` skill tells Claude to run from the user's working
folder and calls `uv run scripts/generate_video.py`, but the scripts sit at the plugin root. In
Claude Code that relative path would not resolve from the user's folder. My reading; I did not run
it. The fix is a `${CLAUDE_PLUGIN_ROOT}/scripts/...` path.

## B9. Faceless video and shorts generators

- HyperFrames `faceless-explainer` is the strongest maintained example (see B2).
- `short-video-maker` (MCP, 1.4k stars) has not been pushed since 2025-06; treat as unmaintained.
- Other "faceless shorts" skills found on registries (EachLabs, muapi/SamurAIGPT with 6 stars,
  outscal) are small, wrap paid APIs, or could not be located on GitHub. A registry listing for the
  muapi shorts skill mentioned security-audit warnings (seen in search results only;
  **UNCONFIRMED**).

## B10. Ranked list of what to copy into our plugin

1. Router skill that reads project state first (resume vs new vs edit), then routes to math,
   sketch, story or podcast. (HyperFrames, Remotion)
2. Numbered steps, each with a named output file and a gate, and a short "hard rules" list at the
   top of each `SKILL.md`. (HyperFrames, video-use)
3. Durable brief file written once, read on resume. (HyperFrames)
4. Scripts own the deterministic parts: duration sync from real TTS timing, captions, assembly,
   stills sheet, loudness numbers. (HyperFrames, video-use, Yusuke710)
5. Self-eval before reporting: contact sheet, cut-boundary frames, `ebur128` loudness, `ffprobe`
   duration, max 3 fix passes, then report what is left. (video-use, OpenMontage)
6. Named known false positives in the checker output. (HyperFrames)
7. Plugin folder read-only; outputs in the project; caches in `${CLAUDE_PLUGIN_DATA}`.
   (docs, HyperFrames, video-use)
8. Render baseline A/B when the shared engine or Remotion version changes. (claude-code-video-toolkit)
9. Tests that run every code example in the references. (adithya-s-k/manim_skill)
10. `claude plugin eval` cases with `file_exists` and `llm` graders on a stills contact sheet.
    (docs)

---

# UNCONFIRMED items

- Whether Remotion needs an install-time script, which would break under the plugin
  auto-install's `--ignore-scripts`.
- `agents/openai.yaml` as an official Codex skill metadata file (seen in Remotion's repo and a
  third-party guide only).
- Full schema of `.codex-plugin/plugin.json` beyond `name`, `version`, `description`, `skills`
  (HyperFrames also uses `interface` and `keywords`).
- Runtime substitution of `${CLAUDE_PLUGIN_ROOT}`, `${CLAUDE_SKILL_DIR}`, `${user_config.*}` in a
  plugin skill: documented, but my headless test could not run (expired OAuth in this subagent).
- That Runway's relative `scripts/...` path fails from the user's folder (reasoned from the docs,
  not run).
- The learnwithhasan faceless shorts repo and `Mayank8290/openclaw-video-skills` (named in search
  results, not found on GitHub).
- Security-audit warnings on the muapi skills (registry listing seen via search only).
- skills.sh install counts are as displayed on the site; I did not check how they are counted.

---

# Sources

Official Claude Code docs (fetched 2026-10-14)
- Plugin manifest reference: https://code.claude.com/docs/en/plugins/manifest-reference (also served at https://code.claude.com/docs/en/plugins-reference)
- Add components to a plugin: https://code.claude.com/docs/en/plugins/components
- Plugin loading reference: https://code.claude.com/docs/en/plugins/loading
- Plugin commands reference: https://code.claude.com/docs/en/plugins/cli-reference
- Create a plugin: https://code.claude.com/docs/en/plugins/create
- Publish and distribute a plugin: https://code.claude.com/docs/en/plugins/publish
- Troubleshoot plugins: https://code.claude.com/docs/en/plugins/troubleshooting
- Test plugins with evals: https://code.claude.com/docs/en/plugin-evals
- Extend Claude with skills: https://code.claude.com/docs/en/skills
- Docs index: https://code.claude.com/docs/llms.txt

Anthropic and Agent Skills guidance
- Skill authoring best practices: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices
- Agent Skills overview: https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview
- Agent Skills specification: https://agentskills.io/specification
- Best practices for skill creators: https://agentskills.io/skill-creation/best-practices
- Using scripts in skills: https://agentskills.io/skill-creation/using-scripts
- Optimizing skill descriptions: https://agentskills.io/skill-creation/optimizing-descriptions
- skill-creator skill: https://github.com/anthropics/skills/blob/main/skills/skill-creator/SKILL.md
- Official plugin marketplace (lists hyperframes, runway-api, plugin-dev, skill-creator): https://github.com/anthropics/claude-plugins-official
- OpenAI Codex plugin quickstart (via search): https://developers.openai.com/plugins/quickstart
- skills CLI (skills.sh): https://github.com/vercel-labs/skills and https://skills.sh

Video skills and plugins (GitHub API metadata and files read 2026-10-14)
- https://github.com/heygen-com/hyperframes (plugin manifests, `skills/hyperframes/SKILL.md`, `skills/hyperframes/references/plugin-installation.md`, `skills/faceless-explainer/SKILL.md`)
- https://github.com/remotion-dev/skills (README, `remotion-best-practices/SKILL.md`, `remotion-render/REFERENCE.md`, `remotion-markup/REFERENCE.md`); docs https://www.remotion.dev/docs/ai/skills
- https://github.com/browser-use/video-use (`SKILL.md`)
- https://github.com/calesthio/OpenMontage (README)
- https://github.com/digitalsamba/claude-code-video-toolkit (README, `.claude/commands/scene-review.md`, `tests/render-baseline/README.md`)
- https://github.com/adithya-s-k/manim_skill (`manim-composer/SKILL.md`, `tests/README.md`)
- https://github.com/Yusuke710/manim-skill (`plugin.json`, `SKILL.md`)
- https://github.com/runwayml/skills (`plugin.json`, `rw-generate-video/SKILL.md`)
- https://github.com/Pika-Labs/Pika-Plugins (`plugin.json`, `ugc-ads/SKILL.md`)
- https://github.com/fal-ai-community/skills (file tree)
- https://github.com/charlesdove977/UGC-Factory (file tree)
- https://github.com/krusemediallc/arcads-claude-code (metadata)
- https://github.com/davila7/claude-code-templates, https://github.com/affaan-m/ECC (metadata)
- https://github.com/TerminalSkills/skills, https://github.com/ychoi-kr/claude-ffmpeg-skill, https://github.com/JosiahSiegel/claude-plugin-marketplace (metadata)
- https://github.com/gyoridavid/short-video-maker, https://github.com/outscal/video-generator, https://github.com/SamurAIGPT/Generative-Media-Skills, https://github.com/eachlabs/skills (metadata)

Secondary sources used only to find repos (not relied on for facts)
- https://claudemarketplaces.com (HyperFrames, video-use, muapi listings)
- https://mer.vin/2026/05/remotion-agent-skills-install-remotion-dev-skills-for-claude-code-and-cursor/
- https://learnwithhasan.com/guide/how-to-make-faceless-youtube-shorts-with-claude-code/
- https://www.vibeindex.ai/skills/calesthio/openmontage/ffmpeg
- https://codex.danielvaughan.com/2026/04/01/codex-plugins-skills-mcp-authoring
