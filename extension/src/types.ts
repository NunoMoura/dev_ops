/**
 * DevOps Board Types
 *
 * Foundational types for the Board board, aligned with DevOps Framework terminology.
 * - Column = Board column (status-based)
 * - Task = Work item on the board (TASK-XXX)
 * - Board = Collection of columns and tasks
 */

// ============================================================================
// Domain Types
// ============================================================================

export type Column = {
  id: string;
  name: string;
  position: number;
  wipLimit?: number;
  taskIds?: string[]; // Ordered list of task IDs
};

// ============================================================================
// Abstraction Interfaces
// ============================================================================

export interface ProgressReporter {
  report(value: { message?: string; increment?: number }): void;
}

export interface Workspace {
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

export type ChatMessage = {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: number; // Unix timestamp
};

export type Task = {
  id: string;                    // TASK-XXX format
  columnId: string;              // Current column (workflow phase)
  title: string;
  summary?: string;
  // priority removed
  tags?: string[];
  updatedAt?: string;
  status?: TaskStatus;           // Autonomy state (default: ready)
  assignee?: string;             // Agent or human assigned to task
  dependsOn?: string[];           // TASK-XXX IDs that must complete before this task starts

  // DevOps workflow
  workflow?: string;             // /create_plan, /research, etc.
  entryPoints?: string[];        // Files involved in this task

  // Human approvals required before starting (task dependencies use dependsOn)
  requiredApprovals?: string[];

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
  owner?: string;                // Human Developer responsible (e.g. "Nuno")
  activeSession?: AgentSession;  // Current active agent execution
  agentHistory?: AgentActivity[]; // History of past sessions
  chatHistory?: ChatMessage[];   // History of user-agent chat
  traceFile?: string;            // Path to current decision trace
};

export type AgentSession = {
  id: string;                    // Session ID
  agent: string;                 // Agent Name (e.g. "Antigravity")
  model: string;                 // Model (e.g. "Claude Opus 4.5")
  phase: string;                 // Phase when ownership started
  startedAt: string;             // ISO date
};

export type AgentActivity = {
  agentId: string; // Keep for history linking
  sessionId: string;
  agentName: string;
  model?: string; // Add model to history
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
  // priority removed
  tags?: string[];
  entryPoints?: string[];
  acceptanceCriteria?: string[];

  risks?: string[];
  checklist?: string[];
  status?: TaskStatus;
  context?: string;
  contextRange?: { startLine: number; endLine: number };
  dependsOn?: string[];           // TASK-XXX IDs that must complete first
  // Legacy fields for backward compatibility with plan import
  dependencies?: string[];
};

export type TaskListKey = 'entryPoints' | 'acceptanceCriteria' | 'checklist' | 'risks' | 'dependencies';

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
 * | Implement  | Tests first, then code (TDD)      | -             |
 * | Verify     | Validation, walkthrough, PR       | VAL-XXX, PR   |
 * | Done       | Completed work                    | -             |
 */
export const DEFAULT_COLUMN_BLUEPRINTS: ReadonlyArray<Column> = [
  { id: 'col-backlog', name: 'Backlog', position: 1 },
  { id: 'col-understand', name: 'Understand', position: 2 },
  { id: 'col-plan', name: 'Plan', position: 3 },
  { id: 'col-implement', name: 'Implement', position: 4 },
  { id: 'col-verify', name: 'Verify', position: 5 },
  { id: 'col-done', name: 'Done', position: 6 },
];



// ============================================================================
// UI Payload Types
// ============================================================================

export type TaskDetailsPayload = {
  id: string;
  title: string;
  summary?: string;
  tags?: string; // Comma separated string for UI
  columnId?: string;              // Column determines workflow phase
  status?: string;                // Autonomy state: ready, agent_active, needs_feedback, blocked, done
  column?: string;                // Column display name
  workflow?: string;              // DevOps workflow (e.g., /create_plan)
  dependsOn?: string[];           // Task dependencies (TASK-XXX IDs)
  priority?: string;
  owner?: {                       // Task Ownership
    developer?: string;
    agent?: string; // Agent name
    model?: string; // Model name
    type?: string;
    sessionId?: string;
  };
  chatHistory?: ChatMessage[];
};
