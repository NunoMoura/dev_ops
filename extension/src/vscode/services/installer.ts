/**
 * DevOps Framework Installer
 * 
 * Handles initial installation of the DevOps framework into user projects.
 * This is NOT called by agents - it runs once when the extension initializes.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { log, error as logError } from '../../core';

// Framework version from package.json
const FRAMEWORK_VERSION = require('../../../package.json').version;

// Default board columns
const DEFAULT_COLUMNS = [
    { id: 'col-backlog', title: 'Backlog' },
    { id: 'col-understand', title: 'Understand' },
    { id: 'col-plan', title: 'Plan' },
    { id: 'col-build', title: 'Build' },
    { id: 'col-verify', title: 'Verify' },
    { id: 'col-done', title: 'Done' }
];

export interface InstallerOptions {
    projectRoot: string;
    ide: 'antigravity' | 'cursor';
    projectType?: 'greenfield' | 'brownfield' | 'fresh';
    githubWorkflows?: boolean;
}

export interface InstallerResult {
    success: boolean;
    rulesInstalled: number;
    workflowsInstalled: number;
    skillsInstalled: number;
    message: string;
}

/**
 * Check if file needs updating (missing or different size)
 */
function needsUpdate(srcPath: string, destPath: string): boolean {
    if (!fs.existsSync(destPath)) {
        return true;
    }
    const srcSize = fs.statSync(srcPath).size;
    const destSize = fs.statSync(destPath).size;
    return srcSize !== destSize;
}

/**
 * Copy a directory recursively
 */
function copyDirRecursive(src: string, dest: string): { copied: number; skipped: number } {
    let copied = 0;
    let skipped = 0;

    if (!fs.existsSync(src)) {
        log(`[installer] Skipping missing directory: ${src}`);
        return { copied, skipped };
    }

    fs.mkdirSync(dest, { recursive: true });

    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            const result = copyDirRecursive(srcPath, destPath);
            copied += result.copied;
            skipped += result.skipped;
        } else {
            if (needsUpdate(srcPath, destPath)) {
                fs.copyFileSync(srcPath, destPath);
                copied++;
            } else {
                skipped++;
            }
        }
    }

    return { copied, skipped };
}

/**
 * Get IDE-specific paths for rules and workflows
 */
function getIdePaths(projectRoot: string, ide: string): {
    agentDir: string;
    rulesDir: string;
    workflowsDir: string;
    skillsDir: string;
    fileExt: string;
} {
    if (ide === 'cursor') {
        const agentDir = path.join(projectRoot, '.cursor');
        return {
            agentDir,
            rulesDir: path.join(agentDir, 'rules'),
            workflowsDir: path.join(agentDir, 'commands'),
            skillsDir: path.join(agentDir, 'skills'), // Cursor supports skills in nightly+
            fileExt: '.mdc'
        };
    }
    // antigravity / vscode
    const agentDir = path.join(projectRoot, '.agent');
    return {
        agentDir,
        rulesDir: path.join(agentDir, 'rules'),
        workflowsDir: path.join(agentDir, 'workflows'),
        skillsDir: path.join(agentDir, 'skills'),
        fileExt: '.md'
    };
}

/**
 * Initialize empty DevOps board
 */
function initBoard(projectRoot: string): void {
    const devOpsDir = path.join(projectRoot, '.dev_ops');
    const boardPath = path.join(devOpsDir, 'board.json');

    if (fs.existsSync(boardPath)) {
        log('[installer] Board already exists');
        return;
    }

    fs.mkdirSync(devOpsDir, { recursive: true });

    const initialBoard = {
        version: 1,
        columns: DEFAULT_COLUMNS,
        items: [] // Empty - /bootstrap generates tasks
    };

    fs.writeFileSync(boardPath, JSON.stringify(initialBoard, null, 2));
    log('[installer] Board initialized');
}

/**
 * Convert Antigravity frontmatter to Cursor format
 */
