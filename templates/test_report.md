---
id: "{{id}}"           # TST-XXX - auto-generated
title: "{{title}}"     # Test report title
type: test_report
status: "{{status}}"   # pass | fail | partial
task: "{{task}}"       # TASK-XXX being tested
upstream: []           # Artifacts tested
downstream: []         # BUG-XXX if failures
---

# {{id}} - {{title}}

## Summary

| Metric | Value |
|--------|-------|
| Task | {{task}} |
| Status | {{status}} |
| Total Tests | {{total}} |
| Passed | {{passed}} |
| Failed | {{failed}} |
| Coverage | {{coverage}}% |

## Test Results

### Passed Tests

<!-- List passed tests -->

### Failed Tests

<!-- Each failure should generate a BUG-XXX -->

| Test | Error | Bug |
|------|-------|-----|
| test_name | Error message | BUG-XXX |

## Files Tested

```markdown
tests/
├── module/test_file.py
└── e2e/test_integration.py
```

## Next Steps

- [ ] Fix failures (see linked BUG-XXX)
- [ ] Re-run test suite
- [ ] Move task to Done when passing
