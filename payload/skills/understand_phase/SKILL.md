---
name: understand-phase
description: Research deeply before planning. Use when in the Understand phase, when you need to analyze requirements, or when scoping work.
---

# Understand Phase

> Know more about the problem than the person who wrote the trigger doc.

## When to Use This Skill

- Task is in Understand column
- Need to research before planning
- Scoping work or analyzing requirements
- Checking if existing code matches architecture

## How It Works

| Input | Output | Next Phase |
|-------|--------|------------|
| TASK + trigger + architecture docs | RES-XXX research doc | Plan |

## Step 1: Define Scope

Document what's in and out of scope explicitly:

**In Scope**: Components, files, and behaviors you will change
**Out of Scope**: Related areas you explicitly won't touch

Check affected architecture docs:

```bash
ls .dev_ops/docs/architecture/
```

## Step 2: Research

### Internal Research

- Search codebase for similar patterns
- Review existing implementations
- Check test coverage for affected components
- Look for related ADRs (Architecture Decision Records)

### External Research

- Library/framework documentation
- Best practices for the problem domain
- Known issues or edge cases

### Edge Cases

- What could go wrong?
- What happens with invalid input?
- What are the failure modes?

## Step 3: Challenge Assumptions

Question incomplete or unclear requirements:

- Is this the right approach?
- Are there simpler alternatives?
- What constraints aren't written down?

## Step 4: Update Documentation

If you discover drift between code and architecture docs, update them now.

## Step 5: Decompose If Needed

If task scope is too large, create sub-tasks (use `--help` for options):

```bash
python3 .dev_ops/scripts/board_ops.py create_task --help
```

```bash
python3 .dev_ops/scripts/board_ops.py create_task \
  --title "Sub-task title" \
  --summary "Specific scope" \
  --priority medium \
  --commit
```

## Step 6: Create Research Artifact

Document findings (use `--help` for options):

```bash
python3 .dev_ops/scripts/artifact_ops.py create --help
```

```bash
python3 .dev_ops/scripts/artifact_ops.py create research \
  --title "Research for TASK-XXX" \
  --task TASK-XXX
```

See `examples/research_doc.md` for a complete example.

## Step 7: Move to Plan

```bash
python3 .dev_ops/scripts/board_ops.py move TASK-XXX col-plan --commit
```

## Available MCPs

Check `mcps/` folder for installed MCP capabilities that enhance research:

- Use any available MCPs to fetch documentation, search APIs, or access external resources
- Add new MCPs with `/add_mcp {name}`

## Exit Criteria

- [ ] Scope defined (explicit in/out)
- [ ] Codebase researched
- [ ] External resources reviewed
- [ ] Risks and edge cases documented
- [ ] RES-XXX artifact created
- [ ] Can explain "what" and "why" to another dev
- [ ] Task moved to Plan column