function convertFrontmatterForCursor(content: string): string {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
    if (!frontmatterMatch) {
        return content;
    }

    const frontmatter = frontmatterMatch[1];
    const body = content.slice(frontmatterMatch[0].length);

    const alwaysApply = frontmatter.includes('activation_mode: Always On');

    // Extract description
    const descMatch = frontmatter.match(/description:\s*(.+?)(?:\n|$)/);
    const description = descMatch ? descMatch[1].trim() : '';

    // Extract globs
    const globsMatch = frontmatter.match(/globs:\s*(\[.*?\])/);
    const globs = globsMatch ? globsMatch[1] : '';

    const newLines: string[] = [];
    newLines.push(`alwaysApply: ${alwaysApply}`);
    if (globs) {
        newLines.push(`globs: ${globs}`);
    }
    if (description) {
        newLines.push(`description: ${description}`);
    }

    return `---\n${newLines.join('\n')}\n---\n${body}`;
}

/**
 * Install rules from assets to project
 */
function installRules(
    srcDir: string,
    destDir: string,
    ide: string
): number {
    if (!fs.existsSync(srcDir)) {
        logError(`[installer] Rules source not found: ${srcDir}`);
        return 0;
    }

    fs.mkdirSync(destDir, { recursive: true });
    let installed = 0;

    const files = fs.readdirSync(srcDir).filter(f => f.endsWith('.md'));
    for (const file of files) {
        const srcPath = path.join(srcDir, file);
        let destFile = file;

        // Convert extension for Cursor
        if (ide === 'cursor' && file.endsWith('.md')) {
            destFile = file.replace('.md', '.mdc');
        }

        const destPath = path.join(destDir, destFile);

        // Check for user customization marker
        if (fs.existsSync(destPath)) {
            const existing = fs.readFileSync(destPath, 'utf8');
            if (existing.includes('<!-- dev-ops-customized -->')) {
                log(`[installer] Skipping customized rule: ${file}`);
                continue;
            }
        }

        let content = fs.readFileSync(srcPath, 'utf8');

        if (ide === 'cursor') {
            content = convertFrontmatterForCursor(content);
        }

        // Add customization protection marker
        if (!content.includes('<!-- dev-ops-customized -->')) {
            content += "\n\n<!-- To prevent automatic updates, add '<!-- dev-ops-customized -->' to this file -->\n";
        }

        fs.writeFileSync(destPath, content);
        installed++;
    }

    return installed;
}

/**
 * Install workflows from assets to project
 */
function installWorkflows(srcDir: string, destDir: string): number {
    if (!fs.existsSync(srcDir)) {
        logError(`[installer] Workflows source not found: ${srcDir}`);
        return 0;
    }

    const result = copyDirRecursive(srcDir, destDir);
    return result.copied;
}

/**
 * Install skills from assets to project
 * Works for both Antigravity (.agent/skills) and Cursor (.cursor/skills)
 */
function installSkills(srcDir: string, destDir: string): number {
    if (!fs.existsSync(srcDir)) {
        log(`[installer] Skills source not found: ${srcDir}`);
        return 0;
    }

    const result = copyDirRecursive(srcDir, destDir);
    return result.copied;
}

/**
 * Main installation function
 */
