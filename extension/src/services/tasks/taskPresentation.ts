import * as vscode from 'vscode';
import { TaskDetailsPayload } from '../../types';
import { Task, COLUMN_FALLBACK_NAME } from '../../types';
import { isDefined } from '../../services/tasks/taskUtils';

export function buildTaskDescription(task: Task): string | undefined {
  const parts = [
    task.columnId,
    task.status ? `status:${task.status}` : undefined,
    task.tags?.length ? task.tags.join(', ') : undefined,
  ].filter(isDefined);
  return parts.length ? parts.join(' • ') : undefined;
}

export function buildTaskTooltip(task: Task, columnName: string): string {
  const lines = [
    `**${task.title}**`,
    '',
    `Column: ${columnName || COLUMN_FALLBACK_NAME}`,
    // priority removed
    `Status: ${task.status ?? 'ready'}`,
    task.workflow ? `Workflow: ${task.workflow}` : undefined,
    task.summary ? `Summary: ${task.summary}` : undefined,
    task.tags?.length ? `Tags: ${task.tags.join(', ')}` : undefined,
    task.updatedAt ? `Updated: ${task.updatedAt}` : undefined,
    task.contextFile ? `Plan: ${task.contextFile}` : undefined,
    task.acceptanceCriteria?.length ? `Acceptance Criteria: ${task.acceptanceCriteria.length}` : undefined,
    task.upstream?.length ? `Upstream: ${task.upstream.length}` : undefined,
  ];
  return lines.filter(isDefined).join('\n');
}

export function buildTaskDetail(task: Task, columnName: string): string {
  const detail = [
    `Column: ${columnName || COLUMN_FALLBACK_NAME}`,
    // priority removed
    `Status: ${task.status ?? 'ready'}`,
    task.workflow ? `Workflow: ${task.workflow}` : undefined,
    task.tags?.length ? `Tags: ${task.tags.join(', ')}` : undefined,
    task.updatedAt ? `Updated: ${task.updatedAt}` : undefined,
    task.summary ? `Summary: ${task.summary}` : undefined,
    task.contextFile ? `Plan: ${task.contextFile}` : undefined,
  ];
  if (task.acceptanceCriteria?.length) {
    detail.push('', 'Acceptance Criteria:');
    task.acceptanceCriteria.forEach((criterion) => detail.push(`- ${criterion}`));
  }
  if (task.checklist?.length) {
    detail.push('', 'Checklist:');
    task.checklist.forEach((item) => detail.push(`- [${item.done ? 'x' : ' '}] ${item.text}`));
  }
  if (task.upstream?.length) {
    detail.push('', `Upstream: ${task.upstream.join(', ')}`);
  }
  if (task.downstream?.length) {
    detail.push('', `Downstream: ${task.downstream.join(', ')}`);
  }
  if (task.risks?.length) {
    detail.push('', 'Risks:');
    task.risks.forEach((risk) => detail.push(`- ${risk}`));
  }
  return detail.filter((line, index, arr) => !(line === '' && arr[index + 1] === '')).join('\n');
}

export function buildCardPayload(task: Task, columnName: string): TaskDetailsPayload {
  return {
    id: task.id,
    title: task.title,
    summary: task.summary,
    tags: task.tags?.join(', '),
    // priority removed
    columnId: task.columnId,
    status: task.status,
    column: columnName,
    workflow: task.workflow,
    upstream: task.upstream,
    downstream: task.downstream,
  };
}

// Legacy FeatureTask normalization removed - use upstream/downstream on Task instead


export function buildCodexPrompt(task: Task, columnName: string): string {
  const lines: string[] = [
    `# Task: ${task.title}`,
    '',
    `Column: ${columnName}`,
    // priority removed
    `Status: ${task.status ?? 'ready'}`,
    task.workflow ? `Workflow: ${task.workflow}` : undefined,
    task.tags?.length ? `Tags: ${task.tags.join(', ')}` : undefined,
    task.upstream?.length ? `Upstream: ${task.upstream.join(', ')}` : undefined,
    task.downstream?.length ? `Downstream: ${task.downstream.join(', ')}` : undefined,
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
    task.checklist.forEach((item) => lines.push(`- [${item.done ? 'x' : ' '}] ${item.text}`));
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

export async function presentCodexPrompt(task: Task, columnName: string): Promise<void> {
  const prompt = buildCodexPrompt(task, columnName);
  await vscode.env.clipboard.writeText(prompt);
  const doc = await vscode.workspace.openTextDocument({ language: 'markdown', content: prompt });
  await vscode.window.showTextDocument(doc, { preview: true });
  vscode.window.showInformationMessage('Copied Codex prompt to clipboard.');
}

