import { spawn } from "child_process";
import * as path from "path";

/**
 * Python CLI wrapper for kanban operations.
 * 
 * All kanban logic lives in Python (kanban_ops.py).
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
 * Run kanban_ops.py with the given arguments.
 * 
 * @param args - CLI arguments (e.g., ["status", "TASK-001", "in_progress"])
 * @param cwd - Working directory (project root)
 * @returns PythonResult with stdout, stderr, and exit code
 */
export async function runKanbanOps(
    args: string[],
    cwd: string
): Promise<PythonResult> {
    const python = await findPython();
    if (!python) {
        throw new Error("Python 3 not found. Please install Python 3.");
    }

    // Script path: dev_ops/scripts/kanban_ops.py relative to project root
    const scriptPath = path.join(cwd, "dev_ops", "scripts", "kanban_ops.py");

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

    // Script path: dev_ops/scripts/doc_ops.py relative to project root
    const scriptPath = path.join(cwd, "dev_ops", "scripts", "doc_ops.py");

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
 * Parse JSON output from kanban_ops.py list command.
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
