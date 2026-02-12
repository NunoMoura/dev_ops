import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { log, warn } from '../infrastructure/logger';
import { formatError } from '../infrastructure/errors';

/**
 * Check if existing project needs framework files update.
 * Checks both .dev_ops and .agent/.cursor directories.
 * Runs silently to ensure scripts, rules, workflows are present.
 */
export async function checkAndUpdateFramework(context: vscode.ExtensionContext): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
        return;
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;

    const devOpsDir = path.join(workspaceRoot, '.dev_ops');
    const scriptsDir = path.join(devOpsDir, 'scripts');
    const boardPath = path.join(devOpsDir, 'board.json');
    const projectVersionPath = path.join(devOpsDir, 'version.json');
    const configPath = path.join(devOpsDir, 'config.json');

    // Detect IDE to check correct folder
    const currentIDE = detectIDE();

    let needsUpdate = false;
    let updateType: 'missing' | 'outdated' = 'missing';
    let reason = '';
    const itemsToUpdate: string[] = [];

    // Version Check - use extension's package.json as single source of truth
    const extensionPath = context.extensionPath;
    const bundledVersion = context.extension.packageJSON.version || '0.0.0';

    // .dev_ops is the definitive marker of a DevOps-initialized project
    // (.agent/.cursor may exist from other tools)
    const isDevOpsProject = fs.existsSync(devOpsDir);
    let projectVersion: string | null = null;  // null = no version.json exists

    if (isDevOpsProject && fs.existsSync(projectVersionPath)) {
        try {
            const projectVersionData = JSON.parse(fs.readFileSync(projectVersionPath, 'utf8'));
            projectVersion = projectVersionData.version || '0.0.0';
        } catch (e) {
            warn(`Failed to read project version: ${e}`);
        }
    }

    // Critical Check: If .dev_ops exists but NO version.json and NO board.json,
    // assume it's a partial/failed install or empty folder and DO NOT Prompt for missing components.
    // Let the user run "Initialize" manually or via Onboarding.
    if (isDevOpsProject && !projectVersion && !fs.existsSync(boardPath)) {
        return;
    }

    // Only prompt for version update if version.json exists AND versions differ
    // (Projects without version.json will go through the 'missing components' flow instead)
    if (projectVersion !== null && bundledVersion !== projectVersion) {
        needsUpdate = true;
        updateType = 'outdated';
        reason = `version mismatch: project (${projectVersion}) vs bundled (${bundledVersion})`;
    }

    // Determine target IDEs to check
    // 1. Start with current IDE
    const targetIDEs = new Set<string>([currentIDE]);

    // 2. Add IDEs from config.json if available
    try {
        if (fs.existsSync(configPath)) {
            const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            if (Array.isArray(configData.selectedIDEs)) {
                configData.selectedIDEs.forEach((ide: string) => targetIDEs.add(ide));
            }
        }
    } catch (e) {
        log(`Failed to read project config: ${e}`);
    }

    const selectedIDEs = Array.from(targetIDEs);

    // Source paths for verification
    const assetsDir = path.join(context.extensionPath, 'dist', 'assets');
    const scriptsSource = path.join(assetsDir, 'scripts');
    const rulesSource = path.join(assetsDir, 'rules');
    const workflowsSource = path.join(assetsDir, 'workflows');

    // Check 1: .dev_ops exists but scripts missing
    // only flag if we actually have scripts to install
    if (fs.existsSync(boardPath) && !fs.existsSync(scriptsDir) && fs.existsSync(scriptsSource)) {
        needsUpdate = true;
        if (updateType !== 'outdated') { updateType = 'missing'; }
        itemsToUpdate.push('scripts');
        reason = 'missing .dev_ops/scripts';
    }

    // Check 2: Check each target IDE folder
    for (const ide of selectedIDEs) {
        if (ide === 'antigravity') {
            const agentDir = path.join(workspaceRoot, '.agent');
            const rulesDir = path.join(agentDir, 'rules');
            const workflowsDir = path.join(agentDir, 'workflows');

            // Check if root folder is missing OR subdirs are empty
            const isAgentMissing = !fs.existsSync(agentDir);
            const rulesMissing = !fs.existsSync(rulesDir) || fs.readdirSync(rulesDir).length === 0;
            const workflowsMissing = !fs.existsSync(workflowsDir) || fs.readdirSync(workflowsDir).length === 0;

            if (isAgentMissing || rulesMissing || workflowsMissing) {
                const canInstallRules = fs.existsSync(rulesSource);
                const canInstallWorkflows = fs.existsSync(workflowsSource);

                if ((isAgentMissing || rulesMissing) && canInstallRules) {
                    needsUpdate = true;
                    itemsToUpdate.push('rules');
                }
                if ((isAgentMissing || workflowsMissing) && canInstallWorkflows) {
                    needsUpdate = true;
                    itemsToUpdate.push('workflows');
                }

                if (needsUpdate) {
                    if (updateType !== 'outdated') { updateType = 'missing'; }
                    const newReason = 'missing .agent configuration';
                    if (!reason.includes(newReason)) {
                        reason = reason ? `${reason}, ${newReason}` : newReason;
                    }
                }
            }
        } else if (ide === 'cursor') {
            const cursorDir = path.join(workspaceRoot, '.cursor');
            const rulesDir = path.join(cursorDir, 'rules');
            const commandsDir = path.join(cursorDir, 'commands');

            const isCursorMissing = !fs.existsSync(cursorDir);
            const rulesMissing = !fs.existsSync(rulesDir) || fs.readdirSync(rulesDir).length === 0;
            const commandsMissing = !fs.existsSync(commandsDir) || fs.readdirSync(commandsDir).length === 0;

            if (isCursorMissing || rulesMissing || commandsMissing) {
                const canInstallRules = fs.existsSync(rulesSource);
                const canInstallWorkflows = fs.existsSync(workflowsSource);

                if ((isCursorMissing || rulesMissing) && canInstallRules) {
                    needsUpdate = true;
                    itemsToUpdate.push('rules');
                }
                if ((isCursorMissing || commandsMissing) && canInstallWorkflows) {
                    needsUpdate = true;
                    itemsToUpdate.push('commands');
                }

                if (needsUpdate) {
                    if (updateType !== 'outdated') { updateType = 'missing'; }
                    const newReason = 'missing .cursor configuration';
                    if (!reason.includes(newReason)) {
                        reason = reason ? `${reason}, ${newReason}` : newReason;
                    }
                }
            }
        }
    }


    if (needsUpdate) {
        log(`Detected project needing framework update: ${reason}`);

        // Check auto-update setting for version updates
        if (updateType === 'outdated') {
            const autoUpdateEnabled = vscode.workspace.getConfiguration('extensions').get('autoUpdate', true);
            if (!autoUpdateEnabled) {
                log('Auto-update disabled in settings, skipping version update prompt');
                return;
            }
        }

        let title = '';
        let message = '';

        if (updateType === 'outdated') {
            title = '📦 DevOps Framework Update Available';
            message = `A new version of the DevOps framework is available (${bundledVersion}).\n\nThis will update your scripts, workflows, and core rules (preserving customizations).`;
        } else {
            title = '⚠️ Missing DevOps Components';
            // Build descriptive message for user
            const itemDescriptions: Set<string> = new Set();
            if (itemsToUpdate.includes('scripts')) { itemDescriptions.add('• Scripts (Automation tools)'); }
            if (itemsToUpdate.includes('rules')) { itemDescriptions.add('• Rules (AI assistant guidelines)'); }
            if (itemsToUpdate.includes('workflows') || itemsToUpdate.includes('commands')) {
                itemDescriptions.add('• Workflows (slash commands for your IDE)');
            }
            message = `The following components are missing from this project:\n${Array.from(itemDescriptions).join('\n')}\n\nDo you want to install them?`;
        }

        // Ask for user authorization
        const selection = await vscode.window.showInformationMessage(
            `${title}\n\n${message}`,
            { modal: updateType === 'missing' },
            'Install Now',
            'Skip'
        );

        if (selection !== 'Install Now') {
            log('User skipped framework update');
            return;
        }

        // Track if installation succeeded for post-progress message
        let installSuccess = false;
        const isFirstInstall = updateType === 'missing';

        // Show progress during installation
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'DevOps Framework',
                cancellable: false,
            },
            async (progress) => {
                progress.report({ message: 'Installing...' });

                try {
                    // Run initialization - Pass selectedIDEs to ensure they are restored
                    await vscode.commands.executeCommand('devops.initialize', {
                        silent: true,
                        selectedIDEs: selectedIDEs
                    });
                    log('Framework files updated successfully');
                    installSuccess = true;
                } catch (error) {
                    warn(`Framework update failed: ${formatError(error)}`);

                    vscode.window.showErrorMessage(
                        `DevOps: Framework installation failed. Try running "DevOps: Initialize" manually.`,
                        'Open Output'
                    ).then(sel => {
                        if (sel === 'Open Output') {
                            vscode.commands.executeCommand('workbench.action.output.toggleOutput');
                        }
                    });
                }
                // Return immediately to close progress notification
            }
        );

        // Show success message AFTER progress closes (not inside withProgress)
        if (installSuccess) {
            let successMessage: string;
            let actionButton: string;
            if (isFirstInstall) {
                successMessage = `✅ DevOps Framework Installed!\n\n📌 NEXT STEP: Open the DevOps Board to claim your first task.\n\nWe have analyzed your project and created a custom backlog for you.`;
                actionButton = 'Open Board';
            } else {
                successMessage = `✅ DevOps Framework Updated!\n\nScripts and workflows updated to v${bundledVersion}.\nYour customized rules were preserved.`;
                actionButton = 'Open Board';
            }

            const successAction = await vscode.window.showInformationMessage(
                successMessage,
                actionButton
            );

            if (successAction === 'Open Board') {
                vscode.commands.executeCommand('devops.openBoard');
            }
        }
    } else {
        log('Framework files are up to date');
    }

    // After ensuring files exist, check if they are customized
    checkForUncustomizedRules(workspaceRoot);
}

