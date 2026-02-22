# Phase: Plan

> "The Spec is the Truth." — The Framework

## Phase Constraints

| ✅ ALLOWED | ❌ FORBIDDEN |
|------------|--------------|
| Create/Update `SPEC.md` (only next to source files) | Create `SPEC.md` for documents or arbitrary configs |
| Update `task.md` checklist | Write Implementation Code |
| Read `RES-*.md` & Code Metadata | Modify Source Code (`.ts`, `source/`, etc.) |
| Create Child Tasks (`create-task`) | Update sub-component `SPEC.md` (Delegate it!) |
| Read `SPEC.md` headers | Read full files (>100 lines) |
| Define Verification Strategy | Proceed to next phase without STOPPING |

**Required Deliverable**:
Depending on the task type, you must produce ONE of the following (plus `task.md` checklists):

* **Coding Task**: Updated `SPEC.md` + Populated `task.md` checklist + Child Tasks.
* **Documentation Task**: Updated Docs (e.g., `PRD.md`, `project_standards.md`) + Populated `task.md` checklist + Child Tasks.

> **CRITICAL**: Do NOT create a `SPEC.md` for a documentation task!

---

| Input | Output | Next Action |
|-------|--------|------------|
| `RES` + `SPEC` headers | `SPEC.md` OR Docs + `task.md` checklist + Tasks | **STOP** and wait for user/system to advance task |

---

## Steps

### 1. RLM Zoom-Out (Context)

* **Action**: Read **only** the headers/structure of the current component's `SPEC.md`.
* **Command**: `view_file` (with line limit) or `grep`.
* **Constraint**: Do **NOT** read implementation files yet. Trust the Spec interface.

### 2. Identify Scope (Greenfield vs Brownfield)

**If Greenfield (New Project)**:

1. Ensure the `PRD.md` and `Personas` exist.
2. Scaffold the base folder structure described in the PRD.
3. Write the initial `SPEC.md` files for the Root and primary sub-folders.
4. Delegate actual implementation to `.dev_ops/docs/stories/STORY-XXX.md` tasks.

**If Brownfield (Existing Project)**:

* **Identify**: Which components need to change?
* **Hierarchy check**: Does this change affect *my* component (Local) or *my children* (Sub-components)?

### 3. RLM Zoom-In (Update Local)

* **Action**: Update the **Current Directory's** `SPEC.md` to reflect the new requirements. If this is a brand new component, create the `SPEC.md` from the template.
* **Action**: Update your current `.dev_ops/tasks/TASK-XXX/task.md` with the checklist of implementation steps.
* **Constraint**: You represent the *current level of abstraction*. Do not update child specs unless scaffolding a brand new folder.
* **Constraint**: A Root `SPEC.md` is allowed ONLY as a system mapping entrypoint. It must delegate all functional details to child module specs. Always place component `SPEC.md` files inside the component's directory.

### 4. Recursive Decomposition (The "Delegate")

* **Condition**: If the change requires updates to sub-components (child folders):
    1. **Stop**: Do not edit their files.
    2. **Create Sub-Task**: Use `node .dev_ops/scripts/devops.js create-task` with `--parent-id` to create a new task for *each* affected child.

        ```bash
        node .dev_ops/scripts/devops.js create-task \
          --title "Implement [Child Name]" \
          --parent-id TASK-XXX
        ```

        This automatically: sets `parentId` on the child, adds a tracking checklist entry to the parent, and blocks the parent.
    3. **Order siblings** (optional): Use `--depends-on` to declare execution order between sibling tasks.
* **Reference**: [Decomposition Rules](./decomposition_rules.md)

### 5. Review (The "Leaf vs Node")

* **Leaf**: If no child tasks were created, you are a Leaf. → Deliverable is ready for **Implement**.
* **Node**: If child tasks were created, you are a Node. → Parent is auto-blocked. Wait until all children reach Done, then move parent to **Verify**.

### 6. Parent Lifecycle

When a Node task decomposes:

| State | Condition |
|-------|-----------|
| `blocked` | Auto-set when first child is created via `--parent-id` |
| Stays in **Plan** | Parent waits while children flow independently through the pipeline |
| Unblocked → **Verify** | When all children reach Done (auto if `autoUnblockParent: true` in config) |
| **Done** | Parent validates the integrated result of all children |

> The parent's `checklist` shows the tracking overview of child tasks and their current column.

## Troubleshooting

### Error: "Spec too vague"

**Cause**: Missing requirements or research.
**Solution**: Return to **Understand** phase. Mark task as `needs_feedback`.

### Error: "Too many child tasks"

**Cause**: Over-decomposition.
**Solution**: Group related changes into a single task where possible (e.g., "Implement API & DB" if small).

---

## Exit Criteria

* [ ] Current `SPEC.md` is updated and precise (if local component spec exists/needed).
* [ ] Implementation steps are listed in the `task.md` checklist.
* [ ] Child tasks created for all affected sub-components.
* [ ] Child tasks created with `--parent-id` for all affected sub-components (if Node).
* [ ] NO code changes (only `SPEC.md` and `task.md`).

---

## Next Phase

* **SUCCESS**: **STOP**. You must stop execution after producing the deliverables so the human or system can advance the task to `Implement` or `Verify`.
* **Failure**: Return to **Understand** (Need more research).
