import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Board, Task } from '../../core';
import { readBoard } from '../../data';
import { log } from '../../core';

/**
 * Dashboard webview that shows:
 * 1. Onboarding form (if developer name not set)
 * 2. Getting Started view (if board not initialized)
 * 3. Status overview (if fully setup)
 */
export class DashboardViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'devopsStatusBoard';

  private _view?: vscode.WebviewView;
  private _onDidComplete = new vscode.EventEmitter<void>();
  public readonly onDidComplete = this._onDidComplete.event;

  private _isBoardOpen = false;

  constructor(private readonly _extensionUri: vscode.Uri) { }

  public setBoardOpenState(isOpen: boolean): void {
    if (this._isBoardOpen !== isOpen) {
      this._isBoardOpen = isOpen;
      this._updateContent();
    }
  }

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
        const { name, projectType, githubWorkflows } = message;
        await this._saveConfig(name, projectType, githubWorkflows);
        // Skip doesn't initialize board - just saves config
        if (projectType !== 'skip') {
          await vscode.commands.executeCommand('devops.initialize', { projectType, githubWorkflows });
        }
        this._onDidComplete.fire();
        this._updateContent();
      } else if (message.type === 'initBoardLater') {
        // User clicked "Initialize Board" from Getting Started or Preferences
        const projectType = message.projectType;
        await vscode.commands.executeCommand('devops.initialize', { projectType });
        this._onDidComplete.fire();
        this._updateContent();
      } else if (message.type === 'openPreferences') {
        // Show preferences in the current view
        if (this._view) {
          this._view.webview.html = await this._getPreferencesHtml();
        }
      } else if (message.type === 'backToDashboard') {
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
    if (state.needsDeveloperName) {
      this._view.webview.html = this._getOnboardingHtml(state);
    } else if (state.needsBoardInit) {
      this._view.webview.html = this._getGettingStartedHtml();
    } else {
      this._view.webview.html = await this._getDashboardHtml();
    }
  }

  /**
   * Get detailed onboarding state to show adaptive form.
   */
  private async _getOnboardingState(): Promise<{
    needsDeveloperName: boolean;
    needsBoardInit: boolean;
    projectExists: boolean;
    savedName: string | null;
    gitName: string | null;
  }> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return { needsDeveloperName: true, needsBoardInit: true, projectExists: false, savedName: null, gitName: null };
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const devOpsDir = path.join(workspaceRoot, '.dev_ops');
    const configPath = path.join(devOpsDir, 'config.json');
    const boardPath = path.join(devOpsDir, 'board.json');

    // Check if project has existing code (for detecting brownfield)
    const projectExists = this._hasExistingCode(workspaceRoot);

    // Check if board is initialized
    const boardExists = fs.existsSync(boardPath);

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
      needsDeveloperName: !savedName,
      needsBoardInit: !boardExists,
      projectExists,
      savedName,
      gitName
    };
  }

  /**
   * Check if workspace has existing source code (not just config files).
   */
  private _hasExistingCode(workspaceRoot: string): boolean {
    const codeExtensions = ['.ts', '.js', '.py', '.java', '.go', '.rs', '.rb', '.php', '.cs', '.cpp', '.c', '.swift', '.kt'];
    try {
      const files = fs.readdirSync(workspaceRoot);
      for (const file of files) {
        if (file.startsWith('.')) {
          continue;
        }
        const ext = path.extname(file).toLowerCase();
        if (codeExtensions.includes(ext)) {
          return true;
        }
        const fullPath = path.join(workspaceRoot, file);
        if (fs.statSync(fullPath).isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
          // Check one level deep
          try {
            const subfiles = fs.readdirSync(fullPath);
            for (const subfile of subfiles) {
              const subext = path.extname(subfile).toLowerCase();
              if (codeExtensions.includes(subext)) {
                return true;
              }
            }
          } catch { /* Ignore */ }
        }
      }
    } catch { /* Ignore */ }
    return false;
  }

  private async _saveConfig(name: string, projectType: string, githubWorkflows?: boolean): Promise<void> {
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
    config.githubWorkflowsEnabled = githubWorkflows ?? false;

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    log(`Onboarding complete: ${name}, ${projectType}, github_workflows=${githubWorkflows}`);

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

    // If project has existing code, auto-select brownfield but still allow choice
    const projectTypeSection = `
      <div class="form-group">
        <label>How would you like to start?</label>
        <div class="radio-group">
          <label class="radio-option ${!projectExists ? 'selected' : ''}" id="opt-greenfield">
            <input type="radio" name="projectType" value="greenfield" ${!projectExists ? 'checked' : ''}>
            <div class="radio-content">
              <div class="radio-label">🌱 Greenfield</div>
              <div class="radio-desc">New project starting from scratch</div>
            </div>
          </label>
          <label class="radio-option ${projectExists ? 'selected' : ''}" id="opt-brownfield">
            <input type="radio" name="projectType" value="brownfield" ${projectExists ? 'checked' : ''}>
            <div class="radio-content">
              <div class="radio-label">🏗️ Brownfield</div>
              <div class="radio-desc">Existing codebase to understand & improve</div>
            </div>
          </label>
          <label class="radio-option" id="opt-fresh">
            <input type="radio" name="projectType" value="fresh">
            <div class="radio-content">
              <div class="radio-label">📋 Fresh Start</div>
              <div class="radio-desc">Empty board, I know what I'm doing</div>
            </div>
          </label>
          <label class="radio-option" id="opt-skip">
            <input type="radio" name="projectType" value="skip">
            <div class="radio-content">
              <div class="radio-label">⏭️ Skip for Now</div>
              <div class="radio-desc">Just install framework, setup board later</div>
            </div>
          </label>
        </div>
      </div>
      <div class="form-group">
        <label class="checkbox-option">
          <input type="checkbox" id="githubWorkflows" name="githubWorkflows">
          <span class="checkbox-content">
            <span class="checkbox-label">🔄 Enable GitHub Workflows</span>
            <span class="checkbox-desc">Install PR comment collector for feedback loop (recommended)</span>
          </span>
        </label>
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
    .checkbox-option {
      display: flex; align-items: flex-start; padding: 10px;
      border: 1px solid var(--vscode-input-border);
      border-radius: 6px; cursor: pointer;
    }
    .checkbox-option:hover { background: var(--vscode-list-hoverBackground); }
    .checkbox-option input { margin-right: 10px; margin-top: 2px; }
    .checkbox-content { flex: 1; }
    .checkbox-label { font-weight: 500; font-size: 13px; }
    .checkbox-desc { display: block; font-size: 11px; opacity: 0.7; margin-top: 2px; }
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
    
    // Handle radio selection styling
    document.querySelectorAll('.radio-option').forEach(opt => {
      const radio = opt.querySelector('input');
      if (radio.checked) opt.classList.add('selected');
      radio.addEventListener('change', () => {
        document.querySelectorAll('.radio-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
      });
    });
    
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = nameInput.value.trim();
      if (!name) { nameError.textContent = 'Name is required'; return; }
      const projectType = document.querySelector('input[name="projectType"]:checked').value;
      const githubWorkflows = document.getElementById('githubWorkflows').checked;
      vscode.postMessage({ type: 'submit', name, projectType, githubWorkflows });
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
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
      padding: 8px 0 16px 0;
      min-height: 28px;
      border-bottom: 1px solid var(--vscode-panel-border, rgba(255, 255, 255, 0.08));
    }
    .open-board-btn {
      flex: 1;
      padding: 6px 12px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      text-align: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      transition: transform 0.1s ease, box-shadow 0.1s ease, filter 0.1s ease, opacity 0.2s ease;
      font-family: inherit;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      font-size: 11px;
    }
    .open-board-btn.disabled {
      opacity: 0.5;
      cursor: default;
      box-shadow: none;
      filter: grayscale(100%);
      pointer-events: none;
    }
    .open-board-btn:hover {
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.3);
      filter: brightness(1.1);
      transform: translateY(-1px);
    }
    .open-board-btn:active {
      transform: translateY(0);
    }
    .prefs-btn {
      padding: 6px 8px;
      background: none;
      border: 1px solid var(--vscode-input-border);
      border-radius: 6px;
      cursor: pointer;
      color: var(--vscode-foreground);
      font-size: 14px;
      opacity: 0.7;
      transition: opacity 0.1s ease, background 0.1s ease;
    }
    .prefs-btn:hover {
      opacity: 1;
      background: var(--vscode-list-hoverBackground);
    }
  </style>
</head>
<body>
  <div class="dashboard-header">
    <button class="open-board-btn ${this._isBoardOpen ? 'disabled' : ''}" onclick="openBoard()" ${this._isBoardOpen ? 'disabled' : ''}>
      ${this._isBoardOpen ? 'Board Active' : 'Open Board'}
    </button>
    <button class="prefs-btn" onclick="openPrefs()" title="Preferences">⚙️</button>
  </div>
  ${groupsHtml}
  <script>
    const vscode = acquireVsCodeApi();
    function openTask(id) { vscode.postMessage({ type: 'openTask', taskId: id }); }
    function openBoard() { vscode.postMessage({ type: 'openBoard' }); }
    function openPrefs() { vscode.postMessage({ type: 'openPreferences' }); }
  </script>
</body>
</html>`;
  }

  /**
   * Getting Started view for users who skipped board initialization.
   */
  private _getGettingStartedHtml(): string {
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
    .header { text-align: center; margin-bottom: 24px; }
    .header h2 { font-size: 16px; font-weight: 600; margin-bottom: 8px; }
    .header p { font-size: 12px; opacity: 0.8; line-height: 1.5; }
    .info-box {
      display: flex; align-items: flex-start; gap: 10px; padding: 12px;
      background: var(--vscode-textBlockQuote-background);
      border-left: 3px solid var(--vscode-textLink-foreground);
      border-radius: 4px; font-size: 12px; margin-bottom: 16px;
      line-height: 1.5;
    }
    .info-icon { font-size: 16px; flex-shrink: 0; }
    .options { display: flex; flex-direction: column; gap: 8px; }
    .option-btn {
      width: 100%; padding: 12px; font-size: 12px; font-weight: 500;
      border: 1px solid var(--vscode-input-border);
      border-radius: 6px; cursor: pointer;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      text-align: left;
      transition: all 0.1s ease;
    }
    .option-btn:hover {
      background: var(--vscode-list-hoverBackground);
      border-color: var(--vscode-focusBorder);
    }
    .option-title { font-weight: 600; margin-bottom: 4px; }
    .option-desc { font-size: 11px; opacity: 0.7; }
    .divider { text-align: center; margin: 16px 0; font-size: 11px; opacity: 0.5; }
  </style>
</head>
<body>
  <div class="header">
    <h2>📋 Getting Started</h2>
    <p>Framework installed! Choose how to start your board.</p>
  </div>
  <div class="info-box">
    <span class="info-icon">💡</span>
    <span>You can always access this later via the <strong>⚙️ preferences</strong> button.</span>
  </div>
  <div class="options">
    <button class="option-btn" onclick="initBoard('greenfield')">
      <div class="option-title">🌱 Greenfield</div>
      <div class="option-desc">New project starting from scratch</div>
    </button>
    <button class="option-btn" onclick="initBoard('brownfield')">
      <div class="option-title">🏗️ Brownfield</div>
      <div class="option-desc">Existing codebase to understand & improve</div>
    </button>
    <button class="option-btn" onclick="initBoard('fresh')">
      <div class="option-title">📋 Fresh Start</div>
      <div class="option-desc">Empty board, I know what I'm doing</div>
    </button>
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    function initBoard(type) {
      vscode.postMessage({ type: 'initBoardLater', projectType: type });
    }
  </script>
</body>
</html>`;
  }

  /**
   * Preferences view with board initialization and settings.
   */
  private async _getPreferencesHtml(): Promise<string> {
    const state = await this._getOnboardingState();

    const initBoardSection = state.needsBoardInit ? `
      <div class="section">
        <div class="section-title">Board</div>
        <div class="options">
          <button class="option-btn" onclick="initBoard('greenfield')">
            <div class="option-title">🌱 Initialize Greenfield Board</div>
          </button>
          <button class="option-btn" onclick="initBoard('brownfield')">
            <div class="option-title">🏗️ Initialize Brownfield Board</div>
          </button>
          <button class="option-btn" onclick="initBoard('fresh')">
            <div class="option-title">📋 Initialize Empty Board</div>
          </button>
        </div>
      </div>
    ` : `
      <div class="section">
        <div class="section-title">Board</div>
        <div class="info-box">
          <span class="info-icon">✅</span>
          <span>Board initialized</span>
        </div>
      </div>
    `;

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
      padding: 16px;
    }
    .header { 
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 20px; padding-bottom: 12px;
      border-bottom: 1px solid var(--vscode-panel-border, rgba(255, 255, 255, 0.08));
    }
    .header h2 { font-size: 14px; font-weight: 600; }
    .back-btn {
      background: none; border: none; cursor: pointer;
      color: var(--vscode-textLink-foreground);
      font-size: 12px; padding: 4px 8px;
    }
    .back-btn:hover { opacity: 0.8; }
    .section { margin-bottom: 20px; }
    .section-title { font-size: 11px; font-weight: 600; text-transform: uppercase; opacity: 0.6; margin-bottom: 10px; }
    .info-box {
      display: flex; align-items: center; gap: 8px; padding: 10px;
      background: var(--vscode-textBlockQuote-background);
      border-radius: 4px; font-size: 12px;
    }
    .info-icon { font-size: 14px; }
    .options { display: flex; flex-direction: column; gap: 6px; }
    .option-btn {
      width: 100%; padding: 10px; font-size: 12px;
      border: 1px solid var(--vscode-input-border);
      border-radius: 6px; cursor: pointer;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      text-align: left;
    }
    .option-btn:hover { background: var(--vscode-list-hoverBackground); border-color: var(--vscode-focusBorder); }
    .option-title { font-weight: 500; }
  </style>
</head>
<body>
  <div class="header">
    <h2>⚙️ Preferences</h2>
    <button class="back-btn" onclick="goBack()">← Back</button>
  </div>
  ${initBoardSection}
  <script>
    const vscode = acquireVsCodeApi();
    function goBack() { vscode.postMessage({ type: 'backToDashboard' }); }
    function initBoard(type) { vscode.postMessage({ type: 'initBoardLater', projectType: type }); }
  </script>
</body>
</html>`;
  }

  private _escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

