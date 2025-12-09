---
activation_mode: always
description: The master guide to the DevOps Framework, explaining its structure and rules.
globs: "*"
---

# 🚀 DevOps Framework Guide

Welcome to the DevOps Framework! This guide explains how to interact with the system, which is designed to help you build, maintain, and document your project efficiently.

## 🧠 Philosophy

The framework divides agent capabilities into two categories:

1. **Workflows** (Human-Driven): Complex, multi-step processes where *you* (the user) initiate an action, and the agent guides you through a template (e.g., logging a bug, creating an architecture decision).
2. **Scripts** (System-Driven): Atomic utilities that the *agent* can use autonomously to gather context, check hygiene, or perform bulk operations.

## 📂 Rule Naming Convention

All rules in `rules/` follow a strict prefix system to indicate their purpose:

| Prefix | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| **`cmd_workflow_`** | **Workflow** | Actionable commands for users. Usually creates documentation or code. | `cmd_workflow_bug.md` (`/bug`) |
| **`cmd_script_`** | **Script** | Utilities for the Agent. Used for context or maintenance. | `cmd_script_context.md` |
| **`lang_`** | **Language** | Patterns and tools specific to a programming language. | `lang_python.md` |
| **`file_`** | **File Type** | Patterns for specific file types or components. | `file_models.md` |

## 🛠️ Available Commands

### User Workflows (Interactive)

* **/bug**: Log a new bug. (`rules/cmd_workflow_bug.md`)
* **/adr**: Record an architectural decision. (`rules/cmd_workflow_adr.md`)
* **/feature**: Plan a new feature. (`rules/cmd_workflow_feature.md`)
* **/plan**: Create an execution plan. (`rules/cmd_workflow_plan.md`)
* **/research**: Document research or experiments. (`rules/cmd_workflow_research.md`)

### Agent Utilities (Autonomous)

* **Context**: "Summarize the project structure." -> Uses `scripts/shared_utils/project_summary.py`.
* **Maintenance**: "Check for stale docs." -> Uses `scripts/workflow_utils/check_doc_date.py`.

## 📁 Directory Structure

* **`.agent/`**: Contains the rules and internal logic.
* **`dev_docs/`**: Where your documentation lives (`adrs`, `bugs`, `plans`, `research`).
* **`scripts/`**: Python scripts powering the framework.
  * `workflow_utils/`: Tools used by Workflows.
  * `shared_utils/`: Core libraries and bootstrap logic.

Use this guide to navigate the system and leverage the right tool for the job!
