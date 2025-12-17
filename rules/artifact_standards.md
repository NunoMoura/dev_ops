---
activation_mode: Model Decides
description: Artifact standards - load when creating documents, linking artifacts, or setting up frontmatter.
---

# Artifact Standards

## Artifact Types & Locations

| Type | Location | Workflow |
|------|----------|----------|
| Plans | `dev_ops/plans/` | `/create_plan` |
| Research | `dev_ops/research/` | `/research` |
| ADRs | `dev_ops/adrs/` | `/create_adr` |
| Bugs | `dev_ops/bugs/` | `/report_bug` |

## YAML Frontmatter

All artifacts should include frontmatter for linking:

```yaml
---
id: PLAN-001
title: Auth Implementation Plan
type: plan
upstream:
  - RESEARCH-001    # JWT options research
  - RESEARCH-002    # OAuth comparison
downstream:
  - ADR-001         # JWT decision record
linked_tasks:
  - TASK-001
---
```

## Artifact Identifiers

| Type | Prefix | Example |
|------|--------|---------|
| Plans | PLAN | PLAN-001 |
| Research | RESEARCH | RESEARCH-001 |
| ADRs | ADR | ADR-001 |
| Bugs | BUG | BUG-001 |

## Linking Artifacts to Tasks

Use `/link_artifact` or `kanban_ops.py link TASK-XXX ARTIFACT-ID`

## Artifact Relationships

```text
RESEARCH-001 (upstream)
    ↓ informs
PLAN-001
    ↓ triggers
TASK-001
    ↓ produces
code + tests
    ↓ documented by
ADR-001 (downstream)
```

When upstream artifacts change, review downstream documents.
