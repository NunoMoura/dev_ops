import * as path from 'path';
import { Workspace, ProgressReporter } from '../../types';
import { CoreTaskService } from '../tasks/taskService';

export type ProjectType = 'greenfield' | 'brownfield' | 'fresh';

// ── Task definitions per project type ────────────────────────────────────────

const GREENFIELD_TASKS: { title: string; summary: string }[] = [
    {
        title: 'Define Product Requirements',
        summary: 'Collaborate with the user to understand the project goals and scope. Research the requirements and creating a Product Requirement Document (PRD) to serve as the foundation for the project.'
    },
    {
        title: 'Define System Architecture',
        summary: 'Design the system architecture based on the approved PRD. Identify key components, interactions, and data flows, and document them in `SPEC.md` files.'
    },
    {
        title: 'Define Project Standards',
        summary: 'Establish coding standards and conventions for the project based on the chosen technology stack. Document these in `.dev_ops/docs/project_standards.md`.'
    }
];

const BROWNFIELD_TASKS: { title: string; summary: string }[] = [
    {
        title: 'Document System Architecture',
        summary: 'Analyze the existing codebase and documentation to understand the current architecture. Document the findings by creating `SPEC.md` files for key components.'
    },
    {
        title: 'Define Product Requirements',
        summary: 'Analyze existing documentation and code to understand the product intent. Create or update the Product Requirement Document (PRD) to align with the current state.'
    },
    {
        title: 'Define Project Standards',
        summary: 'Analyze the existing codebase to identify established patterns and standards. Document these in `.dev_ops/docs/project_standards.md`.'
    },
    {
        title: 'Configure Project Rules',
        summary: 'Detect the technology stack and configure appropriate agent rules. Create and customize rules in `.agent/rules/` to match project conventions.'
    }
];

// Fresh Start → empty board (no tasks)
const FRESH_TASKS: { title: string; summary: string }[] = [];

export class CoreBootstrapService {
    constructor(
        protected workspace: Workspace,
        protected taskService: CoreTaskService,
        protected extensionPath: string,
        protected projectType?: ProjectType,
        protected templateRoot?: string
    ) { }

    public async bootstrap(progress?: ProgressReporter): Promise<void> {
        progress?.report({ message: 'Creating bootstrap tasks...' });
        await this.createBootstrapTasks();
    }

    public async createBootstrapTasks(): Promise<void> {
        const board = await this.taskService.readBoard();
        const taskExists = (title: string) => board.items.some(t => t.title === title);

        const tasksToCreate = this.getTasksForProjectType()
            .filter(t => !taskExists(t.title));

        for (const t of tasksToCreate) {
            await this.taskService.createTask('col-backlog', t.title, t.summary);
        }
    }

    /** Return the appropriate task set for the configured project type. */
    public getTasksForProjectType(): { title: string; summary: string }[] {
        switch (this.projectType) {
            case 'greenfield':
                return GREENFIELD_TASKS;
            case 'fresh':
                return FRESH_TASKS;
            case 'brownfield':
            default:
                // Brownfield is also the safe default for unknown/undefined types
                return BROWNFIELD_TASKS;
        }
    }
}
