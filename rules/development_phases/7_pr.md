---
phase: pr
activation_mode: Model Decides
triggers: [task_in_pr]
---

# PR Phase

## SIGNAL

| Key | Value |
|-----|-------|
| INPUTS | walkthrough.md (from Validating) |
| ARTIFACT | Pull Request |
| EXIT_TO | Done |

## ACTIONS

1. **Stage all changes**

   ```bash
   git add -A
   ```

2. **Commit with structured message**

   Use template from `templates/pr_commit.md`:
   - Type: feat/fix/refactor
   - Task reference
   - Bot triage hints

3. **Push to remote**

   ```bash
   git push origin <branch>
   ```

4. **Create PR**

   ```bash
   python3 dev_ops/scripts/git_ops.py pr-create --title "Title" --body "Body"
   ```

5. **Handle PR comments**

   Read comments collected by GitHub Action:

   ```bash
   cat dev_ops/pr_comments/PR-<number>.md
   ```

   For each comment with `Status: pending`:
   - Analyze with full project context
   - Categorize: `bug`, `feature`, `quickfix`, `dismiss`
   - Take action, update status to `resolved`

6. **For each comment needing action**:

   | Type | Action |
   |------|--------|
   | `bug` | Spawn task for backlog |
   | `feature` | Spawn task for backlog |
   | `quickfix` | Fix directly, commit |
   | `dismiss` | Respond with reason |

   Spawn from comment:

   ```bash
   python3 dev_ops/scripts/kanban_ops.py create --title "PR#N: <summary>" --spawn-from TASK-XXX
   ```

7. **Merge when approved**

8. **Mark done and archive**

   ```bash
   python3 dev_ops/scripts/kanban_ops.py done TASK-XXX
   ```

## SESSION BOUNDARY

When all exit criteria are met, call `notify_user` with:

- PR URL
- Comments triaged/spawned
- Ready for Done

This ends the current AG session. User triggers `/next_phase` to complete.

## EXIT_CRITERIA

- [ ] Changes committed and pushed
- [ ] PR created
- [ ] All comments triaged
- [ ] PR merged
- [ ] Task archived
