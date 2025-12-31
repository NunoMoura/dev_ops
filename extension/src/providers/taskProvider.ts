import * as vscode from 'vscode';
import { BoardApi, Task as DevOpsTask } from '../api/boardApi';

/**
 * Task Provider for DevOps framework tasks.
 * Integrates DevOps tasks into VS Code's native Tasks panel.
 */
export class DevOpsTaskProvider implements vscode.TaskProvider {
    private workspaceRoot: string | undefined;

    constructor() {
        const folders = vscode.workspace.workspaceFolders;
        if (folders && folders.length > 0) {
            this.workspaceRoot = folders[0].uri.fsPath;
        }
    }

    async provideTasks(): Promise<vscode.Task[]> {
        if (!this.workspaceRoot) {
            return [];
        }

        try {
            const board = await BoardApi.getBoardState(this.workspaceRoot);
            const tasks: vscode.Task[] = [];

            for (const item of board.items) {
                const task = this.createVSCodeTask(item);
                if (task) {
                    tasks.push(task);
                }
            }

            return tasks;
        } catch (error) {
            console.error('Failed to provide DevOps tasks:', error);
            return [];
        }
    }

    async resolveTask(task: vscode.Task): Promise<vscode.Task | undefined> {
        // VS Code may call this to get the full task definition
        // For now, we return the task as-is since we define them fully in provideTasks
        return task;
    }

    private createVSCodeTask(item: DevOpsTask): vscode.Task | undefined {
        if (!this.workspaceRoot) {
            return undefined;
        }

        // Create task definition
        const definition: DevOpsTaskDefinition = {
            type: 'devops',
            taskId: item.id,
            title: item.title,
            columnId: item.columnId,
        };

        // Create shell execution to open task details
        const execution = new vscode.ShellExecution(
            `echo "Opening task ${item.id}: ${item.title}"`,
            { cwd: this.workspaceRoot }
        );

        // Create VS Code task
        const task = new vscode.Task(
            definition,
            vscode.TaskScope.Workspace,
            item.title,
            'devops',
            execution,
            [] // No problem matchers needed
        );

        // Set task properties
        task.detail = `${item.id} • ${this.getColumnName(item.columnId)}`;
        task.presentationOptions = {
            reveal: vscode.TaskRevealKind.Silent,
            panel: vscode.TaskPanelKind.Dedicated,
            clear: true,
        };

        // Add custom command to show task details when task is run
        task.execution = new vscode.CustomExecution(async () => {
            return new DevOpsTaskExecution(item.id, this.workspaceRoot!);
        });

        return task;
    }

    private getColumnName(columnId: string): string {
        const columnMap: Record<string, string> = {
            'col-backlog': 'Backlog',
            'col-understand': 'Understand',
            'col-plan': 'Plan',
            'col-build': 'Build',
            'col-verify': 'Verify',
            'col-done': 'Done',
        };
        return columnMap[columnId] || columnId;
    }
}

/**
 * Task definition for DevOps tasks.
 */
interface DevOpsTaskDefinition extends vscode.TaskDefinition {
    type: 'devops';
    taskId: string;
    title: string;
    columnId: string;
}

/**
 * Custom task execution for DevOps tasks.
 * Shows task details when executed.
 */
class DevOpsTaskExecution implements vscode.Pseudoterminal {
    private writeEmitter = new vscode.EventEmitter<string>();
    onDidWrite = this.writeEmitter.event;

    private closeEmitter = new vscode.EventEmitter<number>();
    onDidClose = this.closeEmitter.event;

    constructor(private taskId: string, private workspaceRoot: string) { }

    async open(): Promise<void> {
        this.writeEmitter.fire(`Opening task ${this.taskId}...\r\n`);

        try {
            const task = await BoardApi.getTask(this.taskId, this.workspaceRoot);
            if (task) {
                this.writeEmitter.fire(`\r\n`);
                this.writeEmitter.fire(`Task: ${task.title}\r\n`);
                this.writeEmitter.fire(`ID: ${task.id}\r\n`);
                this.writeEmitter.fire(`Status: ${task.status || 'ready'}\r\n`);
                this.writeEmitter.fire(`Priority: ${task.priority}\r\n`);
                if (task.summary) {
                    this.writeEmitter.fire(`\r\nSummary:\r\n${task.summary}\r\n`);
                }
                this.writeEmitter.fire(`\r\n`);

                // Execute command to show task details in UI
                await vscode.commands.executeCommand('board.showTaskDetails', this.taskId);
            } else {
                this.writeEmitter.fire(`\r\nTask ${this.taskId} not found.\r\n`);
            }
        } catch (error) {
            this.writeEmitter.fire(`\r\nError: ${error}\r\n`);
        }

        this.closeEmitter.fire(0);
    }

    close(): void {
        // Cleanup if needed
    }
}

/**
 * Register the DevOps task provider.
 */
export function registerTaskProvider(context: vscode.ExtensionContext): void {
    const provider = new DevOpsTaskProvider();

    context.subscriptions.push(
        vscode.tasks.registerTaskProvider('devops', provider)
    );
}
