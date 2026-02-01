const esbuild = require("esbuild");
const fs = require("fs");
const path = require("path");

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');

/**
 * Copy a directory recursively
 */
function copyDir(src, dest) {
	if (!fs.existsSync(src)) {
		console.log(`[assets] Skipping missing directory: ${src}`);
		return;
	}
	fs.mkdirSync(dest, { recursive: true });
	const entries = fs.readdirSync(src, { withFileTypes: true });
	for (const entry of entries) {
		const srcPath = path.join(src, entry.name);
		const destPath = path.join(dest, entry.name);
		if (entry.isDirectory()) {
			copyDir(srcPath, destPath);
		} else {
			fs.copyFileSync(srcPath, destPath);
		}
	}
}

/**
 * Validate payload files don't contain deprecated patterns
 */
function validatePayload() {
	const projectRoot = path.join(__dirname, '..');
	const payloadDir = path.join(projectRoot, 'payload');
	const deprecatedPatterns = [
		{ pattern: /python3\s+.*scripts\//, description: 'Python script reference' },
		{ pattern: /\.dev_ops\/scripts\/.*\.py/, description: 'Legacy Python script path' },
		{ pattern: /artifact_ops\.py/, description: 'Legacy artifact_ops.py reference' },
		{ pattern: /board_ops\.py/, description: 'Legacy board_ops.py reference' }
	];

	let hasErrors = false;

	function checkFile(filePath) {
		if (!filePath.endsWith('.md') && !filePath.endsWith('.mdc')) return;
		try {
			const content = fs.readFileSync(filePath, 'utf8');
			for (const { pattern, description } of deprecatedPatterns) {
				if (pattern.test(content)) {
					console.error(`[validate] ERROR: ${description} found in ${path.relative(projectRoot, filePath)}`);
					hasErrors = true;
				}
			}
		} catch (e) { /* ignore */ }
	}

	function walkDir(dir) {
		if (!fs.existsSync(dir)) return;
		const entries = fs.readdirSync(dir, { withFileTypes: true });
		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);
			if (entry.isDirectory()) {
				walkDir(fullPath);
			} else {
				checkFile(fullPath);
			}
		}
	}

	console.log('[validate] Checking payload for deprecated patterns...');
	walkDir(payloadDir);

	if (hasErrors) {
		console.error('[validate] FAILED: Payload contains deprecated patterns');
		process.exit(1);
	}
	console.log('[validate] Payload validation passed');
}

/**
 * Copy static framework assets from project root into dist/assets
 * This includes everything EXCEPT the built CLI tool
 */
function copyStaticAssets() {
	const projectRoot = path.join(__dirname, '..');
	const assetsDir = path.join(__dirname, 'dist', 'assets');

	// Validate payload before copying
	validatePayload();

	console.log('[assets] Copying static framework assets to dist/assets...');

	// Ensure assets dir exists (don't wipe it whole, might be concurrent)
	// ideally we only wipe at start of build process, not during copy
	if (!fs.existsSync(assetsDir)) {
		fs.mkdirSync(assetsDir, { recursive: true });
	}

	// Copy rules
	const rulesDir = path.join(assetsDir, 'rules');
	// Ensure subdir is clean if needed? For now just overwrite.
	copyDir(path.join(projectRoot, 'payload', 'rules'), rulesDir);

	copyDir(path.join(projectRoot, 'payload', 'workflows'), path.join(assetsDir, 'workflows'));
	copyDir(path.join(projectRoot, 'payload', 'templates'), path.join(assetsDir, 'templates'));
	copyDir(path.join(projectRoot, 'payload', 'scripts'), path.join(assetsDir, 'scripts'));
	copyDir(path.join(projectRoot, 'payload', 'skills'), path.join(assetsDir, 'skills'));

	// Copy Codicons
	const codiconsDir = path.join(assetsDir, 'codicons');
	fs.mkdirSync(codiconsDir, { recursive: true });
	try {
		const nodeModules = path.join(__dirname, 'node_modules');
		fs.copyFileSync(path.join(nodeModules, '@vscode/codicons/dist/codicon.css'), path.join(codiconsDir, 'codicon.css'));
		fs.copyFileSync(path.join(nodeModules, '@vscode/codicons/dist/codicon.ttf'), path.join(codiconsDir, 'codicon.ttf'));
		console.log('[assets] Copied Codicons to dist/assets/codicons');
	} catch (e) {
		console.error('[assets] Failed to copy Codicons:', e);
	}

	// Generate version.json from package.json (single source of truth)
	const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
	const versionData = { version: packageJson.version };
	fs.writeFileSync(path.join(assetsDir, 'version.json'), JSON.stringify(versionData, null, 4));
	console.log(`[assets] Generated version.json (v${packageJson.version}) from package.json`);

	console.log('[assets] Static assets copied successfully');
}

