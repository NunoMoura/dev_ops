import * as vscode from 'vscode';
import { TaskDetailsPayload } from '../../types';
import { Task, COLUMN_FALLBACK_NAME } from '../../types';
import { isDefined, getBlockingTasks } from '../../services/tasks/taskUtils';

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
    task.description ? `Description: ${task.description}` : undefined,
    task.tags?.length ? `Tags: ${task.tags.join(', ')}` : undefined,
    task.updatedAt ? `Updated: ${task.updatedAt}` : undefined,
    task.contextFile ? `Plan: ${task.contextFile}` : undefined,
    task.acceptanceCriteria?.length ? `Acceptance Criteria: ${task.acceptanceCriteria.length}` : undefined,

    task.dependsOn?.length ? `Depends On: ${task.dependsOn.length} task(s)` : undefined,
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
    task.description ? `Description: ${task.description}` : undefined,
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
  if (task.dependsOn?.length) {
    detail.push('', `Depends On: ${task.dependsOn.join(', ')}`);
  }

  if (task.risks?.length) {
    detail.push('', 'Risks:');
    task.risks.forEach((risk) => detail.push(`- ${risk}`));
  }
  return detail.filter((line, index, arr) => !(line === '' && arr[index + 1] === '')).join('\n');
}

export function buildCardPayload(task: Task, columnName: string): TaskDetailsPayload {
  // Build owner metadata from task.owner (string) and task.activeSession
  const ownerPayload = (task.owner || task.activeSession) ? {
    developer: task.owner || undefined,
    agent: task.activeSession?.agent || undefined,
    model: task.activeSession?.model || undefined,
    sessionId: task.activeSession?.id || undefined,
  } : undefined;

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    tags: task.tags?.join(', '),
    // priority removed
    columnId: task.columnId,
    status: task.status,
    column: columnName,
    workflow: task.workflow,
    owner: ownerPayload,
    dependsOn: task.dependsOn,
  };
}






