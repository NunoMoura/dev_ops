import * as vscode from 'vscode';
import { registerDevOpsCommand } from './utils';
import { getWorkspaceRoot, runDocOps, runBoardOps } from '../../data';

/**
 * Register all documentation-related commands
 * These commands create various documentation types via doc_ops.py
 */
export function registerDocumentCommands(context: vscode.ExtensionContext): void {
    registerDevOpsCommand(
        context,
        'devops.createUser',
        async () => {
            await handleCreateUser();
        },
        'Unable to create user persona',
    );

    registerDevOpsCommand(
        context,
        'devops.createStory',
        async () => {
            await handleCreateStory();
        },
        'Unable to create user story',
    );

    // Alias for createStory (used in docs view)
    registerDevOpsCommand(
        context,
        'devops.newUserStory',
        async () => {
            await handleCreateStory();
        },
        'Unable to create user story',
    );

    registerDevOpsCommand(
        context,
        'devops.newArchDoc',
        async () => {
            await handleNewArchDoc();
        },
        'Unable to create architecture doc',
    );

    registerDevOpsCommand(
        context,
        'devops.createMockup',
        async () => {
            await handleCreateMockup();
        },
        'Unable to create mockup',
    );
}

/**
 * Create a new user persona via doc_ops.py
 */
async function handleCreateUser(): Promise<void> {
    const title = await vscode.window.showInputBox({
        prompt: 'User name',
        placeHolder: 'e.g., Project Manager, Developer',
    });

    if (!title) {
        return;
    }

    const root = getWorkspaceRoot();
    if (!root) {
        vscode.window.showWarningMessage('No workspace folder open.');
        return;
    }

    const result = await runDocOps(['create-user', '--title', title], root);
    if (result.code === 0) {
        vscode.window.showInformationMessage(`✅ Created user persona: ${title}`);
        // Refresh docs view
        await vscode.commands.executeCommand('devops.refreshDocs');
    } else {
        vscode.window.showErrorMessage(`Failed to create user: ${result.stderr || result.stdout}`);
    }
}

/**
 * Create a new user story via doc_ops.py
 */
async function handleCreateStory(): Promise<void> {
    const title = await vscode.window.showInputBox({
        prompt: 'Enter user story title',
        placeHolder: 'e.g., Filter tasks by status',
    });

    if (!title) {
        return;
    }

    const persona = await vscode.window.showInputBox({
        prompt: 'Enter linked user persona (optional)',
        placeHolder: 'e.g., project_manager',
    });

    const root = getWorkspaceRoot();
    if (!root) {
        vscode.window.showWarningMessage('No workspace folder open.');
        return;
    }

    const args = ['create-story', '--title', title];
    if (persona) {
        args.push('--persona', persona);
    }

    const result = await runDocOps(args, root);
    if (result.code === 0) {
        vscode.window.showInformationMessage(`✅ Created user story: ${title}`);
        // Refresh docs view
        await vscode.commands.executeCommand('devops.refreshDocs');
    } else {
        vscode.window.showErrorMessage(`Failed to create story: ${result.stderr || result.stdout}`);
    }
}

/**
 * Create a new mockup via doc_ops.py
 */
async function handleCreateMockup(): Promise<void> {
    const title = await vscode.window.showInputBox({
        prompt: 'Mockup title',
        placeHolder: 'Login Screen',
    });
    if (!title) {
        return;
    }

    const component = await vscode.window.showInputBox({
        prompt: 'Component/feature (optional)',
        placeHolder: 'Authentication',
    });

    const root = getWorkspaceRoot();
    if (!root) {
        vscode.window.showWarningMessage('No workspace folder open.');
        return;
    }

    const args = ['create-mockup', '--title', title];
    if (component) {
        args.push('--component', component);
    }

    const result = await runDocOps(args, root);
    if (result.code === 0) {
        vscode.window.showInformationMessage(`✅ Created mockup: ${title}`);
        await vscode.commands.executeCommand('devops.refreshUX');
    } else {
        vscode.window.showErrorMessage(`Failed to create mockup: ${result.stderr || result.stdout}`);
    }
}

/**
 * Create a new architecture doc via doc_ops.py, then optionally create a linked task in Backlog.
 */
async function handleNewArchDoc(): Promise<void> {
    const title = await vscode.window.showInputBox({
        prompt: 'Enter component/module name',
        placeHolder: 'e.g., AuthService, PaymentGateway',
    });

    if (!title) {
        return;
    }

    const componentPath = await vscode.window.showInputBox({
        prompt: 'Enter path to component (optional)',
        placeHolder: 'e.g., src/services/auth.ts',
    });

    const root = getWorkspaceRoot();
    if (!root) {
        vscode.window.showWarningMessage('No workspace folder open.');
        return;
    }

    // Create architecture doc
    const args = ['create', '--type', 'architecture', '--title', title];
    if (componentPath) {
        args.push('--path', componentPath);
    }

    const result = await runDocOps(args, root);
    if (result.code !== 0) {
        vscode.window.showErrorMessage(`Failed to create doc: ${result.stderr || result.stdout}`);
        return;
    }

    // Create linked task in Backlog
    const createTask = await vscode.window.showInformationMessage(
        `✅ Created architecture doc: ${title}`,
        'Create Backlog Task',
        'Skip'
    );

    if (createTask === 'Create Backlog Task') {
        const taskResult = await runBoardOps(
            ['create', '--title', `Implement ${title}`, '--summary', `Implementation for ${title} component`, '--column', 'col-backlog'],
            root
        );
        if (taskResult.code === 0) {
            vscode.window.showInformationMessage(`✅ Created task for ${title}`);
        } else {
            vscode.window.showWarningMessage(`Doc created, but task creation failed: ${taskResult.stderr}`);
        }
    }

    await vscode.commands.executeCommand('devops.refreshDocs');
}
