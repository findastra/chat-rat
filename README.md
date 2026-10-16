# Chat Rat

*A pet app by Astra.*

<img src="art/idle-20261009.png" width="96" height="96" alt="Chat Rat, an aqua rat holding a scroll">

Chat Rat files every conversation Astra has with Claude or OpenAI (Claude Code, the Claude desktop app, Codex, claude.ai and ChatGPT) into one folder that every assistant can read, with an index.

## Status: growing — local archive v0.1.0

Chat Rat has a local **Save missing chats** tool, model/date folders, File Explorer folder buttons, a searchable title index and a conversation reader. It saves Codex and Claude Code transcripts from this PC, including Codex archived sessions. Official ChatGPT/Claude exports and other apps' normalized exports can be imported from the inbox. Chats stay outside this repository.

## How to run it

Requires Node.js 20 or newer. Double-click `start-chat-rat-20261016.cmd`, then click **Save missing chats** at `http://127.0.0.1:43127`. To save from a terminal, run `node chat-rat-20261016.mjs index`; to serve the dashboard, run `node chat-rat-20261016.mjs serve`.

The archive defaults to `%USERPROFILE%\Documents\Chats`, configurable with `CHAT_RAT_LIBRARY`. Files use `<model>/<YYYYMMDD>/<source>/chat-<stable-id>-YYYYMMDD.md` and matching JSON. Dates use America/Denver. A conversation using multiple models has a full copy under each recorded model. Missing metadata stays `unknown` / `unknown-date`. Source fragments with the same conversation id are merged; repeated messages are deduplicated. Removed upstream messages remain archived.

Repeated runs skip unchanged source files, refresh changed sources, and recreate missing archive outputs. The dated index, state and report are in the library root. Source files are never modified. The saver reports malformed records and retries them on the next run.

See [the saving skill](skills/save-chats/SKILL.md) and [conversation import format](conversation-import-20261016.md). Tests: `node --test test-chat-rat-20261016.mjs`.

## Limits

- Web-only chats require an export; no browser account scraping or new account connection is installed. ZIP imports read `conversations.json` directly; encrypted, ZIP64 and oversized ZIP entries require extraction first.
- Archive scope is user/assistant text and provenance. Internal reasoning, tool output, attachment binaries and audio are not archived. Known API-token patterns are redacted; other sensitive text may remain, so keep the library private.
- Pet Program exports preserve pet name, model and harness session; live chatbot wiring is future work. The shared L3 activity component defaults to disconnected. No AI seat, cloud API, core security grant, weekly backlog runner, schedule or native desktop click action is installed.
- ON/OFF controls only this local saver. Maintenance and notes are stored locally in this browser; no Farm health/backlog connection is claimed. The broader Pet Program framework is not fully implemented by this bounded archive tool.
- If a crash leaves a save lock, verify the recorded process has ended before removing that specific lock file. Partial completed files remain safe to re-index.

Built with OpenAI Codex (GPT-6), 20261016. Public credit: Astra.

Desktop appearance draft updated 2026-10-11: see [desktop details](desktop-pet-20261011.json). This changes the desktop pet, not application features.
