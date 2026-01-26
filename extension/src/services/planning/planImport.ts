import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Board, Task, Column } from '../../common';
import {
  ImportedTask,
  ParsedPlan,
  TaskListKey,
  ChecklistItem,
  COLUMN_FALLBACK_NAME,
  PLAN_EXTENSIONS,
} from '../../common';
import { readBoard, writeBoard, getWorkspaceRoot } from '../../services/board/boardPersistence';
import {
  appendParagraph,
  getNextColumnPosition,
  isDefined,
  parseBooleanFromString,
  parseTags,
  slugify,
  splitListValues,
  createId,
} from '../../services/tasks/taskUtils';

export async function ensurePlanDirectory(): Promise<string | undefined> {
  const root = getWorkspaceRoot();
  if (!root) {
    vscode.window.showWarningMessage('Open a workspace folder to import plans.');
    return undefined;
  }
  const dir = path.join(root, '.dev_ops', 'plans');
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function listPlanFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    try {
      const stat = await fs.stat(fullPath);
      if (stat.isDirectory()) {
        continue;
      }
      if (PLAN_EXTENSIONS.has(path.extname(entry).toLowerCase())) {
        files.push(fullPath);
      }
    } catch (error) {
      console.warn('Skipping plan entry', fullPath, error);
    }
  }
  return files.sort((a, b) => a.localeCompare(b));
}

export async function parsePlanFile(filePath: string): Promise<ParsedPlan> {
  const raw = await fs.readFile(filePath, 'utf8');
  const lowerExt = path.extname(filePath).toLowerCase();
  if (lowerExt === '.json' || lowerExt === '.jsonc') {
    return parsePlanJson(raw, filePath);
  }
  return parsePlanMarkdown(raw, filePath);
}

export function parsePlanJson(raw: string, filePath: string): ParsedPlan {
  let data: any;
  try {
    data = JSON.parse(raw);
  } catch (error: any) {
    throw new Error(`Invalid plan JSON: ${error?.message ?? error} `);
  }
  if (!Array.isArray(data?.tasks)) {
    throw new Error('Plan JSON must include a "tasks" array.');
  }
  const tasks: ImportedTask[] = data.tasks.map((task: any, index: number) => normalizePlanTaskFromJson(task, index));
  return {
    title: typeof data.title === 'string' ? data.title : undefined,
    summary: typeof data.summary === 'string' ? data.summary : undefined,
    tasks,
    defaultColumn: typeof data.defaultColumn === 'string' ? data.defaultColumn : undefined,
    defaultStatus: typeof data.defaultStatus === 'string' ? data.defaultStatus : undefined,
    globalEntryPoints: ensureStringArray(data.entryPoints),
    globalRisks: ensureStringArray(data.risks),
    filePath,
  };
}

export function normalizePlanTaskFromJson(input: any, index: number): ImportedTask {
  const fallbackTitle = `Task ${index + 1} `;
  const title = typeof input?.title === 'string' && input.title.trim().length ? input.title.trim() : fallbackTitle;
  return {
    id:
      typeof input?.id === 'string' && input.id.trim().length
        ? input.id.trim()
        : slugify(title) || createId('plan', title),
    title,
    summary: typeof input?.summary === 'string' ? input.summary.trim() || undefined : undefined,
    column: typeof input?.column === 'string' ? input.column.trim() || undefined : undefined,
    status: typeof input?.status === 'string' ? input.status.trim() as any || undefined : undefined,
    priority: typeof input?.priority === 'string' ? input.priority.trim() || undefined : undefined,
    tags: ensureStringArray(input?.tags) ?? parseTags(input?.tags),
    entryPoints: ensureStringArray(input?.entryPoints),
    acceptanceCriteria: ensureStringArray(input?.acceptanceCriteria),
    dependencies: ensureStringArray(input?.dependencies),
    risks: ensureStringArray(input?.risks),
    checklist: ensureStringArray(input?.checklist),
    context: typeof input?.context === 'string' ? input.context : undefined,
    contextRange: undefined,
  };
}

