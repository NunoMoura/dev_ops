
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
    specs: string[]; // List of component paths with SPEC.md
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
    projectStandards: string | null;
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

// Global exclusion list for cleaner scaffolding
// Global exclusion list removed (logic moved to installer)

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

        // 2. Scout Components (RLM)
        log('[Bootstrap] Scanning for components...');
        const specs = await this.findSpecs(projectRoot);
        log(`[Bootstrap] Found ${specs.length} existing SPEC.md files`);

        // 3. Generate Rules
        log('[Bootstrap] Generating rules...');
        await this.generateRules(projectRoot, detection.stack);
        log('[Bootstrap] Rules generated.');

        // 4. Create Tasks
        log('[Bootstrap] Creating tasks...');
        await this.createBootstrapTasks(projectRoot, detection.docs, specs);
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

        return { stack, docs, tests, patterns, specs: [] };
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
            projectStandards: null,
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

        // Check Project Standards
        const stdPatterns = ["docs/project_standards.md", "docs/standards.md", "standards.md", "project_standards.md"];
        for (const p of stdPatterns) {
            const matches = await vscode.workspace.findFiles(new vscode.RelativePattern(projectRoot, p), null, 1);
            if (matches.length > 0) {
                docs.projectStandards = path.relative(projectRoot, matches[0].fsPath);
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

    public async findSpecs(projectRoot: string): Promise<string[]> {
        const specs: string[] = [];
        // Scan for existing SPEC.md files to inform the architecture task
        const matches = await vscode.workspace.findFiles(new vscode.RelativePattern(projectRoot, '**\/SPEC.md'), '**/node_modules/**', 50);
        for (const m of matches) {
            specs.push(path.relative(projectRoot, m.fsPath));
        }
        return specs;
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

    public async createBootstrapTasks(projectRoot: string, docs: DocStatus, components: string[]): Promise<void> {
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
        // Always create if not exists - critical for RLM
        if (!taskExists(archTitle)) {
            const existingSpecs = components.length > 0
                ? `Found existing SPEC.md files:\n${components.map(s => `- ${s}`).join('\n')}`
                : "No SPEC.md files found yet.";

            tasksToCreate.push({
                title: archTitle,
                summary: `Comprehensive documentation of the system architecture.\n\nContext:\n${existingSpecs}\n\nStrategy (RLM Pattern):\n1. Key components should have co-located \`SPEC.md\` files.\n2. Review existing code structure.\n3. For each major component lacking a SPEC, create one using the template.\n4. Ensure \`SPEC.md\` files describe exports, dependencies, and constraints.`,
                priority: "high"
            });
        }

        // 2. PRD (Vision - Review & Migrate)
        if (!taskExists("Define Product Requirements")) {
            tasksToCreate.push({
                title: "Define Product Requirements",
                summary: "Analyze the project to define Product Requirements.\n\nStrategy:\n1. Search for existing PRD-like documents (e.g., `requirements.md`, `specs/*.md`, or in `docs/`).\n2. Create a new `.dev_ops/docs/prd.md` using the template at `.dev_ops/templates/docs/prd.md`.\n   - If existing docs found: Migrate and structure relevant content into the new file.\n   - If no docs found: Create a draft based on codebase analysis and project intent.\n3. Request user review of the new PRD.\n4. Ask the user if they want to **delete** the original source files (if any). If NO, leave them untouched.",
                priority: "high"
            });
        }

        // 3. User Experience (Personas & Stories - Infer from PRD/Code)
        if (!taskExists("Define User Personas & Stories") && !docs.prd) { // Only if PRD task is also being created (or exists), otherwise these follow
            tasksToCreate.push({
                title: "Define User Personas & Stories",
                summary: "Define the User Experience artifacts based on the PRD and Codebase.\n\nStrategy:\n1. Analyze the PRD (or draft) and existing codebase to identify user roles and key workflows.\n2. Create `.dev_ops/docs/user.md` (Personas) using the template.\n3. Create `.dev_ops/docs/story.md` (User Stories) using the template.\n4. Ensure stories trace back to PRD requirements.\n5. Request user review.",
                priority: "high"
            });
        }

        // 4. Project Standards (formerly Non-Negotiables)
        if (!taskExists("Define Project Standards") && !docs.projectStandards) {
            tasksToCreate.push({
                title: "Define Project Standards",
                summary: "Define technical and product standards.\n\nStrategy:\n1. Search for existing constraint docs (e.g., `constraints.md`, `standards.md`).\n2. Create `.dev_ops/docs/project_standards.md` using the template at `.dev_ops/templates/docs/project_standards.md`.\n   - If existing docs found: Migrate content.\n   - If no docs found: define standard constraints based on the tech stack (detected earlier) and best practices.\n3. Request user review.",
                priority: "high"
            });
        }

        // 5. Rule Customization
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
