---
name: understand
description: Research deeply before planning. Use when starting a new task, analyzing requirements, or scoping work.
---

# Understand Phase

> Know more about the problem than the person who wrote the trigger doc.

## Phase Constraints (Non-Negotiable)

| ✅ ALLOWED | ❌ FORBIDDEN |
|------------|--------------|
| Read SPEC.md files | Open code files |
| Web/external research | Write any code |
| Create RES-XXX artifact | Move to Plan without RES-XXX |
| Update existing SPEC.md | Skip scope definition |

**Required Deliverable**: `RES-XXX` in `.dev_ops/tasks/TASK-XXX/`

---

## Input → Output

| Input | Output | Next Phase |
|-------|--------|------------|
| Trigger doc + SPEC.md files | RES-XXX research doc | Plan |

---

## Steps

### 1. Define Scope

Document explicitly:

- **In Scope**: Components, files, behaviors to change
- **Out of Scope**: Related areas you won't touch

### 2. Navigate SPEC.md Files

**Do NOT open code files.**

```bash
find . -name SPEC.md
grep -r "keyword" */SPEC.md
```

Read matched SPEC.md for:

- `## Structure`: Layout and purposes
- `## Key Exports`: Interfaces
- `## Constraints`: Rules
- `## Dependencies`: Links to other SPECs

### 3. External Research

- Library/framework docs
- Best practices
- Edge cases and constraints

### 4. Challenge Assumptions

- Is this the right approach?
- Simpler alternatives?
- Unwritten constraints?

### 5. Update SPEC.md if Needed

Fix drift between SPECs and reality now.

### 6. Create Research Artifact

Use template: `.dev_ops/templates/artifacts/research.md`

---

## Iterate (Ralf Wiggum Loop)

1. Check exit criteria below
2. If incomplete → identify gap, research more
3. If complete → proceed to Completion

---

## Exit Criteria

- [ ] RES-XXX artifact exists
- [ ] `## Scope` has explicit in/out
- [ ] `## Research` populated
- [ ] Dependencies and risks documented
- [ ] Can explain "what" and "why"

---

## Out-of-Scope Discoveries

Found unrelated bugs/features? → `/create_task`, then continue

---

## Completion

1. Set task status: `ready-for-review`
2. Notify user: "Research complete. RES-XXX ready for review."
3. **Stop.** Wait for user review.
