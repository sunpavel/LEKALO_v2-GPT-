const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const port = Number(process.env.PORT || 3000);
const leadRateLimit = new Map();
const leadDuplicates = new Map();
const RATE_WINDOW_MS = 10 * 60 * 1000;
const DUPLICATE_WINDOW_MS = 2 * 60 * 1000;
const MAX_LEAD_BODY = 16 * 1024;
const socialPreviewBotPattern = /TelegramBot|WhatsApp|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|Discordbot/i;
const socialPreviewHtml = `<!doctype html>
<html lang="ru" prefix="og: http://ogp.me/ns#">
<head>
<meta charset="utf-8">
<meta property="og:type" content="website">
<meta property="og:title" content="LEKALO — частная архитектура и управление строительством">
<meta property="og:description" content="Индивидуальные загородные дома в Москве и Московской области — от архитектурной концепции до реализации одной командой.">
<meta property="og:image" content="https://raw.githubusercontent.com/sunpavel/LEKALO_v2-GPT-/main/assets/og-lekalo-telegram-v6.jpg">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="800">
<meta property="og:image:height" content="420">
<title>LEKALO — частная архитектура и управление строительством</title>
</head>
<body></body>
</html>`;
const types = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
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

  result = result.replace('loading="eager" fetchpriority="high"><div class="project-caption"', 'loading="lazy" fetchpriority="low"><div class="project-caption"');

  if (!result.includes('googletagmanager.com/gtag/js?id=G-CCR5QKD0N4')) {
    result = result.replace(/<head([^>]*)>/i, `<head$1>\n${googleTagHead}`);
  }

  if (!result.includes('mc.yandex.ru/metrika/tag.js?id=111410117')) {
    result = result.replace(/<\/head>/i, `${metrikaHead}\n</head>`);
  }
  if (!result.includes('mc.yandex.ru/watch/111410117')) {
    result = result.replace(/<body([^>]*)>/i, `<body$1>\n${metrikaNoScript}`);
  }
  if (!result.includes('/assets/site-analytics.js')) {
    result = result.replace(/<\/body>/i, '  <script defer src="/assets/site-analytics.js"></script>\n</body>');
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

function clean(value, maxLength) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>]/g, (char) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;'}[char]));
}

function requestIp(req) {
  return clean(String(req.headers['x-forwarded-for'] || '').split(',')[0] || req.socket.remoteAddress || 'unknown', 80);
}

function json(res, status, data) {
  return send(res, status, JSON.stringify(data), 'application/json; charset=utf-8');
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let tooLarge = false;
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      if (tooLarge) return;
      body += chunk;
      if (Buffer.byteLength(body, 'utf8') > MAX_LEAD_BODY) {
        tooLarge = true;
        body = '';
      }
    });
    req.on('end', () => {
      if (tooLarge) return reject(Object.assign(new Error('Body too large'), {status: 413}));
      try { resolve(JSON.parse(body || '{}')); }
      catch { reject(Object.assign(new Error('Invalid JSON'), {status: 400})); }
    });
    req.on('error', reject);
  });
}

function allowedLeadOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    return hostname === 'lklo.ru' || hostname === 'www.lklo.ru' || hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

function rateLimited(ip) {
  const now = Date.now();
  const recent = (leadRateLimit.get(ip) || []).filter((time) => now - time < RATE_WINDOW_MS);
  if (recent.length >= 5) return true;
  recent.push(now);
  leadRateLimit.set(ip, recent);
  return false;
}

function leadStoragePaths() {
  const configured = process.env.LEADS_FILE ? path.resolve(process.env.LEADS_FILE) : '/data/leads.jsonl';
  return configured === '/tmp/lekalo-leads.jsonl' ? [configured] : [configured, '/tmp/lekalo-leads.jsonl'];
}

