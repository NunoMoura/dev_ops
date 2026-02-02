---
name: build
description: Implement production-ready code with tests. Use when writing code or following TDD practices.
---

# Build

> Code you'd be proud to ship. Code matches what SPEC.md defines.

## When to Use This Skill

- Task is in Build column (if applicable)
- Implementing features or fixes
- Writing tests (TDD workflow)

## Planning Mode

**Goal**: Plan the **Coding** steps to satisfy the **PLN-XXX** checklist.
**Plan Content**:

1. TDD strategy (specific tests to write).
2. Files to create/modify (architecture check).
3. Specific refactoring steps.

## How It Works

| Input | Output | Next Steps |
|-------|--------|------------|
| PLN-XXX implementation plan | Code + tests + updated SPEC.md | Verify |

---

## Step 1: Review Plan and SPEC.md

**SPEC.md defines requirements. Code matches specs.**

Read relevant SPEC.md files to understand:

- What files should exist
- What functions should be implemented
- What constraints must be followed

## Step 2: Write Tests First (TDD)

For each checklist item in PLN-XXX, write tests before code:

- Unit tests for behavior
- Edge case tests
- Error condition tests

## Step 3: Implement Code

Implement just enough to make tests pass:

- Handle errors gracefully
- Validate all inputs
- Follow existing patterns

## Step 4: Refactor

While tests still pass:

- Simplify complex logic
- Extract reusable components
- Improve naming

## Step 5: Update SPEC.md

Keep SPEC.md in sync with code changes:

- **Adding folder/file**: Add row to `## Structure` table
- **Adding export**: Add to `## Key Exports` section
- **Making decision**: Add ADR row to `## ADRs` table

## Step 6: Commit

Use conventional commits:

```bash
git commit -m "feat(<scope>): <what>

Task: TASK-XXX"
```

---

## Ralf Wiggum Loop

Iterate autonomously until exit criteria are met:

1. **Check**: Are all exit criteria satisfied?
2. **If No**: Identify what's failing, fix it, repeat
3. **If Yes**: Proceed to Completion

### When to Iterate

- Tests fail → fix code, re-run tests
- Lint errors → fix style issues
- Checklist item incomplete → finish implementation
- SPEC.md outdated → update it

**Test failures are iteration triggers, not phase failures.**

---

## Exit Criteria (Self-Check)

Before notifying user, verify:

- [ ] All checklist items in PLN-XXX marked done
- [ ] All tests pass (`npm test` / `pytest`)
- [ ] Lint passes
- [ ] SPEC.md updated if structure changed
- [ ] Changes committed with proper message

---

## Out-of-Scope Discoveries

If you find bugs, features, or tech debt unrelated to current task:
→ Use `/create_task` workflow, then continue building

---

## Completion

When exit criteria are met:

1. If working on a task, set status to `ready-for-review`:

   ```bash
   node .dev_ops/scripts/devops.js update-task --id <TASK_ID> --status ready-for-review
   ```

2. Notify user: "Build complete. All tests pass. Ready for your review."

3. **Stop.** User will review, then next steps can be taken (e.g., `/claim` for Verify).