export async function install(
    extensionPath: string,
    options: InstallerOptions
): Promise<InstallerResult> {
    const { projectRoot, ide, githubWorkflows } = options;

    log(`[installer] Installing DevOps framework to ${projectRoot}`);
    log(`[installer] IDE: ${ide}, Version: ${FRAMEWORK_VERSION}`);

    // Locate assets directory
    const assetsDir = path.join(extensionPath, 'dist', 'assets');
    if (!fs.existsSync(assetsDir)) {
        return {
            success: false,
            rulesInstalled: 0,
            workflowsInstalled: 0,
            skillsInstalled: 0,
            message: `Assets directory not found: ${assetsDir}`
        };
    }

    // Source directories
    const rulesSrc = path.join(assetsDir, 'rules');
    const workflowsSrc = path.join(assetsDir, 'workflows');
    const skillsSrc = path.join(assetsDir, 'skills');
    const templatesSrc = path.join(assetsDir, 'templates');
    const scriptsSrc = path.join(assetsDir, 'scripts');
    const docsTemplatesSrc = path.join(templatesSrc, 'docs');

    // Get IDE-specific destination paths
    const paths = getIdePaths(projectRoot, ide);

    // Create .dev_ops structure
    const devOpsDir = path.join(projectRoot, '.dev_ops');
    const devOpsDocsDir = path.join(devOpsDir, 'docs');
    const devOpsArchiveDir = path.join(devOpsDir, 'archive');
    const devOpsScriptsDir = path.join(devOpsDir, 'scripts');
    const devOpsTemplatesDir = path.join(devOpsDir, 'templates');

    // Create directories
    fs.mkdirSync(path.join(devOpsDocsDir, 'architecture'), { recursive: true });
    fs.mkdirSync(path.join(devOpsDocsDir, 'ux', 'personas'), { recursive: true });
    fs.mkdirSync(path.join(devOpsDocsDir, 'ux', 'stories'), { recursive: true });
    fs.mkdirSync(path.join(devOpsDocsDir, 'ux', 'mockups'), { recursive: true });
    fs.mkdirSync(devOpsArchiveDir, { recursive: true });

    // Initialize archive index
    const archiveIndexPath = path.join(devOpsArchiveDir, 'index.json');
    if (!fs.existsSync(archiveIndexPath)) {
        fs.writeFileSync(archiveIndexPath, JSON.stringify({ version: 1, archives: [] }, null, 2));
    }

    // Write version.json
    const versionPath = path.join(devOpsDir, 'version.json');
    fs.writeFileSync(versionPath, JSON.stringify({ version: FRAMEWORK_VERSION }, null, 2));
    log(`[installer] Framework version: ${FRAMEWORK_VERSION}`);

    // Initialize board
    initBoard(projectRoot);

    // Install scripts
    if (fs.existsSync(scriptsSrc)) {
        copyDirRecursive(scriptsSrc, devOpsScriptsDir);

        // Create __init__.py for imports
        const initPath = path.join(devOpsScriptsDir, '__init__.py');
        if (!fs.existsSync(initPath)) {
            fs.writeFileSync(initPath, '"""DevOps framework scripts."""\n');
        }
        log('[installer] Scripts installed');
    }

    // Install templates
    if (fs.existsSync(templatesSrc)) {
        copyDirRecursive(templatesSrc, devOpsTemplatesDir);
        log('[installer] Templates installed');
    }

    // Install rules
    const rulesInstalled = installRules(rulesSrc, paths.rulesDir, ide);
    log(`[installer] ${rulesInstalled} rules installed`);

    // Install workflows
    const workflowsInstalled = installWorkflows(workflowsSrc, paths.workflowsDir);
    log(`[installer] ${workflowsInstalled} workflows installed`);

    // Install skills (both Antigravity and Cursor support skills)
    const skillsInstalled = installSkills(skillsSrc, paths.skillsDir);
    log(`[installer] ${skillsInstalled} skill files installed to ${paths.skillsDir}`);

    // Install nonnegotiables template
    const nonnegSrc = path.join(docsTemplatesSrc, 'nonnegotiables.md');
    const nonnegDest = path.join(devOpsDocsDir, 'nonnegotiables.md');
    if (fs.existsSync(nonnegSrc) && !fs.existsSync(nonnegDest)) {
        fs.copyFileSync(nonnegSrc, nonnegDest);
        log('[installer] Nonnegotiables template installed');
    }

    // Install GitHub workflows if requested
    if (githubWorkflows) {
        const prTriageSrc = path.join(templatesSrc, 'github', 'pr_triage.yml');
        if (fs.existsSync(prTriageSrc)) {
            const githubDest = path.join(projectRoot, '.github', 'workflows');
            fs.mkdirSync(githubDest, { recursive: true });
            const prTriageDest = path.join(githubDest, 'pr_triage.yml');

            if (!fs.existsSync(prTriageDest)) {
                fs.copyFileSync(prTriageSrc, prTriageDest);
                log('[installer] PR triage workflow installed');
            }
        }
    }

    return {
        success: true,
        rulesInstalled,
        workflowsInstalled,
        skillsInstalled,
        message: 'DevOps framework installed successfully'
    };
}

/**
 * Check if framework is already installed
 */
export function isInstalled(projectRoot: string): boolean {
    const boardPath = path.join(projectRoot, '.dev_ops', 'board.json');
    return fs.existsSync(boardPath);
}

/**
 * Get installed framework version
 */
export function getInstalledVersion(projectRoot: string): string | null {
    const versionPath = path.join(projectRoot, '.dev_ops', 'version.json');
    if (!fs.existsSync(versionPath)) {
        return null;
    }
    try {
        const data = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
        return data.version || null;
    } catch {
        return null;
    }
}
