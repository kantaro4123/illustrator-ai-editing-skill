import { describe, expect, test } from 'vitest';
import { cliJson, createIllustratorFixture, fixtureLabel } from './helpers.js';

describe.skipIf(process.env.ILLUSTRATOR_E2E !== '1')('Illustrator exact-document safety', () => {
  test('selects the exact path while a similarly named CMYK document is active', async () => {
    const fixture = await createIllustratorFixture();
    const result = await cliJson(['inspect', fixture.primaryPath, '--detail', 'full']);
    expect(result.ok && result.document?.path).toBe(fixture.primaryPath);
    expect(result.ok && (result.data as { document: { colorSpace: string } }).document.colorSpace).toBe('RGB');
    expect(fixtureLabel(fixture)).toContain('synthetic-primary-copy.ai');
  }, 240_000);
});
