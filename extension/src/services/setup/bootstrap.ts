import * as path from 'path';
import { Workspace, ProgressReporter } from '../../types';
import { CoreTaskService } from '../tasks/taskService';




export class CoreBootstrapService {
    constructor(
        protected workspace: Workspace,
        protected taskService: CoreTaskService,
        protected extensionPath: string,
        protected templateRoot?: string
    ) { }

    public async bootstrap(progress?: ProgressReporter): Promise<void> {
        progress?.report({ message: 'Creating bootstrap tasks...' });
        await this.createBootstrapTasks();
    }

    public async createBootstrapTasks(): Promise<void> {
        const board = await this.taskService.readBoard();
        const taskExists = (title: string) => board.items.some(t => t.title === title);

        const tasksToCreate: { title: string, summary: string }[] = [];

        // 1. Architecture
        const archTitle = "Document System Architecture";
        if (!taskExists(archTitle)) {
            tasksToCreate.push({
                title: archTitle,
                summary: `Document system architecture.\n\nStrategy:\n1. Analyze existing docs (README, docs/, *.md) and folder structure.\n2. Recursively identify ALL leaf components.\n3. Create \`SPEC.md\` for each component using the spec.md template.`
            });
        }

        // 2. PRD
        if (!taskExists("Define Product Requirements")) {
            tasksToCreate.push({
                title: "Define Product Requirements",
                summary: `Define Product Requirements.\n\nStrategy:\n1. Analyze existing docs and codebase to understand intent.\n2. Create/update \`.dev_ops/docs/prd.md\` using the prd.md template.\n3. Request user review.`
            });
        }

        // 3. User Experience
        if (!taskExists("Define User Personas & Stories")) {
            tasksToCreate.push({
                title: "Define User Personas & Stories",
                summary: "Define User Experience artifacts.\n\nStrategy:\n1. Analyze PRD and codebase.\n2. Create `.dev_ops/docs/user.md` (Personas) using the user.md template.\n3. Create `.dev_ops/docs/story.md` (User Stories) using the story.md template.\n4. Trace stories to PRD requirements."
            });
        }

        // 4. Project Standards
        if (!taskExists("Define Project Standards")) {
            tasksToCreate.push({
                title: "Define Project Standards",
                summary: "Define technical and product standards.\n\nStrategy:\n1. Analyze existing docs and tech stack constraints.\n2. Create `.dev_ops/docs/project_standards.md` using the project_standards.md template."
            });
        }

        // 5. Configure Rules (Task instead of Auto-gen)
        if (!taskExists("Configure Project Rules")) {
            tasksToCreate.push({
                title: "Configure Project Rules",
                summary: `Configure agent rules.\n\nStrategy:\n1. Detect tech stack (languages, frameworks, tools).\n2. Select matching templates from \`.dev_ops/templates/rules/\`.\n3. Create rules in \`.agent/rules/\` (or \`.cursor/rules/\`).\n4. Customize rules to match project conventions.`
            });
        }

        for (const t of tasksToCreate) {
            await this.taskService.createTask('col-backlog', t.title, t.summary);
        }
    }
}

