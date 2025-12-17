export type KanbanColumn = {
  id: string;
  name: string;
  position: number;
};

export type KanbanItem = {
  id: string;
  columnId: string;
  title: string;
  summary?: string;
  status?: string;
  priority?: string;
  tags?: string[];
  updatedAt?: string;
  entryPoints?: string[];
  agentReady?: boolean;
  acceptanceCriteria?: string[];
  dependencies?: string[];
  risks?: string[];
  checklist?: string[];
  context?: string;
  contextFile?: string;
  contextRange?: {
    startLine: number;
    endLine: number;
  };
  source?: TaskSource;
  featureTasks?: FeatureTask[];
};

export type FeatureTaskItemStatus = 'todo' | 'in_progress' | 'blocked' | 'review' | 'done';

export type FeatureTaskItem = {
  id: string;
  title: string;
  status: FeatureTaskItemStatus;
};

export type FeatureTask = {
  id: string;
  title: string;
  summary?: string;
  items: FeatureTaskItem[];
};

export type TaskSource = {
  type: 'plan';
  planFile: string;
  taskId?: string;
};

export type KanbanBoard = {
  version: number;
  columns: KanbanColumn[];
  items: KanbanItem[];
};

export type FilterToken = { type: 'text'; value: string } | { type: 'tag'; value: string };

export type TaskFilter = {
  raw: string;
  tokens: FilterToken[];
};

export type FilterState = {
  text?: TaskFilter;
  onlyAgentReady?: boolean;
  status?: 'blocked' | undefined;
};

export type PlanTask = {
  id: string;
  title: string;
  summary?: string;
  column?: string;
  status?: string;
  priority?: string;
  tags?: string[];
  entryPoints?: string[];
  acceptanceCriteria?: string[];
  dependencies?: string[];
  risks?: string[];
  checklist?: string[];
  agentReady?: boolean;
  context?: string;
  contextRange?: { startLine: number; endLine: number };
};

export type PlanTaskListKey = 'entryPoints' | 'acceptanceCriteria' | 'dependencies' | 'checklist' | 'risks';

export type ParsedPlan = {
  title?: string;
  summary?: string;
  tasks: PlanTask[];
  defaultColumn?: string;
  defaultStatus?: string;
  globalEntryPoints?: string[];
  globalRisks?: string[];
  filePath: string;
};

export const COLUMN_FALLBACK_NAME = 'Unassigned';
export const PLAN_EXTENSIONS = new Set(['.md', '.markdown', '.json', '.jsonc']);
export const DEFAULT_PLANNING_COLUMN = 'Planning';
export const IDEA_COLUMN_NAME = 'I have an Idea';
export const DEFAULT_COLUMN_BLUEPRINTS: ReadonlyArray<KanbanColumn> = [
  { id: 'col-idea', name: 'I have an Idea', position: 1 },
  { id: 'col-working', name: 'I am working through the idea', position: 2 },
  { id: 'col-breakdown', name: 'I am breaking it down into pieces', position: 3 },
  { id: 'col-iterating', name: 'I am iterating through implementation', position: 4 },
  { id: 'col-testing', name: 'I am testing this feature component', position: 5 },
  { id: 'col-ready', name: 'This component is ready', position: 6 },
  { id: 'col-complete', name: 'Feature complete', position: 7 },
];
export const FEATURE_ITEM_STATUSES: ReadonlySet<FeatureTaskItemStatus> = new Set([
  'todo',
  'in_progress',
  'blocked',
  'review',
  'done',
]);
