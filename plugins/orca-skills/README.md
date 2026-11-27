# orca-skills

Two skills that run other agents as Orca orchestration workers. The workers show up nested under your session in Orca's sidebar, and Orca wakes your session when each one reports. Nothing polls.

```
/plugin install orca-skills --marketplace LGuillermoAngaritaG/claude-plugins
```

## council

`/council <question>` asks the same question to several models in parallel, then writes one synthesis: the recommendation, where they agree, where they disagree and why, ideas only one of them had, and claims that look wrong.

- Before each new topic it asks which members should sit on the council, unless you named them.
- The member chats stay open while you stay on the topic. Follow-ups go to the same chats, so they keep their context and prompt cache.
- Before a repo question it names the commit under review, warns about uncommitted changes and says if the checkout is behind its remote.
- It checks every member claim it uses against the code, lists what it corrected or could not verify, and has one member critique the draft before you see the final.
- Test runs are opt-in: on request each member gets its own detached copy of the repo to run tests in, removed when the topic closes.
- Chats close only when you move to a new topic. Orca's CLI cannot close every kept-open chat; the skill tells you which tabs to close by hand.

Default members:

| Name | Agent | Model | Effort |
| --- | --- | --- | --- |
| fable | claude | claude-fable-5-2 | high |
| astra | codex | gpt-6.2-astra | high |
| gemini | antigravity | gemini-4-neon | high |

## director

`/director <job>` makes your session a director: it plans, delegates, judges and reports, and never edits files itself.

0. It checks the starting point (commit, uncommitted changes, behind remote) and, for split or large jobs, shows the plan and waits for your OK.
1. A worker does the job from a brief with goal, in and out of scope, allowed paths and a checkable definition of done, plus the worker rules (your commit, test and safety rules, which non-Claude agents never see otherwise). The director checks the changed files against the allowed paths. Code changes always happen in a child worktree; research and scouting run in your workspace. One worker by default, several only for independent parts.
2. Any code change goes to a reviewer from another model family. It runs the checks, reports what it ran and did not run, findings with severity, and what it found fine. It does not edit.
3. The director marks each finding needed, not needed or follow-up, with a reason. Needed fixes go back to the same worker; the same reviewer marks each fixed or not and re-reviews the whole diff for new problems. At most 2 rounds, then it asks you. Out-of-scope findings come back to you as follow-ups.
4. When the review passes, the worker commits (no co-author lines, no emojis) and the done-checks run again on that exact commit. The director merges the branch into your current branch, unless the merge would touch your uncommitted changes, and removes the child worktree and its merged branch.
5. Pull requests and pushes only when you ask. Work that stops unmerged is saved under `refs/director/<slug>/...` before anything is removed.

Default roles:

| Role | Agent | Model | Effort |
| --- | --- | --- | --- |
| worker | codex | gpt-6.2-sol | high |
| reviewer | claude | claude-opus-5-5 | xhigh |

## Configuration

The defaults ship inside the plugin and are replaced on updates. To change them for good, copy them to `~/.claude/orca-skills/` and edit the copies; the skills read those first:

```bash
mkdir -p ~/.claude/orca-skills
cp <plugin dir>/skills/council/council.conf <plugin dir>/skills/director/director.conf ~/.claude/orca-skills/
```

`worker-rules.md` (in the director skill folder) is pasted into every worker and reviewer brief; copy it to `~/.claude/orca-skills/worker-rules.md` to change it.

Each line is `name-or-role agent model effort`. Effort is `low`, `medium`, `high`, `xhigh`, `max`, or `-` for the model default. `#` comments a line out. You can also just ask the skill to change a member, for one run or permanently.

Find model IDs with `orca agent installed`, `agy models` (Antigravity), `~/.codex/config.toml` and the Claude model list.

## Needs

- The Orca app running, with its `orca` CLI on the PATH.
- The agents you configure installed in Orca (Claude, Codex and Antigravity for the defaults).
- `python3` and a POSIX shell.

## Known limits

- The "do not edit" rule for council members and reviewers is an instruction, not a sandbox. Check `git status` after a run.
- Codex sometimes ends a turn without the formal report. Orca raises an escalation; the skills read the answer and use it.
- Codex may log "hook approval required" errors from its own plugins. They do not block it.
