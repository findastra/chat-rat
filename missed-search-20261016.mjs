// Chat Rat's missed-* tools (Astra, 2026-10-16). Node built-ins only. By Astra; Claude Opus 5.5 (claude-opus-5-5).
//
// Chat Rat already SAVES every conversation (chat-rat-20261016.mjs). These tools READ the saved library and list what
// was said in a chat but never landed where it belongs, so nothing decided in a conversation gets lost:
//   missed-pets-search        pet names said in chats that are not in The Farm's one list (pet-programs.json)
//   missed-tools-search       tool names (kebab-case, called a tool) that no pet.json lists
//   missed-repos-search       repos named in chats (findastra/x, github.com/findastra/x) that do not exist
//   missed-decisions-search   Astra's answers to naming or tool questions whose answer is not recorded
//   unfinished-rounds-search  rounds that stopped part way ("17 of 68") and never reached the end
//   unpushed-work-search      branches and folders chats said are local-only or unmerged
//   missed-anything-sweep     all of the above in one run: Chat Rat's three-click quick tool
// Read-only: it never edits a list, a repo or a chat. It writes one dated report into the chat library (outside
// this repo). Fixing what it finds goes through The Farm's one list and Astra.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

export const TOOLS = ['missed-pets-search', 'missed-tools-search', 'missed-repos-search', 'missed-decisions-search', 'unfinished-rounds-search', 'unpushed-work-search'];
const ANIMALS = 'aardvark|albatross|alligator|alpaca|angel|ant|armadillo|axolotl|badger|bat|bear|beaver|bee|beetle|bot|bug|bunny|butterfly|camel|cat|chameleon|chick|cobra|coyote|crab|crane|crow|cub|damsel|deer|dodo|dog|dolphin|dormouse|dove|dragon|dragonfly|duck|eagle|eel|falcon|fairy|ferret|finch|fish|fox|frog|gecko|ghost|giraffe|goat|goddess|goldfish|goose|gopher|hamster|hare|hawk|hedgehog|heron|hippo|hound|hummy|hyena|ibis|iguana|jay|jellyfish|kitten|koala|lamb|lemur|leopard|lion|lizard|llama|lobster|lynx|macaw|mink|mole|monkey|moose|moth|mouse|newt|octopus|officer|otter|owl|panda|panther|parrot|peacock|pelican|penguin|pig|piranha|platypus|pony|puffer|puffin|pup|puppy|python|quokka|rabbit|raccoon|rat|raven|retriever|salamander|seal|sealion|shark|sheep|sloth|snail|snake|spider|squid|squirrel|stoat|swan|tiger|toad|tortoise|toucan|turtle|unicorn|urchin|vole|vulture|walrus|wasp|weasel|whale|wisp|wolf|worm|yak|zebra';
const PET_NAME = new RegExp(`\\b((?:[A-Z][\\w'’]*\\s){1,2}(?:${ANIMALS.split('|').map((a) => a[0].toUpperCase() + a.slice(1)).join('|')}))\\b`, 'g');
const LEAD = /^(?:L[1-4]|The|A|An|And|Or|For|To|Of|In|On|With|My|Your|Our|Is|Its|It's|This|That|Each|Every|Hi|Hey|So|If|When|While|Now|Name|Add|Added|Adding|Make|Start|Open|Build|Dump|Keep|Remove|Put|Read|Click|One|Existing|Updated|Launch|Created|Published|Desktop|Found|Confirmed|Preserved|Reconcile|Improved|Whether|Only|No|Store|Testing|Verified|Astra['’]s|Astra)\s+/;

