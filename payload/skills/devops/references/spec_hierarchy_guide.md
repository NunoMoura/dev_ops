# Spec Hierarchy & Navigation Guide

> The definitive guide to architectural navigation, progressive disclosure (RLM), and artifact management.

## 1. Artifacts vs. Documents

To prevent bloat and maintain a clean context, the framework strictly separates permanent state from temporary work execution.

### Documents (The Permanent State)

* **Location**: `.dev_ops/docs/`
* **Purpose**: Persistent, cross-task truth describing *what* the system is and *why* it exists.
* **Examples**:
  * `PRD.md` (Product Requirements)
  * `project_standards.md` (Formatting/Linting rules)
  * `FEAT-XXX.md` (Epics / Technical Architecture Features)
  * `STORY-XXX.md` (User-facing slices of value)
  * `BUG-XXX.md` (Persistent troubleshooting history)
* **Rule**: These survive the lifespan of a task. They guide the creation of components and prevent regressions.

### Artifacts (The Temporary State)

* **Location**: `.dev_ops/tasks/TASK-XXX/`
* **Purpose**: Ephemeral evidence of task execution.
* **Examples**:
  * `RES-XXX.md` (Research/Analysis gathered during the Understand phase)
  * `task.md` (The operational checklist)
  * `decision_trace.md` (The PR body / verification evidence)
* **Rule**: These are task-bound. Once a task is Done, its artifacts act as historical logs, not active architectural drivers.

---

## 2. Specs as Code Gates

`SPEC.md` is neither an Artifact nor a Document—it is a **Code Gate**.

1. **Authoritative Contract**: IDE agents treat the `SPEC.md` as the absolute law for a component. If a requirement isn't in the Spec, it cannot be in the code.
2. **Validation**: Code is verified *against* the `SPEC.md`. Tests are written *based on* the `SPEC.md`.
3. **Proximity**: Specs must live exactly where the code lives (e.g., `src/auth/SPEC.md`). They are the API contract for that specific folder.

---

## 3. The Navigation Tree (RLM Mechanics)

To operate over massive codebases, agents use **Progressive Disclosure** (often referenced as Reasoning Language Model / RLM behavior). You do not load the whole codebase; you "zoom" through the Spec Hierarchy.

### The Standard Hierarchy

1. **System Entrypoint (Root Spec)**: A top-level `SPEC.md` allowed at the project root strictly to act as the "Map". It lists major sub-systems and global constraints but contains NO functional code details.
2. **Module Spec**: (e.g., `src/api/SPEC.md`) Details the API routes and points to child handlers.
3. **Component (Leaf) Spec**: (e.g., `src/api/routes/user/SPEC.md`) The granular interface for the actual code.

### Zooming Out (Context Discovery)

If you are asked to modify `src/api/routes/user/` but lack context on how it fits into the system:

* **Action**: Jump to the parent `src/api/SPEC.md`.
* **Why**: To read the upstream constraints or sibling dependencies.

### Zooming In (Decomposition)

If you are told to architect an entire `src/api` module:

* **Action**: Update `src/api/SPEC.md` to define the routes, then spawn Child Tasks to generate `src/api/routes/user/SPEC.md`.
* **Why**: You delegate implementation downwards, pushing local constraints to Leaf nodes.

---

## 4. Greenfield Scaffolding Sequence

When starting a brand new project, use this exact order of operations to prevent "Spec Sprawl" before the architecture is known:

1. **Define Reality**: Create the `PRD.md` and `Personas` (.dev_ops/docs).
2. **Scaffold**: Use the PRD to generate the basic root folder structure.
3. **Establish Gates**: Generate the foundational `SPEC.md` files for those primary folders (the Root map and major Module specs).
4. **Iterate**: Begin generating `STORY-XXX` or `FEAT-XXX` documents to iteratively build out the code behind those gates.

---

## 5. Bypassing Specs for Non-Code Tasks

Because Specs are **Code Gates**, tasks that do not involve system configuration or code generation should **bypass** Spec creation.

* **Situation**: Your task is "Write the PRD" or "Flesh out the README".
* **Action**: Do the work directly. Do not generate a `SPEC.md` for a markdown document file.
* **Rule**: If the output of the task sits in `.dev_ops/docs/`, `.dev_ops/tasks/`, or is a generic project config (e.g., `.gitignore`), skip Spec generation.
