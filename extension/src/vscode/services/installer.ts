/**
 * DevOps Framework Installer
 * 
 * Handles initial installation of the DevOps framework into user projects.
 * This is NOT called by agents - it runs once when the extension initializes.
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { log, error as logError } from '../../core';
import { ProjectAuditService } from '../../core/services/projectAuditService';
import { IWorkspace } from '../../core/types';
import fg from 'fast-glob';

// Framework version from package.json
const FRAMEWORK_VERSION = require('../../../package.json').version;

// Default board columns
const DEFAULT_COLUMNS = [
    { id: 'col-backlog', name: 'Backlog' },
    { id: 'col-understand', name: 'Understand' },
    { id: 'col-plan', name: 'Plan' },
    { id: 'col-build', name: 'Build' },
    { id: 'col-verify', name: 'Verify' },
    { id: 'col-done', name: 'Done' }
];

export interface InstallerOptions {
    projectRoot: string;
    ide: 'antigravity' | 'cursor';
    projectType?: 'greenfield' | 'brownfield' | 'fresh';
    githubWorkflows?: boolean;
    force?: boolean;  // Force reinstall all files, ignoring hash checks
}

export interface InstallerResult {
    success: boolean;
    rulesInstalled: number;
    workflowsInstalled: number;
    skillsInstalled: number;
    filesUpdated: string[];  // List of files that were updated
    filesSkipped: string[];  // List of files skipped (customized or unchanged)
    wasUpgrade: boolean;     // True if this was a version upgrade
    message: string;
}

/**
 * Simple Workspace implementation for Installer (Node.js/FS based)
 */
