---
description: Create a Product Requirements Document for a new product or release
---

# Create PRD

Create a PRD (Product Requirements Document) to define product vision and goals.

## Steps

1. **Create PRD artifact**:

   ```bash
   python3 dev_ops/scripts/doc_ops.py create prd --title "Product Name"
   ```

2. **Fill in sections** using `templates/prd.md`:
   - Vision — What and why
   - Goals — Measurable outcomes
   - Non-Goals — Explicit exclusions
   - User Personas — Who benefits
   - Success Metrics — How to measure
   - Features — High-level capabilities
   - Timeline — Key milestones
   - Risks — What could go wrong

3. **Break down into features**:
   For each feature in the PRD, create a feature spec:

   ```bash
   # Use /create_feature workflow for each major feature
   ```

4. **Link features to PRD**:
   Add FEAT-XXX IDs to PRD's `downstream` field.

## Template

See [templates/prd.md](file:///templates/prd.md)

## Output

- `dev_ops/prds/PRD-XXX.md` — Product requirements document
- Links to FEAT-XXX feature specifications
