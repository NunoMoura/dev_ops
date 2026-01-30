import * as vscode from 'vscode';
import { AgentAdapter, TaskContext } from './AgentAdapter';
import { log, error as logError } from '../../infrastructure/logger';
import { detectAgentEnvironment } from '../../infrastructure/integrations/environment';
import { boardService } from '../../services/board/boardService';

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
        // Fallback: If no checks pass, return all registered
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

        // Fix: Verify availability before attempting to start
        // This ensures that we don't try to run commands if the extension is missing or commands are not registered
        if (!(await adapter.isAvailable())) {
            throw new Error(`Agent '${adapter.name}' is not available in the current environment.`);
        }

        // 2. Register Agent on Board (Before starting session)
        try {
            // Use boardService to claim the task with agent metadata
            const tempSessionId = `session-${Date.now()}`;
            await boardService.claimTask(context.taskId, {
                driver: {
                    agent: adapter.name,
                    model: 'Unknown',
                    sessionId: tempSessionId,
                }
            });
        } catch (e) {
            logError('AgentManager: Failed to register agent on board', e);
            // We continue anyway, as the visual session can still start
        }

        // 3. Start Session
        await adapter.startSession(context);
    }
}

export function registerAgentManager(context: vscode.ExtensionContext) {
    // Register command
    context.subscriptions.push(
        vscode.commands.registerCommand('devops.startAgentSession', async (agentId?: string, taskContext?: TaskContext) => {
            const manager = AgentManager.getInstance();

            if (!taskContext) {
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

