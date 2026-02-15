# Changelog

## [0.0.3] - 2026-02-15

### Fixed
- **Critical Fixes**: Restored media attachment functionality, fixed chat expansion sizing, and removed status color borders from inputs (forced neutral grey).
- **Versioning**: Bumped to force update and clear extension cache.

## [0.0.2] - 2026-02-15

### Added

- **Task Details View**:
  - Dedicated WebView with "Card" styling.
  - **Refined UI**: Horizontal status toggles, pinned auto-expanding chat box (up to 16 lines), grey focus styling.
  - **Interactive Checklist**: Drag & drop reordering with spacer, persistent visibility controls.
  - **Metadata**: Added "Model" field to header.
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
- **Action Menu**: Verified Archive/Delete options functionality.

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
