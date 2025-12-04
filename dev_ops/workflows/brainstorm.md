# Brainstorming Workflow

## Context

Explore new ideas, solve complex problems, or plan a major feature.

## Prerequisites

- [ ] A problem or idea to explore.

## Steps

### 1. Define Topic

- **Action**: Ask user for the problem or topic.
- **Command**: `notify_user`

### 2. Research

- **Action**: Search codebase and docs for context.
- **Command**: `search_files` / `read_file`

### 3. Ideate

- **Action**: Generate options and pros/cons.
- **Command**: `notify_user` (Collaborative brainstorming)

### 4. Document

1. **Run Create Research Script**

    ```bash
    python3 dev_ops/commands/create_research.py "[Topic]"
    ```

2. **Conduct Research**
    - Open `research/[topic].md` and document your findings.

## Exit Criteria

- [ ] A clear direction is chosen.
- [ ] Documented in PRD, Task, or Research doc.
