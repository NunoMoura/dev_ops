---
name: plan-phase
description: Create implementation plans before building. Use when in the Plan phase, when designing solutions, or when breaking down work into steps.
---

# Plan Phase

> A plan so clear any developer could execute it.

## When to Use This Skill

- Task is in Plan column
- Designing a solution
- Breaking down work into implementable steps
- Creating acceptance criteria

## How It Works

| Input | Output | Next Phase |
|-------|--------|------------|
| RES-XXX + SPEC.md files | PLN-XXX implementation plan | Build |

## Core Principle

**Work only with SPEC.md files. Do NOT open code files.**

## Step 1: Review Research

Internalize findings from RES-XXX:

- Scope boundaries
- Affected components
- Risks and edge cases
- Recommended approach

## Step 2: Analyze Impact via SPEC.md

Identify what depends on components you're modifying:

1. **Read affected SPEC.md**: Check `## Dependencies` section
2. **Check dependents**: `grep -r "your-component" */SPEC.md`
3. **Validate interfaces**: Ensure your changes won't break dependent SPECs

Include all affected components in your plan.

## Step 3: Create Implementation Plan

### Plan Structure

#### Goal

High-level objective — what we're building and why.

#### Checklist

Ordered list of work items. Dependencies first:

```markdown
- [ ] **[test]** Add unit tests for validation logic
  - Files: `tests/test_validation.py`
- [ ] **[code]** Implement input validation
  - Files: `src/validation.py`
```

#### Acceptance Criteria

How we know we're done (must be testable):

```markdown
- All inputs validated before processing
- Invalid inputs return 400 with descriptive error
- Test coverage ≥ 90% for new code
```

#### Verification

Commands to run, manual checks to perform.

**Template:** `.dev_ops/templates/artifacts/plan.md`

## Step 4: Add ADR if Making Decision

If your plan involves architectural decisions, prepare ADR row for SPEC.md:

```markdown
| ADR-XXX | Decision summary | [Research link](...) |
```

This will be added to SPEC.md during Build phase.

## Step 5: Anticipate Problems

Document potential blockers:

- External dependencies
- Areas of uncertainty
- Performance concerns

## Exit Criteria

- [ ] PLN-XXX artifact created
- [ ] Goal clearly stated
- [ ] Checklist ordered with dependencies first
- [ ] Each item tagged as [test] or [code]
- [ ] Acceptance criteria are testable
- [ ] Verification steps defined
- [ ] ADR prepared if needed
- [ ] Another dev could execute without clarification
