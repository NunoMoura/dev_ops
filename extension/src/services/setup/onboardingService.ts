import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { log } from '../../common';

export interface OnboardingResult {
    completed: boolean;
    name?: string;
    projectType?: string;
    selectedIDEs?: string[];
    githubWorkflows?: boolean;
}

export class OnboardingService {
    constructor(private readonly context: vscode.ExtensionContext) { }

    public async runOnboarding(): Promise<OnboardingResult> {
        // 1. Name
        const name = await vscode.window.showInputBox({
            title: 'Welcome to DevOps',
            prompt: 'Enter your name to personalize the experience',
            ignoreFocusOut: true,
            placeHolder: 'e.g. Alice, Bob'
        });
        if (!name) { return { completed: false }; }

        // 2. Project Type
        const projectTypeItem = await vscode.window.showQuickPick(
            [
                { label: '$(sprout) Greenfield', description: 'New project starting from scratch', detail: 'Creates a robust folder structure', picked: true, value: 'greenfield' },
                { label: '$(tools) Brownfield', description: 'Existing codebase to understand & improve', detail: 'Analyzes existing code first', value: 'brownfield' },
                { label: '$(checklist) Fresh Start', description: 'Empty board, I know what I\'m doing', detail: 'Minimal setup', value: 'fresh' },
                { label: '$(run) Skip', description: 'Just install framework, setup board later', detail: 'No immediate action', value: 'skip' }
            ],
            { title: 'Project Type', placeHolder: 'How would you like to start?', ignoreFocusOut: true }
        );
        if (!projectTypeItem) { return { completed: false }; }

        if (projectTypeItem.value === 'skip') {
            return { completed: true, name, projectType: 'skip' };
        }

        // 3. IDE Selection
        const detected = this._detectIDE();
        const ideItems = [
            { label: '$(rocket) Antigravity', description: 'Install to .agent/', picked: detected === 'antigravity' || detected === 'vscode', value: 'antigravity' },
            { label: '$(code) Cursor', description: 'Install to .cursor/', picked: detected === 'cursor', value: 'cursor' }
        ];

        // QuickPick for multiple selection
        // Note: VS Code QuickPick UI for multi-select requires accepting by 'OK' (top right) or Enter.
        const selectedIDEsItems = await vscode.window.showQuickPick(ideItems, {
            title: 'IDE Support',
            placeHolder: 'Select IDEs to install support for (Multi-select)',
            canPickMany: true,
            ignoreFocusOut: true
        });

        // If user cancelled (undefined), stop. If they selected nothing (empty array), fallback to default.
        if (!selectedIDEsItems) { return { completed: false }; }

        let selectedIDEs = selectedIDEsItems.map(i => i.value);
        if (selectedIDEs.length === 0) {
            selectedIDEs = ['antigravity']; // Fallback
        }

        // 4. GitHub Workflows
        const github = await vscode.window.showQuickPick(
            [
                { label: '$(check) Yes', description: 'Enable GitHub Workflows (PR Triage)', value: true },
                { label: '$(x) No', description: 'Skip GitHub integration', value: false }
            ],
            { title: 'GitHub Integration', placeHolder: 'Enable GitHub Workflows?', ignoreFocusOut: true }
        );
        if (!github) { return { completed: false }; }

        log(`Onboarding finished: ${name}, ${projectTypeItem.value}`);

        return {
            completed: true,
            name,
            projectType: projectTypeItem.value,
            selectedIDEs,
            githubWorkflows: github.value
        };
    }

    private _detectIDE(): string {
        const appName = vscode.env.appName || '';
        if (appName.includes('Cursor')) {
            return 'cursor';
        }
        if (appName.includes('Antigravity') || vscode.extensions.getExtension('google.antigravity')) {
            return 'antigravity';
        }
        return 'antigravity';
    }
}
