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
 * Copy framework assets from project root into dist/assets
 */
function copyAssets() {
	const projectRoot = path.join(__dirname, '..');
	const assetsDir = path.join(__dirname, 'dist', 'assets');

	// Clean existing assets
	if (fs.existsSync(assetsDir)) {
		fs.rmSync(assetsDir, { recursive: true, force: true });
	}

	console.log('[assets] Copying framework assets to dist/assets...');

	// Copy rules - now just dev_ops.md from payload root
	const rulesDir = path.join(assetsDir, 'rules');
	fs.mkdirSync(rulesDir, { recursive: true });
	const devOpsSrc = path.join(projectRoot, 'payload', 'dev_ops.md');
	if (fs.existsSync(devOpsSrc)) {
		fs.copyFileSync(devOpsSrc, path.join(rulesDir, 'dev_ops_guide.md'));
	}

	copyDir(path.join(projectRoot, 'payload', 'workflows'), path.join(assetsDir, 'workflows'));
	copyDir(path.join(projectRoot, 'payload', 'templates'), path.join(assetsDir, 'templates'));
	copyDir(path.join(projectRoot, 'payload', 'scripts'), path.join(assetsDir, 'scripts'));
	copyDir(path.join(projectRoot, 'payload', 'skills'), path.join(assetsDir, 'skills'));

	// Generate version.json from package.json (single source of truth)
	const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
	const versionData = { version: packageJson.version };
	fs.writeFileSync(path.join(assetsDir, 'version.json'), JSON.stringify(versionData, null, 4));
	console.log(`[assets] Generated version.json (v${packageJson.version}) from package.json`);

	console.log('[assets] Assets copied successfully');
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
			// Copy assets after each build
			copyAssets();
		});
	},
};

async function main() {
	const ctx = await esbuild.context({
		entryPoints: [
			'src/extension.ts'
		],
		bundle: true,
		format: 'cjs',
		minify: false,  // Disabled to preserve design system functions
		sourcemap: !production,
		sourcesContent: false,
		platform: 'node',
		outfile: 'dist/extension.js',
		external: ['vscode'],
		logLevel: 'silent',
		plugins: [
			/* add to the end of plugins array */
			esbuildProblemMatcherPlugin,
		],
	});
	if (watch) {
		await ctx.watch();
	} else {
		await ctx.rebuild();
		await ctx.dispose();
	}
}

main().catch(e => {
	console.error(e);
	process.exit(1);
});
