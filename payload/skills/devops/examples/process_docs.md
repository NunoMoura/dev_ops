# Process Documentation Examples

These examples demonstrate how to create process-related documentation to ensure project quality and consistency.

## 1. Project Standards

**Trigger**: "Define the project standards"
**Template**: `assets/project_standards.md`
**Output Path**: `.dev_ops/docs/project_standards.md`

```markdown
---
id: project-standards
title: "Project Standards"
type: project-standards
date: 2023-11-15
storage: ".dev_ops/docs/"
---

# Project Standards

Governing principles and standards for the project.

---

## Vision

A robust, CLI-first DevOps agent that integrates seamlessly with VS Code to automate the entire software development lifecycle.

---

## Project Standards

- **Architecture**: CLI tools must be stateless and idempotent.
- **Process**: All changes must be driven by a task ticket.
- **Quality**: No console logs in production code.

---

## Tech Stack

| Category | Choice |
|----------|--------|
| Language | TypeScript |
| Runtime  | Node.js (Latest LTS) |
| CLI Lib  | Commander.js |
| Testing  | Jest |

---

## Quality Standards

- **Linting**: ESLint with standard config.
- **Testing**: 80% minimum coverage for core services.
- **Reviews**: One approval required for merge.

---

## Anti-Patterns

- **Global State**: Do not use global variables for session state; pass context explicitly.
- **Hardcoding**: No hardcoded paths; use the config service.
```

## 2. Pull Request (PR)

**Trigger**: "Create a PR description for this task"
**Template**: `assets/pr_template.md`
**Output Path**: (Used as PR body)

```markdown
---
id: PR-042
title: Add rate limiting to API
type: pr
date: 2023-11-20
task: TASK-101
trigger: FEAT-RATE-LIMIT
---

# PR-042 - Add rate limiting to API

## Summary

Implemented a sliding window rate limiter using Redis to prevent API abuse.

## Changes

### Added
- `src/middleware/rateLimiter.ts`: New middleware function.
- `src/services/redis.ts`: Redis client wrapper.

### Changed
- `src/server.ts`: Applied rate limiter to `/api` routes.
- `package.json`: Added `ioredis` dependency.

## Testing

- [x] Tests pass (`npm test`)
- [x] Manual verification: Spammed API with curl, verified 429 response after 100 reqs.

## Breaking Changes

None.

## Task Link
Read the task for full context: TASK-101
```
