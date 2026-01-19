import * as vscode from 'vscode';
import { TaskEditorProvider } from './ui/tasks';
import { registerInitializeCommand } from './vscode/commands/initializeCommand';
import { registerBoardWatchers } from './data';
import { formatError, log, warn, error as logError } from './core';
import { SessionBridge } from './integrations/sessionBridge';
import { CursorBridge } from './integrations/cursorBridge';
import { AgentManager, registerAgentManager, AntigravityAdapter, CursorAdapter } from './domains/agents';
import { registerCodeLensProvider } from './ui/shared';
import { registerSCMDecorations } from './vscode/scm/scmDecorator';
import { registerTestController } from './vscode/testing/testController';
import { checkAndUpdateFramework } from './vscode/framework';
import { initializeDevOpsServices } from './vscode/services';
import { bindDevOpsViews } from './vscode/views';
import { registerBoardCommands } from './vscode/commands';

export async function activate(context: vscode.ExtensionContext) {
  log('DevOps extension v0.0.1 activating...');
  // Don't show activation message here - too noisy. User will see initialization prompt if needed.
  try {
    // Register DevOps: Initialize command first (always works)
    log('[Activation] Step 1: Registering initialize command');
    context.subscriptions.push(registerInitializeCommand(context));
    log('[Activation] Step 1 complete');

    // Register task editor for opening tasks in tabs
    log('[Activation] Step 2: Registering task editor');
    context.subscriptions.push(TaskEditorProvider.register(context));
    log('[Activation] Step 2 complete');

    log('[Activation] Step 3: Initializing DevOps services...');
    // Moved to vscode/services.ts
    const services = await initializeDevOpsServices(context);
    log('[Activation] Step 3 complete');

    // Onboarding and initialization are handled by DashboardViewProvider
    // When user completes the onboarding form, it triggers devops.initialize

    // Listen for onboarding completion to refresh views
    services.dashboard.onDidComplete(() => {
      services.provider.refresh();
      services.dashboard.refresh();
      services.metricsView.updateContent();
    });

    log('[Activation] Step 4: Binding views');
    // Moved to vscode/views.ts
    bindDevOpsViews(context, services);
    log('[Activation] Step 4 complete');

    try {
      await services.provider.refresh();
      services.dashboard.refresh();
      services.metricsView.updateContent();
    } catch (error) {
      warn(`Board not loaded on activation: ${error}`);
    }

    await registerBoardWatchers(services.provider, context);
    // Also watch for updates to refresh dashboard and metrics
    context.subscriptions.push(
      services.provider.onDidUpdateBoardView(() => {
        services.dashboard.refresh();
        services.metricsView.updateContent();
      })
    );

    registerBoardCommands(context, services, services.syncFilterUI);

    // Initialize Session Bridge
    const sessionBridge = new SessionBridge(context);
    sessionBridge.activate();

    // NOTE: CursorBridge should NOT auto-activate - it creates .cursor/tasks
    // which is inappropriate before initialization and wrong for non-Cursor IDEs.
    // Initialize Cursor Bridge only if needed and initialized
    // const cursorBridge = new CursorBridge(context);
    // if (initialized && isCursorIDE()) {
    //   cursorBridge.activate();
    // }

    // Register task provider

    // Register CodeLens provider
    registerCodeLensProvider(context);

    // Register SCM decorations
    registerSCMDecorations(context);

    // Register test controller
    registerTestController(context);

    // Initialize Agent Manager
    const agentManager = AgentManager.getInstance();
    agentManager.registerAdapter(new AntigravityAdapter());
    agentManager.registerAdapter(new CursorAdapter());
    registerAgentManager(context);

    // Check if existing .dev_ops/ needs framework files update
    // Call without await to avoid blocking activation if UI is shown
    checkAndUpdateFramework(context);

    // Listen for workspace folder changes and update framework
    context.subscriptions.push(
      vscode.workspace.onDidChangeWorkspaceFolders(async (event) => {
        log('Workspace folders changed, checking framework status...');
        // Re-check framework for each added folder
        for (const folder of event.added) {
          log(`New workspace folder detected: ${folder.uri.fsPath}`);
          await checkAndUpdateFramework(context);
        }
      })
    );

    // Focus sidebar on activation so onboarding is visible
    try {
      // Focus the sidebar view first - this ensures onboarding is visible
      await vscode.commands.executeCommand('devopsStatusBoard.focus');
      log('DevOps sidebar focused');

      // Also open board tab (will show onboarding if not initialized)
      await vscode.commands.executeCommand('devops.openBoard');
      log('Board automatically opened');
    } catch (error) {
      warn(`Sidebar/Board auto-open skipped: ${formatError(error)}`);
    }

    log('DevOps extension activated successfully');
  } catch (error) {
    logError('DevOps extension activation failed', error);
    vscode.window.showErrorMessage(`DevOps extension failed to activate: ${formatError(error)}`);
  }
}

export function deactivate() { }
