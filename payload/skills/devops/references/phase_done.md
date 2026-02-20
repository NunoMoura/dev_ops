# Phase: Done

> "Real artists ship."

## Phase Constraints

| ✅ ALLOWED | ❌ FORBIDDEN |
|------------|--------------|
| `git commit`, `git push` | Code Changes (except cleanup) |
| `gh pr create` | Start new task without cleaning up |
| Spawn new tasks (feedback) | Move to Done without verification evidence |

**Required Deliverable**: **Merged PR** (Conceptually).

---

## Input → Output

| Input | Output | Next Phase |
|-------|--------|------------|
| `decision_trace.md` | Merged/Open PR | None / New Task |

---

## Steps

### 1. The Handoff

* **Check**: Does `decision_trace.md` contain verification evidence?
* **Check**: Does `SPEC.md` match the reality of the code?

### 2. Git Workflow (The "Push")

1. **Commit**:

    ```bash
    git add .
    # Use conventional commits
    git commit -m "feat(task): [TASK-ID] Title"
    ```

2. **Push**:

    ```bash
    git push origin [feature-branch]
    ```

### 3. Create Pull Request

1. **Command**:

    ```bash
    # Use decision_trace.md as PR body:
    gh pr create --title "TASK-XXX: Title" --body-file .dev_ops/tasks/TASK-XXX/decision_trace.md
    ```

2. **Verify**: Check that the PR was created successfully.

### 4. Close the Loop (Feedback)

**The job is NOT done until the PR is merged or addressed.**

1. **Check PR comments**:
    * **Approved**? → Merge (if authorized) and Close Task.
    * **Changes Requested**?
        * **Small fix**: Fix immediately → Commit → Push.
        * **New Scope**: Create a **NEW TASK** (Bug/Feature) linked to this PR.
        * **Blocker**: Move task back to **In Progress** or **Blocked**.

### 5. Board Update

* **Action**: Move task to Done.
* **Command**: `node .dev_ops/scripts/devops.js move-task --id [TASK-ID] --column col-done`

### 6. Cleanup

* Clear your context.
* Ready for next task.

## Troubleshooting

### Error: "PR checks failed"

**Cause**: CI/CD pipeline failed (lint/test).
**Solution**: Return to **Implement** or **Verify** to fix issues.

### Error: "Merge conflict"

**Cause**: Base branch updated while working.
**Solution**: `git pull origin main` and resolve conflicts locally.

---

## Exit Criteria

* [ ] Changes committed and pushed.
* [ ] PR created using `decision_trace.md`.
* [ ] Task moved to Done (or Next Phase based on PR feedback).

---

## Next Phase

* **Completion**: Notify user "Task Complete. PR Created."
* **New Task**: Only if Feedback requires new scope.
