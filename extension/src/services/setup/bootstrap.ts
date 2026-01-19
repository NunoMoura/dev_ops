
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { log, warn, formatError } from '../../core';
import { createTask } from '../../vscode/commands/taskCommands';

/**
 * Bootstrap Service
 * 
 * Replaces project_ops.py and doc_ops.py.
 * Handles:
 * 1. Project Detection (Stack, Docs, Tests)
 * 2. Architecture Scaffolding
 * 3. Rule Generation
 */

interface DetectResult {
    stack: StackItem[];
    docs: DocStatus;
    tests: TestStatus;
    patterns: {
        common_files: Record<string, number>;
        common_dirs: string[];
    };
}

interface StackItem {
    name: string;      // e.g., 'python.md'
    category: 'Language' | 'Linter' | 'Library' | 'Database';
    template: string;  // e.g., 'templates/rules/languages.md'
    replacements: Record<string, string>;
    version?: string;
    globs?: string[];
}

interface DocStatus {
    prd: string | null;
    nonnegotiables: string | null;
    architecture: string | null;
    readme: 'comprehensive' | 'basic' | 'minimal' | null;
    contributing: string | null;
    changelog: string | null;
    existing_docs_folder: string | null;
}

interface TestStatus {
    exists: boolean;
    framework: string | null;
    ci_configured: boolean;
    test_dirs: string[];
}

// Global mapping from project_ops.py
const GLOB_MAPPINGS: Record<string, string[]> = {
    "python": ["**/*.py"],
    "typescript": ["**/*.ts", "**/*.tsx"],
    "javascript": ["**/*.js", "**/*.jsx"],
    "go": ["**/*.go"],
    "rust": ["**/*.rs"],
    "java": ["**/*.java"],
    "cpp": ["**/*.cpp", "**/*.cc", "**/*.h", "**/*.hpp"],
    "svelte": ["**/*.svelte"],
    "vue": ["**/*.vue"],
    "react": ["**/*.jsx", "**/*.tsx"],
    "fastapi": ["**/routers/*.py", "**/routes.py", "**/main.py"],
    "django": ["**/models.py", "**/views.py", "**/admin.py", "**/apps.py"],
    "flask": ["**/app.py", "**/views.py"],
    "sqlalchemy": ["**/models.py", "**/models/*.py"],
    "pydantic": ["**/schemas.py", "**/schemas/*.py"],
    "postgresql": ["**/migrations/**", "**/*.sql"],
    "mysql": ["**/*.sql"],
    "mongodb": ["mongod.conf"],
    "redis": ["redis.conf"],
    "sqlite": ["**/*.db", "**/*.sqlite", "**/*.sqlite3"],
};

const EXCLUDED_DIRS = new Set([".git", "node_modules", "venv", "__pycache__", "dist", "out", ".dev_ops", ".agent", ".cursor"]);

export class BootstrapService {
    private extensionPath: string;

    constructor(context: vscode.ExtensionContext) {
        this.extensionPath = context.extensionPath;
    }

    /**
     * Run full bootstrap process
     */
    public async bootstrap(projectRoot: string): Promise<void> {
        log('[Bootstrap] Starting project analysis...');

        // 1. Detect
        const detection = await this.detect(projectRoot);
        log(`[Bootstrap] Detected stack: ${detection.stack.map(s => s.name).join(', ')}`);

        // 2. Scout Architecture
        log('[Bootstrap] Scaffolding architecture docs...');
        const scaffoldStats = await this.scaffoldArchitecture(projectRoot);
        log(`[Bootstrap] Created ${scaffoldStats.created} architecture docs`);

        // 3. Generate Rules
        log('[Bootstrap] Generating rules...');
        await this.generateRules(projectRoot, detection.stack);
        log('[Bootstrap] Rules generated.');

        // 4. Create Tasks
        log('[Bootstrap] Creating tasks...');
        await this.createBootstrapTasks(projectRoot, detection.docs, scaffoldStats.files);
        log('[Bootstrap] Tasks created.');
    }

    /**
     * Detect stack, docs, and tests
     */
    public async detect(projectRoot: string): Promise<DetectResult> {
        const stack = await this.detectStack(projectRoot);
        const docs = await this.detectDocs(projectRoot);
        const tests = await this.detectTests(projectRoot);

        // Simple file counting for patterns (simplified from python version)
        const patterns = {
            common_files: {},
            common_dirs: []
        };

        return { stack, docs, tests, patterns };
    }

    // --- Detection Primitives ---

