---
title: "Doc 1"     # Descriptive document title
type: doc
lifecycle: persistent  # Documents are persistent across tasks
path: ""       # Path to the thing being documented
status: undocumented   # undocumented | draft | complete
coverage: 0            # Test coverage percentage (0-100)
---

# Doc 1

## Purpose

<!-- What does this document describe? Why does it exist? -->

## Overview

<!-- High-level summary of the component, feature, or concept -->

## Public Interface

<!-- Key exports, entry points, or API surface -->

```python
# Example interface
```

## Dependencies

| Depends On | Relationship |
|------------|--------------|
| — | — |

## Implementation Notes

<!-- Design decisions, gotchas, or future improvements -->

## Decisions

<!-- Inline ADRs for non-trivial decisions -->

### ADR-001: [Decision Title]

**Context**: Why this decision was needed
**Decision**: What was decided
**Consequences**: Trade-offs accepted

## Test Coverage

<!-- Tests for this component - keeps tests documented alongside the code they test -->

| Test | Status | Notes |
|------|--------|-------|
| `test_example_happy_path` | ⬜ | — |
| `test_example_error_handling` | ⬜ | — |

**Coverage**: {{coverage}}%
**Last Verified**: {{date}}
