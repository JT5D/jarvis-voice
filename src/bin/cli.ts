#!/usr/bin/env node
import { createServer } from 'http';

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Jarvis Voice</title>
<style>
  * { margin: 0; box-sizing: border-box; }
  body { font-family: system-ui; background: #0a0a0f; color: #e0e0e0; height: 100vh;
    display: flex; flex-direction: column; align-items: center; justify-content: center; }
  #status { font-size: 1.2em; margin-bottom: 24px; opacity: 0.7; }
  #transcript { font-size: 0.9em; margin-top: 16px; max-width: 500px; text-align: center; min-height: 24px; }
  #response { font-size: 1em; margin-top: 12px; max-width: 500px; text-align: center; min-height: 24px; }
  button { width: 80px; height: 80px; border-radius: 50%; border: none; cursor: pointer;
    background: #4A90D9; transition: all 0.2s; font-size: 0; }
  button:hover { transform: scale(1.05); }
  button.listening { background: #E74C3C; box-shadow: 0 0 30px #E74C3C80; }
  button.thinking { background: #F39C12; cursor: wait; }
  button.speaking { background: #2ECC71; cursor: wait; }
  button.error { background: #95A5A6; }
  .providers { position: fixed; bottom: 16px; font-size: 0.7em; opacity: 0.4; }
</style>
</head>
<body>
<div id="status">Tap to talk</div>
<button id="btn">
  <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2H3v2a9 9 0 0 0 8 8.94V23h2v-2.06A9 9 0 0 0 21 12v-2h-2z"/>
  </svg>
</button>
<div id="transcript"></div>
<div id="response"></div>
<div class="providers" id="providers"></div>
<script type="module">
import { createJarvis } from '/src/create.js';

const engine = createJarvis();
const btn = document.getElementById('btn');
const statusEl = document.getElementById('status');
const transcriptEl = document.getElementById('transcript');
const responseEl = document.getElementById('response');
const providersEl = document.getElementById('providers');

engine.subscribe(s => {
  btn.className = s.status;
  statusEl.textContent = { idle: 'Tap to talk', listening: 'Listening...', thinking: 'Thinking...', speaking: 'Speaking...', error: s.error || 'Error' }[s.status] || '';
  if (s.transcript) transcriptEl.textContent = s.transcript;
  if (s.response) responseEl.textContent = s.response;
  const p = s.providers;
  providersEl.textContent = [p.stt, p.llm, p.tts].filter(Boolean).join(' → ');
});

let listening = false;
btn.onclick = async () => {
  if (listening) { await engine.stopListening(); listening = false; }
  else if (engine.getState().status === 'idle' || engine.getState().status === 'error') {
    await engine.startListening(); listening = true;
  }
};
</script>
</body></html>`;

const PORT = parseInt(process.env.PORT ?? '3456', 10);

const server = createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(HTML);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`Jarvis Voice running at ${url}`);
  import('child_process').then(({ exec }) => {
    const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
    exec(`${cmd} ${url}`);
  });
});
