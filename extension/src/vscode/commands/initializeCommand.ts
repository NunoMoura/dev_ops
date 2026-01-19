import * as vscode from "vscode";
import { log, error as logError } from "../../core";
import { install, InstallerOptions } from "../services/installer";
import { BootstrapService } from "../../services/setup/bootstrap";

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

    return vscode.commands.registerCommand("devops.initialize", async (options?: { name?: string, projectType?: 'greenfield' | 'brownfield' | 'fresh', silent?: boolean, githubWorkflows?: boolean, selectedIDEs?: string[] }) => {
        // Handle legacy string argument if passed
        let name: string | undefined;
        let projectType: 'greenfield' | 'brownfield' | 'fresh' | undefined;
        let silent = false;
        let githubWorkflows = false;
        let selectedIDEs: string[] = [];

        if (typeof options === 'string') {
            projectType = options as 'greenfield' | 'brownfield' | 'fresh';
        } else if (typeof options === 'object') {
            name = options.name;
            projectType = options.projectType;
            silent = !!options.silent;
            githubWorkflows = !!options.githubWorkflows;
            selectedIDEs = options.selectedIDEs || [];
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

        // Save configuration to .dev_ops/config.json
        try {
            const devOpsDir = require('path').join(workspaceRoot, '.dev_ops');
            if (!require('fs').existsSync(devOpsDir)) {
                require('fs').mkdirSync(devOpsDir, { recursive: true });
            }
            const configPath = require('path').join(devOpsDir, 'config.json');

            // Read existing or create new
            let config: any = {};
            if (require('fs').existsSync(configPath)) {
                try {
                    config = JSON.parse(require('fs').readFileSync(configPath, 'utf8'));
                } catch { /* ignore */ }
            }

            if (name) { config.developer = { ...config.developer, name }; }
            if (projectType) { config.projectType = projectType; }
            if (githubWorkflows !== undefined) { config.githubWorkflowsEnabled = githubWorkflows; }
            if (selectedIDEs.length > 0) { config.selectedIDEs = selectedIDEs; }

            require('fs').writeFileSync(configPath, JSON.stringify(config, null, 2));
            log(`[initialize] Saved config: name=${name}, projectType=${projectType}, ides=${selectedIDEs.join(',')}`);
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

            for (const ide of selectedIDEs) {
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

                totalRules += result.rulesInstalled;
                totalWorkflows += result.workflowsInstalled;
                totalSkills += result.skillsInstalled;

                log(`[initialize] Installed for ${ide}: Rules: ${result.rulesInstalled}, Workflows: ${result.workflowsInstalled}, Skills: ${result.skillsInstalled}`);
            }

            log(`[initialize] Total installed - Rules: ${totalRules}, Workflows: ${totalWorkflows}, Skills: ${totalSkills}`);

            if (!silent) {
                const ideNames = selectedIDEs.map(i => i === 'antigravity' ? 'Antigravity (.agent)' : 'Cursor (.cursor)').join(' + ');
                vscode.window.showInformationMessage(
                    `✅ DevOps installed! IMPORTANT: Run /bootstrap to analyze your project and generate tasks.`,
                    "Run Bootstrap",
                    "Open Board"
                ).then(sel => {
                    if (sel === "Run Bootstrap") {
                        vscode.commands.executeCommand('devops.bootstrap');
                    } else if (sel === "Open Board") {
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
