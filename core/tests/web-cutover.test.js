'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { createTestDatabase } = require('./helpers/db');
const { createApplication } = require('../src/app');

const testConfig = {
  packageInfo: require('../package.json'),
  isProduction: false,
  hasConfiguredDatabase: false,
  sessionSecret: 'test-secret',
  microsoftSso: { tenant: 'hust.edu.vn', clientId: '', clientSecret: '', redirectUri: '', allowedDomain: 'hust.edu.vn' }
};

test('serves the new web app at root, legacy UI under /legacy, and keeps API/auth outside SPA fallback', async () => {
  const { pool, teardown } = await createTestDatabase();
  const webDistDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tckt-web-dist-'));
  fs.writeFileSync(path.join(webDistDir, 'index.html'), '<!doctype html><title>WEB_ENTRY</title>');

  const { app } = createApplication({ db: pool, config: testConfig, notiSender: null, webDistDir });
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    for (const urlPath of ['/', '/activity/123']) {
      const response = await fetch(`${baseUrl}${urlPath}`);
      assert.equal(response.status, 200, `${urlPath} status`);
      assert.match(await response.text(), /WEB_ENTRY/, `${urlPath} serves web entry`);
    }

    const legacyPage = await fetch(`${baseUrl}/legacy/`);
    assert.equal(legacyPage.status, 200);
    assert.match(await legacyPage.text(), /TCKT Activity Hub/);

    for (const asset of ['styles.css', 'app.js']) {
      const response = await fetch(`${baseUrl}/legacy/${asset}`);
      assert.equal(response.status, 200, `/legacy/${asset} status`);
      assert.notEqual(response.headers.get('content-type'), 'text/html; charset=utf-8', `/legacy/${asset} is an asset`);
    }

    const apiMissing = await fetch(`${baseUrl}/api/not-found`);
    assert.equal(apiMissing.status, 404);
    assert.deepEqual(await apiMissing.json(), { error: 'Endpoint not found.' });

    for (const urlPath of ['/auth/not-found', '/legacy/not-found']) {
      const response = await fetch(`${baseUrl}${urlPath}`);
      assert.notEqual(response.status, 200, `${urlPath} must not fall through to SPA`);
      assert.doesNotMatch(await response.text(), /WEB_ENTRY/, `${urlPath} must not return the SPA entry`);
    }
  } finally {
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(webDistDir, { recursive: true, force: true });
    await teardown();
  }
});
