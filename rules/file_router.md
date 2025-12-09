---
activation_mode: Model Decision
description: Standards for API Routers and Controllers.
globs: "**/routes/**,**/routers/**,**/controllers/**,**/api/**"
---

# Router Standards

<!-- BOOTSTRAP_GUIDE:
- __SCAFFOLDING__: The web framework router (e.g. FastAPI APIRouter, Express Router).
- __API_PATTERN__: The API style (e.g. REST, GraphQL, gRPC).
-->

> [!IMPORTANT]
> **ACTION REQUIRED**: Agent, please fill in the Router standards.
>
> **Enforcement Policy**:
>
> - **Responsibility**: STRICTLY for HTTP Request handling, input validation parsing, and delegating to Services.
> - **Prohibited**: Do NOT write complex business logic here. Delegate to `services`.

## Naming Conventions

- Class/Var Name: PascalCase/camelCase + Router/Controller (e.g., `UserRouter`, `authController`)
- File Name: snake_case (e.g., `user_routes.py`, `auth_controller.ts`)

## Tools, Libraries & Providers

- [ ] Framework: `__SCAFFOLDING__`

## Design Patterns

- [ ] API Style: `__API_PATTERN__`
- [ ] Route Naming Convention (resource vs verb):
- [ ] Middleware Strategy:
