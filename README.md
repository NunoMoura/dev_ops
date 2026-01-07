# DevOps Framework

Board-based workflow management for AI-native development*

[![CI](https://github.com/NunoMoura/dev_ops/actions/workflows/ci.yml/badge.svg)](https://github.com/NunoMoura/dev_ops/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/NunoMoura/dev_ops/graph/badge.svg)](https://codecov.io/gh/NunoMoura/dev_ops)

---

## What is This?

A **lightweight project management system** designed for developers and PMs working with **AI coding agents** (Cursor, Antigravity, etc.). Manage tasks, track agent sessions, and maintain development context across multiple AI agents working on your codebase.

**Built specifically for**: Developers using Cursor or Antigravity IDE who want structured AI-assisted development.

**Not meant for**: Traditional manual task management, real-time team collaboration, or non-AI workflows.

---

## Quick Start

### Install (2 minutes)

**Prerequisites**: Cursor IDE or Antigravity IDE, Python 3.9+

```bash
# 1. Download latest VSIX
curl -LO https://github.com/NunoMoura/dev_ops/releases/latest/download/dev-ops.vsix

# 2. Install in your IDE
cursor --install-extension dev-ops.vsix
# or
antigravity --install-extension dev-ops.vsix

# 3. Open your project and initialize
# Cmd/Ctrl+Shift+P → "DevOps: Initialize"
# Select template: Greenfield (new project) or Brownfield (existing code)
```

**That's it!** Check the DevOps sidebar (activity bar) to see your board.

---

## Core Concepts

### The Board

Your project has a **6-phase board** to track all work:

```ma
┌─────────┬───────────┬──────┬───────┬────────┬──────┐
│ Backlog │ Understand│ Plan │ Build │ Verify │ Done │
└─────────┴───────────┴──────┴───────┴────────┴──────┘
```

- **Backlog**: Tasks waiting to start
- **Understand**: Research & context gathering
- **Plan**: Implementation planning
- **Build**: Code implementation  
- **Verify**: Testing & validation
- **Done**: Completed & merged

Tasks move through phases as agents complete work.

### Tasks

Work items tracked on your board:

```json
{
  "id": "TASK-001",
  "title": "Add user authentication",
  "phase": "plan",
  "priority": "high",
  "owner": {
    "type": "agent",
    "name": "Cursor",
    "sessionId": "abc123"
  }
}
```

Create via UI or chat: `/create_task "Your task here"`

### Artifacts

Agents create documents as they work:

- **RES-XXX**: Research findings
- **PLN-XXX**: Implementation plans  
- **VAL-XXX**: Validation reports

Automatically linked to tasks for full context.

---

## How It Works

### 1. You Create a Task

```bash
# In Cursor/Antigravity chat:
/create_task "Add OAuth login"

# Or use command palette:
# Cmd+Shift+P → "DevOps: Create Task"
```

### 2. Agent Picks the Task

```bash
/spawn_agent

# Framework:
# - Selects highest priority ready task
# - Loads relevant phase rules
# - Provides task context to agent
```

### 3. Agent Works Through Phases

Agent sees structured context:

```markdown
## Current Task: TASK-001 - Add OAuth login

## Phase: Understand
**Your job**: Research OAuth 2.0 implementation options

**Output**: Create RES-001 document with:
- OAuth provider comparison (Google, GitHub, Auth0)
- Security considerations
- Integration complexity

## Context Available:
- docs/architecture/auth.md
- Existing login implementation
```

### 4. Agent Produces Artifacts

Agent creates `RES-001-oauth-research.md`:

```markdown
---
id: RES-001
task: TASK-001
phase: understand
---

# OAuth 2.0 Research

## Providers Evaluated
1. **Google OAuth**: Best for...
2. **GitHub OAuth**: Recommended for...
...

## Security Checklist
- [ ] PKCE flow
- [ ] State parameter
...
```

### 5. Framework Updates Board

Automatically:

- Links RES-001 to TASK-001
- Records research completion
- Moves task to Plan phase
- Agent continues to next phase

---

## Workflows

### For Project Managers

```bash
# High-level planning
/create_project_defs "Q1 Feature Roadmap"

# Break into features  
/add_feature "User dashboard redesign"
# Agent decomposes into tasks automatically

# Prioritize on board
# Drag tasks (high priority to top)

# Monitor progress
# Check "Status" sidebar for metrics
```

### For Developers

```bash
# Claim a specific task
/claim_task TASK-042

# Or let agent pick best task
/spawn_agent

# Review agent's work
# Artifacts appear in .dev_ops/.tmp/artifacts/

# Provide feedback
/refine_phase "Also add password reset flow"
# Agent updates plan and continues
```

### Multi-Agent Coordination

Framework prevents conflicts:

```bash
# Agent 1 (Cursor) claims TASK-001
# Board shows: owner = "Cursor (session-abc)"

# Agent 2 (Antigravity) tries TASK-001
# ❌ "Task already claimed by Cursor"

# Agent 2 picks TASK-002 instead
# ✅ Both work in parallel
```

---

## Features

### Board Management

- **Visual drag-drop board** in webview panel
- **Task editor tabs** - double-click task to edit
- **Status sidebar** - real-time metrics
- **Multi-agent dashboard** - see active sessions

### Agent Integration

- **Auto-claim on session start** - tracks Cursor/Antigravity
- **Phase-specific rules** - guides agent behavior
- **Artifact linking** - automatic context assembly
- **Session bridge** - syncs AG implementation_plan ↔ board

### CLI Integration

```bash
# From agent or terminal:
python scripts/board_ops.py create --title "Fix bug #123" --priority high
python scripts/board_ops.py list --status ready
python scripts/board_ops.py claim TASK-001
python scripts/board_ops.py done TASK-001
```

---

## Configuration

### Settings

```json
// .vscode/settings.json or IDE settings
{
  "devops.pythonPath": "/usr/local/bin/python3",
  "devops.autoOpenBoard": true,
  "devops.enableCodeLens": true  // Shows task refs inline
}
```

### CodeLens Annotations

When enabled, see task context inline:

```python
# TASK-001: Add OAuth login
def authenticate(username, password):
    ...

# 👆 CodeLens: "TASK-001: Add OAuth login [Plan Phase]"
#     Click to open task details
```

---

## Architecture

### System Design

```markdown
┌─────────────────────────────────┐
│  Cursor / Antigravity (AI)      │ 
│  Uses: /pick_task, /claim       │
└──────────────┬──────────────────┘
               │
               │ Commands
               ▼
┌─────────────────────────────────┐
│  VS Code Extension (TypeScript) │
│  - Board UI                     │
│  - Session tracking             │
│  - File watchers                │
└──────────────┬──────────────────┘
               │
               │ API calls
               ▼
┌─────────────────────────────────┐
│  Python CLI (board_ops.py)      │
│  - Business logic               │
│  - State management             │
│  - Validation                   │
└──────────────┬──────────────────┘
               │
               │ File I/O
               ▼
┌─────────────────────────────────┐
│  Data Files                     │
│  - .dev_ops/board.json          │
│  - .dev_ops/.tmp/artifacts/     │
│  - .dev_ops/docs/               │
└─────────────────────────────────┘
```

**Key Principle**: TypeScript = UI only, Python = all logic

See [`docs/architecture/typescript-python-boundary.md`](./docs/architecture/typescript-python-boundary.md) for complete details.

### File Structure

```markdown
your-project/
├── .agent/
│   ├── rules/
│   │   ├── dev_ops_guide.md        # Always-on framework guide
│   │   └── development_phases/     # Phase-specific rules
│   │       ├── 1_backlog.md
│   │       ├── 2_understand.md
│   │       ├── 3_plan.md
│   │       ├── 4_build.md
│   │       └── 5_verify.md
│   └── workflows/                  # User slash commands
│       ├── create_task.md
│       ├── pick_task.md
│       └── ...
└── .dev_ops/                       # Hidden DevOps directory
    ├── board.json                  # Task board state (flat location)
    ├── .current_task               # Active task pointer
    ├── .tmp/                       # Temporary working directory
    │   └── artifacts/              # Active artifacts (flat - no subdirs)
    │       ├── PLN-001-feature.md
    │       ├── VAL-002-tests.md
    │       ├── BUG-003-fix.md
    │       └── RES-004-research.md
    ├── archive/                    # Completed tasks
    │   ├── index.json              # Quick search metadata
    │   ├── TASK-001.tar.gz
    │   └── TASK-002.tar.gz
    └── docs/                       # Persistent documentation
        ├── prd.md
        ├── architecture/
        └── ux/
            ├── personas/
            ├── stories/
            └── mockups/
```

---

## Advanced Usage

### Custom Workflows

Create `.agent/workflows/deploy_staging.md`:

```markdown
---
description: Deploy to staging
---

# Deploy to Staging

// turbo
1. Run tests
   ```bash
   pytest tests/ --cov=80
   ```

1. Build Docker image

   ```bash
   docker build -t app:staging .
   ```

2. Deploy to K8s

   ```bash
   kubectl apply -f k8s/staging/
   ```

```markdown

Use in chat: `/deploy_staging`

> **Note**: `// turbo` annotation allows auto-execution of safe commands

### Phase Rule Customization

Edit `.agent/rules/development_phases/4_build.md`:

```markdown
# Build Phase

## Your Custom Rules
- Run formatter before committing
- Update CHANGELOG.md for breaking changes
- Add database migration if schema changed
- Ensure test coverage >80%

## Standard Build Process
[... existing content ...]
```

Agents see your custom rules when in Build phase.

---

## Troubleshooting

### Extension doesn't activate

- Check: VS Code version ≥1.85.0
- Verify: Extension installed (View → Extensions)
- Debug: Help → Toggle Developer Tools → Console tab

### "Board not found" error

```bash
# Run initialization
# Cmd+Shift+P → "DevOps: Initialize"

# Verify files created
ls -la .agent/
ls -la .dev_ops/

# Check board state
cat .dev_ops/board.json
```

### Python script fails

```bash
# Check Python version (need 3.9+)
python3 --version

# Test CLI directly
python3 scripts/board_ops.py --help

# Update Python path in settings
# Settings → DevOps: Python Path
```

### Agent sessions not detected

**Cursor**:

```bash
ls -la .cursor/tasks/
# Cursor bridge pushes tasks here
```

**Antigravity**:

```bash
ls -la ~/.gemini/antigravity/
# Session bridge monitors this
```

---

## FAQ

**Q: Can I use without Cursor/Antigravity?**  
A: Yes, but agent session tracking requires those IDEs. Manual task management works in any VS Code fork.

**Q: Does this work with GitHub Copilot?**  
A: Copilot is code completion, not task management. Use both together.

**Q: Can multiple agents work on one task?**  
A: No, tasks are claimed by one agent to prevent conflicts.

**Q: What if I want Scrum instead of 6 phases?**  
A: Edit `.dev_ops/board.json` columns. The framework is board-agnostic.

**Q: Can I use for non-AI development?**  
A: Yes, but it's optimized for AI workflows. Consider GitHub Projects for pure manual work.

---

## Development

### Build Extension

```bash
cd extension
npm install
npm run compile        # Development build
npm run package        # Production build

# Package VSIX
npx @vscode/vsce package --no-dependencies
# Creates: dev-ops-X.X.X.vsix
```

### Run Tests

```bash
# Python tests
pip install -e ".[dev]"
pytest tests/ --cov=scripts

# TypeScript tests  
cd extension
npm test
```

---

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for guidelines.

---

## Acknowledgments

- Built on [Titan Kanban](https://github.com/MissTitanK3/titan-kanban) by MissTitanK3
- Designed for the AI-native development era

---

## License

MIT License - see [`LICENSE`](./LICENSE)
