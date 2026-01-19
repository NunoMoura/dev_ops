import * as vscode from 'vscode';
import { AgentAdapter, TaskContext } from './AgentAdapter';
import { log, error as logError } from '../../core';
import { detectAgentEnvironment } from '../../integrations/environment';
import { runBoardOps } from '../../data';
import * as path from 'path';

export class AgentManager {
    private adapters: Map<string, AgentAdapter> = new Map();
    private static instance: AgentManager;

    private constructor() { }

    public static getInstance(): AgentManager {
        if (!AgentManager.instance) {
            AgentManager.instance = new AgentManager();
        }
        return AgentManager.instance;
    }

    public registerAdapter(adapter: AgentAdapter) {
        this.adapters.set(adapter.id, adapter);
        log(`AgentManager: Registered ${adapter.name}`);
    }

    public getAdapter(id: string): AgentAdapter | undefined {
        return this.adapters.get(id);
    }

    public async getAvailableAgents(): Promise<AgentAdapter[]> {
        const available: AgentAdapter[] = [];
        for (const adapter of this.adapters.values()) {
            if (await adapter.isAvailable()) {
                available.push(adapter);
            }
        }
        // Fallback: If no checks pass (e.g. commands explicitly hidden), return all registered?
        // Or if we are in environment X, we might only see X.
        // For now, let's return all registered to be safe if `getCommands` is unreliable in some contexts.
        if (available.length === 0 && this.adapters.size > 0) {
            return Array.from(this.adapters.values());
        }
        return available;
    }

    public async startSession(agentId: string | undefined, context: TaskContext) {

        let targetAgentId = agentId;
        let model: string | undefined;

        // 1. Auto-detect if not provided
        if (!targetAgentId) {
            const env = await detectAgentEnvironment();
            // Map detected agent to adapter ID
            // Adapters: 'antigravity', 'cursor'
            if (env.agent === 'cursor') {
                targetAgentId = 'cursor';
            } else if (env.agent === 'antigravity') {
                targetAgentId = 'antigravity';
            }

            model = env.model;
            log(`AgentManager: Auto-detected agent ${targetAgentId} (${env.agentName})`);
        }

        if (!targetAgentId) {
            throw new Error("No agent selected and could not auto-detect supported agent.");
        }

        const adapter = this.adapters.get(targetAgentId);
        if (!adapter) {
            throw new Error(`Agent adapter '${targetAgentId}' not found. Available: ${Array.from(this.adapters.keys()).join(', ')}`);
        }

        // 2. Register Agent on Board (Before starting session)
        try {
            const root = this.getWorkspaceRoot();
            if (root) {
                // board_ops.py register <taskId> --type agent --name <Name> --model <Model>
                const args = ['register', context.taskId, '--type', 'agent', '--name', adapter.name];
                if (model) {
                    args.push('--model', model);
                }

                // We use a generic session ID if the adapter doesn't provide one ahead of time.
                // The SessionBridge will likely update this with the REAL session ID from the artifact later.
                // But we 'claim' the active slot now.
                const tempSessionId = `session-${Date.now()}`;
                args.push('--session-id', tempSessionId);

                await runBoardOps(args, root);
            }
        } catch (e) {
            logError('AgentManager: Failed to register agent on board', e);
            // We continue anyway, as the visual session can still start
        }

        // 3. Start Session
        await adapter.startSession(context);
    }

    private getWorkspaceRoot(): string | undefined {
        return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    }
}

export function registerAgentManager(context: vscode.ExtensionContext) {
    // Register command
    context.subscriptions.push(
        vscode.commands.registerCommand('devops.startAgentSession', async (agentId?: string, taskContext?: TaskContext) => {
            const manager = AgentManager.getInstance();

            // If no args, maybe prompt? (Not implemented yet, usually called with args)
            if (!taskContext) {
                // If called from UI without context, we might need to ask or get current?
                // For now, require context.
                // vscode.window.showErrorMessage('devops.startAgentSession called without arguments');
                // return;

                // FALLBACK: Try to get current task from board?
                // This is hard without being async and reading board.
                // Typically this command is called from the UI with args.
                return;
            }

            try {
                await manager.startSession(agentId, taskContext);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to start session: ${error}`);
            }
        })
    );
}
