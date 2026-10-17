// Chat Rat's query side. Another assistant asks a question; Chat Rat builds (or reuses) a search tool for it,
// answers from a word index, and keeps the tool so the next asker starts where this one finished.
// Indexes and tools are derived from chats, so they live in the library next to the chats, never in this repo.
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {slug} from './chat-rat-20261016.mjs';

const CONTROL = '20261016', QUERY = '20261017';
const STOP = new Set('a an and are as at be but by can did do does for from had has have how i if in into is it its me my no not of on or our so that the their them then there these they this to too us was we were what when where which who why will with would you your about just like want need make let lets ok okay yes chat chats find look said say tell know'.split(' '));
const read = async (file, fallback) => { try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch (e) { if (e.code === 'ENOENT') return fallback; throw e; } };
const write = async (file, data) => { await fs.mkdir(path.dirname(file), {recursive: true}); const temp = `${file}.writing-${randomBytes(4).toString('hex')}`; await fs.writeFile(temp, JSON.stringify(data, null, 1)); await fs.rename(temp, file); };

/** Lowercase words, stop words dropped, a light plural fold so "pets" finds "pet". */
export function terms(text) {
 return String(text).toLowerCase().normalize('NFKD').split(/[^a-z0-9]+/)
  .filter(w => w.length > 1 && !STOP.has(w))
  .map(w => w.length > 4 && w.endsWith('ies') ? w.slice(0, -3) + 'y' : w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w);
}
const phrasesOf = q => [...String(q).matchAll(/"([^"]{2,80})"/g)].map(m => m[1].toLowerCase());

export const paths = cfg => ({
 chatIndex: path.join(cfg.library, `chat-index-${CONTROL}.json`),
 wordIndex: path.join(cfg.library, `word-index-${QUERY}.json`),
 tools: path.join(cfg.library, 'tools'),
});

/** Inverted index: term -> {chatId: count}. Rebuilt only for chats whose saved files changed. */
export async function buildWordIndex(cfg) {
 const p = paths(cfg), archive = await read(p.chatIndex, {chats: []});
 const old = await read(p.wordIndex, {schema: 1, docs: {}, postings: {}});
 const docs = {}, postings = {};
 let rebuilt = 0, kept = 0;
 for (const chat of archive.chats) {
  const file = path.join(cfg.library, chat.files[0].replace(/\.md$/, '.json'));
  let stat; try { stat = await fs.stat(file); } catch { continue; }
  const sig = `${stat.size}:${stat.mtimeMs}`;
  if (old.docs[chat.id]?.sig === sig) { docs[chat.id] = old.docs[chat.id]; kept++; continue; }
  const body = await read(file, null); if (!body) continue;
  const counts = {}; let length = 0;
  for (const w of terms(chat.title + '\n' + body.messages.map(m => m.text).join('\n'))) { counts[w] = (counts[w] || 0) + 1; length++; }
  docs[chat.id] = {sig, length, counts}; rebuilt++;
 }
 for (const [id, d] of Object.entries(docs)) for (const [w, n] of Object.entries(d.counts)) (postings[w] ||= {})[id] = n;
 const index = {schema: 1, built: new Date().toISOString(), archiveAt: archive.report?.at || null, docs, postings};
 await write(p.wordIndex, index);
 return {index, rebuilt, kept};
}

/** Uses the saved index unless the archive was re-saved since it was built. */
export async function loadWordIndex(cfg) {
 const p = paths(cfg), [index, archive] = await Promise.all([read(p.wordIndex, null), read(p.chatIndex, {chats: [], report: null})]);
 if (index && index.archiveAt === (archive.report?.at || null) && Object.keys(index.docs).length === archive.chats.length) return {index, rebuilt: 0, kept: Object.keys(index.docs).length, cached: true};
 return {...await buildWordIndex(cfg), cached: false};
}

