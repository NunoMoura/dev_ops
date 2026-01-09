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

    // Detect IDE to check correct folder
    const agentDir = path.join(workspaceRoot, '.agent');
    const cursorDir = path.join(workspaceRoot, '.cursor');

    let needsUpdate = false;
    let reason = '';
    const missingItems: string[] = [];

    // Check 1: .dev_ops exists but scripts missing
    if (fs.existsSync(boardPath) && !fs.existsSync(scriptsDir)) {
        needsUpdate = true;
        missingItems.push('scripts');
        reason = 'missing .dev_ops/scripts';
    }

    // Check 2: .agent exists but rules or workflows missing
    if (fs.existsSync(agentDir)) {
        const rulesDir = path.join(agentDir, 'rules');
        const workflowsDir = path.join(agentDir, 'workflows');

        if (!fs.existsSync(rulesDir) || !fs.existsSync(workflowsDir)) {
            needsUpdate = true;
            if (!fs.existsSync(rulesDir)) { missingItems.push('rules'); }
            if (!fs.existsSync(workflowsDir)) { missingItems.push('workflows'); }
            reason = reason ? `${reason}, missing .agent/rules or .agent/workflows` : 'missing .agent/rules or .agent/workflows';
        } else {
            // Check if directories are empty
            const rulesEmpty = fs.readdirSync(rulesDir).length === 0;
            const workflowsEmpty = fs.readdirSync(workflowsDir).length === 0;

            if (rulesEmpty || workflowsEmpty) {
                needsUpdate = true;
                if (rulesEmpty) { missingItems.push('rules'); }
                if (workflowsEmpty) { missingItems.push('workflows'); }
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
            if (!fs.existsSync(rulesDir)) { missingItems.push('rules'); }
            if (!fs.existsSync(commandsDir)) { missingItems.push('commands'); }
            reason = reason ? `${reason}, missing .cursor/rules or .cursor/commands` : 'missing .cursor/rules or .cursor/commands';
        } else {
            // Check if directories are empty
            const rulesEmpty = fs.readdirSync(rulesDir).length === 0;
            const commandsEmpty = fs.readdirSync(commandsDir).length === 0;

            if (rulesEmpty || commandsEmpty) {
                needsUpdate = true;
                if (rulesEmpty) { missingItems.push('rules'); }
                if (commandsEmpty) { missingItems.push('commands'); }
                reason = reason ? `${reason}, empty .cursor directories` : 'empty .cursor directories';
            }
        }
    }

    if (needsUpdate) {
        log(`Detected project needing framework update: ${reason}`);

        // Use status bar message instead of modal/toast for "in progress"
        const missingItemsStr = missingItems.join(', ');
        const statusMsg = vscode.window.setStatusBarMessage(`$(sync~spin) DevOps: Updating framework files (missing: ${missingItemsStr})...`);

        try {
            // Run silently - no popups from the command itself
            await vscode.commands.executeCommand('devops.initialize', { silent: true });
            log('Framework files updated successfully');

            statusMsg.dispose();

            // Show ONE single success notification
            const enableNotifications = vscode.workspace.getConfiguration('devops').get('enableNotifications', true);
            if (enableNotifications) {
                vscode.window.showInformationMessage(
                    `✅ DevOps: Framework files updated successfully!`
                );
            }
        } catch (error) {
            statusMsg.dispose();
            warn(`Framework update failed: ${formatError(error)}`);

            // Error notification with action
            vscode.window.showErrorMessage(
                `DevOps: Framework update failed. Try running "DevOps: Initialize" manually.`,
                'Open Output'
            ).then(selection => {
                if (selection === 'Open Output') {
                    vscode.commands.executeCommand('workbench.action.output.toggleOutput');
                }
            });
        }
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
