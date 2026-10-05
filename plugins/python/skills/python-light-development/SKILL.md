---
name: python-light-development
description: Use this skill whenever the user asks to create, scaffold, extend, or add code to a lightweight Python project — including new apps, FastAPI services, CLIs, scripts, MCP servers, LLM tools, or any small-to-medium Python codebase. Trigger on phrases like "create a Python app", "scaffold a project", "build a small FastAPI", "write a script", "add a module", "add an endpoint", "connect to X API", "add a new feature", or any request to start or grow a Python project that should stay flat and simple. Also trigger when the user mentions wanting a lightweight structure, pydantic, pydantic-settings, uv, or a single facade entry point. This is the default skill for Python development unless the user explicitly asks for the heavier core/services/modules layered architecture.
---

# Python Light Development

Lightweight Python projects: flat `src/`, pydantic everywhere, `uv` for deps. Use for both new projects and adding to existing ones.

## Layout

```
project/
├── src/
│   ├── core.py         # Facade — orchestrates modules, public surface
│   ├── config.py       # pydantic-settings
│   ├── schemas.py      # all pydantic models
│   ├── <name>.py       # one class per module (internal logic OR external connection)
│   ├── utils.py        # general pure-function helpers
│   └── utils_<name>.py # split out only when utils.py grows or helpers tie to one module
├── tests/              # mirror src/ filenames as test_<name>.py
├── main.py             # deployment shell: FastAPI, CLI, MCP, or script
├── pyproject.toml
└── .env.example
```

Flat means flat — no nested folders under `src/`. Modules are named for what they do (`database.py`, `openai.py`, `pricing.py`), never with a `module` prefix or suffix.

## Where things go

- External connection (API, DB, LLM, S3) → new `src/<name>.py`
- Internal logic → new `src/<name>.py`
- Pure helper functions → `src/utils.py`, or `src/utils_<name>.py` once it's too big
- Pydantic models → `src/schemas.py` (single file)
- Env vars / secrets → `src/config.py` via `pydantic-settings`
- Wiring + public methods → `src/core.py`
- Deployment entry → `main.py` at project root
- Tests → `tests/test_<same_name>.py`

Inspect the existing project before adding anything.

## Rules

- **OOP for modules and core.** Each `src/<name>.py` (excluding schemas, config, utils) defines one class. `core.py` defines the facade class. Utilities are plain functions.
- **Dependencies via `__init__`.** Modules receive other modules and config values explicitly. No globals.
- **Pydantic at boundaries.** Every public `core` method takes a schema in and returns a schema out. Always use pydantic with LLMs.
- **`pydantic-settings` for config.** Only env-dependent things (keys, URLs, secrets) belong in `Config`. Constants like timeouts and page sizes stay as module-level constants where they're used. Keep `.env.example` in sync.
- **`core.py` is thin.** It instantiates modules and orchestrates — it doesn't implement business logic itself.
- **No premature abstraction.** No base classes, protocols, or interfaces unless there are actually multiple implementations.
- **`uv` for everything.** `uv init`, `uv add <pkg>`, `uv add --dev <pkg>`. Never edit `pyproject.toml` deps by hand, never fall back to pip/venv.
- **Type hints on every signature.** Minimal `:param` / `:returns:` docstrings on public classes and methods.

## Scaffolding

```bash
uv init <project>
cd <project>
uv add pydantic pydantic-settings
uv add --dev pytest
mkdir -p src tests
touch src/{core,config,schemas,utils}.py tests/test_core.py main.py .env.example
```

Then fill in `config.py` (pydantic-settings), `schemas.py` (inputs/outputs), `core.py` (facade class), and `main.py` (FastAPI / CLI / script — whatever the project needs). Add `src/<name>.py` modules as the project grows.
