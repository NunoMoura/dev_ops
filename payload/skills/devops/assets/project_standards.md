---
id: project-standards
title: "Project Standards"
type: project-standards
date: "{{date}}"
storage: ".dev_ops/docs/"
---

# Project Standards

Governing principles and standards for the project.
Checked during alignment phases.

---

## Vision

<!-- 
Extract from PRD Vision section. 
Should be 1-2 sentences capturing the core purpose.
Example: "A real-time collaboration tool for remote teams."
-->

---

## Project Standards

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

## File Naming Conventions

<!-- 
Define patterns for file names to ensure consistency.
Detect from existing codebase (for brownfield) or propose standard conventions (whitefield).
-->

| Type | Pattern |
|------|---------|

| | |

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