export async function listTools(cfg) {
 const dir = paths(cfg).tools; let names = [];
 try { names = (await fs.readdir(dir)).filter(n => n.endsWith('-tool.json')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
 return Promise.all(names.map(n => read(path.join(dir, n), null))).then(t => t.filter(Boolean));
}

/** Reuse the saved tool that best fits this question (score >= 0.5); otherwise invent one. */
export async function toolFor(cfg, question, {also = [], name} = {}) {
 const wanted = [...new Set([...terms(question), ...also.flatMap(terms)])];
 if (!wanted.length) throw Error('Ask with at least one meaningful word.');
 const tools = await listTools(cfg);
 let best = null, bestScore = 0;
 for (const t of tools) {
  if (name && t.name === slug(name)) { best = t; bestScore = 1; break; }
  // Jaccard overlap, or how much of this question the tool already covers (a narrower re-ask of the same topic).
  const a = new Set(t.terms), inter = wanted.filter(w => a.has(w)).length, score = Math.max(inter / new Set([...t.terms, ...wanted]).size, wanted.length >= 2 ? inter / wanted.length - .15 : 0);
  if (score > bestScore) { best = t; bestScore = score; }
 }
 const now = new Date().toISOString();
 if (best && bestScore >= 0.5) {
  best.terms = [...new Set([...best.terms, ...wanted])];
  best.phrases = [...new Set([...(best.phrases || []), ...phrasesOf(question)])];
  best.questions = [...new Set([...(best.questions || []), question])].slice(-20);
  return {tool: best, reused: true, overlap: +bestScore.toFixed(2), now};
 }
 const base = slug(name || wanted.slice(0, 4).join(' ')).slice(0, 60);
 let toolName = base; for (let i = 2; tools.some(t => t.name === toolName); i++) toolName = `${base}-${i}`;
 return {tool: {schema: 1, name: toolName, terms: wanted, phrases: phrasesOf(question), questions: [question], pinned: [], created: now, uses: 0}, reused: false, overlap: 0, now};
}

// Harness text (system reminders, injected instructions) is not what anyone said, so it is never quoted.
const spoken = text => String(text).replace(/<(system-reminder|environment_context|user_instructions|command-[a-z-]+)>[\s\S]*?<\/\1>/g, ' ').trim();
function quotes(body, wanted, phrases, max = 3) {
 const set = new Set(wanted), out = [], seen = new Set();
 const scored = body.messages.map(m => ({...m, text: spoken(m.text)})).filter(m => m.text && !seen.has(m.text) && seen.add(m.text)).map((m, i) => {
  const words = terms(m.text), hits = words.filter(w => set.has(w)).length;
  const phraseHit = phrases.some(ph => m.text.toLowerCase().includes(ph));
  return {i, m, score: hits + (phraseHit ? 10 : 0) + (m.role === 'user' ? 1 : 0)};
 }).filter(s => s.score > 1).sort((a, b) => b.score - a.score).slice(0, max);
 for (const {m} of scored.sort((a, b) => a.i - b.i)) {
  const lower = m.text.toLowerCase();
  const at = Math.max(0, Math.min(...[...set, ...phrases].map(w => lower.indexOf(w)).filter(n => n >= 0), lower.length));
  const start = Math.max(0, at - 120), text = m.text.slice(start, start + 420).replace(/\s+/g, ' ').trim();
  out.push({role: m.role, model: m.model || 'unknown', at: m.at || null, text: (start ? '…' : '') + text + (start + 420 < m.text.length ? '…' : '')});
 }
 return out;
}

/** BM25 over the word index, with the tool's pinned chats lifted. Saves the tool with what it found. */
export async function ask(cfg, question, {also = [], name, limit = 5, from, to, pin = []} = {}) {
 const started = Date.now();
 const {index, rebuilt, kept, cached} = await loadWordIndex(cfg);
 const archive = await read(paths(cfg).chatIndex, {chats: []});
 const byId = new Map(archive.chats.map(c => [c.id, c]));
 const {tool, reused, overlap, now} = await toolFor(cfg, question, {also, name});
 tool.pinned = [...new Set([...(tool.pinned || []), ...pin])];
 const N = Object.keys(index.docs).length || 1, avg = Object.values(index.docs).reduce((s, d) => s + d.length, 0) / N || 1;
 const scores = {};
 for (const w of tool.terms) {
  const post = index.postings[w]; if (!post) continue;
  const idf = Math.log(1 + (N - Object.keys(post).length + .5) / (Object.keys(post).length + .5));
  for (const [id, f] of Object.entries(post)) { const len = index.docs[id].length; scores[id] = (scores[id] || 0) + idf * f * 2.2 / (f + 1.2 * (.25 + .75 * len / avg)); }
 }
 for (const id of tool.pinned) if (byId.has(id)) scores[id] = (scores[id] || 0) + 1000;
 const inRange = c => (!from || c.date >= from) && (!to || c.date <= to);
 const ranked = Object.entries(scores).filter(([id]) => byId.has(id) && inRange(byId.get(id))).sort((a, b) => b[1] - a[1]).slice(0, limit);
 const results = [];
 for (const [id, score] of ranked) {
  const c = byId.get(id), body = await read(path.join(cfg.library, c.files[0].replace(/\.md$/, '.json')), {messages: []});
  results.push({id, title: c.title, date: c.date, models: c.models, file: path.join(cfg.library, c.files[0]), score: +score.toFixed(2), pinned: tool.pinned.includes(id), quotes: quotes(body, tool.terms, tool.phrases || [])});
 }
 tool.uses = (tool.uses || 0) + 1; tool.lastUsed = now; tool.lastFound = results.map(r => r.id);
 await write(path.join(paths(cfg).tools, `${tool.name}-tool.json`), tool);
 return {question, tool: {name: tool.name, reused, overlap, terms: tool.terms, uses: tool.uses}, index: {chats: N, cached, rebuilt, kept, archiveAt: index.archiveAt}, ms: Date.now() - started, results};
}

/** Plain-text answer for terminals and for pasting into another assistant's context. */
export function format(answer) {
 const lines = [`Chat Rat: ${answer.results.length} chat(s) for "${answer.question}"`,
  `Tool: ${answer.tool.name} (${answer.tool.reused ? `reused, ${answer.tool.uses} uses` : 'new'}) · terms: ${answer.tool.terms.join(', ')}`,
  `Index: ${answer.index.chats} chats, ${answer.index.cached ? 'cached' : `rebuilt ${answer.index.rebuilt}, kept ${answer.index.kept}`} · archive saved ${answer.index.archiveAt || 'never'} · ${answer.ms} ms`, ''];
 for (const r of answer.results) {
  lines.push(`## ${r.title}`, `${r.date} · ${r.models.join(', ')} · score ${r.score}${r.pinned ? ' · pinned' : ''}`, r.file);
  for (const q of r.quotes) lines.push(`  > [${q.role} · ${q.model}${q.at ? ' · ' + q.at : ''}] ${q.text}`);
  lines.push('');
 }
 if (!answer.results.length) lines.push('Nothing matched. Try other words with --also, or save new chats first.');
 return lines.join('\n');
}
