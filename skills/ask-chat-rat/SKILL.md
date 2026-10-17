---
name: ask-chat-rat
description: Ask Chat Rat to find something in Astra's past Claude and OpenAI chats (what she asked for, what was decided, where a plan was written). Use instead of searching the Chats folder yourself.
---

# Ask Chat Rat

Chat Rat answers questions about past conversations. Ask it; do not grep `Documents\Chats` yourself, because a direct search skips the saved tool and the next assistant has to work it out again.

## Ask

```
node chat-rat-20261016.mjs ask "what was the portfolio website supposed to be" --also "Portfolio Puffer,autobiography"
```

- Chat Rat first saves any missing chats, so this session and recent ones are included. Use `--no-save` only when a save is already running.
- `--also` adds words you expect in the answer that the question does not contain: names, repo names, a phrase the user used.
- `--limit 5`, `--from YYYYMMDD`, `--to YYYYMMDD` narrow the results. `--json` returns structured results.
- `--pin <chatId>` marks a chat as the right answer for this topic, so it stays first for the next asker.
- `--tool <name>` uses a named tool on purpose.

While the dashboard runs, the same query is `GET /api/query?q=...&also=...` with the page's `X-Chat-Rat-Token`.

## What it does

1. **Index.** A word index of every saved chat (`word-index-20261017.json` in the library). It rebuilds only chats whose saved files changed, so later questions answer in milliseconds.
2. **Tool.** For each question Chat Rat reuses the saved tool that already covers it, or invents one: its search words, phrases, pinned chats and what it found last time. Tools are in `tools/` in the library. `node chat-rat-20261016.mjs tools` lists them.
3. **Answer.** The best chats, with dates, models, the file path and short quotes. Harness text (system reminders, injected instructions) is never quoted.

## Rules

- The answer quotes Astra's private chats. Use it to do the task; do not paste it into public files.
- Read the quoted chat file before relying on a decision. A quote is a pointer, not the whole context.
- Tools and indexes stay in the library, never in this repo.
