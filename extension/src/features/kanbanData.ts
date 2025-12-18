import { Column, Task, Board, COLUMN_FALLBACK_NAME } from './types';

export function compareTasks(a: Task, b: Task): number {
  // Sort by column rank (In Progress first, then Backlog, etc.)
  const columnDelta = getColumnRank(a.columnId) - getColumnRank(b.columnId);
  if (columnDelta !== 0) {
    return columnDelta;
  }
  const priorityDelta = getPriorityRank(a.priority) - getPriorityRank(b.priority);
  if (priorityDelta !== 0) {
    return priorityDelta;
  }
  return getUpdatedAtRank(a.updatedAt) - getUpdatedAtRank(b.updatedAt);
}

/**
 * Rank columns for sorting. Lower = higher priority in display.
 * Active work columns come first.
 */
export function getColumnRank(columnId?: string): number {
  switch (columnId) {
    case 'col-inprogress':
      return 0;  // Active work first
    case 'col-research':
      return 1;
    case 'col-planning':
      return 2;
    case 'col-review':
      return 3;
    case 'col-backlog':
      return 4;
    case 'col-blocked':
      return 5;
    case 'col-done':
      return 6;
    default:
      return 7;
  }
}

/** @deprecated Use getColumnRank instead - kept for backward compatibility */
export function getStatusRank(status?: string): number {
  switch (status?.toLowerCase()) {
    case 'in_progress':
    case 'in-progress':
    case 'doing':
    case 'col-inprogress':
      return 0;
    case 'todo':
    case 'backlog':
    case 'col-backlog':
      return 1;
    case 'blocked':
    case 'col-blocked':
      return 2;
    case 'review':
    case 'in_review':
    case 'col-review':
      return 3;
    case 'done':
    case 'complete':
    case 'col-done':
      return 4;
    default:
      return 5;
  }
}

export function getPriorityRank(priority?: string): number {
  switch (priority?.toLowerCase()) {
    case 'p0':
    case 'critical':
    case 'high':
      return 0;
    case 'p1':
    case 'medium':
      return 1;
    case 'p2':
    case 'low':
      return 2;
    default:
      return 3;
  }
}

export function getUpdatedAtRank(updatedAt?: string): number {
  if (!updatedAt) {
    return Number.MAX_SAFE_INTEGER;
  }
  const timestamp = Date.parse(updatedAt);
  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
}

export function compareNumbers(a?: number, b?: number): number {
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }
  if (typeof a === 'number') {
    return -1;
  }
  if (typeof b === 'number') {
    return 1;
  }
  return 0;
}

export function sortColumnsForManager(columns: Column[]): Column[] {
  return [...columns].sort((left, right) => {
    const positionDelta = compareNumbers(left.position, right.position);
    if (positionDelta !== 0) {
      return positionDelta;
    }
    const leftName = left.name || COLUMN_FALLBACK_NAME;
    const rightName = right.name || COLUMN_FALLBACK_NAME;
    return leftName.localeCompare(rightName);
  });
}

export function getNextColumnPosition(columns: Column[]): number {
  if (!columns.length) {
    return 1;
  }
  const positions = columns.map((column) => (typeof column.position === 'number' ? column.position : 0));
  return Math.max(...positions, columns.length) + 1;
}

export function parseTags(input?: string): string[] | undefined {
  if (!input) {
    return undefined;
  }
  const tags = input
    .split(/[\s,]+/)
    .map((tag) => tag.trim())
    .filter(Boolean);
  return tags.length ? tags : undefined;
}

export function splitListValues(value?: string): string[] | undefined {
  if (!value) {
    return undefined;
  }
  const parts = value
    .split(/[,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length ? parts : undefined;
}

export function appendParagraph(current: string | undefined, addition: string): string {
  return current ? `${current}\n${addition}` : addition;
}

export function parseBooleanFromString(value: string): boolean {
  return ['true', 'yes', 'y', '1'].includes(value.trim().toLowerCase());
}

export function createId(prefix: string, seed?: string): string {
  const slug = seed ? slugify(seed) : '';
  const random = Math.random().toString(36).slice(2, 6);
  const timestamp = Date.now().toString(36);
  return [prefix, slug || undefined, `${random}${timestamp}`].filter(Boolean).join('-');
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);
}

export function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}

/**
 * Generate a unique task ID in TASK-XXX format.
 * Finds the next available number by checking existing IDs.
 */
export function createTaskId(board: Board): string {
  const existingIds = new Set(board.items.map((item) => item.id));
  let num = 1;
  while (existingIds.has(`TASK-${num.toString().padStart(3, '0')}`)) {
    num++;
  }
  return `TASK-${num.toString().padStart(3, '0')}`;
}

