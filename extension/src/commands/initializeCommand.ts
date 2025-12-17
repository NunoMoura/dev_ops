import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

/**
 * DevOps: Initialize command
 *
 * Copies framework assets to the workspace:
 * - rules/ → .agent/rules/
 * - workflows/ → .agent/workflows/
 * - templates/ → dev_ops/templates/
 * - scripts/ → dev_ops/scripts/
 * - Initializes local/kanban.json
 */
export function registerInitializeCommand(
    context: vscode.ExtensionContext
): vscode.Disposable {
    return vscode.commands.registerCommand("devops.initialize", async () => {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders || workspaceFolders.length === 0) {
            vscode.window.showErrorMessage(
                "DevOps: Please open a workspace folder first."
            );
            return;
        }

        const workspaceRoot = workspaceFolders[0].uri.fsPath;
        const extensionPath = context.extensionPath;

        try {
            // Assets are copied to dist/assets during build
            const assetsPath = path.join(extensionPath, "dist", "assets");

            // Copy rules → .agent/rules/
            await copyDirectory(
                path.join(assetsPath, "rules"),
                path.join(workspaceRoot, ".agent", "rules")
            );

            // Copy workflows → .agent/workflows/
            await copyDirectory(
                path.join(assetsPath, "workflows"),
                path.join(workspaceRoot, ".agent", "workflows")
            );

            // Copy templates → dev_ops/templates/
            await copyDirectory(
                path.join(assetsPath, "templates"),
                path.join(workspaceRoot, "dev_ops", "templates")
            );

            // Copy scripts → dev_ops/scripts/
            await copyDirectory(
                path.join(assetsPath, "scripts"),
                path.join(workspaceRoot, "dev_ops", "scripts")
            );

            // Initialize Kanban board
            await initializeKanbanBoard(workspaceRoot);

            vscode.window.showInformationMessage(
                "✅ DevOps: Framework initialized successfully!"
            );
        } catch (error) {
            vscode.window.showErrorMessage(
                `DevOps: Initialization failed: ${error}`
            );
        }
    });
}

async function copyDirectory(src: string, dest: string): Promise<void> {
    if (!fs.existsSync(src)) {
        console.log(`Source directory not found: ${src}`);
        return;
    }

    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            await copyDirectory(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

async function initializeKanbanBoard(workspaceRoot: string): Promise<void> {
    const kanbanDir = path.join(workspaceRoot, "local");
    const boardPath = path.join(kanbanDir, "kanban.json");

    if (fs.existsSync(boardPath)) {
        console.log("Kanban board already exists");
        return;
    }

    if (!fs.existsSync(kanbanDir)) {
        fs.mkdirSync(kanbanDir, { recursive: true });
    }

    const initialBoard = {
        version: 1,
        columns: [
            { id: "col-idea", name: "I am working through the idea", position: 1 },
            {
                id: "col-breakdown",
                name: "I am breaking it down into pieces",
                position: 2,
            },
            {
                id: "col-iterating",
                name: "I am iterating through implementation",
                position: 3,
            },
            {
                id: "col-testing",
                name: "I am testing this feature component",
                position: 4,
            },
            { id: "col-ready", name: "This component is ready", position: 5 },
            { id: "col-complete", name: "This is complete", position: 6 },
        ],
        items: [],
    };

    fs.writeFileSync(boardPath, JSON.stringify(initialBoard, null, 2));
    console.log("Kanban board initialized at local/kanban.json");
}
