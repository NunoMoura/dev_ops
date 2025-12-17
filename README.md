# DevOps Framework & Kanban

An all-in-one DevOps framework and Kanban board extension for VS Code.

## Features

- **Kanban Board**: Integrated task management (Backlog, In Progress, Review, Done).
- **Agent Rules**: Pre-configured rules for AI agents (Cursor/Windsurf) to
  follow project standards.
- **Workflows**: Standardized workflows for Planning, Bugs, Research, and more.
- **Templates**: Ready-to-use templates for ADRs, Plans, Bug Reports, and
  Research docs.

## Installation

The entire framework is distributed as a **VS Code Extension**.

1. **Download/Install Extension**:
    - Install the `dev-ops-0.0.1.vsix` (or from Marketplace if published).

2. **Initialize Project**:
    - Open your project folder in VS Code.
    - Open Command Palette (`Ctrl+Shift+P`).
    - Run: **`DevOps: Initialize`**.
    - This will set up the `.agent/` and `dev_ops/` directories in your workspace.

## Usage

### Kanban Board

- Open the board via **Antigravity Kanban: Open Board** or click the Kanban icon
  in the activity bar.
- Create tasks, move them between columns, and track progress.

### Agent Workflows

- Trigger workflows in chat using slash commands (e.g., `/bootstrap`, `/plan`, `/bug`).
- The agent will follow the rules in `.agent/rules` and use templates from `dev_ops/templates`.

## Architecture

This repository is the source code for the `dev-ops` extension.

- `rules/`, `workflows/`, `templates/`, `scripts/`: Source of truth for framework
  assets.
- `vendor/titan-kanban/`: Source code for the VS Code extension.

## Development

To modify the framework or extension:

1. Edit files in `rules/`, `workflows/`, etc.
2. Edit extension code in `vendor/titan-kanban/src/`.
3. Rebuild:

    ```bash
    cd vendor/titan-kanban
    npm install
    npm run compile
    npx vsce package
    ```

## Acknowledgments

This project includes third-party software.
See [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md) for details.

- **[Titan Kanban](https://github.com/MissTitanK3/titan-kanban)** - MIT License
