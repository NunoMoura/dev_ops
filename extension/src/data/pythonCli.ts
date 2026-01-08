import { spawn } from "child_process";
import * as path from "path";
import * as fs from "fs";

/**
 * Python CLI wrapper for board operations.
 * 
 * All board logic lives in Python (board_ops.py).
 * TypeScript commands are thin wrappers that call the Python CLI.
 */

export interface PythonResult {
    stdout: string;
    stderr: string;
    code: number;
}

let cachedPython: string | null | undefined;

/**
 * Find a working Python 3 command.
 */
export async function findPython(): Promise<string | null> {
    if (cachedPython !== undefined) {
        return cachedPython;
    }

    const commands = ["python3", "python"];
    for (const cmd of commands) {
        try {
            const result = await runCommand(cmd, ["--version"]);
            if (result.stdout.includes("Python 3")) {
                cachedPython = cmd;
                return cmd;
            }
        } catch {
            // Try next command
        }
    }
    cachedPython = null;
    return null;
}

/**
 * Find script path with smart resolution.
 * Checks dev_ops/scripts/ first (installed), then scripts/ (development).
 */
function findScriptPath(cwd: string, scriptName: string): string {
    // Framework repo: scripts are in payload/scripts/
    const frameworkPath = path.join(cwd, "payload", "scripts", scriptName);
    // Legacy: old dev_ops/scripts/ (backward compat)
    const legacyPath = path.join(cwd, "dev_ops", "scripts", scriptName);

    if (fs.existsSync(frameworkPath)) {
        return frameworkPath;
    } else if (fs.existsSync(legacyPath)) {
        return legacyPath;
    }
    throw new Error(`Script not found: ${scriptName}. Checked:\n  - ${frameworkPath}\n  - ${legacyPath}`);
}

/**
 * Run board_ops.py with the given arguments.
 * 
 * @param args - CLI arguments (e.g., ["status", "TASK-001", "in_progress"])
 * @param cwd - Working directory (project root)
 * @returns PythonResult with stdout, stderr, and exit code
 */
export async function runBoardOps(
    args: string[],
    cwd: string
): Promise<PythonResult> {
    const python = await findPython();
    if (!python) {
        throw new Error("Python 3 not found. Please install Python 3.");
    }

    const scriptPath = findScriptPath(cwd, "board_ops.py");
    return runCommand(python, [scriptPath, ...args], cwd);
}

/**
 * Run doc_ops.py with the given arguments.
 * 
 * @param args - CLI arguments (e.g., ["create-user", "--title", "Project Manager"])
 * @param cwd - Working directory (project root)
 * @returns PythonResult with stdout, stderr, and exit code
 */
export async function runDocOps(
    args: string[],
    cwd: string
): Promise<PythonResult> {
    const python = await findPython();
    if (!python) {
        throw new Error("Python 3 not found. Please install Python 3.");
    }

    // Script path: uses smart resolution (payload/scripts/ or dev_ops/scripts/)
    const scriptPath = findScriptPath(cwd, "doc_ops.py");
    return runCommand(python, [scriptPath, ...args], cwd);
}

/**
 * Run a command and capture output.
 */
function runCommand(
    command: string,
    args: string[],
    cwd?: string
): Promise<PythonResult> {
    return new Promise((resolve, reject) => {
        const proc = spawn(command, args, { cwd });
        let stdout = "";
        let stderr = "";

        proc.stdout.on("data", (data) => {
            stdout += data.toString();
        });

        proc.stderr.on("data", (data) => {
            stderr += data.toString();
        });

        proc.on("close", (code) => {
            resolve({ stdout, stderr, code: code ?? 0 });
        });

        proc.on("error", (err) => {
            reject(err);
        });
    });
}

/**
 * Parse JSON output from board_ops.py list command.
 */
export function parseTaskList(stdout: string): Array<{
    id: string;
    title: string;
    column: string;
    status: string;
}> {
    // Output format: "  TASK-001: Title [Column] (status)"
    const tasks: Array<{ id: string; title: string; column: string; status: string }> = [];
    const lines = stdout.trim().split("\n").filter(Boolean);

    for (const line of lines) {
        const match = line.match(/^\s*(\S+):\s+(.+?)\s+\[(.+?)\]\s+\((.+?)\)$/);
        if (match) {
            tasks.push({
                id: match[1],
                title: match[2],
                column: match[3],
                status: match[4],
            });
        }
    }
    return tasks;
}

