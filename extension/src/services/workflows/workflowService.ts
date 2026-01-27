import { boardService } from '../../services/board/boardService';

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
            await boardService.claimTask(taskId, { driver: { agent: 'antigravity', model: 'default' } });
            return taskId;
        }
        return await boardService.pickAndClaimTask({ driver: { agent: 'antigravity', model: 'default' } });
    }

    /**
     * Claim a specific task (can be in any column).
     * 
     * @param taskId Task ID to claim
     * @param ownerType Type of owner ('agent' or 'human')
     */
    async claimTask(taskId: string, ownerType: 'agent' | 'human' = 'agent'): Promise<void> {
        if (ownerType === 'agent') {
            await boardService.claimTask(taskId, {
                driver: { agent: 'antigravity', model: 'default' }
            });
        } else {
            // Human claim
            await boardService.claimTask(taskId, { owner: 'Developer' });
        }
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

