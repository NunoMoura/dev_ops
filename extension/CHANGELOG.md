# Changelog

## [0.0.2] - 2026-01-31

### Added

- **Task Details View**:
  - Dedicated WebView with "Card" styling (6px rounded containers).
  - Left-border status indicators matching Board/Sidebar.
  - Pill-shaped Task ID badge and uppercase Title.
- **Manual Task Ordering**: Drag and drop tasks in Board view with persistent ordering.
- **Local Asset Loading**: Codicons and fonts now served locally from extension directory.
- **Configuration Service**: Centralized `config.json` management under `src/services`.

### Changed

- **Project Structure**:
  - Consolidated core utilities into `src/common`.
  - Moved shared code to `src/infrastructure`.
  - Standardized service interfaces.
- **UI Refinements**:
  - Removed **Task Priority** features (Filters, UI badges, Logic).
  - Replaced CSS font icons with inline SVGs for reliable rendering.
  - styling: Improved Dropdown alignment and removed redundant Status Bars.
- **Onboarding**: Replaced "Bootstrap" workflow with direct installer task generation.

### Fixed

- **Board rendering**: Fixed HTML corruption and hover states in Kanban board.
- **Drag & Drop**: Resolved visual flickering and state synchronization issues.
- **Windows compatibility**: Fixed path rendering for local resources.

---

## [0.0.1] - Development

> **Note:** This is the development version. Version only bumps on actual releases.

### Added

- **Component-Centric Model** - Architecture docs mirror `src/` hierarchy
- **Hierarchical Architecture View** - Docs sidebar shows folder structure
- **Multi-Select Task Deletion** - Select tasks and press Delete/Backspace
- **Docs Sidebar** - Shows Architecture, PRDs, Features, Bugs

### Changed

- **Simplified Docs Sidebar** - Only user-facing categories (agent artifacts
  accessed via component docs)
- **Component Field** - All artifact templates link to components
- **Phase Rules** - Updated with component linking instructions
- **Task Cards** - Removed task ID for cleaner design

### Fixed

- **Delete Task Button** - Now uses VS Code confirmation dialog (webview
  `confirm()` doesn't work)
- **Sidebar Icons** - Removed redundant inline icons

---

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

- **DevOps Sidebar Redesign** - Activity bar renamed from "Board" to "DevOps"
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
- **Sidebar Simplified** - Removed "Board Tools" separator, now just Board + Metrics
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

- Duplicate `board.json` file - Consolidated to `dev_ops/board/board.json`

## [0.0.1] - 2025-12-18

### Added

- **Column-specific task creation** - Prompts for target column when creating tasks
- **TASK-XXX ID format** - Sequential task IDs matching Python CLI
- **View Task History** command - Opens `dev_ops/board/tasks/{id}.md`

### Changed

- Board storage path: `local/board.json` → `dev_ops/board/board.json`
- Initialize command now creates 7-column board (Backlog → Done)
