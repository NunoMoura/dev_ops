import { Board, Task, Column, TaskOwner, TaskStatus } from '../core';
import { readBoard, writeBoard, getBoardPath, readCurrentTask, writeCurrentTask, clearCurrentTask, archiveTaskFile } from './boardStore';
import { createTaskId, compareTasks } from '../services/tasks/taskUtils';

/**
 * BoardService - Central service for all board.json operations
 * 
 * This service provides a unified API for board CRUD operations,
 * replacing scattered `writeBoard()` calls throughout the extension.
 */
/**
 * Interface for board storage operations to enable mocking
 */
export interface IBoardStore {
    readBoard(): Promise<Board>;
    writeBoard(board: Board): Promise<void>;
    getBoardPath(): Promise<string | undefined>;
    readCurrentTask(): Promise<string | null>;
    writeCurrentTask(taskId: string): Promise<void>;
    clearCurrentTask(): Promise<void>;
    archiveTaskFile(taskId: string, content: string): Promise<string>;
}

// Default implementation using the actual data layer
const defaultStore: IBoardStore = {
    readBoard,
    writeBoard,
    getBoardPath,
    readCurrentTask,
    writeCurrentTask,
    clearCurrentTask,
    archiveTaskFile
};

export class BoardService {
    constructor(private store: IBoardStore = defaultStore) { }

    /**
     * Create a new task and add it to the board
     */
    async createTask(task: Omit<Task, 'id' | 'updatedAt'>): Promise<string> {
        const board = await this.store.readBoard();
        const id = createTaskId(board);

        const newTask: Task = {
            ...task,
            id,
            updatedAt: new Date().toISOString(),
        };

        board.items.push(newTask);
        await this.store.writeBoard(board);

        return id;
    }

    /**
     * Update an existing task
     */
    async updateTask(taskId: string, updates: Partial<Omit<Task, 'id'>>): Promise<void> {
        const board = await this.store.readBoard();
        const task = board.items.find(t => t.id === taskId);

        if (!task) {
            throw new Error(`Task ${taskId} not found`);
        }

        Object.assign(task, updates);
        task.updatedAt = new Date().toISOString();

        await this.store.writeBoard(board);
    }

    /**
     * Delete a task from the board
     */
    async deleteTask(taskId: string): Promise<void> {
        const board = await this.store.readBoard();
        const initialLength = board.items.length;

        board.items = board.items.filter(t => t.id !== taskId);

        if (board.items.length === initialLength) {
            throw new Error(`Task ${taskId} not found`);
        }

        await this.store.writeBoard(board);
    }

    /**
     * Move a task to a different column
     */
    async moveTask(taskId: string, columnId: string): Promise<void> {
        await this.updateTask(taskId, { columnId });
    }

    /**
     * Update task status
     */
    async setTaskStatus(taskId: string, status: Task['status']): Promise<void> {
        await this.updateTask(taskId, { status });
    }

    /**
     * Get a single task by ID
     */
    async getTask(taskId: string): Promise<Task | undefined> {
        const board = await this.store.readBoard();
        return board.items.find(t => t.id === taskId);
    }

    /**
     * Get all tasks
     */
    async getTasks(): Promise<Task[]> {
        const board = await this.store.readBoard();
        return board.items;
    }

    /**
     * Create a new column
     */
    async createColumn(name: string, position?: number): Promise<string> {
        const board = await this.store.readBoard();

        // Generate column ID
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const timestamp = Date.now().toString(36).slice(-4);
        const id = `col-${slug}-${timestamp}`;

        // Determine position
        const maxPosition = Math.max(...board.columns.map(c => c.position || 0), 0);
        const columnPosition = position ?? maxPosition + 1;

        const newColumn: Column = {
            id,
            name,
            position: columnPosition,
        };

        board.columns.push(newColumn);
        await this.store.writeBoard(board);

        return id;
    }

    /**
     * Rename a column
     */
    async renameColumn(columnId: string, newName: string): Promise<void> {
        const board = await this.store.readBoard();
        const column = board.columns.find(c => c.id === columnId);

        if (!column) {
            throw new Error(`Column ${columnId} not found`);
        }

        column.name = newName;
        await this.store.writeBoard(board);
    }

