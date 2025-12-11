---

activation_mode: Glob
description: Standards for API Schemas and DTOs.
globs: ["**/schemas/**", "**/schema/**", "**/dto/**"]

---

# Schema Standards

<!-- BOOTSTRAP_GUIDE:
- __VALIDATION_LIB__: The validation library (e.g. Pydantic, Zod, Joi).
- __SERIALIZATION__: The serialization format (e.g. JSON, Protobuf).
-->

> [!IMPORTANT]
> **ACTION REQUIRED**: Agent, please fill in the Schema standards.
>
> **Enforcement Policy**:
>
> - **Responsibility**: STRICTLY for API Inputs (Request Bodies), Outputs (Response models), and Validation.
> - **Prohibited**: Do NOT include Database logic, ORM relationships, or SQL queries here. Use `models` for that.

## Naming Conventions

- Class Name: PascalCase + Action/Type (e.g., `UserCreate`, `UserResponse`, `UserDTO`)
- File Name: snake_case (e.g., `user_schema.py`, `dtos/user.ts`)

## Libraries

- [ ] Validation Library: `__VALIDATION_LIB__`

## Design Patterns

- [ ] Serialization Format: `__SERIALIZATION__`
- [ ] Validation Strategy (Strict vs Loose):
