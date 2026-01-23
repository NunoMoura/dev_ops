import * as path from 'path';
import { IWorkspace } from '../types';

export interface ScopeResult {
    component: string;
    description?: string;
    specPath: string;
    dependencies: string[];
    files: string[];
}

export class CoreScopeService {
    constructor(private workspace: IWorkspace, private root: string) { }

    /**
     * Get the scope for a given path (finds nearest SPEC.md and resolves dependencies)
     */
    async getScope(targetPath: string): Promise<ScopeResult> {
        // 1. Find nearest SPEC.md
        const specPath = await this.findNearestSpec(targetPath);
        if (!specPath) {
            throw new Error(`No SPEC.md found for path: ${targetPath}`);
        }

        // 2. Parse SPEC.md for dependencies and description
        const content = await this.workspace.readFile(specPath);
        const dependencies = this.parseDependencies(content);
        const description = this.parseDescription(content);

        // 3. Find relevant files (glob from spec directory)
        const specDir = path.dirname(specPath);
        const globPattern = path.join(specDir, '**/*');
        // Exclude node_modules, etc. is handled by workspace.findFiles usually
        const files = await this.workspace.findFiles(globPattern, '**/node_modules/**');

        return {
            component: path.basename(specDir),
            description,
            specPath: path.relative(this.root, specPath),
            dependencies,
            files: files.map(f => path.relative(this.root, f))
        };
    }

    private async findNearestSpec(startPath: string): Promise<string | null> {
        let current = path.isAbsolute(startPath) ? startPath : path.resolve(this.root, startPath);

        // If file, start from dirname
        if (await this.workspace.exists(current)) {
            // check if directory
            // Actually workspace.exist doesn't tell if dir. 
            // Let's assume input path. 
            // If it ends in .md, use dirname.
            if (current.endsWith('.md') || current.includes('.')) { // heuristic
                current = path.dirname(current);
            }
        }

        while (current.startsWith(this.root)) {
            const candidate = path.join(current, 'SPEC.md');
            if (await this.workspace.exists(candidate)) {
                return candidate;
            }
            const parent = path.dirname(current);
            if (parent === current) { break; }
            current = parent;
        }
        return null;
    }

    private parseDependencies(content: string): string[] {
        const deps: string[] = [];
        const lines = content.split('\n');
        let inDeps = false;

        for (const line of lines) {
            if (line.trim().startsWith('### Dependencies') || line.trim().startsWith('## Dependencies')) {
                inDeps = true;
                continue;
            }
            if (inDeps && line.startsWith('#')) {
                inDeps = false;
                break;
            }
            if (inDeps) {
                // Link regex: [name](path)
                const match = line.match(/\[(.*?)\]\((.*?)\)/);
                if (match) {
                    deps.push(match[2]); // The path
                }
            }
        }
        return deps;
    }

    private parseDescription(content: string): string | undefined {
        // Grab first non-header line or metadata description
        // Simple heuristic: look for "description: " in frontmatter
        const match = content.match(/^description:\s*(.*)$/m);
        if (match) { return match[1]; }
        return undefined;
    }
}
