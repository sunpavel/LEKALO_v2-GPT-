const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const port = Number(process.env.PORT || 3000);
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.md': 'text/plain; charset=utf-8'
};

function send(res, status, body, type) {
  const payload = Buffer.isBuffer(body) ? body : Buffer.from(body, 'utf8');
  res.writeHead(status, {
    'Content-Type': type,
    'Content-Length': String(payload.length),
    'Cache-Control': 'no-store, max-age=0'
  });
  if (res.req.method === 'HEAD') return res.end();
  res.end(payload);
}

function safePathname(rawUrl) {
  try {
    return decodeURIComponent(rawUrl);
  } catch {
    return null;
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname === '/health') return send(res, 200, 'ok', 'text/plain; charset=utf-8');
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method Not Allowed', 'text/plain; charset=utf-8');

  const requested = safePathname(url.pathname === '/' ? '/index.html' : url.pathname);
  if (!requested || requested.includes('\0')) return send(res, 400, 'Bad Request', 'text/plain; charset=utf-8');
  const file = path.resolve(root, `.${requested}`);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    return send(res, 404, 'Not Found', 'text/plain; charset=utf-8');
  }
  const type = types[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const payload = fs.readFileSync(file);
  res.writeHead(200, {
    'Content-Type': type,
    'Content-Length': String(payload.length),
    'Cache-Control': 'no-store, max-age=0'
  });
  if (req.method === 'HEAD') return res.end();
  res.end(payload);
});

server.listen(port, '0.0.0.0', () => console.log(`LEKALO server listening on ${port}`));
