import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

interface PromptCase {
  id: string;
  category: string;
  prompt: string;
  shouldTrigger: boolean;
  expectedBehaviors: string[];
  forbiddenBehaviors: string[];
}

const requiredCategories = [
  'should-trigger',
  'should-not-trigger',
  'safety',
  'timeout',
  'wrong-document',
  'aspect-axis',
  'visual-verification',
];

describe('cross-agent prompt evaluation corpus', () => {
  test('covers activation and production pressure categories with explicit expectations', async () => {
    const path = resolve(import.meta.dirname, '../prompts/cases.json');
    const cases = JSON.parse(await readFile(path, 'utf8')) as PromptCase[];
    expect(cases.length).toBeGreaterThanOrEqual(12);
    expect(new Set(cases.map((item) => item.id)).size).toBe(cases.length);
    for (const category of requiredCategories) {
      expect(cases.some((item) => item.category === category)).toBe(true);
    }
    for (const item of cases) {
      expect(item.id).toMatch(/^[a-z0-9-]+$/);
      expect(item.prompt.length).toBeGreaterThan(20);
      expect(item.expectedBehaviors.length).toBeGreaterThan(0);
      expect(item.forbiddenBehaviors.length).toBeGreaterThan(0);
    }
  });

  test('contains no production paths, customer names, or hidden activation hints', async () => {
    const source = await readFile(resolve(import.meta.dirname, '../prompts/cases.json'), 'utf8');
    expect(source).not.toMatch(/\/Users\/Kantaro|テスト|学習塾|PROJECT_FILE|\.claude\/skills|\.codex\/skills/);
    expect(source).not.toContain('$illustrator-ai-editing');
  });

  test('keeps negative cases genuinely outside Illustrator editing', async () => {
    const cases = JSON.parse(
      await readFile(resolve(import.meta.dirname, '../prompts/cases.json'), 'utf8'),
    ) as PromptCase[];
    const negatives = cases.filter((item) => item.category === 'should-not-trigger');
    expect(negatives.length).toBeGreaterThanOrEqual(2);
    expect(negatives.every((item) => item.shouldTrigger === false)).toBe(true);
  });
});
