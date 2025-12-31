import * as vscode from 'vscode';
import { BoardViewSnapshot } from '../boardView';
import { Board, Column, Task, COLUMN_FALLBACK_NAME, FilterState } from '../features/types';
import { readBoard, writeBoard } from '../features/boardStore';
import { applyFilters, columnMatchesFilters, parseTaskFilter } from '../features/filters';
import { compareNumbers, compareTasks, sortColumnsForManager } from '../features/kanbanData';
import { buildTaskDescription, buildTaskTooltip } from '../features/taskPresentation';
import { formatError } from '../features/errors';

export type KanbanColumnNode = { kind: 'column'; column: Column };
export type KanbanItemNode = { kind: 'item'; item: Task; column: Column };
export type BoardNode = KanbanColumnNode | KanbanItemNode;
export type KanbanManagerActionNode = {
  kind: 'action';
  id: string;
  label: string;
  description?: string;
  command: string;
  args?: unknown[];
};
export type KanbanManagerColumnNode = {
  kind: 'column';
  column: Column;
  taskCount: number;
};
export type BoardManagerNode = KanbanManagerActionNode | KanbanManagerColumnNode;

export class BoardTreeProvider implements vscode.TreeDataProvider<BoardNode> {
  private board: Board | undefined;
  private columnNodes: KanbanColumnNode[] = [];
  private itemsByColumn = new Map<string, KanbanItemNode[]>();
  private itemsById = new Map<string, KanbanItemNode>();
  private filter: FilterState = {};
  private readonly onDidChangeEmitter = new vscode.EventEmitter<BoardNode | undefined>();
  private readonly onDidUpdateBoardEmitter = new vscode.EventEmitter<BoardViewSnapshot | undefined>();
  readonly onDidChangeTreeData = this.onDidChangeEmitter.event;
  readonly onDidUpdateBoardView = this.onDidUpdateBoardEmitter.event;

  constructor(private readonly loadBoard: () => Promise<Board>) { }

  getFilterText(): string | undefined {
    return this.filter.text?.raw;
  }

  getFilterSummary(): string | undefined {
    const parts: string[] = [];
    if (this.filter.text?.raw) {
      parts.push(this.filter.text.raw);
    }
    if (this.filter.status) {
      parts.push(`status:${this.filter.status}`);
    }
    if (this.filter.columnId) {
      parts.push(`column:${this.filter.columnId}`);
    }
    return parts.length ? parts.join(' | ') : undefined;
  }

  hasFilter(): boolean {
    return Boolean(this.filter.text || this.filter.status || this.filter.columnId);
  }

  async setTextFilter(raw?: string): Promise<void> {
    this.filter = { ...this.filter, text: parseTaskFilter(raw) };
    await this.refresh();
  }

  async clearFilters(): Promise<void> {
    this.filter = {};
    await this.refresh();
  }

  async toggleStatusFilter(status: string): Promise<void> {
    const newStatus = this.filter.status === status ? undefined : status;
    this.filter = { ...this.filter, status: newStatus as any };
    await this.refresh();
  }

  async toggleBlockedFilter(): Promise<void> {
    const status = this.filter.status === 'blocked' ? undefined : 'blocked';
    this.filter = { ...this.filter, status: status as any };
    await this.refresh();
  }

  isStatusFilterEnabled(status: string): boolean {
    return this.filter.status === status;
  }

  isBlockedFilterEnabled(): boolean {
    return this.filter.status === 'blocked';
  }

  async refresh(): Promise<void> {
    await this.reloadBoard();
    this.onDidChangeEmitter.fire(undefined);
  }

  async getChildren(element?: BoardNode): Promise<BoardNode[]> {
    await this.ensureLoaded();
    if (!this.board) {
      return [];
    }
    if (!element) {
      return this.columnNodes;
    }
    if (element.kind === 'column') {
      return this.itemsByColumn.get(element.column.id) ?? [];
    }
    return [];
  }

  getTreeItem(element: BoardNode): vscode.TreeItem {
    if (element.kind === 'column') {
      const item = new vscode.TreeItem(
        element.column.name || COLUMN_FALLBACK_NAME,
        vscode.TreeItemCollapsibleState.Collapsed,
      );
      item.id = element.column.id;
      item.contextValue = 'kanbanColumn';
      return item;
    }

    const task = element.item;
    const treeItem = new vscode.TreeItem(task.title, vscode.TreeItemCollapsibleState.None);
    treeItem.id = task.id;
    treeItem.description = buildTaskDescription(task);
    treeItem.tooltip = new vscode.MarkdownString(buildTaskTooltip(task, element.column.name));
    treeItem.contextValue = 'kanbanTask';
    return treeItem;
  }

