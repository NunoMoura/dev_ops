import * as vscode from 'vscode';
import { log } from '../../common';

export type AgentEnvironment = {
    agent: 'antigravity' | 'cursor' | 'vscode';
    agentName: string;
    model?: string;
};

/**
 * Detects the current IDE/Agent environment.
 */
export async function detectAgentEnvironment(): Promise<AgentEnvironment> {
    const appName = vscode.env.appName;
    log(`Detecting environment... AppName: ${appName}`);

    // 1. Check for Cursor
    if (appName.includes('Cursor')) {
        return {
            agent: 'cursor',
            agentName: 'Cursor',
            // Cursor doesn't easily expose the active model via API, 
            // but we can default or leave undefined.
        };
    }

    // 2. Check for Antigravity (Extension)
    const agExt = vscode.extensions.getExtension('google.antigravity');
    if (agExt) {
        return {
            agent: 'antigravity',
            agentName: 'Antigravity',
            model: 'gemini-2.0-pro-exp', // Reasonable default for Antigravity
        };
    }

    // 3. Fallback to generic VS Code
    return {
        agent: 'vscode',
        agentName: 'VS Code',
    };
}