    /**
     * Delete a column and optionally move its tasks
     */
    async deleteColumn(columnId: string, moveToColumnId?: string): Promise<void> {
        const board = await this.store.readBoard();

        const column = board.columns.find(c => c.id === columnId);
        if (!column) {
            throw new Error(`Column ${columnId} not found`);
        }

        // Move tasks if target column specified
        if (moveToColumnId) {
            for (const task of board.items) {
                if (task.columnId === columnId) {
                    task.columnId = moveToColumnId;
                    task.updatedAt = new Date().toISOString();
                }
            }
        }

        // Remove column
        board.columns = board.columns.filter(c => c.id !== columnId);
        await this.store.writeBoard(board);
    }

    /**
     * Get the current board
     */
    async getBoard(): Promise<Board> {
        return await this.store.readBoard();
    }

    // ========================================================================
    // NEW METHODS - Replacing Python CLI operations
    // ========================================================================

    /**
     * Claim a task for an agent or human.
     * Sets the owner field and updates status to agent_active.
     */
    async claimTask(taskId: string, options: {
        type?: 'agent' | 'human';
        name?: string;
        sessionId?: string;
        phase?: string;
    } = {}): Promise<void> {
        const board = await this.store.readBoard();
        const task = board.items.find(t => t.id === taskId);

        if (!task) {
            throw new Error(`Task ${taskId} not found`);
        }

        // Determine current phase from column
        const column = board.columns.find(c => c.id === task.columnId);
        const currentPhase = column?.name || 'Unknown';

        const owner: TaskOwner = {
            id: options.sessionId || `session-${Date.now()}`,
            type: options.type || 'agent',
            name: options.name || 'Agent',
            sessionId: options.sessionId,
            phase: options.phase || currentPhase,
            startedAt: new Date().toISOString(),
        };

        task.owner = owner;
        task.status = 'agent_active';
        task.updatedAt = new Date().toISOString();

        await this.store.writeBoard(board);

        // Also set as current task
        await this.setCurrentTask(taskId);
    }

    /**
     * Unclaim a task (remove owner).
     * Optionally records the session in agentHistory.
     */
    async unclaimTask(taskId: string): Promise<void> {
        const board = await this.store.readBoard();
        const task = board.items.find(t => t.id === taskId);

        if (!task) {
            throw new Error(`Task ${taskId} not found`);
        }

        // Record history if owner exists
        if (task.owner) {
            const history = task.agentHistory || [];
            history.push({
                agentId: task.owner.id,
                sessionId: task.owner.sessionId || task.owner.id,
                agentName: task.owner.name,
                phase: task.owner.phase,
                startedAt: task.owner.startedAt,
                endedAt: new Date().toISOString(),
            });
            task.agentHistory = history;
        }

        task.owner = undefined;
        task.status = 'ready';
        task.updatedAt = new Date().toISOString();

        await this.store.writeBoard(board);

        // Clear current task if it matches
        const currentTask = await this.getCurrentTask();
        if (currentTask === taskId) {
            await this.clearCurrentTask();
        }
    }

    /**
     * Mark a task as done.
     * Sets status to 'done' and moves to Done column.
     */
    async markDone(taskId: string): Promise<void> {
        const board = await this.store.readBoard();
        const task = board.items.find(t => t.id === taskId);

        if (!task) {
            throw new Error(`Task ${taskId} not found`);
        }

        // Find Done column
        const doneColumn = board.columns.find(c =>
            c.id === 'col-done' || c.name.toLowerCase() === 'done'
        );

        task.status = 'done';
        if (doneColumn) {
            task.columnId = doneColumn.id;
        }
        task.updatedAt = new Date().toISOString();

        // Clear owner if set
        if (task.owner) {
            const history = task.agentHistory || [];
            history.push({
                agentId: task.owner.id,
                sessionId: task.owner.sessionId || task.owner.id,
                agentName: task.owner.name,
                phase: task.owner.phase,
                startedAt: task.owner.startedAt,
                endedAt: new Date().toISOString(),
                summary: 'Task completed',
            });
            task.agentHistory = history;
            task.owner = undefined;
        }

        await this.store.writeBoard(board);

        // Clear current task if it matches
        const currentTask = await this.getCurrentTask();
        if (currentTask === taskId) {
            await this.clearCurrentTask();
        }
    }

