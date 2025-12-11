---

activation_mode: Glob
description: Standards for Configuration and Environment Variables.
globs: ["**/config/**", "**/.env*", "**/settings/**"]

---

# Config Standards

<!-- BOOTSTRAP_GUIDE:
- __CONFIG_LIB__: The configuration library (e.g. Pydantic Settings, dotenv, viper).
- __ENV_MGMT__: Environment variable management strategy.
-->

> [!IMPORTANT]
> **ACTION REQUIRED**: Agent, please fill in the Config standards.
>
> **Enforcement Policy**:
>
> - **Responsibility**: STRICTLY for Environment Variables, Constants, and Application Settings.
> - **Prohibited**: Do NOT include runtime startup logic or side effects.

## Naming Conventions

- Class Name: PascalCase (e.g., `AppConfig`, `Settings`)
- File Name: snake_case (e.g., `config.py`, `settings.ts`)

## Tools, Libraries & Providers

- [ ] Config Library: `__CONFIG_LIB__`

## Design Patterns

- [ ] Environment Management: `__ENV_MGMT__`
- [ ] Secret Management (Vault vs Env Vars):
