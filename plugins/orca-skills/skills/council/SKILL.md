---
name: council
description: Ask the same question to a council of models (default Claude Fable 5.2, GPT 6.2 Astra via Codex, Gemini 4 Neon via Antigravity; members, agents, models and efforts set in council.conf) as Orca orchestration workers nested under this session, then compare and synthesize their answers here. Use on /council, "ask the council", "ask the three models", "get a second and third opinion", "brainstorm with fable, astra and gemini", or when the user wants independent views on scoping, design, naming, or a hard question before deciding.
---

# Council

Independent answers from a council of models, then one synthesis written by you.
The members run as Orca orchestration workers in the current workspace, so they show up nested under this session in Orca's sidebar, and Orca wakes you when each reports back.
Requires the `orca` CLI with the Orca app running, and every agent named in the council (`orca agent installed`).

## The council

`<skill dir>` below is this skill's base directory. Members live in the council file, one per line: `name agent model effort` (`-` effort = model default; `#` comments out a member). Any number of members works.

The council file is `~/.claude/orca-skills/council.conf` when it exists, else the bundled `<skill dir>/council.conf` (the defaults; never edit it, plugin updates replace it).

- **Permanent change** ("add Opus to the council", "use xhigh for astra"): edit `~/.claude/orca-skills/council.conf`; if it does not exist yet, copy the bundled file there first.
- **One run only** ("just ask fable and gemini", "use low effort this time"): write a council file in the scratchpad, `<scratchpad>/council-<slug>/council.conf`, and pass it as the third argument to `start.sh`.

Finding model IDs: `agy models` (Antigravity), `~/.codex/config.toml` and Codex's model list, the Claude model list. Effort values: low, medium, high, xhigh, max (not every model takes every value).

## 0. Choose the members (every new topic)

Unless the user already named the members (or said "default council") in this request, **ask before starting anything**. Read the council file, then call AskUserQuestion with one multiSelect question, "Which members should sit on the council for this topic?", with one option per member from the file (label = name, description = `agent / model / effort`). The user can pick any subset, or use "Other" to add a member or change a model or effort.

- Selection equals the full file: run with the council file as is.
- Subset or changes: write `<scratchpad>/council-<slug>/council.conf` with just those lines and pass it to `start.sh`. Edit `~/.claude/orca-skills/council.conf` only if the user says the change is permanent.
- A member described loosely ("add Opus at max"): resolve the agent and model ID yourself (see above) and say which line you used.

Do not ask again for follow-ups on the same topic; the members stay as they are.

## 1. Write the spec

Pick a short kebab-case slug for the topic (e.g. `launch-features`); tabs are named `<slug>-<member name>`.

Write the spec with your file tool (no heredocs) to `<scratchpad>/council-<slug>/spec.md`:

```
<the user's question, word for word>

<context the agents need and cannot see: constraints, decisions already made,
file paths worth reading. Keep it short; they can read the repo themselves.>

Rules:
- Give your own independent view. Do not ask clarifying questions; state assumptions instead.
- Read files if useful, but do not edit, create or delete files, and do not run commands that change state.
- End with: Recommendation, Key assumptions, Risks, Open questions.

Deliverable: your full answer as the worker_done report body (not a summary of it).
```

Every member gets the identical spec. Do not tailor it per model.

## 2. Start the workers

```bash
sh <skill dir>/scripts/start.sh <scratchpad>/council-<slug>/spec.md <slug> [<council file>]
```

Run it from the workspace the agents should read (it uses `--worktree current`). It starts all members in one go and prints each receipt. Read every receipt: follow any `next`; if a start failed, do not rerun it, read `failedStage` and check `orca orchestration worker-list --environment local`. Note each dispatch ID.

Then **end your turn**. Do not poll. Orca wakes you with each `worker_done`.

## 3. Collect

Each wake carries a worker's report. If a report is cut short or only a summary, read the full output with `orca orchestration worker-read --dispatch <dispatch_id>`. An `escalation` with `stopReason: finished` usually means the member answered but skipped `worker_done` (seen with Codex at lower effort): read its answer with `orca orchestration worker-read --dispatch <dispatch_id>` and use it as its report. Wait until all members have settled (or one escalated; see the orchestration skill for `lost`/`exited`) before synthesizing.

`start.sh` saves the dispatch IDs to `<scratchpad>/council-<slug>/dispatches.txt`. Workers are started with `--keep-open`, so they never close on their own.

## Follow-ups: reuse the same workers

While the user stays on the same topic, **never start new workers and never close the old ones**. Every follow-up goes to the same chats, so they keep their context and prompt cache.

1. Write the follow-up to `<scratchpad>/council-<slug>/followup-<n>.md`: the user's follow-up word for word, any new context, and the same rules and Deliverable lines as the spec.
2. Send it to every member:
   ```bash
   sh <skill dir>/scripts/followup.sh <scratchpad>/council-<slug>/dispatches.txt <scratchpad>/council-<slug>/followup-<n>.md "<short subject>"
   ```
   Orca gives each follow-up a new dispatch ID in the same chat; the script rewrites `dispatches.txt` with them, so always use the file, not IDs from earlier messages.
3. End your turn. Each worker answers with a new `worker_done`; synthesize again as in step 4, focused on what changed.

Treat any message from the user that builds on the current brainstorm as a follow-up, even without the word "follow-up".

## Closing

Close the workers only when the user moves to a different brainstorm topic (or asks to close them):

```bash
sh <skill dir>/scripts/close.sh <scratchpad>/council-<slug>/dispatches.txt
```

If a member still reports `retained` (seen for kept-open chats that took a follow-up), Orca's CLI cannot close it: tell the user which tabs to close by hand. Then start fresh workers for the new topic with a new slug. If unsure whether a message is a new topic, ask.

## 4. Synthesize

Read every reply in full. Then answer the user with:

1. **Answer / recommendation** first: your synthesis, not a vote count.
2. **Where they agree**: consensus points.
3. **Where they disagree**: the real positions and why they differ (assumptions, priorities). Say which side you take and why.
4. **Unique ideas**: worthwhile points only one model raised, credited by name.
5. **Weak spots**: claims that look wrong or unverified; check against the repo when cheap.
6. Which workers failed or timed out, if any.

Do the user's actual task (scope, plan, decision, list) with the members' replies as input. Do not just paste one summary per member.

## Notes

- If a member's model stops working, fix its line in `~/.claude/orca-skills/council.conf`.
- Cost: one full agent run per member plus your synthesis per call. Keep the council small (3-4).
- The no-edit rule is only an instruction. Check `git status` afterwards when the workers ran in a repo.
- Codex may log "hook approval required" errors from its own plugins; they do not block the reply.
