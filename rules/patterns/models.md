---

activation_mode: Glob
description: Standards for Data Models and ORM.
globs: ["**/models/**", "**/model/**", "**/entities/**"]

---

# Model Standards

<!-- BOOTSTRAP_GUIDE:
- __ORM_LIBRARY__: The ORM used (e.g. SQLAlchemy, TypeORM, Hibernate).
- __DATA_PATTERN__: The data access pattern (e.g. Active Record, Data Mapper).
-->

> [!IMPORTANT]
> **ACTION REQUIRED**: Agent, please fill in the Model standards.
>
> **Enforcement Policy**:
>
> - **Responsibility**: STRICTLY for Database Tables and ORM mappings.
> - **Prohibited**: Do NOT include API validation, request parsing, or DTO logic here. Use `schemas` for that.

## Naming Conventions

- Class Name: PascalCase (e.g., `User`, `OrderItem`)
- File Name: snake_case (e.g., `user.py`, `order_item.ts`)
- Suffix (Optional): `Model` (e.g., `UserModel`)

## Tools, Libraries & Providers

- [ ] Primary ORM: `__ORM_LIBRARY__`

## Design Patterns

- [ ] Pattern: `__DATA_PATTERN__`
- [ ] Schema Definition Style (Code-first vs DB-first):
