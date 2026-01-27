import * as path from 'path';
import { Board, Task, Column, DEFAULT_COLUMN_BLUEPRINTS, Workspace, ProgressReporter } from '../../common/types';
import { ProjectAuditService } from '../setup/projectAuditService';
import { NodeWorkspace } from '../../infrastructure/nodeWorkspace';
import { ConfigService } from '../setup/configService';

export class CoreTaskService {
    constructor(protected workspace: Workspace) { }

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
                // Scan for Task Bundles (directories)
                // Note: workspace.findFiles might be limited. NodeWorkspace uses fast-glob.
                // fast-glob can match directories but usually matches files.
                // Pattern: .dev_ops/tasks/*/task.json
                const taskFiles = await this.workspace.findFiles('.dev_ops/tasks/*/task.json', null);

                for (const file of taskFiles) {
                    try {
                        const content = await this.workspace.readFile(file);
                        const task = JSON.parse(content) as Task;
                        if (task && task.id) {
                            items.push(task);
                        }
                    } catch (e) {
                        // Ignore corrupt files
                    }
                }
            } catch (e) {
                // Ignore failures
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
        const bundleDir = path.join(tasksDir, task.id);

        if (!await this.workspace.exists(bundleDir)) {
            await this.workspace.mkdir(bundleDir);
        }

        const taskPath = path.join(bundleDir, 'task.json');
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
        await this.saveTask(task);
    }



    public async claimTask(taskId: string, driver: { agent: string; model: string; sessionId?: string; }, ownerOverride?: string): Promise<void> {
        const board = await this.readBoard();
        const task = board.items.find(t => t.id === taskId);
        if (!task) {
            throw new Error(`Task ${taskId} not found`);
        }

        const column = board.columns.find(c => c.id === task.columnId);
        const phase = column?.name || 'Unknown';

        // 1. Determine Human Owner
        let owner = ownerOverride;
        if (!owner) {
            // Try config
            const configService = new ConfigService(this.workspace);
            owner = await configService.getDeveloperName();
        }
        if (!owner) {
            owner = 'Unassigned'; // Fallback
        }
        task.owner = owner;

        // 2. Set Active Session
        task.activeSession = {
            id: driver.sessionId || `session-${Date.now()}`,
            agent: driver.agent,
            model: driver.model,
            phase: phase,
            startedAt: new Date().toISOString()
        };

        // 3. Auto-Promotion logic
        if (task.columnId === 'col-backlog') {
            const understandCol = board.columns.find(c => c.id === 'col-understand' || c.name.toLowerCase() === 'understand');
            if (understandCol) {
                task.columnId = understandCol.id;
                task.activeSession.phase = understandCol.name;
            }
        }

        task.status = 'in_progress';
        task.updatedAt = new Date().toISOString();

        await this.writeBoard(board);
        await this.saveTask(task);

        // 4. Context Hydration
        try {
            const auditService = new ProjectAuditService(this.workspace);
            const projectContext = await auditService.audit();

            const tasksDir = path.join(this.workspace.root, '.dev_ops', 'tasks');
            const bundleDir = path.join(tasksDir, taskId);

            if (!await this.workspace.exists(bundleDir)) {
                await this.workspace.mkdir(bundleDir);
            }

            const contextPath = path.join(bundleDir, 'context.md');
            let currentContext = '';
            if (await this.workspace.exists(contextPath)) {
                currentContext = await this.workspace.readFile(contextPath);
            }

            const hydrationHeader = '\n\n## Project Baseline\n';

            if (!currentContext.includes(hydrationHeader)) {
                let hydrationContent = hydrationHeader;
                hydrationContent += 'The following existing project documentation and configuration have been detected. Use these as a primary source for your research and planning:\n\n';

                // 1. Core Docs
                if (projectContext.docs.readme) {
                    hydrationContent += `- [ ] [README.md](file://${path.join(this.workspace.root, projectContext.docs.readme)})\n`;
                }
                if (projectContext.docs.prd) {
                    hydrationContent += `- [ ] [PRD](file://${path.join(this.workspace.root, projectContext.docs.prd)})\n`;
                }
                if (projectContext.docs.projectStandards) {
                    hydrationContent += `- [ ] [Standards](file://${path.join(this.workspace.root, projectContext.docs.projectStandards)})\n`;
                }
                if (projectContext.docs.existing_docs_folder) {
                    hydrationContent += `- [ ] [Documentation Folder](file://${path.join(this.workspace.root, projectContext.docs.existing_docs_folder)})\n`;
                }

                // 2. Env/Config
                if (projectContext.docs.env_templates.length > 0) {
                    hydrationContent += '\n### Environment Templates\n';
                    for (const env of projectContext.docs.env_templates) {
                        hydrationContent += `- [ ] [${path.basename(env)}](file://${path.join(this.workspace.root, env)})\n`;
                    }
                }

                // 3. Existing Specs
                if (projectContext.specs.length > 0) {
                    hydrationContent += '\n### Existing Specifications (SPEC.md)\n';
                    for (const spec of projectContext.specs) {
                        hydrationContent += `- [ ] [${spec}](file://${path.join(this.workspace.root, spec)})\n`;
                    }
                }

                await this.workspace.writeFile(contextPath, currentContext + hydrationContent);
            }
        } catch (e) {
            console.error(`Failed to hydrate context for ${taskId}:`, e);
        }
    }

    public async pickNextTask(): Promise<string | null> {
        const board = await this.readBoard();
        const backlogTasks = board.items.filter(t =>
            t.columnId === 'col-backlog' &&
            t.status === 'todo' &&
            !t.activeSession
        );

        if (backlogTasks.length === 0) {
            return null;
        }

        const priorityMap: Record<string, number> = { high: 3, medium: 2, low: 1 };
        backlogTasks.sort((a, b) => {
            const pa = priorityMap[a.priority || 'medium'] || 0;
            const pb = priorityMap[b.priority || 'medium'] || 0;
            return pb - pa; // Descending
        });

        return backlogTasks[0].id;
    }

    public async getCurrentTask(): Promise<string | null> {
        // In the CLI context, we can read .current_task from the workspace root
        // This file is usually managed by the agent or the extension.
        const taskPath = path.join(this.workspace.root, '.dev_ops', '.current_task');
        // Let's assume a simple file for now or check extension logic.
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
