import * as path from 'path';
import { IWorkspace, IProgress } from '../types';
import { CoreTaskService } from './taskService';

export interface DetectResult {
    stack: StackItem[];
    docs: DocStatus;
    tests: TestStatus;
    patterns: {
        common_files: Record<string, number>;
        common_dirs: string[];
    };
    specs: string[];
}

export interface StackItem {
    name: string;
    category: 'Language' | 'Linter' | 'Library' | 'Database';
    template: string;
    replacements: Record<string, string>;
    version?: string;
    globs?: string[];
}

export interface DocStatus {
    prd: string | null;
    projectStandards: string | null;
    readme: 'comprehensive' | 'basic' | 'minimal' | null;
    contributing: string | null;
    changelog: string | null;
    existing_docs_folder: string | null;
}

export interface TestStatus {
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

export class CoreBootstrapService {
    constructor(
        protected workspace: IWorkspace,
        protected taskService: CoreTaskService,
        protected extensionPath: string,
        protected templateRoot?: string
    ) { }

    public async bootstrap(progress?: IProgress): Promise<void> {
        progress?.report({ message: 'Starting project analysis...' });

        // 1. Detect
        const detection = await this.detect();

        // 2. Scout Components (RLM)
        progress?.report({ message: 'Scanning for components...' });
        const specs = await this.findSpecs();

        // 3. Generate Rules
        progress?.report({ message: 'Generating rules...' });
        await this.generateRules(detection.stack);

        // 4. Create Tasks
        progress?.report({ message: 'Creating tasks...' });
        await this.createBootstrapTasks(detection.docs, specs);
    }

    public async detect(): Promise<DetectResult> {
        const stack = await this.detectStack();
        const docs = await this.detectDocs();
        const tests = await this.detectTests();

        const patterns = {
            common_files: {},
            common_dirs: []
        };

        return { stack, docs, tests, patterns, specs: [] };
    }