    private async detectStack(projectRoot: string): Promise<StackItem[]> {
        const stack: StackItem[] = [];

        // 1. Languages
        const languages = [
            { name: "python", triggers: ["pyproject.toml", "requirements.txt", "**/*.py"], ext: "py" },
            { name: "typescript", triggers: ["tsconfig.json", "**/*.ts", "**/*.tsx"], ext: "ts" },
            { name: "javascript", triggers: ["package.json", "**/*.js", "**/*.jsx"], ext: "js" },
            { name: "go", triggers: ["go.mod", "**/*.go"], ext: "go" },
            { name: "rust", triggers: ["Cargo.toml", "**/*.rs"], ext: "rs" },
            { name: "java", triggers: ["pom.xml", "build.gradle", "**/*.java"], ext: "java" },
            { name: "cpp", triggers: ["CMakeLists.txt", "Makefile", "**/*.cpp", "**/*.cc"], ext: "cpp" }
        ];

        for (const lang of languages) {
            if (await this.checkTriggers(projectRoot, lang.triggers)) {
                stack.push({
                    name: `${lang.name}.md`,
                    category: 'Language',
                    template: 'templates/rules/languages.md',
                    replacements: {
                        '[Language Name]': this.capitalize(lang.name),
                        '[Language]': this.capitalize(lang.name),
                        '[extension]': lang.ext
                    },
                    globs: GLOB_MAPPINGS[lang.name]
                });
            }
        }

        // 2. Linters
        const tools = [
            { name: "eslint", triggers: ["package.json", ".eslintrc*", "eslint.config.js"] },
            { name: "prettier", triggers: ["package.json", ".prettierrc*", "prettier.config.js"] },
            { name: "ruff", triggers: ["pyproject.toml", "ruff.toml"] }
        ];

        for (const tool of tools) {
            if (await this.checkTriggers(projectRoot, tool.triggers, tool.name)) {
                stack.push({
                    name: `${tool.name}.md`,
                    category: 'Linter',
                    template: 'templates/rules/linters.md',
                    replacements: {
                        '[Linter Name]': this.capitalize(tool.name),
                        '[Linter/Tool Name]': this.capitalize(tool.name),
                        '[Tool Name]': this.capitalize(tool.name),
                        '[config_file_ext]': (tool.name === 'eslint' || tool.name === 'prettier') ? 'json' : 'toml'
                    }
                });
            }
        }

        // 3. Libraries
        const libs = [
            { name: "docker", triggers: ["Dockerfile", "docker-compose.yml"] },
            { name: "react", triggers: ["package.json"] },
            { name: "django", triggers: ["requirements.txt", "pyproject.toml"] },
            { name: "fastapi", triggers: ["requirements.txt", "pyproject.toml"] },
            { name: "next", triggers: ["package.json", "next.config.js"] }
        ];

        for (const lib of libs) {
            if (await this.checkTriggers(projectRoot, lib.triggers, lib.name)) {
                stack.push({
                    name: `${lib.name}.md`,
                    category: 'Library',
                    template: 'templates/rules/libraries.md',
                    replacements: {
                        '[Library Name]': this.capitalize(lib.name)
                    },
                    globs: GLOB_MAPPINGS[lib.name]
                });
            }
        }

        return stack;
    }

    private async detectDocs(projectRoot: string): Promise<DocStatus> {
        const docs: DocStatus = {
            prd: null,
            nonnegotiables: null,
            architecture: null,
            readme: null,
            contributing: null,
            changelog: null,
            existing_docs_folder: null
        };

        // Check PRD
        const prdPatterns = ["docs/prd*.md", "PRD.md", "prd.md"];
        for (const p of prdPatterns) {
            const matches = await vscode.workspace.findFiles(new vscode.RelativePattern(projectRoot, p), null, 1);
            if (matches.length > 0) {
                docs.prd = path.relative(projectRoot, matches[0].fsPath);
                break;
            }
        }

        // Check README
        const readmePath = path.join(projectRoot, 'README.md');
        if (fs.existsSync(readmePath)) {
            const content = fs.readFileSync(readmePath, 'utf8');
            const words = content.split(/\s+/).length;
            docs.readme = words > 500 ? 'comprehensive' : (words > 100 ? 'basic' : 'minimal');
        }

        return docs;
    }

    private async detectTests(projectRoot: string): Promise<TestStatus> {
        const tests: TestStatus = {
            exists: false,
            framework: null,
            ci_configured: false,
            test_dirs: []
        };

        const testDirs = ["tests", "test", "__tests__", "spec"];
        for (const d of testDirs) {
            if (fs.existsSync(path.join(projectRoot, d))) {
                tests.exists = true;
                tests.test_dirs.push(d);
            }
        }

        // Simple framework check
        const pkgJson = path.join(projectRoot, 'package.json');
        if (fs.existsSync(pkgJson)) {
            const content = fs.readFileSync(pkgJson, 'utf8').toLowerCase();
            if (content.includes('jest')) { tests.framework = 'jest'; }
            else if (content.includes('vitest')) { tests.framework = 'vitest'; }
            else if (content.includes('mocha')) { tests.framework = 'mocha'; }
        }

        return tests;
    }

