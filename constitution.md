---
id: constitution
title: "DevOps Framework Constitution"
type: constitution
lifecycle: persistent
date: "2024-12-25"
prd: "PRD-001"
---

# Project Constitution

Governing principles derived from PRD + user input.
Checked during Researching phase alignment.

## Derived From

PRD: PRD-001 - DevOps Framework for AI Agent Development

---

## Vision

A document-first development framework enabling AI agents to produce
high-quality, consistent code through a 6-phase Kanban workflow.

> **Exceptional code starts with exceptional documentation.**

---

## Non-Negotiables

- **Document-first**: Documents define goals; code is the manifestation
- **Document coherence**: All docs must be consistent with each other
- **6-phase flow**: Every task progresses through all phases
- **Artifact production**: Each phase produces its standardized artifact
- Alignment verification: Technical and project alignment checked in Understand phase
- **Typed checklists**: PLN items have types (code, test)
- **Minimal TASK**: TASK cards contain pointers only, content lives in artifacts
- **Backward moves allowed**: Return to previous phases when gaps are discovered
- **Spawn for blockers**: Unrelated blockers become new tasks

---

## Artifact Lifecycle

| Type | Examples | Behavior |
|------|----------|----------|
| **Persistent** | Architecture docs, constitution | Updated across tasks |
| **Ephemeral** | TASK, RES, PLN, VAL | Archived on Done |

---

## Tech Stack

| Category | Choice |
|----------|--------|
| Language | Python 3.11+, TypeScript 5.x |
| Framework | VS Code Extension API |
| Database | JSON files (board.json, artifacts) |
| Testing | pytest (Python), vitest (TypeScript) |
| Deployment | VSIX package |

---

## Quality Standards

- **Linting**: ruff for Python, eslint for TypeScript
- **Formatting**: Consistent with project config
- **Test Coverage**: Critical paths must be tested
- **Validation**: VAL-XXX artifact required before PR
- **Documentation**: All public APIs and architecture decisions documented

---

## Security

- No hardcoded secrets in code or artifacts
- No sensitive data (passwords, tokens) in templates
- Input validation on all CLI commands
- Safe file operations (validate paths)

---

## Performance

| Metric | Target |
|--------|--------|
| Task completion rate | 95% |
| Artifact quality score | 95% |
| Context handoff success | 100% |
| Alignment violations | 0 |

---

## Patterns

- **Minimal TASK**: Pointer only, all content in RES/DOC/PLN/VAL artifacts
- **TDD embedded**: Tests defined in planning, written before implementation
- **Typed Checklist**: Every PLN item tagged as [code] or [test]
- **Dual Alignment**: Technical (docs↔code) + Project (constitution↔work)
- **Artifact handoff**: Each phase's output is next phase's input
- **Inline ADRs**: Decisions documented in architecture docs `## Decisions` section
- **Conflict spawning**: Blockers create new tasks, never move backward

---

## Anti-Patterns

- Writing code without updating documentation
- Skipping phases in the workflow
- Duplicating content between TASK and PLN artifacts
- Untyped checklist items in plans
- PRs without VAL-XXX validation artifact
- Implementation without PLN checklist
- Moving tasks backward instead of spawning new tasks
