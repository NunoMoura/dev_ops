import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { DEFAULT_COLUMN_BLUEPRINTS } from "../features/types";

/**
 * DevOps: Initialize command
 *
 * Copies framework assets to the workspace:
 * - rules/ → .agent/rules/
 * - workflows/ → .agent/workflows/
 * - templates/ → dev_ops/templates/
 * - scripts/ → dev_ops/scripts/
 * - Initializes dev_ops/kanban/board.json
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

            // Initialize Kanban board with template selection
            await initializeKanbanBoard(workspaceRoot, assetsPath);

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

async function initializeKanbanBoard(workspaceRoot: string, assetsPath: string): Promise<void> {
    const kanbanDir = path.join(workspaceRoot, "dev_ops", "kanban");
    const boardPath = path.join(kanbanDir, "board.json");

    if (fs.existsSync(boardPath)) {
        console.log("Kanban board already exists");
        return;
    }

    // Prompt user for board template
    type TemplateOption = { label: string; description: string; template: string | null };
    const options: TemplateOption[] = [
        { label: "Empty Board", description: "Start with an empty Kanban board", template: null },
        { label: "Greenfield Project", description: "New project - architecture, scaffolding, CI/CD setup", template: "board_greenfield.json" },
        { label: "Brownfield Project", description: "Existing codebase - audit, dependencies, tests", template: "board_brownfield.json" },
    ];

    const selection = await vscode.window.showQuickPick(options, {
        placeHolder: "Select a board template",
        title: "DevOps: Initialize Kanban Board",
    });

    if (!selection) {
        // User cancelled - still create empty board
        console.log("User cancelled template selection, creating empty board");
    }

    if (!fs.existsSync(kanbanDir)) {
        fs.mkdirSync(kanbanDir, { recursive: true });
    }

    // Load template if selected
    let items: any[] = [];
    if (selection?.template) {
        const templatePath = path.join(assetsPath, "templates", selection.template);
        if (fs.existsSync(templatePath)) {
            try {
                const templateData = JSON.parse(fs.readFileSync(templatePath, "utf-8"));
                items = (templateData.items || []).map((item: any, index: number) => ({
                    id: `TASK-${String(index + 1).padStart(3, "0")}`,
                    columnId: "col-backlog",
                    title: item.title,
                    summary: item.summary,
                    priority: item.priority,
                    updatedAt: new Date().toISOString(),
                }));
            } catch (error) {
                console.error("Failed to load board template:", error);
            }
        }
    }

    const initialBoard = {
        version: 1,
        columns: DEFAULT_COLUMN_BLUEPRINTS.map((col) => ({ ...col })),
        items,
    };

    fs.writeFileSync(boardPath, JSON.stringify(initialBoard, null, 2));
    const taskCount = items.length ? ` with ${items.length} starter tasks` : "";
    console.log(`Kanban board initialized${taskCount} at dev_ops/kanban/board.json`);
}
