---
id: constitution
title: "Project Constitution"
type: constitution
date: "{{date}}"
prd: ""  # PRD-XXX this was derived from
---

# Project Constitution

Governing principles derived from PRD + user input.
Checked during Researching phase alignment.

## Derived From

PRD: <!-- Link to PRD-XXX that this constitution is derived from -->

---

## Vision

<!-- 
Extract from PRD Vision section. 
Should be 1-2 sentences capturing the core purpose.
Example: "A real-time collaboration tool for remote teams."
-->

---

## Non-Negotiables

<!-- 
Rules that CANNOT be violated under any circumstances.
Extract from PRD Non-Goals + ask user for clarification.
Think: "What would make this project fail if not followed?"

Examples by category:
- Architecture: "All services must be stateless"
- Data: "User data must never leave EU region"  
- Quality: "No PRs without tests"
- Process: "Every change must have documentation"
-->

---

## Tech Stack

<!-- 
Ask user for their technology choices.
Only include what's been decided - leave blank if open.
-->

| Category | Choice |
|----------|--------|

| Language | |
| Framework | |
| Database | |
| Testing | |
| Deployment | |

---

## Quality Standards

<!-- 
Define the quality bar for this project.
Ask user: "What quality standards should every contribution meet?"

Consider:
- What linter/formatter and config?
- Minimum test coverage percentage?
- Code review requirements?
- Documentation requirements?
-->

---

## Security

<!-- 
Security requirements specific to this project.
Ask user: "What are your security requirements?"

Consider based on project type:
- Authentication/authorization needs
- Data handling (PII, encryption)
- API security (rate limiting, input validation)
- Secrets management
- Compliance requirements (GDPR, HIPAA, SOC2)
-->

---

## Performance

<!-- 
Extract from PRD Success Metrics.
What performance targets must be met?
-->

| Metric | Target |
|--------|--------|

| | |

---

## Patterns

<!-- 
Required architectural or coding patterns.
Ask user: "Are there specific patterns this project must follow?"

Examples:
- "Repository pattern for data access"
- "CQRS for command/query separation"  
- "Event sourcing for audit trail"
- "Hexagonal architecture"
-->

---

## Anti-Patterns

<!-- 
Things explicitly forbidden in this project.
Ask user: "What should developers NEVER do?"

Examples:
- "No direct database queries in controllers"
- "No synchronous external API calls"
- "No business logic in UI components"
- "No magic strings"
-->
