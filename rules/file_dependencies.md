---
activation_mode: Model Decision
description: Standards for Dependency Injection.
globs: "**/di/**,**/containers/**,**/dependencies/**"
---

# Dependency Standards

<!-- BOOTSTRAP_GUIDE:
- __DI_FRAMEWORK__: The dependency injection framework (e.g. Dagger, Guice, Spring DI).
- __DI_PATTERN__: The pattern used (Constructor Injection vs Field Injection).
-->

> [!IMPORTANT]
> **ACTION REQUIRED**: Agent, please fill in the Dependency standards.
>
> **Enforcement Policy**:
>
> - **Responsibility**: STRICTLY for defining and providing dependencies (DI Containers).
> - **Prohibited**: Do NOT include business logic. Just wire things together.

## Naming Conventions

- Class/Func Name: PascalCase/camelCase (e.g., `Container`, `get_db_session`)
- File Name: snake_case (e.g., `dependencies.py`, `container.ts`)

## Tools, Libraries & Providers

- [ ] DI Framework: `__DI_FRAMEWORK__`

## Design Patterns

- [ ] Injection Pattern: `__DI_PATTERN__`
- [ ] Container Lifecycle:
