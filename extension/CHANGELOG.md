# Changelog

## [0.6.0] - 2025-12-20

### Added

- **Board Templates** - Initialize command now offers template selection:
  - Empty Board (blank slate)
  - Greenfield Project (8 tasks: vision, tech stack, architecture, CI/CD)
  - Brownfield Project (8 tasks: audit, dependencies, technical debt, tests)
- **Phase Review Rule** - New `phase_review.md` for the Review column
- **Settings Icon** - Gear icon in sidebar opens DevOps extension preferences

### Changed

- **Phase Rule Alignment** - `phase_inprogress.md` renamed to `phase_implementing.md`
- **Sidebar Simplified** - Removed "Board Tools" separator, now just Kanban + Metrics
- **Onboard Agent** - Renamed "Spawn Agent" → "Onboard Agent" with improved prompt

## [0.5.1] - 2025-12-20

### Fixed

- Task editor URI resolution - Added TextDocumentContentProvider for
  `kanban-task://` scheme

## [0.5.0] - 2025-12-20

### Added

- **Task Editor Tabs** - Double-click a task to open it in a full editor tab
- **Metrics Dashboard** - Sidebar now shows board metrics instead of task details:
  - Total tasks / Done today
  - In Progress / Blocked counts
  - Column distribution
  - Status overview with traffic light indicators
- **Agent Checklist CLI** - New Python commands for agents:
  - `kanban_ops.py checklist add/complete/list` - Manage task checklists
  - `kanban_ops.py replace --with` - Split complex tasks into simpler ones
- **Custom Editor Provider** - Tasks use `kanban.taskEditor` custom editor

### Changed

- **Auto-save** - Task edits save automatically (no Save button needed)
- **Clickable Cards** - Entire task card is clickable (removed Open button)
- **Unified Button Styling** - Delete button uses gradient styling
- **Task Details → Metrics** - Sidebar repurposed as metrics dashboard
- **Feature → Task** - Renamed throughout UI for consistency

### Fixed

- Duplicate `board.json` file - Consolidated to `dev_ops/kanban/board.json`
- Column IDs now use `col-implementing`, `col-review` consistently

## [0.1.0] - 2025-12-18

### Added

- **Column-specific task creation** - Prompts for target column when creating tasks
- **TASK-XXX ID format** - Sequential task IDs matching Python CLI
- **View Task History** command - Opens `dev_ops/kanban/tasks/{id}.md`

### Changed

- Board storage path: `local/kanban.json` → `dev_ops/kanban/board.json`
- Plans path: `local/plans/` → `dev_ops/plans/`
- Task history path: `local/tasks/` → `dev_ops/kanban/tasks/`
- Initialize command now creates 7-column board (Backlog → Done)

### Removed

- `generateCodexPrompt` command (use Antigravity IDE workflows instead)
- Deprecated `getStatusRank()` function
- Legacy type aliases (KanbanItem, KanbanColumn, etc.)

### Fixed

- Column IDs now use `col-` prefix consistently
- Task statuses determined by `columnId` instead of separate `status` field
