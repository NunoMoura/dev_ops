import { TaskContext } from './AgentAdapter';

/**
 * Generates the standard system prompt for starting an agent session.
 * This ensures all agents (Antigravity, Cursor, etc.) receive consistent instructions
 * regarding behavioral expectations, specifically the "Decision Trace".
 */
export function getAgentInstructions(taskId: string, phase?: string): string {
    const instructions = [
        '1. READ: Review the checklist items in the task.',
        '2. EXECUTE: Perform the work described in the checklist items.',
        '3. UPDATE: As you complete items, you must update the task checklist to mark them as done.'
    ];

    if (phase && phase !== 'Unknown' && phase !== 'Backlog') {
        const skillPath = `.agent/skills/${phase.toLowerCase()}/SKILL.md`;
        instructions.push(`4. PHASE (${phase.toUpperCase()}): Read and follow instructions in \`${skillPath}\` using \`view_file\`.`);
        instructions.push(`5. SCOPE: Do NOT perform actions outside the scope of this skill.`);
        instructions.push(`6. NEW WORK: If you find unrelated work (bugs/features), use the \`/create_task\` workflow.`);
    }

    return instructions.join('\n');
}

/**
 * Generates the standard system prompt for starting an agent session.
 * This ensures all agents (Antigravity, Cursor, etc.) receive consistent instructions
 * regarding behavioral expectations, specifically the "Decision Trace".
 */
export function getTaskStartPrompt(context: TaskContext): string {
    const instructions = getAgentInstructions(context.taskId, context.phase);

    return `
# INSTRUCTIONS

You are starting work on task **${context.taskId}** in phase **${context.phase}**.

## CONTEXT
${context.description ? `Description: ${context.description}\n` : ''}

${instructions}

## GOAL
Read the board, understand your objective in the ${context.phase} phase, and begin work.
`.trim();
}
