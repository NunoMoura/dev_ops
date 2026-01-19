---
description: Triage PR comment with project context
category: manual
---

# Triage Comment

Analyze PR comment and take appropriate action.

## Steps

1. **Analyze comment** (`{{user_input}}`): Understand what's being reported

2. **Check relevant docs**: Architecture docs, ADRs, existing patterns

3. **Categorize and act**:

   | Category | Action |
   |----------|--------|
   | Bug | Create task in backlog |
   | Feature | Create task in backlog |
   | Quick Fix | Fix in current session |
   | Dismiss | Explain in PR comment |

4. **For Bug/Feature**:

   ```bash
   python3 scripts/board_ops.py create --title "PR#XXX: <summary>"
   ```

5. **Respond in PR** with action taken
