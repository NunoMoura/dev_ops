---
type: rule_generator
category: databases
description: Template for generating project-specific database rules during /bootstrap
---

# Database Rule Generator

> [!IMPORTANT]
> This is a **generation template**, not a static rule.
> During `/bootstrap`, this template is used to create project-specific rules
> in `.agent/rules/databases/` based on detected database configuration.

## Auto-Detection

The bootstrap workflow detects databases via:

- `docker-compose.yml` containing database services
- Connection strings in config files
- ORM configuration (SQLAlchemy, Prisma, etc.)

## Placeholder Substitution

| Placeholder | Replaced With |
|-------------|---------------|
| `[Database Name]` | Detected database (PostgreSQL, MongoDB, etc.) |

---

## Generated Rule Structure

The following sections are included in generated rules:

### General Principles (Always Included)

- **Assumes**: State dependency on database service
- **Related Rules**: Link to relevant libraries (ORMs)
- **Schema First**: Define schema before queries
- **Migrations**: All changes via versioned migrations
- **Parameterization**: Never interpolate user input
- **Transactions**: Use for multi-statement operations

### Customization Slots (Project-Specific)

These sections require project-specific values:

```yaml
# Connection & Pooling
pool_min: <number>
pool_max: <number>

# Naming Conventions
tables: snake_case | PascalCase
indexes: idx_<table>_<column>

# Migration Tool
tool: alembic | flyway | knex | prisma
versioning: sequential | timestamp

# Testing
isolation: transaction_rollback | fresh_db
```

---

## Example: Generated PostgreSQL Rule

After bootstrap detects PostgreSQL, `.agent/rules/databases/postgresql.md` contains:

```yaml
---
name: PostgreSQL
globs: ["**/migrations/**", "**/models/**"]
---

# PostgreSQL Standards

## Assumes
This rule applies when interacting with the database layer.

## Related Rules
- `sqlalchemy` (if using ORM)
- `alembic` (for migrations)

## Standards

pool_min: 2
pool_max: 10
tables: snake_case
tool: alembic
isolation: transaction_rollback
```
