---
id: "{{id}}"           # VAL-XXX - auto-generated
title: "{{title}}"     # Walkthrough description
type: walkthrough
lifecycle: permanent   # Part of task record
date: "{{date}}"       # Creation date (YYYY-MM-DD)
status: draft          # draft | review | approved
task: "{{task_id}}"    # TASK-XXX this walkthrough validates
storage: ".dev_ops/tasks/{{task_id}}/"
trigger: "{{trigger}}" # What spawned the original task
---

# {{id}} — {{title}}

<!-- Walkthrough documents the verification evidence for a task.
     Reference the SPEC.md for requirements and the code for implementation. -->

## Summary

{{summary}}

## Prior Phase Context

<!-- What happened in Understand/Plan phases?
     Briefly summarize research findings and design decisions to provide continuity.
     This replaces the need for a separate trace.md. -->

## Changes

### Added

<!-- New files, features, or functionality -->

### Changed

<!-- Modified behavior or refactored code -->

### Removed

<!-- Deleted files or deprecated features -->

## Testing

### Automated Tests

<!-- Test command and output -->

```bash
$ npm test
...
```

- [ ] All tests pass
- [ ] No regressions

### Manual Verification

<!-- Steps taken to manually verify correctness -->

- [ ] Feature works as described in SPEC
- [ ] Edge cases tested

## Acceptance Criteria

<!-- From SPEC.md — mark each as verified -->

- [ ] {{criterion_1}}
- [ ] {{criterion_2}}

## Breaking Changes

<!-- If none, write "None". Otherwise describe migration path -->

{{breaking_changes}}

## Notes

<!-- Any additional observations, gotchas, or follow-up items -->

## Task Link

Read the task for full context: `{{task_id}}`
