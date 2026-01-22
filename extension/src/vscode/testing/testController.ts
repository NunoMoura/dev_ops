import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';
import * as cp from 'child_process';

const execAsync = promisify(cp.exec);

/**
 * Test controller for DevOps framework.
 * Integrates Python tests into VS Code Testing panel.
 */
export class DevOpsTestController {
    private controller: vscode.TestController;
    private workspaceRoot: string | undefined;

    constructor(context: vscode.ExtensionContext) {
        const folders = vscode.workspace.workspaceFolders;
        if (folders && folders.length > 0) {
            this.workspaceRoot = folders[0].uri.fsPath;
        }

        this.controller = vscode.tests.createTestController(
            'devops-tests',
            'DevOps Python Tests'
        );

        context.subscriptions.push(this.controller);

        // Set up test discovery and execution
        this.controller.resolveHandler = async () => {
            await this.discoverTests();
        };

        this.controller.createRunProfile(
            'Run Tests',
            vscode.TestRunProfileKind.Run,
            async (request, token) => {
                await this.runTests(request, token);
            },
            true
        );

        // Initial discovery
        this.discoverTests();

        // Watch for test file changes
        this.watchTestFiles(context);
    }

    private async discoverTests(): Promise<void> {
        if (!this.workspaceRoot) {
            return;
        }

        try {
            // Find all test files (pytest pattern: test_*.py or *_test.py)
            const testFiles = await this.findTestFiles();

            for (const testFile of testFiles) {
                await this.discoverTestsInFile(testFile);
            }
        } catch (error) {
            console.error('Failed to discover tests:', error);
        }
    }

    private async findTestFiles(): Promise<string[]> {
        if (!this.workspaceRoot) {
            return [];
        }

        const { stdout } = await execAsync(
            'find . -type f \\( -name "test_*.py" -o -name "*_test.py" \\) ! -path "./.*"',
            { cwd: this.workspaceRoot }
        );

        return stdout
            .trim()
            .split('\n')
            .filter(line => line)
            .map(file => path.join(this.workspaceRoot!, file.substring(2)));
    }

    private async discoverTestsInFile(filePath: string): Promise<void> {
        try {
            // Use pytest --collect-only to discover tests
            const relativePath = path.relative(this.workspaceRoot!, filePath);
            const { stdout } = await execAsync(
                `python -m pytest --collect-only -q "${relativePath}"`,
                { cwd: this.workspaceRoot }
            );

            const fileUri = vscode.Uri.file(filePath);
            const fileItem = this.controller.createTestItem(
                filePath,
                path.basename(filePath),
                fileUri
            );

            // Parse pytest output to find test functions
            const lines = stdout.split('\n');
            for (const line of lines) {
                // Match pattern:  <Module test_example.py>::<Function test_something>
                const match = line.match(/::<Function (.+)>$/);
                if (match) {
                    const testName = match[1];
                    const testId = `${filePath}::${testName}`;

                    const testItem = this.controller.createTestItem(
                        testId,
                        testName,
                        fileUri
                    );

                    fileItem.children.add(testItem);
                }
            }

            if (fileItem.children.size > 0) {
                this.controller.items.add(fileItem);
            }
        } catch (error) {
            console.error(`Failed to discover tests in ${filePath}:`, error);
        }
    }

    private async runTests(
        request: vscode.TestRunRequest,
        token: vscode.CancellationToken
    ): Promise<void> {
        const run = this.controller.createTestRun(request);

        const tests = request.include || this.gatherAllTests();

        for (const test of tests) {
            if (token.isCancellationRequested) {
                run.skipped(test);
                continue;
            }

            await this.runTest(test, run);
        }

        run.end();
    }

    private async runTest(
        test: vscode.TestItem,
        run: vscode.TestRun
    ): Promise<void> {
        run.started(test);

        try {
            // Extract file and test name from test ID
            const parts = test.id.split('::');
            const filePath = parts[0];
            const testName = parts[1];

            const relativePath = path.relative(this.workspaceRoot!, filePath);

            // Run pytest with specific test
            const { stdout, stderr } = await execAsync(
                `python -m pytest "${relativePath}::${testName}" -v --tb=short`,
                { cwd: this.workspaceRoot }
            );

            // Parse output
            if (stdout.includes('PASSED')) {
                run.passed(test);
            } else if (stdout.includes('FAILED')) {
                const message = new vscode.TestMessage(stderr || stdout);
                run.failed(test, message);
            } else if (stdout.includes('SKIPPED')) {
                run.skipped(test);
            }
        } catch (error: any) {
            const message = new vscode.TestMessage(
                error.stdout || error.stderr || error.message
            );
            run.failed(test, message);
        }
    }

    private gatherAllTests(): vscode.TestItem[] {
        const tests: vscode.TestItem[] = [];

        this.controller.items.forEach(item => {
            item.children.forEach(child => {
                tests.push(child);
            });
        });

        return tests;
    }

    private watchTestFiles(context: vscode.ExtensionContext): void {
        if (!this.workspaceRoot) {
            return;
        }

        const watcher = vscode.workspace.createFileSystemWatcher(
            new vscode.RelativePattern(this.workspaceRoot, '**/{test_*.py,*_test.py}')
        );

        watcher.onDidCreate(uri => {
            this.discoverTestsInFile(uri.fsPath);
        });

        watcher.onDidChange(uri => {
            // Refresh tests in this file
            const existingItem = this.controller.items.get(uri.fsPath);
            if (existingItem) {
                this.controller.items.delete(uri.fsPath);
            }
            this.discoverTestsInFile(uri.fsPath);
        });

        watcher.onDidDelete(uri => {
            this.controller.items.delete(uri.fsPath);
        });

        context.subscriptions.push(watcher);
    }
}

/**
 * Register the DevOps test controller.
 */
export function registerTestController(context: vscode.ExtensionContext): void {
    new DevOpsTestController(context);

    // Add command to create bug from failed test
    context.subscriptions.push(
        vscode.commands.registerCommand('devops.createBugFromTest', async (testItem: vscode.TestItem) => {
            const testName = testItem.label;
            const bugTitle = `Test failing: ${testName}`;

            vscode.window.showInformationMessage(
                `Create bug for failed test: ${testName}?`,
                'Yes', 'No'
            ).then(async (choice) => {
                if (choice === 'Yes') {
                    // Create bug task via VS Code command
                    await vscode.commands.executeCommand('devops.createTask', {
                        title: bugTitle,
                        priority: 'high',
                        columnId: 'col-backlog'
                    });
                }
            });
        })
    );
}
