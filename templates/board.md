---
startedColumns:    # Columns that mark a task as "in progress"
  - In Progress
completedColumns:  # Columns that mark a task as "done"
  - Done
customFields:      # Task metadata fields (name: string, type: string|number|date)
  - name: workflow
    type: string
  - name: outputs
    type: string
  - name: assigned
    type: string
taskWorkloadTags:  # Effort labels with numeric points (for velocity tracking)
  Nothing: 0
  Small: 1
  Medium: 2
  Large: 3
  Epic: 5
---

# {{project_name}} Task Board

{{description}}

## Backlog

## In Progress

## Review

## Done

## Archive
