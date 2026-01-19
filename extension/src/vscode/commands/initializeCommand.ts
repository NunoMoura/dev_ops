import * as vscode from "vscode";
import { log, error as logError } from "../../core";
import { install, InstallerOptions } from "../services/installer";
import { BootstrapService } from "../../services/bootstrap";

/**
 * DevOps: Initialize command
 *
 * Uses TypeScript installer to initialize the DevOps framework.
 */
export function registerInitializeCommand(
    context: vscode.ExtensionContext
): vscode.Disposable {
    // Register Bootstrap Command
    const bootstrapDisposable = vscode.commands.registerCommand("devops.bootstrap", async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {return;}

        const root = workspaceFolders[0].uri.fsPath;
        const service = new BootstrapService(context);

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "DevOps: Bootstrapping...",
            cancellable: false
        }, async (progress) => {
            try {
                progress.report({ message: "Analyzing project..." });
                await service.bootstrap(root);
                vscode.window.showInformationMessage("✅ Project bootstrapped successfully!");
            } catch (err) {
                logError(`Bootstrap failed`, err);
                vscode.window.showErrorMessage(`Bootstrap failed: ${err}`);
            }
        });
    });

    context.subscriptions.push(bootstrapDisposable);

    return vscode.commands.registerCommand("devops.initialize", async (options?: { projectType?: 'greenfield' | 'brownfield' | 'fresh', silent?: boolean, githubWorkflows?: boolean }) => {
        // Handle legacy string argument if passed
        let projectType: 'greenfield' | 'brownfield' | 'fresh' | undefined;
        let silent = false;
        let githubWorkflows = false;

        if (typeof options === 'string') {
            projectType = options as 'greenfield' | 'brownfield' | 'fresh';
        } else if (typeof options === 'object') {
            projectType = options.projectType;
            silent = !!options.silent;
            githubWorkflows = !!options.githubWorkflows;
        }

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            if (!silent) {
                vscode.window.showErrorMessage(
                    "DevOps: Please open a workspace folder first."
                );
            }
            return;
        }

        const workspaceRoot = workspaceFolders[0].uri.fsPath;
        const extensionPath = context.extensionPath;
        const ide = detectIDE();

        // Function to run installation
        const runInstall = async () => {
            const installerOptions: InstallerOptions = {
                projectRoot: workspaceRoot,
                ide: ide as 'antigravity' | 'cursor',
                projectType,
                githubWorkflows
            };

            const result = await install(extensionPath, installerOptions);

            if (!result.success) {
                throw new Error(result.message);
            }

            log(`[initialize] ${result.message}`);
            log(`[initialize] Rules: ${result.rulesInstalled}, Workflows: ${result.workflowsInstalled}, Skills: ${result.skillsInstalled}`);

            if (!silent) {
                vscode.window.showInformationMessage(
                    "✅ DevOps ready! Run /bootstrap to analyze your project and generate tasks.",
                    "Open Board"
                ).then(sel => {
                    if (sel === "Open Board") {
                        vscode.commands.executeCommand('devops.openBoard');
                    }
                });
            }
        };

        if (silent) {
            // Run without progress UI
            try {
                await runInstall();
            } catch (error) {
                logError(`DevOps: Initialization failed: ${error}`);
                throw error; // Re-throw so caller knows it failed
            }
        } else {
            // Show progress while running
            await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: "DevOps: Initializing framework...",
                    cancellable: false,
                },
                async () => {
                    try {
                        await runInstall();
                    } catch (error) {
                        vscode.window.showErrorMessage(
                            `DevOps: Initialization failed: ${error}`
                        );
                    }
                }
            );
        }
    });
}

function detectIDE(): string {
    const appName = vscode.env.appName || '';

    // Check for Cursor IDE (VS Code fork with AI features)
    if (appName.includes('Cursor')) {
        return 'cursor';
    }

    // Check for Antigravity IDE (Google's VS Code fork)
    // Future-proofing in case Antigravity sets a branded appName
    if (appName.includes('Antigravity')) {
        return 'antigravity';
    }

    // Default to antigravity format for VS Code and compatible editors
    // (Antigravity uses .agent/rules, VS Code can use either format)
    return 'antigravity';
}
