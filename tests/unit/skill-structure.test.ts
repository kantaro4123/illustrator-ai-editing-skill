import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const root = resolve(import.meta.dirname, '../..');

async function text(path: string): Promise<string> {
  return readFile(resolve(root, path), 'utf8');
}

// `local-*.md` holds operator-specific client rules. It is gitignored and never
// linked from the router, so it is outside the published-reference contract.
async function publishedReferences(): Promise<string[]> {
  const entries = await readdir(resolve(root, 'references'));
  return entries.filter((name) => name.endsWith('.md') && !name.startsWith('local-'));
}

describe('cross-agent Illustrator skill package', () => {
  test('has valid trigger-rich frontmatter and remains a concise router', async () => {
    const source = await text('SKILL.md');
    const match = source.match(/^---\n([\s\S]*?)\n---\n/);
    expect(match).not.toBeNull();
    const frontmatter = match?.[1] ?? '';
    expect(frontmatter).toMatch(/^name:\s*illustrator-ai-editing$/m);
    const description = frontmatter.match(/^description:\s*(.+)$/m)?.[1] ?? '';
    expect(description.length).toBeGreaterThan(40);
    expect(description.length).toBeLessThan(500);
    for (const trigger of ['Illustrator', '.ai', 'Japanese', 'layout', 'aspect ratio', 'review']) {
      expect(description.toLowerCase()).toContain(trigger.toLowerCase());
    }
    expect(source.split('\n').length).toBeLessThan(500);
  });

  test('links every reference exactly through the skill router', async () => {
    const skill = await text('SKILL.md');
    const files = await publishedReferences();
    expect(files.sort()).toEqual([
      'aspect-ratio.md',
      'crash-recovery.md',
      'deriving-from-approved.md',
      'design-guidelines.md',
      'fitting-copy.md',
      'illustrator-dom.md',
      'japanese-typography.md',
      'layout-review.md',
      'measuring-a-printed-reference.md',
      'measuring-from-the-render.md',
      'platforms.md',
      'production-safety.md',
      'recipes.md',
      'workflow.md',
    ]);
    for (const file of files) expect(skill).toContain(`references/${file}`);
  });

  test('keeps reference bodies unique and agent-neutral', async () => {
    const files = await publishedReferences();
    const bodies = await Promise.all(files.map((name) => text(`references/${name}`)));
    const hashes = bodies.map((body) => createHash('sha256').update(body.trim()).digest('hex'));
    expect(new Set(hashes).size).toBe(hashes.length);
    const combined = [await text('SKILL.md'), ...bodies].join('\n');
    expect(combined).not.toMatch(/Claude Code only|Codex only|\.claude\/skills\/illustrator-ai-editing\/scripts/);
  });

  test('provides valid Codex UI metadata without changing the shared workflow', async () => {
    const yaml = await text('agents/openai.yaml');
    expect(yaml).toMatch(/^interface:\n/);
    expect(yaml).toMatch(/^  display_name:\s*"Illustrator AI Editing"$/m);
    expect(yaml).toMatch(/^  short_description:\s*"[^"]{10,80}"$/m);
    expect(yaml).toMatch(/^  default_prompt:\s*"[^"]*\$illustrator-ai-editing[^"]*"$/m);
  });

  test('records ancestry and third-party provenance', async () => {
    const notices = await text('THIRD_PARTY_NOTICES.md');
    for (const project of [
      'ie3jp/illustrator-mcp-server',
      'mikechambers/adb-mcp',
      'github/awesome-copilot',
      'Claude Code',
    ]) expect(notices).toContain(project);
    expect(notices).toContain('MIT');
  });
});
