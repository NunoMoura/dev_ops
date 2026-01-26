import * as path from 'path';
import { Workspace, ProgressReporter } from '../../common/types';
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

        const tasksToCreate: { title: string, summary: string, priority: 'high' | 'medium' }[] = [];

        // 1. Architecture
        const archTitle = "Document System Architecture";
        if (!taskExists(archTitle)) {
            tasksToCreate.push({
                title: archTitle,
                summary: `Comprehensive documentation of the system architecture.\n\nStrategy:\n1. Run \`devops detect --scope architecture\` to find existing architecture docs (SPEC.md) and folder structure.\n2. Review existing structure.\n3. Create or update \`SPEC.md\` files for key components.\n4. Ensure \`SPEC.md\` files describe exports, dependencies, and constraints.`,
                priority: "high"
            });
        }

        // 2. PRD
        if (!taskExists("Define Product Requirements")) {
            tasksToCreate.push({
                title: "Define Product Requirements",
                summary: `Analyze the project to define Product Requirements.\n\nStrategy:\n1. Run \`devops detect --scope docs\` to find existing PRD or requirements docs.\n2. Run \`devops detect --scope architecture\` to understand the codebase intent.\n3. Create/Update \`.dev_ops/docs/prd.md\` using the template at \`.dev_ops/templates/docs/prd.md\`.\n4. Request user review.`,
                priority: "high"
            });
        }

        // 3. User Experience
        if (!taskExists("Define User Personas & Stories")) {
            tasksToCreate.push({
                title: "Define User Personas & Stories",
                summary: "Define the User Experience artifacts based on the PRD and Codebase.\n\nStrategy:\n1. Analyze the PRD and existing codebase.\n2. Create `.dev_ops/docs/user.md` (Personas) using the template.\n3. Create `.dev_ops/docs/story.md` (User Stories) using the template.\n4. Ensure stories trace back to PRD requirements.",
                priority: "high"
            });
        }

        // 4. Project Standards
        if (!taskExists("Define Project Standards")) {
            tasksToCreate.push({
                title: "Define Project Standards",
                summary: "Define technical and product standards.\n\nStrategy:\n1. Run \`devops detect --scope docs\` to find existing standards docs.\n2. Run \`devops detect --scope stack\` to infer technology-specific constraints.\n3. Create `.dev_ops/docs/project_standards.md` using the template at `.dev_ops/templates/docs/project_standards.md`.",
                priority: "high"
            });
        }

        // 5. Configure Rules (Task instead of Auto-gen)
        if (!taskExists("Configure Project Rules")) {
            tasksToCreate.push({
                title: "Configure Project Rules",
                summary: `Configure agent rules for the detected technology stack.\n\nStrategy:\n1. Run \`devops detect --scope stack\` to identify languages, frameowworks, and tools.\n2. For each detected item, select the appropriate template from \`.dev_ops/templates/rules/\`.\n3. Create rules in \`.agent/rules/\` (or \`.cursor/rules/\`).\n4. Customize the rules to match project conventions.`,
                priority: "high"
            });
        }

        for (const t of tasksToCreate) {
            await this.taskService.createTask('col-backlog', t.title, t.summary, t.priority);
        }
    }
}

