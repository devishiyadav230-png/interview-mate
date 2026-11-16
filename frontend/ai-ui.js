/* Interview Mate – AI Interviewer UI. Works together with ai-core.js.
   It never touches the classic interview: it only hides/shows the classic sections when you switch tabs. */
(function () {
'use strict';
const C = window.AICore, root = document.getElementById('ai');
if (!C || !root) return;
const $ = id => document.getElementById(id);
const API = window.API_BASE || '';
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
const hasTTS = 'speechSynthesis' in window;
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const mmss = s => String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(Math.floor(s % 60)).padStart(2, '0');
let status = { llm: false, model: '' }, ST = null, saved = null, voices = [];
const HKEY = 'interviewmate_ai_reports';

async function api(path, body, ms) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms || 25000);
  try {
    const r = await fetch(API + path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal } : { signal: ctl.signal });
    if (!r.ok) throw new Error('http ' + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}

/* ---------------- tabs ---------------- */
const tabs = document.getElementById('ai-tabs');
function setTab(ai) { $('tab-ai').classList.toggle('on', ai); $('tab-classic').classList.toggle('on', !ai); }
function showAI() {
  if (!root.classList.contains('hide')) return;
  saved = ['setup', 'iv', 'res'].filter(id => !$(id).classList.contains('hide'));
  saved.forEach(id => $(id).classList.add('hide'));
  root.classList.remove('hide'); setTab(true);
  if (!ST) renderSetup();
}
function showClassic() {
  if (root.classList.contains('hide')) return;
  if (ST && ST.running && !confirm('Leave the AI interview? Your progress in it will be lost.')) return;
  teardown(); ST = null; root.classList.add('hide'); setTab(false);
  (saved && saved.length ? saved : ['setup']).forEach(id => $(id).classList.remove('hide'));
}
$('tab-ai').onclick = showAI; $('tab-classic').onclick = showClassic;

if (hasTTS) { const lv = () => { voices = speechSynthesis.getVoices(); }; lv(); speechSynthesis.onvoiceschanged = lv; }
api('/api/ai/status').then(j => { status = j; const b = $('ai-eng'); if (b) paintEngine(b); }).catch(() => {});
function paintEngine(b) {
  b.className = 'ai-badge' + (status.llm ? ' on' : '');
  b.textContent = status.llm ? '🟢 AI engine: LLM connected (' + status.model + ')' : '⚪ AI engine: built-in evaluator (add ANTHROPIC_API_KEY on the backend for LLM mode)';
}

/* ---------------- setup ---------------- */
function renderSetup() {
  const cats = Object.entries(C.CATS).map(([k, c], i) => `<button type="button" class="ai-cat${i ? '' : ' on'}" data-c="${k}">${c.icon} ${c.label}<small>${c.desc}</small></button>`).join('');
  const topics = Object.entries(C.TOPICS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
  root.innerHTML = `
  <div id="ai-setup" class="card">
    <b>🎙️ AI Interviewer</b>
    <p class="ai-note" style="margin:4px 0">A virtual interviewer asks you questions, listens to your voice, asks follow-ups, and finally gives a full performance report.</p>
    <div id="ai-eng" class="ai-badge"></div>
    <label for="ai-name">Your name</label><input id="ai-name" placeholder="e.g. Devishi">
    <label>Interview category</label><div class="ai-cats" id="ai-cats">${cats}</div>
    <div id="ai-topicw" class="hide"><label for="ai-topic">Subject</label><select id="ai-topic">${topics}</select></div>
    <label for="ai-lvl">Difficulty</label><select id="ai-lvl"><option value="1">Fresher</option><option value="2">Intermediate</option></select>
    <label for="ai-n">Number of main questions</label><select id="ai-n"><option>3</option><option selected>5</option><option>7</option></select>
    <label for="ai-lang">Speech language / accent</label>
    <select id="ai-lang"><option value="en-IN">English (India)</option><option value="en-US">English (US)</option><option value="en-GB">English (UK)</option></select>
    <label class="ai-opt"><input type="checkbox" id="ai-say" checked><span>Interviewer speaks the questions aloud${hasTTS ? '' : ' <small>(not supported in this browser)</small>'}</span></label>
    <label class="ai-opt"><input type="checkbox" id="ai-mic" checked><span>Use my microphone for voice analysis<small>${SR ? 'Live transcript + pace, pauses, intensity and filler words. Audio is analysed in your browser.' : 'Speech-to-text is not supported here (use Chrome or Edge). Pauses and intensity still work; type your answers.'}</small></span></label>
    <label class="ai-opt"><input type="checkbox" id="ai-fu" checked><span>Ask follow-up questions</span></label>
    <div class="row"><button id="ai-go">Start AI interview</button></div>
    <p class="ai-note">Tip: use Chrome or Edge, sit in a quiet place, and allow microphone access.</p>
  </div>
  <div id="ai-room" class="hide"></div><div id="ai-report" class="hide"></div>`;
  paintEngine($('ai-eng'));
  $('ai-name').value = ($('name') && $('name').value) || '';
  const sync = () => { const c = root.querySelector('.ai-cat.on').dataset.c; $('ai-topicw').classList.toggle('hide', c !== 'technical'); };
  root.querySelectorAll('.ai-cat').forEach(b => b.onclick = () => { root.querySelectorAll('.ai-cat').forEach(x => x.classList.remove('on')); b.classList.add('on'); sync(); });
  $('ai-go').onclick = start;
}

/* ---------------- voice helpers ---------------- */
function pickVoice() {
  const l = (ST && ST.lang || 'en-IN').toLowerCase();
  return voices.find(v => v.lang.toLowerCase() === l) || voices.find(v => v.lang.toLowerCase().startsWith('en')) || null;
}
function setState(s) {
  const av = $('ai-av'), tx = $('ai-st'); if (!av) return;
  av.classList.toggle('talk', s === 'speaking'); av.classList.toggle('listen', s === 'listening');
  tx.textContent = { speaking: 'Interviewer is speaking…', listening: 'Listening… speak now', ready: 'Your turn. Speak or type your answer.', thinking: 'Interviewer is thinking…', idle: '' }[s] || '';
}
function speak(text) {
  return new Promise(res => {
    if (!ST || !ST.say || !hasTTS) return res();
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text), v = pickVoice();
    if (v) { u.voice = v; u.lang = v.lang; } else u.lang = ST.lang;
    u.rate = 0.97;
    let done = false;
    const fin = () => { if (!done) { done = true; clearTimeout(to); res(); } };
    u.onend = fin; u.onerror = fin;
    const to = setTimeout(fin, Math.max(4000, text.length * 95));
    setState('speaking'); speechSynthesis.speak(u);
  });
}
async function initMic() {
  try {
    ST.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false } });
    const AC = window.AudioContext || window.webkitAudioContext;
    ST.ctx = new AC(); const src = ST.ctx.createMediaStreamSource(ST.stream);
    ST.an = ST.ctx.createAnalyser(); ST.an.fftSize = 1024; src.connect(ST.an); ST.buf = new Float32Array(ST.an.fftSize);
    return true;
  } catch (e) { return false; }
}
function startRec() {
  const c = ST.cur; if (!ST.micOK || c.rec) return;
  c.rec = true; c.used = true; c.base = $('ai-ans').value.trim(); c.final = c.final || '';
  if (ST.ctx.state === 'suspended') ST.ctx.resume();
  c.samT = setInterval(() => {
    ST.an.getFloatTimeDomainData(ST.buf);
    let s = 0; for (let i = 0; i < ST.buf.length; i++) s += ST.buf[i] * ST.buf[i];
    const rms = Math.sqrt(s / ST.buf.length); c.samples.push(rms);
    const db = 20 * Math.log10(rms + 1e-8); $('ai-lvl').style.width = Math.max(0, Math.min(100, (db + 60) / 50 * 100)) + '%';
  }, 100);
  c.liveT = setInterval(liveStats, 1000);
  if (SR) {
    const r = c.sr = new SR(); r.lang = ST.lang; r.continuous = true; r.interimResults = true;
    r.onresult = e => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) c.final += (c.final ? ' ' : '') + t.trim(); else interim += t;
      }
      c.interim = interim;
      $('ai-ans').value = [c.base, c.final, interim].filter(Boolean).join(' ');
    };
    r.onerror = e => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { c.srDead = true; $('ai-srn').textContent = 'Speech recognition is blocked. Please type your answer.'; } };
    r.onend = () => { if (c.rec && !c.srDead) setTimeout(() => { try { if (c.rec) r.start(); } catch (e) {} }, 150); };
    try { r.start(); } catch (e) {}
  } else $('ai-srn').textContent = 'Live transcript is not supported in this browser. Type your answer; pauses and loudness are still analysed.';
  $('ai-mbtn').textContent = '⏹ Stop mic'; $('ai-mbtn').classList.add('ai-rec'); setState('listening');
}
function stopRec() {
  const c = ST && ST.cur; if (!c || !c.rec) return;
  c.rec = false; clearInterval(c.samT); clearInterval(c.liveT);
  if (c.sr) { c.sr.onend = null; try { c.sr.stop(); } catch (e) {} }
  if (c.interim) { c.final += (c.final ? ' ' : '') + c.interim.trim(); c.interim = ''; }
  const b = $('ai-mbtn'); if (b) { b.textContent = '🎤 Start mic'; b.classList.remove('ai-rec'); }
  const l = $('ai-lvl'); if (l) l.style.width = '0'; setState('ready');
}
function liveStats() {
  const c = ST.cur, raw = c.final + ' ' + (c.interim || '');
  const words = SR && !c.srDead ? C.toks(raw).length : null;
  const v = C.analyzeVoice(c.samples, words, raw); if (!v || v.silent) return;
  $('ai-l-pace').textContent = v.wpm === null ? '–' : v.wpm;
  $('ai-l-pause').textContent = v.pauseCount;
  $('ai-l-fill').textContent = v.fillers.total;
  $('ai-l-lvl').textContent = v.loudness;
}
function teardown() {
  if (ST) { ST.running = false; ST.tok++; stopRec(); clearInterval(ST.timer); if (ST.stream) ST.stream.getTracks().forEach(t => t.stop()); if (ST.ctx) try { ST.ctx.close(); } catch (e) {} }
  if (hasTTS) speechSynthesis.cancel();
}

