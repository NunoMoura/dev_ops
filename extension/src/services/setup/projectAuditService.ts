import * as path from 'path';
import { IWorkspace } from '../../common/types';

export interface ProjectContext {
    stack: StackItem[];
    docs: DocStatus;
    tests: TestStatus;
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

export class ProjectAuditService {
    constructor(protected workspace: IWorkspace) { }

    public async audit(): Promise<ProjectContext> {
        const stack = await this.detectStack();
        const docs = await this.detectDocs();
        const tests = await this.detectTests();
        const specs = await this.findSpecs();

        return { stack, docs, tests, specs };
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

    private async findSpecs(): Promise<string[]> {
        const specs: string[] = [];
        const matches = await this.workspace.findFiles('**\/SPEC.md', '**/node_modules/**', 50);
        for (const m of matches) {
            specs.push(path.relative(this.workspace.root, m));
        }
        return specs;
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
}
