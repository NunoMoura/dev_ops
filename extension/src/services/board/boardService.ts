import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as cp from 'child_process';
import { Board, Task, Column, TaskStatus } from '../../types';
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

        // Add to column list (append to bottom)
        const column = board.columns.find(c => c.id === newTask.columnId);
        if (column) {
            if (!column.taskIds) { column.taskIds = []; }
            column.taskIds.push(id);
        }

        await this.store.writeBoard(board);
        await this.store.saveTask(newTask);

        return id;
    }

    /**
     * Pick the next task from Backlog.
     * With manual ordering, this is simply the top task in the Backlog column.
     */
    async pickNextTask(): Promise<string | null> {
        const board = await this.store.readBoard();
        const backlogColumn = board.columns.find(c => c.id === 'col-backlog');

        if (!backlogColumn || !backlogColumn.taskIds || backlogColumn.taskIds.length === 0) {
            return null;
        }

        // Iterate through ordered IDs to find the first candidate
        for (const taskId of backlogColumn.taskIds) {
            const task = board.items.find(t => t.id === taskId);
            // Check eligibility: No status set (pending/ready) and no active session
            if (task && !task.status && !task.activeSession) {
                return task.id;
            }
        }

        return null;
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

        if (!targetColumn) {
            throw new Error(`Column ${columnId} not found`);
        }

        if (targetColumn.wipLimit) {
            const currentCount = board.items.filter(t => t.columnId === columnId).length;
            if (currentCount >= targetColumn.wipLimit) {
                const task = board.items.find(t => t.id === taskId);
                if (task && task.columnId !== columnId) {
                    throw new Error(`Cannot move task to '${targetColumn.name}'. WIP Limit reached (${currentCount}/${targetColumn.wipLimit}).`);
                }
            }
        }

        const task = board.items.find(t => t.id === taskId);
        if (!task) {
            throw new Error(`Task ${taskId} not found`);
        }

        // Remove from old column list
        const oldColumn = board.columns.find(c => c.id === task.columnId);
        if (oldColumn && oldColumn.taskIds) {
            oldColumn.taskIds = oldColumn.taskIds.filter(id => id !== taskId);
        }

        // Add to new column list (append by default)
        if (!targetColumn.taskIds) {
            targetColumn.taskIds = [];
        }
        // If moving within same column, this is a no-op for order, but moveTask implies status change potentially.
        // But if it was in the list, we removed it above. So we append it to bottom?
        // Usually moveTask implies "send to", so bottom is appropriate.
        if (!targetColumn.taskIds.includes(taskId)) {
            targetColumn.taskIds.push(taskId);
        }

        if (!targetColumn.taskIds.includes(taskId)) {
            targetColumn.taskIds.push(taskId);
        }

        // Update task data
        // Only reset status if moving to Backlog (reset to todo)
        // Otherwise preserve current status (e.g. in_progress, needs_feedback)
        if (columnId === 'col-backlog' || targetColumn.name.toLowerCase() === 'backlog') {
            await this.updateTask(taskId, { columnId, status: undefined });
        } else {
            await this.updateTask(taskId, { columnId });
        }
        await this.store.writeBoard(board);

        // Check if moving to 'Done' column
        if (targetColumn.id === 'col-done' || targetColumn.name.toLowerCase() === 'done') {
            await this.handleTaskCompletion(taskId);
        }
    }

    /**
     * Handle task completion: Create PR from Verify Walkthrough
     */
    private async handleTaskCompletion(taskId: string): Promise<void> {
        try {
            const task = await this.getTask(taskId);
            if (!task) { return; }

            // 1. Find latest Verify Session
            const verifySession = task.agentHistory?.slice().reverse().find(h =>
                h.phase?.toLowerCase() === 'verify' || h.phase?.toLowerCase() === 'verification'
            );

            if (!verifySession) {
                vscode.window.showWarningMessage('No Verify phase found. Skipping PR creation.');
                return;
            }

            // 2. Locate Walkthrough
            const homeDir = process.env.HOME || process.env.USERPROFILE;
            if (!homeDir || !verifySession.sessionId) { return; }

            const brainDir = path.join(homeDir, '.gemini', 'antigravity', 'brain');
            // We need to find the session folder. The session ID in history might be just the ID or full path.
            // SessionBridge extracts generic ID. Let's try to find it.
            // The session ID is usually the folder name in brain.
            const sessionDir = path.join(brainDir, verifySession.sessionId);
            const walkthroughPath = path.join(sessionDir, 'walkthrough.md');

            if (!fs.existsSync(walkthroughPath)) {
                vscode.window.showWarningMessage(`Walkthrough not found at ${walkthroughPath}. Skipping PR creation.`);
                return;
            }

            // 3. Create PR
            const workspaceRoot = getRoot();
            if (!workspaceRoot) { return; }

            const prTitle = `[${taskId}] ${task.title}`;
            const prBodyFile = walkthroughPath;

            vscode.window.showInformationMessage(`Creating PR for ${taskId}...`);

            cp.exec(`gh pr create --title "${prTitle}" --body-file "${prBodyFile}"`, { cwd: workspaceRoot }, (err, stdout, stderr) => {
                if (err) {
                    console.error('PR Creation Failed:', stderr);
                    vscode.window.showErrorMessage(`Failed to create PR: ${stderr}`);
                } else {
                    console.log('PR Created:', stdout);
                    vscode.window.showInformationMessage(`✅ PR Created: ${stdout.trim()}`);
                }
            });

        } catch (e) {
            console.error('Error handling task completion:', e);
            vscode.window.showErrorMessage('Error creating PR. Check extension logs.');
        }

    }

    /**
     * Reorder a task within a column or move to a new column at a specific index.
     */
    async reorderTask(taskId: string, columnId: string, newIndex: number): Promise<void> {
        const board = await this.store.readBoard();
        const task = board.items.find(t => t.id === taskId);
        if (!task) { throw new Error(`Task ${taskId} not found`); }

        const sourceColumn = board.columns.find(c => c.id === task.columnId);
        const targetColumn = board.columns.find(c => c.id === columnId);

        if (!sourceColumn || !targetColumn) { throw new Error('Column not found'); }

        // Remove from source
        if (sourceColumn.taskIds) {
            sourceColumn.taskIds = sourceColumn.taskIds.filter(id => id !== taskId);
        }

        // Initialize target if needed
        if (!targetColumn.taskIds) {
            targetColumn.taskIds = [];
        }

        // Insert at new index
        // Clamp index
        const validIndex = Math.max(0, Math.min(newIndex, targetColumn.taskIds.length));
        targetColumn.taskIds.splice(validIndex, 0, taskId);

        // Update task data
        if (task.columnId !== columnId) {
            task.columnId = columnId;
            // Preserve existing status on cross-column move (don't reset to 'pending')
            task.updatedAt = new Date().toISOString();
            await this.store.saveTask(task);
        }

        await this.store.writeBoard(board);
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
        task.status = undefined;
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

        task.status = 'done'; // Set directly to 'done' status
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
        columnCounts: Record<string, number>;
    }> {
        const board = await this.store.readBoard();

        const statusCounts: Record<string, number> = {};
        const columnCounts: Record<string, number> = {};

        for (const task of board.items) {
            // Status counts
            const status = task.status || 'none';
            statusCounts[status] = (statusCounts[status] || 0) + 1;

            // Column counts
            const column = board.columns.find(c => c.id === task.columnId);
            const columnName = column?.name || 'Unknown';
            columnCounts[columnName] = (columnCounts[columnName] || 0) + 1;
        }

        return {
            totalTasks: board.items.length,
            statusCounts,
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
    // pickNextTask already implemented above

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