    /**
     * Archive a single task.
     * Creates a tarball in .dev_ops/archive/ and removes from board.
     */
    async archiveTask(taskId: string): Promise<string> {
        const board = await this.store.readBoard();
        const task = board.items.find(t => t.id === taskId);

        if (!task) {
            throw new Error(`Task ${taskId} not found`);
        }

        // Create archive using store
        const archivePath = await this.store.archiveTaskFile(taskId, JSON.stringify(task, null, 2));

        // Remove from board
        board.items = board.items.filter(t => t.id !== taskId);
        await this.store.writeBoard(board);

        return archivePath;
    }

    /**
     * Archive all tasks with status 'done'.
     * Returns the count of archived tasks.
     */
    async archiveAllDone(): Promise<{ count: number; paths: string[] }> {
        const board = await this.store.readBoard();
        const doneTasks = board.items.filter(t => t.status === 'done');

        const paths: string[] = [];
        for (const task of doneTasks) {
            const archivePath = await this.archiveTask(task.id);
            paths.push(archivePath);
        }

        return { count: doneTasks.length, paths };
    }

    /**
     * Get board metrics (status counts, priority breakdown).
     */
    async getMetrics(): Promise<{
        totalTasks: number;
        statusCounts: Record<string, number>;
        priorityCounts: Record<string, number>;
        columnCounts: Record<string, number>;
    }> {
        const board = await this.store.readBoard();

        const statusCounts: Record<string, number> = {};
        const priorityCounts: Record<string, number> = {};
        const columnCounts: Record<string, number> = {};

        for (const task of board.items) {
            // Status counts
            const status = task.status || 'ready';
            statusCounts[status] = (statusCounts[status] || 0) + 1;

            // Priority counts
            const priority = task.priority || 'unset';
            priorityCounts[priority] = (priorityCounts[priority] || 0) + 1;

            // Column counts
            const column = board.columns.find(c => c.id === task.columnId);
            const columnName = column?.name || 'Unknown';
            columnCounts[columnName] = (columnCounts[columnName] || 0) + 1;
        }

        return {
            totalTasks: board.items.length,
            statusCounts,
            priorityCounts,
            columnCounts,
        };
    }

    /**
     * Get active agents (tasks with owner set).
     */
    async getActiveAgents(): Promise<Array<{
        taskId: string;
        taskTitle: string;
        owner: TaskOwner;
        phase: string;
    }>> {
        const board = await this.store.readBoard();
        const activeAgents: Array<{
            taskId: string;
            taskTitle: string;
            owner: TaskOwner;
            phase: string;
        }> = [];

        for (const task of board.items) {
            if (task.owner) {
                const column = board.columns.find(c => c.id === task.columnId);
                activeAgents.push({
                    taskId: task.id,
                    taskTitle: task.title,
                    owner: task.owner,
                    phase: column?.name || task.owner.phase,
                });
            }
        }

        return activeAgents;
    }

    /**
     * Get the current task ID from .dev_ops/.current_task file.
     */
    async getCurrentTask(): Promise<string | null> {
        return await this.store.readCurrentTask();
    }

    /**
     * Set the current task ID in .dev_ops/.current_task file.
     */
    async setCurrentTask(taskId: string): Promise<void> {
        await this.store.writeCurrentTask(taskId);
    }

    /**
     * Clear the current task file.
     */
    async clearCurrentTask(): Promise<void> {
        await this.store.clearCurrentTask();
    }

    /**
     * Pick the next highest priority task from Backlog.
     * Returns the task ID or null if no tasks available.
     */
    async pickNextTask(): Promise<string | null> {
        const board = await this.store.readBoard();

        // Filter tasks in Backlog with status 'ready'
        const backlogTasks = board.items.filter(t =>
            t.columnId === 'col-backlog' &&
            (!t.status || t.status === 'ready') &&
            !t.owner
        );

        if (backlogTasks.length === 0) {
            return null;
        }

        // Sort by priority and updated time
        const sorted = [...backlogTasks].sort(compareTasks);
        return sorted[0].id;
    }

    /**
     * Pick and claim the next task in one operation.
     */
    async pickAndClaimTask(options: {
        type?: 'agent' | 'human';
        name?: string;
        sessionId?: string;
    } = {}): Promise<string | null> {
        const taskId = await this.pickNextTask();
        if (!taskId) {
            return null;
        }

        await this.claimTask(taskId, options);
        return taskId;
    }
}

// Singleton instance
export const boardService = new BoardService();

