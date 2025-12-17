# Titan Kanban

Titan Kanban is a lightweight VS Code extension that keeps a local, agent-friendly Kanban board inside your workspace. It exposes structured commands, a tree view, and file access that automation agents (or you) can call without leaving the editor.

## Features

- **Local board storage** in `local/kanban.json`, automatically created if missing. Optionally attach supporting docs under `local/tasks/*.md` and `local/plans/*` for source material.
- **Dual board surfaces**: the List view (`kanbanView`) stays for compact tree navigation, while the new Board webview (`kanbanBoardView`) renders full Kanban columns with drag-and-drop and multi-select support. Both live under the Kanban activity bar and stay in sync.
- **Workflow defaults**: Fresh boards now ship with seven columns that mirror an idea-to-completion loop (Idea → Working → Breakdown → Iterating → Testing → Ready → Feature complete).
- **Inline mutations**: Create/move tasks and columns directly from the view, update statuses via context menus, and write history into `local/tasks/*.md` for easy auditing.
- **Agent-ready commands** (see the table below) so automations can open the board, pick work, export JSON, filter tasks, or mark progress.
- **Plan importer**: Drop Markdown or JSON plans under `local/plans/` and run the import command to upsert tasks, fill structured fields (acceptance criteria, dependencies, risks, checklists, agent readiness), and auto-create docs.
- **Codex prompt generation**: Any task (especially plan-derived work) can be turned into a clipboard-ready prompt that summarizes context, acceptance criteria, entry points, and risks.
- **Filter toggles** so you can stack text/tag queries with `agentReady`/`blocked` switches for quick saved-view behavior.
- **File system helpers** for `entryPoints` (e.g., `src/feature.ts` or `local/tasks/foo.md`) and for opening plan context slices directly from the task modal.
- **Board tools view (`kanbanManagerView`)**: Manage columns without touching JSON—drag to reorder them, see live card counts, and trigger create/rename/delete right from the activity bar.
- **Card editor webview**: A dedicated “Card Details” panel mirrors whichever task you focus, so you can edit title, summary, tags, status, priority, readiness, or delete the card without touching JSON.
- **Feature checklists**: Break large efforts into nested feature tasks inside the Card Details view. Each checklist task tracks its own summary plus per-item status so you can measure progress without flattening everything into the parent card.
- **Fast feature drafts**: Hitting the plus button instantly drops a “New Feature” card into “I have an Idea” and opens Card Details so you can fill in the real data before saving.
- **Drag-and-drop + multi-select**: Move one or many cards between columns from the Board view. Shift/Ctrl-click adds to the selection, a banner shows how many cards are selected, and a single drag rehomes the entire batch.

## Commands

| Command | Description |
| --- | --- |
| `kanban.openBoard` | Open (and auto-create) `local/kanban.json` for editing. |
| `kanban.getTasks` | Emit the board JSON in a temp editor for agents to parse. |
| `kanban.pickNextTask` | Quick pick that suggests the next task (status/priority/recency heuristic) and focuses it in the view. |
| `kanban.showTaskDetails` | Modal summary with status, tags, timestamps, and entry point launcher. |
| `kanban.createColumn` | Prompt for a column name and append it to the board (also surfaced inside the Board Tools view). |
| `kanban.renameColumn` | Rename any column from the List view or Board Tools manager (context menus plus Command Palette). |
| `kanban.deleteColumn` | Delete a column after confirming where to move existing cards; positions are reflowed automatically. |
| `kanban.createTask` | Prompt for column, title, summary, tags, priority, and status; logs history and focuses the new item (also surfaced inside the Board Tools view). |
| `kanban.moveTask` | Move an existing task to another column (via context menu or Command Palette). |
| `kanban.markTaskInProgress` / `kanban.markTaskBlocked` / `kanban.markTaskDone` | Status automation commands surfaced in the task context menu; they stamp `updatedAt` and append a line to `local/tasks/<task>.md`. |
| `kanban.filterTasks` / `kanban.clearTaskFilter` | Apply or clear a view-level filter (see below). The active filter is shown at the top of the tree. |
| `kanban.toggleAgentReadyFilter` / `kanban.toggleBlockedFilter` | Quickly constrain the board to agent-ready work or blocked items without retyping the filter string. |
| `kanban.importPlan` | Parse a Markdown/JSON plan in `local/plans/`, upsert tasks, create missing columns, and scaffold docs under `local/tasks/<id>.md`. |
| `kanban.generateCodexPrompt` | Build a structured markdown prompt for the selected task and copy it to the clipboard. |
| `kanban.openEntryPoints` / `kanban.openTaskContext` | Open the files referenced by a task directly from the column card (available via context menu). |
| `kanban.showCardDetails` | Focus the Card Details webview and load the selected task for editing. |

