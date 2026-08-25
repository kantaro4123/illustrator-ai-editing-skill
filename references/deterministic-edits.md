# Deterministic edits

Use deterministic edits for routine production changes before authoring custom JSX. Every edit runs through the protected mutation path, so exact-document binding, backup creation, document locking, timeout ambiguity handling, and structured results remain active.

## Single edit

Supported operations:

- `replace-text`
- `move`
- `set-font-size`
- `set-tracking`
- `set-leading`
- `set-opacity`
- `rotate`
- `scale`

Example:

```bash
bin/illustrator-ai edit /absolute/working.ai \
  --operation set-tracking --uuid ITEM_UUID \
  --tracking 25 \
  --expected-typename TextFrame \
  --expected-font-size 11.5 \
  --confirm
```

The result contains `before`, `after`, and `diff.changed` / `diff.unchanged` evidence. Treat the diff as mechanical evidence, not a visual approval signal.

## Preconditions

Preconditions prevent an edit from applying to stale or unexpectedly changed document state. Available checks are:

- `expectedTypename`
- `expectedName`
- `expectedText`
- `expectedFontSize`
- `expectedOpacity`
- `expectedBounds` (`[left, top, right, bottom]`)

CLI flags use kebab case, for example `--expected-text`, `--expected-font-size`, and `--expected-bounds left,top,right,bottom`.

A failed precondition stops before that transaction's first mutation and reports `PRECONDITION_FAILED`. Prefer preconditions when an edit is planned from an earlier inspection or when multiple agents or humans may have touched the file between inspect and edit.

## Batch edit

For several independent changes, send one batch instead of one AppleScript round trip per edit:

```bash
bin/illustrator-ai edit-batch /absolute/working.ai \
  --file /absolute/edits.json \
  --confirm
```

Example `edits.json`:

```json
[
  {
    "operation": "replace-text",
    "uuid": "TEXT_UUID",
    "search": "2025",
    "replacement": "2026",
    "preconditions": {
      "expectedTypename": "TextFrame",
      "expectedText": "受付 2025"
    }
  },
  {
    "operation": "move",
    "uuid": "RULE_UUID",
    "dx": 0,
    "dy": -6,
    "preconditions": {
      "expectedBounds": [100, 500, 300, 499]
    }
  }
]
```

The batch builder resolves every target, checks every precondition, verifies target type/search availability, and only then begins applying edits. Batches are limited to 100 edits.

Batch preflight is designed for edits that are independently valid against the **initial** document state. Do not make a later batch item depend on text or geometry created by an earlier item; split dependent changes into separate coherent transactions.

A batch is not a database transaction. Illustrator can still fail unexpectedly during a host mutation after preflight. The working file on disk remains protected until an explicit `save`, and the `run` backup is retained; if host state becomes ambiguous, follow the normal recovery workflow before retrying.
