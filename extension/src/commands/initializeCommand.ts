import * as vscode from "vscode";
import * as path from "path";
import { spawn } from "child_process";

/**
 * DevOps: Initialize command
 *
 * Invokes the Python setup_ops.py script to initialize the DevOps framework.
 * Python is the source of truth for initialization logic.
 */
export function registerInitializeCommand(
    context: vscode.ExtensionContext
): vscode.Disposable {
    return vscode.commands.registerCommand("devops.initialize", async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage(
                "DevOps: Please open a workspace folder first."
            );
            return;
        }

        const workspaceRoot = workspaceFolders[0].uri.fsPath;
        const extensionPath = context.extensionPath;
        const scriptsPath = path.join(extensionPath, "dist", "assets", "scripts");
        const setupScript = path.join(scriptsPath, "setup_ops.py");

        // Check for Python availability
        const pythonCommand = await findPython();
        if (!pythonCommand) {
            vscode.window.showErrorMessage(
                "DevOps: Python 3 is required but not found. Please install Python 3 and try again."
            );
            return;
        }

        // Show progress while running
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: "DevOps: Initializing framework...",
                cancellable: false,
            },
            async () => {
                try {
                    await runSetupScript(pythonCommand, setupScript, workspaceRoot);
                    vscode.window.showInformationMessage(
                        "✅ DevOps: Framework initialized successfully!"
                    );
                } catch (error) {
                    vscode.window.showErrorMessage(
                        `DevOps: Initialization failed: ${error}`
                    );
                }
            }
        );
    });
}

/**
 * Find a working Python 3 command
 */
async function findPython(): Promise<string | null> {
    const commands = ["python3", "python"];

    for (const cmd of commands) {
        try {
            const result = await runCommand(cmd, ["--version"]);
            if (result.includes("Python 3")) {
                return cmd;
            }
        } catch {
            // Try next command
        }
    }
    return null;
}

/**
 * Run a command and return stdout
 */
function runCommand(command: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
        const proc = spawn(command, args);
        let stdout = "";
        let stderr = "";

        proc.stdout.on("data", (data) => {
            stdout += data.toString();
        });

        proc.stderr.on("data", (data) => {
            stderr += data.toString();
        });

        proc.on("close", (code) => {
            if (code === 0) {
                resolve(stdout);
            } else {
                reject(new Error(stderr || `Process exited with code ${code}`));
            }
        });

        proc.on("error", (err) => {
            reject(err);
        });
    });
}

/**
 * Run the setup_ops.py script
 */
async function runSetupScript(
    pythonCommand: string,
    scriptPath: string,
    targetDir: string
): Promise<void> {
    return new Promise((resolve, reject) => {
        const proc = spawn(pythonCommand, [scriptPath, "--target", targetDir], {
            cwd: targetDir,
            env: { ...process.env, HEADLESS: "true" }, // Skip interactive prompts
        });

        let stderr = "";

        proc.stdout.on("data", (data) => {
            console.log(`[setup_ops.py] ${data.toString()}`);
        });

        proc.stderr.on("data", (data) => {
            stderr += data.toString();
            console.error(`[setup_ops.py] ${data.toString()}`);
        });

        proc.on("close", (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(stderr || `setup_ops.py exited with code ${code}`));
            }
        });

        proc.on("error", (err) => {
            reject(err);
        });
    });
}

