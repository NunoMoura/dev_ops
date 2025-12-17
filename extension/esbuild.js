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
	copyDir(path.join(projectRoot, 'rules'), path.join(assetsDir, 'rules'));
	copyDir(path.join(projectRoot, 'workflows'), path.join(assetsDir, 'workflows'));
	copyDir(path.join(projectRoot, 'templates'), path.join(assetsDir, 'templates'));
	copyDir(path.join(projectRoot, 'scripts'), path.join(assetsDir, 'scripts'));
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
		minify: production,
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