/**
 * Copy the built CLI tool to assets
 */
function copyCliAssets() {
	const assetsDir = path.join(__dirname, 'dist', 'assets');
	// Copy built CLI script if it exists
	const cliSrc = path.join(__dirname, 'dist', 'cli', 'devops.js');
	if (fs.existsSync(cliSrc)) {
		const scriptsDir = path.join(assetsDir, 'scripts');
		fs.mkdirSync(scriptsDir, { recursive: true });
		fs.copyFileSync(cliSrc, path.join(scriptsDir, 'devops.js'));
		console.log('[assets] Copied devops.js CLI to assets/scripts');
	} else {
		console.warn('[assets] CLI artifact not found at ' + cliSrc);
	}
}

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
	name: 'esbuild-problem-matcher',

	setup(build) {
		build.onStart(() => {
			console.log('[watch] build started');
		});
		build.onEnd((result) => {
			result.errors.forEach(({ text, location }) => {
				console.error(`✘ [ERROR] ${text}`);
				console.error(`    ${location.file}:${location.line}:${location.column}:`);
			});
			console.log('[watch] build finished');
		});
	},
};

/**
 * Plugin to copy CLI assets after CLI build completes
 */
const copyCliPlugin = {
	name: 'copy-cli-plugin',
	setup(build) {
		build.onEnd(() => {
			copyCliAssets();
		});
	}
};

async function main() {
	// 1. Clean dist/assets at the start of the whole process ONLY
	const assetsDir = path.join(__dirname, 'dist', 'assets');
	if (fs.existsSync(assetsDir)) {
		console.log('[build] Cleaning dist/assets...');
		fs.rmSync(assetsDir, { recursive: true, force: true });
	}

	// 2. Extension Build Context
	const ctx = await esbuild.context({
		entryPoints: [
			'src/extension.ts'
		],
		bundle: true,
		format: 'cjs',
		minify: false, // Minify intentionally disabled for debugging if needed, enable for prod if desired
		sourcemap: !production,
		sourcesContent: false,
		platform: 'node',
		outfile: 'dist/devopsMain.js',
		external: ['vscode'],
		logLevel: 'silent',
		plugins: [
			esbuildProblemMatcherPlugin,
			// Extension build doesn't need to trigger asset copy automatically anymore
		],
	});

	// 3. CLI Build Context
	const cliCtx = await esbuild.context({
		entryPoints: ['src/cli/devops.ts'],
		bundle: true,
		platform: 'node',
		outfile: 'dist/cli/devops.js', // Output to separate dir to avoid wipe
		external: ['vscode'],
		logLevel: 'silent',
		plugins: [
			esbuildProblemMatcherPlugin,
			copyCliPlugin // Update CLI assets whenever CLI rebuilds
		],
	});

	if (watch) {
		// Watch mode:
		// 1. Copy static assets once
		copyStaticAssets();

		// 2. Start watchers
		// CLI watcher will trigger copyCliAssets on change via plugin
		// Extension watcher just rebuilds code
		await Promise.all([ctx.watch(), cliCtx.watch()]);
	} else {
		// Production mode:
		// 1. Build code concurrently
		await Promise.all([ctx.rebuild(), cliCtx.rebuild()]);

		// 2. Dispose contexts
		await Promise.all([ctx.dispose(), cliCtx.dispose()]);

		// 3. Copy ALL assets sequentially after builds are done
		// This ensures dist/cli/devops.js exists before we try to copy it
		copyStaticAssets();
		copyCliAssets();
	}
}

main().catch(e => {
	console.error(e);
	process.exit(1);
});
