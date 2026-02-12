
import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { checkAndUpdateFramework } from '../vscode/framework';

suite('Framework Integrity Check', () => {
    let sandbox: sinon.SinonSandbox;
    let tempDir: string;
    let devOpsDir: string;
    let configPath: string;
    let versionsPath: string;
    let boardPath: string;
    let executeCommandStub: sinon.SinonStub;
    let showInfoStub: sinon.SinonStub;

    setup(() => {
        sandbox = sinon.createSandbox();

        // Create temp project structure
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'devops-test-'));
        devOpsDir = path.join(tempDir, '.dev_ops');
        fs.mkdirSync(devOpsDir);

        configPath = path.join(devOpsDir, 'config.json');
        versionsPath = path.join(devOpsDir, 'version.json');
        boardPath = path.join(devOpsDir, 'board.json');

        // Create dummy board and version to satisfy "isDevOpsProject" checks
        fs.writeFileSync(boardPath, '{}');
        fs.writeFileSync(versionsPath, JSON.stringify({ version: '0.0.2' })); // Match package.json version to avoid outdated check

        // Mock VS Code API
        sandbox.stub(vscode.workspace, 'workspaceFolders').value([{
            uri: vscode.Uri.file(tempDir),
            name: 'Test Project',
            index: 0
        }]);

        executeCommandStub = sandbox.stub(vscode.commands, 'executeCommand');
        executeCommandStub.resolves();

        showInfoStub = sandbox.stub(vscode.window, 'showInformationMessage');

        // Mock withProgress to execute the callback immediately
        sandbox.stub(vscode.window, 'withProgress').callsFake(async (_options, callback) => {
            return callback({ report: () => { } }, new vscode.CancellationTokenSource().token);
        });

        // Mock Configuration
        const configStub = {
            get: sandbox.stub().returns(true),
            update: sandbox.stub().resolves(),
            has: sandbox.stub().returns(true),
            inspect: sandbox.stub().returns(undefined)
        };
        sandbox.stub(vscode.workspace, 'getConfiguration').returns(configStub as any);

        // Mock Extension Context
        // We don't really use it except for extensionPath
        // framework.ts uses context.extension.packageJSON.version
    });

    teardown(() => {
        sandbox.restore();
        // Cleanup temp dir
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    test('should detect missing .agent folder if configured in selectedIDEs', async () => {
        // Setup: Config says Antigravity, but .agent is missing
        fs.writeFileSync(configPath, JSON.stringify({ selectedIDEs: ['antigravity'] }));

        // Ensure .agent does NOT exist
        const agentDir = path.join(tempDir, '.agent');
        if (fs.existsSync(agentDir)) { fs.rmSync(agentDir, { recursive: true }); }

        // Also ensure scripts/rules sources exist (mocked by stubbing fs.existsSync? No, use real paths)
        // framework.ts uses context.extensionPath to find assets.
        // We need to pass a mock context with a valid path or mock fs.existsSync for assets.

        // Easiest is to stub console.log/warn to keep output clean
        sandbox.stub(console, 'log');
        sandbox.stub(console, 'warn');

        // We need to return "Install Now"
        showInfoStub.resolves('Install Now');

        // Mock context
        const context = {
            extensionPath: path.resolve(__dirname, '../../..'), // Point to project root? 
            extension: {
                packageJSON: { version: '0.0.2' },
                id: 'test',
                extensionUri: vscode.Uri.file('/tmp'),
                isActive: true,
                exports: undefined,
                activate: () => Promise.resolve(),
            },
            subscriptions: [],
            workspaceState: {} as any,
            globalState: {} as any,
            storageUri: undefined,
            globalStorageUri: undefined,
            logUri: undefined,
            extensionUri: undefined,
            environmentVariableCollection: {} as any,
            secrets: {} as any,
            storagePath: undefined,
            globalStoragePath: undefined,
            asAbsolutePath: (p: string) => p
        } as unknown as vscode.ExtensionContext;

        // Note: framework checks fs.existsSync(assetsDir). 
        // We should probably mock fs.existsSync to return true for assets checks, 
        // but false for the agent dir check.
        // Or just create dummy assets in temp dir and set context.extensionPath to tempDir.

        const assetsDir = path.join(tempDir, 'dist', 'assets');
        fs.mkdirSync(path.join(assetsDir, 'rules'), { recursive: true });
        fs.mkdirSync(path.join(assetsDir, 'workflows'), { recursive: true });

        const mockContext = { ...context, extensionPath: tempDir } as vscode.ExtensionContext;

        // Run
        await checkAndUpdateFramework(mockContext);

        // Assert
        // verify calling showInformationMessage with expected message
        sinon.assert.called(showInfoStub);
        const args = showInfoStub.firstCall.args;
        assert.ok(args[0].includes('Missing DevOps Components'), 'Should prompt for missing components');

        // Verify executeCommand called with correct args
        sinon.assert.calledWith(executeCommandStub, 'devops.initialize', sinon.match({
            silent: true,
            selectedIDEs: sinon.match.array.contains(['antigravity'])
        }));
    });

    test('should NOT prompt if .agent exists', async () => {
        fs.writeFileSync(configPath, JSON.stringify({ selectedIDEs: ['antigravity'] }));

        // Create .agent
        const agentDir = path.join(tempDir, '.agent');
        fs.mkdirSync(path.join(agentDir, 'rules'), { recursive: true });
        fs.mkdirSync(path.join(agentDir, 'workflows'), { recursive: true });

        // Mock context with assets in tempDir
        const assetsDir = path.join(tempDir, 'dist', 'assets');
        fs.mkdirSync(path.join(assetsDir, 'rules'), { recursive: true });
        fs.writeFileSync(path.join(agentDir, 'rules', 'test.md'), 'content');

        const context = {
            extensionPath: tempDir,
            extension: { packageJSON: { version: '0.0.2' } }
        } as unknown as vscode.ExtensionContext;

        await checkAndUpdateFramework(context);

        sinon.assert.notCalled(showInfoStub);
    });
});
