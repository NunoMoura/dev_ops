---
description: Generate project-specific rules and constitution after initialization
---

# Bootstrap DevOps Framework

> Run this **ONCE** after initializing the framework to generate project-specific rules.

## What This Does

1. Analyzes your project structure (languages, linters, frameworks)
2. Reads rule templates in `payload/templates/rules/`
3. Generates customized rules in `.agent/rules/`
4. Creates a project constitution in `.dev_ops/docs/constitution.md`

---

## Step 1: Analyze Project Stack

Scan the project to detect:

**Languages**
- Python (`*.py`, `pyproject.toml`, `requirements.txt`)
- TypeScript (`*.ts`, `tsconfig.json`)
- JavaScript (`*.js`, `package.json`)
- Go (`*.go`, `go.mod`)
- Rust (`*.rs`, `Cargo.toml`)

**Linters & Tools**
- ESLint (`.eslintrc*`, `eslint.config.js`)
- Ruff (`ruff.toml`, `pyproject.toml`)
- Prettier (`.prettierrc*`)
- Black, Pylint, etc.

**Frameworks**
- React, Vue, Svelte (check `package.json` dependencies)
- FastAPI, Django, Flask (check `requirements.txt`, imports)
- Next.js, Express (check config files)

---

## Step 2: Generate Language Rules

For **each detected language**, read the template at:
`payload/templates/rules/languages.md`

Then create: `.agent/rules/language_<name>.md`

### Required Structure

```yaml
---
activation_mode: Always On
name: <Language Name>
globs: ["**/*.<ext>"]
---

# <Language Name> Standards

[Your analysis of the project's patterns]
```

### What to Include

Analyze existing code in the project to determine:

1. **Naming Conventions**
   - File naming: `snake_case` vs `kebab-case` vs `PascalCase`
   - Variable naming: `camelCase` vs `snake_case`
   - Class naming: `PascalCase`

2. **Type Safety**
   - Are type hints used consistently?
   - Is strict mode enabled?
   - Which type checker: `mypy`, `pyright`, `tsc`?

3. **Code Style**
   - Line length preference (80, 100, 120 chars)
   - Indentation (2 or 4 spaces)
   - Quote style (single or double)

4. **Error Handling**
   - Exceptions vs Result types
   - Custom error classes?
   - Error handling patterns used

5. **Project-Specific Idioms**
   - Common patterns you observe
   - Preferred libraries
   - Architecture style (MVC, layered, etc.)

**Example Output**: `.agent/rules/language_python.md`
```markdown
---
activation_mode: Always On
name: Python
globs: ["**/*.py"]
---

# Python Standards

## Naming
- Files: `snake_case`
- Variables: `snake_case`
- Classes: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`

## Type Safety
- Type hints required for public APIs
- Type checker: `mypy` (strict mode)
- Annotations: required on function signatures

## Style
- Line length: 100 characters
- Indentation: 4 spaces
- Quotes: double quotes
- Formatter: `black`

## Error Handling
- Use exceptions for error cases
- Custom exceptions inherit from base `AppError`
- Always handle in API boundaries

## Project Patterns
- FastAPI for REST APIs
- Pydantic for data validation
- SQLAlchemy for database
- Pytest for testing
```

---

## Step 3: Generate Linter Rules

For **each detected linter**, read the template at:
`payload/templates/rules/linters.md`

Then create: `.agent/rules/linter_<name>.md`

### What to Include

1. **Config File Location**
   - Where is the linter configured? (`pyproject.toml`, `.eslintrc.json`)

2. **Integration**
   - Which language rules does it enforce?
   - Auto-fix enabled?

3. **Project-Specific Settings**
   - Disabled rules and why
   - Custom rules added
   - Severity levels

**Example Output**: `.agent/rules/linter_ruff.md`
```markdown
---
activation_mode: Always On
name: Ruff
globs: ["**/*.py"]
---

# Ruff Configuration

Config: `pyproject.toml`

## Enabled Rules
- `E` - pycodestyle errors
- `F` - pyflakes
- `I` - isort (import sorting)
- `N` - pep8-naming

## Auto-Fix
Enabled for: imports, formatting
Run on save: yes

## Overrides
- Line length: 100 (matches Black)
- Ignore `E501` in migrations/
```

---

## Step 4: Create Constitution

Read the template at: `payload/templates/docs/constitution.md`

Then create: `.dev_ops/docs/constitution.md`

### Customize Based On

1. **Project Size**
   - Small (< 10 files): Lightweight governance
   - Medium: Standard principles
   - Large: Comprehensive ADR process

2. **Team Patterns** (if observable)
   - Commit message style
   - PR description format
   - Code review practices

3. **Technical Decisions**
   - Monorepo vs multi-repo
   - Microservices vs monolith
   - Testing strategy
   - Deployment approach

4. **Documentation Style**
   - Existing READMEs format
   - Inline comments density
   - API documentation approach

**Example Output**: `.dev_ops/docs/constitution.md`
```markdown
# Project Constitution

## Purpose
This document defines the technical governance for [Project Name].

## Principles

### 1. Code Quality
- All code must pass linting (Ruff, ESLint)
- Type safety enforced (mypy strict mode)
- Test coverage > 80%

### 2. Architecture
- FastAPI for backend services
- React + TypeScript for frontend
- PostgreSQL for primary database
- Redis for caching

### 3. Development Workflow
- Feature branches from `main`
- PR required for all changes
- At least 1 approval needed
- CI must pass (tests + lints)

### 4. Decision Making
- ADRs required for architecture changes
- Stored in `.dev_ops/docs/architecture/`
- Template: see `adr_template.md`

### 5. Testing
- Unit tests for business logic
- Integration tests for APIs
- E2E tests for critical flows
- Pytest for Python, Jest for TS
```

---

## Expected Output

After running `/bootstrap`, you should have:

```
.agent/
├── rules/
│   ├── language_python.md       ✅
│   ├── language_typescript.md   ✅
│   ├── linter_ruff.md           ✅
│   └── linter_eslint.md         ✅
└── workflows/
    └── bootstrap.md

.dev_ops/
├── docs/
│   └── constitution.md          ✅
└── board.json
```

---

## Validation

After generation, verify:

- [ ] All generated rules have proper frontmatter (activation_mode, globs)
- [ ] Rules reference actual files/patterns in this project
- [ ] Constitution reflects real technical decisions visible in code
- [ ] No placeholder text like `[Language Name]` remains

---

## Notes

- **Re-run anytime**: If project evolves, delete generated rules and run `/bootstrap` again
- **Edit freely**: Generated rules are starting points - customize as needed
- **Templates**: Located in `payload/templates/` for reference
