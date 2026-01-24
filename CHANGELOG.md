# Changelog

All notable changes to the DevOps Framework will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.0.1]: https://github.com/NunoMoura/dev_ops/releases/tag/v0.0.1
