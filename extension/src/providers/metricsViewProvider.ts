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
            needsAttention: 0,
            doneLast24h: 0,
            phases: {
                Und: 0,
                Pln: 0,
                Bld: 0,
                Ver: 0
            }
        };

        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));

        for (const t of board.items) {
            if (t.status === 'agent_active') {
                totals.activeAgents++;
            }
            if (['blocked', 'needs_feedback'].includes(t.status || '')) {
                totals.needsAttention++;
            }

            if (t.status === 'done' && t.updatedAt && new Date(t.updatedAt) > oneDayAgo) {
                totals.doneLast24h++;
            }

            // Phase map
            const colId = t.columnId || '';
            if (colId.includes('understand')) {
                totals.phases.Und++;
            } else if (colId.includes('plan')) {
                totals.phases.Pln++;
            } else if (colId.includes('build')) {
                totals.phases.Bld++;
            } else if (colId.includes('verify')) {
                totals.phases.Ver++;
            }
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
                    .metric-row { 
                        display: flex; 
                        justify-content: space-between; 
                        gap: var(--space-md);
                        margin-bottom: var(--space-lg); 
                    }
                    .metric-card { 
                        background: var(--vscode-editor-background); 
                        border: 1px solid var(--border-normal); 
                        border-radius: 8px; 
                        padding: var(--space-xl); 
                        flex: 1; 
                        text-align: center;
                        box-shadow: var(--shadow-md);
                        transition: all var(--transition-normal) ease;
                    }
                    .metric-card:hover {
                        box-shadow: var(--shadow-lg);
                        transform: translateY(-2px);
                        border-color: var(--border-strong);
                    }
                    .big-number { 
                        font-size: 2.5em; 
                        font-weight: var(--weight-bold); 
                        display: block; 
                        margin-bottom: var(--space-sm);
                        color: var(--vscode-foreground);
                    }
                    .metric-label { 
                        font-size: var(--text-xs); 
                        font-weight: var(--weight-medium);
                        opacity: 0.85; 
                        text-transform: uppercase; 
                        letter-spacing: 0.05em;
                        color: var(--vscode-descriptionForeground);
                    }

                    .sparkline { 
                        margin-top: var(--space-2xl);
                        padding-top: var(--space-xl);
                        border-top: 1px solid var(--border-subtle);
                    }
                    .sparkline-header {
                        font-size: var(--text-xs);
                        font-weight: var(--weight-medium);
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                        margin-bottom: var(--space-lg);
                        color: var(--vscode-descriptionForeground);
                    }
                    .sparkline-row { 
                        display: flex; 
                        align-items: center; 
                        margin-bottom: var(--space-md); 
                        font-size: var(--text-base); 
                    }
                    .sparkline-label {
                        width: 40px;
                        font-weight: var(--weight-medium);
                    }
                    .bar-container { 
                        flex: 1; 
                        height: 6px; 
                        background: rgba(255, 255, 255, 0.06); 
                        border-radius: 3px; 
                        margin: 0 var(--space-lg);
                        overflow: hidden; 
                    }
                    .bar { 
                        height: 100%; 
                        background: linear-gradient(90deg, rgba(255,255,255,0.2), rgba(255,255,255,0.1));
                        transition: width var(--transition-slow) ease;
                        border-radius: 3px;
                    }
                    .bar-value {
                        width: 30px;
                        text-align: right;
                        font-weight: var(--weight-medium);
                    }
                </style>
            </head>
            <body>
                <div class="metric-row">
                    <div class="metric-card">
                        <span class="big-number">${totals.activeAgents}</span>
                        <span class="metric-label">Active Agents</span>
                    </div>
                    <div class="metric-card">
                        <span class="big-number">${totals.needsAttention}</span>
                        <span class="metric-label">Needs Attention</span>
                    </div>
                </div>

                <div class="metric-row">
                    <div class="metric-card">
                        <span class="big-number">${totals.doneLast24h}</span>
                        <span class="metric-label">Velocity (24h)</span>
                    </div>
                </div>

                <div class="sparkline">
                    <div class="sparkline-header">Phase Distribution</div>
                    ${this.renderBar('Understand', totals.phases.Und, 10)}
                    ${this.renderBar('Plan', totals.phases.Pln, 10)}
                    ${this.renderBar('Build', totals.phases.Bld, 10)}
                    ${this.renderBar('Verify', totals.phases.Ver, 10)}
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
}
