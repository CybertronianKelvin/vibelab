# VibeLab — Project Context for Claude

## What this is

VibeLab is a **local desktop scratchpad** built with Tauri v2 + Rust + React. It lets developers write and run JavaScript/TypeScript/PHP code with live streaming output, a built-in AI chat panel, an npm package manager, and project linking so the AI understands the user's codebase.

Landing page: https://cybertroniankelvin.github.io/vibelab/
GitHub repo: https://github.com/CybertronianKelvin/vibelab

## Tech stack

| Layer | Technology |
|---|---|
| Desktop shell | Tauri v2 |
| UI | React 18 · TypeScript · Tailwind CSS · Zustand |
| Editor | Monaco Editor (local npm package — NOT CDN) |
| Rust backend | tokio · reqwest · rusqlite · serde_json |
| Build | Vite · Vitest |
| Release | `npm run release <version>` → `gh release create` |

## Brand / design

- **Accent colour**: `#bc6900` (amber/orange) — Tailwind token: `brand-500`
- **Dark base**: `#0d0d0d` — Tailwind token: `surface-900`
- **Full palette**: defined in `tailwind.config.js` under `theme.extend.colors`
- Always use `brand-*` tokens for interactive elements, never green/emerald

## Architecture

```
src/                        React frontend
  components/               One folder per component
    AiChat/AiChat.tsx       AI chat panel (streaming tokens)
    Console/Console.tsx     Output panel with find/copy
    Editor/Editor.tsx       Monaco wrapper
    Toolbar/Toolbar.tsx     Top bar (language tabs, Run, settings)
    Sidebar/Sidebar.tsx     Snippets + history
    Settings/Settings.tsx   Settings drawer
    PackageManager/         npm install/remove UI
  hooks/
    useAiChat.ts            AI streaming hook + project dep reading
    useExecution.ts         Code run hook
    useSettings.ts          Settings persistence hook
  lib/
    monacoSetup.ts          MUST be imported first in main.tsx — configures Monaco to use local package, not CDN
    tauri.ts                Typed wrappers around all Tauri invoke() calls
  store/index.ts            Zustand store — single source of truth
  types/index.ts            Shared TypeScript types

src-tauri/src/
  ai.rs                     AI streaming — SSE via reqwest, 4 providers
  executor.rs               Node/tsx subprocess spawning + streaming output
  formatter.rs              Prettier formatting command
  lib.rs                    Tauri builder + all command registrations
  packages.rs               npm install/remove/list (workspace: ~/.vibelab/workspace/)
  project.rs                Project folder linking
  settings.rs               Settings persistence (~/.vibelab/settings.json)
  snippets.rs               SQLite snippet storage (~/.vibelab/snippets.db)
```

## Key conventions

- **Monaco**: always import `./lib/monacoSetup` as the very first import in `main.tsx`. Moving it lower breaks PHP/non-JS syntax highlighting in the Tauri WebView.
- **Workspace**: global npm packages live at `~/.vibelab/workspace/`. All `packages.rs` commands point there. The workspace `package.json` is auto-created on first use.
- **Settings**: stored at `~/.vibelab/settings.json`. New struct fields **must** have `#[serde(default)]` to avoid breaking existing installs.
- **AI providers**: Claude (x-api-key header), OpenAI / Groq / OpenRouter (Bearer + shared `call_openai_compat()` function, different endpoint URLs). Groq free tier: model `llama-3.3-70b-versatile`.
- **Streaming pattern**: Rust emits `"ai-token"` events via `app.emit()`. Frontend listens with `listenAiToken()` in `useAiChat.ts`. Same pattern as `"execution-output"` for code runs.
- **IPC**: all Tauri commands are typed in `src/lib/tauri.ts` as `tauriClient.*`. Never call `invoke()` directly from components.

## Zustand store (src/store/index.ts)

Key slices: `code`, `language`, `outputLines`, `isRunning`, `aiMessages`, `isAiStreaming`, `aiChatOpen`, `settings`, `project`, `snippets`, `history`.

## Release workflow

```bash
npm run release 0.2.0
```

Bumps version in `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, commits + tags, builds, and uploads artifacts to GitHub Releases via `gh`. Run on each platform (Mac/Win/Linux) to attach that platform's installer to the same tag.

## GitHub Pages

Landing page lives at `docs/index.html`, served from `docs/` folder on `main` branch. Edit it and push — no build step. The page links to GitHub Releases for downloads.

## What NOT to do

- Don't load Monaco workers from CDN — Tauri WebView blocks external URLs; use the local `monaco-editor` package
- Don't add new settings fields to `Settings` struct without `#[serde(default)]`
- Don't call `app.emit()` in Rust without `use tauri::Emitter;` in scope
- Don't commit `docs/superpowers/` — gitignored (internal planning docs)
- Don't rename the local `lexjs/` directory — it's just the clone path; remote and product are both `vibelab`