export function parsePlanMarkdown(raw: string, filePath: string): ParsedPlan {
  const lines = raw.split(/\r?\n/);
  const tasks: ImportedTask[] = [];
  const globalEntryPoints: string[] = [];
  const globalRisks: string[] = [];
  let section: 'tasks' | 'entrypoints' | 'risks' | undefined;
  let planTitle: string | undefined;
  let defaultColumn: string | undefined;
  let defaultStatus: string | undefined;
  let currentTask: ImportedTask | undefined;
  let currentList: TaskListKey | undefined;

  const flushTask = () => {
    if (!currentTask) {
      return;
    }
    if (!currentTask.summary && currentTask.context) {
      currentTask.summary = currentTask.context.split('\n')[0];
    }
    if (!currentTask.id) {
      currentTask.id = slugify(currentTask.title) || createId('plan', currentTask.title);
    }
    tasks.push(currentTask);
    currentTask = undefined;
    currentList = undefined;
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!planTitle) {
      const h1 = trimmed.match(/^#\s+(.*)$/);
      if (h1) {
        planTitle = h1[1].trim();
        continue;
      }
    }
    const defaultsMatch = trimmed.match(/^Default\s+(Column|Status):\s*(.+)$/i);
    if (defaultsMatch) {
      const key = defaultsMatch[1].toLowerCase();
      const value = defaultsMatch[2].trim();
      if (key === 'column') {
        defaultColumn = value;
      } else {
        defaultStatus = value;
      }
      continue;
    }
    const h2 = trimmed.match(/^##\s+(.*)$/);
    if (h2) {
      const name = h2[1].trim().toLowerCase();
      if (name.startsWith('tasks')) {
        section = 'tasks';
      } else if (name.includes('entry')) {
        section = 'entrypoints';
      } else if (name.includes('risk')) {
        section = 'risks';
      } else {
        section = undefined;
      }
      currentList = undefined;
      if (section !== 'tasks') {
        flushTask();
      }
      continue;
    }
    if (section === 'entrypoints') {
      if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        const entry = trimmed.replace(/^[-*]\s+/, '').trim();
        if (entry) {
          globalEntryPoints.push(entry);
        }
      }
      continue;
    }
    if (section === 'risks') {
      if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        const risk = trimmed.replace(/^[-*]\s+/, '').trim();
        if (risk) {
          globalRisks.push(risk);
        }
      }
      continue;
    }
    if (section !== 'tasks') {
      continue;
    }
    const h3 = trimmed.match(/^###\s+(.*)$/);
    if (h3) {
      flushTask();
      const title = h3[1].replace(/^task:\s*/i, '').trim() || `Task ${tasks.length + 1} `;
      currentTask = {
        id: slugify(title) || createId('plan', title),
        title,
        contextRange: { startLine: i + 2, endLine: i + 2 },
      };
      continue;
    }
    if (!currentTask) {
      continue;
    }
    if (!trimmed) {
      currentList = undefined;
      continue;
    }
    const meta = trimmed.match(/^([A-Za-z ]+):\s*(.*)$/);
    if (meta) {
      const key = meta[1].trim().toLowerCase();
      const value = meta[2].trim();
      switch (key) {
        case 'summary':
          currentTask.summary = value;
          break;
        case 'column':
          currentTask.column = value;
          break;
        case 'status':
          currentTask.status = value.toLowerCase() as any;
          break;
        case 'priority':
          currentTask.priority = value.toLowerCase();
          break;
        case 'tags':
          currentTask.tags = parseTags(value);
          break;
        case 'entry points':
        case 'entrypoints':
          currentTask.entryPoints = value ? splitListValues(value) : undefined;
          currentList = value ? undefined : 'entryPoints';
          break;
        case 'dependencies':
          currentTask.dependencies = value ? splitListValues(value) : undefined;
          currentList = value ? undefined : 'dependencies';
          break;
        case 'acceptance criteria':
          currentTask.acceptanceCriteria = value ? [value] : [];
          currentList = 'acceptanceCriteria';
          break;
        case 'checklist':
          currentTask.checklist = value ? [value] : [];
          currentList = 'checklist';
          break;
        case 'agentready':
        case 'agent ready':
          // Legacy field - ignored, use status instead
          break;
        case 'risks':
          currentTask.risks = value ? [value] : [];
          currentList = 'risks';
          break;
        default:
          currentTask.context = appendParagraph(currentTask.context, trimmed);
          break;
      }
      continue;
    }
    if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
      const bullet = trimmed.replace(/^[-*]\s+/, '').trim();
      if (currentList && bullet) {
        pushPlanTaskValue(currentTask, currentList, bullet);
      } else if (bullet) {
        currentTask.context = appendParagraph(currentTask.context, bullet);
      }
      if (currentTask.contextRange) {
        currentTask.contextRange.endLine = i + 1;
      }
      continue;
    }
    currentTask.context = appendParagraph(currentTask.context, trimmed);
    if (currentTask.contextRange) {
      currentTask.contextRange.endLine = i + 1;
    } else {
      currentTask.contextRange = { startLine: i + 1, endLine: i + 1 };
    }
  }

  flushTask();

  return {
    title: planTitle,
    tasks,
    defaultColumn,
    defaultStatus,
    globalEntryPoints: globalEntryPoints.length ? globalEntryPoints : undefined,
    globalRisks: globalRisks.length ? globalRisks : undefined,
    filePath,
  };
}

export function pushPlanTaskValue(task: ImportedTask, key: TaskListKey, value: string): void {
  if (!value) {
    return;
  }
  const list = task[key] ?? [];
  list.push(value);
  task[key] = list;
}

export function ensureStringArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const cleaned = value.map((entry) => String(entry).trim()).filter(Boolean);
    return cleaned.length ? cleaned : undefined;
  }
  if (typeof value === 'string') {
    return splitListValues(value);
  }
  return undefined;
}

