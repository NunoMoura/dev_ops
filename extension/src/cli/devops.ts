import { Command } from 'commander';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import fg from 'fast-glob';

import { CoreTaskService } from '../services/tasks/taskService';
import { CoreScopeService } from '../services/analysis/scopeService';
import { ProjectAuditService } from '../services/setup/projectAuditService';

import { NodeWorkspace } from '../infrastructure/nodeWorkspace';
import { Workspace, ProgressReporter } from '../types';




const program = new Command();
const cwd = process.cwd();
const workspace = new NodeWorkspace(cwd);
const taskService = new CoreTaskService(workspace);



program
    .name('devops')
    .description('DevOps CLI for agent-driven workflows')
    .version('0.0.1');

program
    .command('detect')
    .description('Detect project stack, docs, and tests (JSON output)')
    .option('--scope <scope>', 'Detection scope (architecture, stack, docs, tests)')
    .action(async (options) => {
        const auditService = new ProjectAuditService(workspace);

        if (options.scope === 'architecture') {
            const specs = await auditService.findSpecs();
            console.log(JSON.stringify({ specs }, null, 2));
        } else if (options.scope === 'stack') {
            const stack = await auditService.detectStack();
            console.log(JSON.stringify({ stack }, null, 2));
        } else if (options.scope === 'docs') {
            const docs = await auditService.detectDocs();
            console.log(JSON.stringify({ docs }, null, 2));
        } else if (options.scope === 'tests') {
            const tests = await auditService.detectTests();
            console.log(JSON.stringify({ tests }, null, 2));
        } else {
            const detection = await auditService.audit();
            console.log(JSON.stringify(detection, null, 2));
        }
    });



program
    .command('create-task')
    .description('Create a new task on the board')
    .requiredOption('--title <title>', 'task title')
    .option('--summary <summary>', 'task summary')
    .option('--column <column>', 'column ID', 'col-backlog')
    .option('--depends-on <ids>', 'comma-separated TASK-XXX IDs this task depends on')
    .option('--parent-id <id>', 'parent TASK-XXX ID — creates this as a sub-task')
    .action(async (options) => {
        const dependsOn = options.dependsOn
            ? options.dependsOn.split(',').map((s: string) => s.trim()).filter(Boolean)
            : undefined;
        const task = await taskService.createTask(
            options.column,
            options.title,
            options.summary,
            dependsOn,
            undefined,
            options.parentId
        );
        const parts: string[] = [`Created Task: ${task.id}`];
        if (task.dependsOn?.length) {
            parts.push(`(depends on: ${task.dependsOn.join(', ')})`);
        }
        if (task.parentId) {
            parts.push(`(sub-task of: ${task.parentId})`);
        }
        console.log(parts.join(' '));
    });

program
    .command('claim-task')
    .description('Claim a task and set it to In Progress')
    .option('--id <id>', 'Task ID (e.g. TASK-123)')
    .option('--column <column>', 'Target column ID (only moves if explicitly provided)')
    .action(async (options) => {
        let taskId = options.id;

        if (!taskId) {
            console.log('No Task ID provided. Smart-picking next task from Backlog...');
            taskId = await taskService.pickNextTask();
            if (!taskId) {
                console.error('No available tasks in Backlog to claim.');
                process.exit(1);
            }
            console.log(`Auto-selected Task: ${taskId}`);
        }

        // Only move if column was explicitly provided by the user
        if (options.column) {
            await taskService.moveTask(taskId, options.column);
        }
        await taskService.claimTask(taskId, {
            agent: 'CLI',
            model: 'CLI',
            sessionId: 'cli-session'
        });
        console.log(`Claimed Task: ${taskId}`);
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
    .command('update-task')
    .description('Update an existing task (title, summary, status, checklist)')
    .requiredOption('--id <id>', 'Task ID')
    .option('--title <title>', 'New task title')
    .option('--summary <summary>', 'New task summary/description')
    .option('--status <status>', 'New status (todo, in_progress, done, blocked)')
    .option('--add-checklist <item>', 'Add a new checklist item')
    .option('--check-item <item>', 'Mark a checklist item as done (fuzzy match text)')
    .action(async (options) => {
        try {
            await taskService.updateTask(options.id, {
                title: options.title,
                description: options.summary,
                status: options.status,
                addChecklistItem: options.addChecklist,
                checkChecklistItem: options.checkItem
            });
            console.log(`Updated Task: ${options.id}`);
        } catch (error: any) {
            console.error(`Failed to update task: ${error.message}`);
            process.exit(1);
        }
    });

program
    .command('read-task')
    .description('Get task details as JSON')
    .requiredOption('--id <id>', 'Task ID')
    .action(async (options) => {
        const board = await taskService.readBoard();
        const task = taskService.resolveTask(board, options.id);
        if (task) {
            console.log(JSON.stringify(task, null, 2));
        } else {
            console.error(`Task ${options.id} not found`);
            process.exit(1);
        }
    });

program
    .command('list-tasks')
    .description('List tasks with optional filtering')
    .option('--column <column>', 'Filter by column ID')
    .option('--status <status>', 'Filter by status')
    .action(async (options) => {
        const board = await taskService.readBoard();
        let tasks = board.items;

        if (options.column) {
            tasks = tasks.filter(t => t.columnId === options.column);
        }
        if (options.status) {
            tasks = tasks.filter(t => t.status === options.status);
        }

        console.log(JSON.stringify(tasks, null, 2));
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
