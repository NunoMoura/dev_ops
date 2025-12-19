/**
 * DevOps Kanban Types
 *
 * Core types for the Kanban board, aligned with DevOps Framework terminology.
 * - Column = Board column (status-based)
 * - Task = Work item on the board (TASK-XXX)
 * - Board = Collection of columns and tasks
 */

// ============================================================================
// Core Types
// ============================================================================

export type Column = {
  id: string;
  name: string;
  position: number;
};

export type Task = {
  id: string;                    // TASK-XXX format
  columnId: string;              // Current column (determines status)
  title: string;
  summary?: string;
  priority?: string;             // high | medium | low
  tags?: string[];
  updatedAt?: string;
  agentReady?: boolean;

  // Artifact dependencies (mirrors feature.md upstream/downstream)
  upstream?: string[];           // Artifacts this task depends on (e.g., RESEARCH-001)
  downstream?: string[];         // Artifacts that will depend on this task's output

  // DevOps workflow
  workflow?: string;             // /create_plan, /research, etc.
  entryPoints?: string[];        // Files involved in this task

  // Prerequisites (must be met before starting)
  prerequisites?: {
    tasks?: string[];            // TASK-XXX that must be done first
    approvals?: string[];        // Human approvals needed
  };

  // Completion criteria (definition of done)
  completionCriteria?: {
    artifacts?: string[];        // Must produce these (PLN-XXX, RES-XXX)
    tests?: boolean;             // Tests must pass
    review?: boolean;            // Needs human review
  };

  // Context from plan import or manual entry
  acceptanceCriteria?: string[];
  risks?: string[];
  checklist?: string[];          // Simple string checklist for sub-items
  context?: string;
  contextFile?: string;
  contextRange?: { startLine: number; endLine: number };
  source?: TaskSource;
};

export type TaskSource = {
  type: 'plan';
  planFile: string;
  taskId?: string;
};

export type Board = {
  version: number;
  columns: Column[];
  items: Task[];
};

// ============================================================================
// Filtering Types
// ============================================================================

export type FilterToken = { type: 'text'; value: string } | { type: 'tag'; value: string };

export type TaskFilter = {
  raw: string;
  tokens: FilterToken[];
};

export type FilterState = {
  text?: TaskFilter;
  onlyAgentReady?: boolean;
  columnId?: string;             // Filter by specific column
};

// ============================================================================
// Plan Import Types
// ============================================================================

export type ImportedTask = {
  id: string;
  title: string;
  summary?: string;
  column?: string;
  priority?: string;
  tags?: string[];
  entryPoints?: string[];
  acceptanceCriteria?: string[];
  upstream?: string[];
  downstream?: string[];
  risks?: string[];
  checklist?: string[];
  agentReady?: boolean;
  context?: string;
  contextRange?: { startLine: number; endLine: number };
  // Legacy fields for backward compatibility with plan import
  status?: string;
  dependencies?: string[];
};

export type TaskListKey = 'entryPoints' | 'acceptanceCriteria' | 'upstream' | 'checklist' | 'risks' | 'dependencies';

export type ParsedPlan = {
  title?: string;
  summary?: string;
  tasks: ImportedTask[];
  defaultColumn?: string;
  defaultStatus?: string;        // Legacy field for plan import
  globalEntryPoints?: string[];
  globalRisks?: string[];
  filePath: string;
};

// ============================================================================
// Constants
// ============================================================================

export const COLUMN_FALLBACK_NAME = 'Unassigned';
export const PLAN_EXTENSIONS = new Set(['.md', '.markdown', '.json', '.jsonc']);
export const DEFAULT_COLUMN_NAME = 'Backlog';

/**
 * Default 7-column structure aligned with DevOps workflow.
 *
 * | Column      | Purpose                    | Tied Artifact |
 * |-------------|----------------------------|---------------|
 * | Backlog     | Work not yet started       | -             |
 * | Research    | Producing RES-XXX          | research.md   |
 * | Planning    | Producing PLN-XXX          | plan.md       |
 * | In Progress | Active implementation      | -             |
 * | Testing     | Validation & test creation | tests/        |
 * | Blocked     | Waiting on dependency      | -             |
 * | Done        | Completed work             | PR            |
 */
export const DEFAULT_COLUMN_BLUEPRINTS: ReadonlyArray<Column> = [
  { id: 'col-backlog', name: 'Backlog', position: 1 },
  { id: 'col-research', name: 'Research', position: 2 },
  { id: 'col-planning', name: 'Planning', position: 3 },
  { id: 'col-inprogress', name: 'In Progress', position: 4 },
  { id: 'col-testing', name: 'Testing', position: 5 },
  { id: 'col-blocked', name: 'Blocked', position: 6 },
  { id: 'col-done', name: 'Done', position: 7 },
];

