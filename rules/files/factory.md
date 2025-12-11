---
activation_mode: model_decision
description: Standards for Factory Pattern usage.
globs: "**/factories/**,**/factory/**"
---

# Factory Standards

<!-- BOOTSTRAP_GUIDE:
- __FACTORY_PATTERN__: The factory pattern variant (Simple Factory, Abstract Factory).
-->

> [!IMPORTANT]
> **ACTION REQUIRED**: Agent, please fill in the Factory standards.
>
> **Enforcement Policy**:
>
> - **Responsibility**: STRICTLY for complex object creation and preparation (e.g., Test data, Domain objects).
> - **Prohibited**: Do NOT persist data here (unless it's a specific Seeder).

## Naming Conventions

- Class Name: PascalCase + Factory (e.g., `UserFactory`)
- File Name: snake_case (e.g., `user_factory.py`)

## Design Patterns

- [ ] Factory Pattern: `__FACTORY_PATTERN__`
- [ ] Object Creation Strategy:
