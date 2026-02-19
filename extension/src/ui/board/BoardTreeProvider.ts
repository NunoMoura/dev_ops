import * as vscode from 'vscode';
import { BoardViewSnapshot } from './BoardPanelView';
import { Board, Column, Task, COLUMN_FALLBACK_NAME, FilterState } from '../../types';
import { readBoard, writeBoard } from '../../services/board/boardPersistence';
import { boardService } from '../../services/board/boardService';
import { applyFilters, columnMatchesFilters, parseTaskFilter } from '../../services/tasks';
import { compareNumbers, compareTasks, sortColumnsForManager } from '../../services/tasks/taskUtils';
import { buildTaskDescription, buildTaskTooltip } from '../../services/tasks';
import { formatError } from '../../infrastructure/errors';

export type BoardColumnNode = { kind: 'column'; column: Column };
export type BoardItemNode = { kind: 'item'; item: Task; column: Column };
export type BoardNode = BoardColumnNode | BoardItemNode;
export type BoardManagerActionNode = {
  kind: 'action';
  id: string;
  label: string;
  description?: string;
  command: string;
  args?: unknown[];
};
export type BoardManagerColumnNode = {
  kind: 'column';
  column: Column;
  taskCount: number;
};
export type BoardManagerNode = BoardManagerActionNode | BoardManagerColumnNode;

export class BoardTreeProvider implements vscode.TreeDataProvider<BoardNode> {
  private board: Board | undefined;
  private columnNodes: BoardColumnNode[] = [];
  private itemsByColumn = new Map<string, BoardItemNode[]>();
  private itemsById = new Map<string, BoardItemNode>();
  private filter: FilterState = {};
  private readonly onDidChangeEmitter = new vscode.EventEmitter<BoardNode | undefined>();
  private readonly onDidUpdateBoardEmitter = new vscode.EventEmitter<BoardViewSnapshot | undefined>();
  readonly onDidChangeTreeData = this.onDidChangeEmitter.event;
  readonly onDidUpdateBoardView = this.onDidUpdateBoardEmitter.event;
  private readonly dragAndDrop: BoardDragAndDropController;

  constructor(private readonly loadBoard: () => Promise<Board>) {
    this.dragAndDrop = new BoardDragAndDropController(this);
  }

  getDragAndDropController(): BoardDragAndDropController {
    return this.dragAndDrop;
  }

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
      item.contextValue = 'devopsColumn';
      return item;
    }

    const task = element.item;
    const treeItem = new vscode.TreeItem(task.title, vscode.TreeItemCollapsibleState.None);
    treeItem.id = task.id;
    treeItem.description = buildTaskDescription(task);
    treeItem.tooltip = new vscode.MarkdownString(buildTaskTooltip(task, element.column.name));
    treeItem.contextValue = 'devopsTask';
    return treeItem;
  }

  getParent(element: BoardNode): BoardNode | undefined {
    if (element.kind === 'item') {
      return this.columnNodes.find(({ column }) => column.id === element.item.columnId);
    }
    return undefined;
  }

  getColumnNode(columnId: string): BoardColumnNode | undefined {
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
      vscode.window.showWarningMessage('Task is hidden by the active Board filter. Clear the filter to reveal it.');
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
    const nextColumns: BoardColumnNode[] = [];
    for (const column of sortedColumns) {
      const columnTasks = this.board.items.filter((item) => item.columnId === column.id).sort(compareTasks);
      const visibleTasks = applyFilters(columnTasks, column, this.filter);
      if (this.hasFilter() && !visibleTasks.length && !columnMatchesFilters(column, this.filter)) {
        continue;
      }
      const columnNode: BoardColumnNode = { kind: 'column', column };
      nextColumns.push(columnNode);
      const nodes = visibleTasks.map((item) => ({ kind: 'item', item, column } as BoardItemNode));
      this.itemsByColumn.set(column.id, nodes);
      nodes.forEach((node) => this.itemsById.set(node.item.id, node));
    }
    this.columnNodes = nextColumns;
    this.columnNodes = nextColumns;
    console.log(`[BoardTreeProvider] Board reloaded. Columns: ${this.columnNodes.length}, Total Tasks: ${this.board.items.length}`);
    this.columnNodes.forEach(c => {
      const count = this.itemsByColumn.get(c.column.id)?.length || 0;
      console.log(`[BoardTreeProvider] Column '${c.column.name}' (${c.column.id}): ${count} tasks`);
    });
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
          description: task.description,
          columnName: columnNode.column.name,
          // status removed
          status: task.status,
          tags: task.tags,
          updatedAt: task.updatedAt,

          checklistTotal,
          checklistDone,
        });
      }
    }
    return { columns, tasks };
  }
}

