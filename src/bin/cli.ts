#!/usr/bin/env node
import { createServer, type IncomingMessage } from 'http';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { JarvisEngine } from '../engine/JarvisEngine.js';
import { GroqLLM } from '../providers/llm/GroqLLM.js';
import { AnthropicLLM } from '../providers/llm/AnthropicLLM.js';
import { OllamaLLM } from '../providers/llm/OllamaLLM.js';

// Auto-load .env from project root (zero-dep, no dotenv needed)
try {
  const envPath = resolve(import.meta.dirname ?? '.', '../../.env');
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    if (line.startsWith('#') || !line.includes('=')) continue;
    const eq = line.indexOf('=');
    const key = line.slice(0, eq).trim();
    const val = line.slice(eq + 1).trim();
    if (key && !process.env[key]) process.env[key] = val;
  }
} catch {
  // No .env file — that's fine, use existing env vars
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

// Server-side engine: LLM + tools only (browser handles STT + TTS)
const engine = new JarvisEngine({
  stt: [],
  tts: [],
  llm: [new GroqLLM(), new AnthropicLLM(), new OllamaLLM()],
});

const PORT = parseInt(process.env.PORT ?? '3456', 10);

const HTML = [
  '<!DOCTYPE html>',
  '<html lang="en">',
  '<head>',
  '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
  '<title>Jarvis Voice</title>',
  '<style>',
  '  * { margin: 0; box-sizing: border-box; }',
  '  body { font-family: system-ui; background: #0a0a0f; color: #e0e0e0; height: 100vh;',
  '    display: flex; flex-direction: column; align-items: center; justify-content: center; }',
  '  #status { font-size: 1.2em; margin-bottom: 24px; opacity: 0.7; }',
  '  #transcript { font-size: 0.9em; margin-top: 16px; max-width: 500px; text-align: center; min-height: 24px; opacity: 0.6; }',
  '  #response { font-size: 1em; margin-top: 12px; max-width: 500px; text-align: center; min-height: 24px; }',
  '  button { width: 80px; height: 80px; border-radius: 50%; border: none; cursor: pointer;',
  '    background: #4A90D9; transition: all 0.2s; font-size: 0; }',
  '  button:hover { transform: scale(1.05); }',
  '  button.listening { background: #E74C3C; box-shadow: 0 0 30px #E74C3C80; }',
  '  button.thinking { background: #F39C12; cursor: wait; }',
  '  button.speaking { background: #2ECC71; cursor: wait; }',
  '  button.error { background: #95A5A6; }',
  '  .providers { position: fixed; bottom: 16px; font-size: 0.7em; opacity: 0.4; }',
  '</style>',
  '</head>',
  '<body>',
  '<div id="status">Tap to talk</div>',
  '<button id="btn">',
  '  <svg width="32" height="32" viewBox="0 0 24 24" fill="white">',
  '    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2H3v2a9 9 0 0 0 8 8.94V23h2v-2.06A9 9 0 0 0 21 12v-2h-2z"/>',
  '  </svg>',
  '</button>',
  '<div id="transcript"></div>',
  '<div id="response"></div>',
  '<div class="providers" id="providers"></div>',
  '<script>',
  'var btn = document.getElementById("btn");',
  'var statusEl = document.getElementById("status");',
  'var transcriptEl = document.getElementById("transcript");',
  'var responseEl = document.getElementById("response");',
  'var providersEl = document.getElementById("providers");',
  'var currentState = "idle";',
  'var recognition = null;',
  '',
  'function setState(s) {',
  '  currentState = s;',
  '  btn.className = s;',
  '  var labels = { idle: "Tap to talk", listening: "Listening...", thinking: "Thinking...", speaking: "Speaking...", error: "Error (tap to retry)" };',
  '  statusEl.textContent = labels[s] || s;',
  '}',
  '',
  'function startListening() {',
  '  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;',
  '  if (!SR) { statusEl.textContent = "Speech recognition not supported. Use Chrome or Edge."; setState("error"); return; }',
  '  recognition = new SR();',
  '  recognition.continuous = true;',
  '  recognition.interimResults = true;',
  '  recognition.lang = "en-US";',
  '  recognition.onresult = function(event) {',
  '    var t = "";',
  '    for (var i = 0; i < event.results.length; i++) t += event.results[i][0].transcript;',
  '    transcriptEl.textContent = t;',
  '  };',
  '  recognition.onerror = function(event) { setState("error"); statusEl.textContent = "Mic error: " + event.error; };',
  '  recognition.onend = function() {',
  '    var text = transcriptEl.textContent.trim();',
  '    if (text && currentState === "listening") processInput(text);',
  '    else if (currentState === "listening") setState("idle");',
  '  };',
  '  recognition.start();',
  '  setState("listening");',
  '  transcriptEl.textContent = "";',
  '  responseEl.textContent = "";',
  '  providersEl.textContent = "WebSpeech STT";',
  '}',
  '',
  'function stopListening() {',
  '  if (recognition) { recognition.stop(); recognition = null; }',
  '}',
  '',
  'function speak(text) {',
  '  return new Promise(function(resolve) {',
  '    if (!window.speechSynthesis) { resolve(); return; }',
  '    speechSynthesis.cancel();',
  '    var utt = new SpeechSynthesisUtterance(text);',
  '    utt.rate = 1.0;',
  '    utt.onend = resolve;',
  '    utt.onerror = resolve;',
  '    speechSynthesis.speak(utt);',
  '  });',
  '}',
  '',
  'function processInput(text) {',
  '  setState("thinking");',
  '  responseEl.textContent = "";',
  '  fetch("/api/chat", {',
  '    method: "POST",',
  '    headers: { "Content-Type": "application/json" },',
  '    body: JSON.stringify({ text: text })',
  '  })',
  '  .then(function(r) { return r.json(); })',
  '  .then(function(data) {',
  '    if (data.error) throw new Error(data.error);',
  '    responseEl.textContent = data.response;',
  '    var p = data.providers;',
  '    providersEl.textContent = ["WebSpeech STT", p.llm, "WebSpeech TTS"].filter(Boolean).join(" \\u2192 ");',
  '    setState("speaking");',
  '    return speak(data.response);',
  '  })',
  '  .then(function() { setState("idle"); })',
  '  .catch(function(err) {',
  '    setState("error");',
  '    responseEl.textContent = err.message;',
  '    statusEl.textContent = err.message;',
  '  });',
  '}',
  '',
  'btn.onclick = function() {',
  '  if (currentState === "listening") { stopListening(); }',
  '  else if (currentState === "idle" || currentState === "error") { startListening(); }',
  '  else if (currentState === "speaking") { speechSynthesis.cancel(); startListening(); }',
  '};',
  '',
  'setState("idle");',
  '</script>',
  '</body></html>',
].join('\n');

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(HTML);
    return;
  }

  if (req.url === '/api/chat' && req.method === 'POST') {
    try {
      const body = await readBody(req);
      const { text } = JSON.parse(body) as { text: string };
      const response = await engine.send(text);
      const state = engine.getState();
      if (state.status === 'error' && state.error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: state.error }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ response, providers: state.providers }));
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }));
    }
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, () => {
  const url = 'http://localhost:' + PORT;
  console.log('Jarvis Voice running at ' + url);
  console.log('LLM providers: Groq' + (process.env.GROQ_API_KEY ? ' (key found)' : ' (no key)') +
    ', Anthropic' + (process.env.ANTHROPIC_API_KEY ? ' (key found)' : ' (no key)') +
    ', Ollama (localhost:11434)');
  import('child_process').then(({ exec }) => {
    const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    exec(cmd + ' ' + url);
  });
});