    private async detectStack(): Promise<StackItem[]> {
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
            if (await this.checkTriggers(lang.triggers)) {
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
            if (await this.checkTriggers(tool.triggers, tool.name)) {
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
            if (await this.checkTriggers(lib.triggers, lib.name)) {
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

    private async detectDocs(): Promise<DocStatus> {
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
            const matches = await this.workspace.findFiles(p, null, 1);
            if (matches.length > 0) {
                docs.prd = path.relative(this.workspace.root, matches[0]);
                break;
            }
        }

        // Check Project Standards
        const stdPatterns = ["docs/project_standards.md", "docs/standards.md", "standards.md", "project_standards.md"];
        for (const p of stdPatterns) {
            const matches = await this.workspace.findFiles(p, null, 1);
            if (matches.length > 0) {
                docs.projectStandards = path.relative(this.workspace.root, matches[0]);
                break;
            }
        }

        // Check README
        const readmePath = path.join(this.workspace.root, 'README.md');
        if (await this.workspace.exists(readmePath)) {
            const content = await this.workspace.readFile(readmePath);
            const words = content.split(/\s+/).length;
            docs.readme = words > 500 ? 'comprehensive' : (words > 100 ? 'basic' : 'minimal');
        }

        return docs;
    }

    private async detectTests(): Promise<TestStatus> {
        const tests: TestStatus = {
            exists: false,
            framework: null,
            ci_configured: false,
            test_dirs: []
        };

        const testDirs = ["tests", "test", "__tests__", "spec"];
        for (const d of testDirs) {
            if (await this.workspace.exists(path.join(this.workspace.root, d))) {
                tests.exists = true;
                tests.test_dirs.push(d);
            }
        }

        // Simple framework check
        const pkgJson = path.join(this.workspace.root, 'package.json');
        if (await this.workspace.exists(pkgJson)) {
            const content = (await this.workspace.readFile(pkgJson)).toLowerCase();
            if (content.includes('jest')) { tests.framework = 'jest'; }
            else if (content.includes('vitest')) { tests.framework = 'vitest'; }
            else if (content.includes('mocha')) { tests.framework = 'mocha'; }
        }

        return tests;
    }

    public async findSpecs(): Promise<string[]> {
        const specs: string[] = [];
        const matches = await this.workspace.findFiles('**\/SPEC.md', '**/node_modules/**', 50);
        for (const m of matches) {
            specs.push(path.relative(this.workspace.root, m));
        }
        return specs;
    }

    public async generateRules(stack: StackItem[]): Promise<void> {
        let selectedIDEs: string[] = ['antigravity']; // Default
        const configPath = path.join(this.workspace.root, '.dev_ops', 'config.json');

        if (await this.workspace.exists(configPath)) {
            try {
                const configContent = await this.workspace.readFile(configPath);
                const config = JSON.parse(configContent);
                if (config.selectedIDEs && Array.isArray(config.selectedIDEs) && config.selectedIDEs.length > 0) {
                    selectedIDEs = config.selectedIDEs;
                }
            } catch { /* Use default */ }
        }

        for (const ide of selectedIDEs) {
            let rulesDir: string;
            if (ide === 'cursor') {
                rulesDir = path.join(this.workspace.root, '.cursor', 'rules');
            } else {
                rulesDir = path.join(this.workspace.root, '.agent', 'rules');
            }

            if (!await this.workspace.exists(rulesDir)) {
                await this.workspace.mkdir(rulesDir);
            }

            for (const item of stack) {
                // Determine template path
                // Priority 1: .dev_ops/templates (User customized or installed) - or explicit templateRoot from CLI
                // Priority 2: extensionPath/dist/assets/templates (Extension bundled)

                let userTemplatePath = path.join(this.workspace.root, '.dev_ops', item.template);
                if (this.templateRoot) {
                    userTemplatePath = path.join(this.templateRoot, item.template);
                }

                const bundledTemplatePath = path.join(this.extensionPath, 'dist', 'assets', item.template);

                let content = "";

                if (await this.workspace.exists(userTemplatePath)) {
                    content = await this.workspace.readFile(userTemplatePath);
                } else if (await this.workspace.exists(bundledTemplatePath)) {
                    content = await this.workspace.readFile(bundledTemplatePath);
                } else {
                    // warn(`Template not found: ${item.template}`);
                    continue;
                }

                for (const [key, value] of Object.entries(item.replacements)) {
                    content = content.replace(new RegExp(key.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&'), 'g'), value);
                }

                if (ide === 'cursor') {
                    content = this.convertToCursorFormat(content, item.globs);
                }

                const destPath = path.join(rulesDir, ide === 'cursor' ? item.name.replace('.md', '.mdc') : item.name);

                if (!await this.workspace.exists(destPath)) {
                    await this.workspace.writeFile(destPath, content);
                } else {
                    const existing = await this.workspace.readFile(destPath);
                    if (!existing.includes('<!-- dev-ops-customized -->')) {
                        await this.workspace.writeFile(destPath, content);
                    }
                }
            }
        }
    }

    private async checkTriggers(triggers: string[], contentSearch?: string): Promise<boolean> {
        for (const t of triggers) {
            if (t.includes('*')) {
                const found = await this.workspace.findFiles(t, '**/node_modules/**', 1);
                if (found.length > 0) { return true; }
            } else {
                const p = path.join(this.workspace.root, t);
                if (await this.workspace.exists(p)) {
                    if (contentSearch) {
                        const content = (await this.workspace.readFile(p)).toLowerCase();
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
                // Skip original frontmatter
            } else {
                newLines.push(line);
            }
        }
        return newLines.join('\n');
    }

    public async createBootstrapTasks(docs: DocStatus, components: string[]): Promise<void> {
        const board = await this.taskService.readBoard();
        const taskExists = (title: string) => board.items.some(t => t.title === title);

        const tasksToCreate: { title: string, summary: string, priority: 'high' | 'medium' }[] = [];

        // 1. Architecture
        const archTitle = "Document System Architecture";
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

        // 2. PRD
        if (!taskExists("Define Product Requirements")) {
            tasksToCreate.push({
                title: "Define Product Requirements",
                summary: "Analyze the project to define Product Requirements.\n\nStrategy:\n1. Search for existing PRD-like documents (e.g., `requirements.md`, `specs/*.md`, or in `docs/`).\n2. Create a new `.dev_ops/docs/prd.md` using the template at `.dev_ops/templates/docs/prd.md`.\n   - If existing docs found: Migrate and structure relevant content into the new file.\n   - If no docs found: Create a draft based on codebase analysis and project intent.\n3. Request user review.",
                priority: "high"
            });
        }

        // 3. User Experience
        if (!taskExists("Define User Personas & Stories") && !docs.prd) {
            tasksToCreate.push({
                title: "Define User Personas & Stories",
                summary: "Define the User Experience artifacts based on the PRD and Codebase.\n\nStrategy:\n1. Analyze the PRD (or draft) and existing codebase to identify user roles and key workflows.\n2. Create `.dev_ops/docs/user.md` (Personas) using the template.\n3. Create `.dev_ops/docs/story.md` (User Stories) using the template.\n4. Ensure stories trace back to PRD requirements.",
                priority: "high"
            });
        }

        // 4. Project Standards
        if (!taskExists("Define Project Standards") && !docs.projectStandards) {
            tasksToCreate.push({
                title: "Define Project Standards",
                summary: "Define technical and product standards.\n\nStrategy:\n1. Search for existing constraint docs (e.g., `constraints.md`, `standards.md`).\n2. Create `.dev_ops/docs/project_standards.md` using the template at `.dev_ops/templates/docs/project_standards.md`.",
                priority: "high"
            });
        }

        // 5. Rule Customization
        const agentRules = path.join(this.workspace.root, '.agent', 'rules');
        const cursorRules = path.join(this.workspace.root, '.cursor', 'rules');
        // Simple check for existence since we can't easily readdir in IWorkspace right now without adding method
        // But since we just generated rules, we know they exist if this step ran.
        // Or checking dir existence is enough.
        const hasRules = (await this.workspace.exists(agentRules)) || (await this.workspace.exists(cursorRules));

        if (hasRules && !taskExists("Review and Customize Rules")) {
            tasksToCreate.push({
                title: "Review and Customize Rules",
                summary: "Review the automatically generated rules in `.agent/rules` or `.cursor/rules`. Customize them to match project-specific coding standards and patterns.",
                priority: "medium"
            });
        }

        for (const t of tasksToCreate) {
            await this.taskService.createTask('col-backlog', t.title, t.summary, t.priority);
        }
    }
}
