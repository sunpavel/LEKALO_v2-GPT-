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
  '.md': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8'
};

const googleTagHead = `  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-CCR5QKD0N4"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-CCR5QKD0N4');
  </script>`;

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

function ensureAnalytics(html) {
  let result = html;

  if (!result.includes('googletagmanager.com/gtag/js?id=G-CCR5QKD0N4')) {
    result = result.replace(/<head([^>]*)>/i, `<head$1>\n${googleTagHead}`);
  }

  if (!result.includes('mc.yandex.ru/metrika/tag.js?id=111410117')) {
    result = result.replace(/<\/head>/i, `${metrikaHead}\n</head>`);
  }
  if (!result.includes('mc.yandex.ru/watch/111410117')) {
    result = result.replace(/<body([^>]*)>/i, `<body$1>\n${metrikaNoScript}`);
  }
  return result;
}

function send(res, status, body, type, cacheControl = 'no-store') {
  const payload = Buffer.isBuffer(body) ? body : Buffer.from(body, 'utf8');
  res.writeHead(status, {
    'Content-Type': type,
    'Content-Length': String(payload.length),
    'Cache-Control': cacheControl,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
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

  const hostname = String(req.headers.host || '').split(':')[0].toLowerCase();
  if (hostname === 'www.lklo.ru') {
    res.writeHead(301, {Location: `https://lklo.ru${url.pathname}${url.search}`});
    return res.end();
  }
  if (url.pathname === '/index.html') {
    res.writeHead(301, {Location: `/${url.search}`});
    return res.end();
  }
  if (url.pathname === '/stroitelstvo-domov-pod-klyuch') {
    res.writeHead(301, {Location: `/stroitelstvo-domov-pod-klyuch/${url.search}`});
    return res.end();
  }
  if (url.pathname === '/stoimost-stroitelstva-doma') {
    res.writeHead(301, {Location: `/stoimost-stroitelstva-doma/${url.search}`});
    return res.end();
  }
  if (url.pathname === '/proektirovanie-domov') {
    res.writeHead(301, {Location: `/proektirovanie-domov/${url.search}`});
    return res.end();
  }
  if (url.pathname === '/generalnyj-podryad') {
    res.writeHead(301, {Location: `/generalnyj-podryad/${url.search}`});
    return res.end();
  }
  if (url.pathname === '/stroitelnyy-kontrol') {
    res.writeHead(301, {Location: `/stroitelnyy-kontrol/${url.search}`});
    return res.end();
  }

  const publicPath = url.pathname === '/'
    ? '/index.html'
    : url.pathname.endsWith('/')
      ? `${url.pathname}index.html`
      : url.pathname;
  const requested = safePathname(publicPath);
  if (!requested || requested.includes('\0')) return send(res, 400, 'Bad Request', 'text/plain; charset=utf-8');
  const file = path.resolve(root, `.${requested}`);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    const notFound = fs.readFileSync(path.join(root, '404.html'));
    return send(res, 404, notFound, types['.html']);
  }
  const type = types[path.extname(file).toLowerCase()] || 'application/octet-stream';
  const source = fs.readFileSync(file);
  const payload = path.extname(file).toLowerCase() === '.html'
    ? Buffer.from(ensureAnalytics(source.toString('utf8')), 'utf8')
    : source;
  res.writeHead(200, {
    'Content-Type': type,
    'Content-Length': String(payload.length),
    'Cache-Control': path.extname(file).toLowerCase() === '.html'
      ? 'public, max-age=0, must-revalidate'
      : 'public, max-age=604800, stale-while-revalidate=86400',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  });
  if (req.method === 'HEAD') return res.end();
  res.end(payload);
});

server.listen(port, '0.0.0.0', () => console.log(`LEKALO server listening on ${port}`));
