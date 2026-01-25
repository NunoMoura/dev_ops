import * as path from 'path';
import { IWorkspace, IProgress } from '../../common/types';
import { CoreTaskService } from '../tasks/taskService';
import { ProjectContext, StackItem, DocStatus, TestStatus } from './projectAuditService';

// Global mapping from project_ops.py (Move this to shared constant if needed, or keeping it here if used by createBootstrapTasks if detecting specs manually - actually specs come from context now)
// We don't need GLOB_MAPPINGS here anymore if verify doesn't use it.
// createBootstrapTasks doesn't use it.
// Removed GLOB_MAPPINGS.

export class CoreBootstrapService {
    constructor(
        protected workspace: IWorkspace,
        protected taskService: CoreTaskService,
        protected extensionPath: string,
        protected templateRoot?: string
    ) { }

    public async bootstrap(progress?: IProgress): Promise<void> {
        progress?.report({ message: 'Starting bootstrap process...' });

        // 1. Load Context
        let context: ProjectContext | null = null;
        const contextPath = path.join(this.workspace.root, '.dev_ops/.tmp/context.json');

        if (await this.workspace.exists(contextPath)) {
            try {
                const content = await this.workspace.readFile(contextPath);
                context = JSON.parse(content);
                progress?.report({ message: 'Loaded detection context.' });
            } catch (e) {
                // If context is invalid, we can't easily fallback without the detection logic we just removed.
                // We will proceed with empty context or throw.
                // Best effort: proceeding with minimal context will result in default tasks.
            }
        }

        if (!context) {
            progress?.report({ message: 'No context found. Creating default backlog.' });
            context = {
                stack: [],
                docs: { prd: null, projectStandards: null, readme: null, contributing: null, changelog: null, existing_docs_folder: null },
                tests: { exists: false, framework: null, ci_configured: false, test_dirs: [] },
                specs: []
            };
        }

        // 2. Create Tasks
        progress?.report({ message: 'Creating tasks based on context...' });
        await this.createBootstrapTasks(context);

        // 3. Cleanup
        if (await this.workspace.exists(contextPath)) {
            try {
                const fs = require('fs');
                if (fs && fs.promises && fs.promises.unlink) {
                    await fs.promises.unlink(contextPath);
                }
            } catch (cleanupError) {
                // Ignore cleanup errors
            }
        }
    }

    public async createBootstrapTasks(context: ProjectContext): Promise<void> {
        const board = await this.taskService.readBoard();
        const taskExists = (title: string) => board.items.some(t => t.title === title);

        const tasksToCreate: { title: string, summary: string, priority: 'high' | 'medium' }[] = [];

        // 1. Architecture
        const archTitle = "Document System Architecture";
        if (!taskExists(archTitle)) {
            const existingSpecs = context.specs.length > 0
                ? `Found existing SPEC.md files:\n${context.specs.map(s => `- ${s}`).join('\n')}`
                : "No SPEC.md files found yet.";

            tasksToCreate.push({
                title: archTitle,
                summary: `Comprehensive documentation of the system architecture.\n\nContext:\n${existingSpecs}\n\nStrategy (RLM Pattern):\n1. Key components should have co-located \`SPEC.md\` files.\n2. Review existing code structure.\n3. For each major component lacking a SPEC, create one using the template.\n4. Ensure \`SPEC.md\` files describe exports, dependencies, and constraints.`,
                priority: "high"
            });
        }

        // 2. PRD
        if (!taskExists("Define Product Requirements")) {
            // Gap analysis: if PRD exists, we might not need this task, or we create a "Update PRD" task?
            // "Define/Refine Product Requirements" is safer.
            // If detection says PRD exists, update summary to "Review existing PRD".
            const prdStatus = context.docs.prd ? `Existing PRD found at: ${context.docs.prd}` : "No PRD detected.";

            tasksToCreate.push({
                title: "Define Product Requirements",
                summary: `Analyze the project to define Product Requirements.\n\nContext:\n${prdStatus}\n\nStrategy:\n1. Search for existing PRD-like documents (e.g., \`requirements.md\`, \`specs/*.md\`, or in \`docs/\`).\n2. Create/Update \`.dev_ops/docs/prd.md\` using the template at \`.dev_ops/templates/docs/prd.md\`.\n   - If existing docs found: Migrate and structure relevant content into the new file.\n   - If no docs found: Create a draft based on codebase analysis and project intent.\n3. Request user review.`,
                priority: "high"
            });
        }

        // 3. User Experience
        if (!taskExists("Define User Personas & Stories") && !context.docs.prd) {
            tasksToCreate.push({
                title: "Define User Personas & Stories",
                summary: "Define the User Experience artifacts based on the PRD and Codebase.\n\nStrategy:\n1. Analyze the PRD (or draft) and existing codebase to identify user roles and key workflows.\n2. Create `.dev_ops/docs/user.md` (Personas) using the template.\n3. Create `.dev_ops/docs/story.md` (User Stories) using the template.\n4. Ensure stories trace back to PRD requirements.",
                priority: "high"
            });
        }

        // 4. Project Standards
        if (!taskExists("Define Project Standards") && !context.docs.projectStandards) {
            tasksToCreate.push({
                title: "Define Project Standards",
                summary: "Define technical and product standards.\n\nStrategy:\n1. Search for existing constraint docs (e.g., `constraints.md`, `standards.md`).\n2. Create `.dev_ops/docs/project_standards.md` using the template at `.dev_ops/templates/docs/project_standards.md`.",
                priority: "high"
            });
        }

        // 5. Configure Rules (Task instead of Auto-gen)
        if (!taskExists("Configure Project Rules")) {
            const detectedStack = context.stack.map(s => `- ${s.name} (${s.category})`).join('\n');
            tasksToCreate.push({
                title: "Configure Project Rules",
                summary: `Configure agent rules for the detected technology stack.\n\nDetected Stack:\n${detectedStack}\n\nStrategy:\n1. Review the detected stack above.\n2. For each relevant item, use the templates in \`.dev_ops/templates/rules/\` to create rules in \`.agent/rules/\` (or \`.cursor/rules/\`).\n3. Customize the rules to match project conventions (naming, patterns, etc.).`,
                priority: "high"
            });
        }

        for (const t of tasksToCreate) {
            await this.taskService.createTask('col-backlog', t.title, t.summary, t.priority);
        }
    }
}

