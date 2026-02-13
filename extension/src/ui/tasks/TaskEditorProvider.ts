import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { readBoard, writeBoard, getBoardPath } from '../../services/board/boardPersistence';
import { boardService } from '../../services/board/boardService';
import { Task, ChecklistItem, COLUMN_FALLBACK_NAME, TaskStatus, ChatMessage } from '../../types';
import { getFontLink, getSharedStyles, getCSPMeta } from '../shared/styles';
import { handleCardUpdateMessage, handleCardDeleteMessage } from '../../vscode/commands/sharedHandlers';
import { BoardTreeProvider } from '../board';
import { formatError } from '../../infrastructure/errors';

/**
 * Content provider for devops-task:// URIs.
 */
class TaskDocumentContentProvider implements vscode.TextDocumentContentProvider {
  public static readonly scheme = 'devops-task';
  private _onDidChange = new vscode.EventEmitter<vscode.Uri>();
  readonly onDidChange = this._onDidChange.event;

  public update(uri: vscode.Uri) {
    this._onDidChange.fire(uri);
  }

  async provideTextDocumentContent(uri: vscode.Uri): Promise<string> {
    const taskId = uri.path.replace('/task/', '').replace('.devops-task', '');
    try {
      const board = await readBoard();
      const task = board.items.find(t => t.id === taskId);
      if (task) { return JSON.stringify(task, null, 2); }
    } catch { }
    return JSON.stringify({ id: taskId, error: 'Task not found' });
  }
}

