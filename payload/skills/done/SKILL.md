---
name: done
description: Ship it. Final polish and automated PR creation.
---

# Done Phase (Shipping)

> "Real artists ship." - Steve Jobs

## Phase Constraints

| ✅ ALLOWED | ❌ FORBIDDEN |
|------------|--------------|
| `git commit`, `git push` | Code Changes (except cleanup) |
| `gh pr create` | Start new task without cleaning up |
| Spawn new tasks (feedback) | Move to Done without `walkthrough.md` |

**Required Deliverable**: **Merged PR** (Conceptually).

---

## Input → Output

| Input | Output | Next Phase |
|-------|--------|------------|
| `walkthrough.md` | Merged/Open PR | None / New Task |

---

## Steps

### 1. The Handoff

* **Check**: Does `walkthrough.md` exist?
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
    # Use Walkthrough content as body
    gh pr create --title "[TASK-ID] Title" --body-file .dev_ops/tasks/[TASK-ID]/walkthrough.md
    ```

2. **Verify**: Check that the PR was created successfully.

### 4. Close the Loop (Feedback)

**The job is NOT done until the PR is merged or addressed.**

1. **Check PR comments**:
    * **Approved**? -> Merge (if authorized) and Close Task.
    * **Changes Requested**?
        * **Small fix**: Fix immediately -> Commit -> Push.
        * **New Scope**: Create a **NEW TASK** (Bug/Feature) linked to this PR.
        * **Blocker**: Move task back to **In Progress** or **Blocked**.

### 5. Cleanup

* Clear your context.
* Ready for next task.

---

## Exit Criteria

* [ ] Changes committed and pushed.
* [ ] PR created using `walkthrough.md`.
* [ ] Task moved to Done (or Next Phase based on PR feedback).

---

## Next Phase

* **Completion**: Notify user "Task Complete. PR Created."
* **New Task**: Only if Feedback requires new scope.
