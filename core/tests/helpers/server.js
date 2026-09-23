'use strict';
const http = require('http');
const { createApplication } = require('../../src/app');

const testConfig = {
  packageInfo: require('../../package.json'),
  isProduction: false,
  hasConfiguredDatabase: false, // use in-memory session store, no extra sessions table in the test schema
  sessionSecret: 'test-secret',
  microsoftSso: { tenant: 'hust.edu.vn', clientId: '', clientSecret: '', redirectUri: '', allowedDomain: 'hust.edu.vn' }
};

function makeClient(baseUrl) {
  let cookie = '';
  async function request(method, urlPath, { body, headers = {} } = {}) {
    const response = await fetch(`${baseUrl}${urlPath}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...headers },
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    const text = await response.text();
    let json = null;
    try { json = text ? JSON.parse(text) : null; } catch { json = null; }
    return { status: response.status, json };
  }
  async function login(email, password) {
    const result = await request('POST', '/api/login', { body: { email, password } });
    if (result.status !== 200) throw new Error(`Login failed for ${email}: ${JSON.stringify(result.json)}`);
    return result.json.user;
  }
  return { request, login };
}

function startTestServer(db) {
  const { app } = createApplication({ db, config: testConfig });
  const server = http.createServer(app);
  return new Promise(resolve => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      const baseUrl = `http://127.0.0.1:${port}`;
      resolve({ baseUrl, client: makeClient(baseUrl), close: () => new Promise(r => server.close(r)) });
    });
  });
}

module.exports = { startTestServer };
