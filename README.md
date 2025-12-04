# Dev_Ops Framework

**An Agentic Framework for High-Quality Software Development.**

The `dev_ops` framework is a collection of tools, workflows, and conventions designed to bridge the gap between Human Developers and AI Agents. It treats **Code as the Source of Truth** and provides a "Hybrid" interface for interaction.

## 🚀 Core Philosophy

1. **Code as Source of Truth**: Documentation is generated from code, or lives alongside it. The implementation is the ultimate truth.
2. **Hybrid Interaction**: Tools are accessible via **CLI** (for humans), **Import** (for local agents), and **MCP** (for remote agents).
3. **Atomic Commands**: Complex tasks are broken down into deterministic, single-responsibility scripts.

## 📦 Installation

### One-Line Install (Recommended)

Use our installer script to automatically detect `uv`, `pipx`, or `pip`:

```bash
curl -fsSL https://raw.githubusercontent.com/your-org/dev_ops/main/install.sh | bash
```

### Manual Install

Or install directly via pip:

```bash
pip install git+https://github.com/your-org/dev_ops.git
```

**Usage:**

```bash
# Run a command
python3 -m dev_ops.commands.log_issue --title "Fix bug"

# Import in your scripts
from dev_ops.commands.log_issue import log_issue
```

### Option 2: Vendoring (For Customization)

Copy the `dev_ops` directory into your project root if you need to heavily modify the workflows or commands for your specific context.

## 🛠️ Features

### 1. Issue Management

Lightweight, file-based issue tracking that lives in your repo.

* `log_issue`: Create tasks/bugs.
* `list_issues`: View backlog.
* `resolve_issue`: Close tasks.

### 2. CI/CD Integration

Local pre-flight checks that mirror your CI pipeline.

* `ci_check`: Run linting, testing, and TODO scanning.
* `deploy`: Trigger deployments with safety checks.

### 4. Architecture Decisions

Document the "Why" behind your technical choices.

* `create_adr`: Create a new Architecture Decision Record.

### 3. Agentic Workflows

Standard Operating Procedures (SOPs) for AI agents and developers.

* See `dev_ops/workflows/` for guides on Auditing, Testing, and more.

## 🤖 AI Agent Integration

This framework is **MCP-Native**. You can expose all commands to an MCP-compliant agent (like Claude Desktop or an IDE Agent) by running:

```bash
mcp run dev_ops/mcp_server.py
```

See `dev_ops/templates/agents.md` for detailed agent instructions.
