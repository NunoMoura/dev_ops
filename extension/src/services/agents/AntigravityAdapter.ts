import * as vscode from 'vscode';
import { AgentAdapter, TaskContext } from './AgentAdapter';
import { getTaskStartPrompt } from './prompts';

export class AntigravityAdapter implements AgentAdapter {
    readonly id = 'antigravity';
    readonly name = 'Antigravity';

    private getExtension(): vscode.Extension<any> | undefined {
        // Try known IDs. 
        // Note: Actual ID depends on the installed extension. 
        // We check for 'antigravity.antigravity' or generic search if unknown.
        return vscode.extensions.getExtension('antigravity.antigravity') ||
            vscode.extensions.getExtension('google.antigravity');
    }

    async isAvailable(): Promise<boolean> {
        // 1. Check if extension works
        const ext = this.getExtension();
        if (ext) {
            return true;
        }
        // 2. Fallback: Check if command exists (legacy check)
        const commands = await vscode.commands.getCommands();
        return commands.includes('antigravity.startNewConversation');
    }

    async startSession(context: TaskContext): Promise<void> {
        try {
            // Ensure extension is active if found
            const ext = this.getExtension();
            if (ext && !ext.isActive) {
                await ext.activate();
            }

            // Verify command availability before execution
            const commands = await vscode.commands.getCommands();
            if (!commands.includes('antigravity.startNewConversation')) {
                throw new Error("Command 'antigravity.startNewConversation' not found. Please ensure the Antigravity extension is installed and active.");
            }

            // 1. Start new conversation
            await vscode.commands.executeCommand('antigravity.startNewConversation');

            // 2. Focus input
            try {
                await vscode.commands.executeCommand('antigravity.focusAgentInput');
            } catch (e) {
                console.warn('AntigravityAdapter: Failed to focus input, continuing.', e);
            }

            // 3. Prepare context
            const prompt = getTaskStartPrompt(context);
            await vscode.env.clipboard.writeText(prompt);

            vscode.window.showInformationMessage(`📋 Copied context for ${context.taskId}. Paste in Antigravity!`);
        } catch (e) {
            console.error('AntigravityAdapter: failed to start session', e);
            // Re-throw with user-friendly message, but preserved cause
            const msg = e instanceof Error ? e.message : String(e);
            throw new Error(`Failed to launch Antigravity session: ${msg}`);
        }
    }
}
