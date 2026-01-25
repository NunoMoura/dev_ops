import { Command } from 'commander';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import fg from 'fast-glob';
import { CoreBootstrapService } from '../core/services/bootstrap';
import { CoreTaskService } from '../core/services/taskService';
import { CoreScopeService } from '../core/services/scopeService';
import { ProjectAuditService } from '../core/services/projectAuditService';

import { IWorkspace, IProgress } from '../core/types';

class NodeWorkspace implements IWorkspace {
    constructor(public root: string) { }

    async findFiles(pattern: string, exclude?: string | null, maxResults?: number): Promise<string[]> {
        const ignore = exclude ? [exclude] : ['**/node_modules/**'];
        // Ensure pattern is relative if possible, fg expects relative patterns or absolute paths
        // We run cwd inside root for simplicity or pass cwd
        const params: fg.Options = {
            ignore,
            cwd: this.root,
            absolute: true
        };

        // fast-glob handles brace expansion, etc.
        const entries = await fg(pattern, params);

        if (maxResults && entries.length > maxResults) {
            return entries.slice(0, maxResults);
        }
        return entries;
    }

    async readFile(path: string): Promise<string> {
        return fs.readFile(path, 'utf8');
    }

    async writeFile(path: string, content: string): Promise<void> {
        await fs.writeFile(path, content, 'utf8');
    }

    async exists(path: string): Promise<boolean> {
        try {
            await fs.access(path);
            return true;
        } catch {
            return false;
        }
    }

    async mkdir(path: string): Promise<void> {
        await fs.mkdir(path, { recursive: true });
    }
}

class ConsoleProgress implements IProgress {
    report(value: { message?: string; increment?: number }): void {
        if (value.message) {
            console.log(`[Progress] ${value.message}`);
        }
    }
}

const program = new Command();
const cwd = process.cwd();
const workspace = new NodeWorkspace(cwd);
const taskService = new CoreTaskService(workspace);

// Helper to get extension path (assumed relative to script location in dist/assets/scripts)
// In production: dist/assets/scripts/devops.js -> extension root is ../..
// But we need to find assets/templates. CoreBootstrapService expects extensionPath to contain dist/assets/...
// If we pass '../..' from scripts dir, extensionPath is dist/assets/.. = dist
// CoreBootstrapService looks for path.join(extensionPath, 'dist', 'assets', item.template)
// If extensionPath is just `.` (runtime root), it looks for `./dist/assets/...`

// Let's assume the script is built to `dist/assets/scripts/devops.js`
// The templates are in `dist/assets/templates`
// So relative path from script to extension root (which contains dist) is tricky if strict structure is assumed.
// Let's pass a mock extension path that makes the relative path math work to find templates in `../templates`
// CoreBootstrapService does: path.join(extensionPath, 'dist', 'assets', item.template)
// We want this to resolve to `../templates/...` relative to where we are? No, relative to cwd?
// `extensionPath` is usually the absolute path to the extension installation directory.
// In the CLI case, we are running inside the user's project, but the ASSETS are in `.dev_ops/templates/` (copied by installer) or we need to look in `.dev_ops`?
// Wait, the installer COPIES `dist/assets/templates` to `.dev_ops/templates`.
// So the templates ARE available in `.dev_ops/templates` in the user's project!

// We should update CoreBootstrapService to look in `.dev_ops/templates` if available?
// Or we pass a "fake" extension path that points to where we expect templates.
// If we set extensionPath = projectRoot/.dev_ops, then it looks for `.dev_ops/dist/assets/templates` which is wrong.

// Hack: The templates are in `.dev_ops/templates`.
// CoreBootstrapService looks for `extensionPath/dist/assets/templates/...`
// We need `extensionPath` such that `extensionPath/dist/assets` == `.dev_ops`.
// So `extensionPath` = `.dev_ops/../..` (so `dist/assets` part matches `.dev_ops`?? No)

// Better: We should probably make template path resolution configurable or overridable.
// But for now, let's just make it work.
// If we pass `cwd` as extensionPath, it looks for `cwd/dist/assets/templates`.
// We can symlink or just assume the user has the templates there? No.

// Actually, `BootstrapService` logic in `extension/src/services/setup/bootstrap.ts`:
// `const templatePath = path.join(this.extensionPath, 'dist', 'assets', item.template);`
// `item.template` is like `templates/rules/languages.md`.
// So full path: `extensionPath/dist/assets/templates/rules/languages.md`.

// In user project (installed):
// `.dev_ops/templates/rules/languages.md` exists.
// We want `path.join(extensionPath, 'dist', 'assets', 'templates/rules/languages.md')` to equal `.dev_ops/templates/rules/languages.md`.
// This implies `extensionPath/dist/assets` should be `.dev_ops`.
// So `extensionPath` should be path.resolve(cwd, '.dev_ops', '..', '..')? 
// If `extensionPath` = `cwd/.dev_ops/../..` -> `cwd/dist/assets` ?? No.

