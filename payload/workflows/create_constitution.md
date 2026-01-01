---
description: Create project constitution from PRD
category: guided
---

# Create Constitution

Generate project constitution from PRD and user input.

## Steps

1. **Read PRD** (`{{user_input}}`): Extract Vision, Non-Goals, Success Metrics

2. **Clarify with user**:
   - Tech Stack (language/framework/database)
   - Quality Standards (testing coverage, linting)
   - Security requirements
   - Required patterns, forbidden anti-patterns

3. **Generate constitution**:

   ```bash
   python3 scripts/doc_ops.py create constitution --prd {{user_input}}
   ```

4. **Fill template** with PRD content + user answers

## Outputs

- `dev_ops/constitution.md` — Project governing principles
