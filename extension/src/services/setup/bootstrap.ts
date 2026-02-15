import * as path from 'path';
import { Workspace, ProgressReporter } from '../../types';
import { CoreTaskService } from '../tasks/taskService';

export type ProjectType = 'greenfield' | 'brownfield' | 'fresh';

// ── Task definitions per project type ────────────────────────────────────────

const GREENFIELD_TASKS: { title: string; summary: string; checklist: { text: string; done: boolean }[] }[] = [
    {
        title: 'Define Project Structure',
        summary: 'Establish the core structure and requirements for the new project.',
        checklist: [
            { text: 'Collaborate with the user to understand project goals and scope', done: false },
            { text: 'Research functional and non-functional requirements', done: false },
            { text: 'Create Product Requirement Document (PRD)', done: false },
            { text: 'Create initial folder structure', done: false }
        ]
    },
    {
        title: 'Define System Architecture',
        summary: 'Design the system architecture based on the approved PRD.',
        checklist: [
            { text: 'Identify key system components', done: false },
            { text: 'Define data flows and interactions', done: false },
            { text: 'Document architecture in SPEC.md', done: false }
        ]
    },
    {
        title: 'Define Project Standards',
        summary: 'Establish coding standards and conventions.',
        checklist: [
            { text: 'Define coding style (linting, formatting)', done: false },
            { text: 'Document standards in .dev_ops/docs/project_standards.md', done: false },
            { text: 'Configure project-level rules', done: false }
        ]
    }
];

const BROWNFIELD_TASKS: { title: string; summary: string; checklist: { text: string; done: boolean }[] }[] = [
    {
        title: 'Document System Architecture',
        summary: 'Analyze and document the existing system architecture.',
        checklist: [
            { text: 'Analyze existing codebase structure', done: false },
            { text: 'Identify key components and dependencies', done: false },
            { text: 'Create SPEC.md files for core components', done: false }
        ]
    },
    {
        title: 'Define Product Requirements',
        summary: 'Align on product requirements based on current state.',
        checklist: [
            { text: 'Analyze existing documentation', done: false },
            { text: 'Create/Update Product Requirement Document (PRD)', done: false }
        ]
    },
    {
        title: 'Define Project Standards',
        summary: 'Formalize existing patterns into standards.',
        checklist: [
            { text: 'Identify established coding patterns', done: false },
            { text: 'Document standards in .dev_ops/docs/project_standards.md', done: false }
        ]
    },
    {
        title: 'Configure Project Rules',
        summary: 'Configure agent rules for the existing codebase.',
        checklist: [
            { text: 'Detect technology stack', done: false },
            { text: 'Create and customize rules in .agent/rules/', done: false }
        ]
    }
];

// Fresh Start → empty board (no tasks)
const FRESH_TASKS: { title: string; summary: string; checklist: { text: string; done: boolean }[] }[] = [];

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
            await this.taskService.createTask('col-backlog', t.title, t.summary, undefined, t.checklist);
        }
    }

    /** Return the appropriate task set for the configured project type. */
    public getTasksForProjectType(): { title: string; summary: string; checklist: { text: string; done: boolean }[] }[] {
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
