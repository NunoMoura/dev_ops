---
description: Create a new SPEC.md file next to a component
category: automated
---

# Create Spec

Create a `SPEC.md` file next to a component to document its purpose, API, constraints, and dependencies.
Specs are the **source of truth** for a component — like a README, but structured for agents.

---

## Inputs

- `path`: Directory of the component (e.g. `src/services/auth`)
- `title`: Human-readable component name (e.g. `Auth Service`)
- `description`: One-line summary for RLM Zoom-Out

---

## Step 1: Check for Existing Spec

Before creating, check if a `SPEC.md` already exists:

```bash
ls <path>/SPEC.md
```

If it exists, **update it** instead of creating a new one.

---

## Step 2: Discover All Existing Specs (for context)

```bash
node .dev_ops/scripts/devops.js detect --scope architecture
```

Review the hierarchy to understand where the new spec fits.

---

## Step 3: Create the Spec File

Copy the template and fill in the placeholders:

```bash
# The spec lives next to the component — NOT in .dev_ops/docs/
cat .agent/skills/devops/assets/spec.md > <path>/SPEC.md
```

Then edit `<path>/SPEC.md`, replacing:

| Placeholder | Value |
|-------------|-------|
| `{{title}}` | Component name (e.g. `Auth Service`) |
| `{{path}}` | Relative path (e.g. `src/services/auth/SPEC.md`) |
| `{{description}}` | One-line summary |
| `{{date}}` | Today's date (ISO format, e.g. `2026-02-18`) |

---

## Step 4: Fill in the Sections

Complete the following sections in the spec:

- **Overview**: What does this component do? Why does it exist?
- **Architecture**: How does it work internally? (Mermaid diagram optional)
- **API / Key Exports**: Public interface — what do other components call?
- **File Structure**: List of files and their purpose
- **Constraints**: Hard rules the Implement agent MUST follow
- **Dependencies**: Links to child `SPEC.md` files or external specs

Leave **ADRs** empty for now — add entries as architectural decisions are made.

---

## Step 5: Link from Parent Spec (if applicable)

If this component has a parent, add a link in the parent's `Dependencies` section:

```markdown
## Dependencies

* [Component Name](./<path>/SPEC.md)
```

---

## Outputs

- `<path>/SPEC.md` created with all sections filled in
- Parent spec updated with a dependency link (if applicable)
