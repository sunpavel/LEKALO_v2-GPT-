const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'lekalo-server-test-'));
process.env.LEADS_FILE = path.join(testDirectory, 'leads.jsonl');
delete process.env.TELEGRAM_BOT_TOKEN;
delete process.env.TELEGRAM_CHAT_ID;
delete process.env.TELEGRAM_CHAT_IDS;

const {server} = require('../server');

function request(port, pathname, options = {}) {
  const body = options.body ? JSON.stringify(options.body) : null;
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port,
      path: pathname,
      method: options.method || 'GET',
      headers: {
        ...(body ? {'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body)} : {}),
        ...(options.headers || {})
      }
    }, (res) => {
      let responseBody = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => resolve({status: res.statusCode, headers: res.headers, body: responseBody}));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

test('Timeweb server serves pages and accepts leads without hanging', async () => {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const port = server.address().port;
  try {
    const health = await request(port, '/health');
    assert.equal(health.status, 200);
    assert.equal(health.body, 'ok');

    for (const pathname of ['/', '/kontakty/', '/privacy/', '/audit-stroitelstva/', '/proekty/taktilnyy-interer/']) {
      const page = await request(port, pathname);
      assert.equal(page.status, 200, pathname);
    }

    const redirect = await request(port, '/audit-stroitelstva');
    assert.equal(redirect.status, 301);
    assert.equal(redirect.headers.location, '/audit-stroitelstva/');

    const forbidden = await request(port, '/api/leads', {
      method: 'POST',
      headers: {Origin: 'https://example.com'},
      body: {name: 'Test', contact: 'test', consent: 'yes'}
    });
    assert.equal(forbidden.status, 403);

    const submissionId = 'test-submission-1';
    const lead = await request(port, '/api/leads', {
      method: 'POST',
      headers: {Origin: 'https://lklo.ru', 'Idempotency-Key': submissionId},
      body: {name: 'Local test', contact: 'local-test-contact', consent: 'yes', submissionId}
    });
    assert.equal(lead.status, 202);
    assert.deepEqual(JSON.parse(lead.body), {ok: true, saved: true, delivery: 'pending'});

    const duplicate = await request(port, '/api/leads', {
      method: 'POST',
      headers: {Origin: 'https://lklo.ru', 'Idempotency-Key': submissionId},
      body: {name: 'Local test', contact: 'local-test-contact', consent: 'yes', submissionId}
    });
    assert.equal(duplicate.status, 200);
    assert.equal(JSON.parse(duplicate.body).duplicate, true);

    const stored = fs.readFileSync(process.env.LEADS_FILE, 'utf8').trim().split('\n');
    assert.equal(stored.length, 1);

    let telegramPayload;
    const telegram = http.createServer((req, res) => {
      let body = '';
      req.setEncoding('utf8');
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        telegramPayload = JSON.parse(body);
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({ok: true, result: {message_id: 1}}));
      });
    });
    await new Promise((resolve, reject) => {
      telegram.once('error', reject);
      telegram.listen(0, '127.0.0.1', resolve);
    });

    try {
      process.env.TELEGRAM_BOT_TOKEN = 'test-token';
      process.env.TELEGRAM_CHAT_ID = '12345';
      process.env.TELEGRAM_API_BASE = `http://127.0.0.1:${telegram.address().port}`;
      const delivered = await request(port, '/api/leads', {
        method: 'POST',
        headers: {Origin: 'https://lklo.ru', 'Idempotency-Key': 'test-submission-2'},
        body: {name: 'Telegram test', contact: 'local-telegram-contact', consent: 'yes'}
      });
      assert.equal(delivered.status, 200);
      assert.equal(JSON.parse(delivered.body).delivery, 'complete');
      assert.equal(telegramPayload.chat_id, '12345');
      assert.match(telegramPayload.text, /Новая заявка с lklo\.ru/);
    } finally {
      delete process.env.TELEGRAM_BOT_TOKEN;
      delete process.env.TELEGRAM_CHAT_ID;
      delete process.env.TELEGRAM_API_BASE;
      await new Promise((resolve) => telegram.close(resolve));
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
