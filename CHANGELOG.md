# Changelog

All notable changes to the DevOps Framework will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Health check script (`scripts/health_check.py`)
- PR triage workflow automation (`.github/workflows/pr_triage.yml`)
- Additional tests for `doc_ops.py` and `setup_ops.py`
- Version info in `__init__.py` (`__version__ = "1.0.0"`)
- Unified `debug.md` workflow (replaces `fix_bug.md` and `fix_build.md`)

### Changed

- CI workflow now triggers on push and pull requests
- Standardized vendoring path to `vendor/dev_ops_core`

### Fixed

- Broken test imports (shared_utils → utils)
- `sanitize_slug` now handles empty/None inputs
- README.md accuracy (dynamic rule generation)
- Documentation workflow references

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
