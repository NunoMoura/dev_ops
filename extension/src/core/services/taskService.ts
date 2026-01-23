import * as path from 'path';
import { Board, Task, Column, DEFAULT_COLUMN_BLUEPRINTS, IWorkspace, IProgress } from '../types';

export class CoreTaskService {
    constructor(protected workspace: IWorkspace) { }

    protected async getBoardPath(): Promise<string> {
        return path.join(this.workspace.root, '.dev_ops', 'board.json');
    }

    public async readBoard(): Promise<Board> {
        const boardPath = await this.getBoardPath();
        try {
            if (!await this.workspace.exists(boardPath)) {
                return this.createEmptyBoard();
            }
            const content = await this.workspace.readFile(boardPath);
            return JSON.parse(content) as Board;
        } catch (error) {
            // If file doesn't exist or is corrupt, return empty board or throw
            // For now, consistent with extension logic, return empty if not found
            if (!await this.workspace.exists(boardPath)) {
                return this.createEmptyBoard();
            }
            throw error;
        }
    }

    public async writeBoard(board: Board): Promise<void> {
        const boardPath = await this.getBoardPath();
        const dir = path.dirname(boardPath);
        if (!await this.workspace.exists(dir)) {
            await this.workspace.mkdir(dir);
        }
        await this.workspace.writeFile(boardPath, JSON.stringify(board, null, 2));
    }

    public createEmptyBoard(): Board {
        return {
            version: 1,
            columns: DEFAULT_COLUMN_BLUEPRINTS.map(c => ({ ...c })),
            items: []
        };
    }

    public async createTask(
        columnId: string,
        title: string,
        summary?: string,
        priority: 'low' | 'medium' | 'high' = 'medium'
    ): Promise<Task> {
        const board = await this.readBoard();

        // Generate ID
        let maxId = 0;
        board.items.forEach(t => {
            const match = t.id.match(/TASK-(\d+)/);
            if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxId) { maxId = num; }
            }
        });
        const newId = `TASK-${String(maxId + 1).padStart(3, '0')}`;

        const newTask: Task = {
            id: newId,
            columnId,
            title,
            summary,
            priority,
            updatedAt: new Date().toISOString(),
            status: 'ready'
        };

        board.items.push(newTask);
        await this.writeBoard(board);
        return newTask;
    }

    public async moveTask(taskId: string, columnId: string): Promise<void> {
        const board = await this.readBoard();
        const task = board.items.find(t => t.id === taskId);
        if (!task) {
            throw new Error(`Task ${taskId} not found`);
        }

        task.columnId = columnId;
        task.updatedAt = new Date().toISOString();

        await this.writeBoard(board);
    }
    public async getCurrentTask(): Promise<string | null> {
        // In the CLI context, we can read .current_task from the workspace root
        // This file is usually managed by the agent or the extension.
        const taskPath = path.join(this.workspace.root, '.dev_ops', '.current_task'); // Hidden file? Or .current_task in root?
        // Extension usually writes to .dev_ops/context/current_task.json or similar?
        // Let's assume a simple file for now or check extension logic.
        // Actually, let's look at BoardService in extension...
        // BoardService uses `context/activeTask.json`.

        // For now, let's just return null or read a standard location if we define one.
        // Let's assume .dev_ops/active_task
        const activeTaskPath = path.join(this.workspace.root, '.dev_ops', 'active_task');
        if (await this.workspace.exists(activeTaskPath)) {
            return (await this.workspace.readFile(activeTaskPath)).trim();
        }
        return null;
    }
}
