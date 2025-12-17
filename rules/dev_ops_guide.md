---
activation_mode: Always On
description: Core DevOps Framework guide - index to available rules and workflows.
---

# DevOps Framework Guide

This project uses the **DevOps Framework** for task-centric development.

## Quick Reference

| Need | Rule/Workflow |
|------|---------------|
| Manage tasks | Load `kanban_policy.md` or use `/list_tasks` |
| Check quality | Load `quality_policy.md` or use `/verify` |
| Create artifacts | Load `artifact_standards.md` |
| Any workflow | Use `/command` syntax in chat |

## Core Concepts

1. **Task = Unit of Planned Work** — Only create tasks in planning mode
2. **Fast Mode = Direct Execution** — Small tasks done directly
3. **Artifacts are Linked** — Outputs in `dev_ops/`, linked to tasks

> [!TIP]
> See `kanban_policy.md` for when to create tasks vs. direct execution.

## Directory Structure

```text
.agent/rules/          # Load with @ mention
.agent/workflows/      # Trigger with /command
dev_ops/kanban/        # Task board (board.json)
dev_ops/plans/         # Implementation plans
dev_ops/research/      # Research documents
dev_ops/adrs/          # Architecture Decision Records
```

## Available Rules

Load these with `@rule_name` when needed:

| Rule | When to Load |
|------|--------------|
| `kanban_policy` | Managing tasks, picking work, multi-agent coordination |
| `quality_policy` | Before merging, code review, testing requirements |
| `artifact_standards` | Creating docs, linking artifacts, frontmatter format |

## Common Workflows

| Category | Commands |
|----------|----------|
| Tasks | `/add_task`, `/pick_task`, `/claim_task`, `/complete_task` |
| Planning | `/create_plan`, `/implement_plan`, `/brainstorm` |
| Quality | `/verify`, `/audit_code`, `/debug` |
| Docs | `/research`, `/create_adr`, `/report_bug` |
| Git | `/create_commit`, `/create_pr`, `/check_pr` |
