# Changelog

All notable changes to the DevOps Framework will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.2] - 2026-02-15

### Added

- **Automated PR Creation**: Automatically creates a GitHub PR when a task is marked as done, using the verification walkthrough as the body.
- **Context Hydration**: Automatically detects and attaches relevant project documentation (README, PRD, Specs) to the task context when claiming a task.
- **Task-Commit Integration**: New command `DevOps: Insert Task ID in Commit Message` to link commits to tasks.
- **Enhanced Task Editor**:
  - Implementation Plan approval workflow (moves task to Implement phase).
  - Dynamic status visualization with color-coded chips.
  - Rich metadata display (Owner, Agent, Model).
- **Board Automation**:
  - Automatic task promotion from Backlog to Understand phase upon claiming.

### Fixed

- Fixed checklist item indentation and editing issues in Task Editor.
- Removed deprecated chat feature from Task Editor.

## [0.0.1] - 2026-01-19


### Added

- **Initial Beta Release**:
  - **RLM-Powered Documentation Navigation**:
    - New `doc_ops.py scope` command for docs-to-code navigation.
    - Integrated with `understand` and `plan` for intelligent agent scoping.
    - Automatic dependency traversal and impact analysis.
  - **Dynamic Board System**:
    - `board_ops.py` refactored to use `columns.json` for custom workflow definitions.
    - 6-phase default workflow: Backlog → Understand → Plan → Build → Verify → Done.
    - Full task tracking with priority, status, and artifact linking.
  - **Project Context & Automation**:
    - Bootstrap workflow for project stack detection and task generation.
    - Rule templates for common languages, linters, and libraries.
    - GitHub CLI integration for automated PR creation and triage.
  - **Agent Intelligence**:
    - Phase-specific instructions (Skills) for high-quality autonomous work.
    - REPL-like refinement loop via `/refine` and `/retry`.
  - **Developer Tools**:
    - Agent Checklist system for fine-grained task progress.
    - Task splitting (`board_ops.py replace --with`) for complex work decomposition.
    - Metrics dashboard and task editor in the IDE.

### Changed

- **Code Modernization**:
  - Python 3.10+ requirement for native union types and improved reliability.
  - Consolidated all document operations into `doc_ops.py`.
  - Simplified and hardened extension installer logic.

[0.0.2]: https://github.com/NunoMoura/dev_ops/releases/tag/v0.0.2
[0.0.1]: https://github.com/NunoMoura/dev_ops/releases/tag/v0.0.1
