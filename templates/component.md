# {{folder_name}}

> **Path:** `src/{{folder_path}}/`
> **Tests:** `tests/{{folder_path}}/`

## Purpose

<!-- What does this component/module do? Why does it exist? -->

## Context

Artifacts that informed this component:

| Type | Artifacts | Description |
|------|-----------|-------------|
| Research | [[RES-XXX]] | Investigation findings |
| Plans | [[PLN-XXX]] | Implementation guidance |
| ADRs | [[ADR-XXX]] | Architectural decisions |

## Implementation

How this component was built:

| Status | Task | Description |
|--------|------|-------------|
| Created | [[TASK-XXX]] | Initial implementation |
| Modified | [[TASK-XXX]] | Added feature X |

Related features (user-facing changes):

- [[FEAT-XXX]]: Feature description

## Verification

| Type | Artifacts | Description |
|------|-----------|-------------|
| Tests | [[TST-XXX]] | Test report |
| Reviews | [[REV-XXX]] | Code review |

## Public Interface

<!-- Key exports, entry points, or API surface -->

```python
# Example exports
from .main import process_data
```

## Dependencies

| Depends On | Relationship |
|------------|--------------|
| `../other_folder/` | Uses for X |

## Dependents

| Depended By | Relationship |
|-------------|--------------|
| `../consumer/` | Consumes X |

## Folder Contents

| Item | Type | Purpose |
|------|------|---------|
| `subfolder/` | Directory | Description |
| `main.py` | File | Description |
