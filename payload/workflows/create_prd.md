---
description: Define project vision (Visuals + Text) to generate PRD/Mockups
category: guided
---

# Define Project

Kickstart a project by defining the vision via text and visuals.

## User Input Expectations

Prepare to provide:

1. **Natural Language Description**: What are you building?
2. **Visuals** (optional but recommended):
   - "See attached execution_diagram.png"
   - "Similar to <app_name> but with..."
   - ASCII mockups or detailed descriptions

## Steps

1. **Understand Goal**:
   - Analyze user input (text + visuals).
   - Identify core value proposition and target audience.

2. **Generate Personas (`user` artifacts)**:
   - Identify 1-3 key user roles.
   - Create `docs/ux/users/<role>.md` using `artifact_ops` (if available) or create file manually.

3. **Generate Mockups (`mockup` artifacts)**:
   - Based on visuals/description.
   - Create `docs/ux/mockups/<view>.md`.
   - Link mockups to relevant personas.

4. **Create PRD (`prd` artifact)**:
   - Synthesize Vision, Goals, Metrics.
   - Reference the created Personas and Mockups in the PRD.
   - Create `docs/prds/PRD-XXX.md`.

5. **Generate Stories (`story` artifacts)**:
   - Decompose PRD/Mockups into high-level User Stories.
   - Create `docs/ux/stories/STORY-XXX.md`.
   - Link stories back to PRD.

## Outputs

- `docs/ux/users/*.md`
- `docs/ux/mockups/*.md`
- `docs/prds/PRD-XXX.md`
- `docs/ux/stories/*.md`
