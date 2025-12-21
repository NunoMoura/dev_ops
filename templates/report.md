---
id: "{{id}}"            # REP-XXX, TST-XXX, REV-XXX, or COMP-XXX
title: "{{title}}"      # Report title
type: "{{report_type}}" # test | review | completion
task: "{{task}}"        # TASK-XXX being reported on
date: "{{date}}"        # Creation date (YYYY-MM-DD)
status: "{{status}}"    # pass | fail | approved | changes_requested | pending
component: ""           # Component this report verifies (e.g., architecture/domain/users/auth.md)
upstream: []            # Artifacts this depends on
downstream: []          # Artifacts that depend on this
---

# {{id}} - {{title}}

## Summary

| Field | Value |
|-------|-------|
| Task | {{task}} |
| Type | {{report_type}} |
| Status | {{status}} |
| Date | {{date}} |

## Checklist

<!-- Type-specific checklist - copy appropriate section below -->

### For Test Reports (TST-XXX)

- [ ] All tests pass
- [ ] Coverage maintained or improved
- [ ] No regressions
- [ ] TDD compliance (Red/Green/Refactor)

### For Review Reports (REV-XXX)

- [ ] Code follows style guidelines
- [ ] No obvious bugs
- [ ] Security checks passed
- [ ] Documentation adequate

### For Completion Reports (COMP-XXX)

- [ ] Tests passed
- [ ] Review approved
- [ ] PR created/merged
- [ ] Artifacts linked

## Findings

<!-- Issues, observations, results -->

## Metrics

| Metric | Value |
|--------|-------|
| Total | {{total}} |
| Passed | {{passed}} |
| Failed | {{failed}} |
| Coverage | {{coverage}}% |

## Verdict

<!-- Overall outcome and next steps -->
