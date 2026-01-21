import * as vscode from 'vscode';
import { registerDevOpsCommand } from './utils';
import { getWorkspaceRoot, runBoardOps } from '../../data';

/**
 * Register all documentation-related commands
 * These commands create various documentation types via doc_ops.py
 */
export function registerDocumentCommands(context: vscode.ExtensionContext): void {
    // devops.createUser, devops.createStory, devops.newArchDoc, devops.createMockup
    // have been disabled as they relied on legacy doc_ops.py.
    // TODO: Re-implement using RLM patterns in TypeScript if needed.
}

// Handlers removed as part of legacy cleanup.

