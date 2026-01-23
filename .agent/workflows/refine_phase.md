---
description: Generate refinement prompt with PM feedback
category: automated
---

# Refine Phase

Generate structured prompt with context + PM feedback for agent refinement.

## Step 1: Request Feedback

Ask the user for specific feedback on the current phase.

```text
"I am ready to refine the current phase. Please provide your feedback on what needs improvement (e.g., 'Focus more on error handling', 'Add edge case tests')."
```

## Step 2: Generate Refinement Prompt

Using the user's feedback, generate a new prompt for yourself (or the next agent) using this template:

```markdown
# Refinement Request for [Task ID]

## Task: [Task Title]
[Task Summary]

## Feedback
[User Feedback]

## Instructions
1. Address the specific points mentioned in the feedback.
2. Review previous artifacts and update them if needed.
3. Continue with the current phase incorporating this guidance.
```

## Outpus

- Feedback incorporated into plan/code
- Task `refinementCount` incremented (track internally or in task comments)
