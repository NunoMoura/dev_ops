import * as path from 'path';
import { Workspace, ProgressReporter } from '../../types';
import { CoreTaskService } from '../tasks/taskService';

export type ProjectType = 'greenfield' | 'brownfield' | 'fresh';

// ── Task definitions per project type ────────────────────────────────────────

const GREENFIELD_TASKS: { title: string; description: string }[] = [
    {
        title: 'Define Product Requirements',
        description: 'Collaborate with the user to understand the product vision, goals, and scope. Research functional and non-functional requirements. Create a Product Requirement Document (PRD) in .dev_ops/docs/.'
    },
    {
        title: 'Scaffold Project & Create Specs',
        description: 'Create the initial project folder structure with one folder per major component. Create a SPEC.md file for each component defining its purpose, API, constraints, and dependencies.'
    },
    {
        title: 'Define Project Standards',
        description: 'Establish coding standards, linting, and conventions. Document in .dev_ops/docs/project_standards.md.'
    }
];

const BROWNFIELD_TASKS: { title: string; description: string }[] = [
    {
        title: 'Analyze Codebase & Create Specs',
        description: 'Analyze the existing codebase. Identify component boundaries and dependencies. Create a SPEC.md for each major component documenting its architecture, API, and constraints.'
    },
    {
        title: 'Document Product Requirements',
        description: 'Review existing documentation and codebase to understand current product scope. Create or update the PRD in .dev_ops/docs/.'
    },
    {
        title: 'Formalize Project Standards',
        description: 'Identify established coding patterns. Document standards and configure linting in .dev_ops/docs/project_standards.md.'
    }
];

// Fresh Start → empty board (no tasks)
const FRESH_TASKS: { title: string; description: string }[] = [];

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
            await this.taskService.createTask('col-backlog', t.title, t.description);
        }
    }

    /** Return the appropriate task set for the configured project type. */
    public getTasksForProjectType(): { title: string; description: string }[] {
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