    // --- Scaffolding Primitives ---

    public async scaffoldArchitecture(projectRoot: string): Promise<{ created: number; files: string[] }> {
        const archDir = path.join(projectRoot, '.dev_ops', 'docs', 'architecture');
        fs.mkdirSync(archDir, { recursive: true });

        const templatePath = path.join(this.extensionPath, 'dist', 'assets', 'templates', 'docs', 'architecture_doc.md');
        let templateContent = "";
        if (fs.existsSync(templatePath)) {
            templateContent = fs.readFileSync(templatePath, 'utf8');
        } else {
            // Fallback template
            templateContent = `---
title: "{title}"
type: doc
path: "{path}"
---
# {title}

## Purpose
<!-- What does this component do? -->

## Public Interface
<!-- Key exports -->
`;
        }

        let createdCount = 0;
        const createdFiles: string[] = [];
        const processed = new Set<string>();

        // Recursive walker
        const walk = (dir: string, depth: number) => {
            if (depth > 4) { return; }

            const name = path.basename(dir);
            if (EXCLUDED_DIRS.has(name) || name.startsWith('.')) { return; }

            // Check for code files
            let hasCode = false;
            try {
                const files = fs.readdirSync(dir);
                for (const f of files) {
                    if (['.ts', '.js', '.py', '.go', '.rs'].includes(path.extname(f))) {
                        hasCode = true;
                        break;
                    }
                }

                // If directory has code, create doc
                if (hasCode) {
                    const relPath = path.relative(projectRoot, dir);
                    if (relPath && !processed.has(relPath)) {
                        const docPath = path.join(archDir, `${relPath}.md`);
                        if (!fs.existsSync(docPath)) {
                            fs.mkdirSync(path.dirname(docPath), { recursive: true });
                            let content = templateContent
                                .replace(/{title}/g, name)
                                .replace(/{path}/g, relPath);
                            fs.writeFileSync(docPath, content);
                            createdCount++;
                            createdFiles.push(relPath);
                        }
                        processed.add(relPath);
                    }
                }

                // Recurse
                for (const f of files) {
                    const fullPath = path.join(dir, f);
                    if (fs.statSync(fullPath).isDirectory()) {
                        walk(fullPath, depth + 1);
                    }
                }
            } catch (e) {
                // Ignore permission errors
            }
        };

        walk(projectRoot, 0);
        return { created: createdCount, files: createdFiles };
    }

    // --- Rule Generation Primitives ---

