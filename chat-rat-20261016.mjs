// Chat Rat by Astra. Node built-ins only; conversation data never belongs in this repo.
import fs from 'node:fs/promises';
import {createReadStream, existsSync} from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline';
import {createHash, randomBytes} from 'node:crypto';
import {inflateRawSync} from 'node:zlib';
import http from 'node:http';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {parseArgs} from 'node:util';
import {ask,format,listTools,buildWordIndex} from './chat-rat-query-20261017.mjs';

export const ROOT = path.dirname(fileURLToPath(import.meta.url));
export const VERSION = '0.1.0';
const CONTROL = '20261016';
const hash = value => createHash('sha256').update(value).digest('hex');
export function slug(value) { const s=String(value||'unknown').normalize('NFKD').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').toLowerCase().slice(0,90)||'unknown'; return /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/.test(s)?'model-'+s:s; }
export function day(value) { const d=new Date(typeof value==='number'?value*1000:value); if(!Number.isFinite(d.getTime()))return 'unknown-date'; return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Denver',year:'numeric',month:'2-digit',day:'2-digit'}).format(d).replaceAll('-',''); }
export function redact(value) {return String(value).replace(/\b(?:sk-[\w-]{12,}|gh[pousr]_[\w]{15,}|github_pat_[\w]{15,}|xox[baprs]-[\w-]{12,})\b/g,'[REDACTED]');}
function textOf(content) { if(typeof content==='string')return content; if(!Array.isArray(content))return '';return content.map(c=>typeof c==='string'?c: c.type==='text'||c.type==='input_text'||c.type==='output_text'?c.text||'': c.type==='image'||c.type==='input_image'?'[Image attachment: binary not archived]':'').filter(Boolean).join('\n\n'); }
async function* walk(dir,extension) {let list;try{list=await fs.readdir(dir,{withFileTypes:true});}catch(e){if(e.code==='ENOENT')return;throw e;}for(const e of list){const p=path.join(dir,e.name);if(e.isDirectory())yield* walk(p,extension);else if(e.isFile()&&extension.test(e.name))yield p;}}
async function json(file,fallback) {try{return JSON.parse(await fs.readFile(file,'utf8'));}catch(e){if(e.code==='ENOENT')return fallback;throw e;}}
async function atomic(file,data) {await fs.mkdir(path.dirname(file),{recursive:true});const temp=file.replace(/(\.[^.]+)$/,`-writing-${randomBytes(4).toString('hex')}-${CONTROL}$1`);await fs.writeFile(temp,data);await fs.rename(temp,file);}
async function writeChanged(file,data) {try{if(await fs.readFile(file,'utf8')===data)return false;}catch(e){if(e.code!=='ENOENT')throw e;}await atomic(file,data);return true;}
export function settings(home=os.homedir(), library=process.env.CHAT_RAT_LIBRARY||path.join(home,'Documents','Chats')) {return {home,library:path.resolve(library),codex:path.join(home,'.codex'),claude:path.join(home,'.claude','projects')};}
export async function parseLocal(file,source,titles={}) {
 const chat={source,id:path.basename(file,'.jsonl'),title:'',started:null,messages:[],models:[],rawPath:file};let model='unknown';let malformed=0;const seen=new Set();
 for await(const line of readline.createInterface({input:createReadStream(file),crlfDelay:Infinity})) {if(!line.trim())continue;let r;try{r=JSON.parse(line);}catch{malformed++;continue;}
  if(source==='codex') {
   if(r.type==='session_meta'){chat.id=r.payload.id||r.payload.session_id||chat.id;chat.started=r.payload.timestamp||r.timestamp;chat.subagent=Boolean(r.payload.source?.subagent);}
   if(r.type==='turn_context'&&r.payload.model) model=r.payload.model;
   if(r.type!=='response_item'||r.payload.type!=='message')continue;
   const p=r.payload;if(!['user','assistant'].includes(p.role))continue;
   if(p.role==='assistant'&&p.channel==='analysis')continue;
   const text=textOf(p.content);if(!text|| (p.role==='user'&&/^\s*(?:# AGENTS\.md|<environment_context>|<user_instructions>|<INSTRUCTIONS>|<external_codex_apps_open_page>|<permissions instructions>)/.test(text)))continue;
   const id=p.id; if(id&&seen.has(id))continue;if(id)seen.add(id);
   chat.messages.push({id:p.id,role:p.role,text,model,at:r.timestamp,channel:p.channel||'final'});
  } else {
   if(r.type==='custom-title')chat.title=r.customTitle||r.title||'';
   if(r.isSidechain||r.isMeta||!['user','assistant'].includes(r.type))continue;
   const p=r.message||{};if(p.model&&p.model!=='<synthetic>')model=p.model;
   const text=textOf(p.content);if(!text)continue;if(r.uuid&&seen.has(r.uuid))continue;if(r.uuid)seen.add(r.uuid);
   chat.id=r.sessionId||chat.id;chat.messages.push({id:r.uuid,role:r.type,text,model,at:r.timestamp});
  }
 }
 chat.title=titles[chat.id]||chat.title||chat.messages.find(m=>m.role==='user')?.text.slice(0,90)||'Untitled conversation';
 chat.started=chat.started||chat.messages.find(m=>m.at)?.at;chat.updated=chat.messages.filter(m=>m.at).at(-1)?.at||chat.started;
 chat.models=[...new Set(chat.messages.filter(m=>m.role==='assistant').map(m=>m.model).filter(m=>m!=='unknown'))];if(!chat.models.length)chat.models=['unknown'];
 return {chats:chat.messages.length?[chat]:[],malformed};
}
export function parseExport(data) {
 const rows=Array.isArray(data)?data:data.conversations; if(!Array.isArray(rows))throw Error('Expected a conversations array or official conversations.json export.');
 return rows.map(c=>{
  if(c.mapping){const nodes=Object.values(c.mapping);return {source:'chatgpt',id:c.id||c.conversation_id,title:c.title,started:c.create_time,updated:c.update_time,messages:nodes.filter(n=>n.message&&['user','assistant'].includes(n.message.author?.role)).map(n=>({role:n.message.author.role,text:textOf(n.message.content?.parts),model:n.message.metadata?.model_slug||'unknown',at:n.message.create_time,branch:n.id,parent:n.parent})).filter(m=>m.text)};}
  if(c.chat_messages)return {source:'claude-web',id:c.uuid,title:c.name,started:c.created_at,updated:c.updated_at,messages:c.chat_messages.map(m=>({role:m.sender==='human'?'user':'assistant',text:m.text||textOf(m.content),model:m.model||c.model||'unknown',at:m.created_at})).filter(m=>m.text)};
  if(!c.id||!Array.isArray(c.messages)||!c.source)throw Error('Custom exports require source, id and messages.');
  return {...c,source:slug(c.source),messages:c.messages.filter(m=>['user','assistant'].includes(m.role)).map(m=>({...m,text:m.text||textOf(m.content),model:m.model||c.model||'unknown'})).filter(m=>m.text)};
 }).map(c=>{if(!c.id)throw Error('Conversation is missing its stable id.');c.models=[...new Set(c.messages.filter(m=>m.role==='assistant').map(m=>m.model||'unknown'))];if(!c.models.length)c.models=['unknown'];return c;});
}
export function unzipConversations(buf) {
 let end=-1;for(let i=buf.length-22;i>=Math.max(0,buf.length-65557);i--)if(buf.readUInt32LE(i)===0x06054b50){end=i;break;}if(end<0)throw Error('Invalid ZIP directory.');
 let pos=buf.readUInt32LE(end+16);const count=buf.readUInt16LE(end+10);if(count===65535)throw Error('ZIP64 exports need extraction first.');
 for(let i=0;i<count;i++){if(buf.readUInt32LE(pos)!==0x02014b50)throw Error('Invalid ZIP entry.');const flags=buf.readUInt16LE(pos+8),method=buf.readUInt16LE(pos+10),size=buf.readUInt32LE(pos+20),full=buf.readUInt32LE(pos+24),nl=buf.readUInt16LE(pos+28),el=buf.readUInt16LE(pos+30),cl=buf.readUInt16LE(pos+32),offset=buf.readUInt32LE(pos+42),name=buf.toString('utf8',pos+46,pos+46+nl);pos+=46+nl+el+cl;
  if(!/(^|\/)conversations\.json$/i.test(name))continue;if(flags&1||full>256*1024*1024)throw Error('Encrypted or oversized export. Extract conversations.json first.');
  if(buf.readUInt32LE(offset)!==0x04034b50)throw Error('Invalid ZIP local header.');const start=offset+30+buf.readUInt16LE(offset+26)+buf.readUInt16LE(offset+28),raw=buf.subarray(start,start+size);const body=method===0?raw:method===8?inflateRawSync(raw,{maxOutputLength:256*1024*1024}):null;if(!body||body.length!==full)throw Error('Unsupported or damaged ZIP.');return JSON.parse(body.toString('utf8'));
 }throw Error('No conversations.json found in ZIP.');
}
async function saveChat(chat,cfg,previous) {
 let clean=JSON.parse(redact(JSON.stringify(chat)));
 if(previous?.files?.length){const old=await json(path.join(cfg.library,previous.files[0].replace(/\.md$/,'.json')),null);if(old){
  const messages=new Map();for(const m of [...old.messages,...clean.messages]){const key=hash(JSON.stringify([m.role,m.at||null,m.text,m.branch||null]));messages.set(key,m);}
  const time=v=>typeof v==='number'?v*1000:Date.parse(v);const merged=[...messages.values()];if(merged.every(m=>Number.isFinite(time(m.at))))merged.sort((a,b)=>time(a.at)-time(b.at));
  clean={...old,...clean,messages:merged,models:[...new Set([...old.models,...clean.models])]};
  if(Number.isFinite(time(old.started))&&(!Number.isFinite(time(clean.started))||time(old.started)<time(clean.started)))clean.started=old.started;
 }}
 const date=day(clean.started),fileDate=date==='unknown-date'?CONTROL:date;
 const id=hash(clean.source+'\0'+clean.id).slice(0,16);const files=[];
 for(const model of clean.models){const folder=path.join(cfg.library,slug(model),date,slug(clean.source));const base=path.join(folder,`chat-${id}-${fileDate}`);
  const body={schema:1,...clean};await writeChanged(base+'.json',JSON.stringify(body,null,2)+'\n');
  const md=`# ${clean.title||'Untitled conversation'}\n\nSource: ${clean.source}\nModels: ${clean.models.join(', ')}\nStarted: ${clean.started||'Unknown'}\nPet: ${clean.pet||'None recorded'}\nHarness session: ${clean.harnessSession||'None recorded'}\n\n`+clean.messages.map(m=>`## ${m.role} · ${m.model||'unknown'}${m.at?' · '+m.at:''}${m.branch?' · branch '+m.branch:''}\n\n${m.text}\n`).join('\n');await writeChanged(base+'.md',md);files.push(path.relative(cfg.library,base+'.md'));}
 return {id,source:clean.source,title:clean.title||'Untitled conversation',models:clean.models,date,pet:clean.pet||null,harnessSession:clean.harnessSession||null,messages:clean.messages.length,files};
}
export async function indexChats(cfg=settings(),signal) {
 if(cfg.library===ROOT||cfg.library.startsWith(ROOT+path.sep))throw Error('Chat library must be outside the source repository.');
 await fs.mkdir(cfg.library,{recursive:true});const lockFile=path.join(cfg.library,`save-lock-${CONTROL}.json`);let lock;
 try{lock=await fs.open(lockFile,'wx');await lock.writeFile(JSON.stringify({pid:process.pid}));}catch(e){if(e.code==='EEXIST')throw Error('Another save is running, or its lock remains after a crash. Check the process before removing the save lock.');throw e;}
 try{
  const stateFile=path.join(cfg.library,`save-state-${CONTROL}.json`);const state=await json(stateFile,{schema:1,inputs:{},chats:{}});if(state.schema!==1)throw Error('Unsupported archive schema; original data preserved.');
  const titles={};const titleFile=path.join(cfg.codex,'session_index.jsonl');if(existsSync(titleFile))for await(const line of readline.createInterface({input:createReadStream(titleFile),crlfDelay:Infinity})){try{const r=JSON.parse(line);titles[r.id]=r.thread_name;}catch{}}
  const sources=[{source:'codex',dir:path.join(cfg.codex,'sessions'),ext:/\.jsonl$/},{source:'codex',dir:path.join(cfg.codex,'archived_sessions'),ext:/\.jsonl$/},{source:'claude-code',dir:cfg.claude,ext:/\.jsonl$/},{source:'exports',dir:path.join(cfg.library,'inbox'),ext:/\.(json|zip)$/i}];
  const report={schema:1,at:new Date().toISOString(),added:0,updated:0,unchanged:0,malformed:0,errors:[],sources:[]};await fs.mkdir(path.join(cfg.library,'inbox'),{recursive:true});
  for(const source of sources){const status={source:source.source,path:source.dir,available:existsSync(source.dir),files:0};report.sources.push(status);
   for await(const file of walk(source.dir,source.ext)){if(signal?.aborted)throw Error('Save stopped. Completed files are safe; run again to resume.');status.files++;
    try{const stat=await fs.stat(file),fingerprint=`${stat.size}:${stat.mtimeMs}`,previous=state.inputs[file];
     if(previous?.parser===2&&previous?.fingerprint===fingerprint&&previous.ids.every(id=>state.chats[id]?.files.every(f=>existsSync(path.join(cfg.library,f))&&existsSync(path.join(cfg.library,f.replace(/\.md$/,'.json')))))){report.unchanged++;continue;}
     const result=source.source==='exports'?{chats:parseExport(/\.zip$/i.test(file)?unzipConversations(await fs.readFile(file)):await json(file,null)),malformed:0}:await parseLocal(file,source.source,titles);report.malformed+=result.malformed;
     const ids=[];for(const c of result.chats){if(signal?.aborted)throw Error('Save stopped.');const saved=await saveChat(c,cfg,state.chats[hash(c.source+'\0'+c.id).slice(0,16)]);ids.push(saved.id);if(state.chats[saved.id])report.updated++;else report.added++;state.chats[saved.id]=saved;}
     if(!result.malformed)state.inputs[file]={fingerprint,ids,parser:2};else report.errors.push({file,reason:'Incomplete JSONL records; readable messages saved; will retry next run.'});
    }catch(e){if(signal?.aborted)throw e;report.errors.push({file,reason:e.message});}
   }
  }
  const chats=Object.values(state.chats);report.total=chats.length;report.models=[...new Set(chats.flatMap(c=>c.models))].sort();
  await atomic(stateFile,JSON.stringify(state,null,2));await atomic(path.join(cfg.library,`chat-index-${CONTROL}.json`),JSON.stringify({schema:1,chats,report},null,2));await atomic(path.join(cfg.library,`save-report-${CONTROL}.json`),JSON.stringify(report,null,2));return report;
 }finally{await lock.close();await fs.unlink(lockFile);}
}
export async function startServer(cfg=settings(),port=43127) {
 const token=randomBytes(24).toString('hex');let busy=false,controller;let enabled=true;const origin=`http://127.0.0.1:${port}`;
 async function openFolder(relative=''){const target=path.resolve(cfg.library,relative);if(target!==cfg.library&&!target.startsWith(cfg.library+path.sep))throw Error('Folder is outside library.');const actual=await fs.realpath(target),base=await fs.realpath(cfg.library);if(actual!==base&&!actual.startsWith(base+path.sep))throw Error('Linked folders outside library are not allowed.');if(!(await fs.stat(actual)).isDirectory())throw Error('Folder does not exist.');if(process.platform!=='win32')throw Error('File Explorer is available on Windows.');spawn('explorer.exe',[actual],{detached:true,stdio:'ignore'}).unref();}
 const server=http.createServer(async(req,res)=>{const send=(status,data,type='application/json')=>{res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});res.end(type==='application/json'?JSON.stringify(data):data);};
 try{if(req.headers.host!==`127.0.0.1:${port}`)return send(403,{error:'Local host required.'});const url=new URL(req.url,origin);
  if(req.method==='GET'&&url.pathname==='/'){return send(200,(await fs.readFile(path.join(ROOT,'chat-rat-20261016.html'),'utf8')).replace('__TOKEN__',token),'text/html; charset=utf-8');}
  if(req.method==='GET'&&url.pathname==='/pet.png')return send(200,await fs.readFile(path.join(ROOT,'desktop-art','chat-rat','idle-20261011.png')),'image/png');
  if(req.method==='GET'&&['/cyberhome-20261016.css','/phone-shell-20261016.css','/cyberhome-20261016.js'].includes(url.pathname))return send(200,await fs.readFile(path.join(ROOT,url.pathname.slice(1))),url.pathname.endsWith('.js')?'text/javascript; charset=utf-8':'text/css; charset=utf-8');
  if(req.headers['x-chat-rat-token']!==token|| (req.headers.origin&&req.headers.origin!==origin))return send(403,{error:'Open Chat Rat locally to use this action.'});
  if(req.method==='GET'&&url.pathname==='/api/status'){const data=await json(path.join(cfg.library,`chat-index-${CONTROL}.json`),{chats:[],report:null});return send(200,{...data,library:cfg.library,busy,enabled});}
  if(req.method==='GET'&&url.pathname==='/api/chat'){const state=await json(path.join(cfg.library,`chat-index-${CONTROL}.json`),{chats:[]});const chat=state.chats.find(c=>c.id===url.searchParams.get('id'));if(!chat)return send(404,{error:'Unknown chat.'});return send(200,{text:await fs.readFile(path.join(cfg.library,chat.files[0]),'utf8')});}
  if(req.method==='GET'&&url.pathname==='/api/query'){const q=url.searchParams.get('q')||'';if(!q.trim())return send(400,{error:'Ask with ?q=your question.'});const also=url.searchParams.getAll('also');return send(200,await ask(cfg,q,{also,name:url.searchParams.get('tool')||undefined,limit:Math.min(20,Number(url.searchParams.get('limit'))||5),from:url.searchParams.get('from')||undefined,to:url.searchParams.get('to')||undefined}));}
  if(req.method==='GET'&&url.pathname==='/api/tools')return send(200,{tools:await listTools(cfg)});
  if(req.method==='POST'&&url.pathname==='/api/power'){enabled=url.searchParams.get('on')==='true';if(!enabled)controller?.abort();return send(200,{enabled});}
  if(req.method==='POST'&&url.pathname==='/api/save'){if(!enabled)return send(409,{error:'Save tool is OFF.'});if(busy)return send(409,{error:'A save is already running.'});busy=true;controller=new AbortController();try{const report=await indexChats(cfg,controller.signal);await buildWordIndex(cfg);return send(200,report);}finally{busy=false;}}
  if(req.method==='POST'&&url.pathname==='/api/folder'){await fs.mkdir(cfg.library,{recursive:true});const relative=url.searchParams.get('folder')||'';const data=await json(path.join(cfg.library,`chat-index-${CONTROL}.json`),{chats:[]});const allowed=new Set(['','inbox',...data.chats.flatMap(c=>c.files.flatMap(f=>[path.dirname(f),slug(c.models.find(m=>f.startsWith(slug(m)+path.sep))||'unknown')]))]);if(!allowed.has(relative))return send(403,{error:'Unknown archive folder.'});await fs.mkdir(path.join(cfg.library,relative),{recursive:true});await openFolder(relative);return send(200,{opened:true});}
  return send(404,{error:'Not found.'});
 }catch(e){send(500,{error:e.message});}});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});return {server,url:origin};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const command=process.argv[2]||'serve';try{
  if(command==='index'){const report=await indexChats();await buildWordIndex(settings());console.log(JSON.stringify(report,null,2));}
  else if(command==='serve'){const {url}=await startServer();console.log('Chat Rat: '+url);}
  else if(command==='ask'){
   const {values,positionals}=parseArgs({args:process.argv.slice(3),allowPositionals:true,options:{also:{type:'string',multiple:true},tool:{type:'string'},limit:{type:'string'},from:{type:'string'},to:{type:'string'},pin:{type:'string',multiple:true},json:{type:'boolean'},'no-save':{type:'boolean'}}});
   const question=positionals.join(' ');if(!question.trim())throw Error('Usage: ask "your question" [--also word] [--tool name] [--limit 5] [--from YYYYMMDD] [--to YYYYMMDD] [--pin chatId] [--no-save] [--json]');
   const cfg=settings();
   if(!values['no-save'])try{const r=await indexChats(cfg);console.error(`Saved missing chats first: ${r.added} added, ${r.updated} updated.`);}catch(e){console.error('Could not save new chats first ('+e.message+'). Answering from the archive as it is.');}
   const answer=await ask(cfg,question,{also:(values.also||[]).flatMap(a=>a.split(',')),name:values.tool,limit:Number(values.limit)||5,from:values.from,to:values.to,pin:values.pin||[]});
   console.log(values.json?JSON.stringify(answer,null,2):format(answer));
  }
  else if(command==='tools'){for(const t of await listTools(settings()))console.log(`${t.name} · ${t.uses} uses · last ${t.lastUsed||'never'} · ${t.terms.join(', ')}`);}
  else throw Error('Use serve, index, ask or tools.');
 }catch(e){console.error(e.message);process.exitCode=1;}
}
