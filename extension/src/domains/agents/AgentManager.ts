import * as vscode from 'vscode';
import { AgentAdapter, TaskContext } from './AgentAdapter';
import { log } from '../../core';

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

    public async startSession(agentId: string, context: TaskContext) {
        const adapter = this.adapters.get(agentId);
        if (!adapter) {
            throw new Error(`Agent ${agentId} not found`);
        }
        await adapter.startSession(context);
    }
}

export function registerAgentManager(context: vscode.ExtensionContext) {
    // Register command
    context.subscriptions.push(
        vscode.commands.registerCommand('devops.startAgentSession', async (agentId?: string, taskContext?: TaskContext) => {
            const manager = AgentManager.getInstance();

            // If no args, maybe prompt? (Not implemented yet, usually called with args)
            if (!agentId || !taskContext) {
                vscode.window.showErrorMessage('devops.startAgentSession called without arguments');
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