// ============================================================================
// Type Definitions (from boardApi)
// ============================================================================

export type TaskStatus = 'ready' | 'agent_active' | 'needs_feedback' | 'blocked' | 'done';
export type TaskPriority = 'high' | 'medium' | 'low' | 'p0' | 'p1' | 'p2';

export interface Owner {
    type: 'agent' | 'human';
    name: string;
    id?: string;
    sessionId?: string;
    phase?: string;
    startedAt?: string;
}

export interface Task {
    id: string;
    columnId: string;
    title: string;
    summary?: string;
    workflow?: string;
    priority: TaskPriority;
    status?: TaskStatus;
    owner?: Owner | null;
    upstream?: string[];
    downstream?: string[];
    prerequisites?: {
        tasks: string[];
        approvals: string[];
    };
    completionCriteria?: {
        artifacts: string[];
        tests: boolean;
        review: boolean;
    };
    updatedAt?: string;
    artifacts?: Record<string, string>;
    spawnedFrom?: string;
}

export interface Column {
    id: string;
    name: string;
    position: number;
}

export interface Board {
    version: number;
    columns: Column[];
    items: Task[];
}

export interface BoardMetrics {
    totalTasks: number;
    statusCounts: Record<TaskStatus, number>;
    priorityCounts: Record<string, number>;
}

export interface ValidationResult {
    valid: boolean;
    exists: boolean;
}

export interface ColumnNameResult {
    columnId: string;
    name: string;
}

// ============================================================================
// BoardApi - Central Python Wrapper
// ============================================================================

/**
 * Helper to ensure cwd is always a string.
 */
function ensureCwd(cwd?: string): string {
    return cwd || '';
}

export class BoardApi {
    /**
     * Get full board state.
     */
    static async getBoardState(cwd?: string): Promise<Board> {
        const result = await runBoardOps(['get-board', '--format=json'], ensureCwd(cwd));
        if (result.code !== 0) {
            throw new Error(`Failed to get board: ${result.stderr}`);
        }
        return JSON.parse(result.stdout);
    }

    /**
     * Get single task by ID.
     */
    static async getTask(taskId: string, cwd?: string): Promise<Task | null> {
        const result = await runBoardOps(['get-task', taskId, '--format=json'], ensureCwd(cwd));
        if (result.code !== 0) {
            return null;
        }
        const task = JSON.parse(result.stdout);
        return task || null;
    }

    /**
     * Get board metrics (status counts, priority breakdown).
     */
    static async getMetrics(cwd?: string): Promise<BoardMetrics> {
        const result = await runBoardOps(['get-metrics', '--format=json'], ensureCwd(cwd));
        if (result.code !== 0) {
            throw new Error(`Failed to get metrics: ${result.stderr}`);
        }
        return JSON.parse(result.stdout);
    }

    /**
     * Validate task ID format and check existence.
     */
    static async validateTaskId(taskId: string, cwd?: string): Promise<ValidationResult> {
        const result = await runBoardOps(['validate-task-id', taskId, '--format=json'], ensureCwd(cwd));
        if (result.code !== 0) {
            throw new Error(`Failed to validate task ID: ${result.stderr}`);
        }
        return JSON.parse(result.stdout);
    }

    /**
     * Get column name from column ID.
     */
    static async getColumnName(columnId: string, cwd?: string): Promise<string> {
        const result = await runBoardOps(['get-column-name', columnId, '--format=json'], ensureCwd(cwd));
        if (result.code !== 0) {
            throw new Error(`Failed to get column name: ${result.stderr}`);
        }
        const data: ColumnNameResult = JSON.parse(result.stdout);
        return data.name;
    }

