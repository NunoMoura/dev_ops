---
name: plan
description: Update `SPEC.md` and decompose tasks. Focus on architecture and recursive decomposition, NOT code writing.
---

# Plan Phase

> "The Spec is the Truth." - The Framework

## Phase Constraints

| ✅ ALLOWED | ❌ FORBIDDEN |
|------------|--------------|
| Update `SPEC.md` | Write Implementation Code |
| Read `RES-*.md` & Code Metadata | Modify Source Code (`.ts`, `source/`, etc.) |
| Create Child Tasks (`create-task`) | Update sub-component `SPEC.md` (Delegate it!) |
| Read `SPEC.md` headers | Read full files (>100 lines) |
| Define Verification Strategy | Skip creating/updating `SPEC.md` |

**Required Deliverable**: Updated `SPEC.md` + Child Tasks in `.dev_ops/tasks/`.

---

## Input → Output

| Input | Output | Next Phase |
|-------|--------|------------|
| `RES` + `SPEC` headers | Updated `SPEC.md` + Tasks | Implement (Leaf) / Plan (Node) |

---

## Steps

### 1. RLM Zoom-Out (Context)

* **Action**: Read **only** the headers/structure of the current component's `SPEC.md`.
* **Command**: `view_file` (with line limit) or `grep`.
* **Constraint**: Do **NOT** read implementation files yet. Trust the Spec interface.

### 2. Analyze & Hierarchy

* **Identify**: Which components need to change?
* **Hierarchy check**: Does this change affect *my* component (Local) or *my children* (Sub-components)?

### 3. RLM Zoom-In (Update Local)

* **Action**: Update the **Current Directory's** `SPEC.md` to reflect the new requirements.
* **Constraint**: Do not update child specs. You are only responsible for *this* level of abstraction.

### 4. Recursive Decomposition (The "Delegate")

* **Condition**: If the change requires updates to sub-components (child folders):
    1. **Stop**: Do not edit their files.
    2. **Create Task**: Use `node .dev_ops/scripts/devops.js create-task` to create a new task for *each* affected child.
        * Title: "Update [Child Name] Spec to match [Parent] changes"
        * Trigger: The current task ID.
    3. **Link**: Add the new Task IDs to the **Current Task's** `dependsOn` list (edit `.dev_ops/tasks/[ID]/task.md`).

### 5. Review (The "Leaf vs Node")

* **Leaf**: If no child tasks were created, you are a Leaf. -> Move to **Implement**.
* **Node**: If child tasks were created, you are a Node. -> Mark as **Blocked** (or keep open) until children are done.

---

## Exit Criteria

* [ ] Current `SPEC.md` is updated and precise.
* [ ] Child tasks created for all affected sub-components.
* [ ] Current Task `dependsOn` updated (if Node).
* [ ] NO code changes (only `SPEC.md` and `task.md`).

---

## Next Phase

* **Leaf Success**: `/implement` (Go build the Spec).
* **Node Success**: `/done` (Or wait if tracking).
* **Failure**: `/understand` (Need more research).