export function findOrCreateColumn(board: Board, name: string): Column {
  const normalized = (name || COLUMN_FALLBACK_NAME).trim();
  const match = board.columns.find(
    (column) => (column.name || COLUMN_FALLBACK_NAME).toLowerCase() === normalized.toLowerCase(),
  );
  if (match) {
    return match;
  }
  const column: Column = {
    id: createId('col', normalized),
    name: normalized,
    position: getNextColumnPosition(board.columns),
  };
  board.columns.push(column);
  return column;
}

export type UpsertResult = { kind: 'created' | 'updated'; item: Task };

export function upsertPlanTask(
  board: Board,
  column: Column,
  planTask: ImportedTask,
  parsed: ParsedPlan,
  planPath: string,
): UpsertResult {
  const existing = board.items.find(
    (item) => item.source?.type === 'plan' && item.source.planFile === planPath && item.source.taskId === planTask.id,
  );
  const entryPoints = mergeLists(planTask.entryPoints, parsed.globalEntryPoints);
  const risks = mergeLists(planTask.risks, parsed.globalRisks);
  if (existing) {
    applyPlanTask(existing, column, planTask, planPath, parsed.defaultStatus, entryPoints, risks);
    return { kind: 'updated', item: existing };
  }
  const item: Task = {
    id: createId('task', planTask.title),
    columnId: column.id,
    title: planTask.title,
  };
  board.items.push(item);
  applyPlanTask(item, column, planTask, planPath, parsed.defaultStatus, entryPoints, risks);
  return { kind: 'created', item };
}

export function applyPlanTask(
  item: Task,
  column: Column,
  planTask: ImportedTask,
  planPath: string,
  _defaultStatus: string | undefined,
  entryPoints?: string[],
  risks?: string[],
): void {
  item.columnId = column.id;
  item.title = planTask.title;
  item.summary = planTask.summary ?? planTask.context?.split('\n')[0] ?? item.summary;
  // Note: status is now determined by columnId, not stored separately
  item.priority = planTask.priority ?? item.priority;
  item.tags = planTask.tags ?? item.tags;
  item.entryPoints = entryPoints ?? item.entryPoints;
  item.acceptanceCriteria = planTask.acceptanceCriteria ?? item.acceptanceCriteria;
  item.upstream = planTask.upstream ?? planTask.dependencies ?? item.upstream;
  item.risks = risks ?? item.risks;
  // Convert string[] checklist to ChecklistItem[] format
  if (planTask.checklist) {
    item.checklist = planTask.checklist.map((text): ChecklistItem => ({ text, done: false }));
  }
  item.context = planTask.context ?? item.context;
  item.contextFile = planPath;
  item.contextRange = planTask.contextRange ?? item.contextRange;
  item.status = planTask.status ?? item.status;
  item.source = { type: 'plan', planFile: planPath, taskId: planTask.id };
  item.updatedAt = new Date().toISOString();
}

export function mergeLists(...lists: (string[] | undefined)[]): string[] | undefined {
  const merged = lists.filter(isDefined).flat();
  if (!merged.length) {
    return undefined;
  }
  const unique = Array.from(new Set(merged));
  return unique;
}

export async function ensureTaskDocument(
  task: Task,
  planTask: ImportedTask,
  relativePlanPath: string,
  columnName?: string,
): Promise<void> {
  const root = getWorkspaceRoot();
  if (!root) {
    return;
  }
  const tasksDir = path.join(root, 'local', 'tasks');
  await fs.mkdir(tasksDir, { recursive: true });
  const docPath = path.join(tasksDir, `${task.id}.md`);
  try {
    await fs.stat(docPath);
    return;
  } catch (error: any) {
    if (error?.code !== 'ENOENT') {
      console.warn('Unable to inspect task doc', docPath, error);
      return;
    }
  }
  const lines: string[] = [
    `# ${task.title} `,
    '',
    `Source Plan: ${relativePlanPath} `,
    columnName ? `Column: ${columnName} ` : undefined,
    `Priority: ${task.priority ?? 'not set'} `,
  ].filter(isDefined);
  if (planTask.context) {
    lines.push('', '## Context', planTask.context);
  }
  if (planTask.acceptanceCriteria?.length) {
    lines.push('', '## Acceptance Criteria');
    planTask.acceptanceCriteria.forEach((criterion) => lines.push(`- [] ${criterion} `));
  }
  if (planTask.checklist?.length) {
    lines.push('', '## Checklist');
    planTask.checklist.forEach((item) => lines.push(`- [] ${item} `));
  }
  const entryPoints = planTask.entryPoints ?? task.entryPoints;
  if (entryPoints?.length) {
    lines.push('', '## Entry Points');
    entryPoints.forEach((entry) => lines.push(`- ${entry} `));
  }
  await fs.writeFile(docPath, lines.join('\n'), 'utf8');
}
