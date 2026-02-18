---
id: "{{id}}"           # TASK-XXX - auto-generated
title: "{{title}}"     # Short descriptive title
type: task
lifecycle: ephemeral   # TASK is ephemeral, archived on Done
date: "{{date}}"       # Creation date (YYYY-MM-DD)
column: col-backlog    # Current Board column
status: ready          # ready | in_progress | needs_feedback | blocked | done
priority: medium       # high | medium | low
trigger: ""            # What spawned this task (PRD-XXX, FEAT-XXX, BUG-XXX)
parentId: null         # Parent TASK-XXX ID (null = top-level task)
dependsOn: []          # TASK-XXX IDs that must complete first
artifacts:             # Pointers to ephemeral artifact content
  research: null       # RES-XXX - set by Understand phase
  plan: null           # PLN-XXX - set by Plan phase
  walkthrough: null    # Created in Verify phase (IDE-provided)
---

# {{id}} - {{title}}

<!-- TASK is a minimal pointer, not a data store.
Ephemeral content lives in RES/PLN artifacts.
SPEC.md files are updated during Implement phase to reflect changes. -->

## Context

Read the trigger doc for context: `{{trigger}}`

## Notes

<!-- Working notes, blockers, or observations -->
