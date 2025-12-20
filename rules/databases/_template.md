---
activation_mode: Always On
description: Best practices and standards for [Database Name] usage.
globs: ["**/migrations/**", "**/models/**", "**/db/**"]
---

# [Database Name] Standards

Core standards for [Database Name] within the DevOps framework.

## Core Principles

- **Schema First**: Define schema before writing queries.
- **Migrations**: All schema changes via versioned migrations.
- **Connection Pooling**: Use connection pools for performance.
- **Parameterization**: Never interpolate user input directly.

## Naming Conventions

- **Tables**: snake_case, plural (e.g., `users`, `order_items`).
- **Columns**: snake_case (e.g., `created_at`, `user_id`).
- **Indexes**: `idx_<table>_<column>` format.
- **Foreign Keys**: `fk_<table>_<referenced_table>` format.
- **Constraints**: `chk_<table>_<description>` format.

## Query Guidelines

1. **Parameterization**: Always use parameterized queries.
2. **Transactions**: Use for multi-statement operations.
3. **Indexes**: Add for frequently queried columns.
4. **Explain Plans**: Analyze slow queries with EXPLAIN.
5. **Batch Operations**: Use bulk inserts/updates for large datasets.

## Migration Standards

- **Versioning**: Sequential numbering or timestamps.
- **Reversibility**: Each migration should have up() and down().
- **Small Changes**: One logical change per migration.
- **Data Migrations**: Separate from schema migrations when possible.

## Testing Standards

- **Fixtures**: Use seeded test data.
- **Isolation**: Each test uses fresh transaction (rollback after).
- **Mocks**: Mock external database calls in unit tests.
- **Integration Tests**: Test queries against real database instance.
