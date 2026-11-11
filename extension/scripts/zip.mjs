// Packs extension/build into createthings-extension.zip for the Chrome Web Store.
//   VITE_API_BASE=https://<your-app>.vercel.app npm run zip     (from extension/)
// Uses the system tar (built into Windows 10+, macOS and Linux). Cost: nothing.
import { execFileSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const out = resolve(root, 'createthings-extension.zip');
if (!existsSync(resolve(root, 'build/manifest.json'))) {
	console.error('No build/manifest.json: run vite build first.');
	process.exit(1);
}
if (!process.env.VITE_API_BASE) {
	console.warn('VITE_API_BASE is not set: this zip talks to http://localhost:5173. Set it for the store.');
}
rmSync(out, { force: true });
// On Windows use Windows' own tar (bsdtar, makes .zip); Git Bash's tar can't read C:\ paths.
const tar =
	process.platform === 'win32'
		? resolve(process.env.SystemRoot ?? 'C:/Windows', 'System32', 'tar.exe')
		: 'tar';
execFileSync(tar, ['-a', '-c', '-f', out, '-C', resolve(root, 'build'), '.'], {
	stdio: 'inherit'
});
console.log(`Wrote ${out}`);
