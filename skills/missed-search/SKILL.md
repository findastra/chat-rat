---
name: missed-search
description: Chat Rat's missed-* tools. Read the saved AI conversations and list pets, tools, repos, naming decisions, stopped rounds and unmerged work that never reached The Farm's one list. Use when Astra asks what was missed, before a naming or Flash Audit round, or after a long session with several assistants.
---

# Missed search (Astra, 2026-10-16)

Chat Rat saves every conversation. These tools **read** the saved library and report what was said in a chat but never recorded. They are read-only: they never change a list, a repo or a chat.

| Tool | Finds |
|---|---|
| `missed-pets-search` | Pet names (two words ending in an animal) that are not in `astras-pet-os/pet-programs.json` or a pet.json. Astra's own mentions come first. Old names (Journal Jay, Healthy Hummy) show up here too |
| `missed-tools-search` | Kebab-case names talked about as a tool that no pet.json lists |
| `missed-repos-search` | `findastra/<repo>` names that don't exist. Usually an old name, which means a stale link somewhere |
| `missed-decisions-search` | Astra's answers to "Name …" questions, and "call it …" in her messages, that aren't recorded |
| `unfinished-rounds-search` | "17 of 68"-style rounds that stopped before the end, with the last question asked |
| `unpushed-work-search` | `codex/…` or `claude/…` branches a chat called unmerged, a draft, or only on the PC |
| `missed-anything-sweep` | All of the above, one dated report. Chat Rat's three-click quick tool |

## Run
```
node missed-search-20261016.mjs                      # the sweep; report: Documents\Chats\missed-report-YYYYMMDD.md
node missed-search-20261016.mjs --tool missed-pets-search
```
Defaults: library `%USERPROFILE%\Documents\Chats`, pet folders `%USERPROFILE%\Documents\Astra's Pet Apps`, list `astras-pet-os\pet-programs.json` in that folder. Use `--library`, `--pets` and `--programs` to change them.

## After a run
Fix findings only through The Farm's one list (`pet-programs.json`) and only with Astra's OK. Never edit a chat. The report stays in the chat library, outside every repo, because it quotes conversations.

## Limits
- It only sees conversations Chat Rat has saved. ChatGPT and claude.ai web, phone and laptop chats only appear after their account exports are dropped into `Documents\Chats\inbox` and saved.
- The pet-name search reads two capitalised words ending in an animal word, so hardware names (Pimoroni Badger) can show up. Read the quote.
