# AGENTS.md

Google Apps Script (V8) project deployed with [clasp](https://github.com/google/clasp). No app framework, no build step.

## Commands

- Deploy: `clasp push` (uploads files from repo root per `.clasp.json`, `rootDir: ""`).
- Execute a function remotely: `clasp run <functionName>`.
- Requires authenticated Google account: `clasp login`.
- There are **no** npm scripts, tests, linter, or typecheck. `package.json` only pins `@types/google-apps-script` for editor hints.

## Gotchas

- `clasp` is installed **globally** (v3.3.0 at `%AppData%\Roaming\npm`), not in `node_modules`. Do not run `npx clasp` or add it via `npm install`; just call `clasp`.
- No `.claspignore` exists, so clasp's default ignore set applies: only `.js`/`.gs`/`.ts`/`.html` source plus `appsscript.json` are pushed; `node_modules` and `.git` are skipped automatically.
- All script files must live in the repo root (rootDir is `""`). `Code.js` is currently a stub (`myFunction`).
- Apps Script has no module system here: top-level functions are the entrypoints; globals are implicit `globalThis`. `filePushOrder` is empty, so files upload alphabetically.
- Not a git repository yet; no `.gitignore`.
