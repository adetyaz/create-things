import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';
import { resolve } from 'path';
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';

export default defineConfig({
	// Build relative to extension/, whichever folder the command runs from (npm run build:ext runs it
	// from the project root).
	root: __dirname,
	plugins: [
		tailwindcss(),
		svelte(),
		{
			name: 'copy-extension-assets',
			writeBundle() {
				// Copy manifest
				fs.copyFileSync(
					resolve(__dirname, 'manifest.json'),
					resolve(__dirname, 'build/manifest.json')
				);
				// Copy public/ folder (icons etc.) into build/
				const publicDir = resolve(__dirname, 'public');
				if (fs.existsSync(publicDir)) {
					const copyDir = (src: string, dest: string) => {
						fs.mkdirSync(dest, { recursive: true });
						for (const entry of fs.readdirSync(src)) {
							const s = resolve(src, entry);
							const d = resolve(dest, entry);
							fs.statSync(s).isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
						}
					};
					copyDir(publicDir, resolve(__dirname, 'build'));
				}
				// Move popup HTML from src/popup/ to popup/ to match manifest path
				const srcHtml = resolve(__dirname, 'build/src/popup/index.html');
				const destDir = resolve(__dirname, 'build/popup');
				const destHtml = resolve(destDir, 'index.html');
				if (fs.existsSync(srcHtml)) {
					fs.mkdirSync(destDir, { recursive: true });
					fs.copyFileSync(srcHtml, destHtml);
				}
			}
		}
	],
	build: {
		outDir: 'build',
		emptyOutDir: true,
		rollupOptions: {
			input: {
				'popup/index': resolve(__dirname, 'src/popup/index.html'),
				'service-worker': resolve(__dirname, 'src/background/service-worker.ts'),
				screenshot: resolve(__dirname, 'src/content/screenshot.ts'),
				'site-save': resolve(__dirname, 'src/content/site-save.ts')
			},
			output: {
				entryFileNames: '[name].js',
				chunkFileNames: 'chunks/[name]-[hash].js',
				assetFileNames: 'assets/[name][extname]'
			}
		}
	},
	resolve: {
		alias: {
			$extension: resolve(__dirname, 'src')
		}
	}
});