/** Parse one archived Markdown conversation (Chat Rat's format: "## user · model · time"). */
export function parseArchived(text, file = '') {
  const title = (text.split('\n', 1)[0] || '').replace(/^#\s*/, '');
  const parts = text.split(/\n## (user|assistant) · [^\n]*\n/);
  const messages = [];
  for (let i = 1; i < parts.length - 1; i += 2) messages.push({ role: parts[i], text: parts[i + 1].replace(/<system-reminder>[\s\S]*?<\/system-reminder>/g, '').trim() });
  const id = (/chat-([0-9a-f]+)-/.exec(file) || [])[1] || file;
  return { id, title, file, messages };
}

const quote = (t, i, n = 140) => t.slice(Math.max(0, i - n / 2), i + n / 2).replace(/\s+/g, ' ').trim();
const lower = (s) => s.toLowerCase().replace(/[’]/g, "'");

/** @param {{ chats, known }} input  known: { pets:[], homes:[], tools:[], repos:[] } (names, any case) */
export function missedPets({ chats, known }) {
  const have = new Set([...known.pets, ...known.homes].map(lower));
  const found = new Map();
  for (const c of chats) for (const m of c.messages) {
    for (const x of m.text.matchAll(PET_NAME)) {
      let name = x[1].trim();
      while (LEAD.test(name)) name = name.replace(LEAD, '');
      if (name.split(/\s+/).length < 2 || have.has(lower(name))) continue;
      const f = found.get(name) || { name, count: 0, chats: new Set(), byAstra: false, quote: quote(m.text, x.index) };
      f.count++; f.chats.add(c.id); if (m.role === 'user') f.byAstra = true;
      found.set(name, f);
    }
  }
  return [...found.values()].sort((a, b) => b.byAstra - a.byAstra || b.count - a.count).map((f) => ({ ...f, chats: [...f.chats] }));
}

// Words that look like tool names but are ordinary English or app plumbing.
const NOT_TOOLS = /^(read-only|read-write|built-in|command-line|light-blue|chat-created|tool-use-id|tool-use|open-source|up-to-date|one-click|two-click|three-click|step-by-step|third-party|real-time|long-running|end-to-end|self-report|non-.*|re-.*|codex-app-tools|new-pet-or|pet-program)$/;

export function missedTools({ chats, known }) {
  const have = new Set(known.tools.map(lower));
  const found = new Map();
  const re = /`?\b([a-z][a-z0-9]*(?:-[a-z0-9]+){1,6})\b`?(?=[^.\n]{0,60}\btool\b)|\btool\b[^.\n]{0,40}?`([a-z][a-z0-9]*(?:-[a-z0-9]+){1,6})`/g;
  for (const c of chats) for (const m of c.messages) for (const x of m.text.matchAll(re)) {
    const name = x[1] || x[2];
    if (have.has(name) || NOT_TOOLS.test(name) || /^(pet-program-\d+|\d)|\d{8}$|[0-9a-f]{4,}-[0-9a-f]{4}/.test(name) || known.repos.map(lower).includes(name) || (known.tricks || []).includes(name)) continue;
    const f = found.get(name) || { name, count: 0, chats: new Set(), byAstra: false, quote: quote(m.text, x.index) };
    f.count++; f.chats.add(c.id); if (m.role === 'user') f.byAstra = true;
    found.set(name, f);
  }
  return [...found.values()].filter((f) => f.byAstra || f.count > 1).sort((a, b) => b.byAstra - a.byAstra || b.count - a.count).map((f) => ({ ...f, chats: [...f.chats] }));
}

export function missedRepos({ chats, known }) {
  const have = new Set(known.repos.map(lower));
  const found = new Map();
  const re = /(?:github\.com\/findastra\/|findastra\/)([a-z0-9][a-z0-9._-]*[a-z0-9])/gi;
  for (const c of chats) for (const m of c.messages) for (const x of m.text.matchAll(re)) {
    const name = x[1].replace(/\.git$/, '');
    if (have.has(lower(name)) || /^(findastra|.*\.(?:md|html|json|png))$/i.test(name)) continue;
    const f = found.get(name) || { name, count: 0, chats: new Set(), quote: quote(m.text, x.index) };
    f.count++; f.chats.add(c.id); found.set(name, f);
  }
  return [...found.values()].sort((a, b) => b.count - a.count).map((f) => ({ ...f, chats: [...f.chats] }));
}

/** Astra's answers to "Name …" / "call it" questions whose chosen name is not in the one list. */
export function missedDecisions({ chats, known }) {
  const have = new Set([...known.pets, ...known.homes, ...known.tools].map(lower));
  const out = [];
  const qa = /"question":"([^"]*?(?:\bName\b|\bcalled\b|pet program called|which pairing)[^"]*)","answer":"([^"]*)"/g;
  for (const c of chats) for (const m of c.messages) {
    for (const x of m.text.matchAll(qa)) {
      const chosen = x[2].split(/ — | - |\. |, but /)[0].trim();
      if (chosen.length > 60 || chosen.split(/\s+/).length > 6 || have.has(lower(chosen))) continue;
      if ([...have].some((h) => lower(chosen).includes(h) && h.length > 4)) continue;
      out.push({ chat: c.id, title: c.title, question: x[1].slice(0, 160), answer: chosen });
    }
    if (m.role !== 'user') continue;
    for (const x of m.text.matchAll(/\b(?:[Cc]all (?:it|him|her|this)|[Nn]ame (?:it|him|her|this)|[Rr]ename (?:it|him|her) to)\s+(?:the\s+)?["“]?([A-Z][\w'’&]*(?:\s+[A-Z&][\w'’]*){0,3})/g)) {
      if (!have.has(lower(x[1]))) out.push({ chat: c.id, title: c.title, question: 'said in chat', answer: x[1] });
    }
  }
  const seen = new Set();
  return out.filter((d) => !seen.has(d.answer) && seen.add(d.answer));
}

/** Rounds like "17 of 68" whose highest number in that chat never reached the total. */
export function unfinishedRounds({ chats }) {
  const out = [];
  for (const c of chats) {
    const rounds = new Map();
    for (const m of c.messages) for (const x of m.text.matchAll(/(?:\b(?:Round|Flash Audit)\s+)?\b(\d{1,3})(?: of |\/)(\d{1,3})\b(?:\s*[—–-]\s*([^\n.]{0,60}))?/g)) {
      if (!x[3] && !/^(Round|Flash Audit)/.test(x[0])) continue;
      const [n, total] = [+x[1], +x[2]];
      if (total < 5 || n > total) continue;
      const r = rounds.get(total) || { total, last: 0, label: '' };
      if (n >= r.last) { r.last = n; r.label = (x[3] || '').trim(); }
      rounds.set(total, r);
    }
    for (const r of rounds.values()) if (r.last < r.total && r.last > 1) out.push({ chat: c.id, title: c.title, stoppedAt: r.last, total: r.total, last: r.label });
  }
  return out;
}

/** Work a chat said is only on the PC, on an unmerged branch or in a draft PR. */
export function unpushedWork({ chats }) {
  const out = []; const seen = new Set();
  const re = /((?:codex|claude)\/[a-z0-9._-]+)[^\n]{0,120}?\b(not merged|unmerged|draft PR|not pushed|only on (?:the|your|Astra's) PC|local only|never pushed)\b/gi;
  for (const c of chats) for (const m of c.messages) for (const x of m.text.matchAll(re)) {
    const key = x[1] + x[2].toLowerCase();
    if (seen.has(key)) continue; seen.add(key);
    out.push({ chat: c.id, title: c.title, branch: x[1], said: x[2], quote: quote(m.text, x.index, 200) });
  }
  return out;
}

export function sweep(input) {
  return { 'missed-pets-search': missedPets(input), 'missed-tools-search': missedTools(input), 'missed-repos-search': missedRepos(input), 'missed-decisions-search': missedDecisions(input), 'unfinished-rounds-search': unfinishedRounds(input), 'unpushed-work-search': unpushedWork(input) };
}

/** What The Farm already knows: its one list (pet-programs.json) plus every pet.json under the pet folder. */
export async function loadKnown({ programsFile, petsDir }) {
  const known = { pets: [], homes: [], tools: [], repos: [] };
  try {
    const programs = JSON.parse(await fs.readFile(programsFile, 'utf8')).programs;
    for (const p of programs) { known.pets.push(p.icon); if (p.assigned) known.homes.push(p.program); known.repos.push(p.repo); }
  } catch { /* no list: everything is reported, which is honest */ }
  try {
    for (const d of await fs.readdir(petsDir, { withFileTypes: true })) {
      if (!d.isDirectory()) continue;
      known.repos.push(d.name);
      try {
        const pj = JSON.parse(await fs.readFile(path.join(petsDir, d.name, 'pet.json'), 'utf8'));
        if (pj.pet) known.pets.push(pj.pet);
        try { for (const s of await fs.readdir(path.join(petsDir, d.name, 'skills'))) (known.tricks ||= []).push(s); } catch { /* no skills */ }
        for (const t of pj.tools || []) { if (t.name) known.tools.push(t.name.replace(/-v\d.*$/, ''), t.name); if (t.id) known.tools.push(t.id); }
      } catch { /* folder without pet.json */ }
    }
  } catch { /* no pet folder on this machine */ }
  return known;
}

export async function loadChats(library) {
  const chats = []; const seen = new Set();
  async function walk(dir) {
    let list; try { list = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const e of list) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) await walk(p);
      else if (/^chat-[0-9a-f]+-\d{8}\.md$/.test(e.name)) {
        const c = parseArchived(await fs.readFile(p, 'utf8'), e.name);
        if (!seen.has(c.id)) { seen.add(c.id); chats.push(c); }
      }
    }
  }
  await walk(library);
  return chats;
}

export function report(result, date) {
  const lines = [`# Chat Rat: missed-anything sweep, ${date}`, '', '*Read-only. Fix findings in The Farm\'s one list (astras-pet-os/pet-programs.json) with Astra.*', ''];
  for (const [tool, rows] of Object.entries(result)) {
    lines.push(`## ${tool} (${rows.length})`, '');
    if (!rows.length) { lines.push('Nothing missed.', ''); continue; }
    for (const r of rows.slice(0, 60)) lines.push('- ' + Object.entries(r).filter(([k]) => k !== 'chats').map(([k, v]) => `**${k}:** ${Array.isArray(v) ? v.join(', ') : v}`).join(' · '));
    lines.push('');
  }
  return lines.join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, '$1'))) {
  const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
  const home = os.homedir();
  const library = arg('--library', process.env.CHAT_RAT_LIBRARY || path.join(home, 'Documents', 'Chats'));
  const petsDir = arg('--pets', path.join(home, 'Documents', "Astra's Pet Apps"));
  const programsFile = arg('--programs', path.join(petsDir, 'astras-pet-os', 'pet-programs.json'));
  const only = arg('--tool', 'missed-anything-sweep');
  const input = { chats: await loadChats(library), known: await loadKnown({ programsFile, petsDir }) };
  const all = sweep(input);
  const result = only === 'missed-anything-sweep' ? all : { [only]: all[only] || [] };
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Denver' }).format(new Date()).replaceAll('-', '');
  const out = path.join(library, `missed-report-${date}.md`);
  await fs.writeFile(out, report(result, date));
  console.log(Object.entries(result).map(([k, v]) => `${k}: ${v.length}`).join('\n') + `\nReport: ${out}`);
}
