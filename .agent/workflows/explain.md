---
description: Explain project, component, or code structure
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

## For Project-Level Explanations

Read these files:

- `README.md`
- `.dev_ops/docs/nonnegotiables.md`
- `.dev_ops/docs/prd/*.md`
- `.dev_ops/docs/architecture/*.md`
- Key entry points (`main.py`, `index.ts`, etc.)

## For Component/Code Explanations

Read:

- Source code files
- Related tests
- Usage examples in codebase
- Architecture docs for that component

## Explanation Format

Structure all explanations like this:

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

## Best Practices

- Start broad, then go deep if asked
- Link to relevant files for context
- Highlight non-obvious design decisions
- Note technical debt or areas for improvement
- Use diagrams when explaining complex relationships
