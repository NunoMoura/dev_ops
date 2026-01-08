import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Board, Task } from '../../core';
import { readBoard } from '../../data';
import { log } from '../../core';

/**
 * Dashboard webview that shows either:
 * 1. Onboarding form (if developer name not set)
 * 2. Status overview (if setup complete)
 */
export class DashboardViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'devopsStatusBoard';

  private _view?: vscode.WebviewView;
  private _onDidComplete = new vscode.EventEmitter<void>();
  public readonly onDidComplete = this._onDidComplete.event;

  constructor(private readonly _extensionUri: vscode.Uri) { }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    this._updateContent();

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage(async (message) => {
      if (message.type === 'submit') {
        const { name, projectType } = message;
        await this._saveConfig(name, projectType);
        // Trigger initialization with project type
        await vscode.commands.executeCommand('devops.initialize', projectType);
        this._onDidComplete.fire();
        this._updateContent();
      } else if (message.type === 'openTask' && typeof message.taskId === 'string') {
        vscode.commands.executeCommand('devops.showTaskDetails', message.taskId);
      } else if (message.type === 'openBoard') {
        vscode.commands.executeCommand('devops.openBoard');
      }
    });
  }

  public refresh(): void {
    this._updateContent();
  }

  private async _updateContent(): Promise<void> {
    if (!this._view) {
      return;
    }

    const state = await this._getOnboardingState();
    if (state.needsOnboarding) {
      this._view.webview.html = this._getOnboardingHtml(state);
    } else {
      this._view.webview.html = await this._getDashboardHtml();
    }
  }

  /**
   * Get detailed onboarding state to show adaptive form.
   */
  private async _getOnboardingState(): Promise<{
    needsOnboarding: boolean;
    projectExists: boolean;
    savedName: string | null;
    gitName: string | null;
  }> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return { needsOnboarding: true, projectExists: false, savedName: null, gitName: null };
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const devOpsDir = path.join(workspaceRoot, '.dev_ops');
    const configPath = path.join(devOpsDir, 'config.json');
    const boardPath = path.join(devOpsDir, 'board.json');

    // Check if project is initialized (has board.json)
    const projectExists = fs.existsSync(boardPath);

    // Get saved developer name
    let savedName: string | null = null;
    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        savedName = config.developer?.name || null;
      } catch { /* Ignore */ }
    }

    // Try to get name from git config
    let gitName: string | null = null;
    try {
      const { execSync } = require('child_process');
      gitName = execSync('git config user.name', {
        cwd: workspaceRoot,
        encoding: 'utf-8',
        timeout: 2000
      }).trim() || null;
    } catch { /* Ignore */ }

    return {
      needsOnboarding: !savedName,
      projectExists,
      savedName,
      gitName
    };
  }

  private async _saveConfig(name: string, projectType: string): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return;
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const devOpsDir = path.join(workspaceRoot, '.dev_ops');
    const configPath = path.join(devOpsDir, 'config.json');

    if (!fs.existsSync(devOpsDir)) {
      fs.mkdirSync(devOpsDir, { recursive: true });
    }

    let config: Record<string, unknown> = {};
    if (fs.existsSync(configPath)) {
      try {
        config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      } catch { /* Ignore */ }
    }

    config.developer = { name: name.trim() };
    config.projectType = projectType;

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    log(`Onboarding complete: ${name}, ${projectType}`);

    vscode.window.showInformationMessage(
      `✅ Welcome, ${name}! Your DevOps workspace is ready.`
    );
  }

  private _getOnboardingHtml(state: {
    projectExists: boolean;
    savedName: string | null;
    gitName: string | null;
  }): string {
    const prefillName = state.savedName || state.gitName || '';
    const projectExists = state.projectExists;

    // If project exists, only show name field (brownfield is forced)
    const projectTypeSection = projectExists ? `
      <div class="form-group">
        <label>Project Type</label>
        <div class="info-box">
          <span class="info-icon">✅</span>
          <span>Existing project detected (brownfield mode)</span>
        </div>
        <input type="hidden" name="projectType" value="brownfield">
      </div>
    ` : `
      <div class="form-group">
        <label>Project Type</label>
        <div class="radio-group">
          <label class="radio-option" id="opt-greenfield">
            <input type="radio" name="projectType" value="greenfield" checked>
            <div class="radio-content">
              <div class="radio-label">🌱 Greenfield</div>
              <div class="radio-desc">New project starting from scratch</div>
            </div>
          </label>
          <label class="radio-option selected" id="opt-brownfield">
            <input type="radio" name="projectType" value="brownfield">
            <div class="radio-content">
              <div class="radio-label">🏗️ Brownfield</div>
              <div class="radio-desc">Existing codebase to improve</div>
            </div>
          </label>
        </div>
      </div>
    `;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      padding: 16px;
    }
    .header { text-align: center; margin-bottom: 20px; }
    .header h2 { font-size: 16px; font-weight: 600; margin-bottom: 8px; }
    .header p { font-size: 12px; opacity: 0.8; }
    .form-group { margin-bottom: 16px; }
    label { display: block; font-size: 12px; font-weight: 500; margin-bottom: 6px; }
    input[type="text"] {
      width: 100%; padding: 8px 10px; font-size: 13px;
      border: 1px solid var(--vscode-input-border);
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border-radius: 4px; outline: none;
    }
    input[type="text"]:focus { border-color: var(--vscode-focusBorder); }
    .info-box {
      display: flex; align-items: center; gap: 8px; padding: 10px;
      background: var(--vscode-textBlockQuote-background);
      border-left: 3px solid var(--vscode-textLink-foreground);
      border-radius: 4px; font-size: 12px;
    }
    .info-icon { font-size: 14px; }
    .radio-group { display: flex; flex-direction: column; gap: 8px; }
    .radio-option {
      display: flex; align-items: flex-start; padding: 10px;
      border: 1px solid var(--vscode-input-border);
      border-radius: 6px; cursor: pointer;
    }
    .radio-option:hover { background: var(--vscode-list-hoverBackground); }
    .radio-option.selected { border-color: var(--vscode-focusBorder); background: var(--vscode-list-activeSelectionBackground); }
    .radio-option input { margin-right: 10px; margin-top: 2px; }
    .radio-content { flex: 1; }
    .radio-label { font-weight: 500; font-size: 13px; }
    .radio-desc { font-size: 11px; opacity: 0.7; margin-top: 2px; }
    button {
      width: 100%; padding: 10px; font-size: 13px; font-weight: 500;
      border: none; border-radius: 4px; cursor: pointer;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }
    button:hover { opacity: 0.9; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .error { color: var(--vscode-errorForeground); font-size: 11px; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="header">
    <h2>🚀 Welcome to DevOps</h2>
    <p>Quick setup to get you started</p>
  </div>
  <form id="onboardingForm">
    <div class="form-group">
      <label for="name">Your Name</label>
      <input type="text" id="name" placeholder="e.g., Alice, Bob, Nuno" value="${this._escapeHtml(prefillName)}" required>
      <div class="error" id="nameError"></div>
    </div>
    ${projectTypeSection}
    <button type="submit">Continue</button>
  </form>
  <script>
    const vscode = acquireVsCodeApi();
    const form = document.getElementById('onboardingForm');
    const nameInput = document.getElementById('name');
    const nameError = document.getElementById('nameError');
    const projectExists = ${projectExists};
    
    // Handle radio selection styling (only if radio buttons exist)
    if (!projectExists) {
      document.querySelectorAll('.radio-option').forEach(opt => {
        const radio = opt.querySelector('input');
        if (radio.checked) opt.classList.add('selected');
        radio.addEventListener('change', () => {
          document.querySelectorAll('.radio-option').forEach(o => o.classList.remove('selected'));
          opt.classList.add('selected');
        });
      });
    }
    
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = nameInput.value.trim();
      if (!name) { nameError.textContent = 'Name is required'; return; }
      const projectType = projectExists ? 'brownfield' : document.querySelector('input[name="projectType"]:checked').value;
      vscode.postMessage({ type: 'submit', name, projectType });
    });
    nameInput.addEventListener('input', () => { nameError.textContent = ''; });
  </script>
