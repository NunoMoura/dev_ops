import * as vscode from 'vscode';
import { AgentAdapter, TaskContext } from './AgentAdapter';

export class CursorAdapter implements AgentAdapter {
    readonly id = 'cursor';
    readonly name = 'Cursor';

    async isAvailable(): Promise<boolean> {
        // We can check if the command exists
        const commands = await vscode.commands.getCommands();
        return commands.includes('cursor.openComposer') || commands.includes('cursor.openChat');
    }

    async startSession(context: TaskContext): Promise<void> {
        try {
            // Try Composer first (multi-file), then Chat
            try {
                await vscode.commands.executeCommand('cursor.openComposer');
            } catch {
                await vscode.commands.executeCommand('cursor.openChat');
            }

            const prompt = `I am starting work on ${context.taskId} in phase ${context.phase}. Please read the board and help me.`;
            await vscode.env.clipboard.writeText(prompt);

            vscode.window.showInformationMessage(`📋 Copied context for ${context.taskId}. Paste in Cursor!`);
        } catch (e) {
            console.error('CursorAdapter: failed to start session', e);
            throw new Error('Failed to launch Cursor session');
        }
    }
}
