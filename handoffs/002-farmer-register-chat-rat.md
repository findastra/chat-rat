status: open
for: farmer (any assistant working on astras-pet-apps)
from: Claude Opus 5.5 (claude-opus-5-5), 2026-10-09
needs: findastra/astras-pet-apps PET-FILES.md, pets.json, scripts/generate-pets.mjs; this repo's sprite-20261009.json
---
## Task
1. In astras-pet-apps (on a branch; its local folder has someone else's uncommitted work): copy `art/mood-sheet-20261009.png` to `art/sheets/chat-rat-20261009.png`, add the `prompt_line` from `sprite-20261009.json` to `PETS`, add the pets.json entry (`repo/art: chat-rat`, `pet: Chat Rat`, `role: pet`, `kind`: a ground kind, `status: hatching`, `visibility: private`, `published: false`, `added: 2026-10-09`, `asset_date: 20261009`, job from pet.json). **Do not regenerate the art** (it is paid and already made). `npm run build && npm run check && npm test`, open a PR.
2. Add Chat Rat to the pet list in the `findastra/findastra` profile README (the bio), with Astra's OK.

## Return
PR links here, `status: done`.
