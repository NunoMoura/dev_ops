---
activation_mode: Model Decision
description: Standards for Repositories and DAO.
globs: "**/repositories/**,**/repository/**,**/dao/**"
---

# Repository Standards

<!-- BOOTSTRAP_GUIDE:
- __DB_DRIVER__: The database driver (e.g. psycopg2, pgx).
- __DB_PROVIDER__: The database provider (e.g. PlanetScale, AWS RDS, Supabase).
- __ACCESS_PATTERN__: The pattern (e.g. Repository Pattern, DAO).
-->

> [!IMPORTANT]
> **ACTION REQUIRED**: Agent, please fill in the Repository standards.
>
> **Enforcement Policy**:
>
> - **Responsibility**: STRICTLY for Data Access, raw SQL queries, and database abstraction.
> - **Prohibited**: Do NOT leak implementation details to the Service layer (return Entities/Models).

## Naming Conventions

- Class Name: PascalCase + Repository/DAO (e.g., `UserRepository`, `ProductDAO`)
- File Name: snake_case (e.g., `user_repo.py`, `product_dao.ts`)

## Tools, Libraries & Providers

- [ ] Database Driver: `__DB_DRIVER__`
- [ ] Provider: `__DB_PROVIDER__`

## Design Patterns

- [ ] Access Pattern: `__ACCESS_PATTERN__`
- [ ] Query Construction (Builder vs Raw SQL):
