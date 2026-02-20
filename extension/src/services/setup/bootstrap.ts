import * as path from 'path';
import { Workspace, ProgressReporter } from '../../types';
import { CoreTaskService } from '../tasks/taskService';

export type ProjectType = 'greenfield' | 'brownfield' | 'fresh';

// ── Task definitions per project type ────────────────────────────────────────

const GREENFIELD_TASKS: { title: string; checklist: { text: string; done: boolean }[] }[] = [
    {
        title: 'Define Product Requirements',
        checklist: [
            { text: 'Interview user for core requirements and vision', done: false },
            { text: 'Create PRD in .dev_ops/docs/prd.md', done: false }
        ]
    },
    {
        title: 'Define Architecture & Scaffolding',
        checklist: [
            { text: 'Research framework options (Understand Phase -> RES-XXX)', done: false },
            { text: 'Scaffold root directory structure', done: false },
            { text: 'Create initial SPEC.md for the core entrypoint', done: false }
        ]
    },
    {
        title: 'Establish Project Standards',
        checklist: [
            { text: 'Define coding conventions and linting rules', done: false },
            { text: 'Document in .dev_ops/docs/project_standards.md', done: false }
        ]
    }
];

const BROWNFIELD_TASKS: { title: string; checklist: { text: string; done: boolean }[] }[] = [
    {
        title: 'Analyze Codebase Architecture',
        checklist: [
            { text: 'Map existing component boundaries (Understand Phase -> RES-XXX)', done: false },
            { text: 'Identify the core entrypoint and create its SPEC.md', done: false },
            { text: 'Document high-level architecture in a system diagram', done: false }
        ]
    },
    {
        title: 'Document Product Requirements',
        checklist: [
            { text: 'Review existing code for current capabilities', done: false },
            { text: 'Create or update PRD in .dev_ops/docs/prd.md', done: false }
        ]
    },
    {
        title: 'Formalize Project Standards',
        checklist: [
            { text: 'Run formatters/linters to deduce current styles', done: false },
            { text: 'Document conventions in .dev_ops/docs/project_standards.md', done: false }
        ]
    }
];

// Fresh Start → empty board (no tasks)
const FRESH_TASKS: { title: string; checklist: { text: string; done: boolean }[] }[] = [];

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
            await this.taskService.createTask('col-backlog', t.title, '', undefined, t.checklist);
        }
    }

    /** Return the appropriate task set for the configured project type. */
    public getTasksForProjectType(): { title: string; checklist: { text: string; done: boolean }[] }[] {
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
