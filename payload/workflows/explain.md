---
description: Explain project, component, or code structure
category: guided
---

# Explain Workflow

Provide structured explanations of the project, components, or specific code.

## Input Types

| Input | Scope |
|-------|-------|
| Empty | Entire project overview |
| File path | Specific file |
| Folder path | Module/component |
| Class/function name | Specific code |

## Step 1: Determine Scope

Based on input, identify what to explain (project, component, or code).

## Step 2: Gather Context

**For project-level explanations**, read:

- `README.md`
- `.dev_ops/docs/project_standards.md`
- `.dev_ops/docs/prd.md`
- `.dev_ops/docs/architecture/*.md`
- Key entry points (`main.py`, `index.ts`, etc.)

**For component/code explanations**, read:

- Source code files
- Related tests
- Usage examples in codebase
- Architecture docs for that component

## Step 3: Structure Explanation

Use this format:

```markdown
## [Target Name]

**Purpose**
> One sentence summary of what it does and why it exists.

**Context**
> Where does it fit in the system? Who uses it?

**Inner Workings**
> How does it function? Key logic flows, algorithms, or state management.

**Key Components**
- List main classes, functions, or sub-modules with brief descriptions.

**Dependencies**
- External: Libraries/packages used
- Internal: Other modules it depends on

**Usage Example**
```

## Step 4: Apply Best Practices

- Start broad, then go deep if asked
- Link to relevant files for context
- Highlight non-obvious design decisions
- Note technical debt or areas for improvement
- Use diagrams when explaining complex relationships

## Outputs

- Structured explanation following the format above
