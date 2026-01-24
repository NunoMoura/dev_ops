/**
 * DevOps Board Types
 *
 * Core types for the Board board, aligned with DevOps Framework terminology.
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

// ============================================================================
// Abstraction Interfaces
// ============================================================================

export interface IProgress {
  report(value: { message?: string; increment?: number }): void;
}

export interface IWorkspace {
  root: string;
  findFiles(pattern: string, exclude?: string | null, maxResults?: number): Promise<string[]>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  mkdir(path: string): Promise<void>;
}


export type TaskStatus = 'todo' | 'in_progress' | 'needs_feedback' | 'blocked' | 'done' | 'archived';

/**
 * Checklist item stored on a task.
 */
export type ChecklistItem = {
  text: string;
  done: boolean;
};

export type Task = {
  id: string;                    // TASK-XXX format
  columnId: string;              // Current column (workflow phase)
  title: string;
  summary?: string;
  priority?: string;             // high | medium | low
  tags?: string[];
  updatedAt?: string;
  status?: TaskStatus;           // Autonomy state (default: ready)
  assignee?: string;             // Agent or human assigned to task
  blockedBy?: string;            // Task ID blocking this one

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
  checklist?: ChecklistItem[];   // Checklist items with completion status
  context?: string;
  contextFile?: string;
  contextRange?: { startLine: number; endLine: number };
  source?: TaskSource;

  // Agentic Workflow
  owner?: TaskOwner;             // Current active agent/human
  agentHistory?: AgentActivity[]; // History of past sessions
};

export type TaskOwner = {
  id: string;                    // Session ID or User ID
  type: 'agent' | 'human';
  name: string;
  sessionId?: string;            // Antigravity session ID
  phase: string;                 // Phase when ownership started
  startedAt: string;             // ISO date
  developer?: string;            // Human developer orchestrating this (from config.json)
};

export type AgentActivity = {
  agentId: string;
  sessionId: string;
  agentName: string;
  phase: string;
  startedAt: string;
  endedAt: string;
  summary?: string;              // Short summary of the session
  traceFile?: string;            // Path to decision trace (e.g., .dev_ops/activity/TASK-001.md)
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
  columnId?: string;             // Filter by specific column
  status?: TaskStatus;           // Filter by status
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
  status?: TaskStatus;
  context?: string;
  contextRange?: { startLine: number; endLine: number };
  // Legacy fields for backward compatibility with plan import
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
 * Default 6-column structure aligned with DevOps workflow phases.
 *
 * | Column     | Purpose                           | Tied Artifact |
 * |------------|-----------------------------------|---------------|
 * | Backlog    | Work not yet started              | -             |
 * | Understand | Research + docs, question decisions | RES-XXX       |
 * | Plan       | Acceptance criteria, test design  | PLN-XXX       |
 * | Build      | Tests first, then code (TDD)      | -             |
 * | Verify     | Validation, walkthrough, PR       | VAL-XXX, PR   |
 * | Done       | Completed work                    | -             |
 */
export const DEFAULT_COLUMN_BLUEPRINTS: ReadonlyArray<Column> = [
  { id: 'col-backlog', name: 'Backlog', position: 1 },
  { id: 'col-understand', name: 'Understand', position: 2 },
  { id: 'col-plan', name: 'Plan', position: 3 },
  { id: 'col-build', name: 'Build', position: 4 },
  { id: 'col-verify', name: 'Verify', position: 5 },
  { id: 'col-done', name: 'Done', position: 6 },
];


