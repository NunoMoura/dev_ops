<p align="center">
  <img src="docs/images/logo.png" alt="DevOps Logo" width="120" />
</p>

# DevOps Framework

[![CI](https://github.com/NunoMoura/dev_ops/actions/workflows/ci.yml/badge.svg)](https://github.com/NunoMoura/dev_ops/actions/workflows/ci.yml)

---

## Why this Framework?

Most AI coding tools rely on **single-shot prompts** or **centralized specs** that quickly go out of date. This framework takes a different approach:

### 1. Co-located Specs (vs Centralized)

Unlike tools that force you to maintain a massive central design document (`spec_kit`), we place `SPEC.md` files **inside the component folders** they describe.

- **Benefit**: Documentation never drifts from code. Reliability increases as the codebase grows.
- **Benefit**: Agents can "drill down" into specific components without loading the entire project context.

### 2. Stateful Workflow (vs Stateless Chains)

Instead of stateless agent loops, we track work on the **DevOps Board**.

- **Benefit**: Work persists across sessions. You can pause, review, and resume complex tasks.
- **Benefit**: Every task has a clear lifecycle: `Backlog` → `Plan` → `Build` → `Verify` → `Done`.

### 3. Active Skills

Agents don't just write code; they follow **Phase Skills**. A "Build" agent behaves differently from a "Plan" agent, ensuring focus and quality.

---

## Quick Start

```bash
# 1. Install extension in your IDE
cursor --install-extension dev-ops.vsix
# or: antigravity --install-extension dev-ops.vsix

# 2. Open project and initialize
# Cmd/Ctrl+Shift+P → "DevOps: Initialize"

# 3. Run bootstrap to analyze project
/bootstrap
```

---

## Phase Flow

Every task moves through a **6-phase workflow**:

```markdown
┌─────────┬───────────┬──────┬───────┬────────┬──────┐
│ Backlog │ Understand│ Plan │ Build │ Verify │ Done │
└─────────┴───────────┴─────────────┬────────┬──────┘
```

| Phase | Purpose | Skill |
|-------|---------|-------|
| **Understand** | Research, scope, align | `understand_phase` |
| **Plan** | Create implementation plan | `plan_phase` |
| **Build** | TDD implementation | `build_phase` |
| **Verify** | Test, document, PR | `verify_phase` |

> [!TIP]
> **New**: Use `find . -name SPEC.md` to navigate component specs.

---

## Skills

Skills are **detailed instructions** that guide agents through each phase. Located in `.agent/skills/`.

### Phase Skills

| Skill | Description | Key Output |
|-------|-------------|------------|
| `understand_phase` | Deep research before planning | RES-XXX research doc |
| `plan_phase` | Create detailed implementation plan | PLN-XXX plan doc |
| `build_phase` | TDD implementation with tests first | Production-ready code |
| `verify_phase` | Validate, document proof, ship PR | Walkthrough + PR |

### Using Skills

Agents automatically activate skills based on task phase. Each skill contains:

```markdown
.agent/skills/<phase>_phase/
├── SKILL.md         # Detailed instructions
└── examples/        # Reference implementations
```

To manually reference a skill:

```bash
view_file .agent/skills/understand_phase/SKILL.md
```

---

## Workflows

Workflows are **slash commands** for common operations. Located in `.agent/workflows/`.

### Available User Slash Commands (Workflows)

| Command | Description | Category |
|---------|-------------|----------|
| `/bootstrap` | Analyze project, generate tasks and rules | Setup |
| `/claim` | Claim task from backlog | Task |
| `/create_task` | Create a new task | Task |
| `/add_feature` | Create feature spec and decompose to tasks | Planning |
| `/report_bug` | Create bug report | Planning |

| `/triage_comment` | Analyze and act on PR comment | Review |
| `/add_mcp` | Add MCP server to skill phase | Extension |

### Workflow Examples

**Start working on a project:**

```bash
/bootstrap                    # Analyze and generate task backlog
/claim                        # Pick highest priority task
# Agent follows phase flow automatically
```

**Add new work:**

```bash
/add_feature "User dashboard"  # Creates FEAT-XXX, decomposes to tasks
/report_bug "Login timeout"    # Creates BUG-XXX for tracking
/create_task "Refactor auth"   # Direct task creation
```

---

## Templates

Templates ensure consistent documentation. Located in `.dev_ops/templates/`.

### Artifact Templates (Ephemeral)

| Template | Purpose | Created By |
|----------|---------|------------|
| `research.md` | Research findings | Understand phase |
| `plan.md` | Implementation plan | Plan phase |
| `pr.md` | Pull request description | Verify phase |
| `task.md` | Task structure | `/create_task` |
| `bug.md` | Bug report format | `/report_bug` |

### Doc Templates (Persistent)

| Template | Purpose | Created By |
|----------|---------|------------|
| `prd.md` | Product requirements | Bootstrap (if missing) |
| `nonnegotiables.md` | Project constraints | Bootstrap (if missing) |
| `architecture_doc.md` | Component documentation | Bootstrap scaffold |
| `story.md` | User story format | `/add_feature` |
| `user.md` | User persona | `/add_feature` |
| `mockup.md` | UI mockup documentation | `/add_feature` |

---

## Project Structure

After initialization:

```markdown
your-project/
├── .agent/                    # Agent configuration
│   ├── rules/                 # Always-on behavioral rules
│   │   └── dev_ops_guide.md   # Core framework guide
│   ├── skills/                # Phase-specific instructions
│   │   ├── understand_phase/
│   │   ├── plan_phase/
│   │   ├── build_phase/
│   │   └── verify_phase/
│   └── workflows/             # Slash commands
│       ├── bootstrap.md
│       ├── claim.md
│       └── ...
└── .dev_ops/                  # DevOps data
    ├── board.json             # Task board state
    ├── scripts/               # CLI tools
    ├── templates/             # Document templates
    ├── docs/                  # Project documentation
    │   ├── prd.md
    │   ├── nonnegotiables.md
    │   └── architecture/
    └── archive/               # Completed task archives
```

---

## The Dev Cycle

### 1. Initialize Project

```bash
/bootstrap
```

Analyzes your project:

- Detects tech stack (languages, frameworks, linters)
- Creates tasks for missing docs (PRD, Project Standards)
- Generates rules for detected technologies
- Scaffolds architecture documentation

### 2. Work on Tasks

```bash
/claim TASK-001  # Or just /claim for highest priority
```

Agent follows phase flow:

1. **Understand** → Research, create RES-XXX
2. **Plan** → Design solution, create PLN-XXX
3. **Build** → TDD implementation
4. **Verify** → Test, create walkthrough, PR

### 3. Review & Merge

Agent creates PR with:

- Summary of changes
- Link to walkthrough
- Test results

---

## Core Rules

The framework enforces key principles via `.agent/rules/dev_ops_guide.md`:

- **Quality over speed** — Understand before you build
- **One session = one phase** — End at exit criteria, user triggers next
- **Tasks = pointers** — Reference docs, don't duplicate them
- **Check non-negotiables** — Verify alignment before major changes

---

## CLI Reference

Agents use the bundled Node.js CLI to interact with the framework:

```bash
# Task operations
node .dev_ops/scripts/devops.js create-task --title "..." --priority high --column col-backlog
node .dev_ops/scripts/devops.js bootstrap

# Help
node .dev_ops/scripts/devops.js --help
```

---

## Custom Rules

Add project-specific rules to `.agent/rules/`:

```markdown
---
activation_mode: Always On
description: Project coding standards
---

# Coding Standards

- Use type hints for all functions
- Maximum 100 lines per file
- All new code requires tests
```

---

## Development

### Build Extension

```bash
cd extension
npm install
npm run compile         # Dev build
npm run package         # Production VSIX
```

### Run Tests

```bash

# TypeScript
cd extension && npm test
```

---

## License

MIT License - see [LICENSE](./LICENSE)
