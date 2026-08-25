export type EditSelector =
  | { uuid: string; name?: never }
  | { name: string; uuid?: never };

export type Bounds = [number, number, number, number];

export interface EditPreconditions {
  expectedTypename?: string;
  expectedName?: string;
  expectedText?: string;
  expectedFontSize?: number;
  expectedOpacity?: number;
  expectedBounds?: Bounds;
}

interface EditBase {
  preconditions?: EditPreconditions;
}

export type DeterministicEdit =
  | ({ operation: 'replace-text'; search: string; replacement: string } & EditSelector & EditBase)
  | ({ operation: 'move'; dx: number; dy: number } & EditSelector & EditBase)
  | ({ operation: 'set-font-size'; size: number } & EditSelector & EditBase)
  | ({ operation: 'set-tracking'; tracking: number } & EditSelector & EditBase)
  | ({ operation: 'set-leading'; leading: number } & EditSelector & EditBase)
  | ({ operation: 'set-opacity'; opacity: number } & EditSelector & EditBase)
  | ({ operation: 'rotate'; angle: number } & EditSelector & EditBase)
  | ({ operation: 'scale'; scaleX: number; scaleY: number } & EditSelector & EditBase);

function assertSelector(input: EditSelector): void {
  const uuid = 'uuid' in input ? input.uuid : undefined;
  const name = 'name' in input ? input.name : undefined;
  if ((uuid ? 1 : 0) + (name ? 1 : 0) !== 1) {
    throw new Error('Exactly one edit selector (--uuid or --name) is required.');
  }
}

function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) throw new Error(`${label} must be a finite number.`);
}

function assertPositive(value: number, label: string): void {
  assertFinite(value, label);
  if (value <= 0) throw new Error(`${label} must be greater than zero.`);
}

function assertPreconditions(input: EditPreconditions | undefined): void {
  if (!input) return;
  if (input.expectedFontSize !== undefined) assertPositive(input.expectedFontSize, 'expectedFontSize');
  if (input.expectedOpacity !== undefined) {
    assertFinite(input.expectedOpacity, 'expectedOpacity');
    if (input.expectedOpacity < 0 || input.expectedOpacity > 100) {
      throw new Error('expectedOpacity must be between 0 and 100.');
    }
  }
  if (input.expectedBounds !== undefined) {
    if (input.expectedBounds.length !== 4 || input.expectedBounds.some((value) => !Number.isFinite(value))) {
      throw new Error('expectedBounds must contain four finite numbers.');
    }
  }
}

export function validateDeterministicEdit(input: DeterministicEdit): void {
  assertSelector(input);
  assertPreconditions(input.preconditions);
  if (input.operation === 'replace-text') {
    if (!input.search) throw new Error('replace-text requires a non-empty search value.');
    return;
  }
  if (input.operation === 'move') {
    assertFinite(input.dx, 'move dx');
    assertFinite(input.dy, 'move dy');
    return;
  }
  if (input.operation === 'set-font-size') {
    assertPositive(input.size, 'set-font-size size');
    return;
  }
  if (input.operation === 'set-tracking') {
    assertFinite(input.tracking, 'set-tracking tracking');
    return;
  }
  if (input.operation === 'set-leading') {
    assertPositive(input.leading, 'set-leading leading');
    return;
  }
  if (input.operation === 'set-opacity') {
    assertFinite(input.opacity, 'set-opacity opacity');
    if (input.opacity < 0 || input.opacity > 100) throw new Error('set-opacity opacity must be between 0 and 100.');
    return;
  }
  if (input.operation === 'rotate') {
    assertFinite(input.angle, 'rotate angle');
    return;
  }
  assertPositive(input.scaleX, 'scale scaleX');
  assertPositive(input.scaleY, 'scale scaleY');
}

function normalized(input: DeterministicEdit): Record<string, unknown> {
  const output: Record<string, unknown> = { ...input };
  if (!input.preconditions || Object.keys(input.preconditions).length === 0) delete output.preconditions;
  return output;
}

