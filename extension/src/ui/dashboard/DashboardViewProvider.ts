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
  private _groupingMode: 'status' | 'phase' | 'priority' | 'owner' = 'phase';
  private _bootstrapDismissed = false;

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
        const { name, projectType, githubWorkflows, selectedIDEs } = message;
        await this._saveConfig(name, projectType, githubWorkflows, selectedIDEs);
        // Skip doesn't initialize board - just saves config
        if (projectType !== 'skip') {
          await vscode.commands.executeCommand('devops.initialize', { projectType, githubWorkflows, selectedIDEs });
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
      } else if (message.type === 'restartSetup') {
        vscode.commands.executeCommand('devops.onboard');
      } else if (message.type === 'checkBootstrap') {
        this._bootstrapDismissed = true; // Allow user to proceed even if check fails
        this._updateContent();
        vscode.commands.executeCommand('devops.openBoard');
      } else if (message.type === 'runBootstrap') {
        vscode.commands.executeCommand('devops.bootstrap');
      } else if (message.type === 'setGrouping') {
        this._groupingMode = message.mode;
        this._updateContent();
      }
    });
  }



  private _getBoardIconUri(): vscode.Uri | string {
    const uri = this._extensionUri.with({ path: this._extensionUri.path + '/resources/devops-logo.svg' });
    return this._view ? this._view.webview.asWebviewUri(uri) : uri;
  }

  private _getArrowRightUri(): vscode.Uri | string {
    const uri = this._extensionUri.with({ path: this._extensionUri.path + '/resources/arrow-right.svg' });
    return this._view ? this._view.webview.asWebviewUri(uri) : uri;
  }

  private _getArrowDownUri(): vscode.Uri | string {
    const uri = this._extensionUri.with({ path: this._extensionUri.path + '/resources/arrow-down.svg' });
    return this._view ? this._view.webview.asWebviewUri(uri) : uri;
  }

  private _getArrowRightSmUri(): vscode.Uri | string {
    const uri = this._extensionUri.with({ path: this._extensionUri.path + '/resources/arrow-right-sm.svg' });
    return this._view ? this._view.webview.asWebviewUri(uri) : uri;
  }

  private _getArrowDownSmUri(): vscode.Uri | string {
    const uri = this._extensionUri.with({ path: this._extensionUri.path + '/resources/arrow-down-sm.svg' });
    return this._view ? this._view.webview.asWebviewUri(uri) : uri;
  }

  private _getLogoUri(): vscode.Uri | string {
    const uri = this._extensionUri.with({ path: this._extensionUri.path + '/resources/devops-logo.svg' });
    return this._view ? this._view.webview.asWebviewUri(uri) : uri;
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
      this._view.webview.html = this._getSetupInProgressHtml();
    } else if (state.needsBoardInit) {
      this._view.webview.html = this._getGettingStartedHtml();
    } else if (state.needsBootstrap) {
      this._view.webview.html = this._getBootstrapRequiredHtml();
    } else {
      this._view.webview.html = await this._getDashboardHtml();
    }
  }

  /**
   * Get detailed onboarding state to show adaptive form.
   */
  private async _getOnboardingState(): Promise<{ needsDeveloperName: boolean, needsBoardInit: boolean, needsBootstrap: boolean }> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return { needsDeveloperName: true, needsBoardInit: true, needsBootstrap: false };
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

    // Detect current IDE
    let detectedIDE: 'antigravity' | 'cursor' | 'vscode' = 'vscode';
    const appName = vscode.env.appName;
    if (appName.includes('Cursor')) {
      detectedIDE = 'cursor';
    } else if (vscode.extensions.getExtension('google.antigravity')) {
      detectedIDE = 'antigravity';
    }

    // Check if needs bootstrap (board empty and not fresh start)
    // Only verify strictly if not dismissed by user
    let needsBootstrap = false;
    let isFresh = false;

    if (fs.existsSync(configPath)) {
      try {

        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        if (config.projectType === 'fresh' || config.projectType === 'skip') {
          isFresh = true;
        }
      } catch { /* Ignore */ }
    }

    if (boardExists && !isFresh && !this._bootstrapDismissed) {
      try {
        const boardContent = fs.readFileSync(boardPath, 'utf-8');
        const board = JSON.parse(boardContent);
        if (board.items && board.items.length === 0) {
          needsBootstrap = true;
        }
      } catch { /* ignore */ }
    }

    return {
      needsDeveloperName: !savedName,
      needsBoardInit: !boardExists,
      needsBootstrap
    };
  }

  private _getBootstrapRequiredHtml(): string {
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
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      text-align: center;
    }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h2 { font-size: 16px; font-weight: 600; margin-bottom: 8px; }
    p { font-size: 13px; opacity: 0.8; margin-bottom: 24px; line-height: 1.4; }
    button {
      padding: 8px 16px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-family: var(--vscode-font-family);
      font-size: 13px;
    }
    button:hover { opacity: 0.9; }
    .code {
        font-family: var(--vscode-editor-font-family);
        background: var(--vscode-textCodeBlock-background);
        padding: 2px 4px;
        border-radius: 3px;
        font-size: 0.9em;
    }
  </style>
