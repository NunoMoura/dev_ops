# Example: Understand Phase

**Goal:** Transform vague requirements into actionable research.

**Inputs:**

1. User prompt: "Add social login to our app"
2. `SPEC.md` headers (e.g. `src/auth/SPEC.md`)

**Actions:**

1. Agent locates `src/auth/SPEC.md` and reads the structure.
2. Agent searches codebase to see current authentication providers.
3. Agent researches standard practices for OAuth integration.

**Output:**
A new `RES-XXX.md` artifact in `.dev_ops/tasks/TASK-XXX/` detailing the impact, affected files, and external API requirements:

```markdown
---
id: "RES-042"
title: "OAuth Integration Strategy"
type: research
---

# RES-042 - OAuth Integration Strategy

## Scope
### In Scope
- Auth0 integration for Google and GitHub.

### Out of Scope
- Custom SAML provider configurations.

## Recommendation
Implement the Auth0 Node.js SDK within `src/auth/AuthService.ts`.
```

**Next Action:**
The agent STOPS and waits for the human to review `RES-XXX.md` and move the card to the Plan phase.