    public async generateRules(projectRoot: string, stack: StackItem[]): Promise<void> {
        // Read selected IDEs from config (set during onboarding)
        let selectedIDEs: string[] = ['antigravity']; // Default
        const configPath = path.join(projectRoot, '.dev_ops', 'config.json');
        if (fs.existsSync(configPath)) {
            try {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
                if (config.selectedIDEs && Array.isArray(config.selectedIDEs) && config.selectedIDEs.length > 0) {
                    selectedIDEs = config.selectedIDEs;
                }
            } catch { /* Use default */ }
        }

        // Generate rules for each selected IDE
        for (const ide of selectedIDEs) {
            let rulesDir: string;
            if (ide === 'cursor') {
                rulesDir = path.join(projectRoot, '.cursor', 'rules');
            } else {
                rulesDir = path.join(projectRoot, '.agent', 'rules');
            }

            // Ensure directory exists
            fs.mkdirSync(rulesDir, { recursive: true });

            for (const item of stack) {
                const templatePath = path.join(this.extensionPath, 'dist', 'assets', item.template);
                let content = "";

                if (fs.existsSync(templatePath)) {
                    content = fs.readFileSync(templatePath, 'utf8');
                } else {
                    warn(`Template not found: ${templatePath}`);
                    continue;
                }

                // Replacements
                for (const [key, value] of Object.entries(item.replacements)) {
                    content = content.replace(new RegExp(key.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&'), 'g'), value);
                }

                // IDE Specifics
                if (ide === 'cursor') {
                    content = this.convertToCursorFormat(content, item.globs);
                }

                const destPath = path.join(rulesDir, ide === 'cursor' ? item.name.replace('.md', '.mdc') : item.name);

                if (!fs.existsSync(destPath) || !fs.readFileSync(destPath, 'utf8').includes('<!-- dev-ops-customized -->')) {
                    fs.writeFileSync(destPath, content);
                }
            }

            log(`[Bootstrap] Generated rules for ${ide} in ${rulesDir}`);
        }
    }

    // --- Helpers ---

    private async checkTriggers(root: string, triggers: string[], contentSearch?: string): Promise<boolean> {
        for (const t of triggers) {
            if (t.includes('*')) {
                const found = await vscode.workspace.findFiles(new vscode.RelativePattern(root, t), '**/node_modules/**', 1);
                if (found.length > 0) { return true; }
            } else {
                const p = path.join(root, t);
                if (fs.existsSync(p)) {
                    if (contentSearch) {
                        const content = fs.readFileSync(p, 'utf8').toLowerCase();
                        if (content.includes(contentSearch.toLowerCase())) { return true; }
                    } else {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    private capitalize(s: string): string {
        return s.charAt(0).toUpperCase() + s.slice(1);
    }

    private convertToCursorFormat(content: string, globs?: string[]): string {
        // Basic frontmatter conversion logic similar to installer.ts
        // For brevity/robustness, we might want to re-use installer logic or keep it simple
        const lines = content.split('\n');
        const newLines: string[] = [];
        let inFrontmatter = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.trim() === '---') {
                if (!inFrontmatter) {
                    inFrontmatter = true;
                    newLines.push('---');
                    newLines.push(`description: Generated rule for ${globs ? globs.join(', ') : 'project'}`);
                    if (globs) { newLines.push(`globs: ${globs.join(', ')}`); }
                } else {
                    inFrontmatter = false;
                    newLines.push('---');
                }
            } else if (inFrontmatter) {
                // Skip original frontmatter to avoid duplication/confusion if needed, 
                // or just pass through. Cursor MDC format is specific.
            } else {
                newLines.push(line);
            }
        }
        return newLines.join('\n');
    }
    // --- Task Creation ---

    public async createBootstrapTasks(projectRoot: string, docs: DocStatus, scaffoldedDocs: string[]): Promise<void> {
        const boardPath = path.join(projectRoot, '.dev_ops', 'board.json');
        if (!fs.existsSync(boardPath)) {
            warn(`[Bootstrap] Board not found at ${boardPath}, skipping task creation.`);
            return;
        }

        let board: any;
        try {
            board = JSON.parse(fs.readFileSync(boardPath, 'utf8'));
        } catch (e) {
            warn(`[Bootstrap] Failed to parse board.json: ${e}`);
            return;
        }

        // Helper to check duplicates
        const taskExists = (title: string) => {
            return board.items.some((t: any) => t.title === title);
        };

        const tasksToCreate: { title: string, summary: string, priority: 'high' | 'medium' }[] = [];

        // 1. Architecture (Highest Priority - Understanding Current State)
        const archTitle = "Document System Architecture";
        if (scaffoldedDocs.length > 0 && !taskExists(archTitle)) {
            tasksToCreate.push({
                title: archTitle,
                summary: `Comprehensive documentation of the system architecture. \n\nTarget components:\n${scaffoldedDocs.map(d => `- ${d}`).join('\n')}\n\nStrategy:\n1. Analyze codebase to understand current state.\n2. Document component purposes, interfaces, and dependencies.\n3. Ensure accurate reflection of the code (RLM phase 1).`,
                priority: "high"
            });
        }

        // 2. PRD (Vision - What it's supposed to be)
        if (!docs.prd && !taskExists("Create PRD")) {
            tasksToCreate.push({
                title: "Create PRD",
                summary: "Define product vision using template at .dev_ops/templates/docs/prd.md. Ensure distinct separation from UX artifacts (stories/personas).",
                priority: "high"
            });
        }

        // 3. Non-negotiables (Constraints)
        if (!docs.nonnegotiables && !taskExists("Create Non-Negotiables")) {
            tasksToCreate.push({
                title: "Create Non-Negotiables",
                summary: "Define non-negotiable requirements and constraints using template at .dev_ops/templates/docs/nonnegotiables.md.",
                priority: "high"
            });
        }

        // 4. Rule Customization
        const agentRules = path.join(projectRoot, '.agent', 'rules');
        const cursorRules = path.join(projectRoot, '.cursor', 'rules');
        const hasRules = (fs.existsSync(agentRules) && fs.readdirSync(agentRules).length > 0) ||
            (fs.existsSync(cursorRules) && fs.readdirSync(cursorRules).length > 0);

        if (hasRules && !taskExists("Review and Customize Rules")) {
            tasksToCreate.push({
                title: "Review and Customize Rules",
                summary: "Review the automatically generated rules in `.agent/rules` or `.cursor/rules`. Customize them to match project-specific coding standards and patterns.",
                priority: "medium"
            });
        }

        // Create tasks sequentially
        for (const t of tasksToCreate) {
            await createTask(board, 'col-backlog', t.title, t.summary, t.priority);
        }

        if (tasksToCreate.length > 0) {
            log(`[Bootstrap] Created ${tasksToCreate.length} tasks on board.`);
        }
    }


}
