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

const metrikaHead = `  <!-- Yandex.Metrika counter -->
  <script type="text/javascript">
    (function(m,e,t,r,i,k,a){
      m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
      m[i].l=1*new Date();
      for (var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
      k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
    })(window,document,'script','https://mc.yandex.ru/metrika/tag.js?id=111410117','ym');

    ym(111410117,'init',{ssr:true,webvisor:true,clickmap:true,ecommerce:'dataLayer',referrer:document.referrer,url:location.href,accurateTrackBounce:true,trackLinks:true});
  </script>
  <!-- /Yandex.Metrika counter -->`;
const metrikaNoScript = '  <noscript><div><img src="https://mc.yandex.ru/watch/111410117" style="position:absolute;left:-9999px" alt=""></div></noscript>';

function ensureMetrika(html) {
  if (html.includes('mc.yandex.ru/metrika/tag.js?id=111410117')) return html;

  let result = html.replace(/<head([^>]*)>/i, `<head$1>\n${metrikaHead}`);
  result = result.replace(/<body([^>]*)>/i, `<body$1>\n${metrikaNoScript}`);
  return result;
}

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
  const source = fs.readFileSync(file);
  const payload = path.extname(file).toLowerCase() === '.html'
    ? Buffer.from(ensureMetrika(source.toString('utf8')), 'utf8')
    : source;
  res.writeHead(200, {
    'Content-Type': type,
    'Content-Length': String(payload.length),
    'Cache-Control': 'no-store, max-age=0'
  });
  if (req.method === 'HEAD') return res.end();
  res.end(payload);
});

server.listen(port, '0.0.0.0', () => console.log(`LEKALO server listening on ${port}`));
