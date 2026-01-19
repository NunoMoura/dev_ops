---
id: "{{id}}"           # PLN-XXX - auto-generated
title: "{{title}}"     # Short descriptive title
type: plan
lifecycle: ephemeral   # Archived with task on Done
date: "{{date}}"       # Creation date (YYYY-MM-DD)
status: Draft          # Draft | Active | Complete
task: ""               # Parent task (e.g., TASK-001)
upstream: []           # Documentation and research (e.g., DOC-XXX, RES-XXX)
---

# {{id}} - {{title}}

## Goal

<!-- High-level objective - what we're building and why -->

## Checklist

<!-- Agent works through these sequentially. Types: code, test -->
<!-- Note: Doc updates were done in Documenting phase -->

- [ ] **[test]** Description of test to add
  - Files: `tests/path/test_file.py`
- [ ] **[code]** Description of code change
  - Files: `path/to/file.py`

## Acceptance Criteria

<!-- How we know we're done -->
-

## Verification

<!-- Commands to run, manual checks -->
- Tests: `pytest tests/`
- Lint: `ruff check .`
