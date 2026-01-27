import * as vscode from "vscode";
import { log, error as logError } from "../../common";
import { install, InstallerOptions } from "../../services/setup/frameworkInstaller";
import { CoreTaskService } from "../../services/tasks/taskService";
import { CoreBootstrapService } from "../../services/setup/bootstrap";
import { Workspace } from "../../common/types";
import { VSCodeWorkspace } from "../../infrastructure/vscodeWorkspace";
import { ConfigService } from "../../services/setup/configService";

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
        if (!workspaceFolders) { return; }

        const root = workspaceFolders[0].uri.fsPath;
        const workspace = new VSCodeWorkspace(root);
        const taskService = new CoreTaskService(workspace);
        const bootstrapService = new CoreBootstrapService(workspace, taskService, context.extensionPath);

        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "DevOps: Bootstrapping...",
            cancellable: false
        }, async (progress) => {
            try {
                // Wrapper for progress reporting
                const progressWrapper = {
                    report: (value: { message?: string; increment?: number }) => {
                        progress.report(value);
                    }
                };

                await bootstrapService.bootstrap(progressWrapper);
                vscode.window.showInformationMessage("✅ Project bootstrapped successfully!");
            } catch (err) {
                logError(`Bootstrap failed`, err);
                vscode.window.showErrorMessage(`Bootstrap failed: ${err}`);
            }
        });
    });

    context.subscriptions.push(bootstrapDisposable);

    return vscode.commands.registerCommand("devops.initialize", async (options?: { name?: string, projectType?: 'greenfield' | 'brownfield' | 'fresh', silent?: boolean, githubWorkflows?: boolean, selectedIDEs?: string[], force?: boolean }) => {
        // Handle legacy string argument if passed
        let name: string | undefined;
        let projectType: 'greenfield' | 'brownfield' | 'fresh' | undefined;
        let silent = false;
        let githubWorkflows = false;
        let selectedIDEs: string[] = [];
        let force = false;

        if (typeof options === 'string') {
            projectType = options as 'greenfield' | 'brownfield' | 'fresh';
        } else if (typeof options === 'object') {
            name = options.name;
            projectType = options.projectType;
            silent = !!options.silent;
            githubWorkflows = !!options.githubWorkflows;
            selectedIDEs = options.selectedIDEs || [];
            force = !!options.force;
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

        // Use the first folder by default, but in the future we could detect based on current file
        const workspaceRoot = workspaceFolders[0].uri.fsPath;
        const extensionPath = context.extensionPath;
        const workspace = new VSCodeWorkspace(workspaceRoot);
        const configService = new ConfigService(workspace);

        // Save configuration to .dev_ops/config.json
        try {
            const updates: any = {};
            if (name) { updates.developer = { name }; }
            if (projectType) { updates.projectType = projectType; }
            if (githubWorkflows !== undefined) { updates.githubWorkflowsEnabled = githubWorkflows; }
            if (selectedIDEs && selectedIDEs.length > 0) { updates.selectedIDEs = selectedIDEs; }

            await configService.updateConfig(updates);
            log(`[initialize] Saved config: name=${name}, projectType=${projectType}`);
        } catch (e) {
            logError(`[initialize] Failed to save config`, e);
        }

        // If no IDEs selected, fall back to auto-detection (and update config if needed, though we just saved it)
        if (selectedIDEs.length === 0) {
            selectedIDEs = [detectIDE()];
        }

        // Function to run installation for each selected IDE
        const runInstall = async () => {
            let totalRules = 0, totalWorkflows = 0, totalSkills = 0;
            let resultMessage = "";

            for (const ide of selectedIDEs) {
                const installerOptions: InstallerOptions = {
                    projectRoot: workspaceRoot,
                    ide: ide as 'antigravity' | 'cursor',
                    projectType,
                    githubWorkflows,
                    force
                };

                const result = await install(extensionPath, installerOptions);

                if (!result.success) {
                    throw new Error(result.message);
                }

                resultMessage = result.message;
                totalRules += result.rulesInstalled;
                totalWorkflows += result.workflowsInstalled;
                totalSkills += result.skillsInstalled;

                log(`[initialize] Installed for ${ide}: Rules: ${result.rulesInstalled}, Workflows: ${result.workflowsInstalled}, Skills: ${result.skillsInstalled}`);
            }

            log(`[initialize] Total installed - Rules: ${totalRules}, Workflows: ${totalWorkflows}, Skills: ${totalSkills}`);

            return resultMessage;
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
            const message = await vscode.window.withProgress(
                {
                    location: vscode.ProgressLocation.Notification,
                    title: "DevOps: Initializing framework...",
                    cancellable: false,
                },
                async () => {
                    try {
                        return await runInstall();
                    } catch (error) {
                        vscode.window.showErrorMessage(
                            `DevOps: Initialization failed: ${error}`
                        );
                        return null;
                    }
                }
            );

            if (message) {
                const selection = await vscode.window.showInformationMessage("DevOps Framework Initialized", { modal: true, detail: message }, "Open Board");
                if (selection === "Open Board") {
                    vscode.commands.executeCommand("devops.openBoard");
                }
            }
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

