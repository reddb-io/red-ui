// SvelteKit's service-worker build list excludes Vite's nested Worker assets.
// Fill this build-time marker from the actual emitted files, including WASM.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Include emitted local database assets in the standalone offline shell. */
export function stageOfflineRuntime(directory) {
const root = directory instanceof URL ? fileURLToPath(directory) : resolve(directory);
const marker = '__REDDB_WORKSPACE_OFFLINE_RUNTIME__';
const assets = [];
function visit(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) visit(path);
    else {
      const name = relative(root, path).replaceAll('\\', '/');
      if (/\.(?:js|wasm)$/.test(name) && (name.includes('/workers/') || name.endsWith('.wasm'))) assets.push(name);
    }
  }
}
visit(join(root, '_app', 'immutable'));
assets.sort();
if (!assets.some(path => path.endsWith('.wasm')) || !assets.some(path => path.includes('/workers/') && path.endsWith('.js'))) {
  throw new Error('The local database Worker and WASM must be emitted before staging offline assets');
}
const worker = join(root, 'service-worker.js');
const source = readFileSync(worker, 'utf8');
if (source.split(marker).length !== 2) throw new Error('Expected one offline runtime build marker');
const encoded = JSON.stringify(assets.join('|')).slice(1, -1);
writeFileSync(worker, source.replace(marker, encoded));
}
