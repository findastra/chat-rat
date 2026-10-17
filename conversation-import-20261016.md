# Conversation imports

Chat Rat v0.1.0 accepts official ChatGPT or Claude `conversations.json` data or their ZIP exports in the archive inbox. Existing export filenames are read as received. Newly created exports should use dated lowercase names such as `pet-conversations-20261016.json`.

For any other local app or a Pet Program harness, write this format to the inbox after obtaining the transcript through that program's authorized interface:

```json
{
  "schema": 1,
  "conversations": [
    {
      "source": "pet-program",
      "id": "stable-conversation-id",
      "title": "Example conversation",
      "pet": "chat-rat",
      "harnessSession": "stable-seat-session-id",
      "started": "2026-10-16T16:00:00Z",
      "updated": "2026-10-16T16:01:00Z",
      "messages": [
        {"role": "user", "text": "Hello", "at": "2026-10-16T16:00:00Z"},
        {"role": "assistant", "text": "Hello", "model": "actual-recorded-model", "at": "2026-10-16T16:01:00Z"}
      ]
    }
  ]
}
```

Keep the source and id stable across exports; export the full conversation when it changes. Distinct pets should namespace their ids (for example `pet-name:session-id`). The model is the recorded model identity, not a claim that an agent is currently seated. Unknown models are filed as `unknown`. Dates use the conversation start in America/Denver; missing dates go into `unknown-date` with the import implementation's date on the filename. All ChatGPT export branches are retained with branch identifiers.

This is an import contract, not a live PetOS integration. No core permissions, chatbot hooks, or agent seats are modified. Chats deleted upstream remain in the archive. Images, voice, files, internal reasoning and tool outputs are outside this version's archive scope. Never put exports in the Git repository.
