import { Board, Task, Column } from '../core';
import { readBoard, writeBoard } from './boardStore';
import { createTaskId } from '../features/boardData';

/**
 * BoardService - Central service for all board.json operations
 * 
 * This service provides a unified API for board CRUD operations,
 * replacing scattered `writeBoard()` calls throughout the extension.
 */
export class BoardService {
    /**
     * Create a new task and add it to the board
     */
    async createTask(task: Omit<Task, 'id' | 'updatedAt'>): Promise<string> {
        const board = await readBoard();
        const id = createTaskId(board);

        const newTask: Task = {
            ...task,
            id,
            updatedAt: new Date().toISOString(),
        };

        board.items.push(newTask);
        await writeBoard(board);

        return id;
    }

    /**
     * Update an existing task
     */
    async updateTask(taskId: string, updates: Partial<Omit<Task, 'id'>>): Promise<void> {
        const board = await readBoard();
        const task = board.items.find(t => t.id === taskId);

        if (!task) {
            throw new Error(`Task ${taskId} not found`);
        }

        Object.assign(task, updates);
        task.updatedAt = new Date().toISOString();

        await writeBoard(board);
    }

    /**
     * Delete a task from the board
     */
    async deleteTask(taskId: string): Promise<void> {
        const board = await readBoard();
        const initialLength = board.items.length;

        board.items = board.items.filter(t => t.id !== taskId);

        if (board.items.length === initialLength) {
            throw new Error(`Task ${taskId} not found`);
        }

        await writeBoard(board);
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
        const board = await readBoard();
        return board.items.find(t => t.id === taskId);
    }

    /**
     * Get all tasks
     */
    async getTasks(): Promise<Task[]> {
        const board = await readBoard();
        return board.items;
    }

    /**
     * Create a new column
     */
    async createColumn(name: string, position?: number): Promise<string> {
        const board = await readBoard();

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
        await writeBoard(board);

        return id;
    }

    /**
     * Rename a column
     */
    async renameColumn(columnId: string, newName: string): Promise<void> {
        const board = await readBoard();
        const column = board.columns.find(c => c.id === columnId);

        if (!column) {
            throw new Error(`Column ${columnId} not found`);
        }

        column.name = newName;
        await writeBoard(board);
    }

    /**
     * Delete a column and optionally move its tasks
     */
    async deleteColumn(columnId: string, moveToColumnId?: string): Promise<void> {
        const board = await readBoard();

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
        await writeBoard(board);
    }

    /**
     * Get the current board
     */
    async getBoard(): Promise<Board> {
        return await readBoard();
    }
}

// Singleton instance
export const boardService = new BoardService();
