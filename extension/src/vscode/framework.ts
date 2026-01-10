import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { log, warn, formatError } from '../core';

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

    // Detect IDE to check correct folder
    const agentDir = path.join(workspaceRoot, '.agent');
    const cursorDir = path.join(workspaceRoot, '.cursor');

    let needsUpdate = false;
    let updateType: 'missing' | 'outdated' = 'missing';
    let reason = '';
    const itemsToUpdate: string[] = [];

    // Version Check
    const extensionPath = context.extensionPath;
    const bundledVersionPath = path.join(extensionPath, 'dist', 'assets', 'version.json');
    let projectVersion = '0.0.0';
    let bundledVersion = '0.0.0';

    if (fs.existsSync(projectVersionPath)) {
        try {
            const projectVersionData = JSON.parse(fs.readFileSync(projectVersionPath, 'utf8'));
            projectVersion = projectVersionData.version || '0.0.0';
        } catch (e) {
            warn(`Failed to read project version: ${e}`);
        }
    }

    if (fs.existsSync(bundledVersionPath)) {
        try {
            const bundledVersionData = JSON.parse(fs.readFileSync(bundledVersionPath, 'utf8'));
            bundledVersion = bundledVersionData.version || '0.0.0';
        } catch (e) {
            warn(`Failed to read bundled version: ${e}`);
        }
    }

    if (bundledVersion !== projectVersion) {
        needsUpdate = true;
        updateType = 'outdated';
        reason = `version mismatch: project (${projectVersion}) vs bundled (${bundledVersion})`;
    }

    // Check 1: .dev_ops exists but scripts missing
    if (fs.existsSync(boardPath) && !fs.existsSync(scriptsDir)) {
        needsUpdate = true;
        updateType = 'missing';
        itemsToUpdate.push('scripts');
        reason = 'missing .dev_ops/scripts';
    }

    // Check 2: .agent exists but rules or workflows missing
    if (fs.existsSync(agentDir)) {
        const rulesDir = path.join(agentDir, 'rules');
        const workflowsDir = path.join(agentDir, 'workflows');

        if (!fs.existsSync(rulesDir) || !fs.existsSync(workflowsDir)) {
            needsUpdate = true;
            updateType = 'missing';
            if (!fs.existsSync(rulesDir)) { itemsToUpdate.push('rules'); }
            if (!fs.existsSync(workflowsDir)) { itemsToUpdate.push('workflows'); }
            reason = reason ? `${reason}, missing .agent/rules or .agent/workflows` : 'missing .agent/rules or .agent/workflows';
        } else {
            // Check if directories are empty
            const rulesEmpty = fs.readdirSync(rulesDir).length === 0;
            const workflowsEmpty = fs.readdirSync(workflowsDir).length === 0;

            if (rulesEmpty || workflowsEmpty) {
                needsUpdate = true;
                updateType = 'missing';
                if (rulesEmpty) { itemsToUpdate.push('rules'); }
                if (workflowsEmpty) { itemsToUpdate.push('workflows'); }
                reason = reason ? `${reason}, empty .agent directories` : 'empty .agent directories';
            }
        }
    }

    // Check 3: .cursor exists but rules or commands missing
    if (fs.existsSync(cursorDir)) {
        const rulesDir = path.join(cursorDir, 'rules');
        const commandsDir = path.join(cursorDir, 'commands');

        if (!fs.existsSync(rulesDir) || !fs.existsSync(commandsDir)) {
            needsUpdate = true;
            updateType = 'missing';
            if (!fs.existsSync(rulesDir)) { itemsToUpdate.push('rules'); }
            if (!fs.existsSync(commandsDir)) { itemsToUpdate.push('commands'); }
            reason = reason ? `${reason}, missing .cursor/rules or .cursor/commands` : 'missing .cursor/rules or .cursor/commands';
        } else {
            // Check if directories are empty
            const rulesEmpty = fs.readdirSync(rulesDir).length === 0;
            const workflowsEmpty = fs.readdirSync(commandsDir).length === 0;

            if (rulesEmpty || workflowsEmpty) {
                needsUpdate = true;
                updateType = 'missing';
                if (rulesEmpty) { itemsToUpdate.push('rules'); }
                if (workflowsEmpty) { itemsToUpdate.push('commands'); }
                reason = reason ? `${reason}, empty .cursor directories` : 'empty .cursor directories';
            }
        }
    }

    if (needsUpdate) {
        log(`Detected project needing framework update: ${reason}`);

        let title = '📦 DevOps Framework Update Required';
        let message = '';

        if (updateType === 'outdated') {
            title = '📦 DevOps Framework Update Available';
            message = `A new version of the DevOps framework is available (${bundledVersion}).\n\nThis will update your scripts, workflows, and core rules (preserving customizations).`;
        } else {
            // Build descriptive message for user
            const itemDescriptions: string[] = [];
            if (itemsToUpdate.includes('scripts')) { itemDescriptions.push('• Scripts (Python automation tools)'); }
            if (itemsToUpdate.includes('rules')) { itemDescriptions.push('• Rules (AI assistant guidelines)'); }
            if (itemsToUpdate.includes('workflows') || itemsToUpdate.includes('commands')) {
                itemDescriptions.push('• Workflows (slash commands for your IDE)');
            }
            message = `The following components need to be installed:\n${itemDescriptions.join('\n')}`;
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

        // Show progress during installation
        await vscode.window.withProgress(
            {
                location: vscode.ProgressLocation.Notification,
                title: 'DevOps Framework',
                cancellable: false,
            },
            async (progress) => {
                progress.report({ message: 'Preparing installation...' });

                try {
                    // Run initialization
                    await vscode.commands.executeCommand('devops.initialize', { silent: true });
                    log('Framework files updated successfully');

                    progress.report({ message: 'Installation complete!' });

                    // Show success summary with actions
                    const successAction = await vscode.window.showInformationMessage(
                        `✅ DevOps Framework Installed!\n\nInstalled to your project:\n• Rules → .agent/rules/\n• Workflows → .agent/workflows/\n• Scripts → .dev_ops/scripts/\n\n💡 Run /bootstrap to customize rules for your project.`,
                        'Open Board',
                        'Run Bootstrap'
                    );

                    if (successAction === 'Open Board') {
                        vscode.commands.executeCommand('devops.openBoard');
                    } else if (successAction === 'Run Bootstrap') {
                        vscode.commands.executeCommand('workbench.action.chat.open');
                    }
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
            }
        );
    } else {
        log('Framework files are up to date');
    }

    // After ensuring files exist, check if they are customized
    checkForUncustomizedRules(workspaceRoot);
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
                '⚠️ Project rules need customization. Run /bootstrap to generate project-specific rules.',
                'Run Customization'
            ).then(selection => {
                if (selection === 'Run Customization') {
                    // Open Chat and ideally suggest the command
                    vscode.commands.executeCommand('workbench.action.chat.open');
                }
            });
        }
    } catch (err) {
        // Ignore errors during check
        warn(`Failed to check for uncustomized rules: ${formatError(err)}`);
    }
}
