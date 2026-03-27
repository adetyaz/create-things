import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';
import { resolve } from 'path';
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';

export default defineConfig({
	plugins: [
		tailwindcss(),
		svelte(),
		{
			name: 'copy-extension-assets',
			writeBundle() {
				fs.copyFileSync(
					resolve(__dirname, 'manifest.json'),
					resolve(__dirname, 'build/manifest.json')
				);
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
				screenshot: resolve(__dirname, 'src/content/screenshot.ts')
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
