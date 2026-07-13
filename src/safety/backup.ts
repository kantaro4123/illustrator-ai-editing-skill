import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { constants, copyFile } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';

export interface BackupEvidence {
  path: string;
  sourceSha256: string;
  backupSha256: string;
  createdAt: string;
}

export function fingerprintFile(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(path);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

function timestamp(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    '_',
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds()),
  ].join('');
}

export async function createBackup(
  sourcePath: string,
  options: { now?: Date } = {},
): Promise<BackupEvidence> {
  const now = options.now ?? new Date();
  const extension = extname(sourcePath);
  const stem = basename(sourcePath, extension);
  const base = join(dirname(sourcePath), `${stem}_backup_${timestamp(now)}`);
  let attempt = 1;
  let backupPath = `${base}${extension}`;

  while (true) {
    try {
      await copyFile(sourcePath, backupPath, constants.COPYFILE_EXCL);
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      attempt += 1;
      backupPath = `${base}_${attempt}${extension}`;
    }
  }

  const [sourceSha256, backupSha256] = await Promise.all([
    fingerprintFile(sourcePath),
    fingerprintFile(backupPath),
  ]);
  return {
    path: backupPath,
    sourceSha256,
    backupSha256,
    createdAt: now.toISOString(),
  };
}
