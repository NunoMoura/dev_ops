import { runBoardOps } from '../data';
import { getWorkspaceRoot } from '../data';

/**
 * AgentWorkflowService - Interface to agent workflow operations
 * 
 * This service provides methods to trigger agent workflows via Python CLI.
 * These are the ONLY operations where the extension should call Python.
 */
export class AgentWorkflowService {
    /**
     * Pick and claim the next task from Backlog (or specific task by ID).
     * Triggers the /pick_task workflow.
     * 
     * @param taskId Optional specific task ID to pick. If not provided, picks highest priority from Backlog.
     */
    async pickAndClaimTask(taskId?: string): Promise<void> {
        const cwd = getWorkspaceRoot();
        if (!cwd) {
            throw new Error('No workspace folder open');
        }

        const args = taskId ? ['pick', taskId, '--claim'] : ['pick', '--claim'];
        await runBoardOps(args, cwd);
    }

    /**
     * Claim a specific task (can be in any column).
     * Triggers the /claim workflow.
     * 
     * @param taskId Task ID to claim
     * @param ownerType Type of owner ('agent' or 'human')
     */
    async claimTask(taskId: string, ownerType: 'agent' | 'human' = 'agent'): Promise<void> {
        const cwd = getWorkspaceRoot();
        if (!cwd) {
            throw new Error('No workspace folder open');
        }

        await runBoardOps(['claim', taskId, '--type', ownerType, '--name', 'antigravity', '--commit'], cwd);
    }

    /**
     * Get the current task ID from .current_task file
     */
    async getCurrentTask(): Promise<string | null> {
        const cwd = getWorkspaceRoot();
        if (!cwd) {
            return null;
        }

        const result = await runBoardOps(['current-task'], cwd);
        const output = result.stdout.trim();

        return output && output !== 'No current task' ? output : null;
    }

    /**
     * Get list of active agents/humans working on tasks.
     * Returns task info including both the agent and the human developer orchestrating it.
     */
    async getActiveAgents(): Promise<any[]> {
        const cwd = getWorkspaceRoot();
        if (!cwd) {
            return [];
        }

        const result = await runBoardOps(['active-agents'], cwd);
        try {
            return JSON.parse(result.stdout);
        } catch {
            return [];
        }
    }
}

// Singleton instance
export const agentWorkflowService = new AgentWorkflowService();
