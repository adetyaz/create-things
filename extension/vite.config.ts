import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';
import { resolve } from 'path';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	plugins: [tailwindcss(), svelte()],
	build: {
		outDir: 'build',
		emptyOutDir: true,
		rollupOptions: {
			input: {
				popup: resolve(__dirname, 'src/popup/index.html'),
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
