const RATE_WINDOW_MS = 10 * 60 * 1000;
const DUPLICATE_WINDOW_MS = 2 * 60 * 1000;
const MAX_LEAD_BODY = 16 * 1024;

const state = globalThis.__lekaloLeadState || {
  rates: new Map(),
  duplicates: new Map()
};
globalThis.__lekaloLeadState = state;

function clean(value, maxLength) {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;'
  })[char]);
}

function requestIp(req) {
  return clean(
    String(req.headers['x-forwarded-for'] || '').split(',')[0] ||
      req.headers['x-real-ip'] ||
      req.socket?.remoteAddress ||
      'unknown',
    80
  );
}

function allowedOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try {
    const hostname = new URL(origin).hostname.toLowerCase();
    return hostname === 'lklo.ru' ||
      hostname === 'www.lklo.ru' ||
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.endsWith('.vercel.app');
  } catch {
    return false;
  }
}

function rateLimited(ip) {
  const now = Date.now();
  const recent = (state.rates.get(ip) || []).filter((time) => now - time < RATE_WINDOW_MS);
  if (recent.length >= 5) return true;
  recent.push(now);
  state.rates.set(ip, recent);
  return false;
}

function parseBody(req) {
  if (Buffer.isBuffer(req.body)) return JSON.parse(req.body.toString('utf8') || '{}');
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  return req.body && typeof req.body === 'object' ? req.body : {};
}

async function sendLeadToTelegram(lead) {
  const token = clean(process.env.TELEGRAM_BOT_TOKEN, 200);
  const chats = clean(process.env.TELEGRAM_CHAT_IDS || process.env.TELEGRAM_CHAT_ID, 500)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (!token || !chats.length) {
    return {configured: false, delivered: 0, total: chats.length};
  }

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
      body: JSON.stringify({
        chat_id: chatId,
        text: fields.join('\n'),
        parse_mode: 'HTML',
        disable_web_page_preview: true
      }),
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error(`Telegram HTTP ${response.status}`);
    const result = await response.json();
    if (!result.ok) throw new Error('Telegram rejected message');
  }));

  return {
    configured: true,
    delivered: results.filter((result) => result.status === 'fulfilled').length,
    total: chats.length
  };
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ok: false, message: 'Method Not Allowed'});
  }
  if (!allowedOrigin(req)) {
    return res.status(403).json({ok: false, message: 'Источник запроса не разрешён.'});
  }
  if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) {
    return res.status(415).json({ok: false, message: 'Неверный формат запроса.'});
  }
  const contentLength = Number(req.headers['content-length'] || 0);
  if (contentLength > MAX_LEAD_BODY) {
    return res.status(413).json({ok: false, message: 'Заявка слишком большая.'});
  }

  const ip = requestIp(req);
  if (rateLimited(ip)) {
    return res.status(429).json({ok: false, message: 'Слишком много попыток. Попробуйте немного позже.'});
  }

  let body;
  try {
    body = parseBody(req);
  } catch {
    return res.status(400).json({ok: false, message: 'Не удалось прочитать заявку.'});
  }

  if (clean(body.website, 200)) return res.status(200).json({ok: true});

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

  if (!lead.name || !lead.contact) {
    return res.status(422).json({ok: false, message: 'Укажите имя и контакт.'});
  }

  const duplicateKey = lead.contact.toLowerCase().replace(/\s+/g, '');
  const duplicateAt = state.duplicates.get(duplicateKey) || 0;
  if (Date.now() - duplicateAt < DUPLICATE_WINDOW_MS) {
    return res.status(409).json({
      ok: false,
      message: 'Эта заявка уже отправлена. Мы скоро свяжемся с вами.'
    });
  }

  let telegram;
  try {
    telegram = await sendLeadToTelegram(lead);
  } catch (error) {
    console.error(`Telegram delivery failed for ${lead.id}:`, error.message);
    telegram = {configured: true, delivered: 0, total: 1};
  }

  if (!telegram.configured || telegram.delivered === 0) {
    return res.status(503).json({
      ok: false,
      message: 'Уведомление не отправилось. Позвоните нам: +7 915 298-75-54.'
    });
  }

  state.duplicates.set(duplicateKey, Date.now());
  const partial = telegram.delivered < telegram.total;
  console.log(`Lead ${lead.id} delivered to ${telegram.delivered}/${telegram.total} Telegram chats`);
  return res.status(partial ? 202 : 200).json({
    ok: true,
    delivery: partial ? 'partial' : 'complete'
  });
};
