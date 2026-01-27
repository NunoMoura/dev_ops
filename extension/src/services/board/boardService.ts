import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { Board, Task, Column, TaskStatus } from '../../common/types';
import { readBoard, writeBoard, saveTask, deleteTask, getBoardPath, readCurrentTask, writeCurrentTask, clearCurrentTask, archiveTaskBundle } from './boardPersistence';


import { createTaskId, compareTasks } from '../tasks/taskUtils';
import { ProjectAuditService } from '../setup/projectAuditService';
import { NodeWorkspace } from '../../infrastructure/nodeWorkspace';
import { writeTaskContext, readTaskContext, getWorkspaceRoot as getRoot } from './boardPersistence';

/**
 * BoardService - Central service for all board.json operations
 * 
 * This service provides a unified API for board CRUD operations,
 * replacing scattered `writeBoard()` calls throughout the extension.
 */
/**
 * Interface for board storage operations to enable mocking
 */
export interface BoardStore {
    readBoard(): Promise<Board>;
    writeBoard(board: Board): Promise<void>;
    saveTask(task: Task): Promise<void>;
    deleteTask(taskId: string): Promise<void>;
    getBoardPath(): Promise<string | undefined>;
    readCurrentTask(): Promise<string | null>;
    writeCurrentTask(taskId: string): Promise<void>;
    clearCurrentTask(): Promise<void>;
    archiveTaskBundle(taskId: string): Promise<string>;
}

// Default implementation using the actual data layer
const defaultStore: BoardStore = {
    readBoard,
    writeBoard,
    saveTask,
    deleteTask,
    getBoardPath: async () => getBoardPath(),
    readCurrentTask,
    writeCurrentTask,
    clearCurrentTask,
    archiveTaskBundle
};

export class BoardService {
    constructor(private store: BoardStore = defaultStore) { }

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
        await this.store.saveTask(newTask);

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