</body>
</html>`;
  }

  private async _getDashboardHtml(): Promise<string> {
    let board: Board | null = null;
    try {
      board = await readBoard();
    } catch { /* Ignore */ }

    const tasks = board?.items || [];
    const groups = [
      { id: 'blocked', label: 'Blocked', color: '#f44336', tasks: tasks.filter(t => t.status === 'blocked') },
      { id: 'feedback', label: 'Needs Feedback', color: '#ff9800', tasks: tasks.filter(t => t.status === 'needs_feedback') },
      { id: 'in_progress', label: 'In Progress', color: '#4caf50', tasks: tasks.filter(t => t.status === 'in_progress' || t.status === 'agent_active') },
      { id: 'ready', label: 'Ready', color: '#2196f3', tasks: tasks.filter(t => t.status === 'ready') },
      { id: 'done', label: 'Done', color: '#9e9e9e', tasks: tasks.filter(t => t.status === 'done') },
    ];

    const groupsHtml = groups.map(g => `
      <div class="group">
        <div class="group-header">
          <span class="dot" style="background:${g.color}"></span>
          <span class="group-name">${g.label}</span>
          <span class="count">${g.tasks.length}</span>
        </div>
        ${g.tasks.map(t => `
          <div class="task" onclick="openTask('${t.id}')">
            <span class="task-title">${this._escapeHtml(t.title)}</span>
          </div>
        `).join('')}
      </div>
    `).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      padding: 12px;
    }
    .group { margin-bottom: 12px; }
    .group-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .dot { width: 10px; height: 10px; border-radius: 50%; }
    .group-name { font-weight: 500; font-size: 12px; }
    .count { font-size: 11px; opacity: 0.6; }
    .task {
      padding: 6px 8px; margin-left: 18px; margin-bottom: 4px;
      background: var(--vscode-list-hoverBackground);
      border-radius: 4px; cursor: pointer; font-size: 12px;
    }
    .task:hover { background: var(--vscode-list-activeSelectionBackground); }
    
    .dashboard-header {
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }
    .open-board-btn {
      width: 100%;
      padding: 10px;
      /* background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); */
      background: #cba6f7;
      color: #11111b; /* Dark text for contrast on pastel purple */
      border: none;
      border-radius: 6px;
      font-weight: 700;
      cursor: pointer;
      text-align: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      transition: transform 0.1s ease, box-shadow 0.1s ease, filter 0.1s ease;
      font-family: inherit;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .open-board-btn:hover {
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
      filter: brightness(1.1);
      transform: translateY(-1px);
    }
    .open-board-btn:active {
      transform: translateY(0);
    }
    .open-board-btn .icon { font-size: 16px; }
  </style>
</head>
<body>
  <div class="dashboard-header">
    <button class="open-board-btn" onclick="openBoard()">
      Open Board
    </button>
  </div>
  ${groupsHtml}
  <script>
    const vscode = acquireVsCodeApi();
    function openTask(id) { vscode.postMessage({ type: 'openTask', taskId: id }); }
    function openBoard() { vscode.postMessage({ type: 'openBoard' }); }
  </script>
</body>
</html>`;
  }

  private _escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
