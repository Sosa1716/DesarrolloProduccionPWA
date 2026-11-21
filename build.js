import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const output = resolve(root, 'dist');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const entry of ['index.html', 'styles.css', 'app.js', 'sw.js', 'manifest.json', 'icons']) {
  await cp(resolve(root, entry), resolve(output, entry), { recursive: true });
}
console.log('Build de producción generado en dist/.');
