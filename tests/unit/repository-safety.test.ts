import { constants } from 'node:fs';
import { access, readFile } from 'node:fs/promises';
import { describe, expect, test } from 'vitest';

const root = new URL('../../', import.meta.url);

describe('repository publication safety', () => {
  test('ignores production Illustrator and generated review artifacts', async () => {
    const gitignore = await readFile(new URL('.gitignore', root), 'utf8');

    for (const required of [
      '*.ai',
      '*_backup_*',
      '*.out',
      '*.png',
      '*.log',
      '.DS_Store',
      '.illustrator-ai/',
      'transactions/',
    ]) {
      expect(gitignore).toContain(required);
    }
    expect(gitignore).toContain('!tests/fixtures/synthetic/**');
  });

  test('forces LF text files and marks Illustrator files as binary', async () => {
    const attributes = await readFile(new URL('.gitattributes', root), 'utf8');
    expect(attributes).toContain('* text=auto eol=lf');
    expect(attributes).toContain('*.ai binary');
  });

  test('ships an executable prepublication gate', async () => {
    const script = new URL('scripts/prepublish-check.sh', root);
    await expect(access(script, constants.X_OK)).resolves.toBeUndefined();
    const packageJson = JSON.parse(await readFile(new URL('package.json', root), 'utf8')) as {
      scripts: Record<string, string>;
    };
    expect(packageJson.scripts['prepublish:check']).toBe('scripts/prepublish-check.sh');
    const source = await readFile(script, 'utf8');
    expect(source).toContain('git rev-list HEAD');
    expect(source).toContain("git log HEAD --format='%ae%n%ce'");
  });
});
