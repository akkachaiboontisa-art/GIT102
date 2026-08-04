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
- All script files must live in the repo root (rootDir is `""`). Backend is `Code.js` (kept as `.js`, not `.gs` — both extensions are pushed, so don't add a second backend file or you'll get duplicate-function compile errors). UI is a single self-contained `Index.html` (CSS and client JS are inline in that one file; `doGet` serves it via `createTemplateFromFile('Index')` — do NOT re-split into `StyleSheet.html`/`JavaScript.html`).
- This is a student whiteboard web app. On first use the backend auto-creates a spreadsheet (ID stored in Script Properties) and a `Whiteboard Submissions` Drive folder. `DB_SPREADSHEET_ID` / `DB_FOLDER_ID` in `Code.js` pin these instead (set for this deployment).
- `appsscript.json` declares the web app (`executeAs: USER_DEPLOYING`, `access: DOMAIN`). After pushing, redeploy with `clasp deploy --deploymentId <id>` or in the editor — `.../exec` serves the frozen version at deploy time, so a stale URL means a stale version.
- `doGet` accepts optional query params `?view=` and `?assignmentId=`; otherwise the client routes by role.
- Apps Script has no module system here: top-level functions are the entrypoints; globals are implicit `globalThis`. `filePushOrder` is empty, so files upload alphabetically.
- Git repo initialized (single `first commit`); no `.gitignore` yet, so avoid committing `node_modules/` or a real `appsscript.json`/`.clasp.json` if you add secrets later.
