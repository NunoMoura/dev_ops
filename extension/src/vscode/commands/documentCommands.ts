import * as vscode from 'vscode';
import { registerDevOpsCommand } from './utils';
import { getWorkspaceRoot } from '../../services/board/boardPersistence';
import { CoreScopeService } from '../../services/analysis/scopeService';
import { Workspace } from '../../types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Register all documentation-related commands
 * These commands create various documentation types via doc_ops.py
 */
export function registerDocumentCommands(context: vscode.ExtensionContext): void {
    // devops.createUser, devops.createStory, devops.newArchDoc, devops.createMockup
    // have been disabled as they relied on legacy doc_ops.py.
    // TODO: Re-implement using RLM patterns in TypeScript if needed.
    registerDevOpsCommand(
        context,
        'devops.scope',
        async (uri?: vscode.Uri) => {
            if (!uri) {
                const activeEditor = vscode.window.activeTextEditor;
                if (!activeEditor) {
                    vscode.window.showErrorMessage('No file selected for scope analysis');
                    return;
                }
                uri = activeEditor.document.uri;
            }
            await handleScope(uri);
        },
        'Unable to analyze scope'
    );
}

// Simple VscodeWorkspace Adapter for CoreScopeService
class VscodeWorkspaceAdapter implements Workspace {
    constructor(public root: string) { }
    async exists(p: string) { return fs.existsSync(p); }
    async readFile(p: string) { return fs.readFileSync(p, 'utf8'); }
    async findFiles(pattern: string, exclude?: string | null) {
        // Use vscode.workspace.findFiles
        const excludePattern = exclude || undefined;
        const uris = await vscode.workspace.findFiles(new vscode.RelativePattern(this.root, pattern), excludePattern);
        return uris.map(u => u.fsPath);
    }
    // Stub others not used by ScopeService read-only
    async writeFile(p: string, content: string) { /* read-only for scope */ }
    async mkdir(p: string) { /* read-only */ }
}

async function handleScope(uri: vscode.Uri): Promise<void> {
    const root = getWorkspaceRoot();
    if (!root) {
        vscode.window.showErrorMessage('No workspace open');
        return;
    }

    // root is string (fsPath)
    const workspace = new VscodeWorkspaceAdapter(root);
    const service = new CoreScopeService(workspace, root);

    try {
        const scope = await service.getScope(uri.fsPath);

        // Show in a new untitled document as JSON
        const doc = await vscode.workspace.openTextDocument({
            content: JSON.stringify(scope, null, 2),
            language: 'json'
        });
        await vscode.window.showTextDocument(doc);
    } catch (e: any) {
        vscode.window.showErrorMessage(`Scope Error: ${e.message}`);
    }
}

// Handlers removed as part of legacy cleanup.

