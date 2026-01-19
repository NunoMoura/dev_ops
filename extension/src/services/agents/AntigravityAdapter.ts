import * as vscode from 'vscode';
import { AgentAdapter, TaskContext } from './AgentAdapter';

export class AntigravityAdapter implements AgentAdapter {
    readonly id = 'antigravity';
    readonly name = 'Antigravity';

    async isAvailable(): Promise<boolean> {
        // We can check if the command exists
        const commands = await vscode.commands.getCommands();
        return commands.includes('antigravity.startNewConversation');
    }

    async startSession(context: TaskContext): Promise<void> {
        try {
            // 1. Start new conversation
            await vscode.commands.executeCommand('antigravity.startNewConversation');

            // 2. Focus input
            await vscode.commands.executeCommand('antigravity.focusAgentInput');

            // 3. Prepare context
            const prompt = `I am starting work on ${context.taskId} in phase ${context.phase}. Please read the board and help me.`;
            await vscode.env.clipboard.writeText(prompt);

            vscode.window.showInformationMessage(`📋 Copied context for ${context.taskId}. Paste in Antigravity!`);
        } catch (e) {
            console.error('AntigravityAdapter: failed to start session', e);
            throw new Error('Failed to launch Antigravity session');
        }
    }
}