    /**
     * List tasks, optionally filtered by column or status.
     */
    static async listTasks(options?: { columnId?: string; status?: TaskStatus; cwd?: string }): Promise<Task[]> {
        const args = ['list'];
        if (options?.columnId) {
            args.push('--column', options.columnId);
        }
        if (options?.status) {
            args.push('--status', options.status);
        }

        const result = await runBoardOps(args, ensureCwd(options?.cwd));
        if (result.code !== 0) {
            throw new Error(`Failed to list tasks: ${result.stderr}`);
        }

        // Note: 'list' command currently outputs human-readable format
        // For now, we'll just get the full board and filter in TS
        // TODO: Add --format=json to 'list' command in Python
        const board = await this.getBoardState(options?.cwd);
        let tasks = board.items;

        if (options?.columnId) {
            tasks = tasks.filter(t => t.columnId === options.columnId);
        }
        if (options?.status) {
            tasks = tasks.filter(t => t.status === options.status);
        }

        return tasks;
    }

    /**
     * Get active agents (tasks with owner set and active status).
     */
    static async getActiveAgents(cwd?: string): Promise<any[]> {
        const result = await runBoardOps(['active-agents'], ensureCwd(cwd));
        if (result.code !== 0) {
            throw new Error(`Failed to get active agents: ${result.stderr}`);
        }
        return JSON.parse(result.stdout);
    }

    // ========================================================================
    // Mutation Operations (Proxy to existing commands)
    // ========================================================================

    /**
     * Create a new task.
     */
    static async createTask(params: {
        title: string;
        summary?: string;
        workflow?: string;
        priority?: TaskPriority;
        owner?: string;
        columnId?: string;
        spawnFrom?: string;
        dependencies?: string[];
        cwd?: string;
    }): Promise<string> {
        const args = ['create', '--title', params.title];
        if (params.priority) {
            args.push('--priority', params.priority);
        }
        if (params.columnId) {
            args.push('--column', params.columnId);
        }
        if (params.summary) {
            args.push('--summary', params.summary);
        }
        if (params.owner) {
            args.push('--owner', params.owner);
        }
        if (params.dependencies) {
            args.push('--dependencies', params.dependencies.join(','));
        }
        if (params.workflow) {
            args.push('--workflow', params.workflow);
        }
        if (params.spawnFrom) {
            args.push('--spawn-from', params.spawnFrom);
        }

        const result = await runBoardOps(args, ensureCwd(params.cwd));
        if (result.code !== 0) {
            throw new Error(`Failed to create task: ${result.stderr}`);
        }

        // Extract task ID from output (format: "✅ Created task: TASK-XXX - title")
        // Matches TASK-001, TASK-999, TASK-1234, etc.
        const match = result.stdout.match(/TASK-\d{3,}/);
        if (!match) {
            throw new Error('Failed to extract task ID from create output');
        }
        return match[0];
    }

    /**
     * Move task to a different column.
     */
    static async moveTask(taskId: string, columnId: string, cwd?: string): Promise<void> {
        const result = await runBoardOps(['move', taskId, columnId], ensureCwd(cwd));
        if (result.code !== 0) {
            throw new Error(`Failed to move task: ${result.stderr}`);
        }
    }

    /**
     * Set task status.
     */
    static async setStatus(taskId: string, status: TaskStatus, cwd?: string): Promise<void> {
        const result = await runBoardOps(['status', taskId, status], ensureCwd(cwd));
        if (result.code !== 0) {
            throw new Error(`Failed to set status: ${result.stderr}`);
        }
    }

    /**
     * Claim a task.
     */
    static async claimTask(taskId: string, options: {
        force?: boolean;
        sessionId?: string;
        agentType?: 'agent' | 'human';
        owner?: string;
        cwd?: string;
    }): Promise<void> {
        const args = ['claim', taskId];
        if (options.sessionId) {
            args.push('--session-id', options.sessionId);
        }
        if (options.agentType) {
            args.push('--agent-type', options.agentType);
        }
        if (options.owner) {
            args.push('--owner', options.owner);
        }
        if (options.force) {
            args.push('--force');
        }
        const result = await runBoardOps(args, ensureCwd(options.cwd));
        if (result.code !== 0) {
            throw new Error(`Failed to claim task: ${result.stderr}`);
        }
    }
}

