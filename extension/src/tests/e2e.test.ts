import * as assert from 'assert';
import * as vscode from 'vscode';

/**
 * E2E smoke tests for the DevOps extension.
 * These tests verify the extension activates correctly and basic commands work.
 */

suite('DevOps Extension E2E Tests', () => {
    // Wait for extension to activate
    suiteSetup(async function () {
        this.timeout(10000);
        // Try to find and activate the extension
        const extension = vscode.extensions.getExtension('NunoMoura.dev-ops');
        if (extension && !extension.isActive) {
            await extension.activate();
        }
    });

    test('Extension is present', () => {
        const extension = vscode.extensions.getExtension('NunoMoura.dev-ops');
        assert.ok(extension, 'Extension should be installed');
    });

    test('Extension activates without errors', async function () {
        this.timeout(10000);
        const extension = vscode.extensions.getExtension('NunoMoura.dev-ops');
        assert.ok(extension, 'Extension should be installed');

        if (!extension!.isActive) {
            await extension!.activate();
        }
        assert.ok(extension!.isActive, 'Extension should be active');
    });

    test('DevOps commands are registered', async () => {
        const commands = await vscode.commands.getCommands(true);

        // Check core commands are registered (using actual command names)
        const expectedCommands = [
            'devops.openBoard',
            'devops.createTask',
            'devops.showTaskDetails',
        ];

        for (const cmd of expectedCommands) {
            assert.ok(
                commands.includes(cmd),
                `Command ${cmd} should be registered`
            );
        }
    });

    test('Board commands are registered', async () => {
        const commands = await vscode.commands.getCommands(true);

        const boardCommands = [
            'devops.createColumn',
            'devops.moveTask',
            'devops.filterTasks',
            'devops.clearTaskFilter',
        ];

        for (const cmd of boardCommands) {
            assert.ok(
                commands.includes(cmd),
                `Board command ${cmd} should be registered`
            );
        }
    });

    test('DevOps views are registered', () => {
        // This tests that the package.json views contribution is valid
        // The actual views are created when the extension activates
        const extension = vscode.extensions.getExtension('NunoMoura.dev-ops');
        assert.ok(extension, 'Extension should be present');

        const contributes = extension!.packageJSON.contributes;
        assert.ok(contributes.views, 'Extension should contribute views');
        assert.ok(contributes.views.devops, 'Extension should have devops view container');
    });

    test('Extension contributes configuration', () => {
        const extension = vscode.extensions.getExtension('NunoMoura.dev-ops');
        assert.ok(extension, 'Extension should be present');

        const contributes = extension!.packageJSON.contributes;
        assert.ok(contributes.configuration, 'Extension should contribute configuration');

        const properties = contributes.configuration.properties;
        assert.ok(properties['devops.pythonPath'], 'pythonPath setting should exist');
        assert.ok(properties['devops.autoOpenBoard'], 'autoOpenBoard setting should exist');
        assert.ok(properties['devops.enableCodeLens'], 'enableCodeLens setting should exist');
    });

    test('Custom editor for tasks is registered', () => {
        const extension = vscode.extensions.getExtension('NunoMoura.dev-ops');
        assert.ok(extension, 'Extension should be present');

        const contributes = extension!.packageJSON.contributes;
        assert.ok(contributes.customEditors, 'Extension should contribute custom editors');

        const taskEditor = contributes.customEditors.find(
            (e: any) => e.viewType === 'devops.taskEditor'
        );
        assert.ok(taskEditor, 'Task editor should be registered');
    });
});

suite('DevOps Extension - Command Execution', () => {
    // Note: These tests require a workspace folder to be open
    // They may fail or skip in minimal test environments

    test('devops.openSettings command executes', async function () {
        this.timeout(5000);
        try {
            // This should open VS Code settings filtered to DevOps
            await vscode.commands.executeCommand('devops.openSettings');
            // If no error is thrown, the command executed
            assert.ok(true);
        } catch (error: any) {
            // Some commands may fail without a workspace
            if (error.message?.includes('workspace')) {
                this.skip();
            }
            throw error;
        }
    });

    test.skip('devops.openBoard command executes (requires workspace)', async function () {
        this.timeout(5000);
        // This test is skipped by default as it requires a workspace
        // Uncomment to run in an environment with a dev_ops project open
        await vscode.commands.executeCommand('devops.openBoard');
        // If we get here without error, the command executed
        assert.ok(true);
    });
});
