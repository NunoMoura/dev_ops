import * as vscode from 'vscode';
import { TextDecoder, TextEncoder } from 'util';
import { Workspace } from '../common/types';

/**
 * VS Code implementation of the Workspace interface.
 * Uses 'vscode.workspace.fs' for file operations.
 */
export class VSCodeWorkspace implements Workspace {
    constructor(public root: string) { }

    async findFiles(pattern: string, exclude?: string | null, maxResults?: number): Promise<string[]> {
        const excludePattern = exclude ? exclude : '**/node_modules/**';
        const uris = await vscode.workspace.findFiles(new vscode.RelativePattern(this.root, pattern), excludePattern, maxResults);
        return uris.map(u => u.fsPath);
    }

    async readFile(path: string): Promise<string> {
        const uri = vscode.Uri.file(path);
        const bytes = await vscode.workspace.fs.readFile(uri);
        return new TextDecoder().decode(bytes);
    }

    async writeFile(path: string, content: string): Promise<void> {
        const uri = vscode.Uri.file(path);
        const bytes = new TextEncoder().encode(content);
        await vscode.workspace.fs.writeFile(uri, bytes);
    }

    async exists(path: string): Promise<boolean> {
        try {
            await vscode.workspace.fs.stat(vscode.Uri.file(path));
            return true;
        } catch {
            return false;
        }
    }

    async mkdir(path: string): Promise<void> {
        await vscode.workspace.fs.createDirectory(vscode.Uri.file(path));
    }
}
