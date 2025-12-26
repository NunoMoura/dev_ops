---
description: Triage a PR comment using full project context.
---

# Triage Comment

Analyze a PR comment with full project context and take appropriate action.

## Input

Provide the comment text and PR number:

```bash
# Comment text from PR #123
COMMENT="This could cause a memory leak in the database connection pool"
PR_NUMBER=123
```

## Steps

1. **Read comment context** — Understand what's being reported

2. **Analyze with project knowledge**:
   - Check relevant architecture docs
   - Review affected component's ADRs
   - Consider existing patterns

3. **Categorize**:

   | Category | Action |
   |----------|--------|
   | **Bug** | Create task, add to backlog |
   | **Feature** | Create task, add to backlog |
   | **Quick Fix** | Fix directly in current session |
   | **Dismiss** | Add triage comment explaining why |

4. **For Bug/Feature**:

   ```bash
   python3 dev_ops/scripts/kanban_ops.py create \
     --title "PR#${PR_NUMBER}: <summary>" \
     --summary "From PR comment: <details>"
   ```

5. **Respond in PR** with action taken

## Output

- Comment categorized
- Task created (if bug/feature)
- OR fix committed (if quick fix)
- OR dismissal comment added
