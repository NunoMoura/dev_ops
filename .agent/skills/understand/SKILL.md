---
name: understand
description: Research deeply before planning. Use when starting a new task, analyzing requirements, or scoping work.
---

# Understand

> Know more about the problem than the person who wrote the trigger doc.

## When to Use This Skill

- Task is in Understand column (if applicable)
- Need to research before planning
- Scoping work or analyzing requirements

## How It Works

| Input | Output | Next Steps |
|-------|--------|------------|
| Trigger + SPEC.md files | RES-XXX research doc | Plan |

---

## Step 1: Define Scope

Document what's in and out of scope explicitly:

- **In Scope**: Components, files, and behaviors you will change
- **Out of Scope**: Related areas you explicitly won't touch

## Step 2: Navigate SPEC.md Files

**Do NOT open code files in this phase.** Work only with SPEC.md files.

```bash
find . -name SPEC.md
grep -r "keyword" */SPEC.md
```

Read matched SPEC.md files to understand:

- `## Structure`: Folder/file layout and purposes
- `## Key Exports`: Important interfaces exposed
- `## Constraints`: Rules that cannot be violated
- `## Dependencies`: Links to other SPEC.md files

For each dependency, verify linked SPEC.md exists and interfaces are defined.

## Step 3: External Research

- Library/framework documentation
- Best practices and known issues
- Edge cases and constraints

## Step 4: Challenge Assumptions

- Is this the right approach?
- Are there simpler alternatives?
- What constraints aren't written down?

## Step 5: Update SPEC.md if Needed

If you discover drift between SPECs and reality, update SPEC.md now.

## Step 6: Create Research Artifact

Document findings using the research template: `.dev_ops/templates/artifacts/research.md`

---

## Ralf Wiggum Loop

Iterate autonomously until exit criteria are met:

1. **Check**: Are all exit criteria satisfied?
2. **If No**: Identify what's missing, research further, repeat
3. **If Yes**: Proceed to Completion

### When to Iterate

- Scope unclear → revisit trigger doc, ask clarifying questions
- SPEC.md missing info → search broader, check related components
- Research incomplete → find more sources, document gaps

---

## Exit Criteria (Self-Check)

Before notifying user, verify:

- [ ] RES-XXX artifact file exists
- [ ] `## Scope` section has explicit in/out
- [ ] `## Research` section is populated
- [ ] Dependencies and risks documented
- [ ] Can explain "what" and "why" clearly

---

## Out-of-Scope Discoveries

If you find bugs, features, or tech debt unrelated to current task:
→ Use `/create_task` workflow, then continue research

---

## Completion

When exit criteria are met:

1. If working on a task, set status to `ready-for-review`:

   ```bash
   node .dev_ops/scripts/devops.js update-task --id <TASK_ID> --status ready-for-review
   ```

2. Notify user: "Research complete. RES-XXX created. Ready for your review."

3. **Stop.** User will review, then next steps can be taken (e.g., `/claim` for Plan).


<!-- To prevent automatic updates, add '<!-- dev-ops-customized -->' to this file -->
