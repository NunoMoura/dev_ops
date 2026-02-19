#!/bin/bash
# Read a task's details as JSON
# Usage: ./read-task.sh --id TASK-123

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
node "$REPO_ROOT/.dev_ops/scripts/devops.js" read-task "$@"
