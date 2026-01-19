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
| RES-XXX + architecture docs | PLN-XXX implementation plan | Build |

## Step 1: Review Research

Internalize findings from RES-XXX:

- Scope boundaries
- Affected components
- Risks and edge cases
- Recommended approach

## Step 1a: Analyze Impact

Check what depends on components you'll modify:

```bash
python3 .dev_ops/scripts/doc_ops.py reverse-deps src/component.md
```

Include all returned components in your plan's affected files list. This ensures you don't miss downstream impact.

## Step 2: Create Implementation Plan

Create the plan artifact (use `--help` for options):

```bash
python3 .dev_ops/scripts/artifact_ops.py create --help
```

```bash
python3 .dev_ops/scripts/artifact_ops.py create plan \
  --title "Plan for TASK-XXX" \
  --task TASK-XXX
```

### Plan Structure

#### Goal

High-level objective — what we're building and why.

#### Checklist

Ordered list of work items. Dependencies first. Tag each item:

```markdown
- [ ] **[test]** Add unit tests for validation logic
  - Files: `tests/test_validation.py`
- [ ] **[code]** Implement input validation
  - Files: `src/validation.py`
```

#### Acceptance Criteria

How we know we're done. Must be testable:

```markdown
- All inputs validated before processing
- Invalid inputs return 400 with descriptive error
- Test coverage ≥ 90% for new code
```

#### Verification

Commands to run, manual checks to perform.

> [!TIP]
> Template: `.dev_ops/templates/artifacts/plan.md`

See `examples/implementation_plan.md` for a complete example.

## Step 3: Anticipate Problems

Document potential blockers:

- External dependencies
- Areas of uncertainty
- Performance concerns

## Step 4: Move to Build

```bash
python3 .dev_ops/scripts/board_ops.py move TASK-XXX col-build --commit
```

### If Research Gaps Found

Move back to Understand:

```bash
python3 .dev_ops/scripts/board_ops.py move TASK-XXX col-understand --commit
```

## Exit Criteria

- [ ] PLN-XXX artifact created
- [ ] Goal clearly stated
- [ ] Checklist ordered with dependencies first
- [ ] Each item tagged as [test] or [code]
- [ ] Acceptance criteria are testable
- [ ] Verification steps defined
- [ ] Another dev could execute without clarification
- [ ] Task moved to Build column
