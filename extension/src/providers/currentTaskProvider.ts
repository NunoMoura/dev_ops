import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { Board, Task } from '../features/types';

/**
 * Current Task Provider - Shows active task context and phase guidance
 * 
 * Displays:
 * - Claimed task details
 * - Phase-specific guidance from .agent/rules/
 * - Linked artifacts with file links
 * - Quick action buttons (Next Phase, Retry, Refine)
 */
export class CurrentTaskProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'devopsCurrentTask';

  private _view?: vscode.WebviewView;
  private _board?: Board;
  private _currentTask?: Task;

  constructor(
    private readonly _extensionUri: vscode.Uri
  ) { }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
        case 'nextPhase':
          await vscode.commands.executeCommand('devops.nextPhase');
          break;
        case 'retryPhase':
          await vscode.commands.executeCommand('devops.retryPhase');
          break;
        case 'refinePhase':
          await vscode.commands.executeCommand('devops.refinePhase');
          break;
        case 'openArtifact':
          if (data.path) {
            const uri = vscode.Uri.file(data.path);
            await vscode.window.showTextDocument(uri);
          }
          break;
      }
    });
  }

  public async updateBoard(board: Board) {
    this._board = board;
    await this._updateCurrentTask();
    this.refresh();
  }

  public refresh() {
    if (this._view) {
      this._view.webview.html = this._getHtmlForWebview(this._view.webview);
    }
  }

  private async _updateCurrentTask() {
    if (!this._board) {
      this._currentTask = undefined;
      return;
    }

    // Find task claimed by current user/agent
    // For now, just find first task with an owner
    // TODO: Filter by actual current agent session
    this._currentTask = this._board.items.find((t: any) => t.owner !== undefined);
  }

  private async _getPhaseGuidance(): Promise<string> {
    if (!this._currentTask) {
      return '';
    }

    const column = this._board?.columns.find((c: any) => c.id === this._currentTask?.columnId);
    if (!column) {
      return '';
    }

    // Try to read phase guidance from .agent/rules/
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      return '';
    }

    const rootPath = workspaceFolders[0].uri.fsPath;
    const phaseMap: Record<string, string> = {
      'col-backlog': '1_backlog',
      'col-understand': '2_understand',
      'col-plan': '3_plan',
      'col-build': '4_build',
      'col-verify': '5_verify'
    };

    const phaseFile = phaseMap[column.id];
    if (!phaseFile) {
      return '';
    }

    try {
      const guidancePath = path.join(rootPath, '.agent', 'rules', 'development_phases', `${phaseFile}.md`);
      const content = await fs.readFile(guidancePath, 'utf-8');

      // Extract first few lines as guidance
      const lines = content.split('\n').slice(0, 10);
      return lines.join('\n').substring(0, 300) + '...';
    } catch (error) {
      return 'No phase guidance available';
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const task = this._currentTask;

    if (!task) {
      return this._getEmptyStateHtml();
    }

    const column = this._board?.columns.find((c: any) => c.id === task.columnId);
    const phaseName = column?.name || 'Unknown';
    const ownerName = (task as any).owner?.name || 'Unclaimed';

    // Get linked artifacts - for now, empty until we add this to Task interface
    const artifacts: Array<{ id: string; path: string }> = [];

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Current Task</title>
  <style>
    body {
      padding: 10px;
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
    }
    .task-header {
      margin-bottom: 16px;
    }
    .task-title {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 8px;
    }
    .task-meta {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 8px;
      font-size: 12px;
      margin-bottom: 16px;
    }
    .meta-label {
      color: var(--vscode-descriptionForeground);
      font-weight: 500;
    }
    .section {
      margin-bottom: 16px;
    }
    .section-title {
      font-weight: bold;
      font-size: 11px;
      text-transform: uppercase;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 8px;
    }
    .guidance {
      background: var(--vscode-textBlockQuote-background);
      border-left: 3px solid var(--vscode-textBlockQuote-border);
      padding: 8px;
      font-size: 12px;
      line-height: 1.5;
      white-space: pre-wrap;
    }
    .artifact {
      padding: 4px 8px;
      margin-bottom: 4px;
      cursor: pointer;
      border-radius: 2px;
    }
    .artifact:hover {
      background: var(--vscode-list-hoverBackground);
    }
    .quick-actions {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 16px;
    }
    button {
      padding: 6px 12px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 2px;
      cursor: pointer;
      font-size: 12px;
      text-align: left;
    }
    button:hover {
      background: var(--vscode-button-hoverBackground);
    }
  </style>
</head>
<body>
  <div class="task-header">
    <div class="task-title">${task.id}: ${task.title}</div>
  </div>

  <div class="task-meta">
    <div class="meta-label">Phase:</div>
    <div>${phaseName}</div>
    <div class="meta-label">Owner:</div>
    <div>${ownerName}</div>
  </div>

  <div class="section">
    <div class="section-title">📝 Guidance</div>
    <div class="guidance">Research and document findings for this task. Create artifacts as needed.</div>
  </div>

  ${artifacts.length > 0 ? `
    <div class="section">
      <div class="section-title">📄 Artifacts</div>
      ${artifacts.map((a: { id: string; path: string }) => `
        <div class="artifact" onclick="openArtifact('${a.path}')">
          📄 ${a.id}
        </div>
      `).join('')}
    </div>
  ` : ''}

  <div class="quick-actions">
    <button onclick="nextPhase()">Next Phase →</button>
    <button onclick="retryPhase()">🔄 Retry Phase</button>
    <button onclick="refinePhase()">✏️ Refine Phase</button>
  </div>

  <script>
    const vscode = acquireVsCodeApi();

    function nextPhase() {
      vscode.postMessage({ type: 'nextPhase' });
    }

    function retryPhase() {
      vscode.postMessage({ type: 'retryPhase' });
    }

    function refinePhase() {
      vscode.postMessage({ type: 'refinePhase' });
    }

    function openArtifact(path) {
      vscode.postMessage({ type: 'openArtifact', path });
    }
  </script>
</body>
</html>`;
  }

  private _getEmptyStateHtml() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Current Task</title>
  <style>
    body {
      padding: 20px;
      font-family: var(--vscode-font-family);
      color: var(--vscode-descriptionForeground);
      text-align: center;
    }
  </style>
</head>
<body>
  <p>No task currently claimed</p>
  <p style="font-size: 12px;">Claim a task to see it here</p>
</body>
</html>`;
  }
}

export function registerCurrentTask(context: vscode.ExtensionContext): CurrentTaskProvider {
  const provider = new CurrentTaskProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      CurrentTaskProvider.viewType,
      provider
    )
  );

  return provider;
}
