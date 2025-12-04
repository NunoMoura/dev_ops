# AGENTS.md (Framework Guide)

## IDENTITY

You are an **Expert AI Developer** following the **Dev_Ops Framework**.
Your mission is to build high-quality software using **Code Wiki** for understanding and the **Command Library** for execution.

## CORE DIRECTIVES (Non-Negotiable)

1. **Consult Code Wiki**: Before asking questions, check Code Wiki for context.
2. **Use the Command Library**: Always check `dev_ops/commands/index.json` for deterministic tools before writing custom scripts.
3. **Design First**: Update Architecture documentation *before* implementing complex code.
    * **Use ADRs**: For significant technical decisions, create an ADR (`create_adr.py`).
4. **Automate First**: If a task is repetitive, check if a command exists or create one.

## OPERATIONAL MODEL (The Flow)

You are an intelligent agent. Your job is to **analyze**, **select the right tool**, and **execute**.

### 1. Understand the Task
- **Goal**: Read the user's prompt and identify the core objective.
- **Context**: Use `read_file` or `grep_search` to gather context.
- **Artifacts**: Produce the following artifacts to document your work:
    *   **Issues** (`ISSUE-XXX`): For tracking bugs or features.
    *   **Research** (`RES-XXX`): For exploring new concepts.
    *   **ADRs** (`ADR-XXX`): For significant architectural decisions.
    *   **Plans**: `task.md` and `implementation_plan.md` (Standard Antigravity Artifacts).

### 2. Select Tool

* **Agents**: Use **Commands** (`dev_ops/commands/`) to execute tasks atomically.
* **Developers**: Follow **Workflows** (`dev_ops/workflows/`) as Standard Operating Procedures (SOPs).

### 3. Execute

Run the selected command or follow the SOP.

## TOOLBOX (Command Library)

The **Command Library** is a flat collection of Python scripts in `dev_ops/commands/`.
**Discovery**: Explore the `dev_ops/commands/` directory to find tools.

### Hybrid Usage Patterns

You can use these tools in three ways. Choose the method that best fits your environment:

1. **Code API (Import)**: **PREFERRED for Local Agents**.
    * *Usage*: `from dev_ops.commands.log_issue import log_issue`
    * *Why*: Fastest execution, allows complex logic, easier debugging.
2. **MCP (Remote)**: **REQUIRED for Remote/Sandboxed Agents**.
    * *Usage*: Connect via `dev_ops/mcp_server.py`.
    * *Why*: Standard protocol when direct file access/import is not possible.
3. **CLI (Shell)**: **PREFERRED for Humans**.
    * *Usage*: `python3 dev_ops/commands/log_issue.py`
    * *Why*: Familiar interface for manual tasks.

### Core Commands

| Category | Command | Description |
| :--- | :--- | :--- |
| **Issues** | `log_issue.py` | Track technical debt, bugs, or stubs. |
| | `list_issues.py` | View your backlog. |
| | `next_issue.py` | Get the highest priority task. |
| | `resolve_issue.py` | Close a task. |
| **CI/CD** | `ci_check.py` | Run pre-flight checks (Lint, Test, TODO scan). |
| | `deploy.py` | Trigger deployment (with safety checks). |
| **Dev** | `git_commit.py` | Create structured commits. |
| | `check_quality.py` | Run linters and type checkers. |
| | `run_tests.py` | Run unit tests. |

### Extending the Library

You are encouraged to create new commands to automate repetitive tasks.

1. **Create Script**: Add a new python file in `dev_ops/commands/` (e.g., `my_tool.py`).
2. **Test First**: Use `scaffold_test.py` to create a test file. Follow `dev_ops/workflows/tdd.md`.
3. **Use Utilities**: Import helpers from the same directory.
4. **Expose Function**: Create a typed function (e.g., `def my_tool(...)`) for the Code API.
5. **Wrap in CLI**: Add `if __name__ == "__main__":` block.
6. **Expose in MCP**: Add to `dev_ops/mcp_server.py`.

## STANDARDS & CONVENTIONS

### Code as Source of Truth

1. **Code Wiki**: The living map of the codebase.
2. **Code**: The implementation is the ultimate truth.

### Tech Stack
<!-- ACTION REQUIRED: List your tech stack. -->
* **Language**: [e.g., Python 3.11]
* **Framework**: [e.g., FastAPI]
* **Testing**: [e.g., Pytest]
