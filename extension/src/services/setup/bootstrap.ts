import * as path from 'path';
import { Workspace, ProgressReporter } from '../../types';
import { CoreTaskService } from '../tasks/taskService';

export type ProjectType = 'greenfield' | 'brownfield' | 'fresh';

// ── Task definitions per project type ────────────────────────────────────────

const GREENFIELD_TASKS: { title: string; summary: string }[] = [
    {
        title: 'Define Product Requirements',
        summary:
            'Define what the product will do.\n\n' +
            'Strategy:\n' +
            '1. Discuss goals and scope with the user.\n' +
            '2. Create `.dev_ops/docs/prd.md` using the prd.md template.\n' +
            '3. Request user review.'
    },
    {
        title: 'Define System Architecture',
        summary:
            'Design the system architecture.\n\n' +
            'Strategy:\n' +
            '1. Based on the PRD, identify key components.\n' +
            '2. Create `SPEC.md` for each component using the spec.md template.\n' +
            '3. Document component interactions and data flow.'
    },
    {
        title: 'Define Project Standards',
        summary:
            'Define coding standards and conventions.\n\n' +
            'Strategy:\n' +
            '1. Based on the chosen tech stack, define conventions.\n' +
            '2. Create `.dev_ops/docs/project_standards.md` using the project_standards.md template.'
    }
];

const BROWNFIELD_TASKS: { title: string; summary: string }[] = [
    {
        title: 'Document System Architecture',
        summary:
            'Document system architecture.\n\n' +
            'Strategy:\n' +
            '1. Analyze existing docs (README, docs/, *.md) and folder structure.\n' +
            '2. Recursively identify ALL leaf components.\n' +
            '3. Create `SPEC.md` for each component using the spec.md template.'
    },
    {
        title: 'Define Product Requirements',
        summary:
            'Define Product Requirements.\n\n' +
            'Strategy:\n' +
            '1. Analyze existing docs and codebase to understand intent.\n' +
            '2. Create/update `.dev_ops/docs/prd.md` using the prd.md template.\n' +
            '3. Request user review.'
    },
    {
        title: 'Define Project Standards',
        summary:
            'Define technical and product standards.\n\n' +
            'Strategy:\n' +
            '1. Analyze existing docs and tech stack constraints.\n' +
            '2. Create `.dev_ops/docs/project_standards.md` using the project_standards.md template.'
    },
    {
        title: 'Configure Project Rules',
        summary:
            'Configure agent rules.\n\n' +
            'Strategy:\n' +
            '1. Detect tech stack (languages, frameworks, tools).\n' +
            '2. Select matching templates from `.dev_ops/templates/rules/`.\n' +
            '3. Create rules in `.agent/rules/` (or `.cursor/rules/`).\n' +
            '4. Customize rules to match project conventions.'
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
