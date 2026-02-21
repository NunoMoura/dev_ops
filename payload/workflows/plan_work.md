---
description: Plan an addition to the system (Scaffolds Story or Feature)
category: guided
---

# Plan Work

Evaluate the user's request and scaffold either a **User Story** (for user-facing value) or a **Feature** (for Epics / Technical Architecture), then decompose it.

---

## Step 1: Decision - Story vs. Feature

Evaluate the work to be done.

* **If User-Facing**: e.g., "Add profile picture upload". You will scaffold a Story.
* **If Technical/Epic**: e.g., "Migrate Database to PostgreSQL" or "Implement Auth Epic". You will scaffold a Feature.

---

## Step 2: Create the Document

Based on the decision in Step 1, create the corresponding document in `.dev_ops/docs/`.

**For User Stories:**

```bash
cp .agent/skills/devops/assets/story.md .dev_ops/docs/stories/STORY-XXX.md
```

**For Features / Epics / Enablers:**

```bash
cp .agent/skills/devops/assets/feature.md .dev_ops/docs/features/FEAT-XXX.md
```

---

## Step 3: Fill Sections

Fully complete all sections in the generated document (`STORY-XXX` or `FEAT-XXX`).

* Ensure Acceptance Criteria are testable.
* If filling a Feature, clearly define the Architectural/Technical Goals.

---

## Step 4: Decompose to Tasks

Create one backlog task per acceptance criterion or distinct step:

```bash
node .dev_ops/scripts/devops.js create-task \
  --title "<Criterion>" \
  --summary "Trigger: [STORY-XXX or FEAT-XXX]\nGoal: ..." \
  --priority medium \
  --column col-backlog \
  --depends-on "TASK-001"   # optional: sibling task IDs this depends on
```

> **Tip:** Use `--depends-on` to declare execution order between sibling tasks.
> For example, if "Implement API" must finish before "Write tests",
> add `--depends-on "TASK-XXX"` when creating the test task.

---

## Outputs

* `.dev_ops/docs/stories/STORY-XXX.md` or `.dev_ops/docs/features/FEAT-XXX.md`
* TASK-XXX entries in the Backlog
