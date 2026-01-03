import * as vscode from 'vscode';
import { readBoard } from '../features/boardStore';
import { Board } from '../features/types';
import { getFontLink, getSharedStyles, getCSPMeta } from '../ui/styles';

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

        try {
            const board = await readBoard();
            this._view.webview.html = this._getHtmlForWebview(this._view.webview, board);
        } catch (e) {
            // console.error(e);
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview, board: Board): string {
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
                Verify: 0
            }
        };

        // Collect human teammates with task counts
        const teammates = new Map<string, number>();

        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
        let doneCount = 0;
        let tasksWithoutIntervention = 0;

        for (const t of board.items) {
            // Count agents: in_progress tasks with agent owner
            if (t.status === 'in_progress' && t.owner?.type === 'agent') {
                totals.activeAgents++;
            }
            // Count active teammates (humans working on tasks)
            if (t.status === 'in_progress' && t.owner?.type === 'human') {
                totals.activeTeammates++;
            }

            // Collect human teammates for Teamwork section
            if (t.owner?.type === 'human' && t.owner?.name) {
                const name = t.owner.name;
                teammates.set(name, (teammates.get(name) || 0) + 1);
            }

            if (t.status === 'done') {
                doneCount++;
                if (t.updatedAt && new Date(t.updatedAt) > oneDayAgo) {
                    totals.doneLast24h++;
                }
                // Assume tasks done by agents count as "without intervention"
                if (t.owner?.type === 'agent') {
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
                        border: 1px solid var(--brand-color); 
                        border-radius: 8px; 
                        padding: var(--space-lg); 
                        text-align: center;
                        box-shadow: var(--shadow-sm);
                        transition: all var(--transition-normal) ease;
                    }
                    .metric-card:hover {
                        box-shadow: var(--shadow-md);
                        transform: translateY(-1px);
                    }
                    .big-number { 
                        font-size: 1.8em; 
                        font-weight: var(--weight-bold); 
                        display: block; 
                        margin-bottom: var(--space-xs);
                        color: var(--vscode-foreground);
                    }
                    .metric-label { 
                        font-size: var(--text-xs); 
                        font-weight: var(--weight-medium);
                        opacity: 0.85; 
                        text-transform: uppercase; 
                        letter-spacing: 0.03em;
                        color: var(--vscode-descriptionForeground);
                    }

                    .sparkline { 
                        margin-top: var(--space-lg);
                        padding-top: var(--space-lg);
                        border-top: 1px solid var(--brand-color);
                    }
                    .section-header {
                        font-size: var(--text-xs);
                        font-weight: var(--weight-medium);
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                        margin-bottom: var(--space-lg);
                        color: var(--brand-color);
                    }
                    .sparkline-header {
                        font-size: var(--text-xs);
                        font-weight: var(--weight-medium);
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                        margin-bottom: var(--space-lg);
                        color: var(--brand-color);
                    }
                    .sparkline-row { 
                        display: flex; 
                        align-items: center; 
                        margin-bottom: var(--space-md); 
                        font-size: var(--text-base); 
                    }
                    .sparkline-label {
                        width: 70px;
                        font-weight: var(--weight-medium);
                    }
                    .bar-container { 
                        flex: 1; 
                        height: 6px; 
                        background: rgba(255, 255, 255, 0.06); 
                        border-radius: 3px; 
                        margin: 0 var(--space-md);
                        overflow: hidden; 
                    }
                    .bar { 
                        height: 100%; 
                        background: var(--brand-color);
                        transition: width var(--transition-slow) ease;
                        border-radius: 3px;
                    }
                    .bar-value {
                        width: 30px;
                        text-align: right;
                        font-weight: var(--weight-medium);
                        color: var(--brand-color);
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