/* ---------------- interview ---------------- */
async function start() {
  const cat = root.querySelector('.ai-cat.on').dataset.c;
  ST = { name: $('ai-name').value.trim() || 'Candidate', cat, topic: cat === 'technical' ? $('ai-topic').value : '', lvl: +$('ai-lvl').value, n: +$('ai-n').value,
    lang: $('ai-lang').value, say: $('ai-say').checked, useMic: $('ai-mic').checked, follow: $('ai-fu').checked, turns: [], idx: -1, pending: null, tok: 0, running: true, micOK: false, cur: null, date: new Date().toISOString() };
  ST.qs = C.pickQuestions(cat, ST.topic, ST.lvl, ST.n);
  if (ST.useMic) { ST.micOK = await initMic(); if (!ST.micOK) alert('Microphone was not allowed, so the interview will continue in typing mode without voice analysis.'); }
  $('ai-setup').classList.add('hide'); renderRoom(); next();
}
function renderRoom() {
  const code = ST.cat === 'coding';
  const room = $('ai-room'); room.classList.remove('hide'); $('ai-report').classList.add('hide');
  room.innerHTML = `
  <div class="card">
    <div class="ai-top"><div class="ai-avatar" id="ai-av">🤖</div>
      <div style="flex:1"><div class="meta" style="margin:0"><span id="ai-prog"></span><span id="ai-timer">00:00</span></div>
      <div class="bar"><i id="ai-pb" style="width:0"></i></div><div class="ai-note" id="ai-st" aria-live="polite"></div></div></div>
    <div class="ai-feed" id="ai-feed"></div>
    <div id="ai-comp">
      ${code ? '<label for="ai-code">Your code (any language)</label><textarea id="ai-code" class="ai-code" spellcheck="false" placeholder="def solve(...):\n    ..."></textarea>' : ''}
      <label for="ai-ans">${code ? 'Explain your approach (speak or type)' : 'Your answer (speak or type, you can edit the transcript)'}</label>
      <textarea id="ai-ans" style="min-height:100px" placeholder="Your answer appears here…"></textarea>
      <div class="ai-lvl" title="Microphone level"><i id="ai-lvl"></i></div>
      <div class="ai-live ${ST.micOK ? '' : 'hide'}">
        <div class="ai-tile"><b id="ai-l-pace">–</b><span>words/min</span></div><div class="ai-tile"><b id="ai-l-pause">0</b><span>long pauses</span></div>
        <div class="ai-tile"><b id="ai-l-fill">0</b><span>filler words</span></div><div class="ai-tile"><b id="ai-l-lvl">–</b><span>loudness</span></div></div>
      <div class="ai-note" id="ai-srn"></div>
      <div class="row">
        ${ST.micOK ? '<button id="ai-mbtn" type="button">🎤 Start mic</button>' : ''}
        <button id="ai-sub" type="button">Submit answer</button>
        <button class="ghost" id="ai-rep" type="button">🔁 Replay</button>
        <button class="ghost" id="ai-skip" type="button">Skip</button>
        <button class="ghost" id="ai-end" type="button">End &amp; get report</button>
      </div>
    </div>
  </div>`;
  if (ST.micOK) $('ai-mbtn').onclick = () => { if (hasTTS) speechSynthesis.cancel(); ST.cur.rec ? stopRec() : startRec(); };
  $('ai-sub').onclick = () => submit(false); $('ai-skip').onclick = () => submit(true);
  $('ai-rep').onclick = () => { if (ST.cur) { stopRec(); speak(ST.cur.text); } };
  $('ai-end').onclick = () => { if (confirm('End the interview now and see your report?')) finish(); };
  if (code) $('ai-code').onkeydown = e => { if (e.key === 'Tab') { e.preventDefault(); const t = e.target, s = t.selectionStart; t.value = t.value.slice(0, s) + '    ' + t.value.slice(t.selectionEnd); t.selectionStart = t.selectionEnd = s + 4; } };
}
function bubble(who, text, cls) {
  const d = document.createElement('div'); d.className = 'ai-b ' + who + (cls ? ' ' + cls : ''); d.textContent = text;
  $('ai-feed').appendChild(d); $('ai-feed').scrollTop = 1e6; return d;
}
function setComposer(on) {
  ['ai-ans', 'ai-code', 'ai-sub', 'ai-skip', 'ai-rep', 'ai-mbtn'].forEach(id => { const e = $(id); if (e) e.disabled = !on; });
}
function next() {
  if (!ST.running) return;
  if (ST.pending) { const f = ST.pending; ST.pending = null; return ask(f, 'follow'); }
  ST.idx++;
  if (ST.idx >= ST.qs.length) return finish();
  ask(ST.qs[ST.idx], 'main');
}
async function ask(q, type) {
  const tok = ++ST.tok;
  ST.cur = { q, type, text: q.q, samples: [], final: '', interim: '', rec: false, used: false, srDead: false };
  const label = type === 'follow' ? 'Follow-up: ' : '';
  const spoken = label + q.q + (ST.cat === 'coding' && type === 'main' ? ' Explain your approach aloud and write the code.' : '');
  $('ai-prog').textContent = 'Question ' + (ST.idx + 1) + ' of ' + ST.qs.length + (type === 'follow' ? ' (follow-up)' : '');
  $('ai-pb').style.width = (ST.idx / ST.qs.length * 100) + '%';
  bubble('ai', label + q.q, type === 'follow' ? 'fol' : '');
  $('ai-ans').value = ''; if ($('ai-code')) $('ai-code').value = ''; $('ai-srn').textContent = '';
  ['ai-l-pace', 'ai-l-lvl'].forEach(i => $(i).textContent = '–'); $('ai-l-pause').textContent = '0'; $('ai-l-fill').textContent = '0';
  setComposer(false); $('ai-end').disabled = false; setState('speaking');
  clearInterval(ST.timer); $('ai-timer').textContent = '00:00';
  await speak(spoken);
  if (tok !== ST.tok || !ST.running) return;
  setComposer(true); setState('ready');
  const t0 = Date.now(); ST.cur.t0 = t0; ST.timer = setInterval(() => { $('ai-timer').textContent = mmss((Date.now() - t0) / 1000); }, 500);
  if (ST.micOK) startRec();
  $('ai-ans').focus({ preventScroll: true });
}

