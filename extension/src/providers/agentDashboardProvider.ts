import * as vscode from 'vscode';
import { runBoardOps } from '../handlers/pythonRunner';
import { formatError } from '../features/errors';

export class AgentDashboardProvider implements vscode.TreeDataProvider<AgentNode> {
    private _onDidChangeTreeData: vscode.EventEmitter<AgentNode | undefined | null | void> = new vscode.EventEmitter<AgentNode | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<AgentNode | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private context: vscode.ExtensionContext) { }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: AgentNode): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: AgentNode): Promise<AgentNode[]> {
        if (element) {
            // Agents are leaf nodes for now (or could expand to show sub-tasks/details)
            return [];
        }

        try {
            const result = await runBoardOps(['active-agents'], this.getWorkspaceRoot());
            if (result.code !== 0) {
                throw new Error(result.stderr);
            }

            const agents = JSON.parse(result.stdout || '[]');

            if (agents.length === 0) {
                // Return a placeholder node
                return [new AgentNode(
                    'No active agent at the moment',
                    vscode.TreeItemCollapsibleState.None,
                    { type: 'info', icon: new vscode.ThemeIcon('info') }
                )];
            }

            return agents.map((agent: any) => {
                const type = agent.owner?.type || 'agent';
                const name = agent.owner?.name || 'Unknown';
                const taskTitle = agent.task_title;
                const taskId = agent.task_id;
                const phase = agent.phase || 'Unknown';

                const label = `${name} (${type})`;
                const description = `${taskId}: ${taskTitle} [${phase}]`;

                return new AgentNode(
                    label,
                    vscode.TreeItemCollapsibleState.None,
                    {
                        type: 'agent',
                        description,
                        contextValue: type === 'antigravity' ? 'antigravityAgent' : 'agent',
                        iconPath: type === 'antigravity' ? new vscode.ThemeIcon('robot') : new vscode.ThemeIcon('account'),
                        taskId,
                        phase
                    }
                );
            });

        } catch (error) {
            vscode.window.showErrorMessage(`Failed to load agents: ${formatError(error)}`);
            // Return placeholder instead of empty array so users always see a message
            return [new AgentNode(
                'No active agent at the moment',
                vscode.TreeItemCollapsibleState.None,
                { type: 'info', icon: new vscode.ThemeIcon('info') }
            )];
        }
    }

    private getWorkspaceRoot(): string {
        return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
    }
}

class AgentNode extends vscode.TreeItem {
    public taskId?: string;
    public phase?: string;

    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        options?: {
            type?: string;
            description?: string;
            contextValue?: string;
            icon?: vscode.ThemeIcon;
            iconPath?: vscode.ThemeIcon;
            taskId?: string;
            phase?: string;
        }
    ) {
        super(label, collapsibleState);
        this.taskId = options?.taskId;
        this.phase = options?.phase;
        if (options?.description) {
            this.description = options.description;
        }
        if (options?.contextValue) {
            this.contextValue = options.contextValue;
        }
        if (options?.iconPath) {
            this.iconPath = options.iconPath;
        } else if (options?.icon) {
            this.iconPath = options.icon;
        }
    }
}

export function registerAgentDashboard(context: vscode.ExtensionContext) {
    const provider = new AgentDashboardProvider(context);
    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('devopsAgentView', provider),
        vscode.commands.registerCommand('devops.refreshAgents', () => provider.refresh()),

        // Proxy commands for context menus
        vscode.commands.registerCommand('devops.launchAntigravitySession', async (node: AgentNode) => {
            if (node.taskId) {
                await vscode.commands.executeCommand('devops.startAgentSession', 'antigravity', {
                    taskId: node.taskId,
                    phase: node.phase || 'General'
                });
            }
        }),

        vscode.commands.registerCommand('devops.launchCursorSession', async (node: AgentNode) => {
            if (node.taskId) {
                await vscode.commands.executeCommand('devops.startAgentSession', 'cursor', {
                    taskId: node.taskId,
                    phase: node.phase || 'General'
                });
            }
        })
    );
}


