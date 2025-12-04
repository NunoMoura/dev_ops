# Agentic Code Review Workflow

**Goal**: Ensure code quality, security, and "Agent-Readability" before merging.

## The Checklist

### 1. Security

* [ ] **Secrets**: Are there any hardcoded API keys or passwords?
* [ ] **Injection**: Are inputs sanitized (e.g., SQL injection, shell injection)?
* [ ] **Permissions**: Does the code assume excessive permissions?

### 2. Correctness

* [ ] **Logic**: Does the code actually solve the problem described in the issue/PRD?
* [ ] **Edge Cases**: Are nulls, empty lists, and errors handled?
* [ ] **Tests**: Are there tests? Do they pass?

### 3. Agent-Readability (Crucial for Future Agents)

* [ ] **Docstrings**: Do functions have clear docstrings explaining inputs/outputs?
* [ ] **Type Hints**: Are Python type hints used and correct?
* [ ] **Complexity**: Is the code modular? (Agents struggle with 500+ line functions).
* [ ] **Naming**: Are variable names descriptive (e.g., `user_id` vs `x`)?

### 4. Style

* [ ] **Linting**: Does it pass `ci_check`?
* [ ] **Consistency**: Does it follow the project's existing patterns?

## How to Review

1. **Read the Diff**: Look at what changed.
2. **Run the Code**: Don't just read it. Run it.
3. **Check the Checklist**: Go through the items above.
4. **Comment**: Provide specific, actionable feedback.