export class TaskEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = 'devops.taskEditor';
  private static instance: TaskEditorProvider | undefined;

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new TaskEditorProvider(context);
    TaskEditorProvider.instance = provider;
    const contentProvider = new TaskDocumentContentProvider();

    return vscode.Disposable.from(
      vscode.workspace.registerTextDocumentContentProvider(TaskDocumentContentProvider.scheme, contentProvider),
      vscode.window.registerCustomEditorProvider(TaskEditorProvider.viewType, provider, {
        webviewOptions: { retainContextWhenHidden: true },
        supportsMultipleEditorsPerDocument: false,
      })
    );
  }

  constructor(private readonly context: vscode.ExtensionContext) { }

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    webviewPanel.webview.options = { enableScripts: true };
    console.log('DevOps Task Editor loaded');
    const taskId = this.getTaskIdFromUri(document.uri);
    // Get the provider from global instance or context if possible
    // For now, we assume provideTextDocumentContent already handles the read
    const board = await readBoard();
    const provider = new BoardTreeProvider(() => Promise.resolve(board)); // Mock or real provider

    const updateWebview = async () => {
      const task = await this.loadTask(taskId);
      if (!task) {
        webviewPanel.webview.html = this.getErrorHtml(`Task ${taskId} not found`);
        return;
      }
      const board = await readBoard();
      const traceContent = await this.readTraceFile(taskId);
      webviewPanel.webview.html = this.getEditorHtml(task, board.columns, traceContent, webviewPanel.webview);
    };

    // Initial render
    await updateWebview();

    // Watch for trace file changes
    const tracePath = await this.getTraceFilePath(taskId);
    if (tracePath) {
      const watcher = vscode.workspace.createFileSystemWatcher(tracePath);
      const changeListener = watcher.onDidChange(() => updateWebview());
      webviewPanel.onDidDispose(() => {
        changeListener.dispose();
        watcher.dispose();
      });
    }

    // Handle messages
    webviewPanel.webview.onDidReceiveMessage(async (message) => {
      // Create a dummy provider or use a real one if accessible
      const currentBoard = await readBoard();
      const tempProvider = new BoardTreeProvider(() => Promise.resolve(currentBoard));
      const syncFilterUI = () => {
        void vscode.commands.executeCommand('setContext', 'devopsFilterActive', tempProvider.hasFilter());
      };

      switch (message.type) {
        case 'update':
          await handleCardUpdateMessage({ id: taskId, ...message.data }, tempProvider, syncFilterUI);
          break;
        case 'save':
          await handleCardUpdateMessage({ id: taskId, ...message.data }, tempProvider, syncFilterUI);
          vscode.window.showInformationMessage(`✅ Saved task ${taskId}`);
          await updateWebview();
          vscode.commands.executeCommand('devops.refreshBoard');
          break;
        case 'delete':
          // Prompt for Archive vs Delete
          const selection = await vscode.window.showInformationMessage(
            "Do you want to Archive this task (keep record) or Delete it permanently?",
            { modal: true },
            "Archive",
            "Delete"
          );

          if (selection === "Archive") {
            await boardService.archiveTask(taskId);
            vscode.window.showInformationMessage(`Task ${taskId} archived.`);
            webviewPanel.dispose();
          } else if (selection === "Delete") {
            await handleCardDeleteMessage(taskId, tempProvider, syncFilterUI);
            // Check if task still exists
            const boardAfter = await readBoard();
            if (!boardAfter.items.find(t => t.id === taskId)) {
              webviewPanel.dispose();
            }
          }
          break;
        case 'approvePlan':
          // 1. Move to Implement
          await boardService.moveTask(taskId, 'col-implement');

          // 2. Start Agent Session
          // await vscode.commands.executeCommand('devops.startAgentSession', undefined, { taskId, phase: 'Implement' });
          // Actually, let's just show a message or let the user know, because startAgentSession might be async or complex here.
          // Better: We trigger the command.
          vscode.commands.executeCommand('devops.startAgentSession', undefined, { taskId, phase: 'Implement' });

          vscode.window.showInformationMessage(`Plan Approved. Task ${taskId} moved to Implement phase.`);
          await updateWebview();
          vscode.commands.executeCommand('devops.refreshBoard');
          break;
        case 'chat':
          /* Data: { text: string, sender: 'user' | 'agent' } */
          const chatMsg = message; // { type: 'chat', text: ..., sender: ... }
          if (chatMsg.text) {
            const task = await this.loadTask(taskId);
            if (task) {
              const newMsg = {
                id: Date.now().toString(),
                sender: chatMsg.sender || 'user',
                text: chatMsg.text,
                timestamp: Date.now()
              };
              // Append to history
              const history = task.chatHistory || [];
              history.push(newMsg);

              // Update task via boardService
              await boardService.updateTask(taskId, { chatHistory: history });

              // Refresh view (so the user sees it persisted if they reload, though UI updated hopefully)
              // Actually, we don't need to full refresh relevant to chat as we did optimistic UI. 
              // But we should ensuring board refresh
            }
          }
          break;
      }
    });
  }

  private getTaskIdFromUri(uri: vscode.Uri): string {
    return uri.path.replace('/task/', '').replace('.devops-task', '');
  }

  private async loadTask(taskId: string): Promise<Task | undefined> {
    const board = await readBoard();
    return board.items.find(t => t.id === taskId);
  }

  private async getTraceFilePath(taskId: string): Promise<string | undefined> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) { return undefined; }
    // Assuming single root for now or first root containing .dev_ops
    const root = workspaceFolders[0].uri.fsPath; // Simplification, robust logic is in boardStore
    return path.join(root, '.dev_ops', 'tasks', taskId, 'trace.md');
  }

  private async readTraceFile(taskId: string): Promise<string> {
    const tracePath = await this.getTraceFilePath(taskId);
    if (tracePath && fs.existsSync(tracePath)) {
      return fs.readFileSync(tracePath, 'utf8');
    }
    return '';
  }

  // These are now handled by sharedHandlers

  private getErrorHtml(message: string): string {
    return `<html><body><h2 style="color:red">${message}</h2></body></html>`;
  }

  private getEditorHtml(task: Task, columns: Array<{ id: string; name: string }>, traceMarkdown: string, webview: vscode.Webview): string {
    // Simple Markdown parsing for Trace
    const parsedTrace = this.parseTraceMarkdown(traceMarkdown);

    // Get status color for accent
    const statusColors: Record<string, string> = {
      todo: '#6b7280', // Gray
      in_progress: '#22c55e', // Green
      ready: '#3b82f6', // Blue
      needs_feedback: '#eab308', // Yellow
      blocked: '#ef4444', // Red
      done: '#3b82f6', // Blue
      archived: '#6b7280'
    };

    const currentStatus = task.status || 'todo';
    const activeStatusColor = statusColors[currentStatus] || '#6b7280';
    const cssStatusColor = activeStatusColor;

    // Status Options
    const statusOptions = [
      { value: 'todo', label: 'Todo', color: statusColors['todo'] },
      { value: 'in_progress', label: 'In Progress', color: statusColors['in_progress'] },
      { value: 'needs_feedback', label: 'Needs Feedback', color: statusColors['needs_feedback'] },
      { value: 'blocked', label: 'Blocked', color: statusColors['blocked'] },
      { value: 'done', label: 'Done', color: statusColors['done'] }
    ];

    // Status Chips HTML Generator
    const getStatusChips = () => {
      return statusOptions.map(opt => {
        const isSelected = opt.value === currentStatus;
        // Styles are handled by CSS class 'status-chip' and 'active'
        const activeClass = isSelected ? 'active' : '';
        // Inject color var for active state if needed, but sticky css is better

        return `<div class="status-chip ${activeClass}" 
                     data-value="${opt.value}" 
                     data-color="${opt.color}">
                  ${opt.label}
                </div>`;
      }).join('');
    };

    // Metadata Values
    const ownerName = task.owner || 'Unassigned';
    const agentName = task.activeSession?.agent || 'None';
    const modelName = task.activeSession?.model || 'None';

    // Page-specific styles
    const pageStyles = `<style>
      /* Page-specific overrides */
      :root {
        --chat-bg: var(--vscode-editor-background);
        --chat-bubble-user: var(--vscode-button-secondaryBackground);
        --chat-bubble-user-fg: var(--vscode-button-secondaryForeground);
        --chat-bubble-agent: var(--vscode-editor-inactiveSelectionBackground);
        --chat-bubble-agent-fg: var(--vscode-editor-foreground);
      }

      body {
        padding: 0; 
        margin: 0;
        font-family: var(--vscode-font-family);
        background-color: var(--vscode-editor-background);
        color: var(--vscode-editor-foreground);
        height: 100vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      /* Custom Scrollbar */
      ::-webkit-scrollbar {
        width: 10px;
        background: transparent;
      }
      ::-webkit-scrollbar-thumb {
        background: var(--vscode-scrollbarSlider-background);
        border-radius: 5px;
        border: 2px solid var(--vscode-editor-background);
      }
      ::-webkit-scrollbar-thumb:hover {
        background: var(--vscode-scrollbarSlider-hoverBackground);
      }
      ::-webkit-scrollbar-thumb:active {
        background: var(--vscode-scrollbarSlider-activeBackground);
      }

      /* Layout Containers */
      .main-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        max-width: 900px;
        margin: 0 auto;
        width: 100%;
        position: relative;
      }

      .scrollable-content {
        flex: 1;
        overflow-y: auto;
        padding: 24px 32px;
        padding-bottom: 0; /* Space is handled by chat container top padding/margin */
      }

      .fixed-chat-area {
        flex-shrink: 0;
        background: var(--vscode-editor-background);
        border-top: 1px solid var(--vscode-widget-border);
        display: flex;
        flex-direction: column;
        max-height: 40vh; /* Don't take more than 40% of screen */
      }

      /* Header Card */
      .header-card {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-bottom: 24px;
        padding-left: 12px;
        border-left: 3px solid ${cssStatusColor};
        border-radius: 6px;
      }

      .metadata-row {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 11px;
        color: var(--vscode-descriptionForeground);
        opacity: 0.8;
      }
      .metadata-item {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .metadata-dot {
        width: 3px;
        height: 3px;
        background: currentColor;
        border-radius: 50%;
        opacity: 0.5;
      }

      .header-top-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }

      /* Seamless Title Input */
      input.title-input {
        flex: 1;
        width: 100%;
        background: transparent !important;
        border: none !important;
        outline: none !important;
        padding: 0 !important;
        margin: 0 !important;
        box-shadow: none !important;
        font-size: 18px;
        font-weight: 600;
        color: var(--vscode-editor-foreground);
        line-height: 1.4;
      }
      input.title-input:focus { opacity: 1; }
      input.title-input::placeholder { color: var(--vscode-editor-foreground); opacity: 0.4; }

      .task-id-badge {
        font-size: 12px;
        font-weight: 500;
        color: ${cssStatusColor};
        border: 1px solid ${cssStatusColor} !important;
        padding: 1px 7px;
        border-radius: 10px;
        white-space: nowrap;
      }

      /* Status Chips */
      .status-chips-container {
        display: flex;
        gap: 12px;
        align-items: center;
        flex-wrap: wrap;
        margin-bottom: 24px;
      }
      .status-chip {
        cursor: pointer;
        padding: 4px 10px;
        font-size: 11px;
        border-radius: 12px;
        border: 1px solid transparent;
        background: var(--vscode-badge-background);
        color: var(--vscode-badge-foreground);
        opacity: 0.7;
        transition: all 0.2s ease;
      }
      .status-chip.active {
        opacity: 1;
        font-weight: 600;
        background: ${cssStatusColor};
        color: #fff; /* Assuming dark mode usually, or we can use contrast color */
      }
      .status-chip:hover { opacity: 1; }

      /* Instructions / Checklist */
      .section-header {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        font-weight: 600;
        color: var(--vscode-descriptionForeground);
        margin-bottom: 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .checklist-container {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .checklist-item {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 4px 6px;
        border-radius: 4px;
        transition: background 0.1s;
      }
      .checklist-item:hover {
        background: var(--vscode-toolbar-hoverBackground);
      }
      .checklist-checkbox {
        margin-top: 3px;
        cursor: pointer;
      }
      .checklist-text {
        font-size: 13px;
        line-height: 1.5;
        flex: 1;
        outline: none;
        border: 1px solid transparent;
      }
      .checklist-text:focus {
        border-color: var(--vscode-focusBorder);
        background: var(--vscode-input-background);
      }
      .checklist-text.done {
        text-decoration: line-through;
        opacity: 0.6;
      }

      .raw-instructions-container {
        display: none; /* Toggled */
        margin-top: 8px;
      }
      textarea.instructions-input {
        width: 100%;
        min-height: 150px;
        background: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        border: 1px solid var(--vscode-widget-border);
        padding: 8px;
        font-family: var(--vscode-editor-font-family);
        font-size: 13px;
        resize: vertical;
      }

      /* Chat Area */
      .chat-history {
        flex: 1;
        overflow-y: auto;
        padding: 16px 32px;
        display: flex;
        flex-direction: column;
        justify-content: flex-end; /* Bubbles start from bottom? No, they stack up. But if empty, start top. */
        /* Actually "growing up" means align-items flex-end? No.
           It means the latest message is at the bottom. Standard chat behavior.
           But visually sticking to the bottom. */
        min-height: 100px; /* Force some height */
      }
      
      .chat-message {
        display: flex;
        flex-direction: column;
        margin-bottom: 12px;
        max-width: 85%;
      }
      .chat-message.user {
        align-self: flex-end;
        align-items: flex-end;
      }
      .chat-message.agent {
        align-self: flex-start;
        align-items: flex-start;
      }
      
      .message-bubble {
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 13px;
        line-height: 1.4;
      }
      .chat-message.user .message-bubble {
        background: var(--chat-bubble-user);
        color: var(--chat-bubble-user-fg);
      }
      .chat-message.agent .message-bubble {
        background: var(--chat-bubble-agent);
        color: var(--chat-bubble-agent-fg);
      }
      
      .message-time {
        font-size: 10px;
        opacity: 0.5;
        margin-top: 2px;
        padding: 0 2px;
      }

      .chat-input-wrapper {
        padding: 16px 32px;
        background: var(--vscode-editor-background);
        border-top: 1px solid var(--vscode-widget-border);
        display: flex;
        gap: 12px;
        align-items: flex-end;
      }
      
      .chat-textarea {
        flex: 1;
        background: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        border: 1px solid var(--vscode-widget-border);
        border-radius: 4px;
        padding: 8px;
        font-family: inherit;
        font-size: 13px;
        resize: none;
        height: 40px;
        min-height: 40px;
        max-height: 120px;
        outline: none;
      }
      .chat-textarea:focus { border-color: var(--vscode-focusBorder); }

      .send-btn {
        width: 36px;
        height: 36px;
        border-radius: 4px;
        border: none;
        background: ${cssStatusColor}; /* Theme match */
        color: #fff;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .send-btn:hover { opacity: 0.9; }
      .send-btn svg { width: 16px; height: 16px; fill: currentColor; }
      
      .toggle-btn {
        background: none;
        border: none;
        color: var(--vscode-textLink-foreground);
        cursor: pointer;
        font-size: 10px;
      }
      .toggle-btn:hover { text-decoration: underline; }

      .empty-state {
        display: none; /* Hidden by default */
      }
    </style>`;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  ${getCSPMeta()}
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${getFontLink(webview, this.context.extensionUri)}
  <title>${task.title}</title>
  ${getSharedStyles()}
  ${pageStyles}
</head>
<body>
  
  <div class="main-container">
    
    <!-- Scrollable Top Section (Header, Status, Instructions, Trace? No trace in new design? Trace is good.) -->
    <div class="scrollable-content">
      
      <!-- Header -->
      <div class="header-card">
        <div class="header-top-row">
          <input type="text" class="title-input" id="title" value="${task.title}" placeholder="TASK TITLE">
          <div class="task-id-badge">${task.id}</div>
        </div>
        <div class="metadata-row">
          <div class="metadata-item"><span>Owner: ${ownerName}</span></div>
          <div class="metadata-dot"></div>
          <div class="metadata-item"><span>Agent: ${agentName}</span></div>
        </div>
      </div>

      <!-- Status Chips -->
      <div class="status-chips-container" id="status-chips">
        ${getStatusChips()}
      </div>
      <input type="hidden" id="status" value="${currentStatus}">
      <input type="hidden" id="column" value="${task.columnId || ''}">

      <!-- Agent Instructions (Checklist Mode) -->
      <div class="content-section">
        <div class="section-header">
          <span>Agent Instructions</span>
          <button class="toggle-btn" id="toggle-edit-mode">Edit Raw Markdown</button>
        </div>
        
        <!-- Interactive Checklist Render -->
        <div class="checklist-container" id="checklist-view">
          <!-- Populated by JS -->
        </div>

        <!-- Raw Editor (Hidden by default) -->
        <div class="raw-instructions-container" id="raw-editor-container">
           <textarea id="summary" class="instructions-input" 
            placeholder="- [ ] Add items here...">${task.summary || ''}</textarea>
        </div>
      </div>

      <!-- Trace (Optional, keeping it as it was useful) -->
      ${traceMarkdown ? `
      <div class="content-section">
        <div class="section-header">Decision Trace</div>
         <div class="trace-content">${parsedTrace}</div>
      </div>` : ''}

       <!-- Footer Actions -->
      <div class="actions-footer">
        ${task.columnId === 'col-plan' ? `<button id="approvePlanBtn" class="btn btn-primary">Approve</button>` : ''}
        <button id="saveBtn" class="btn btn-primary">Save</button>
        <button id="deleteBtn" class="btn btn-danger">Archive/Delete</button>
      </div>
      
    </div> <!-- End Scrollable -->

    <!-- Sticky Chat Area -->
    <div class="fixed-chat-area">
      <div class="chat-history" id="chat-history">
        ${(task.chatHistory || []).map(msg => `
          <div class="chat-message ${msg.sender}">
            <div class="message-bubble">${msg.text}</div>
            <div class="message-time">${new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        `).join('')}
      </div>
      
      <div class="chat-input-wrapper">
        <textarea id="chat-input" class="chat-textarea" placeholder="Message agent..."></textarea>
        <button id="send-btn" class="send-btn">
          <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>
        </button>
      </div>
    </div>

  </div>

  <script>
    const vscode = acquireVsCodeApi();
    
    // --- State ---
    const statusInput = document.getElementById('status');
    const summaryInput = document.getElementById('summary');
    const checklistContainer = document.getElementById('checklist-view');
    const rawEditorContainer = document.getElementById('raw-editor-container');
    const toggleEditBtn = document.getElementById('toggle-edit-mode');
    
    // --- Status Chips ---
    document.getElementById('status-chips').addEventListener('click', (e) => {
      const chip = e.target.closest('.status-chip');
      if (!chip) return;
      
      const val = chip.dataset.value;
      
      // Update Input
      statusInput.value = val;
      
      // Update visuals
      document.querySelectorAll('.status-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      
      // Save immediately? Or just trigger update?
      triggerUpdate();
    });

    // --- Checklist Logic ---
    function renderChecklist() {
      const text = summaryInput.value;
      const lines = text.split('\\n');
      let html = '';
      
      lines.forEach((line, index) => {
        const trimmed = line.trim();
        // Check for - [ ] or - [x]
        const isTask = trimmed.startsWith('- [ ]') || trimmed.startsWith('- [x]');
        
        if (isTask) {
          const isChecked = trimmed.startsWith('- [x]');
          const content = line.replace(/- \[[ x]\]/, '').trim();
          html += \`<div class="checklist-item">\` +
              \`<input type="checkbox" class="checklist-checkbox" data-index="\${index}" \${isChecked ? 'checked' : ''}>\` +
              \`<div class="checklist-text \${isChecked ? 'done' : ''}" contenteditable="true" data-index="\${index}">\${content}</div>\` +
            \`</div>\`;
        } else if (trimmed.length > 0) {
           // Render non-task lines as text (unless empty)
           html += \`<div style="padding:4px 6px; font-size:13px; opacity:0.8">\${line}</div>\`;
        }
      });
      
      if (!html) html = '<div style="opacity:0.5; font-size:12px; font-style:italic">No instructions. Edit to add "- [ ] Task".</div>';
      
      checklistContainer.innerHTML = html;
      
      // Re-attach listeners based on new DOM
      attachChecklistListeners();
    }
    
    function attachChecklistListeners() {
       // Checkbox Toggles
       checklistContainer.querySelectorAll('.checklist-checkbox').forEach(cb => {
         cb.addEventListener('change', (e) => {
           const index = parseInt(e.target.dataset.index);
           const isChecked = e.target.checked;
           updateLine(index, isChecked);
         });
       });
       
       // Content Edits (Editable Text)
       checklistContainer.querySelectorAll('.checklist-text').forEach(div => {
         div.addEventListener('input', (e) => {
            const index = parseInt(e.target.dataset.index);
            updateLineContent(index, e.target.innerText);
         });
       });
    }
    
    function updateLine(index, checked) {
       const lines = summaryInput.value.split('\\n');
       if (index >= 0 && index < lines.length) {
         const line = lines[index];
         const prefix = checked ? '- [x]' : '- [ ]';
         lines[index] = line.replace(/- \[[ x]\]/, prefix);
         summaryInput.value = lines.join('\\n');
         triggerUpdate();
         
         const textDiv = checklistContainer.querySelector(\`.checklist-text[data-index="\${index}"]\`);
         if (textDiv) {
             if(checked) textDiv.classList.add('done');
             else textDiv.classList.remove('done');
         }
       }
    }

    function updateLineContent(index, newText) {
       const lines = summaryInput.value.split('\\n');
       if (index >= 0 && index < lines.length) {
         const line = lines[index];
         const match = line.match(/^(- \[[ x]\]\s*)/);
         if (match) {
             lines[index] = match[1] + newText;
         } else {
             lines[index] = newText;
         }
         summaryInput.value = lines.join('\\n');
         
         clearTimeout(timeout);
         timeout = setTimeout(triggerUpdate, 1000);
       }
    }

    // Toggle Mode
    toggleEditBtn.addEventListener('click', () => {
       const isRaw = rawEditorContainer.style.display === 'block';
       if (isRaw) {
         // Switch to View
         rawEditorContainer.style.display = 'none';
         checklistContainer.style.display = 'flex';
         toggleEditBtn.textContent = 'Edit Raw Markdown';
         renderChecklist();
       } else {
         // Switch to Edit
         rawEditorContainer.style.display = 'block';
         checklistContainer.style.display = 'none';
         toggleEditBtn.textContent = 'View Checklist';
       }
    });
    
    // Initial Render
    renderChecklist();
    
    // Sync Raw Edits to Render when typing in Raw Mode
    summaryInput.addEventListener('input', () => {
         clearTimeout(timeout);
         timeout = setTimeout(triggerUpdate, 1000);
    });

    // --- Collection & Updates ---

    function collect() {
      return {
        title: document.getElementById('title').value,
        status: statusInput.value,
        columnId: document.getElementById('column').value,
        summary: summaryInput.value
      };
    }

    function triggerUpdate() {
      vscode.postMessage({ type: 'update', data: collect() });
    }

    var timeout;
    document.getElementById('title').addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(triggerUpdate, 1000);
    });

    document.getElementById('saveBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'save', data: collect() });
    });
    
    document.getElementById('deleteBtn').addEventListener('click', () => {
      vscode.postMessage({ type: 'delete' });
    });

    document.getElementById('approvePlanBtn')?.addEventListener('click', () => {
      vscode.postMessage({ type: 'approvePlan' });
    });

    // --- Chat Logic ---
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const chatHistory = document.getElementById('chat-history');

    function addMessageToUI(text, sender) {
      const msgDiv = document.createElement('div');
      msgDiv.className = \`chat-message \${sender}\`;
      msgDiv.innerHTML = \`
        <div class="message-bubble">\${text
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")}</div>
        <div class="message-time">\${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
      \`;
      chatHistory.appendChild(msgDiv);
      chatHistory.scrollTop = chatHistory.scrollHeight;
    }
    
    chatHistory.scrollTop = chatHistory.scrollHeight;

    sendBtn?.addEventListener('click', () => {
      const text = chatInput.value.trim();
      if (!text) return;

      addMessageToUI(text, 'user');
      chatInput.value = '';

      vscode.postMessage({
        type: 'chat',
        text: text,
        sender: 'user'
      });
    });

    chatInput?.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        sendBtn.click();
      }
    });
  </script>
</body>
</html>`;
  }

  private parseTraceMarkdown(md: string): string {
    if (!md) { return ''; }

    // Simple parser: Split by double newline or header
    // Ideally we want to identify "blocks"
    // Heuristic: ## Headers start new items. Bullet points in between.

    const lines = md.split('\n');
    let html = '';
    let inItem = false;

    lines.forEach(line => {
      if (line.startsWith('# ')) {
        // Main Header - ignore or special style
      } else if (line.startsWith('> Created:')) {
        html += `<div class="trace-date">${line.replace('> Created:', '').trim()}</div>`;
      } else if (line.startsWith('## ') || line.startsWith('### ')) {
        if (inItem) { html += '</div></div>'; }
        html += `<div class="trace-item"><div class="trace-content"><h3>${line.replace(/#+\s/, '')}</h3>`;
        inItem = true;
      } else if (line.trim().startsWith('- ')) {
        if (!inItem) {
          // Orphan bullets
          html += `<div class="trace-item"><div class="trace-content">`;
          inItem = true;
        }
        html += `<li>${line.replace('- ', '')}</li>`;
      } else {
        if (inItem && line.trim()) { html += `<p>${line}</p>`; }
      }
    });

    if (inItem) { html += '</div></div>'; }
    return html;
  }
}