  getParent(element: BoardNode): BoardNode | undefined {
    if (element.kind === 'item') {
      return this.columnNodes.find(({ column }) => column.id === element.item.columnId);
    }
    return undefined;
  }

  getColumnNode(columnId: string): KanbanColumnNode | undefined {
    return this.columnNodes.find((node) => node.column.id === columnId);
  }

  async revealTask(taskId: string | undefined, view: vscode.TreeView<BoardNode>): Promise<void> {
    if (!taskId) {
      return;
    }
    await this.ensureLoaded();
    let node = this.itemsById.get(taskId);
    if (!node) {
      await this.reloadBoard();
      node = this.itemsById.get(taskId);
    }
    if (!node && this.hasFilter()) {
      vscode.window.showWarningMessage('Task is hidden by the active Kanban filter. Clear the filter to reveal it.');
      return;
    }
    if (!node) {
      vscode.window.showWarningMessage(`Task ${taskId} is not on the current board.`);
      return;
    }
    await view.reveal(node, { select: true, focus: true, expand: true });
  }

  private async ensureLoaded(): Promise<void> {
    if (!this.board) {
      await this.reloadBoard();
    }
  }

  private async reloadBoard(): Promise<void> {
    this.board = await this.loadBoard();
    this.itemsByColumn.clear();
    this.itemsById.clear();
    const sortedColumns = [...this.board.columns].sort((a, b) => {
      const positionDelta = compareNumbers(a.position, b.position);
      if (positionDelta !== 0) {
        return positionDelta;
      }
      const aName = a.name || COLUMN_FALLBACK_NAME;
      const bName = b.name || COLUMN_FALLBACK_NAME;
      return aName.localeCompare(bName);
    });
    const nextColumns: KanbanColumnNode[] = [];
    for (const column of sortedColumns) {
      const columnTasks = this.board.items.filter((item) => item.columnId === column.id).sort(compareTasks);
      const visibleTasks = applyFilters(columnTasks, column, this.filter);
      if (this.hasFilter() && !visibleTasks.length && !columnMatchesFilters(column, this.filter)) {
        continue;
      }
      const columnNode: KanbanColumnNode = { kind: 'column', column };
      nextColumns.push(columnNode);
      const nodes = visibleTasks.map((item) => ({ kind: 'item', item, column } as KanbanItemNode));
      this.itemsByColumn.set(column.id, nodes);
      nodes.forEach((node) => this.itemsById.set(node.item.id, node));
    }
    this.columnNodes = nextColumns;
    this.onDidUpdateBoardEmitter.fire(this.getBoardViewSnapshot());
  }

  getBoardViewSnapshot(): BoardViewSnapshot | undefined {
    if (!this.board) {
      return undefined;
    }
    const columns = this.columnNodes.map((node) => ({
      id: node.column.id,
      name: node.column.name || COLUMN_FALLBACK_NAME,
      position: node.column.position ?? 0,
    }));
    const tasks: BoardViewSnapshot['tasks'] = [];
    for (const columnNode of this.columnNodes) {
      const nodes = this.itemsByColumn.get(columnNode.column.id) ?? [];
      for (const itemNode of nodes) {
        const task = itemNode.item;
        // Calculate checklist progress
        const checklist = task.checklist ?? [];
        const checklistTotal = checklist.length;
        // Simple checklist: just strings; FeatureTasks have items with status
        // For now, count strings as items (no completion tracking for simple strings)
        const checklistDone = 0; // Would need item.done or similar to track

        tasks.push({
          id: task.id,
          columnId: columnNode.column.id,
          title: task.title,
          summary: task.summary,
          columnName: columnNode.column.name,
          priority: task.priority,
          status: task.status,
          tags: task.tags,
          updatedAt: task.updatedAt,
          upstream: task.upstream,
          downstream: task.downstream,
          checklistTotal,
          checklistDone,
        });
      }
    }
    return { columns, tasks };
  }
}

export class KanbanManagerProvider implements vscode.TreeDataProvider<BoardManagerNode> {
  private board: Board | undefined;
  private readonly onDidChangeEmitter = new vscode.EventEmitter<BoardManagerNode | undefined>();
  readonly onDidChangeTreeData = this.onDidChangeEmitter.event;
  private readonly dragAndDrop: KanbanManagerDragAndDropController;
  private readonly actions: KanbanManagerActionNode[] = [
    {
      kind: 'action',
      id: 'kanban-manager-new-column',
      label: 'New Column',
      description: 'Add a column to the board',
      command: 'kanban.createColumn',
    },
  ];

  constructor(private readonly treeProvider: BoardTreeProvider) {
    this.dragAndDrop = new KanbanManagerDragAndDropController(this);
  }

  getDragAndDropController(): KanbanManagerDragAndDropController {
    return this.dragAndDrop;
  }

