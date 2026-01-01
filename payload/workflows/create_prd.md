---
description: Create Product Requirements Document
category: guided
---

# Create PRD

Create a PRD to define product vision and goals.

## Steps

1. **Create PRD**:

   ```bash
   python3 scripts/artifact_ops.py create prd --title "{{user_input}}"
   ```

2. **Fill sections**: Vision, Goals, Non-Goals, User Personas, Success Metrics, Features, Timeline, Risks

3. **Decompose to features**: For each feature, use `/add_feature`

4. **Link features**: Add FEAT-XXX IDs to PRD's `downstream` field

## Outputs

- `dev_ops/artifacts/prds/PRD-XXX.md`
- Links to FEAT-XXX specifications
