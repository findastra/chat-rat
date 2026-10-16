# AGENTS.md: Chat Rat

Pet app in Astra's Pet Apps (`findastra/chat-rat`). Rules: https://github.com/findastra/astras-pet-apps/blob/main/PET-FILES.md

- Public credit is always Astra.
- **Never commit chat contents.** The chat library lives outside this repo (planned: `Documents\Chats`).
- No keys, `.env` files or personal data. Node built-ins only.
- Read `handoffs/` first.
- Built with: Claude Opus 5.5 (claude-opus-5-5), 2026-10-09 (seed, plan, art).

Desktop appearance revision by OpenAI Codex (GPT-6), 2026-10-11. See desktop-pet-20261011.json; runtime behavior is in astras-pet-apps.

Local conversation archive and dashboard by OpenAI Codex (GPT-6), 2026-10-16. Read `skills/save-chats/SKILL.md` for saving and `conversation-import-20261016.md` for adapters. Test with `node --test test-chat-rat-20261016.mjs`. Submit pet metadata through `pet.json` for the Farmer; core/harness integration remains separate. New implementation files use dated lowercase names; the required skill entrypoint is `SKILL.md`.
