# Changelog

All notable changes to the DevOps Framework will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **Major restructure**: Separated user commands from agent procedures
  - Workflows reduced from 24 to 8 (user-facing only)
  - Phase rules enriched with full procedure guidance
  - Agent now guided by phase rules, not command invocation
- User commands now focus on board management:
  `/create_task`, `/list_tasks`, `/pick_task`, `/claim_task`,
  `/complete_task`, `/report_bug`, `/triage_feedback`, `/bootstrap`
- README.md rewritten to reflect new mental model

### Removed

- 16 agent-internal workflows (merged into phase rules):
  `implement_plan`, `create_plan`, `research`, `brainstorm`, `create_adr`,
  `supersede_adr`, `debug`, `fix_bug`, `fix_build`, `verify`, `create_commit`,
  `create_pr`, `check_pr`, `audit_code`, `test_task`, `link_artifact`
- `quality_policy.md` (consolidated into phase_testing and phase_inprogress)

### Fixed

- Stale workflow references in remaining files
- Documentation accuracy

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