const RUNTIME_HELPERS = String.raw`
function __editClose(a, b, tolerance) {
  return Math.abs(Number(a) - Number(b)) <= tolerance;
}
function __editBoundsEqual(actual, expected) {
  if (!actual || !expected || actual.length !== 4 || expected.length !== 4) return false;
  var i;
  for (i = 0; i < 4; i++) if (!__editClose(actual[i], expected[i], 0.01)) return false;
  return true;
}
function __editResolveTarget(documentValue, edit) {
  if (edit.uuid) {
    var byUuid = findPageItemByUuid(documentValue, edit.uuid);
    if (!byUuid) throw new Error("EDIT_TARGET_NOT_FOUND: uuid " + edit.uuid);
    return byUuid;
  }
  var matches = findPageItemsBySignature(documentValue, { name: edit.name });
  if (matches.length !== 1) {
    throw new Error("EDIT_TARGET_AMBIGUOUS: expected exactly one named item, got " + matches.length + " for " + edit.name);
  }
  return matches[0];
}
function __editAssertPreconditions(target, edit, index) {
  var p = edit.preconditions;
  if (!p) return;
  var prefix = "PRECONDITION_FAILED[" + index + "]: ";
  if (p.expectedTypename !== undefined && target.typename !== p.expectedTypename) {
    throw new Error(prefix + "typename expected " + p.expectedTypename + ", actual " + target.typename);
  }
  if (p.expectedName !== undefined) {
    var actualName = "";
    try { actualName = target.name || ""; } catch (nameError) {}
    if (actualName !== p.expectedName) throw new Error(prefix + "name expected " + p.expectedName + ", actual " + actualName);
  }
  if (p.expectedText !== undefined) {
    if (target.typename !== "TextFrame") throw new Error(prefix + "expectedText requires TextFrame");
    if (String(target.contents) !== String(p.expectedText)) throw new Error(prefix + "text changed since inspection");
  }
  if (p.expectedFontSize !== undefined) {
    if (target.typename !== "TextFrame") throw new Error(prefix + "expectedFontSize requires TextFrame");
    if (!__editClose(target.textRange.characterAttributes.size, p.expectedFontSize, 0.001)) {
      throw new Error(prefix + "font size changed since inspection");
    }
  }
  if (p.expectedOpacity !== undefined && !__editClose(target.opacity, p.expectedOpacity, 0.001)) {
    throw new Error(prefix + "opacity changed since inspection");
  }
  if (p.expectedBounds !== undefined && !__editBoundsEqual(target.geometricBounds, p.expectedBounds)) {
    throw new Error(prefix + "geometric bounds changed since inspection");
  }
}
function __editValidateOperation(target, edit, index) {
  var prefix = "EDIT_INVALID[" + index + "]: ";
  if (target.locked) throw new Error(prefix + "target is locked");
  if (edit.operation === "replace-text") {
    if (target.typename !== "TextFrame") throw new Error(prefix + "replace-text requires TextFrame");
    if (String(target.contents).indexOf(String(edit.search)) < 0) throw new Error("EDIT_NO_MATCH[" + index + "]: search text was not found");
  } else if (edit.operation === "set-font-size" || edit.operation === "set-tracking" || edit.operation === "set-leading") {
    if (target.typename !== "TextFrame") throw new Error(prefix + edit.operation + " requires TextFrame");
  }
}
function __editApply(target, edit) {
  if (edit.operation === "replace-text") {
    var count = replaceTextPreservingStyles(target, String(edit.search), String(edit.replacement));
    return { replacements: count };
  }
  if (edit.operation === "move") {
    target.translate(Number(edit.dx), Number(edit.dy));
    return {};
  }
  if (edit.operation === "set-font-size") {
    target.textRange.characterAttributes.size = Number(edit.size);
    return {};
  }
  if (edit.operation === "set-tracking") {
    target.textRange.characterAttributes.tracking = Number(edit.tracking);
    return {};
  }
  if (edit.operation === "set-leading") {
    target.textRange.characterAttributes.leading = Number(edit.leading);
    return {};
  }
  if (edit.operation === "set-opacity") {
    target.opacity = Number(edit.opacity);
    return {};
  }
  if (edit.operation === "rotate") {
    target.rotate(Number(edit.angle));
    return {};
  }
  target.resize(Number(edit.scaleX), Number(edit.scaleY));
  return {};
}
function __editRunOne(target, edit, index) {
  var before = snapshotItem(target);
  var details = __editApply(target, edit);
  var after = snapshotItem(target);
  return {
    index: index,
    operation: edit.operation,
    details: details,
    before: before,
    after: after,
    diff: diffSnapshots(before, after)
  };
}
`;

function buildSource(edits: DeterministicEdit[], batch: boolean): string {
  if (edits.length === 0) throw new Error('At least one deterministic edit is required.');
  if (edits.length > 100) throw new Error('A deterministic edit batch is limited to 100 edits.');
  edits.forEach(validateDeterministicEdit);
  const encoded = JSON.stringify(edits.map(normalized));
  const lines = [
    'var __doc = requireTargetDocument();',
    RUNTIME_HELPERS,
    `var __edits = ${encoded};`,
    'var __targets = [];',
    'var __i;',
    '// Resolve every target and validate every precondition before the first mutation.',
    'for (__i = 0; __i < __edits.length; __i++) {',
    '  var __target = __editResolveTarget(__doc, __edits[__i]);',
    '  __editAssertPreconditions(__target, __edits[__i], __i);',
    '  __editValidateOperation(__target, __edits[__i], __i);',
    '  __targets.push(__target);',
    '}',
    'var __results = [];',
    'for (__i = 0; __i < __edits.length; __i++) __results.push(__editRunOne(__targets[__i], __edits[__i], __i));',
  ];
  if (batch) {
    lines.push('writeResultFile(RESULT_PATH, { operation: "edit-batch", count: __results.length, results: __results });');
  } else {
    lines.push('writeResultFile(RESULT_PATH, __results[0]);');
  }
  return `${lines.join('\n')}\n`;
}

export function buildDeterministicEditSource(input: DeterministicEdit): string {
  return buildSource([input], false);
}

export function buildDeterministicBatchSource(inputs: DeterministicEdit[]): string {
  return buildSource(inputs, true);
}
