# Changelog

## [0.2.0] - 2026-05-25

### Added
- **Output folding** — Console output is now grouped by run. Old runs collapse automatically when a new run starts; click ▶/▼ to expand or collapse any group.
- **Scroll arrows** — ↑ and ↓ navigation buttons appear on both the editor and output panel when you've scrolled away from the top or bottom.
- **Smart auto-scroll** — Output only follows new content if you're already at the bottom. Scrolling up to read stops the auto-follow; the ↓ button returns you.
- **Project memory** — Snippets and history entries now remember which project they were linked to. Loading a snippet or history entry automatically restores the project link.
- **Console output coloring** — stdout is colorized: strings in green, numbers in blue, booleans/null in red, with full ANSI escape code support.
- **Save / Cmd+S** — When no snippet is active, Cmd+S opens the Save as Snippet modal. When a snippet is loaded, Cmd+S updates it in place with a "Saved ✓" confirmation.
- **New / Cmd+N** — New button (toolbar + File menu) clears the editor and deactivates any active snippet.

### Fixed
- **PHP syntax highlighting** — Monaco editor now correctly colorizes PHP code written without a `<?php` opening tag.
- **Font size sync** — Editor and console output share the same font size setting; changing one changes both.

## [0.1.0] - 2026-05-24

### Added
- **Native macOS menu bar** — Full File / Edit / View / Run / Window / Help menu wired to all app actions with keyboard shortcuts.
- **In-app self-uninstall** — Help → Uninstall VibeLab… removes the app and all its data (snippets, settings, npm workspace, caches) without touching the Terminal.
- Initial release: JavaScript / TypeScript / PHP scratchpad with live streaming output, AI chat panel, npm package manager, project linking, and snippet library.
