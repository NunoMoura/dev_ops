/**
 * Services - Central business logic layer
 * 
 * Services encapsulate all board operations and agent workflow triggers.
 * 
 * Usage:
 * - Use BoardService for all board.json operations (CRUD)
 * - Use AgentWorkflowService for agent workflow triggers (spawn, current task, etc.)
 */

export { BoardService, boardService } from './BoardService';
export { AgentWorkflowService, agentWorkflowService } from './AgentWorkflowService';
