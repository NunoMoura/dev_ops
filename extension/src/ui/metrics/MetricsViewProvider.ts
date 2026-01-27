import * as vscode from 'vscode';
import { readBoard } from '../../services/board/boardPersistence';
import { Board } from '../../common';
import { getFontLink, getSharedStyles, getCSPMeta } from '../shared/styles';
import { VSCodeWorkspace } from '../../infrastructure/vscodeWorkspace';
import { ConfigService } from '../../services/setup/configService';

export class MetricsViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'devopsMetricsView';

    private _view?: vscode.WebviewView;

    constructor(
        private readonly _extensionUri: vscode.Uri,
    ) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                this._extensionUri
            ]
        };

        this.updateContent();

        // Refresh periodically or on signal
        const interval = setInterval(() => this.updateContent(), 5000); // 5s poll
        webviewView.onDidDispose(() => clearInterval(interval));
    }

    public async updateContent() {
        if (!this._view) {
            return;
        }

        // Check if onboarding is complete
        const developerName = await this._getDeveloperName();
        if (!developerName) {
            // Show placeholder during onboarding
            this._view.webview.html = this._getOnboardingPlaceholderHtml();
            return;
        }

        try {
            const board = await readBoard();
            this._view.webview.html = this._getHtmlForWebview(this._view.webview, board, developerName);
        } catch (e) {
            // Show onboarding placeholder if board doesn't exist
            this._view.webview.html = this._getOnboardingPlaceholderHtml();
        }
    }

    private async _getDeveloperName(): Promise<string | null> {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            return null;
        }

        const workspaceRoot = workspaceFolders[0].uri.fsPath;
        const workspace = new VSCodeWorkspace(workspaceRoot);
        const configService = new ConfigService(workspace);

        return await configService.getDeveloperName() || null;
    }

    private _getOnboardingPlaceholderHtml(): string {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <style>
                body {
                    font-family: var(--vscode-font-family);
                    color: var(--vscode-foreground);
                    background: var(--vscode-sideBar-background);
                    padding: 20px;
                    text-align: center;
                }
                .placeholder {
                    opacity: 0.6;
                    font-size: 12px;
                }
            </style>
        </head>
        <body>
            <p class="placeholder">Complete onboarding above to see metrics</p>
        </body>
        </html>`;
    }

    private _getHtmlForWebview(webview: vscode.Webview, board: Board, developerName: string): string {
        // Calculate Metrics
        const totals = {
            activeAgents: 0,
            activeTeammates: 0, // humans actively working
            doneLast24h: 0,
            totalTasks: board.items.length,
            completionRate: 0,
            avgCycleTime: 'N/A',
            phases: {
                Understand: 0,
                Plan: 0,
                Build: 0,
                Verify: 0,
                Done: 0
            }
        };

        // Collect human teammates with task counts
        // Always include the current developer
        const teammates = new Map<string, number>();
        teammates.set(developerName, 0);

        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
        let doneCount = 0;
        let tasksWithoutIntervention = 0;

        for (const t of board.items) {
            // Count agents: in_progress tasks with active agent session
            if (t.status === 'in_progress' && t.activeSession) {
                totals.activeAgents++;
            }
            // Count active teammates (humans working on tasks without agent)
            if (t.status === 'in_progress' && !t.activeSession && t.owner) {
                totals.activeTeammates++;
            }

            // Collect human teammates for Teamwork section
            if (t.owner) {
                const name = t.owner;
                teammates.set(name, (teammates.get(name) || 0) + 1);
            }

            if (t.status === 'done') {
                doneCount++;
                if (t.updatedAt && new Date(t.updatedAt) > oneDayAgo) {
                    totals.doneLast24h++;
                }
                // Assume tasks done by agents count as "without intervention"
                if (t.activeSession) {
                    tasksWithoutIntervention++;
                }
            }

            // Phase map
            const colId = t.columnId || '';
            if (colId.includes('understand')) {
                totals.phases.Understand++;
            } else if (colId.includes('plan')) {
                totals.phases.Plan++;
            } else if (colId.includes('build')) {
                totals.phases.Build++;
            } else if (colId.includes('verify')) {
                totals.phases.Verify++;
            } else if (colId.includes('done')) {
                totals.phases.Done++;
            }
        }

        // Calculate completion rate
        if (totals.totalTasks > 0) {
            totals.completionRate = Math.round((doneCount / totals.totalTasks) * 100);
        }

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                ${getCSPMeta()}
                ${getFontLink()}
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Metrics</title>
                ${getSharedStyles()}
                <style>
                    /* Metrics-specific styles */
                    .metrics-grid { 
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: var(--space-md);
                        margin-bottom: var(--space-xl); 
                    }
                    .metric-card { 
                        background: var(--vscode-editor-background); 
                        border: 1px solid var(--vscode-widget-border); 
                        border-radius: 6px; 
                        padding: var(--space-lg); 
                        text-align: center;
                        box-shadow: none;
                        transition: background 0.1s ease;
                    }
                    .metric-card:hover {
                        background: var(--vscode-list-hoverBackground);
                    }
                    .big-number { 
                        font-size: 1.8em; 
                        font-weight: var(--weight-light); 
                        display: block; 
                        margin-bottom: var(--space-xs);
                        color: var(--vscode-editor-foreground);
                        letter-spacing: -0.02em;
                    }
                    .metric-label { 
                        font-size: 10px; 
                        font-weight: 500;
                        opacity: 0.7; 
                        text-transform: uppercase; 
                        letter-spacing: 0.05em;
                        color: var(--vscode-descriptionForeground);
                    }

                    .sparkline { 
                        margin-top: var(--space-lg);
                        padding-top: var(--space-lg);
                        border-top: 1px solid var(--vscode-panel-border, rgba(255, 255, 255, 0.08));
                    }
                    .section-header, .sparkline-header {
                        font-size: 11px;
                        font-weight: 600;
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                        margin-bottom: var(--space-lg);
                        color: var(--vscode-foreground);
                        opacity: 0.9;
                    }
                    .sparkline-row { 
                        display: flex; 
                        align-items: center; 
                        margin-bottom: 8px; 
                        font-size: 11px;
                    }
                    .sparkline-label {
                        width: 70px;
                        font-weight: 500;
                        opacity: 0.8;
                    }
                    .bar-container { 
                        flex: 1; 
                        height: 6px; 
                        background: rgba(255, 255, 255, 0.06); 
                        border-radius: 3px; 
                        margin: 0 10px;
                        overflow: hidden; 
                    }
                    .bar { 
                        height: 100%; 
                        background: var(--vscode-progressBar-background, var(--vscode-textLink-foreground));
                        transition: width 0.5s ease-out;
                        border-radius: 3px;
                    }
                    .bar-value {
                        width: 30px;
                        text-align: right;
                        font-weight: 500;
                        opacity: 0.8;
                    }
                </style>
            </head>
            <body>
                <div class="section-header">Core Metrics</div>
                <div class="metrics-grid">
                    <div class="metric-card">
                        <span class="big-number">${totals.activeAgents}</span>
                        <span class="metric-label">Active Agents</span>
                    </div>
                    <div class="metric-card">
                        <span class="big-number">${totals.activeTeammates}</span>
                        <span class="metric-label">Active Teammates</span>
                    </div>
                    <div class="metric-card">
                        <span class="big-number">${totals.doneLast24h}</span>
                        <span class="metric-label">Done (24h)</span>
                    </div>
                    <div class="metric-card">
                        <span class="big-number">${totals.avgCycleTime}</span>
                        <span class="metric-label">Avg Cycle Time</span>
                    </div>
                    <div class="metric-card">
                        <span class="big-number">${totals.completionRate}%</span>
                        <span class="metric-label">Completion Rate</span>
                    </div>
                    <div class="metric-card">
                        <span class="big-number">${totals.totalTasks}</span>
                        <span class="metric-label">Total Tasks</span>
                    </div>
                </div>

                <div class="sparkline">
                    <div class="sparkline-header">Phase Distribution</div>
                    ${this.renderBar('Understand', totals.phases.Understand, 10)}
                    ${this.renderBar('Plan', totals.phases.Plan, 10)}
                    ${this.renderBar('Build', totals.phases.Build, 10)}
                    ${this.renderBar('Verify', totals.phases.Verify, 10)}
                    ${this.renderBar('Done', totals.phases.Done, 10)}
                </div>

                <div class="sparkline">
                    <div class="sparkline-header">Teamwork</div>
                    ${this.renderTeamwork(teammates)}
                </div>
            </body>
            </html>`;
    }

    private renderBar(label: string, value: number, max: number): string {
        const pct = Math.min((value / max) * 100, 100);
        return `
        <div class="sparkline-row">
            <span class="sparkline-label">${label}</span>
            <div class="bar-container">
                <div class="bar" style="width: ${pct}%"></div>
            </div>
            <span class="bar-value">${value}</span>
        </div>`;
    }

    private renderTeamwork(teammates: Map<string, number>): string {
        if (teammates.size === 0) {
            return '<div class="sparkline-row"><span class="sparkline-label" style="opacity: 0.5">No teammates assigned</span></div>';
        }

        // Sort by task count descending
        const sorted = [...teammates.entries()].sort((a, b) => b[1] - a[1]);
        const maxTasks = sorted[0]?.[1] || 1;

        return sorted.map(([name, count]) => this.renderBar(name, count, maxTasks)).join('');
    }
}
