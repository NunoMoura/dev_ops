# Changelog

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