  async refresh(): Promise<void> {
    await this.reloadBoard();
    this.onDidChangeEmitter.fire(undefined);
  }

  async getChildren(element?: BoardManagerNode): Promise<BoardManagerNode[]> {
    if (element) {
      return [];
    }
    if (!this.board) {
      await this.reloadBoard();
    }
    return [...this.actions, ...this.buildColumnNodes()];
  }

  getTreeItem(element: BoardManagerNode): vscode.TreeItem {
    if (element.kind === 'action') {
      const item = new vscode.TreeItem(element.label, vscode.TreeItemCollapsibleState.None);
      item.id = element.id;
      item.description = element.description;
      item.contextValue = 'kanbanManagerAction';
      item.command = { command: element.command, title: element.label, arguments: element.args };
      return item;
    }
    const columnName = element.column.name || COLUMN_FALLBACK_NAME;
    const treeItem = new vscode.TreeItem(columnName, vscode.TreeItemCollapsibleState.None);
    treeItem.id = element.column.id;
    treeItem.description = element.taskCount ? `${element.taskCount} cards` : 'No cards';
    treeItem.contextValue = 'kanbanManagerColumn';
    treeItem.tooltip = new vscode.MarkdownString(
      `**${columnName}**\n\nPosition: ${element.column.position ?? 'not set'}\nCards: ${element.taskCount}`,
    );
    return treeItem;
  }

  getParent(_element: BoardManagerNode): undefined {
    return undefined;
  }

  async moveColumn(sourceId: string, targetId: string | undefined): Promise<void> {
    if (!sourceId || sourceId === targetId) {
      return;
    }
    try {
      const board = await readBoard();
      const ordered = sortColumnsForManager(board.columns);
      const sourceIndex = ordered.findIndex((column) => column.id === sourceId);
      if (sourceIndex === -1) {
        return;
      }
      const [moved] = ordered.splice(sourceIndex, 1);
      if (!moved) {
        return;
      }
      let insertIndex =
        targetId && sourceId !== targetId ? ordered.findIndex((column) => column.id === targetId) : ordered.length;
      if (insertIndex < 0) {
        insertIndex = ordered.length;
      }
      ordered.splice(insertIndex, 0, moved);
      ordered.forEach((column, index) => {
        column.position = index + 1;
      });
      board.columns = ordered;
      await writeBoard(board);
      await this.treeProvider.refresh();
      await this.refresh();
    } catch (error) {
      vscode.window.showErrorMessage(`Unable to move column: ${formatError(error)}`);
    }
  }

  private async reloadBoard(): Promise<void> {
    try {
      this.board = await readBoard();
    } catch (error) {
      console.error('Unable to read Kanban board for manager view', error);
      this.board = undefined;
    }
  }

  private buildColumnNodes(): KanbanManagerColumnNode[] {
    if (!this.board) {
      return [];
    }
    const counts = new Map<string, number>();
    for (const item of this.board.items) {
      counts.set(item.columnId, (counts.get(item.columnId) ?? 0) + 1);
    }
    return sortColumnsForManager(this.board.columns).map((column) => ({
      kind: 'column',
      column,
      taskCount: counts.get(column.id) ?? 0,
    }));
  }
}

const COLUMN_DRAG_MIME = 'application/vnd.titan-kanban.column';

class KanbanManagerDragAndDropController implements vscode.TreeDragAndDropController<BoardManagerNode> {
  readonly dragMimeTypes = [COLUMN_DRAG_MIME];
  readonly dropMimeTypes = [COLUMN_DRAG_MIME];

  constructor(private readonly provider: KanbanManagerProvider) { }

  async handleDrag(source: readonly BoardManagerNode[], dataTransfer: vscode.DataTransfer): Promise<void> {
    const columnIds = source
      .filter((node): node is KanbanManagerColumnNode => node.kind === 'column')
      .map((node) => node.column.id);
    if (!columnIds.length) {
      return;
    }
    dataTransfer.set(COLUMN_DRAG_MIME, new vscode.DataTransferItem(JSON.stringify(columnIds)));
  }

  async handleDrop(target: BoardManagerNode | undefined, dataTransfer: vscode.DataTransfer): Promise<void> {
    const item = dataTransfer.get(COLUMN_DRAG_MIME);
    if (!item) {
      return;
    }
    try {
      const raw = await item.asString();
      const parsed = JSON.parse(raw);
      const sourceId = Array.isArray(parsed) ? parsed[0] : parsed;
      if (typeof sourceId !== 'string') {
        return;
      }
      const targetId = target && target.kind === 'column' ? target.column.id : undefined;
      await this.provider.moveColumn(sourceId, targetId);
    } catch (error) {
      vscode.window.showErrorMessage(`Unable to move column: ${formatError(error)}`);
    }
  }

  dispose(): void { }
}
