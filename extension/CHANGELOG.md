# Changelog

## [0.0.8] - 2025-12-21

### Added

- **Dynamic Filter Chips** - Active search filters show as clickable chips in sidebar

### Changed

- **Sidebar Simplified** - Removed Boards section, now just Tasks + Metrics
- **Tasks Section** - Just "Create Task" and "Search" actions
- **Board Commands** - Moved to command palette only (Import Plan, Export Board)

### Fixed

- **Create Task Bug** - Fixed "Task not found" error when creating new tasks

## [0.0.7] - 2025-12-20

### Added

- **DevOps Sidebar Redesign** - Activity bar renamed from "Kanban" to "DevOps"
- **Tasks Section** - Action-oriented task management
- **Boards Section** - Board-level operations (New Board, Import, Export)

### Changed

- Removed column hierarchy from sidebar (tasks visible on board itself)
- All commands accessible via sidebar tree or command palette

## [0.0.6] - 2025-12-20

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

## [0.0.5] - 2025-12-20

### Added

- **Task Editor Tabs** - Double-click a task to open it in a full editor tab
- **Metrics Dashboard** - Sidebar now shows board metrics instead of task details
- **Agent Checklist CLI** - New Python commands for task checklists

### Changed

- **Auto-save** - Task edits save automatically
- **Feature → Task** - Renamed throughout UI for consistency

### Fixed

- Duplicate `board.json` file - Consolidated to `dev_ops/kanban/board.json`

## [0.0.1] - 2025-12-18

### Added

- **Column-specific task creation** - Prompts for target column when creating tasks
- **TASK-XXX ID format** - Sequential task IDs matching Python CLI
- **View Task History** command - Opens `dev_ops/kanban/tasks/{id}.md`

### Changed

- Board storage path: `local/kanban.json` → `dev_ops/kanban/board.json`
- Initialize command now creates 7-column board (Backlog → Done)
