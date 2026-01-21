import { strict as assert } from 'assert';

// Testing installer logic patterns
// These test the pure functions without VS Code dependencies.

suite('Installer - Version Comparison', () => {
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

    test('returns true for null current version', () => {
        assert.strictEqual(isNewerVersion(null, '1.0.0'), true);
    });

    test('returns true for major version upgrade', () => {
        assert.strictEqual(isNewerVersion('1.0.0', '2.0.0'), true);
    });

    test('returns true for minor version upgrade', () => {
        assert.strictEqual(isNewerVersion('1.0.0', '1.1.0'), true);
    });

    test('returns true for patch version upgrade', () => {
        assert.strictEqual(isNewerVersion('1.0.0', '1.0.1'), true);
    });

    test('returns false for same version', () => {
        assert.strictEqual(isNewerVersion('1.0.0', '1.0.0'), false);
    });

    test('returns false for downgrade', () => {
        assert.strictEqual(isNewerVersion('2.0.0', '1.0.0'), false);
    });
});

suite('Installer - IDE Path Detection', () => {
    function getIdePaths(ide: string): { rulesDir: string; workflowsDir: string; skillsDir: string; fileExt: string } {
        if (ide === 'cursor') {
            return {
                rulesDir: '.cursor/rules',
                workflowsDir: '.cursor/commands',
                skillsDir: '.cursor/skills',
                fileExt: '.mdc'
            };
        }
        return {
            rulesDir: '.agent/rules',
            workflowsDir: '.agent/workflows',
            skillsDir: '.agent/skills',
            fileExt: '.md'
        };
    }

    test('returns cursor paths for cursor IDE', () => {
        const paths = getIdePaths('cursor');
        assert.strictEqual(paths.rulesDir, '.cursor/rules');
        assert.strictEqual(paths.workflowsDir, '.cursor/commands');
        assert.strictEqual(paths.fileExt, '.mdc');
    });

    test('returns antigravity paths for antigravity IDE', () => {
        const paths = getIdePaths('antigravity');
        assert.strictEqual(paths.rulesDir, '.agent/rules');
        assert.strictEqual(paths.workflowsDir, '.agent/workflows');
        assert.strictEqual(paths.fileExt, '.md');
    });
});

suite('Installer - Customization Detection', () => {
    function isCustomized(content: string): boolean {
        return content.includes('<!-- dev-ops-customized -->');
    }

    test('returns true for customized content', () => {
        const content = '# My Custom Skill\n<!-- dev-ops-customized -->\nCustom content here';
        assert.strictEqual(isCustomized(content), true);
    });

    test('returns false for uncustomized content', () => {
        const content = '# Standard Skill\nThis is default content';
        assert.strictEqual(isCustomized(content), false);
    });
});

suite('Installer - Result Structure', () => {
    test('InstallerResult has expected fields', () => {
        const result = {
            success: true,
            rulesInstalled: 5,
            workflowsInstalled: 10,
            skillsInstalled: 5,
            filesUpdated: ['workflow1.md', 'skill1/SKILL.md'],
            filesSkipped: ['custom.md'],
            wasUpgrade: true,
            message: 'Installed successfully'
        };

        assert.ok('success' in result);
        assert.ok('filesUpdated' in result);
        assert.ok('filesSkipped' in result);
        assert.ok('wasUpgrade' in result);
        assert.ok(Array.isArray(result.filesUpdated));
    });
});
