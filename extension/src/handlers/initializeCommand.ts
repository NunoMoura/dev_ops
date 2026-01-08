import * as vscode from "vscode";
import * as path from "path";
import { spawn } from "child_process";
import { log, error as logError } from "../core";

/**
 * DevOps: Initialize command
 *
 * Invokes the Python setup_ops.py script to initialize the DevOps framework.
 * Python is the source of truth for initialization logic.
 */
export function registerInitializeCommand(
    context: vscode.ExtensionContext
): vscode.Disposable {
    return vscode.commands.registerCommand("devops.initialize", async (projectType?: 'greenfield' | 'brownfield') => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage(
                "DevOps: Please open a workspace folder first."
            );
            return;
        }

        const workspaceRoot = workspaceFolders[0].uri.fsPath;
        const extensionPath = context.extensionPath;

        // Try to find setup_ops.py in extension assets or dev environment
        let setupScript = path.join(extensionPath, "dist", "assets", "scripts", "setup_ops.py");
        if (!require('fs').existsSync(setupScript)) {
            // Fallback for development: check workspace root installer or scripts
            const installerPath = path.join(workspaceRoot, "installer", "setup_ops.py");
            if (require('fs').existsSync(installerPath)) {
                setupScript = installerPath;
            } else {
                setupScript = path.join(workspaceRoot, "scripts", "setup_ops.py");
            }
        }

        if (!require('fs').existsSync(setupScript)) {
            vscode.window.showErrorMessage(
                `DevOps: setup_ops.py not found. Expected at ${setupScript}`
            );
            return;
        }

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
                    await runSetupScript(pythonCommand, setupScript, workspaceRoot, projectType);

                    // Note: Developer name is collected by DashboardViewProvider onboarding form
                    // before initialize is called, so no need to prompt here

                    vscode.window.showInformationMessage(
                        "✅ DevOps: Framework initialized successfully!\n\n📋 Next step: Run /bootstrap to generate project-specific rules",
                        "OK"
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
    targetDir: string,
    projectType?: string
): Promise<void> {
    return new Promise((resolve, reject) => {
        const args = [scriptPath, "--target", targetDir];
        if (projectType) {
            args.push("--project-type", projectType);
        }

        const proc = spawn(pythonCommand, args, {
            cwd: targetDir,
            env: { ...process.env, HEADLESS: "true" }, // Skip interactive prompts
        });

        let stderr = "";

        proc.stdout.on("data", (data) => {
            log(`[setup_ops.py] ${data.toString()}`);
        });

        proc.stderr.on("data", (data) => {
            stderr += data.toString();
            logError(`[setup_ops.py] ${data.toString()}`);
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

