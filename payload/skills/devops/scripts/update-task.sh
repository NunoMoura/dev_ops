#!/bin/bash
# Update a task's properties or checklist
# Usage: ./update-task.sh --id TASK-123 --add-checklist "Review PR"

# Resolve absolute path to the devops.js CLI
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Assuming we are in payload/skills/devops/scripts
# We need to reach extension/src/cli/devops.ts -> compiled to .dev_ops/scripts/devops.js
# Or use ts-node if dev environment.
# The standard seems to be `node .dev_ops/scripts/devops.js` from workspace root.
# Let's assume the user runs this from workspace root or we find root.

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"

# Execute the CLI command
# We use node to run the compiled JS functionality or ts-node if available/configured
# The existing pattern suggests: node .dev_ops/scripts/devops.js

node "$REPO_ROOT/.dev_ops/scripts/devops.js" update-task "$@"
