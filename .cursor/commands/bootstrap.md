---
description: Generate project-specific rules and non-negotiables
category: guided
---

# Bootstrap Orchestrator

Run this workflow once to initialize the project structure and rules.

## Step 1: Detect Stack & Patterns

Run the detection script to analyze the codebase:

```bash
python3 .dev_ops/scripts/project_ops.py detect --target . --format json
```

**Output Analysis**:

- **Stack**: Languages, frameworks, linters, databases (with versions & globs).
- **Patterns**: Common file names and directory structures.

## Step 2: Determine Project Type

- **Greenfield**: Empty project or only config files.
  - *Focus*: User vision and requirements.
- **Brownfield**: Existing code files source code.
  - *Focus*: Analyzing existing patterns and aligning with goals.

## Step 3: Define Project (Vision)

Explain input expectations:
> "We need to understand your vision. Please prepare:
>
> - **Text**: What are you building? Who is it for?
> - **Visuals** (Recommended): Images, diagrams, or descriptions of the UI."

**Action**: Run `/define_project`

- Creates: Personas, Mockups, PRD, and User Stories.

## Step 4: Non-Negotiables

Explain input expectations:
> "We need to define the constraints. Please prepare to answer:
>
> - What constraints must never be violated?
> - What tech stack decisions are locked?
> - What patterns are mandatory?"

**Action**: Run `/create_nonnegotiables`

## Step 5: Generate Rules

Using the **Stack** and **Patterns** from Step 1, and the context from provided documents:

1. **Read Templates**: `.dev_ops/templates/rules/*.md`
2. **Generate Rules**: Create files in `.agent/rules/` (or `.cursor/rules/`).
   - Use `globs` from detection.
   - Use `patterns` to refine `globs` if needed (e.g. `models/` vs `app/models/`).
   - Fill hierarchy sections (`Assumes`, `Related Rules`).

### Rule Naming

- `language_<name>.md`
- `library_<name>.md`
- `linter_<name>.md`
- `database_<name>.md`

## Output Check

- [ ] PRD created
- [ ] Non-Negotiables created
- [ ] Rules generated in `.agent/rules/`