async function submit(skipped) {
  const c = ST.cur; if (!c) return;
  const answer = $('ai-ans').value.trim(), code = $('ai-code') ? $('ai-code').value : '';
  if (!skipped && C.toks(answer).length < 4 && code.trim().length < 20) { alert('Please give a slightly longer answer (at least a few words), or use Skip.'); return; }
  stopRec(); clearInterval(ST.timer); if (hasTTS) speechSynthesis.cancel(); ST.tok++;
  setComposer(false); $('ai-end').disabled = true; setState('thinking');
  if (!skipped) bubble('me', answer + (code.trim() ? '\n\n[code submitted]' : ''));
  const follow = c.type === 'follow';
  const raw = c.final.trim() || answer;
  const words = SR && !c.srDead && c.final.trim() ? C.toks(c.final).length : null;
  const voice = !skipped && c.used ? C.analyzeVoice(c.samples, words, raw) : null;
  let ev = skipped ? C.skipped() : C.evaluate({ cat: ST.cat, q: c.q, answer, code, follow });
  if (!skipped && status.llm) {
    try {
      const j = await api('/api/ai/evaluate', { category: ST.cat, topic: ST.topic, difficulty: ST.lvl, question: c.q.q, answer, code, is_followup: follow,
        voice: voice && !voice.silent ? { wpm: voice.wpm, fillers: voice.fillers.total, pauses: voice.pauseCount } : null });
      if (j && typeof j.score === 'number') ev = Object.assign(ev, { score: j.score, strengths: j.strengths || ev.strengths, improve: j.improvements || ev.improve,
        feedback: j.feedback || ev.feedback, ideal: (j.ideal_points || []).join(' · ') || ev.ideal, followUp: follow ? '' : (j.follow_up || ev.followUp), engine: 'llm' });
    } catch (e) { /* fall back to the built-in evaluator */ }
  }
  const turn = { q: c.q.q, type: c.type, answer, code, eval: ev, voice };
  ST.turns.push(turn);
  ST.pending = !skipped && !follow && ST.follow && ev.followUp ? { q: ev.followUp, kw: [], lv: c.q.lv, ideal: '' } : null;
  showFeedback(turn);
}
function showFeedback(t) {
  const ev = t.eval, v = t.voice, tips = v ? C.voiceTips(v) : null;
  setState('idle');
  const li = (a, cls) => a.map(x => `<li class="${cls}">${esc(x)}</li>`).join('');
  const parts = (ev.parts || []).map(p => `<div class="m"><span>${esc(p.label)}</span><div class="bar"><i style="width:${p.v / p.max * 100}%"></i></div><b>${p.v}</b></div>`).join('');
  let vh = '';
  if (v && !v.silent) vh = `<div class="ai-sec"><b>🎙️ Voice</b><div class="chips"><span class="chip">${v.wpm === null ? 'pace n/a' : v.wpm + ' wpm (' + v.paceLabel + ')'}</span><span class="chip">${v.pauseCount} pause${v.pauseCount === 1 ? '' : 's'}</span><span class="chip">${v.fillers.total} filler${v.fillers.total === 1 ? '' : 's'}</span><span class="chip">loudness: ${v.loudness}</span><span class="chip">${v.variation}</span></div><ul>${li(tips.bad.slice(0, 3), 'ai-bad')}${li(tips.good.slice(0, 2), 'ai-good')}</ul></div>`;
  else if (v && v.silent) vh = '<div class="ai-sec ai-note">No clear speech was picked up by the microphone for this answer.</div>';
  const card = document.createElement('div'); card.className = 'ai-fb';
  card.innerHTML = `<div class="row" style="margin:0"><div class="score">${ev.score}<small style="font-size:16px;color:var(--mut)">/100</small></div><div><b>${ev.score >= 75 ? 'Strong answer' : ev.score >= 50 ? 'Decent, can improve' : 'Needs work'}</b><div class="ai-note">${ev.engine === 'llm' ? 'LLM evaluation' : 'Built-in evaluation'}</div></div></div>${parts}
    <ul>${li(ev.strengths || [], 'ai-good')}${li(ev.improve || [], 'ai-bad')}</ul>${ev.ideal ? `<div class="fu"><b>Ideal approach:</b> ${esc(ev.ideal)}</div>` : ''}${vh}
    <div class="row"><button class="ai-next" type="button">${ST.pending ? 'Continue (follow-up)' : ST.idx >= ST.qs.length - 1 ? 'See my report' : 'Next question'}</button></div>`;
  $('ai-feed').appendChild(card); bubble('ai', ev.feedback); $('ai-feed').scrollTop = 1e6;
  const nb = card.querySelector('.ai-next'); nb.onclick = () => { nb.disabled = true; next(); };
  speak(ev.feedback).then(() => { if (ST && ST.running) setState('idle'); });
}

