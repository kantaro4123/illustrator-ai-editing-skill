# Crash and recovery

## Classify before acting

Run `doctor` and distinguish:

- not running;
- responsive with no documents;
- responsive with the exact target open;
- responsive with a different document;
- modal or unresponsive;
- recovered document present.

Do not treat all AppleEvent failures alike. `-1712` can mean a long-running successful command;
`-609` can indicate a lost connection; a modal dialog can block otherwise healthy Illustrator.

## Ambiguous mutation

When a mutation times out:

1. do not launch it again;
2. preserve the transaction directory and document lock;
3. inspect for a result sidecar;
4. wait for or diagnose the owning process;
5. inspect a known changed property in the target document;
6. compare disk fingerprint and saved state;
7. only then choose whether to save, restore, or apply a new transaction.

## Recovered documents

Verify a known edit and the exact intended target before choosing a recovered document. Back up
the current disk working file, then save the verified recovered state to the agreed path. Never
close all documents without enumerating them; unrelated unsaved work may be open.

Automation may close synthetic E2E documents only when both their controlled name and temporary
fixture path match. Force quit requires confidence that no unrelated unsaved document exists.

## macOS dictionary recovery

If Illustrator runs but AppleScript reports `do javascript` as an unknown identifier, verify the
installed app path and LaunchServices bundle resolution. A targeted unregister/re-register of
only the Illustrator bundle can restore its scripting dictionary. Do not rebuild the global
LaunchServices database as a routine fix.

After recovery, run a harmless `1+1` JavaScript probe, confirm document count, and then resume
with a fresh read-only inspection.
