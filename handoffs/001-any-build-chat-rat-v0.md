status: partial (requested local archive scope implemented 2026-10-16; original API page editor deferred)
for: any
from: Claude Opus 5.5 (claude-opus-5-5), 2026-10-09
needs: README.md, pet.json, sprite-20261009.json
---
## Task
Update 2026-10-16: Astra requested a clickable missing-chat saver, direct local model folders, YYYYMMDD organization, and eventual Pet Program harness chats. That scope is implemented in `chat-rat-20261016.mjs` and its dashboard. See README and `conversation-import-20261016.md`. The original API-powered page editor below was not requested in this session and remains unbuilt. No core/harness integration is claimed.

Build Chat Rat v0: one Node script (built-ins only) plus its app. Facts checked on Astra's PC on 2026-10-09:

**Sources**
- Claude Code + desktop Code tab: `~/.claude/projects/*/*.jsonl`. Keep `type: user|assistant` records with text blocks; skip `isSidechain`, tool_result-only user turns and `isMeta`. Title: `custom-title` record, else desktop meta `AppData/Roaming/Claude/claude-code-sessions/**/local_*.json` (`cliSessionId` = jsonl name, `title`).
- Codex: `~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl` and `~/.codex/archived_sessions/` (131 files, 1.1 GB). Keep `response_item` `message` user/assistant text; drop injected user turns (`<environment_context>`, AGENTS.md, `<user_instructions>`). Mark `session_meta.payload.source.subagent`. Titles: `~/.codex/session_index.jsonl` (`thread_name`).
- claude.ai and ChatGPT web chats are not on disk: read official export zips (`conversations.json`) dropped into the library's `inbox/`.

**Library** (outside this repo, never committed): `%USERPROFILE%\Documents\Chats` (override `CHAT_RAT_LIBRARY`). One Markdown file per chat at `<source>/<YYYY>/<MM>/<date>-<slug>-<id8>.md` with front matter (source, id, title, started, updated, cwd, model, raw path); `index.json`, `index.md`, `chat-rat-data.js`, a `README.md` telling any assistant how to search it. Incremental by mtime/size (`state.json`). Redact key-shaped strings (`sk-`, `ghp_`, `github_pat_`, `xox`).

**App**: `chat-rat-20261009.html` (pet well, search, source filters, open a chat) served by `node chat-rat.mjs` on 127.0.0.1, started by `Start Chat Rat.cmd`; falls back to `chat-rat-data.js` when double-clicked. **Page chat, bottom right**: Astra types a change, the server sends the page plus request to the OpenAI API (key from env only, never sent to the browser), saves the old page to `versions/`, reloads; an Undo button. Text into the DOM with `textContent`.

Optional, ask Astra first: a scheduled task to re-index every 15 minutes, and a line in `~/.claude/CLAUDE.md` and `~/.codex/AGENTS.md` pointing assistants at the library.

## Done when
`node chat-rat.mjs index` files every local Claude and Codex chat, the app lists and searches them, and the page chat edits the page with undo. Tests with made-up transcripts.

## Return
Work on a branch, open a PR, set this card to `status: done`.
