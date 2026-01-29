import * as fs from 'fs';
import fg from 'fast-glob';
import { Workspace } from '../types';

/**
 * Node.js implementation of the Workspace interface.
 * Uses 'fs' and 'fast-glob' for file operations.
 */
export class NodeWorkspace implements Workspace {
    constructor(public root: string) { }

    async findFiles(pattern: string, exclude?: string | null, maxResults?: number): Promise<string[]> {
        const ignore = exclude ? [exclude] : ['**/node_modules/**'];
        const entries = await fg(pattern, {
            ignore,
            cwd: this.root,
            absolute: true
        });
        if (maxResults && entries.length > maxResults) {
            return entries.slice(0, maxResults);
        }
        return entries;
    }

    async readFile(path: string): Promise<string> {
        return fs.promises.readFile(path, 'utf8');
    }

    async writeFile(path: string, content: string): Promise<void> {
        await fs.promises.writeFile(path, content, 'utf8');
    }

    async exists(path: string): Promise<boolean> {
        return fs.existsSync(path);
    }

    async mkdir(path: string): Promise<void> {
        await fs.promises.mkdir(path, { recursive: true });
    }
}
