---
id: "{{id}}"           # PR-XXX - auto-generated
title: "{{title}}"     # PR description
type: pr
lifecycle: ephemeral   # Archived after merge
date: "{{date}}"       # Creation date (YYYY-MM-DD)
status: open           # open | review | approved | merged
task: "{{task_id}}"    # TASK-XXX this PR completes
trigger: "{{trigger}}" # What spawned the original task
---

# {{id}} - {{title}}

<!-- PR is a minimal pointer to code changes.
Reference the task's artifacts for full context. -->

## Summary

{{summary}}

## Changes

### Added

<!-- New files, features, or functionality -->

### Changed

<!-- Modified behavior or refactored code -->

### Removed

<!-- Deleted files or deprecated features -->

## Testing

- [ ] Tests pass
- [ ] Manual verification

<!-- Brief description of how changes were tested -->

## Breaking Changes

<!-- If none, write "None". Otherwise describe migration path -->

{{breaking_changes}}

## Task Link

Read the task for full context: `{{task_id}}`
