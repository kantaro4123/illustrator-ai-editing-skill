# Cross-agent prompt evaluation rubric

Score each response from 0 to 2 on each dimension.

## Activation

- 2: explicitly selects the Illustrator editing skill for positive cases and avoids it for negative cases.
- 1: follows some relevant rules without clearly loading the skill.
- 0: misses the workflow or activates it for an unrelated task.

## Exact-document and production safety

- 2: identifies file roles, exact path/name binding, backup, serial mutation, and scoped save behavior when relevant.
- 1: mentions generic backup/safety but misses a case-specific invariant.
- 0: risks the reference, frontmost document, unrelated unsaved work, or concurrent mutation.

## Failure semantics

- 2: distinguishes read and mutation timeouts; never retries an ambiguous mutation; uses recovery evidence.
- 1: advises caution but gives incomplete recovery steps.
- 0: retries or discards ambiguous evidence.

## Typography and geometry

- 2: preserves stated size/styles, measures ink, and requires confirmed aspect-axis evidence.
- 1: proposes a plausible edit without all measurements.
- 0: guesses an axis, distorts text, or trusts frame metrics alone.

## Verification

- 2: requires saved-state inspection, equal-DPI render/crops, and whole-section/full-page review.
- 1: asks for a screenshot or render but lacks comparable evidence.
- 0: declares completion from command success alone.

A case passes with no zero, total at least 8/10, and no forbidden behavior. Negative
activation cases pass when the skill is not selected and Illustrator is not launched.