function detectIDE(): string {
    const appName = vscode.env.appName || '';
    if (appName.includes('Cursor')) {
        return 'cursor';
    }
    if (appName.includes('Antigravity') || vscode.extensions.getExtension('google.antigravity')) {
        return 'antigravity';
    }
    return 'antigravity';
}

/**
 * Check if rules are still generic templates and prompt user/agent to bootstrap.
 */
function checkForUncustomizedRules(workspaceRoot: string): void {
    // Check detected IDE folder
    const agentDir = path.join(workspaceRoot, '.agent', 'rules');
    const cursorDir = path.join(workspaceRoot, '.cursor', 'rules');
    let rulesDir = '';

    if (fs.existsSync(cursorDir)) {
        rulesDir = cursorDir;
    } else if (fs.existsSync(agentDir)) {
        rulesDir = agentDir;
    } else {
        return;
    }

    try {
        const files = fs.readdirSync(rulesDir);
        let needsBootstrap = false;
        let uncustomizedCount = 0;

        for (const file of files) {
            if (!file.endsWith('.md') && !file.endsWith('.mdc')) { continue; }

            const content = fs.readFileSync(path.join(rulesDir, file), 'utf8');
            // Check for common template placeholders
            if (content.includes('[Language Name]') ||
                content.includes('[Linter Name]') ||
                content.includes('[Library Name]') ||
                content.includes('REPLACE_WITH_')) {
                needsBootstrap = true;
                uncustomizedCount++;
            }
        }

        if (needsBootstrap) {
            log(`Detected ${uncustomizedCount} uncustomized rule files.`);
            vscode.window.showWarningMessage(
                '⚠️ Project rules need customization. Please check your DevOps Board for configuration tasks.',
                'Open Board'
            ).then(selection => {
                if (selection === 'Open Board') {
                    vscode.commands.executeCommand('devops.openBoard');
                }
            });
        }
    } catch (err) {
        // Ignore errors during check
        warn(`Failed to check for uncustomized rules: ${formatError(err)}`);
    }
}