function saveLead(lead) {
  let lastError;
  for (const file of leadStoragePaths()) {
    try {
      fs.mkdirSync(path.dirname(file), {recursive: true});
      fs.appendFileSync(file, `${JSON.stringify(lead)}\n`, {encoding: 'utf8', mode: 0o600});
      return file;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function sendLeadToTelegram(lead) {
  const token = clean(process.env.TELEGRAM_BOT_TOKEN, 200);
  const chats = clean(process.env.TELEGRAM_CHAT_IDS || process.env.TELEGRAM_CHAT_ID, 500)
    .split(',').map((item) => item.trim()).filter(Boolean);
  if (!token || !chats.length) return {configured: false, delivered: 0, total: chats.length};

  const fields = [
    '<b>Новая заявка с lklo.ru</b>',
    '',
    `<b>Имя:</b> ${escapeHtml(lead.name)}`,
    `<b>Контакт:</b> ${escapeHtml(lead.contact)}`,
    `<b>Формат:</b> ${escapeHtml(lead.format || 'Не указан')}`,
    `<b>О проекте:</b> ${escapeHtml(lead.brief || 'Не указано')}`,
    '',
    `<b>Страница:</b> ${escapeHtml(lead.page || '/')}`,
    `<b>Первая страница:</b> ${escapeHtml(lead.landing || lead.page || '/')}`,
    `<b>Источник:</b> ${escapeHtml(lead.source || 'Прямой переход')}`,
    `<b>UTM:</b> ${escapeHtml(lead.utm || '—')}`,
    `<b>Время:</b> ${escapeHtml(lead.createdAt)}`
  ];
  const telegramApiBase = clean(process.env.TELEGRAM_API_BASE, 500) || 'https://api.telegram.org';
  const endpoint = `${telegramApiBase.replace(/\/$/, '')}/bot${token}/sendMessage`;
  const results = await Promise.allSettled(chats.map(async (chatId) => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({chat_id: chatId, text: fields.join('\n'), parse_mode: 'HTML', disable_web_page_preview: true}),
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error(`Telegram HTTP ${response.status}`);
    const result = await response.json();
    if (!result.ok) throw new Error('Telegram rejected message');
  }));
  return {configured: true, delivered: results.filter((result) => result.status === 'fulfilled').length, total: chats.length};
}

async function handleLead(req, res) {
  if (!allowedLeadOrigin(req)) return json(res, 403, {ok: false, message: 'Источник запроса не разрешён.'});
  if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) {
    return json(res, 415, {ok: false, message: 'Неверный формат запроса.'});
  }
  const ip = requestIp(req);
  if (rateLimited(ip)) return json(res, 429, {ok: false, message: 'Слишком много попыток. Попробуйте немного позже.'});

  let body;
  try { body = await readJson(req); }
  catch (error) { return json(res, error.status || 400, {ok: false, message: 'Не удалось прочитать заявку.'}); }

  if (clean(body.website, 200)) return json(res, 200, {ok: true});
  const lead = {
    id: `lead_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    name: clean(body.name, 100),
    contact: clean(body.contact, 160),
    format: clean(body.format, 100),
    brief: clean(body.brief, 2000),
    page: clean(body.page, 500),
    landing: clean(body.landing, 500),
    source: clean(body.referrer, 500),
    utm: clean(body.utm, 800)
  };
  if (!lead.name || !lead.contact) return json(res, 422, {ok: false, message: 'Укажите имя и контакт.'});
  if (!['1', 'true', 'yes', 'on'].includes(String(body.consent || '').toLowerCase())) {
    return json(res, 422, {ok: false, message: 'Подтвердите согласие на обработку персональных данных.'});
  }

  const duplicateKey = lead.contact.toLowerCase().replace(/\s+/g, '');
  const duplicateAt = leadDuplicates.get(duplicateKey) || 0;
  if (Date.now() - duplicateAt < DUPLICATE_WINDOW_MS) {
    return json(res, 409, {ok: false, message: 'Эта заявка уже отправлена. Мы скоро свяжемся с вами.'});
  }

  try { saveLead(lead); }
  catch (error) {
    console.error('Lead storage failed:', error.message);
    return json(res, 503, {ok: false, message: 'Не удалось сохранить заявку. Попробуйте ещё раз немного позже.'});
  }

  let telegram;
  try { telegram = await sendLeadToTelegram(lead); }
  catch (error) {
    console.error(`Telegram delivery failed for ${lead.id}:`, error.message);
    telegram = {configured: true, delivered: 0, total: 1};
  }
  if (!telegram.configured || telegram.delivered === 0) {
    return json(res, 503, {ok: false, saved: true, message: 'Заявка сохранена, но уведомление не отправилось. Попробуйте ещё раз немного позже.'});
  }

  leadDuplicates.set(duplicateKey, Date.now());
  const partial = telegram.delivered < telegram.total;
  console.log(`Lead ${lead.id} stored and delivered to ${telegram.delivered}/${telegram.total} Telegram chats`);
  return json(res, partial ? 202 : 200, {ok: true, delivery: partial ? 'partial' : 'complete'});
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname === '/health') return send(res, 200, 'ok', 'text/plain; charset=utf-8');
  if (url.pathname === '/api/leads') {
    if (req.method !== 'POST') return json(res, 405, {ok: false, message: 'Method Not Allowed'});
    return handleLead(req, res);
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method Not Allowed', 'text/plain; charset=utf-8');

  const userAgent = String(req.headers['user-agent'] || '');
  if (url.pathname === '/' && socialPreviewBotPattern.test(userAgent)) {
    return send(res, 200, socialPreviewHtml, 'text/html; charset=utf-8', 'public, max-age=300');
  }

  const hostname = String(req.headers.host || '').split(':')[0].toLowerCase();
  if (hostname === 'www.lklo.ru') {
    res.writeHead(301, {Location: `https://lklo.ru${url.pathname}${url.search}`});
    return res.end();
  }
  if (url.pathname === '/index.html') {
    res.writeHead(301, {Location: `/${url.search}`});
    return res.end();
  }
  if (url.pathname === '/lekalo-v2.html') {
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
  if (url.pathname === '/proekty') {
    res.writeHead(301, {Location: `/proekty/${url.search}`});
    return res.end();
  }
  if (url.pathname === '/kontakty') {
    res.writeHead(301, {Location: `/kontakty/${url.search}`});
    return res.end();
  }
  if (url.pathname === '/privacy') {
    res.writeHead(301, {Location: `/privacy/${url.search}`});
    return res.end();
  }
  if (url.pathname === '/proekty/rezidentsiya-s-basseynom') {
    res.writeHead(301, {Location: `/proekty/rezidentsiya-s-basseynom/${url.search}`});
    return res.end();
  }
  if (url.pathname === '/proekty/interer-zagorodnogo-doma' || url.pathname === '/proekty/interer-zagorodnogo-doma/') {
    res.writeHead(301, {Location: `/proekty/rezidentsiya-v-lesu/${url.search}`});
    return res.end();
  }
  if (url.pathname === '/proekty/rezidentsiya-v-lesu') {
    res.writeHead(301, {Location: `/proekty/rezidentsiya-v-lesu/${url.search}`});
    return res.end();
  }
  if (url.pathname === '/proekty/dom-v-lesu') {
    res.writeHead(301, {Location: `/proekty/dom-v-lesu/${url.search}`});
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
  const isSearchControlFile = url.pathname === '/robots.txt' || url.pathname === '/sitemap.xml';
  const isSocialPreviewImage = url.pathname === '/assets/hero-concept.jpg'
    || url.pathname === '/assets/og-lekalo-home-v4.jpg';
  res.writeHead(200, {
    'Content-Type': type,
    'Content-Length': String(payload.length),
    'Cache-Control': path.extname(file).toLowerCase() === '.html' || isSearchControlFile || isSocialPreviewImage
      ? 'public, max-age=0, must-revalidate'
      : 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin'
  });
  if (req.method === 'HEAD') return res.end();
  res.end(payload);
});

server.listen(port, '0.0.0.0', () => console.log(`LEKALO server listening on ${port}`));
