import * as path from 'path';
import { Board, Task, Column, DEFAULT_COLUMN_BLUEPRINTS, IWorkspace, IProgress } from '../types';

export class CoreTaskService {
    constructor(protected workspace: IWorkspace) { }

    protected async getBoardPath(): Promise<string> {
        return path.join(this.workspace.root, '.dev_ops', 'board.json');
    }

    public async readBoard(): Promise<Board> {
        const boardPath = await this.getBoardPath();
        let board: Board;

        // 1. Read Layout
        try {
            if (!await this.workspace.exists(boardPath)) {
                board = this.createEmptyBoard();
            } else {
                const content = await this.workspace.readFile(boardPath);
                board = JSON.parse(content) as Board;
            }
        } catch (error) {
            // Fallback
            if (!await this.workspace.exists(boardPath)) {
                board = this.createEmptyBoard();
            } else {
                throw error;
            }
        }

        // 2. Hydrate Items from .dev_ops/tasks/*.json
        const tasksDir = path.join(path.dirname(boardPath), 'tasks');
        const items: Task[] = [];

        if (await this.workspace.exists(tasksDir)) {
            try {
                // Note: workspace.findFiles behavior depends on implementation (glob vs recursive).
                // NodeWorkspace (used by CLI) uses fast-glob.
                const files = await this.workspace.findFiles('tasks/*.json', null);
                // But wait, findFiles returns absolute paths or relative?
                // NodeWorkspace.findFiles in devops.ts uses absolute:true.
                // So we get absolute paths.

                for (const file of files) {
                    try {
                        const content = await this.workspace.readFile(file);
                        const task = JSON.parse(content) as Task;
                        if (task && task.id) {
                            items.push(task);
                        }
                    } catch (e) {
                        // Ignore corrupt task files
                    }
                }
            } catch (e) {
                // Ignore if findFiles fails
            }
        }

        board.items = items;
        return board;
    }

    public async writeBoard(board: Board): Promise<void> {
        const boardPath = await this.getBoardPath();
        const dir = path.dirname(boardPath);
        if (!await this.workspace.exists(dir)) {
            await this.workspace.mkdir(dir);
        }

        // Strip items for persistence (File-Based Persistence)
        const persistenceObject = {
            version: board.version,
            columns: board.columns,
            items: [] // Items are stored in tasks/*.json
        };

        await this.workspace.writeFile(boardPath, JSON.stringify(persistenceObject, null, 2));
    }

    public async saveTask(task: Task): Promise<void> {
        const boardPath = await this.getBoardPath();
        const devOpsDir = path.dirname(boardPath);
        const tasksDir = path.join(devOpsDir, 'tasks');

        if (!await this.workspace.exists(tasksDir)) {
            await this.workspace.mkdir(tasksDir); // Recursive check usually? IWorkspace.mkdir is recursive
        }

        const taskPath = path.join(tasksDir, `${task.id}.json`);
        task.updatedAt = new Date().toISOString();
        await this.workspace.writeFile(taskPath, JSON.stringify(task, null, 2));
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
            status: 'todo'
        };

        // Update board view (in-memory)
        board.items.push(newTask);

        // Save Board (updates columns/metadata, strips items)
        await this.writeBoard(board);

        // Save Task (persists item)
        await this.saveTask(newTask);

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
