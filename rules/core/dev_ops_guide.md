# 🚀 DevOps Framework Guide

Welcome to the DevOps Framework! This guide explains how to interact with the system, which is designed to help you build, maintain, and document your project efficiently.

## 🧠 Philosophy

The framework divides agent capabilities into two clear categories:

1. **Policy Rules** (`.agent/rules/`):
    * **Purpose**: Define *standards*, *context*, and *decision-making policies*.
    * **Usage**: The Agent references these to understand "definitions of done", relationships between **Project Artifacts** (Plans, ADRs), and quality standards.
    * **Examples**: `quality.md`, `implementation.md`, `backlog.md` (policy).

2. **Workflows** (`.agent/workflows/`):
    * **Purpose**: Define precise, *actionable steps* to perform a task.
    * **Usage**: The Agent follows these instructions to execute a command (e.g., creating a doc, running tests).
    * **Examples**: `create_plan.md`, `verify.md`, `audit_code.md`.

## 📁 Directory Structure

* **`.agent/`**: (Installed Rules & Workflows)
  * **`rules/`**:
    * **`core/`**: General policies (`quality.md`, `implementation.md`).
    * **`workflows/`**: Policy rules for specific domains (`backlog.md`, `research.md`).
  * **`workflows/`**: Actionable checklist files (`create_plan.md`, `verify.md`).
* **`dev_ops/`**:
  * **`scripts/`**: Automation scripts (`doc_ops.py`, `setup_ops.py`).
  * **`docs/`**: **Project Artifacts** (`plans/`, `research/`, `adrs/`, `backlog.md`).

## 🛠️ Available Workflows

You can trigger these by name or intent:

### Core Actions

* **Audit Code**: `workflows/audit_code.md` (Agentic Review)
* **Verify**: `workflows/verify.md` (Verification)
* **Debug**: `workflows/debug.md` (Fix Bugs/Builds)
* **Brainstorm**: `workflows/brainstorm.md` (Ideation)
* **Implement**: `workflows/implement_plan.md` (Coding)

### Document Operations

* **Create Plan**: `workflows/create_plan.md`
* **Create Research**: `workflows/create_research.md`
* **Report Bug**: `workflows/report_bug.md`
* **Create ADR**: `workflows/create_adr.md`
* **Add to Backlog**: `workflows/create_backlog_item.md`

### PR & Feedback

* **Check PR**: `workflows/check_pr.md` (Local Pre-flight)
* **Create PR**: `workflows/create_pr.md`
* **Triage Feedback**: `workflows/triage_feedback.md`

## 🔗 How It Works

1. **Context**: The Agent reads **Rules** to understand *what* good looks like.
2. **Action**: The Agent selects a **Workflow** to execute the task step-by-step.
3. **Automation**: Workflows often call **Scripts** in `dev_ops/scripts/` to do the heavy lifting.

Use this system to keep your project organized and your code high-quality!
