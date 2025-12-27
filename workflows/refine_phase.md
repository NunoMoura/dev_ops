---
description: Re-run phase with PM feedback and session summary
---

# Refine Phase

Spawn new agent with same context + explicit PM feedback.

## When to Use

- PM has specific direction for improvement
- Need to focus on particular aspects
- Previous output needs targeted refinement

## Steps

1. **Review previous session**

   Read the walkthrough/artifacts from previous attempt.

2. **PM provides feedback**

   Examples:
   - "Focus more on X"
   - "Missing consideration of Y"
   - "Expand the test coverage for Z"

3. **Append to context**

   The feedback becomes part of the new agent's prompt.

4. **Spawn NEW agent** with augmented prompt

5. **Agent works with feedback context**

## Inputs

- Previous session summary (`walkthrough.md` or `implementation_plan.md`)
- PM feedback (free-form text)
- Original phase rules

## Notes

- Task stays in current column
- Directed iteration (vs `/retry_phase` which is undirected)
- PM guides the improvement direction
