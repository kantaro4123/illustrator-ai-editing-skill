import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readlink, readdir, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, test } from 'vitest';

const execute = promisify(execFile);
const root = resolve(import.meta.dirname, '../..');
const installer = join(root, 'scripts/install.sh');
const uninstaller = join(root, 'scripts/uninstall.sh');

async function homeFixture(): Promise<string> {
  const home = await mkdtemp(join(tmpdir(), 'illustrator-installer-'));
  for (const base of ['.agents', '.claude']) {
    const target = join(home, base, 'skills', 'illustrator-ai-editing');
    await mkdir(target, { recursive: true });
    await writeFile(join(target, 'origin.txt'), base, 'utf8');
  }
  return home;
}

function environment(home: string, extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  return { ...process.env, HOME: home, ILLUSTRATOR_SKILL_SOURCE: root, ...extra };
}

describe('canonical cross-agent skill installer', () => {
  test('defaults to a write-free dry run', async () => {
    const home = await homeFixture();
    const result = await execute(installer, [], { env: environment(home) });
    expect(result.stdout).toContain('DRY-RUN');
    expect(await stat(join(home, '.agents/skills/illustrator-ai-editing'))).not.toHaveProperty('isSymbolicLink', true);
    expect(await readFile(join(home, '.claude/skills/illustrator-ai-editing/origin.txt'), 'utf8')).toBe('.claude');
  });

  test('backs up both existing directories and links one canonical source', async () => {
    const home = await homeFixture();
    const result = await execute(installer, ['--apply'], { env: environment(home) });
    for (const base of ['.agents', '.claude']) {
      const skills = join(home, base, 'skills');
      expect(await readlink(join(skills, 'illustrator-ai-editing'))).toBe(root);
      const backup = (await readdir(skills)).find((name) => name.startsWith('illustrator-ai-editing.backup.'));
      expect(backup).toBeTruthy();
      expect(await readFile(join(skills, backup!, 'origin.txt'), 'utf8')).toBe(base);
    }
    expect(result.stdout).toContain('installed');
  });

  test('is idempotent after installation', async () => {
    const home = await homeFixture();
    await execute(installer, ['--apply'], { env: environment(home) });
    const before = await readdir(join(home, '.agents/skills'));
    const result = await execute(installer, ['--apply'], { env: environment(home) });
    expect(await readdir(join(home, '.agents/skills'))).toEqual(before);
    expect(result.stdout).toContain('already installed');
  });

  test('refuses an unrelated symlink before changing either target', async () => {
    const home = await homeFixture();
    const unrelated = join(home, 'unrelated');
    await mkdir(unrelated);
    const claude = join(home, '.claude/skills/illustrator-ai-editing');
    await execute('/bin/rm', ['-rf', claude]);
    await execute('/bin/ln', ['-s', unrelated, claude]);
    await expect(execute(installer, ['--apply'], { env: environment(home) })).rejects.toThrow();
    expect(await readFile(join(home, '.agents/skills/illustrator-ai-editing/origin.txt'), 'utf8')).toBe('.agents');
    expect(await readlink(claude)).toBe(unrelated);
  });

  test('rolls back the first target after an injected partial failure', async () => {
    const home = await homeFixture();
    await expect(execute(installer, ['--apply'], {
      env: environment(home, { ILLUSTRATOR_INSTALL_FAIL_AFTER: '1' }),
    })).rejects.toThrow();
    expect(await readFile(join(home, '.agents/skills/illustrator-ai-editing/origin.txt'), 'utf8')).toBe('.agents');
    expect(await readFile(join(home, '.claude/skills/illustrator-ai-editing/origin.txt'), 'utf8')).toBe('.claude');
  });

  test('uninstalls only canonical links and refuses unrelated links', async () => {
    const home = await homeFixture();
    await execute(installer, ['--apply'], { env: environment(home) });
    await execute(uninstaller, ['--apply'], { env: environment(home) });
    await expect(stat(join(home, '.agents/skills/illustrator-ai-editing'))).rejects.toMatchObject({ code: 'ENOENT' });

    const unrelated = join(home, 'unrelated');
    await mkdir(unrelated);
    const target = join(home, '.agents/skills/illustrator-ai-editing');
    await execute('/bin/ln', ['-s', unrelated, target]);
    await expect(execute(uninstaller, ['--apply'], { env: environment(home) })).rejects.toThrow();
    expect(await readlink(target)).toBe(unrelated);
  });
});
