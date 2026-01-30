import { TaskContext } from './AgentAdapter';

/**
 * Generates the standard system prompt for starting an agent session.
 * This ensures all agents (Antigravity, Cursor, etc.) receive consistent instructions
 * regarding behavioral expectations, specifically the "Decision Trace".
 */
export function getAgentInstructions(taskId: string, phase?: string): string {
    const tracePath = `.dev_ops/tasks/${taskId}/trace.md`;
    let phaseInstructions = '';

    if (phase && phase !== 'Unknown' && phase !== 'Backlog') {
        const skillPath = `.agent/skills/${phase.toLowerCase()}/SKILL.md`;
        phaseInstructions = `
## CURRENT PHASE: ${phase.toUpperCase()}

You are in the **${phase.toUpperCase()}** phase.
**Requirement**: You must STRICTLY follow the instructions in \`${skillPath}\`.
- Read this file using \`view_file\`.
- Do NOT perform actions outside the scope of this skill.
- If you find unrelated work (bugs/features), use the \`/create_task\` workflow.
`;
    }

    return `
## CRITICAL REQUIREMENT: DECISION TRACE

You MUST explicitly log your activity and decisions to the "Decision Trace" file.
**Trace File Path**: \`${tracePath}\`

1.  **Initialize**: If the file is empty, start with a header.
2.  **Log Live**: As you make decisions (e.g., "Exploring file X", "Decided to refactor Y", "Found bug Z"), append them to this file immediately.
3.  **Format**: Use Markdown. Use H2/H3 for major steps and bullet points for actions.
${phaseInstructions}
`.trim();
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
