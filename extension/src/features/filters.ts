import { Column, Task, FilterState, TaskFilter, FilterToken, COLUMN_FALLBACK_NAME } from './types';
import { isDefined } from './kanbanData';

export function parseTaskFilter(raw?: string): TaskFilter | undefined {
  if (!raw || !raw.trim()) {
    return undefined;
  }
  const tokens = raw
    .trim()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token): FilterToken | undefined => {
      if (!token) {
        return undefined;
      }
      if (token.startsWith('#')) {
        return { type: 'tag', value: token.slice(1).toLowerCase() };
      }
      if (token.toLowerCase().startsWith('tag:')) {
        return { type: 'tag', value: token.slice(4).toLowerCase() };
      }
      return { type: 'text', value: token.toLowerCase() };
    })
    .filter(isDefined);
  if (!tokens.length) {
    return undefined;
  }
  return { raw: raw.trim(), tokens };
}

export function applyFilters(tasks: Task[], column: Column, filter: FilterState): Task[] {
  if (!filter.text && !filter.onlyAgentReady && !filter.columnId) {
    return tasks;
  }
  return tasks.filter((task) => matchesAllFilters(task, column, filter));
}

export function matchesAllFilters(item: Task, column: Column, filter: FilterState): boolean {
  if (filter.onlyAgentReady && !item.agentReady) {
    return false;
  }
  // Filter by blocked column
  if (filter.columnId === 'col-blocked' && item.columnId !== 'col-blocked') {
    return false;
  }
  if (filter.text && !matchesTextFilter(item, column, filter.text)) {
    return false;
  }
  return true;
}

export function matchesTextFilter(item: Task, column: Column, filter: TaskFilter): boolean {
  if (!filter.tokens.length) {
    return true;
  }
  const columnName = column.name || COLUMN_FALLBACK_NAME;
  const haystack = [item.title, item.summary, item.columnId, item.priority, columnName]
    .filter(isDefined)
    .join(' ')
    .toLowerCase();
  const tags = (item.tags ?? []).map((tag) => tag.toLowerCase());
  return filter.tokens.every((token) => {
    if (token.type === 'tag') {
      return tags.some((tag) => tag.includes(token.value));
    }
    return haystack.includes(token.value);
  });
}

export function columnMatchesFilters(column: Column, filter: FilterState): boolean {
  if (!filter.text) {
    return false;
  }
  return columnMatchesTextFilter(column, filter.text);
}

export function columnMatchesTextFilter(column: Column, filter: TaskFilter): boolean {
  const columnName = (column.name || COLUMN_FALLBACK_NAME).toLowerCase();
  return filter.tokens.some((token) => token.type === 'text' && columnName.includes(token.value));
}
