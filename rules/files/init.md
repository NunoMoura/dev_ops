---
activation_mode: model_decision
description: Standards for Project Initialization and Startup.
globs: "**/init/**,**/startup/**,**/boot/**,**/main.py**,**/index.js**,**/index.ts**"
---

# Init Standards

<!-- BOOTSTRAP_GUIDE:
- __INIT_PATTERN__: Application initialization pattern (e.g. Bootstrap function, App Factory).
-->

> [!IMPORTANT]
> **ACTION REQUIRED**: Agent, please fill in the Init standards.
>
> **Enforcement Policy**:
>
> - **Responsibility**: STRICTLY for Entry points, App instantiation, and Middleware setup.
> - **Prohibited**: Do NOT write inline Route handlers or extensive config logic.

## Naming Conventions

- Func Name: `create_app`, `main`, `bootstrap`
- File Name: `main.py`, `index.ts`, `app.js`

## Design Patterns

- [ ] Initialization Pattern: `__INIT_PATTERN__`
- [ ] Startup hooks/Lifecycle events:
