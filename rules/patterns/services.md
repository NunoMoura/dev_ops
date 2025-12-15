---

activation_mode: Glob
description: Standards for Service layer and Business Logic.
globs: ["**/services/**", "**/service/**"]

---

# Service Standards

<!-- BOOTSTRAP_GUIDE:
- __LOGIC_PATTERN__: The business logic pattern (e.g. Domain Services, Transaction Script).
- __TRANSACTION_MGMT__: How transactions are managed (e.g. Unit of Work, Declarative).
-->

> [!IMPORTANT]
> **ACTION REQUIRED**: Agent, please fill in the Service standards.
>
> **Enforcement Policy**:
>
> - **Responsibility**: STRICTLY for Business Logic, Use Cases, and Domain orchestration.
> - **Prohibited**: Do NOT handle HTTP requests directly (use Router) or raw SQL queries (use Repository).

## Naming Conventions

- Class Name: PascalCase + Service (e.g., `UserService`, `OrderProcessingService`)
- File Name: snake_case (e.g., `user_service.py`, `orders.ts`)

## Tools, Libraries & Providers

- [ ] Service Discovery (if applicable):

## Design Patterns

- [ ] Logic Pattern: `__LOGIC_PATTERN__`
- [ ] Transaction Management: `__TRANSACTION_MGMT__`
- [ ] Interface Definition (Interfaces vs Concrete Classes):
