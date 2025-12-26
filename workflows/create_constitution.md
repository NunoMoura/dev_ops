---
description: Create project constitution from PRD + user input.
---

# Create Constitution

Generate the project constitution from PRD and user clarifications.

## Prerequisites

- PRD-XXX must exist in `dev_ops/prds/`

## Steps

1. **Read PRD**:

   Load the PRD to extract:
   - Vision → Constitution Vision
   - Non-Goals → Non-Negotiables
   - Success Metrics → Performance targets

2. **Ask user clarifying questions**:

   ```markdown
   Based on PRD-XXX, I need to clarify:

   1. **Tech Stack**: What language/framework/database?
   2. **Quality Standards**: Testing coverage target? Linting config?
   3. **Security**: Any specific security requirements beyond standard?
   4. **Patterns**: Required architectural patterns (e.g., MVC, CQRS)?
   5. **Anti-Patterns**: Anything explicitly forbidden?
   ```

3. **Generate constitution**:

   ```bash
   python3 dev_ops/scripts/doc_ops.py create constitution \
     --prd PRD-XXX
   ```

4. **Fill template**:

   Using PRD content + user answers, populate:
   - Vision (from PRD)
   - Non-Negotiables (from PRD non-goals + user)
   - Tech Stack (from user)
   - Quality Standards (from user)
   - Security (from user)
   - Performance (from PRD metrics)
   - Patterns/Anti-Patterns (from user)

5. **Save to project**:

   Constitution is saved to `dev_ops/constitution.md`

## Output

- `dev_ops/constitution.md` — Project governing principles

## When to Re-run

- When PRD changes significantly
- When tech stack changes
- When adding new non-negotiables
