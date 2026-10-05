---
name: python-scaffold
description: Use this skill whenever the user asks to create a new Python application, FastAPI app, backend service, API project, Lambda function, or any Python project that needs a clean architecture. Trigger on phrases like "create an app", "build a FastAPI", "new Python project", "scaffold a backend", "new API", "build me a service", or any request to start a Python project from scratch. This skill is ONLY for initial project setup — not for modifying existing projects. Also trigger when the user mentions wanting clean architecture, service layers, dependency injection, or hexagonal architecture in Python.
---

# Python Scaffold Skill

Create the initial structure for a new Python project using `uv`. This skill handles **only the project setup** — after the skeleton is in place, read the **python-development** skill for how to write the actual code.

## Project Structure

```
<project-name>/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI entrypoint (or Lambda handler, CLI, etc.)
│   ├── core/
│   │   ├── __init__.py
│   │   ├── <app_name>.py    # Facade — the application's public interface
│   │   └── settings.py      # Pydantic BaseSettings for env vars
│   ├── services/
│   │   ├── __init__.py
│   │   └── <service_name>/
│   │       ├── __init__.py
│   │       ├── base.py      # Abstract base class defining the service contract
│   │       └── <impl>.py    # Concrete implementation inheriting from base
│   ├── modules/
│   │   ├── __init__.py
│   │   └── <module_name>.py # Business logic wiring services together
│   └── schemas/
│       ├── __init__.py
│       └── <schema_name>.py # Pydantic models for inputs/outputs
├── tests/
│   ├── __init__.py
│   ├── conftest.py           # Env var validation before any test runs
│   └── test_<app_name>.py    # Real integration tests (no mocks)
├── pyproject.toml            # Managed by uv
├── .env.example              # Template for required env vars
├── .python-version
└── README.md
```

## Step-by-step scaffold process

Follow these steps in order. Use bash for all folder and file creation.

### 1. Initialize with uv and create the full directory tree via bash

Run a single bash block: `uv init`, remove the default `main.py`, create all directories, and touch all `__init__.py` files. Adapt service folder names to whatever the user described.

```bash
# Example for a project called "backend" with services "database" and "openai_api"
mkdir backend && cd backend
uv init
rm main.py

# Create directory tree
mkdir -p app/core app/services/database app/services/openai_api app/modules app/schemas tests

# Create all __init__.py files
touch app/__init__.py \
      app/core/__init__.py \
      app/services/__init__.py \
      app/services/database/__init__.py \
      app/services/openai_api/__init__.py \
      app/modules/__init__.py \
      app/schemas/__init__.py \
      tests/__init__.py
```

Do this in one bash invocation.

### 2. Add dependencies via bash

```bash
cd <project-name>
uv add fastapi uvicorn pydantic-settings
uv add --dev pytest
```

Only add what the user actually needs. If they mention a database, add the driver. If they mention an external API, add `httpx`. Keep it minimal.

### 3. Create `.env.example`

List every environment variable the app will need with placeholder values.

### 4. Write the code

**Read the python-development skill now.** Follow its patterns to write all the project files: settings, services (with base classes), modules, schemas, the core facade, `main.py`, and tests. The python-development skill has the architecture rules, code examples, and conventions for each layer.

### 5. Write the README

The README should include:

1. **Project name and one-line description**
2. **Folder structure** — the tree above, customized to the actual project
3. **Setup instructions** — how to install deps with `uv`, set env vars, and run
4. **How to run tests** — `uv run pytest`
5. **Architecture notes** — brief explanation of core/services/modules/schemas pattern
