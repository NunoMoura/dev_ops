import * as vscode from 'vscode';
import { AgentAdapter, TaskContext } from './AgentAdapter';
import { getTaskStartPrompt } from './prompts';

export class CursorAdapter implements AgentAdapter {
    readonly id = 'cursor';
    readonly name = 'Cursor';

    async isAvailable(): Promise<boolean> {
        // We can check if the command exists
        const commands = await vscode.commands.getCommands();
        return commands.includes('cursor.openComposer') || commands.includes('cursor.openChat') || commands.includes('aichat.new_chat');
    }

    async startSession(context: TaskContext): Promise<void> {
        try {
            const commands = await vscode.commands.getCommands(true); // Get ALL commands including those from other extensions

            // Try Composer first (multi-file), then Chat
            if (commands.includes('cursor.openComposer')) {
                await vscode.commands.executeCommand('cursor.openComposer');
            } else if (commands.includes('cursor.openChat')) {
                await vscode.commands.executeCommand('cursor.openChat');
            } else if (commands.includes('aichat.new_chat')) {
                // Fallback for some versions or forks
                await vscode.commands.executeCommand('aichat.new_chat');
            } else {
                throw new Error("No Cursor AI commands found (cursor.openComposer, cursor.openChat). Are you running in Cursor?");
            }

            const prompt = getTaskStartPrompt(context);
            await vscode.env.clipboard.writeText(prompt);

            vscode.window.showInformationMessage(`📋 Copied context for ${context.taskId}. Paste in Cursor!`);
        } catch (e) {
            console.error('CursorAdapter: failed to start session', e);
            const msg = e instanceof Error ? e.message : String(e);
            throw new Error(`Failed to launch Cursor session: ${msg}`);
        }
    }
}