## Board schema

`local/kanban.json` is modeled as:

```jsonc
{
	"version": 1,
	"columns": [
		{ "id": "col-idea", "name": "I have an Idea", "position": 1 },
		{ "id": "col-working", "name": "I am working through the idea", "position": 2 },
		{ "id": "col-breakdown", "name": "I am breaking it down into pieces", "position": 3 },
		{ "id": "col-iterating", "name": "I am iterating through implementation", "position": 4 },
		{ "id": "col-testing", "name": "I am testing this feature component", "position": 5 },
		{ "id": "col-ready", "name": "This component is ready", "position": 6 },
		{ "id": "col-complete", "name": "Feature complete", "position": 7 }
	],
	"items": [
		{
			"id": "task-123",
			"columnId": "todo",
			"title": "Wire minimal API",
			"summary": "Expose commands and tree view",
			"status": "todo",
			"priority": "high",
			"tags": ["agentReady"],
			"updatedAt": "2025-11-27T12:00:00Z",
			"entryPoints": ["src/extension.ts", "local/tasks/api.md"],
			"agentReady": true,
			"acceptanceCriteria": ["Expose commands", "Render board"],
			"dependencies": ["col-api"],
			"risks": ["Scope creep"],
			"checklist": ["Wire commands", "Render tree"],
			"context": "Long-form planning context...",
			"contextFile": "local/plans/minimal.md",
			"contextRange": { "startLine": 10, "endLine": 48 },
			"source": { "type": "plan", "planFile": "local/plans/minimal.md", "taskId": "wire-minimal-api" },
			"featureTasks": [
				{
					"id": "feat-api",
					"title": "API polish",
					"summary": "Track the smaller work items",
					"items": [
						{ "id": "feat-api-plumb", "title": "Wire providers", "status": "in_progress" },
						{ "id": "feat-api-tests", "title": "Add smoke tests", "status": "todo" }
					]
				}
			]
		}
	]
}
```

Columns render at their `position` (ascending). Tasks are sorted by status (`in_progress`, `todo`, `blocked`, `review`, `done`), then priority (`high/p0`, `medium/p1`, `low/p2`), then by oldest `updatedAt`. Missing files or folders are created automatically the first time you run `kanban.openBoard`. Rich task metadata (agent readiness, acceptance criteria, dependencies, risks, checklist, context info) is optional but preserved end-to-end.
New boards automatically include the seven-column workflow shown above; you can rename or delete columns at any time.

Each task can also carry an optional `featureTasks` array. Every entry represents a checklist lane with its own summary plus a list of items. Item statuses support `todo`, `in_progress`, `blocked`, `review`, or `done`, and the Card Details view keeps their progress in sync with the JSON.

## Filtering and search

- Run `Kanban: Filter Tasks` to enter a query. Plain words match titles, summaries, status, priority, and column names. Tag filters are prefixed with `#` or `tag:` (e.g., `#agentReady in_progress`). All tokens are combined with logical AND.
- Layer on `Kanban: Toggle Agent-Ready Filter` or `Kanban: Toggle Blocked Filter` to keep reusable saved-view states without editing the text query. The active state is summarized above the tree.
- The active filter string appears at the top of the Kanban view and can be cleared via the title-bar button or the `Kanban: Clear Task Filter` command.
- Tasks that do not satisfy the filter are hidden. If you try to reveal a hidden task, the extension reminds you to clear the filter first.