export class BoardManagerProvider implements vscode.TreeDataProvider<BoardManagerNode> {
  private board: Board | undefined;
  private readonly onDidChangeEmitter = new vscode.EventEmitter<BoardManagerNode | undefined>();
  readonly onDidChangeTreeData = this.onDidChangeEmitter.event;
  private readonly dragAndDrop: BoardManagerDragAndDropController;
  private readonly actions: BoardManagerActionNode[] = [
    {
      kind: 'action',
      id: 'devops-manager-new-column',
      label: 'New Column',
      description: 'Add a column to the board',
      command: 'devops.createColumn',
    },
  ];

  constructor(private readonly treeProvider: BoardTreeProvider) {
    this.dragAndDrop = new BoardManagerDragAndDropController(this);
  }

  getDragAndDropController(): BoardManagerDragAndDropController {
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
      item.contextValue = 'devopsManagerAction';
      item.command = { command: element.command, title: element.label, arguments: element.args };
      return item;
    }
    const columnName = element.column.name || COLUMN_FALLBACK_NAME;
    const treeItem = new vscode.TreeItem(columnName, vscode.TreeItemCollapsibleState.None);
    treeItem.id = element.column.id;
    treeItem.description = element.taskCount ? `${element.taskCount} cards` : 'No cards';
    treeItem.contextValue = 'devopsManagerColumn';
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
      console.error('Unable to read DevOps board for manager view', error);
      this.board = undefined;
    }
  }

  private buildColumnNodes(): BoardManagerColumnNode[] {
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

const COLUMN_DRAG_MIME = 'application/vnd.devops-board.column';

class BoardManagerDragAndDropController implements vscode.TreeDragAndDropController<BoardManagerNode> {
  readonly dragMimeTypes = [COLUMN_DRAG_MIME];
  readonly dropMimeTypes = [COLUMN_DRAG_MIME];

  constructor(private readonly provider: BoardManagerProvider) { }

  async handleDrag(source: readonly BoardManagerNode[], dataTransfer: vscode.DataTransfer): Promise<void> {
    const columnIds = source
      .filter((node): node is BoardManagerColumnNode => node.kind === 'column')
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

const TASK_DRAG_MIME = 'application/vnd.devops-board.task';

export class BoardDragAndDropController implements vscode.TreeDragAndDropController<BoardNode> {
  readonly dragMimeTypes = [TASK_DRAG_MIME];
  readonly dropMimeTypes = [TASK_DRAG_MIME];

  constructor(private readonly provider: BoardTreeProvider) { }

  async handleDrag(source: readonly BoardNode[], dataTransfer: vscode.DataTransfer): Promise<void> {
    const taskIds = source
      .filter((node): node is BoardItemNode => node.kind === 'item')
      .map((node) => node.item.id);

    if (!taskIds.length) {
      return;
    }
    dataTransfer.set(TASK_DRAG_MIME, new vscode.DataTransferItem(JSON.stringify(taskIds)));
  }

  async handleDrop(target: BoardNode | undefined, dataTransfer: vscode.DataTransfer): Promise<void> {
    const item = dataTransfer.get(TASK_DRAG_MIME);
    if (!item) {
      return;
    }
    try {
      const raw = await item.asString();
      const taskIds = JSON.parse(raw);
      if (!Array.isArray(taskIds) || taskIds.length === 0) {
        return;
      }

      let targetColumnId: string | undefined;
      let insertBeforeTaskId: string | undefined;

      if (target && target.kind === 'column') {
        targetColumnId = target.column.id;
      } else if (target && target.kind === 'item') {
        targetColumnId = target.item.columnId;
        insertBeforeTaskId = target.item.id;
      }

      if (!targetColumnId) {
        return;
      }

      for (const taskId of taskIds) {
        if (insertBeforeTaskId) {
          // Fetch fresh board to get current index of the target
          // This ensures we account for shifts caused by previous moves in the loop
          const board = await boardService.getBoard();
          const col = board.columns.find(c => c.id === targetColumnId);
          const targetIndex = col?.taskIds?.indexOf(insertBeforeTaskId) ?? -1;

          if (targetIndex !== -1) {
            await boardService.reorderTask(taskId, targetColumnId, targetIndex);
          } else {
            // Fallback if target lost
            await boardService.moveTask(taskId, targetColumnId);
          }
        } else {
          await boardService.moveTask(taskId, targetColumnId);
        }
      }

      await this.provider.refresh();
    } catch (error) {
      vscode.window.showErrorMessage(`Unable to move task: ${formatError(error)}`);
    }
  }
}