class InstallerWorkspace implements IWorkspace {
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


/**
 * Get MD5 hash of file contents for comparison
 */
function getFileHash(filePath: string): string {
    const content = fs.readFileSync(filePath);
    return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * Check if file needs updating (missing or different content)
 */
function needsUpdate(srcPath: string, destPath: string, force: boolean = false): boolean {
    if (!fs.existsSync(destPath)) {
        return true;
    }
    if (force) {
        return true;
    }
    return getFileHash(srcPath) !== getFileHash(destPath);
}

/**
 * Check if file has customization marker
 */
function isCustomized(filePath: string): boolean {
    if (!fs.existsSync(filePath)) {
        return false;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return content.includes('<!-- dev-ops-customized -->');
}

/**
 * Compare semantic versions (simple comparison)
 */
function isNewerVersion(current: string | null, target: string): boolean {
    if (!current) {
        return true;
    }
    const parse = (v: string) => v.split('.').map(n => parseInt(n, 10) || 0);
    const [cMajor, cMinor, cPatch] = parse(current);
    const [tMajor, tMinor, tPatch] = parse(target);
    if (tMajor > cMajor) {
        return true;
    }
    if (tMajor === cMajor && tMinor > cMinor) {
        return true;
    }
    if (tMajor === cMajor && tMinor === cMinor && tPatch > cPatch) {
        return true;
    }
    return false;
}

interface CopyResult {
    copied: number;
    skipped: number;
    updatedFiles: string[];
    skippedFiles: string[];
}

/**
 * Copy a directory recursively with file tracking
 */
function copyDirRecursive(
    src: string,
    dest: string,
    options: { force?: boolean; checkCustomization?: boolean; basePath?: string } = {}
): CopyResult {
    const { force = false, checkCustomization = false, basePath = dest } = options;
    let copied = 0;
    let skipped = 0;
    const updatedFiles: string[] = [];
    const skippedFiles: string[] = [];

    if (!fs.existsSync(src)) {
        log(`[installer] Skipping missing directory: ${src}`);
        return { copied, skipped, updatedFiles, skippedFiles };
    }

    fs.mkdirSync(dest, { recursive: true });

    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        const relativePath = path.relative(basePath, destPath);

        if (entry.isDirectory()) {
            const result = copyDirRecursive(srcPath, destPath, { force, checkCustomization, basePath });
            copied += result.copied;
            skipped += result.skipped;
            updatedFiles.push(...result.updatedFiles);
            skippedFiles.push(...result.skippedFiles);
        } else {
            // Check customization if enabled
            if (checkCustomization && isCustomized(destPath)) {
                log(`[installer] Skipping customized: ${relativePath}`);
                skipped++;
                skippedFiles.push(relativePath);
                continue;
            }

            if (needsUpdate(srcPath, destPath, force)) {
                // Add customization marker to new files
                if (checkCustomization && (entry.name.endsWith('.md') || entry.name.endsWith('.mdc'))) {
                    let content = fs.readFileSync(srcPath, 'utf8');
                    if (!content.includes('<!-- dev-ops-customized -->')) {
                        content += "\n\n<!-- To prevent automatic updates, add '<!-- dev-ops-customized -->' to this file -->\n";
                    }
                    fs.writeFileSync(destPath, content);
                } else {
                    fs.copyFileSync(srcPath, destPath);
                }
                copied++;
                updatedFiles.push(relativePath);
            } else {
                skipped++;
                skippedFiles.push(relativePath);
            }
        }
    }

    return { copied, skipped, updatedFiles, skippedFiles };
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
 * Install workflows from assets to project (with customization protection)
 */
function installWorkflows(srcDir: string, destDir: string, force: boolean = false): CopyResult {
    if (!fs.existsSync(srcDir)) {
        logError(`[installer] Workflows source not found: ${srcDir}`);
        return { copied: 0, skipped: 0, updatedFiles: [], skippedFiles: [] };
    }

    return copyDirRecursive(srcDir, destDir, { force, checkCustomization: true });
}

/**
 * Install skills from assets to project (with customization protection)
 * Works for both Antigravity (.agent/skills) and Cursor (.cursor/skills)
 */
function installSkills(srcDir: string, destDir: string, force: boolean = false): CopyResult {
    if (!fs.existsSync(srcDir)) {
        log(`[installer] Skills source not found: ${srcDir}`);
        return { copied: 0, skipped: 0, updatedFiles: [], skippedFiles: [] };
    }

    return copyDirRecursive(srcDir, destDir, { force, checkCustomization: true });
}

/**
 * Main installation function
 */
export async function install(
    extensionPath: string,
    options: InstallerOptions
): Promise<InstallerResult> {
    const { projectRoot, ide, githubWorkflows, force = false } = options;

    // Track all files for reporting
    const allUpdatedFiles: string[] = [];
    const allSkippedFiles: string[] = [];

    log(`[installer] Installing DevOps framework to ${projectRoot}`);
    log(`[installer] IDE: ${ide}, Version: ${FRAMEWORK_VERSION}, Force: ${force}`);

    // Check if this is a version upgrade
    const installedVersion = getInstalledVersion(projectRoot);
    const wasUpgrade = isNewerVersion(installedVersion, FRAMEWORK_VERSION);
    if (wasUpgrade) {
        log(`[installer] Upgrading from ${installedVersion || 'none'} to ${FRAMEWORK_VERSION}`);
    }

    // Locate assets directory
    const assetsDir = path.join(extensionPath, 'dist', 'assets');
    if (!fs.existsSync(assetsDir)) {
        return {
            success: false,
            rulesInstalled: 0,
            workflowsInstalled: 0,
            skillsInstalled: 0,
            filesUpdated: [],
            filesSkipped: [],
            wasUpgrade: false,
            message: `Assets directory not found: ${assetsDir}`
        };
    }

    // Source directories
    const rulesSrc = path.join(assetsDir, 'rules');
    const workflowsSrc = path.join(assetsDir, 'workflows');
    const skillsSrc = path.join(assetsDir, 'skills');
    const templatesSrc = path.join(assetsDir, 'templates');
    const scriptsSrc = path.join(assetsDir, 'scripts');

    // Get IDE-specific destination paths
    const paths = getIdePaths(projectRoot, ide);

    // Create .dev_ops structure
    const devOpsDir = path.join(projectRoot, '.dev_ops');
    const devOpsDocsDir = path.join(devOpsDir, 'docs');
    const devOpsArchiveDir = path.join(devOpsDir, 'archive');
    const devOpsTemplatesDir = path.join(devOpsDir, 'templates');

    // Create directories (architecture docs are now co-located as SPEC.md in component folders)
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

    // Install templates
    if (fs.existsSync(templatesSrc)) {
        const result = copyDirRecursive(templatesSrc, devOpsTemplatesDir, { force: force || wasUpgrade });
        allUpdatedFiles.push(...result.updatedFiles.map(f => `templates/${f}`));
        allSkippedFiles.push(...result.skippedFiles.map(f => `templates/${f}`));
        log('[installer] Templates installed');
    }

    // Install rules
    const rulesInstalled = installRules(rulesSrc, paths.rulesDir, ide);
    log(`[installer] ${rulesInstalled} rules installed`);

    // Install workflows (with customization protection)
    const workflowsResult = installWorkflows(workflowsSrc, paths.workflowsDir, force || wasUpgrade);
    allUpdatedFiles.push(...workflowsResult.updatedFiles.map(f => `workflows/${f}`));
    allSkippedFiles.push(...workflowsResult.skippedFiles.map(f => `workflows/${f}`));
    log(`[installer] ${workflowsResult.copied} workflows installed`);

    // Install skills (with customization protection)
    const skillsResult = installSkills(skillsSrc, paths.skillsDir, force || wasUpgrade);
    allUpdatedFiles.push(...skillsResult.updatedFiles.map(f => `skills/${f}`));
    allSkippedFiles.push(...skillsResult.skippedFiles.map(f => `skills/${f}`));
    log(`[installer] ${skillsResult.copied} skill files installed to ${paths.skillsDir}`);

    // Install CLI scripts
    if (fs.existsSync(scriptsSrc)) {
        // Scripts go to .dev_ops/scripts for both IDEs
        const scriptsDest = path.join(devOpsDir, 'scripts');
        // Always force update scripts on upgrade
        const result = copyDirRecursive(scriptsSrc, scriptsDest, { force: true });
        allUpdatedFiles.push(...result.updatedFiles.map(f => `scripts/${f}`));
        log(`[installer] Scripts installed to ${scriptsDest}`);
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
                allUpdatedFiles.push('.github/workflows/pr_triage.yml');
                log('[installer] PR triage workflow installed');
            }
        }
    }

    // Generate summary message
    const updatedCount = allUpdatedFiles.length;
    const skippedCount = allSkippedFiles.length;
    const message = wasUpgrade
        ? `Upgraded from ${installedVersion} to ${FRAMEWORK_VERSION}. Updated ${updatedCount} files.`
        : `DevOps framework installed. Updated ${updatedCount} files, skipped ${skippedCount} unchanged.`;

    // -------------------------------------------------------------------------
    // Run Bootstrapping Detection (Context Capture)
    // -------------------------------------------------------------------------
    try {
        log('[installer] Running project detection...');

        // 1. Setup minimal services
        const workspace = new InstallerWorkspace(projectRoot);
        // CoreTaskService is no longer needed for pure audit

        // 2. Audit Project
        const auditService = new ProjectAuditService(workspace);
        const detectionContext = await auditService.audit();

        // 3. Save to .dev_ops/.tmp/context.json
        const tmpDir = path.join(devOpsDir, '.tmp');
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
        }

        const contextPath = path.join(tmpDir, 'context.json');
        fs.writeFileSync(contextPath, JSON.stringify(detectionContext, null, 2));
        log(`[installer] Context saved to ${contextPath}`);

    } catch (error) {
        logError('[installer] Failed to run detection', error);
        // We don't fail the install, just log it. Bootstrap will fallback to fresh detection.
    }

    return {
        success: true,
        rulesInstalled,
        workflowsInstalled: workflowsResult.copied,
        skillsInstalled: skillsResult.copied,
        filesUpdated: allUpdatedFiles,
        filesSkipped: allSkippedFiles,
        wasUpgrade,
        message
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