## Agent workflow tips

1. **List work**: run `kanban.getTasks` so your agent has structured JSON. Filter on `status` (`todo`, `in_progress`) and any custom flags (e.g., `agentReady`).
2. **Pick work**: call `kanban.pickNextTask` to let the extension suggest the next card and automatically highlight it in the view.
3. **Open context**: include `entryPoints` per task; the extension can open each path (plus plan context ranges) relative to the workspace root.
4. **Mutate or import in place**: use the column/task context menus (or `kanban.importPlan`) to move work forward without hand-editing JSON. Each status change is logged to `local/tasks/<taskId>.md`, which agents can read for lightweight history.
5. **Hand off prompts**: run `kanban.generateCodexPrompt` on any task to drop a structured summary into your clipboard/editor before sending it to an agent.

## Plan documents

- Place Markdown or JSON plans under `local/plans/`. Markdown parses headings (`### Task Foo`) plus metadata blocks (Summary, Column, Status, Priority, Tags, Entry Points, Dependencies, Acceptance Criteria, Checklist, Agent Ready, Risks) and captures inline context paragraphs with line ranges.
- JSON plans expect `{ "tasks": [...] }` with similar fields; `entryPoints`, `acceptanceCriteria`, `dependencies`, `risks`, `checklist`, `agentReady`, and `context` are all optional.
- Importing a plan creates missing columns, upserts tasks keyed by `source.planFile + taskId`, merges global entry points/risks, and writes `local/tasks/<taskId>.md` summaries that agents can edit later.
- Each imported task keeps a pointer to the originating plan (`contextFile/contextRange`) so you can jump back to the source text from `kanban.showTaskDetails`.

## Codex prompts

`kanban.generateCodexPrompt` creates a markdown prompt containing the task metadata, context, acceptance criteria, checklist, entry points, and risks. The prompt is copied to your clipboard and opened in a preview editor so you can tweak it before sending it to a coding agent.

## Board view (web renderer)

- Column layout mirrors the data in `local/kanban.json` and honors the same sorting heuristics as the List view.
- Shift/Ctrl-click to multi-select tasks, then drag the stack to a new column. Drop targets highlight before the move fires.
- The selection banner keeps multi-select context visible and offers a one-click “Clear Selection” shortcut (or press `Esc`).
- Each column header exposes a `+` button so you can create a new feature directly in that column without diving back into the list view.
- Every card now has an **Open Card** button, so you can drill into details without scrolling back to the top toolbar.
- Double-click or use the **Open Card** button to jump directly into the Card Details editor for the highlighted task.
- The Board view respects filters and agent-ready/blocked toggles, so you can iterate on the same subset of work everywhere.

## Card Details view

- The **Card Details** webview (inside the Kanban activity bar) always reflects the task you last clicked or moved to via command palette.
- Edit the title, summary, tags, status, priority, or agent-ready flag from this panel and hit **Save** to persist changes back to `local/kanban.json`.
- Add checklist groups via **Add Checklist Task**, then track per-item progress with Todo/In Progress/Blocked/Review/Done statuses. These map to the `featureTasks` field in `local/kanban.json` and help you keep sub-work organized for agents.
- Use the delete button to remove a task entirely; the tree view and filters refresh automatically.
- Context menu entries (`Show Card Details`, `Open Entry Points`, `Open Task Context`) remain available on every task node so you can jump between JSON, files, and the editor quickly.

## Development

- Build once: `pnpm install && pnpm compile`
- Watch mode: `pnpm watch`
- Tests: `pnpm test`

The extension is bundled with `esbuild` and targets VS Code `^1.106.1`.
