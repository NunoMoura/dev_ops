# Document-First Framework v2 - Implementation Plan

## Phase 1: Kanban Columns Update

Update columns to new phases.

#### [MODIFY] columns.json + kanban_ops.py

```
Backlog → Planning → Aligning → Researching → Implementing → Testing → Reviewing → Done
```

- Add "Aligning" column
- Rename "Research" → "Researching"
- Rename "Review" → "Reviewing"

#### [NEW/MODIFY] Phase Rules

- Add `phase_aligning.md`
- Rename existing rules to match

---

## Phase 2: Sidebar Restructure

Simplify to 3 views: Agent, Docs, Metrics.

#### [MODIFY] package.json

```json
"views": {
  "devops": [
    { "id": "devopsAgentView", "name": "Agent" },
    { "id": "devopsDocsView", "name": "Docs" },
    { "id": "devopsMetricsView", "name": "Metrics", "type": "webview" }
  ]
}
```

#### [MODIFY/NEW] View Providers

| View | Provider | Content |
|------|----------|---------|
| Agent | Tree view | `.agent/workflows/`, `.agent/rules/` |
| Docs | Tree view with subsections | `docs/architecture/`, `docs/ux/`, `docs/tests/` |
| Metrics | Webview (existing) | Live stats |

#### [NEW] Docs Folder Structure Template

```
docs/
├── architecture/
├── ux/
│   ├── users/
│   ├── stories/
│   ├── mockups/
│   └── style.md
└── tests/
```

---

## Phase 3: Code Scanning (Future)

Auto-populate architecture docs from codebase analysis.

- Enhance `project_ops.py`
- Future: tree-sitter integration

---

## Verification

1. Reload extension, verify 3 sidebar views
2. Verify Kanban columns match new phases
3. Expand Agent view → shows workflows and rules
4. Expand Docs view → shows subsections
