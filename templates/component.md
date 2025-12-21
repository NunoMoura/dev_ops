# {{folder_name}}

> Architecture doc for `src/{{folder_path}}/`
>
> **Rule:** One doc per folder. Do not document individual files.

## Purpose

<!-- What does this component/module do? Why does it exist? -->

## Responsibilities

- Responsibility 1
- Responsibility 2
- Responsibility 3

## Folder Contents

| Item | Type | Purpose |
|------|------|---------|
| `subfolder/` | Directory | Description |
| `main.py` | File | Description |

## Dependencies

| Depends On | Relationship |
|------------|--------------|
| `../other_folder/` | Uses for X |

## Dependents

| Depended By | Relationship |
|-------------|--------------|
| `../consumer/` | Consumes X |

## Public Interface

<!-- Key exports, entry points, or API surface -->

```python
# Example exports
from .main import process_data
```

## Architectural Decisions

<!-- ADRs for decisions affecting THIS folder -->

### ADR-001: Decision Title

**Date:** YYYY-MM-DD
**Status:** Accepted | Superseded | Deprecated

**Context:** Why was a decision needed?

**Decision:** What was decided?

**Consequences:** What are the implications?

---

## Related Artifacts

- PRD-XXX: Product context
- FEAT-XXX: Feature that introduced this
- PLN-XXX: Implementation plan
