import { cp, mkdir } from 'node:fs/promises';

await mkdir('dist/src', { recursive: true });
await cp('src/jsx', 'dist/src/jsx', { recursive: true, force: true });