/* ---------------- report ---------------- */
async function finish() {
  if (!ST.turns.length) { teardown(); ST = null; renderSetup(); alert('Answer at least one question to generate a report.'); return; }
  ST.running = false; teardown();
  $('ai-room').classList.add('hide'); const rep = $('ai-report'); rep.classList.remove('hide');
  rep.innerHTML = '<div class="card">Preparing your performance report…</div>';
  const R = C.buildReport(ST); R.engine = 'builtin';
  if (status.llm) {
    try {
      const j = await api('/api/ai/report', { name: ST.name, category: ST.cat, topic: ST.topic, overall: R.overall, content: R.content, voice: R.voice,
        voice_summary: R.va ? { wpm: R.va.wpm, filler_per_100: R.va.fillers.per100, pauses: R.va.pauses, loudness: R.va.loudness, variation: R.va.variation } : null,
        turns: ST.turns.map(t => ({ q: t.q, a: (t.answer || '').slice(0, 600), score: t.eval.score })) }, 40000);
      if (j && j.summary) { R.summary = j.summary; if (j.strengths && j.strengths.length) R.strengths = j.strengths; if (j.improvements && j.improvements.length) R.improve = j.improvements; if (j.plan && j.plan.length) R.plan = j.plan; R.engine = 'llm'; }
    } catch (e) { /* keep built-in text */ }
  }
  saveHist({ t: ST.date, cat: ST.cat, topic: ST.topic, overall: R.overall, content: R.content, voice: R.voice });
  renderReport(R);
}
function loadHist() { try { return JSON.parse(localStorage.getItem(HKEY) || '[]'); } catch (e) { return []; } }
function saveHist(x) { try { const h = loadHist(); h.push(x); localStorage.setItem(HKEY, JSON.stringify(h.slice(-10))); } catch (e) {} }

