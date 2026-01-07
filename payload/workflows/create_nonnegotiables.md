---
description: Create Non-Negotiables Document
category: guided
---

# Create Non-Negotiables

Establish the governing principles and constraints for the project.

## User Input Expectations

Before running, consider:

- **Constraints**: What must never be violated?
- **Tech Stack**: What decisions are locked?
- **Standards**: Quality and security requirements?
- **Patterns**: Mandatory architectural patterns?

## Steps

1. **Determine Context**:
   - **Greenfield**: Ask user for constraints and preferences.
   - **Brownfield**: detection output (tech stack) + code analysis (patterns).

2. **Create Document**:

   ```bash
   python3 scripts/artifact_ops.py create non-negotiables --title "Project Non-Negotiables"
   ```

3. **Refine Content**:
   - **Tech Stack**: Fill based on detection.
   - **File Patterns**: Propose based on analysis or standards.
   - **Constraints**: Add user-defined non-negotiables.

4. **Verify**:
   - Confirm tech stack is accurate.
   - Validate proposed file naming conventions.

## Outputs

- `.dev_ops/docs/nonnegotiables.md`
