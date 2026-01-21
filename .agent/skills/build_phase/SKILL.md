---
name: build-phase
description: Implement production-ready code with tests. Use when in the Build phase, when writing code, or when following TDD practices.
---

# Build Phase

> Code you'd be proud to ship. Code matches what SPEC.md defines.

## When to Use This Skill

- Task is in Build column
- Implementing features or fixes
- Writing tests
- Following TDD workflow

## How It Works

| Input | Output | Next Phase |
|-------|--------|------------|
| PLN-XXX implementation plan | Code + tests + updated SPEC.md | Verify |

## Step 1: Review Plan and SPEC.md

**SPEC.md defines requirements. Code matches specs.**

Read the relevant SPEC.md files to understand:

- What files should exist
- What functions should be implemented
- What constraints must be followed

## Step 2: Write Tests First

For each checklist item in PLN-XXX, write tests before code:

- Unit tests for behavior
- Edge case tests
- Error condition tests

## Step 3: Implement Code

Implement just enough to make tests pass:

- Handle errors gracefully
- Validate all inputs
- Follow existing patterns in the codebase

## Step 4: Refactor

While tests still pass:

- Simplify complex logic
- Extract reusable components
- Improve naming

## Step 5: Update SPEC.md

When modifying code, keep SPEC.md in sync:

- **Adding folder/file**: Add row to `## Structure` table
- **Adding export**: Add to `## Key Exports` section
- **Making decision**: Add ADR row to `## ADRs` table
- **New folder with code**: Create `SPEC.md` from template

**Template:** `.dev_ops/templates/docs/spec.md`

## Step 6: Commit

Use conventional commits:

```bash
git commit -m "feat(<scope>): <what>

Task: TASK-XXX"
```

## Decision Tree

### If Plan Gaps Found

Return to Plan phase to update PLN-XXX.

### If Blocked by Unrelated Issue

Create a new task for the blocker.

## When Complete

Run all tests:

```bash
pytest tests/ -v  # Python
npm test          # JavaScript/TypeScript
```

## Exit Criteria

- [ ] All checklist items in PLN-XXX complete
- [ ] All tests pass
- [ ] Lint passes
- [ ] Code handles errors gracefully
- [ ] SPEC.md updated (Structure, Key Exports)
- [ ] Each change committed with proper message
