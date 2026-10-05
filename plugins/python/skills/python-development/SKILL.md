---
name: python-development
description: Use this skill whenever the user asks to add functionality, endpoints, scripts, services, modules, or any code to an existing Python project that follows the core/services/modules/schemas architecture. Trigger on phrases like "add an endpoint", "create a new service", "add a module", "write a script", "add functionality", "new feature", "connect to X API", "add database support", or any request to write Python code in an existing project. Also trigger when the user asks to modify, extend, or refactor code in a project using this layered architecture. This skill defines how code should be written — the scaffold skill handles project creation.
---

# Python Development Skill

This skill defines the architecture, patterns, and conventions for writing Python code in projects that follow the core/services/modules/schemas structure. Use it whenever adding or modifying functionality in an existing project.

## Architecture Overview

```
app/
├── core/          # Facade (entry point) + settings
├── services/      # External connections (APIs, databases, etc.)
├── modules/       # Business logic wiring services together
└── schemas/       # Pydantic input/output models
tests/             # Real integration tests
```

The key idea: **core** depends on **modules**, modules depend on **services** (via base classes), and **schemas** define the data contracts at the boundary. Nothing flows backwards.

## Where to put things

When the user asks you to add something, figure out which layer it belongs to:

- **"Connect to X API / database / external thing"** → new service under `app/services/<name>/` with `base.py` + implementation
- **"Add logic that combines services"** → new module under `app/modules/<name>.py`
- **"Add an endpoint / route"** → add to `app/main.py` (or a router), wire it through the core facade
- **"Add input/output validation"** → new schema under `app/schemas/<name>.py`
- **"Add a new env var / secret"** → add to `app/core/settings.py`
- **"Add a standalone script"** → can go in `app/core/` if it's a new facade method, or as a new entrypoint alongside `main.py`

Always read the existing project structure first before writing code. Understand what's already there so you don't duplicate or break things.

## Adding a new service

Every external connection gets its own folder under `app/services/`. Always create two files:

1. **`base.py`** — abstract base class defining the contract. The rest of the app only imports this.
2. **`<implementation>.py`** — concrete class inheriting from the base.

```bash
mkdir -p app/services/<service_name>
touch app/services/<service_name>/__init__.py
```

```python
# app/services/<service_name>/base.py
from abc import ABC, abstractmethod


class <ServiceName>Base(ABC):
    """Contract for <service_name> operations.

    :param <relevant_param>: Description.
    """

    @abstractmethod
    def <method>(self) -> <return_type>:
        """Description.

        :returns: What it returns.
        """
        ...
```

```python
# app/services/<service_name>/<implementation>.py
from app.services.<service_name>.base import <ServiceName>Base


class <ConcreteService>(<ServiceName>Base):
    """<Provider> implementation of <service_name>.

    :param <relevant_param>: Description.
    """

    def __init__(self, <params>) -> None:
        ...

    def <method>(self) -> <return_type>:
        """Description.

        :returns: What it returns.
        """
        ...
```

If the service needs credentials or connection strings, add them to `app/core/settings.py` using Pydantic `BaseSettings`. Only add env vars that are genuinely secrets or connection details — non-sensitive config (timeouts, page sizes) can be constants in the service file.

## Adding a new module

Modules live in `app/modules/` as single files. They contain business logic and receive service **base classes** in their `__init__` — never concrete implementations.

```python
# app/modules/<module_name>.py
from app.services.<service_name>.base import <ServiceName>Base


class <ModuleName>:
    """Description of what this module does.

    :param <service>: Service implementing <ServiceName>Base.
    """

    def __init__(self, <service>: <ServiceName>Base) -> None:
        self._<service> = <service>

    def <method>(self, <params>) -> <return_type>:
        """Description.

        :param <param>: Description.
        :returns: What it returns.
        """
        ...
```

## Adding schemas

Schemas are Pydantic models for the inputs and outputs of the core facade. They live in `app/schemas/` as single files.

```python
# app/schemas/<name>.py
from pydantic import BaseModel


class <Name>Input(BaseModel):
    """Input for <operation>.

    :param <field>: Description.
    """

    <field>: <type>


class <Name>Output(BaseModel):
    """Output from <operation>.

    :param <field>: Description.
    """

    <field>: <type>
```

Schemas are used in the core facade and in `app/main.py` (for request/response models). They can also be used in routers if the API is split into multiple router files.

## Wiring into the core facade

After creating services, modules, and schemas, wire them into the core facade in `app/core/<app_name>.py`:

1. Import the concrete service and instantiate it in `__init__` using settings
2. Import the module and pass the service instance to it
3. Add a new method that takes a schema input and returns a schema output

Then expose it in `app/main.py` as a new endpoint (or Lambda handler, CLI command, etc.).

## Adding an endpoint

When adding a new API endpoint:

1. First make sure the underlying service → module → facade chain exists
2. Add the route in `app/main.py` (or create a router file if the app is growing)
3. The endpoint function should be thin — just call the facade method and return

```python
@api.post("/new-thing", response_model=NewThingOutput)
def create_new_thing(data: NewThingInput) -> NewThingOutput:
    """Description.

    :param data: Input payload.
    :returns: Output data.
    """
    return application.create_new_thing(data)
```

## Adding or updating settings

`app/core/settings.py` uses Pydantic `BaseSettings`. Only store things that are genuinely environment-dependent: API keys, database URLs, secrets, service endpoints. Everything else (timeouts, retry counts, page sizes, feature flags) should be constants in the files that use them.

When you add a new env var to settings, also update:
- `.env.example` with a placeholder value
- `tests/conftest.py` `REQUIRED_ENV_VARS` list
- `README.md` setup instructions if relevant

## Writing tests

Tests go in `tests/`. Rules:

1. **No mocking.** Tests run against real services. If a service needs a real connection, the test should use it. The point is to verify the app actually works.
2. **Validate env vars first.** `tests/conftest.py` has a `REQUIRED_ENV_VARS` list — update it when you add new settings. If env vars are missing, tests fail immediately with a clear message instead of failing halfway with cryptic errors.
3. **Keep tests simple and useful.** One test per new piece of functionality. The test should verify the happy path works end-to-end.

```python
# tests/test_<feature>.py
from app.core.settings import Settings
from app.core.<app_name> import <AppClass>
from app.schemas.<name> import <Input>


def test_<feature>():
    """Verify <feature> works end-to-end.

    :returns: None
    """
    settings = Settings()
    app = <AppClass>(settings=settings)
    result = app.<method>(<Input>(...))
    assert result.<field> == expected_value
```

## Code style rules

- **Minimal docstrings** using `:param` and `:returns:` format on every public function and class
- **Minimal code** — only write what's needed. Placeholder `...` is fine for unspecified implementation details
- **Type hints** on all function signatures
- **No unnecessary abstractions** — keep it simple, but always use the base class pattern for services
- **Empty `__init__.py`** files unless there's a specific reason to export something
- When adding new dependencies, use `uv add <package>` (or `uv add --dev <package>` for test deps)
