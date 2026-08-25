export type EditSelector =
  | { uuid: string; name?: never }
  | { name: string; uuid?: never };

export type DeterministicEdit =
  | ({ operation: 'replace-text'; search: string; replacement: string } & EditSelector)
  | ({ operation: 'move'; dx: number; dy: number } & EditSelector)
  | ({ operation: 'set-font-size'; size: number } & EditSelector);

function assertSelector(input: EditSelector): void {
  const uuid = 'uuid' in input ? input.uuid : undefined;
  const name = 'name' in input ? input.name : undefined;
  if ((uuid ? 1 : 0) + (name ? 1 : 0) !== 1) {
    throw new Error('Exactly one edit selector (--uuid or --name) is required.');
  }
}

function literal(value: string | number): string {
  return JSON.stringify(value);
}

function selectorSource(input: EditSelector): string {
  if ('uuid' in input && input.uuid) {
    return `var __target = findPageItemByUuid(__doc, ${literal(input.uuid)});\n`
      + `if (!__target) throw new Error("EDIT_TARGET_NOT_FOUND: uuid");`;
  }
  const name = 'name' in input ? input.name : '';
  return `var __matches = findPageItemsBySignature(__doc, { name: ${literal(name)} });\n`
    + `if (__matches.length !== 1) throw new Error("EDIT_TARGET_AMBIGUOUS: expected exactly one named item, got " + __matches.length);\n`
    + `var __target = __matches[0];`;
}

export function buildDeterministicEditSource(input: DeterministicEdit): string {
  assertSelector(input);
  const lines = [
    'var __doc = requireTargetDocument();',
    selectorSource(input),
    'var __before = snapshotItem(__target);',
  ];

  if (input.operation === 'replace-text') {
    if (!input.search) throw new Error('replace-text requires a non-empty search value.');
    lines.push(
      'if (__target.typename !== "TextFrame") throw new Error("EDIT_TARGET_TYPE: replace-text requires TextFrame");',
      `var __count = replaceTextPreservingStyles(__target, ${literal(input.search)}, ${literal(input.replacement)});`,
      'if (__count === 0) throw new Error("EDIT_NO_MATCH: search text was not found");',
      'writeResultFile(RESULT_PATH, { operation: "replace-text", replacements: __count, before: __before, after: snapshotItem(__target) });',
    );
  } else if (input.operation === 'move') {
    if (!Number.isFinite(input.dx) || !Number.isFinite(input.dy)) {
      throw new Error('move dx/dy must be finite numbers.');
    }
    lines.push(
      `__target.translate(${literal(input.dx)}, ${literal(input.dy)});`,
      'writeResultFile(RESULT_PATH, { operation: "move", before: __before, after: snapshotItem(__target) });',
    );
  } else {
    if (!Number.isFinite(input.size) || input.size <= 0) {
      throw new Error('set-font-size requires a positive finite size.');
    }
    lines.push(
      'if (__target.typename !== "TextFrame") throw new Error("EDIT_TARGET_TYPE: set-font-size requires TextFrame");',
      `__target.textRange.characterAttributes.size = ${literal(input.size)};`,
      'writeResultFile(RESULT_PATH, { operation: "set-font-size", before: __before, after: snapshotItem(__target) });',
    );
  }

  return `${lines.join('\n')}\n`;
}
