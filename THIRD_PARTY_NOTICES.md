# Third-party notices and provenance

This project was developed from a user-owned local `illustrator-ai-editing` skill originally
created during Claude Code work. Its production lessons were restructured and independently
implemented here for both Claude Code and Codex. No client artwork is included.

The following repositories informed architecture research. Their source code is not vendored;
only general design patterns and interoperability lessons were considered.

## ie3jp/illustrator-mcp-server

- Source: https://github.com/ie3jp/illustrator-mcp-server
- License: MIT
- Influence: a thin host bridge around Illustrator scripting and tool-oriented command surface.

## mikechambers/adb-mcp

- Source: https://github.com/mikechambers/adb-mcp
- License: MIT
- Influence: separating agent protocol concerns from an external application transport.

## github/awesome-copilot

- Source: https://github.com/github/awesome-copilot
- License: MIT
- Influence: concise skill routing, trigger-focused metadata, and progressive reference loading.

All new TypeScript, ExtendScript, tests, and documentation in this repository are released
under this repository's MIT License. Product names and trademarks belong to their owners.