</head>
<body>
  <div class="icon"><img src="${this._getLogoUri()}" alt="DevOps Logo" style="width: 64px; height: 64px;"></div>
  <h2>Bootstrap Required</h2>
  <p>Your project environment is ready.<br>Please open the AI Chat and run <span class="code">/bootstrap</span> to generate your task backlog and rules.</p>
  <button onclick="checkBootstrap()">Continue</button>
  <script>
    const vscode = acquireVsCodeApi();
    function checkBootstrap() {
      vscode.postMessage({ type: 'checkBootstrap' });
    }
  </script>
</body>
</html>`;
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

  private async _saveConfig(name: string, projectType: string, githubWorkflows?: boolean, selectedIDEs?: string[]): Promise<void> {
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
    config.selectedIDEs = selectedIDEs ?? ['antigravity'];

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    log(`Onboarding complete: ${name}, ${projectType}, github_workflows=${githubWorkflows}, ides=${selectedIDEs?.join(',')}`);

    vscode.window.showInformationMessage(
      `✅ Welcome, ${name}! Your DevOps workspace is ready.`
    );
  }

  private _getSetupInProgressHtml(): string {
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
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      text-align: center;
    }
    .icon { font-size: 48px; margin-bottom: 16px; animation: pulse 2s infinite; }
    h2 { font-size: 16px; font-weight: 600; margin-bottom: 8px; }
    p { font-size: 13px; opacity: 0.8; margin-bottom: 24px; }
    @keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
    button {
      padding: 8px 16px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    button:hover { opacity: 0.9; }
  </style>
</head>
<body>
  <div class="icon">🚀</div>
  <h2>Setting up DevOps...</h2>
  <p>Please follow the prompts in the main window to configure your workspace.</p>
  <button onclick="restartSetup()">Restart Setup</button>
  <script>
    const vscode = acquireVsCodeApi();
    function restartSetup() {
      vscode.postMessage({ type: 'restartSetup' });
    }
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
    let groups: { id: string; label: string; color: string; tasks: Task[] }[] = [];

    if (this._groupingMode === 'phase' && board) {
      // Group by Board Columns
      groups = board.columns.map(col => ({
        id: col.id,
        label: col.name,
        color: 'var(--vscode-foreground)', // Neutral color for phase headers
        tasks: tasks.filter(t => t.columnId === col.id)
      }));
    } else if (this._groupingMode === 'priority') {
      // Group by Priority
      groups = [
        { id: 'high', label: 'High Priority', color: 'var(--vscode-foreground)', tasks: tasks.filter(t => t.priority === 'high') },
        { id: 'medium', label: 'Medium Priority', color: 'var(--vscode-foreground)', tasks: tasks.filter(t => t.priority === 'medium') },
        { id: 'low', label: 'Low Priority', color: 'var(--vscode-foreground)', tasks: tasks.filter(t => t.priority === 'low') },
        { id: 'none', label: 'No Priority', color: 'var(--vscode-descriptionForeground)', tasks: tasks.filter(t => !t.priority) }
      ];
    } else if (this._groupingMode === 'owner') {
      // Group by Human Owner only
      const humans = new Map<string, Task[]>();

      tasks.forEach(t => {
        let ownerName = 'Unassigned';

        if (t.owner) {
          if (t.owner.type === 'human') {
            ownerName = t.owner.name;
          } else if (t.owner.type === 'agent' && t.owner.developer) {
            // Agent working on behalf of a developer
            ownerName = t.owner.developer;
          } else {
            // Autonomous agent fallback
            ownerName = 'Autonomous';
          }
        } else if (t.assignee) {
          ownerName = t.assignee;
        }

        if (!humans.has(ownerName)) { humans.set(ownerName, []); }
        humans.get(ownerName)?.push(t);
      });

      groups = Array.from(humans.entries()).map(([name, humanTasks]) => ({
        id: name.toLowerCase().replace(/\s+/g, '-'),
        label: name,
        color: 'var(--vscode-foreground)', // Neutral color for owner headers
        tasks: humanTasks
      })).sort((a, b) => a.label.localeCompare(b.label));
    } else {
      // Default: Group by Status (Neutral headers, task borders have color)
      groups = [
        { id: 'blocked', label: 'Blocked', color: 'var(--vscode-foreground)', tasks: tasks.filter(t => t.status === 'blocked') },
        { id: 'feedback', label: 'Needs Feedback', color: 'var(--vscode-foreground)', tasks: tasks.filter(t => t.status === 'needs_feedback') },
        { id: 'in_progress', label: 'In Progress', color: 'var(--vscode-foreground)', tasks: tasks.filter(t => t.status === 'in_progress' || t.status === 'agent_active') },
        { id: 'ready', label: 'Ready', color: 'var(--vscode-foreground)', tasks: tasks.filter(t => t.status === 'ready') },
        { id: 'done', label: 'Done', color: 'var(--vscode-foreground)', tasks: tasks.filter(t => t.status === 'done') },
      ];
    }

    const groupsHtml = groups.map(g => `
      <details class="group" open>
        <summary class="group-summary">
          <span class="group-name" style="color:${g.color}">${g.label}</span>
          <span class="count">${g.tasks.length}</span>
        </summary>
        ${g.tasks.map(t => `
          <div class="task" onclick="openTask('${t.id}')" data-status="${t.status || 'ready'}">
            <span class="task-title">${this._escapeHtml(t.title)}</span>
          </div>
        `).join('')}
      </details>
    `).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; outline: none; }
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      padding: 12px;
    }
    .group { margin-bottom: 4px; } /* Reduced spacing between sections */
    .group-summary {
      list-style: none;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px;
      cursor: pointer;
      user-select: none;
      opacity: 0.85;
      transition: opacity 0.2s;
    }
    .group-summary:hover { opacity: 1; background: var(--vscode-list-hoverBackground); }
    /* Use VS Code native details marker (chevron) */
    .group-summary { list-style: disclosure-closed inside; }
    details[open] > .group-summary { list-style: disclosure-open inside; }
    .count { 
      font-size: 10px; 
      opacity: 0.5; 
      margin-left: auto;
    }
    details { margin-bottom: 4px; } /* Reduced spacing */
    .task {
      padding: 8px 10px; margin-left: 12px; margin-bottom: 6px;
      background: var(--vscode-editor-background, rgba(255, 255, 255, 0.04));
      border: 1px solid var(--vscode-input-border, rgba(255, 255, 255, 0.08));
      border-radius: 6px; cursor: pointer; font-size: 12px;
      border-left: 2px solid #6b7280;
      transition: transform 0.1s ease, border-color 0.1s ease, box-shadow 0.1s ease;
    }
    .task:hover {
      background: var(--vscode-list-hoverBackground);
      transform: translateX(2px);
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    .task[data-status="ready"] { border-left-color: #3b82f6; }
    .task[data-status="agent_active"] { border-left-color: #22c55e; } /* Kept for status mapping, displays as In Progress */
    .task[data-status="in_progress"] { border-left-color: #22c55e; }
    .task[data-status="needs_feedback"] { border-left-color: #f97316; }
    .task[data-status="blocked"] { border-left-color: #ef4444; }
    .task[data-status="done"] { border-left-color: #6b7280; }
    
      /* Header Styles */
      .dashboard-header {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        gap: 8px;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--vscode-panel-border, rgba(255, 255, 255, 0.08));
      }

      /* Custom dropdown - fully styled */
      .custom-dropdown {
        position: relative;
        display: inline-block;
      }
      .dropdown-trigger {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        background: transparent;
        color: var(--vscode-focusBorder);
        border: none;
        font-family: inherit;
        font-size: 11px;
        font-weight: 500;
        cursor: pointer;
        border-radius: 4px;
        transition: all 0.1s ease;
      }
      .dropdown-trigger:hover {
        background: var(--vscode-list-hoverBackground);
      }
      .dropdown-trigger::after {
        content: '';
        border: 4px solid transparent;
        border-top-color: currentColor;
        margin-left: 2px;
        margin-top: 2px;
      }
      .dropdown-menu {
        display: none;
        position: absolute;
        top: 100%;
        left: 0;
        min-width: 100px;
        background: var(--vscode-dropdown-background);
        border: 1px solid var(--vscode-dropdown-border);
        border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 1000;
        margin-top: 2px;
        overflow: hidden;
      }
      .custom-dropdown.open .dropdown-menu {
        display: block;
      }
      .dropdown-item {
        display: block;
        width: 100%;
        padding: 6px 12px;
        background: transparent;
        color: var(--vscode-dropdown-foreground);
        border: none;
        font-family: inherit;
        font-size: 11px;
        text-align: left;
        cursor: pointer;
        transition: background 0.1s ease;
      }
      .dropdown-item:hover {
        background: var(--vscode-list-hoverBackground);
      }
      .dropdown-item.active {
        color: var(--vscode-focusBorder);
        font-weight: 500;
      }

      
      /* Icon Buttons - use VS Code standard hover */
      .icon-btn {
        width: 22px;
        height: 22px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: none;
        color: var(--vscode-foreground);
        cursor: pointer;
        transition: all 0.1s ease;
        padding: 2px;
        opacity: 0.7;
        border-radius: 4px;
      }
      .icon-btn:hover {
        opacity: 1;
        background: var(--vscode-list-hoverBackground);
      }
      .icon-btn svg {
        width: 14px;
        height: 14px;
        fill: none;
        stroke: currentColor;
        stroke-width: 2;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      /* Group Headers with VS Code native chevrons */
      .group-summary {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 0;
        cursor: pointer;
        user-select: none;
        opacity: 0.9;
        transition: opacity 0.2s, background 0.1s;
        border-radius: 3px;
        padding-left: 2px;
        margin-left: -2px;
      }
      .group-summary:hover { 
        opacity: 1; 
        background: var(--vscode-list-hoverBackground);
      }
      /* Hide default marker, use custom chevron */
      .group-summary::-webkit-details-marker { display: none; }
      .group-summary::before {
        content: '';
        display: inline-block;
        width: 16px;
        height: 16px;
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='%23c5c5c5' d='M6 4v8l4-4-4-4z'/%3E%3C/svg%3E");
        background-size: 16px 16px;
        background-repeat: no-repeat;
        flex-shrink: 0;
        transition: transform 0.1s ease;
      }
      details[open] > .group-summary::before {
        transform: rotate(90deg);
      }
      
      .group-name { 
        font-weight: 600; 
        font-size: 10px; 
        text-transform: uppercase; 
        letter-spacing: 0.05em; 
        color: var(--vscode-foreground);
      }
    </style>
</head>
<body>
  <div class="dashboard-header">
    <div class="custom-dropdown" id="groupingDropdown">
      <button class="dropdown-trigger" id="dropdownTrigger">${this._groupingMode.charAt(0).toUpperCase() + this._groupingMode.slice(1)}</button>
      <div class="dropdown-menu">
        <button class="dropdown-item ${this._groupingMode === 'status' ? 'active' : ''}" data-value="status">Status</button>
        <button class="dropdown-item ${this._groupingMode === 'phase' ? 'active' : ''}" data-value="phase">Phase</button>
        <button class="dropdown-item ${this._groupingMode === 'priority' ? 'active' : ''}" data-value="priority">Priority</button>
        <button class="dropdown-item ${this._groupingMode === 'owner' ? 'active' : ''}" data-value="owner">Owner</button>
      </div>
    </div>

    <div style="flex: 1"></div>
    
    <button class="icon-btn" onclick="openBoard()" title="${this._isBoardOpen ? 'Board Active' : 'Open Board'}">
      <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="3" width="7" height="7" rx="1"></rect><rect x="14" y="14" width="7" height="7" rx="1"></rect><rect x="3" y="14" width="7" height="7" rx="1"></rect></svg>
    </button>
    <button class="icon-btn" onclick="openPrefs()" title="Preferences">
      <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
    </button>
  </div>
  ${groupsHtml}
  <script>
    const vscode = acquireVsCodeApi();
    
    // Custom dropdown logic
    const dropdown = document.getElementById('groupingDropdown');
    const trigger = document.getElementById('dropdownTrigger');
    const items = dropdown.querySelectorAll('.dropdown-item');
    
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('open');
    });
    
    items.forEach(item => {
      item.addEventListener('click', () => {
        const value = item.dataset.value;
        trigger.textContent = item.textContent;
        dropdown.classList.remove('open');
        vscode.postMessage({ type: 'setGrouping', mode: value });
      });
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', () => {
      dropdown.classList.remove('open');
    });
    
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
        <div class="section-title">Initialize Board</div>
        <div class="options">
          <button class="option-btn" onclick="initBoard('greenfield')">
            <span class="option-icon">🌱</span>
            <div class="option-content">
              <div class="option-title">Greenfield Project</div>
              <div class="option-desc">Start fresh with a standard DevOps board structure</div>
            </div>
          </button>
          <button class="option-btn" onclick="initBoard('brownfield')">
            <span class="option-icon">🏗️</span>
            <div class="option-content">
              <div class="option-title">Brownfield Project</div>
              <div class="option-desc">Analyze existing codebase and create tasks</div>
            </div>
          </button>
        </div>
      </div>
    ` : `
      <div class="section">
        <div class="section-title">Status</div>
        <div class="info-box success">
          <span class="info-icon">✅</span>
          <span>Board is active and initialized.</span>
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
    /* Neutral/Clean Header */
    .header { 
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 24px; padding-bottom: 12px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }
    .header h2 { 
      font-size: 13px; font-weight: 600; 
      text-transform: uppercase; letter-spacing: 0.05em;
      color: var(--vscode-foreground);
    }
    .back-btn {
      background: none; border: none; cursor: pointer;
      color: var(--vscode-descriptionForeground);
      font-size: 11px; padding: 4px 8px;
      display: flex; align-items: center; gap: 4px;
    }
    .back-btn:hover { color: var(--vscode-foreground); }
    
    .section { margin-bottom: 24px; }
    .section-title { 
      font-size: 11px; font-weight: 600; 
      text-transform: uppercase; letter-spacing: 0.05em;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 12px;
    }
    
    /* Option Buttons (Cards) */
    .options { display: flex; flex-direction: column; gap: 8px; }
    .option-btn {
      width: 100%; padding: 12px;
      border: 1px solid var(--vscode-input-border);
      background: var(--vscode-editor-background);
      color: var(--vscode-foreground);
      border-radius: 6px; cursor: pointer;
      display: flex; align-items: flex-start; gap: 10px;
      text-align: left;
      transition: all 0.1s ease;
    }
    .option-btn:hover {
      background: var(--vscode-list-hoverBackground);
      border-color: var(--vscode-focusBorder);
    }
    .option-icon { font-size: 16px; line-height: 1.2; }
    .option-content { flex: 1; }
    .option-title { font-weight: 600; font-size: 12px; margin-bottom: 2px; }
    .option-desc { font-size: 11px; color: var(--vscode-descriptionForeground); line-height: 1.3; }

    /* Settings Toggles (Mockup) */
    .setting-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid var(--vscode-panel-border);
    }
    .setting-label { font-size: 12px; }
    .toggle {
      width: 32px; height: 18px;
      background: var(--vscode-input-background);
      border: 1px solid var(--vscode-input-border);
      border-radius: 9px; position: relative;
      cursor: not-allowed; opacity: 0.7;
    }
    .toggle::after {
      content: ''; position: absolute; top: 2px; left: 2px;
      width: 12px; height: 12px; border-radius: 50%;
      background: var(--vscode-foreground);
    }
    .toggle.checked { background: #5b72e8; border-color: #5b72e8; }
    .toggle.checked::after { left: 16px; background: #fff; }

    .info-box {
      display: flex; align-items: flex-start; gap: 8px; padding: 10px;
      background: var(--vscode-editor-inactiveSelectionBackground);
      border-radius: 4px; font-size: 11px; line-height: 1.4;
      color: var(--vscode-descriptionForeground);
    }
    .info-box.success { border-left: 2px solid #22c55e; }
  </style>
</head>
<body>
  <div class="header">
    <h2>Preferences</h2>
    <button class="back-btn" onclick="goBack()">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
      Back
    </button>
  </div>

  ${initBoardSection}

  <div class="section">
    <div class="section-title">General Settings</div>
    <div class="setting-row">
      <span class="setting-label">Auto-open Board on Startup</span>
      <div class="toggle checked" title="Managed by extension settings"></div>
    </div>
    <div class="setting-row">
      <span class="setting-label">Show Task Notifications</span>
      <div class="toggle checked" title="Managed by extension settings"></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">About</div>
    <div class="info-box">
      <span>DevOps Framework v0.0.2<br>By NunoMoura</span>
    </div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    function goBack() { vscode.postMessage({ type: 'backToDashboard' }); }
    function initBoard(type) { vscode.postMessage({ type: 'initBoardLater', projectType: type }); }
  </script>
</body>
</html>`;
  }



  private _getStringColor(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
  }

  private _escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}

