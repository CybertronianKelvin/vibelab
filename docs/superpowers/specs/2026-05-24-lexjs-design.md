# LexJS — Design Spec

**Date:** 2026-05-24  
**Status:** Approved  
**Stack:** Tauri v2 (Rust) + React 18 + TypeScript + Monaco Editor

---

## What Is LexJS

LexJS is a local desktop JavaScript/TypeScript scratchpad. Write code on the left, see results on the right — no project setup, no build step, no config. It is a full-parity local clone of RunJS.

---

## Execution Strategy

**Option A — System Node.js + Script Runner**

- Detect Node.js on PATH at runtime via `which node` / `where node`
- Write user code to a temp file in the OS temp dir
- Execute via Tauri `Command::new("node")` with the temp file path
- For TypeScript: transpile with esbuild (installed in the npm workspace) before execution
- Stream stdout/stderr line-by-line back to frontend via Tauri events
- npm workspace: `~/.lexjs/workspace/` with a persistent `package.json`
- If Node.js not found: show a clear dialog with install instructions

---

## Architecture

```
lexjs/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs           # Tauri entry point, command registry
│   │   ├── executor.rs       # Node subprocess management, streaming output
│   │   ├── packages.rs       # npm install / list / remove
│   │   ├── snippets.rs       # SQLite snippet CRUD (rusqlite)
│   │   └── settings.rs       # JSON settings persistence (serde_json)
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/
│   ├── components/
│   │   ├── Editor/           # Monaco Editor wrapper + TS language service
│   │   ├── Console/          # Streaming output panel (logs, errors, return values)
│   │   ├── Preview/          # Sandboxed iframe for HTML / canvas / visual output
│   │   ├── Sidebar/          # Snippets library panel
│   │   ├── Toolbar/          # Run button, mode toggle, settings trigger
│   │   └── PackageManager/   # npm install / remove UI modal
│   ├── hooks/
│   │   ├── useExecution.ts   # Tauri invoke execute_code, listen to stream events
│   │   ├── useSnippets.ts    # Snippet CRUD via Tauri commands
│   │   └── useSettings.ts    # Theme, font size, auto-run toggle
│   ├── store/
│   │   └── index.ts          # Zustand global state
│   ├── lib/
│   │   └── tauri.ts          # Typed wrappers around Tauri invoke/listen
│   └── App.tsx
└── docs/
    └── superpowers/specs/
        └── 2026-05-24-lexjs-design.md
```

---

## Features (Full RunJS Parity)

| Feature | Implementation |
|---|---|
| Split-pane layout | CSS Grid, resizable divider |
| Monaco Editor | `@monaco-editor/react`, TS language service enabled |
| Real-time execution | Debounced 500ms on editor change, toggle-able |
| Manual run | Cmd+R / Ctrl+R keyboard shortcut |
| Node.js environment | System node via Tauri Command |
| Browser environment | Sandboxed iframe with injected code |
| TypeScript support | esbuild transpile in npm workspace before node execution |
| npm package install | `npm install <pkg>` in `~/.lexjs/workspace/`, UI modal |
| npm package remove | `npm uninstall <pkg>` in workspace |
| Snippets library | SQLite in app data dir, sidebar panel |
| Light / dark theme | Tailwind dark mode + Monaco theme swap |
| Magic comments | `// =>` parsed from stdout, displayed inline |
| Web preview panel | Sandboxed iframe, HTML output detection |
| Environment variables | Stored in settings JSON, injected into node process env |
| File open / save | Tauri dialog + fs commands |
| Keyboard shortcuts | Cmd+R run, Cmd+S save, Cmd+E clear console, Cmd+K new |
| Console output | Colour-coded: log (white), warn (yellow), error (red) |

---

## Rust Tauri Commands

```rust
// Execution
execute_code(code: String, language: String) -> Result<(), String>
// Streams output via "execution-output" and "execution-done" events

// Packages
install_package(name: String) -> Result<String, String>
remove_package(name: String) -> Result<String, String>
list_packages() -> Result<Vec<Package>, String>

// Snippets
get_snippets() -> Result<Vec<Snippet>, String>
save_snippet(snippet: Snippet) -> Result<Snippet, String>
delete_snippet(id: String) -> Result<(), String>

// Settings
get_settings() -> Result<Settings, String>
save_settings(settings: Settings) -> Result<(), String>

// File system
open_file() -> Result<FileContent, String>
save_file(path: String, content: String) -> Result<(), String>
```

---

## Data Models

```typescript
interface Snippet {
  id: string
  name: string
  code: string
  language: "js" | "ts"
  createdAt: string
  updatedAt: string
}

interface Settings {
  theme: "dark" | "light"
  fontSize: number
  autoRun: boolean
  autoRunDelay: number
  nodeArgs: string[]
  envVars: Record<string, string>
}

interface ExecutionOutput {
  type: "stdout" | "stderr" | "info" | "magic"
  content: string
  timestamp: number
}
```

---

## Storage

| Data | Location | Format |
|---|---|---|
| Snippets | `{app_data}/lexjs/snippets.db` | SQLite |
| Settings | `{app_data}/lexjs/settings.json` | JSON |
| npm workspace | `~/.lexjs/workspace/` | node_modules + package.json |
| Temp execution files | OS temp dir | Cleaned up after each run |

---

## Error Handling

- Node.js not found: modal dialog with install link
- npm install failure: full npm error output shown in console panel
- Code execution error: stderr captured, shown in red with stack trace
- File save failure: toast notification with OS error message
- SQLite open failure: graceful fallback to in-memory snippets with warning

---

## Non-Goals (MVP)

- AI chat integration
- Logpoints
- Git integration
- Multi-tab editing
- Cloud sync
