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
    .action(async (options) => {
        const task = await taskService.createTask(
            options.column,
            options.title,
            options.summary
        );
        console.log(`Created Task: ${task.id}`);
    });

program
    .command('claim-task')
    .description('Claim a task and move it to In Progress (or specified column)')
    .option('--id <id>', 'Task ID (e.g. TASK-123)')
    .option('--column <column>', 'Target column ID', 'col-understand')
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
