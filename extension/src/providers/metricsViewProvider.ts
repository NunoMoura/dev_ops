import * as vscode from 'vscode';
import { readBoard } from '../features/boardStore';
import { Board } from '../features/types';

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

    private _getHtmlForWebview(webview: vscode.Webview, board: Board) {
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

        const nonce = getNonce();

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Metrics</title>
                <style>
                    body { font-family: var(--vscode-font-family); padding: 10px; color: var(--vscode-foreground); }
                    .metric-row { display: flex; justify-content: space-between; margin-bottom: 15px; }
                    .card { 
                        background: var(--vscode-editor-background); 
                        border: 1px solid var(--vscode-widget-border); 
                        border-radius: 4px; 
                        padding: 10px; 
                        flex: 1; 
                        margin: 0 5px; 
                        text-align: center;
                    }
                    .card:first-child { margin-left: 0; }
                    .card:last-child { margin-right: 0; }
                    .big-number { font-size: 2em; font-weight: bold; display: block; }
                    .label { font-size: 0.8em; opacity: 0.8; text-transform: uppercase; }
                    
                    .active { color: var(--vscode-charts-yellow); }
                    .attention { color: var(--vscode-charts-red); }
                    .velocity { color: var(--vscode-charts-green); }

                    .sparkline { margin-top: 20px; }
                    .sparkline-row { display: flex; align-items: center; margin-bottom: 5px; font-size: 0.9em; }
                    .bar-container { flex: 1; height: 8px; background: var(--vscode-widget-shadow); border-radius: 4px; margin-left: 10px; overflow: hidden; }
                    .bar { height: 100%; background: var(--vscode-charts-blue); }
                </style>
            </head>
            <body>
                <div class="metric-row">
                    <div class="card">
                        <span class="big-number active">${totals.activeAgents}</span>
                        <span class="label">Agents</span>
                    </div>
                    <div class="card">
                        <span class="big-number attention">${totals.needsAttention}</span>
                        <span class="label">Attention</span>
                    </div>
                </div>

                <div class="metric-row">
                    <div class="card">
                        <span class="big-number velocity">${totals.doneLast24h}</span>
                        <span class="label">Velocity (24h)</span>
                    </div>
                </div>

                <div class="sparkline">
                    <div class="label" style="margin-bottom: 10px;">Phase Distribution</div>
                    ${this.renderBar('Und', totals.phases.Und, 10)}
                    ${this.renderBar('Pln', totals.phases.Pln, 10)}
                    ${this.renderBar('Bld', totals.phases.Bld, 10)}
                    ${this.renderBar('Ver', totals.phases.Ver, 10)}
                </div>
            </body>
            </html>`;
    }

    private renderBar(label: string, value: number, max: number) {
        const pct = Math.min((value / max) * 100, 100);
        return `
        <div class="sparkline-row">
            <span style="width: 30px">${label}</span>
            <div class="bar-container">
                <div class="bar" style="width: ${pct}%"></div>
            </div>
            <span style="width: 20px; text-align: right;">${value}</span>
        </div>`;
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