// Let's modify CoreBootstrapService to accept a `templateRoot` override!
// That is the cleanest way.

program
    .name('devops')
    .description('DevOps CLI for agent-driven workflows')
    .version('0.0.1');

program
    .command('detect')
    .description('Detect project stack, docs, and tests (JSON output)')
    .action(async () => {
        // In CLI, templates are in .dev_ops/templates (or we want to use the ones there if they exist)
        // or we use the ones in the bundled scripts location? 
        // Actually, for CLI running in a project, we assume .dev_ops/templates might exist if installed, 
        // BUT if bootstrapping a NEW project, they might not exist yet? 
        // Wait, if bootstrapping a new project, we need the templates from somewhere!
        // The installer places them in .dev_ops. 
        // So we should point to .dev_ops.
        // const templateRoot = path.join(cwd, '.dev_ops');

        const auditService = new ProjectAuditService(workspace);
        const detection = await auditService.audit();
        console.log(JSON.stringify(detection, null, 2));
    });



program
    .command('create-task')
    .description('Create a new task on the board')
    .requiredOption('--title <title>', 'task title')
    .option('--summary <summary>', 'task summary')
    .option('--priority <priority>', 'task priority (low, medium, high)', 'medium')
    .option('--column <column>', 'column ID', 'col-backlog')
    .action(async (options) => {
        const task = await taskService.createTask(
            options.column,
            options.title,
            options.summary,
            options.priority as any
        );
        console.log(`Created Task: ${task.id}`);
    });

program
    .command('claim-task')
    .description('Claim a task and move it to In Progress (or specified column)')
    .option('--id <id>', 'Task ID (e.g. TASK-123)')
    .option('--column <column>', 'Target column ID', 'col-in-progress')
    .action(async (options) => {
        // If no ID provided, we might want to pick highest priority from backlog
        // For now, require ID for simplicity or implement pick logic matching extension
        if (!options.id) {
            console.error('Error: --id passed is required for now.');
            process.exit(1);
        }

        // Logic: Move task to target column and assign to agent (if we had assignment logic in CoreTaskService)
        // Extension handleClaimTask does: find task, move to col-build (or similar), and sets assignee.
        // CoreTaskService moveTask only updates column.
        // TODO: Update CoreTaskService to handle assignment if needed, or just move for now.

        // For basic agent flow: /claim usually moves to "Understand" or "Plan" depending on phase?
        // Actually /claim workflow often claims the "Next" task.
        // Let's implement the move.

        await taskService.moveTask(options.id, options.column);
        console.log(`Claimed Task: ${options.id} -> ${options.column}`);
    });

program
    .command('move-task')
    .description('Move a task to a different column')
    .requiredOption('--id <id>', 'Task ID')
    .requiredOption('--column <column>', 'Target column ID')
    .action(async (options) => {
        await taskService.moveTask(options.id, options.column);
        console.log(`Moved Task: ${options.id} -> ${options.column}`);
    });

program
    .command('refine-phase')
    .description('Enter the Refine Phase (Ralph Wiggum Loop)')
    .option('--feedback <feedback>', 'Feedback to refine based on')
    .action(async (options) => {
        // 1. Log feedback
        console.log(`[Ralph Wiggum Loop] Refining based on: ${options.feedback || 'Self-reflection'}`);

        // 2. Identify current task (optional, for logging)
        const taskId = await taskService.getCurrentTask(); // Need to implement getCurrentTask in CoreTaskService or read file
        if (taskId) {
            console.log(`Refining task: ${taskId}`);
        }

        // 3. Trigger workflow (in a real agent loop, this would post a message or set state)
        // For CLI, we just print instructions for the agent usage or update status
        console.log('✅ Entered Refine Phase. Please execute the "Refine Phase" workflow.');
    });

program
    .command('retry-phase')
    .description('Retry the current phase from scratch')
    .action(async () => {
        console.log(`[Ralph Wiggum Loop] Retrying current phase...`);
        // 1. Reset Board status for current task?
        // 2. Clear artifacts?
        console.log('✅ Ready to retry. Please execute the "Retry Phase" workflow.');
    });

program
    .command('scope')
    .description('RLM: Get scope and dependencies for a path')
    .argument('<path>', 'Path to component or file')
    .action(async (targetPath) => {
        const scopeService = new CoreScopeService(workspace, cwd);
        try {
            const scope = await scopeService.getScope(targetPath);
            console.log(JSON.stringify(scope, null, 2));
        } catch (error: any) {
            console.error(`Error resolving scope: ${error.message}`);
            process.exit(1);
        }
    });

program.parse();
