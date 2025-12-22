# Document-First DevOps Framework v2

## Philosophy

**"The code is the implementation of the documents, not the other way around."**

Documentation is the source of truth. Code must align with it. Ideal for
AI-assisted, spec-driven development.

---

## Sidebar Views

| View | Content |
|------|---------|
| **Agent** | `.agent/` folder: workflows, rules, phase configs |
| **Docs** | User Stories, Architecture, UX/UI, Tests |
| **Metrics** | Live development stats |

### Agent View

Displays contents of `.agent/` folder:

- `workflows/` — Claim task, create feature, etc.
- `rules/` — Phase rules, language rules, linter rules

### Docs View (Subsections)

```
docs/
├── architecture/   # Backend specs, API docs, data models
├── ux/             # User-centric: stories, mockups, style
└── tests/          # Test plans, coverage reports
```

### Metrics View

Live stats: velocity, WIP, completion rates.

---

## Kanban Phases

```
Backlog → Planning → Aligning → Researching → Implementing → Testing → Reviewing → Done
```

| Phase | Purpose |
|-------|---------|
| **Backlog** | Unscheduled tasks |
| **Planning** | Define scope, break into tasks |
| **Aligning** | Ensure code matches docs before proceeding |
| **Researching** | Investigate unknowns, spikes |
| **Implementing** | Write code |
| **Testing** | Verify code works |
| **Reviewing** | Code review, PR approval |
| **Done** | Completed |

---

## Task Model

- **Granularity** = Agent context window size
- **Decomposition**: Agents can spawn subtasks → Backlog
- **Checklist**: Micro-tracking within tasks

---

## UX Structure

```
docs/ux/
├── users/       # Personas
├── stories/     # User stories + acceptance criteria
├── mockups/     # Visual specs (png, jpg)
└── style.md     # Colors, typography
```

Captures *intent* and *context*, not just code structure.
