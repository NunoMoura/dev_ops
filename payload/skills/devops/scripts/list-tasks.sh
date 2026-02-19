#!/bin/bash
# List tasks with optional filtering
# Usage: ./list-tasks.sh --status "blocked"

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
node "$REPO_ROOT/.dev_ops/scripts/devops.js" list-tasks "$@"