const ringColor = s => s >= 75 ? 'var(--ok)' : s >= 50 ? '#C9A227' : 'var(--bad)';
const bar = (l, v) => `<div class="m"><span>${esc(l)}</span><div class="bar"><i style="width:${v}%"></i></div><b>${v}</b></div>`;
function paceChart(turns) {
  const pts = turns.map((t, i) => ({ i, w: t.voice && t.voice.wpm })).filter(p => p.w);
  if (!pts.length) return '';
  const W = 320, H = 110, y = w => H - 10 - Math.min(w, 220) / 220 * (H - 20), x = i => 20 + i * ((W - 40) / Math.max(1, turns.length - 1));
  const bars = pts.map(p => `<rect x="${x(p.i) - 9}" y="${y(p.w)}" width="18" height="${H - 10 - y(p.w)}" fill="var(--ac)" rx="3"/><text x="${x(p.i)}" y="${y(p.w) - 3}" font-size="9" text-anchor="middle" fill="currentColor">${p.w}</text><text x="${x(p.i)}" y="${H}" font-size="9" text-anchor="middle" fill="currentColor">Q${p.i + 1}</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H + 2}" width="100%" role="img" aria-label="Speaking pace per answer"><rect x="0" y="${y(165)}" width="${W}" height="${y(115) - y(165)}" fill="var(--ok)" opacity=".15"/>${bars}</svg><div class="ai-note">Green band = ideal pace (115–165 words/min)</div>`;
}
function levelChart(turns) {
  const all = []; turns.forEach(t => { if (t.voice && t.voice.timeline) { t.voice.timeline.forEach(d => all.push(d)); all.push('|'); } });
  if (all.filter(d => typeof d === 'number').length < 3) return '';
  const W = 320, H = 70, step = W / all.length;
  const b = all.map((d, i) => d === '|' ? `<line x1="${i * step}" x2="${i * step}" y1="0" y2="${H}" stroke="var(--bd)"/>` : d === null ? '' : `<rect x="${i * step}" y="${H - Math.max(2, (d + 60) / 50 * H)}" width="${Math.max(1, step - 0.6)}" height="${Math.max(2, (d + 60) / 50 * H)}" fill="var(--ac)"/>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Voice intensity over time">${b}</svg><div class="ai-note">Voice intensity over the interview (taller = louder). Lines separate answers; gaps are silence.</div>`;
}
function renderReport(R) {
  const cat = C.CATS[ST.cat], va = R.va, T = ST.turns, hist = loadHist();
  const li = (a, cls) => a.map(x => `<li class="${cls || ''}">${esc(x)}</li>`).join('');
  const tile = (b, s) => `<div class="ai-tile"><b>${esc(b)}</b><span>${esc(s)}</span></div>`;
  let voice = '';
  if (va) {
    const tf = C.topFillers(va.fillers.map, 6);
    voice = `<div class="card"><b>🎙️ Voice analysis</b> <span class="ai-note">(score ${va.score}/100 across ${va.answers} spoken answer${va.answers > 1 ? 's' : ''})</span>
      <div class="ai-grid">${tile(va.wpm === null ? 'n/a' : va.wpm, 'words/min' + (va.paceLabel ? ' · ' + va.paceLabel : ''))}${tile(va.fillers.total, 'filler words · ' + va.fillers.per100 + '/100 words')}${tile(va.pauses, 'long pauses' + (va.longPauses ? ' (' + va.longPauses + ' > 2.5 s)' : ''))}
      ${tile(va.loudness, 'loudness')}${tile(va.variation, 'voice variation')}${tile(va.fadedCount ? va.fadedCount + ' answer(s)' : 'steady', 'energy drop at end')}</div>
      ${tf.length ? '<div class="chips">' + tf.map(e => `<span class="chip b">${esc(e[0])} ×${e[1]}</span>`).join('') + (va.fillers.repeats ? `<span class="chip b">repeated words ×${va.fillers.repeats}</span>` : '') + '</div>' : ''}
      ${paceChart(T)}${levelChart(T)}
      <div class="ai-scroll"><table class="ai-tbl"><tr><th>#</th><th>Pace</th><th>Fillers</th><th>Pauses</th><th>Loudness</th><th>Start delay</th></tr>
      ${T.map((t, i) => t.voice && !t.voice.silent ? `<tr><td>${i + 1}</td><td>${t.voice.wpm === null ? '–' : t.voice.wpm + ' (' + t.voice.paceLabel + ')'}</td><td>${t.voice.fillers.total}</td><td>${t.voice.pauseCount}</td><td>${t.voice.loudness}</td><td>${t.voice.startDelayS}s</td></tr>` : `<tr><td>${i + 1}</td><td colspan="5" class="ai-note">no voice data</td></tr>`).join('')}</table></div>
      <p class="ai-note">Filler detection uses the browser's speech-to-text, which often drops "um/uh", so real counts can be higher. Loudness depends on your microphone; use it to compare your own attempts.</p></div>`;
  } else voice = `<div class="card ai-note">🎙️ Voice analysis was not available (microphone off or not allowed). Start the next interview with "Use my microphone" ticked to get pace, pause, intensity and filler-word analysis.</div>`;

  const qa = T.map((t, i) => `<details style="margin:6px 0"><summary><b>Q${i + 1}${t.type === 'follow' ? ' (follow-up)' : ''}.</b> ${esc(t.q.slice(0, 90))}${t.q.length > 90 ? '…' : ''} <b>· ${t.eval.score}/100</b></summary>
    <div style="padding:6px 0 6px 12px"><div class="ai-note">Your answer</div><div style="white-space:pre-wrap">${esc(t.answer || '(skipped)')}</div>
    ${t.code && t.code.trim() ? `<div class="ai-note">Your code</div><pre class="ai-code" style="white-space:pre-wrap;margin:4px 0">${esc(t.code)}</pre>` : ''}
    <ul>${li(t.eval.strengths || [], 'ai-good')}${li(t.eval.improve || [], 'ai-bad')}</ul>${t.eval.ideal ? `<div class="fu"><b>Ideal:</b> ${esc(t.eval.ideal)}</div>` : ''}</div></details>`).join('');

  const trend = hist.length > 1 ? `<div class="card ai-noprint"><b>Your AI-interview progress</b><div class="hist">${hist.map(h => `<div style="height:${Math.max(12, h.overall)}%" title="${esc(h.cat)} · ${new Date(h.t).toLocaleDateString()}">${h.overall}</div>`).join('')}</div></div>` : '';

  $('ai-report').innerHTML = `
  <div class="card"><div class="row" style="margin:0;gap:16px;align-items:center">
    <div class="ai-ring" style="background:conic-gradient(${ringColor(R.overall)} ${R.overall * 3.6}deg,var(--bd) 0)"><div><b>${R.overall}</b><span>/100</span></div></div>
    <div style="flex:1;min-width:200px"><div class="ai-note">${cat.icon} ${cat.label}${ST.topic ? ' · ' + esc(C.TOPICS[ST.topic]) : ''} · ${new Date(ST.date).toLocaleDateString()}</div>
    <h2 style="margin:2px 0;font-size:20px">AI Performance Report: ${esc(ST.name)}</h2><b style="color:${ringColor(R.overall)}">${esc(R.verdict)}</b>
    <div class="ai-note">${R.engine === 'llm' ? 'Summary written by the LLM' : 'Summary generated by the built-in evaluator'} · ${R.answeredCount}/${R.total} answered</div></div></div>
    <p style="margin:12px 0 0">${esc(R.summary)}</p>
    <div class="ai-grid">${tile(R.content, 'answer quality')}${tile(R.voice === null ? 'n/a' : R.voice, 'voice delivery')}${tile(R.overall, 'overall')}</div></div>
  <div class="card"><b>Score breakdown</b>${R.breakdown.map(b => bar(b.label, b.pct)).join('') || '<p class="ai-note">Not enough data.</p>'}</div>
  ${voice}
  <div class="card"><b class="ai-good">✅ Strengths</b><ul>${li(R.strengths)}</ul><b class="ai-bad">⚠️ Areas to improve</b><ul>${li(R.improve)}</ul>
    <b>📅 Action plan</b><ol style="padding-left:20px">${li(R.plan)}</ol></div>
  <div class="card"><b>Question-by-question review</b>${qa}</div>${trend}
  <div class="row ai-noprint"><button id="ai-print" type="button">🖨️ Print / Save as PDF</button><button class="ghost" id="ai-again" type="button">Practise again</button><button class="ghost" id="ai-clr" type="button">Clear AI history</button></div>`;
  $('ai-print').onclick = () => window.print();
  $('ai-again').onclick = () => { ST = null; renderSetup(); window.scrollTo(0, 0); };
  $('ai-clr').onclick = () => { try { localStorage.removeItem(HKEY); } catch (e) {} };
  window.scrollTo(0, 0);
}
})();
