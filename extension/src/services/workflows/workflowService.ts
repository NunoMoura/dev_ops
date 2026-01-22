import { boardService } from '../../data';

/**
 * AgentWorkflowService - Interface to agent workflow operations
 * 
 * This service provides methods to trigger agent workflows.
 * All operations use the TypeScript BoardService.
 */
export class AgentWorkflowService {
    /**
     * Pick and claim the next task from Backlog (or specific task by ID).
     * 
     * @param taskId Optional specific task ID to pick. If not provided, picks highest priority from Backlog.
     */
    async pickAndClaimTask(taskId?: string): Promise<string | null> {
        if (taskId) {
            await boardService.claimTask(taskId, { name: 'antigravity' });
            return taskId;
        }
        return await boardService.pickAndClaimTask({ name: 'antigravity' });
    }

    /**
     * Claim a specific task (can be in any column).
     * 
     * @param taskId Task ID to claim
     * @param ownerType Type of owner ('agent' or 'human')
     */
    async claimTask(taskId: string, ownerType: 'agent' | 'human' = 'agent'): Promise<void> {
        await boardService.claimTask(taskId, {
            type: ownerType,
            name: 'antigravity'
        });
    }

    /**
     * Get the current task ID from .current_task file
     */
    async getCurrentTask(): Promise<string | null> {
        return await boardService.getCurrentTask();
    }

    /**
     * Get list of active agents/humans working on tasks.
     */
    async getActiveAgents(): Promise<any[]> {
        return await boardService.getActiveAgents();
    }
}

// Singleton instance
export const agentWorkflowService = new AgentWorkflowService();