        await this.saveTask(task);
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
        await this.store.deleteTask(taskId);
    }

    /**
     * Move a task to a different column
     */
    async moveTask(taskId: string, columnId: string): Promise<void> {
        const board = await this.store.readBoard();
        const targetColumn = board.columns.find(c => c.id === columnId);
        if (targetColumn && targetColumn.wipLimit) {
            const currentCount = board.items.filter(t => t.columnId === columnId).length;
            if (currentCount >= targetColumn.wipLimit) {
                // Check if we are moving WITHIN the same column (no-op/reorder) allows it, 
                // but moveTask is usually across columns.
                // We need to check if the task is ALREADY in this column.
                const task = board.items.find(t => t.id === taskId);
                if (task && task.columnId !== columnId) {
                    throw new Error(`Cannot move task to '${targetColumn.name}'. WIP Limit reached (${currentCount}/${targetColumn.wipLimit}).`);
                }
            }
        }
        await this.updateTask(taskId, { columnId, status: 'todo' });
    }

    /**
     * Update task status
     */
    async setTaskStatus(taskId: string, status: Task['status']): Promise<void> {
        await this.updateTask(taskId, { status });
    }

    /**
     * Save a single task (updates metadata file).
     */
    async saveTask(task: Task): Promise<void> {
        await this.store.saveTask(task);
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
        const board = await this.store.readBoard();

        // Merge WIP Limits from Settings (User Preferences override board.json)
        try {
            const config = vscode.workspace.getConfiguration('devops');
            const wipLimits = config.get<Record<string, number>>('wipLimits');

            if (wipLimits) {
                // We don't want to mutate the persisted board if we save it back later without this info.
                // But getBoard returns the view. If we save using check-then-act, we might need this info.
                // The safest is to mutate the in-memory object returned here.
                for (const col of board.columns) {
                    // Try Name first, then ID
                    if (wipLimits[col.name] !== undefined) {
                        col.wipLimit = wipLimits[col.name];
                    } else if (wipLimits[col.id] !== undefined) {
                        col.wipLimit = wipLimits[col.id];
                    }
                }
            }
        } catch (e) {
            // Ignore config errors
        }

        return board;
    }

    // ========================================================================
    // NEW METHODS - Replacing Python CLI operations
    // ========================================================================

    /**
     * Claim a task for an agent or human.
     * Sets the owner field and updates status to agent_active.
     */
    async claimTask(taskId: string, options: {
        owner?: string;         // Human developer name
        driver?: {              // Agent/Driver details
            agent: string;
            model: string;
            sessionId?: string;
            phase?: string;
        }
    } = {}): Promise<void> {
        const board = await this.store.readBoard();
        const task = board.items.find(t => t.id === taskId);

        if (!task) {
            throw new Error(`Task ${taskId} not found`);
        }

        // 1. Set Human Owner (if provided)
        if (options.owner) {
            task.owner = options.owner;
        }

        // 2. Set Active Session (if driver provided)
        if (options.driver) {
            const column = board.columns.find(c => c.id === task.columnId);
            const currentPhase = column?.name || 'Unknown';

            task.activeSession = {
                id: options.driver.sessionId || `session-${Date.now()}`,
                agent: options.driver.agent,
                model: options.driver.model,
                phase: options.driver.phase || currentPhase,
                startedAt: new Date().toISOString(),
            };

            // Initialize Decision Trace
            try {
                const root = getRoot();
                if (root) {
                    const activityDir = path.join(root, '.dev_ops', 'activity');
                    if (!fs.existsSync(activityDir)) {
                        await fs.promises.mkdir(activityDir, { recursive: true });
                    }
                    const tracePath = path.join(activityDir, `${taskId}.md`);
                    if (!fs.existsSync(tracePath)) {
                        const header = `# Decision Trace: ${task.title}\n> Created: ${new Date().toLocaleString()}\n\n## Session Started (${options.driver.agent})\n- **Model**: ${options.driver.model}\n- **Phase**: ${task.columnId}\n\n`;
                        await fs.promises.writeFile(tracePath, header, 'utf8');
                        task.traceFile = `.dev_ops/activity/${taskId}.md`; // Relative path
                    }
                }
            } catch (e) {
                console.error('[BoardService] Failed to init trace file', e);
            }
        }

        // 3. Auto-Promotion logic: Move from Backlog to Understand if claimed
        if (task.columnId === 'col-backlog') {
            const understandCol = board.columns.find(c =>
                c.id === 'col-understand' ||
                c.name.toLowerCase() === 'understand'
            );
            if (understandCol) {
                console.log(`[BoardService] Promoting task ${taskId} from Backlog to ${understandCol.name} (${understandCol.id})`);
                task.columnId = understandCol.id;
                if (task.activeSession) {
                    task.activeSession.phase = understandCol.name;
                }
            } else {
                console.warn(`[BoardService] 'Understand' column not found. Task ${taskId} staying in Backlog.`);
            }
        }

        // Ensure status reflects active work
        task.status = 'in_progress';
        task.updatedAt = new Date().toISOString();

        await this.store.writeBoard(board);
        await this.store.saveTask(task);

        // 4. Context Hydration (Run Audit)
        try {
            const root = getRoot();
            if (root) {
                const workspace = new NodeWorkspace(root);
                const auditService = new ProjectAuditService(workspace);
                const projectContext = await auditService.audit();

                let currentContext = await readTaskContext(taskId);
                const hydrationHeader = '\n\n## Project Baseline\n';

                if (!currentContext.includes(hydrationHeader)) {
                    let hydrationContent = hydrationHeader;
                    hydrationContent += 'The following existing project documentation and configuration have been detected. Use these as a primary source for your research and planning:\n\n';

                    // 1. Core Docs
                    if (projectContext.docs.readme) {
                        hydrationContent += `- [ ] [README.md](file://${path.join(root, projectContext.docs.readme)})\n`;
                    }
                    if (projectContext.docs.prd) {
                        hydrationContent += `- [ ] [PRD](file://${path.join(root, projectContext.docs.prd)})\n`;
                    }
                    if (projectContext.docs.projectStandards) {
                        hydrationContent += `- [ ] [Standards](file://${path.join(root, projectContext.docs.projectStandards)})\n`;
                    }
                    if (projectContext.docs.existing_docs_folder) {
                        hydrationContent += `- [ ] [Documentation Folder](file://${path.join(root, projectContext.docs.existing_docs_folder)})\n`;
                    }

                    // 2. Env/Config
                    if (projectContext.docs.env_templates.length > 0) {
                        hydrationContent += '\n### Environment Templates\n';
                        for (const env of projectContext.docs.env_templates) {
                            hydrationContent += `- [ ] [${path.basename(env)}](file://${path.join(root, env)})\n`;
                        }
                    }

                    // 3. Existing Specs
                    if (projectContext.specs.length > 0) {
                        hydrationContent += '\n### Existing Specifications (SPEC.md)\n';
                        for (const spec of projectContext.specs) {
                            hydrationContent += `- [ ] [${spec}](file://${path.join(root, spec)})\n`;
                        }
                    }

                    await writeTaskContext(taskId, currentContext + hydrationContent);
                }
            }
        } catch (e) {
            console.error(`Failed to hydrate context for ${taskId}:`, e);
        }

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

        // Record history if active session exists
        if (task.activeSession) {
            const history = task.agentHistory || [];
            history.push({
                agentId: 'system', // TODO: standardize
                sessionId: task.activeSession.id,
                agentName: task.activeSession.agent,
                model: task.activeSession.model,
                phase: task.activeSession.phase,
                startedAt: task.activeSession.startedAt,
                endedAt: new Date().toISOString(),
            });
            task.agentHistory = history;
        }

        // Clear active session, but KEEP owner (developer)
        task.activeSession = undefined;
        task.status = 'todo';
        task.updatedAt = new Date().toISOString();

        await this.store.writeBoard(board);
        await this.store.saveTask(task);

        // Clear current task if it matches
        const currentTask = await this.getCurrentTask();
        if (currentTask === taskId) {
            await this.clearCurrentTask();
        }
    }

    /**
     * Mark a task as done.
     * Sets status to 'todo' (neutral) and moves to Done column.
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

        task.status = 'todo'; // Neutral state for done items
        if (doneColumn) {
            task.columnId = doneColumn.id;
        }
        task.updatedAt = new Date().toISOString();

        // Clear active session if set
        if (task.activeSession) {
            const history = task.agentHistory || [];
            history.push({
                agentId: 'system',
                sessionId: task.activeSession.id,
                agentName: task.activeSession.agent,
                model: task.activeSession.model,
                phase: task.activeSession.phase,
                startedAt: task.activeSession.startedAt,
                endedAt: new Date().toISOString(),
                summary: 'Task completed',
            });
            task.agentHistory = history;
            task.activeSession = undefined;
        }
        // Note: We DO NOT clear task.owner. The developer still owns the completed task.

        await this.store.writeBoard(board);
        await this.store.saveTask(task);

        // Clear current task if it matches
        const currentTask = await this.getCurrentTask();
        if (currentTask === taskId) {
            await this.clearCurrentTask();
        }
    }

    async archiveTask(taskId: string): Promise<string> {
        const board = await this.store.readBoard();
        const task = board.items.find(t => t.id === taskId);

        if (!task) {
            throw new Error(`Task ${taskId} not found`);
        }

        task.status = 'archived' as any; // Ensure status is set in the archive
        task.updatedAt = new Date().toISOString();

        // Physically archive (Move Bundle)
        const archivePath = await this.store.archiveTaskBundle(taskId);

        // Remove from memory
        board.items = board.items.filter(t => t.id !== taskId);

        // Update layout (just in case, though items are decoupled now)
        await this.store.writeBoard(board);

        return archivePath;
    }

    /**
     * Archive all tasks with status 'done' (checking column or just archival).
     * Actually 'done' is no longer a status, we check the column.
     * Returns the count of archived tasks.
     */
    async archiveAllDone(): Promise<{ count: number; paths: string[] }> {
        const board = await this.store.readBoard();
        // Check for tasks in Done column
        const doneColumn = board.columns.find(c => c.id === 'col-done' || c.name.toLowerCase() === 'done');
        if (!doneColumn) {
            return { count: 0, paths: [] };
        }

        const doneTasks = board.items.filter(t => t.columnId === doneColumn.id || t.columnId.includes('done'));

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
            const status = task.status || 'todo';
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
        owner: string;
        activeSession: { agent: string; model: string; phase: string };
    }>> {
        const board = await this.store.readBoard();
        const activeAgents: Array<{
            taskId: string;
            taskTitle: string;
            owner: string;
            activeSession: { agent: string; model: string; phase: string };
        }> = [];

        for (const task of board.items) {
            if (task.activeSession) {
                activeAgents.push({
                    taskId: task.id,
                    taskTitle: task.title,
                    owner: task.owner || 'Unassigned',
                    activeSession: {
                        agent: task.activeSession.agent,
                        model: task.activeSession.model,
                        phase: task.activeSession.phase
                    }
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

        // Filter tasks in Backlog with status 'todo'
        const backlogTasks = board.items.filter(t =>
            t.columnId === 'col-backlog' &&
            (!t.status || t.status === 'todo') &&
            !t.activeSession // Only pick tasks not currently being worked on upon
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
        owner?: string;
        driver?: {
            agent: string;
            model: string;
            sessionId?: string;
        }
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

