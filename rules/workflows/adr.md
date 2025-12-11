---

activation_mode: Model Decides
description: Standards and process for creating an Architectural Decision Record (ADR) Project Artifact.

---

# ADR Policy

Architectural Decision Records (ADRs) are immutable **Project Artifacts** that record significant design decisions.

## When to use

* Significant structural changes.
* Choice of technology or library.
* Change in patterns or standards.

## Workflows

* **Create**: Use `workflows/create_adr.md` to start a new decision.
* **Supersede**: Use `workflows/supersede_adr.md` to replace an old decision.

## Lifecycle

1. **Active**: The current source of truth.
2. **Superseded**: Replaced by a newer ADR (must link to it).
3. **Rejected**: Proposed but not accepted.

> [!IMPORTANT]
> **Immutable**: Once accepted, do not change the content. Supersede it instead.
