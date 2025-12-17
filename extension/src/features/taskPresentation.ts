import * as vscode from 'vscode';
import { CardTaskPayload, CardFeatureTask, CardFeatureTaskItem } from '../cardView';
import { KanbanItem, FeatureTask, FeatureTaskItem, FeatureTaskItemStatus, COLUMN_FALLBACK_NAME } from './types';
import { isDefined } from './kanbanData';

export function buildTaskDescription(task: KanbanItem): string | undefined {
  const parts = [
    task.status,
    task.priority,
    task.agentReady ? 'agentReady' : undefined,
    task.tags?.length ? task.tags.join(', ') : undefined,
  ].filter(isDefined);
  return parts.length ? parts.join(' • ') : undefined;
}

export function buildTaskTooltip(task: KanbanItem, columnName: string): string {
  const lines = [
    `**${task.title}**`,
    '',
    `Column: ${columnName || COLUMN_FALLBACK_NAME}`,
    `Status: ${task.status ?? 'unknown'}`,
    `Priority: ${task.priority ?? 'not set'}`,
    `Agent Ready: ${task.agentReady ? 'yes' : 'no'}`,
    task.summary ? `Summary: ${task.summary}` : undefined,
    task.tags?.length ? `Tags: ${task.tags.join(', ')}` : undefined,
    task.updatedAt ? `Updated: ${task.updatedAt}` : undefined,
    task.contextFile ? `Plan: ${task.contextFile}` : undefined,
    task.acceptanceCriteria?.length ? `Acceptance Criteria: ${task.acceptanceCriteria.length}` : undefined,
    task.dependencies?.length ? `Dependencies: ${task.dependencies.length}` : undefined,
  ];
  return lines.filter(isDefined).join('\n');
}

export function buildTaskDetail(task: KanbanItem, columnName: string): string {
  const detail = [
    `Status: ${task.status ?? 'unknown'}`,
    `Priority: ${task.priority ?? 'not set'}`,
    `Agent Ready: ${task.agentReady ? 'yes' : 'no'}`,
    task.tags?.length ? `Tags: ${task.tags.join(', ')}` : undefined,
    task.updatedAt ? `Updated: ${task.updatedAt}` : undefined,
    task.summary ? `Summary: ${task.summary}` : undefined,
    `Column: ${columnName || COLUMN_FALLBACK_NAME}`,
    task.contextFile ? `Plan: ${task.contextFile}` : undefined,
  ];
  if (task.acceptanceCriteria?.length) {
    detail.push('', 'Acceptance Criteria:');
    task.acceptanceCriteria.forEach((criterion) => detail.push(`- ${criterion}`));
  }
  if (task.checklist?.length) {
    detail.push('', 'Checklist:');
    task.checklist.forEach((item) => detail.push(`- [ ] ${item}`));
  }
  if (task.dependencies?.length) {
    detail.push('', `Dependencies: ${task.dependencies.join(', ')}`);
  }
  if (task.risks?.length) {
    detail.push('', 'Risks:');
    task.risks.forEach((risk) => detail.push(`- ${risk}`));
  }
  return detail.filter((line, index, arr) => !(line === '' && arr[index + 1] === '')).join('\n');
}

export function buildCardPayload(task: KanbanItem, columnName: string): CardTaskPayload {
  return {
    id: task.id,
    title: task.title,
    summary: task.summary,
    tags: task.tags?.join(', '),
    priority: task.priority,
    status: task.status,
    agentReady: task.agentReady,
    column: columnName,
    featureTasks: task.featureTasks?.map((featureTask) => ({
      id: featureTask.id,
      title: featureTask.title,
      summary: featureTask.summary,
      items:
        featureTask.items?.map((item) => ({
          id: item.id,
          title: item.title,
          status: item.status,
        })) ?? [],
    })),
  };
}

export function normalizeFeatureTasks(raw?: CardFeatureTask[]): FeatureTask[] | undefined {
  if (!raw?.length) {
    return undefined;
  }
  const normalized: FeatureTask[] = [];
  for (const candidate of raw) {
    if (!candidate) {
      continue;
    }
    const id = candidate.id?.trim();
    const title = candidate.title?.trim();
    if (!id || !title) {
      continue;
    }
    normalized.push({
      id,
      title,
      summary: candidate.summary?.trim() || undefined,
      items: normalizeFeatureTaskItems(candidate.items),
    });
  }
  return normalized.length ? normalized : undefined;
}

export function normalizeFeatureTaskItems(items?: CardFeatureTaskItem[]): FeatureTaskItem[] {
  if (!items?.length) {
    return [];
  }
  const normalized: FeatureTaskItem[] = [];
  for (const candidate of items) {
    if (!candidate) {
      continue;
    }
    const id = candidate.id?.trim();
    const title = candidate.title?.trim();
    if (!id || !title) {
      continue;
    }
    const status = normalizeFeatureTaskItemStatus(candidate.status);
    normalized.push({ id, title, status });
  }
  return normalized;
}

function normalizeFeatureTaskItemStatus(status?: string): FeatureTaskItemStatus {
  const allowed: FeatureTaskItemStatus[] = ['todo', 'in_progress', 'blocked', 'review', 'done'];
  return allowed.includes(status as FeatureTaskItemStatus) ? (status as FeatureTaskItemStatus) : 'todo';
}

export function buildCodexPrompt(task: KanbanItem, columnName: string): string {
  const lines: string[] = [
    `# Task: ${task.title}`,
    '',
    `Column: ${columnName}`,
    `Status: ${task.status ?? 'unknown'}`,
    `Priority: ${task.priority ?? 'not set'}`,
    `Agent Ready: ${task.agentReady ? 'yes' : 'no'}`,
    task.tags?.length ? `Tags: ${task.tags.join(', ')}` : undefined,
    task.dependencies?.length ? `Dependencies: ${task.dependencies.join(', ')}` : undefined,
    task.updatedAt ? `Updated: ${task.updatedAt}` : undefined,
    task.contextFile ? `Context File: ${task.contextFile}` : undefined,
  ].filter(isDefined);

  if (task.summary) {
    lines.push('', '## Summary', task.summary);
  }
  if (task.context) {
    lines.push('', '## Context', '```markdown', task.context, '```');
  }
  if (task.acceptanceCriteria?.length) {
    lines.push('', '## Acceptance Criteria');
    task.acceptanceCriteria.forEach((criterion) => lines.push(`- ${criterion}`));
  }
  if (task.checklist?.length) {
    lines.push('', '## Checklist');
    task.checklist.forEach((item) => lines.push(`- [ ] ${item}`));
  }
  if (task.entryPoints?.length) {
    lines.push('', '## Entry Points');
    task.entryPoints.forEach((entry) => lines.push(`- ${entry}`));
  }
  if (task.risks?.length) {
    lines.push('', '## Risks');
    task.risks.forEach((risk) => lines.push(`- ${risk}`));
  }
  return lines.join('\n');
}

export async function presentCodexPrompt(task: KanbanItem, columnName: string): Promise<void> {
  const prompt = buildCodexPrompt(task, columnName);
  await vscode.env.clipboard.writeText(prompt);
  const doc = await vscode.workspace.openTextDocument({ language: 'markdown', content: prompt });
  await vscode.window.showTextDocument(doc, { preview: true });
  vscode.window.showInformationMessage('Copied Codex prompt to clipboard.');
}
