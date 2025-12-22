# Contributing to DevOps Framework

Thank you for your interest in contributing to the DevOps Framework! This guide
will help you get started.

## Development Setup

### Prerequisites

- Python 3.9+
- Node.js 18+ (for extension development)
- pnpm (for extension package management)

### Clone and Install

```bash
# Clone the repository
git clone https://github.com/NunoMoura/dev_ops.git
cd dev_ops

# Install Python development dependencies
pip install -e ".[dev]"

# Install pre-commit hooks
pip install pre-commit
pre-commit install

# For extension development
cd extension
pnpm install
```

## Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Changes

- Follow the existing code style
- Add tests for new functionality
- Update documentation as needed

### 3. Run Tests

```bash
# Run Python tests
pytest tests/ -v

# Run linting
ruff check .

# For extension
cd extension
pnpm run lint
pnpm run test
```

### 4. Commit Changes

We use structured commit messages:

```text
<type>: <description>

**Context**: Why this change is needed
**Architecture**: Any structural changes
**Verification**: How it was tested
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`

### 5. Submit a Pull Request

- Push your branch
- Open a PR against `main`
- Fill in the PR template
- Wait for review

## Code Style

### Python

- Use type hints for all public functions
- Follow Google-style docstrings
- Run `ruff` before committing
- Maximum line length: 100 characters

```python
def example_function(param: str) -> bool:
    """Brief description of function.

    Args:
        param: Description of parameter.

    Returns:
        Description of return value.

    Raises:
        ValueError: If param is invalid.
    """
    pass
```

### TypeScript (Extension)

- Use ESLint configuration
- Follow existing patterns in the codebase

### Markdown

- Follow markdownlint rules (see `.markdownlint.json`)
- Maximum line length: 80 characters for rule files

## Project Structure

```text
dev_ops/
├── scripts/          # Python CLI tools
├── rules/            # Phase rules and templates
├── workflows/        # User-facing slash commands
├── templates/        # Artifact templates
├── extension/        # VS Code extension
└── tests/            # Python tests
```

## Extension Development

### Architecture

The VS Code extension is structured as:

```text
extension/src/
├── extension.ts       # Entry point, command registration
├── boardView.ts       # Kanban board webview panel
├── taskDetailsView.ts # Task details webview
├── ui/providers.ts    # Tree view providers
├── commands/          # Command implementations
└── features/          # Core logic (types, filters, data)
```

### Running Extension Locally

```bash
cd extension
pnpm install
pnpm run compile
# Press F5 in VS Code to launch Extension Development Host
```

### Testing

```bash
# Run extension tests
pnpm run test

# Tests are in src/test/
# Uses @vscode/test-electron for integration testing
```

### Testing with External Repositories

To test the framework in realistic conditions, bootstrap it into an external
project rather than the framework repo itself.

**Recommended test repo**: [TodoMVC](https://github.com/nicknish/react-todomvc)
(small React project, clean structure)

```bash
# Clone a test project
git clone https://github.com/nicknish/react-todomvc.git ~/test-project
cd ~/test-project

# Build and install the extension
cd /path/to/dev_ops/extension
pnpm run package
code --install-extension dev-ops-*.vsix

# Open test project in VS Code
code ~/test-project

# Run "DevOps: Initialize" command to bootstrap
```

This creates the expected folder structure in the test project:

```text
~/test-project/
├── .agent/
│   ├── workflows/
│   └── rules/
├── docs/
│   ├── architecture/
│   ├── ux/
│   └── tests/
└── dev_ops/
    └── kanban/
        └── board.json
```

### Adding a New Command

1. Define command in `package.json` under `contributes.commands`
2. Implement handler in `src/commands/` directory
3. Register in `extension.ts` via `registerKanbanCommands`
4. Add menu entries in `package.json` under `contributes.menus`

### TypeScript Style

- Use strict TypeScript (`"strict": true` in tsconfig)
- Prefer `async/await` over raw Promises
- Use VS Code API types from `@types/vscode`
- Format errors with `formatError()` from `features/errors.ts`

## Testing Guidelines

- Add tests for all new functionality
- Use pytest fixtures for common setup
- Use tempfile for filesystem tests
- Mock external dependencies

```python
def test_feature(tmp_path):
    # Arrange
    setup_test_data(tmp_path)

    # Act
    result = my_function(tmp_path)

    # Assert
    assert result == expected
```

## Documentation

- Update README.md for user-facing changes
- Update extension/README.md for extension changes
- Add entries to CHANGELOG.md under `[Unreleased]`

## Questions?

Open an issue or reach out to the maintainers.
