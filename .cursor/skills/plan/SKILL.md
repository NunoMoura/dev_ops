---
name: plan
description: Create implementation plans before building. Use when designing solutions or breaking down work into steps.
---

# Plan

> A plan so clear any developer could execute it.

## When to Use This Skill

- Task is in Plan column (if applicable)
- Designing a solution
- Breaking down work into implementable steps

## How It Works

| Input | Output | Next Steps |
|-------|--------|------------|
| RES-XXX + SPEC.md files | PLN-XXX implementation plan | Build |

---

## Step 1: Review Research

Internalize findings from RES-XXX:

- Scope boundaries
- Affected components
- Risks and edge cases
- Recommended approach

## Step 2: Analyze Impact via SPEC.md

**Work only with SPEC.md files. Do NOT open code files.**

1. Read affected SPEC.md: Check `## Dependencies` section
2. Check dependents: `grep -r "your-component" */SPEC.md`
3. Validate interfaces: Ensure changes won't break dependent SPECs

## Step 3: Create Implementation Plan

Create PLN-XXX using template: `.dev_ops/templates/artifacts/plan.md`

Required sections:

- **Goal**: High-level objective
- **Checklist**: Ordered work items, dependencies first, each tagged `[test]` or `[code]`
- **Acceptance Criteria**: Testable success conditions
- **Verification**: Commands and manual checks

## Step 4: Add ADR if Making Decision

If plan involves architectural decisions, prepare ADR row for SPEC.md:

```markdown
| ADR-XXX | Decision summary | [Research link](...) |
```

## Step 5: Anticipate Problems

Document potential blockers:

- External dependencies
- Areas of uncertainty
- Performance concerns

---

## Ralf Wiggum Loop

Iterate autonomously until exit criteria are met:

1. **Check**: Are all exit criteria satisfied?
2. **If No**: Identify what's missing, refine plan, repeat
3. **If Yes**: Proceed to Completion

### When to Iterate

- Checklist incomplete → add missing items
- Acceptance criteria vague → make them testable
- Dependencies unclear → review SPEC.md again

---

## Exit Criteria (Self-Check)

Before notifying user, verify:

- [ ] PLN-XXX artifact file exists
- [ ] `## Goal` section is clear and specific
- [ ] `## Checklist` has ordered items with `[test]`/`[code]` tags
- [ ] `## Acceptance Criteria` are testable
- [ ] `## Verification` steps defined
- [ ] Another dev could execute without clarification

---

## Out-of-Scope Discoveries

If you find bugs, features, or tech debt unrelated to current task:
→ Use `/create_task` workflow, then continue planning

---

## Completion

When exit criteria are met:

1. If working on a task, set status to `ready-for-review`:

   ```bash
   node .dev_ops/scripts/devops.js update-task --id <TASK_ID> --status ready-for-review
   ```

2. Notify user: "Plan complete. PLN-XXX created. Ready for your review."

3. **Stop.** User will review, then next steps can be taken (e.g., `/claim` for Build).


<!-- To prevent automatic updates, add '<!-- dev-ops-customized -->' to this file -->
