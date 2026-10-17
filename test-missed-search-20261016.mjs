// Chat Rat's missed-* tools. Run: node --test test-missed-search-20261016.mjs. Claude Opus 5.5, 2026-10-16.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseArchived, missedPets, missedTools, missedRepos, missedDecisions, unfinishedRounds, unpushedWork, sweep } from './missed-search-20261016.mjs';

const md = `# Astra's PetOS

## user · gpt-6-astra · 2026-10-16T00:00:00Z

Rift Rabbit calls the Index Mole to investigate. Make the glass-animal-tool for Unity Unicorn. Call it Wonder Den.

## assistant · gpt-6-astra · 2026-10-16T00:01:00Z

17 of 68 — Name Mail Snail’s program. Pushed to findastra/old-name-repo and findastra/chat-rat. Branch codex/x-20261016 is not merged.
"question":"1 of 68 — Name Drum Dog’s program.","answer":"Bass & Biscuits — cheeky"
"question":"2 of 68 — Name Deck Duck’s program.","answer":"Deck Pond"
`;
const chats = [parseArchived(md, 'chat-abc123-20261016.md')];
const known = { pets: ['Rift Rabbit', 'Unity Unicorn', 'Mail Snail', 'Drum Dog', 'Deck Duck'], homes: ['Bass & Biscuits'], tools: [], repos: ['chat-rat'], tricks: [] };

test('parses Chat Rat\'s archive format', () => {
  assert.equal(chats[0].id, 'abc123');
  assert.equal(chats[0].messages.length, 2);
  assert.equal(chats[0].messages[0].role, 'user');
});

test('finds a pet named in chat but not on the list, Astra\'s first', () => {
  const p = missedPets({ chats, known });
  assert.deepEqual(p.map((x) => x.name), ['Index Mole']);
  assert.equal(p[0].byAstra, true);
});

test('finds tools, repos, decisions, stopped rounds and unmerged work', () => {
  assert.ok(missedTools({ chats, known }).some((t) => t.name === 'glass-animal-tool' || t.name === 'glass-animal'));
  assert.deepEqual(missedRepos({ chats, known }).map((r) => r.name), ['old-name-repo']);
  const d = missedDecisions({ chats, known }).map((x) => x.answer);
  assert.ok(d.includes('Deck Pond') && d.includes('Wonder Den') && !d.includes('Bass & Biscuits'));
  assert.deepEqual(unfinishedRounds({ chats }).map((r) => [r.stoppedAt, r.total]), [[17, 68]]);
  assert.equal(unpushedWork({ chats })[0].branch, 'codex/x-20261016');
});

test('the sweep runs every tool and is read-only', () => {
  const all = sweep({ chats, known });
  assert.deepEqual(Object.keys(all), ['missed-pets-search', 'missed-tools-search', 'missed-repos-search', 'missed-decisions-search', 'unfinished-rounds-search', 'unpushed-work-search']);
  assert.equal(chats[0].messages.length, 2, 'inputs untouched');
});
