# Change Log

All notable changes to the "titan-kanban" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

### Added
- Web-based `kanbanBoardView` renderer with live columns, task detail hover, and tree data parity.
- Multi-select plus drag-and-drop across columns so batches of tasks can be rehomed in one gesture.
- Board selection banner keeps counts visible and offers instant clearing (plus keyboard shortcuts).
- Column-level “+” buttons inside the board webview to create new features directly in a specific column.
- Inline **Open Card** buttons on every board card so the action is always within reach.

### Changed
- Duplicate the Kanban toolbar commands for the new board view so filters/import remain one click away regardless of surface.
- Rename the creation workflow to “Create Feature” to match current terminology.
- Quick-create now seeds a “New Feature” inside “I have an Idea” automatically and focuses the Card Details webview for editing.