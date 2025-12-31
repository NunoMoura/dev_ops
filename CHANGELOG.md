# Changelog

All notable changes to the DevOps Framework will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Extension v0.6.0 Features**:
  - Board Templates (Greenfield/Brownfield) with starter tasks
  - Initialize command prompts for template selection
  - Phase rule alignment (`phase_implementing.md`, `phase_review.md`)
  - Onboard Agent button with improved prompt
  - Settings gear icon in sidebar
- **Extension v0.5.x Features**:
  - Task Editor Tabs - Double-click task opens in editor tab
  - Metrics Dashboard sidebar (replaces Task Details)
  - Auto-save for task edits (no Save button)
  - Clickable cards (removed Open button)
  - Agent Checklist CLI (`board_ops.py checklist add/complete/list`)
  - Task Replace CLI (`board_ops.py replace --with`)
- **Code Quality**:
  - `pyproject.toml` for modern Python packaging with ruff and pytest config
  - `.pre-commit-config.yaml` for automated code quality checks
  - `CONTRIBUTING.md` guide for contributors
  - Comprehensive test coverage for `utils.py`, `project_ops.py`, `health_check.py`
  - Type hints throughout `project_ops.py`
  - Custom exceptions (`CommandError`, `FileExistsError`) in `utils.py`
- **Audit Fixes (2025-12-19)**:
  - New test files: `test_pr_ops.py`, `test_template_ops.py` (100% script coverage)
  - Added `pytest-cov` to dev dependencies for coverage reporting
  - CI workflow now includes coverage reporting and extension build job
  - Refactored `pr_ops.py` with proper exceptions (`GitHubCLIError`,
    `GitHubCLINotFoundError`) instead of `sys.exit`
  - Added `test` to `doc_ops.py` list command choices
  - Removed duplicate `argparse` import in `board_ops.py`
- **Audit Improvements (2025-12-19)**:
  - New `sync_version.py` script for version consistency checks
  - New `test_integration.py` with end-to-end workflow tests
  - CI now runs extension tests with `xvfb-run`
  - Added CI and Codecov badges to README
  - Extended CONTRIBUTING.md with Extension Development section
  - Updated `actions/checkout` to v4 in `pr_triage.yml`
  - Changed "Feature Title" prompt to "Task Title" in `pr_ops.py`

### Changed

- **Major restructure**: Separated user commands from agent procedures
  - Workflows reduced from 24 to 8 (user-facing only)
  - Phase rules enriched with full procedure guidance
  - Agent now guided by phase rules, not command invocation
- **Product Polish**:
  - Synchronized Board model (7 columns) across all scripts and extension
  - Restored dynamic rule templates for Languages, Linters, and Libraries
  - Normalized artifact directory structure (no more `dev_ops/docs/` prefix)
  - Improved `health_check.py` to validate new architecture
  - Enhanced `project_ops.py` stack detection performance
  - Updated README diagram and workflow paths
- User commands now focus on board management:
  `/create_task`, `/list_tasks`, `/pick_task`, `/claim_task`,
  `/complete_task`, `/report_bug`, `/triage_feedback`, `/bootstrap`
- README.md rewritten to reflect new mental model
- **Audit Fixes**:
  - Standardized artifact prefixes: `PLN-XXX` (was PLAN), `RES-XXX` (was RESEARCH)
  - Updated all templates to use consistent ID formats
  - Improved error handling in `utils.py` (exceptions instead of sys.exit)
  - Added `quiet` parameter to `write_file()` and `run_command()`
  - Fixed extension README column name (Testing, not Review)
  - Added `board_ops` to scripts module exports

### Removed

- 16 agent-internal workflows (merged into phase rules):
  `implement_plan`, `create_plan`, `research`, `brainstorm`, `create_adr`,
  `supersede_adr`, `debug`, `fix_bug`, `fix_build`, `verify`, `create_commit`,
  `create_pr`, `check_pr`, `audit_code`, `test_task`, `link_artifact`
- `quality_policy.md` (consolidated into phase_testing and phase_inprogress)
- `feature` type from `doc_ops.py` (unused)
- `features/` directory from artifact structure
- Non-existent `task_ops` module reference

### Fixed

- Stale workflow references in remaining files
- Documentation accuracy
- VSIX path in `setup_ops.py`
- "Titan Kanban" references updated to "DevOps"
- Extension file watcher no longer watches removed `features/` directory
- Duplicate `os.makedirs` call in `setup_ops.py`
- CI lint step now reports warnings properly

## [1.0.0] - 2025-12-16

### Added

- Initial production release
- Core framework with hybrid human-agent workflow
- Document management: Bugs, ADRs, Plans, Research, Backlog
- 17 workflow templates
- Rule templates for Languages, Linters, Libraries
- Bootstrap script for project setup
- PR operations and triage workflow
- CI pipeline with multi-platform testing

### Core Features

- Slash command interface (`/bug`, `/plan`, `/adr`, etc.)
- Dynamic rule generation based on project detection
- Document artifact relationships (see README diagram)
- Git operations helper scripts

[Unreleased]: https://github.com/NunoMoura/dev_ops/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/NunoMoura/dev_ops/releases/tag/v1.0.0
