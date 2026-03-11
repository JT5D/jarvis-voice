import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '..', 'dist');

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.map': 'application/json',
};

const html = readFileSync(join(__dirname, 'index.html'), 'utf8');

const server = createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
    return;
  }

  // Serve dist files
  if (req.url?.startsWith('/dist/')) {
    const filePath = join(distDir, req.url.slice(6));
    try {
      const content = readFileSync(filePath, 'utf8');
      const ext = filePath.match(/\.\w+$/)?.[0] ?? '.js';
      res.writeHead(200, { 'Content-Type': MIME[ext] ?? 'application/octet-stream' });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(3457, () => {
  console.log('E2E fixture server on http://localhost:3457');
});
