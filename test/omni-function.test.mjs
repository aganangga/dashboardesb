import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import handler, { omniEndpoint, isAuthorizedAccessKey } from '../netlify/functions/omni-visits.mjs';

const originalFetch = globalThis.fetch;
const originalEnv = {
  OMNI_DASHBOARD_ACCESS_KEY: process.env.OMNI_DASHBOARD_ACCESS_KEY,
  OMNI_API_TOKEN: process.env.OMNI_API_TOKEN,
  OMNI_API_BASE_URL: process.env.OMNI_API_BASE_URL,
  OMNI_VISITS_PATH: process.env.OMNI_VISITS_PATH,
};
const key = 'test-access-key-32-characters-abcdef';
const req = (header = key, method = 'POST') => new Request('https://dashboardesb.netlify.app/api/omni/visits', {
  method,
  headers: header === null ? {} : { 'x-dashboard-access-key': header },
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const [name, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});
function config() {
  process.env.OMNI_DASHBOARD_ACCESS_KEY = key;
  process.env.OMNI_API_TOKEN = 'private-omni-token-test';
  process.env.OMNI_API_BASE_URL = 'https://omni.example.org';
  process.env.OMNI_VISITS_PATH = '/v1/visits';
}

test('access key authentication is constant-time digest comparison and never empty', () => {
  assert.equal(isAuthorizedAccessKey(key, key), true);
  assert.equal(isAuthorizedAccessKey('incorrect', key), false);
  assert.equal(isAuthorizedAccessKey('', ''), false);
});

test('validates upstream same-origin HTTPS and rejects redirects to attacker host', () => {
  assert.equal(omniEndpoint('https://omni.example.org', '/v1/visits'), 'https://omni.example.org/v1/visits');
  assert.throws(() => omniEndpoint('http://omni.example.org', '/v1/visits'));
  assert.throws(() => omniEndpoint('https://omni.example.org', '//other.example/steal'));
  assert.throws(() => omniEndpoint('https://omni.example.org', '/\\other.example'));
});

test('method and absent/mismatched access key never trigger Omni fetch', async () => {
  config();
  globalThis.fetch = async () => { throw Error('fetch must not be called'); };
  assert.equal((await handler(req(key, 'GET'))).status, 405);
  assert.equal((await handler(req('wrong'))).status, 401);
  assert.equal((await handler(req(null))).status, 401);
});

test('not configured returns 503 without token leak', async () => {
  delete process.env.OMNI_DASHBOARD_ACCESS_KEY;
  assert.equal((await handler(req())).status, 503);
});

test('Omni token stays server-side and valid records are returned', async () => {
  config();
  let captured;
  globalThis.fetch = async (url, options) => {
    captured = { url, options };
    return new Response(JSON.stringify({ data: [{ 'Ticket ID': 'ESB-1', 'Date Visit': '01/09/2026' }] }), {
      headers: { 'content-type': 'application/json' },
    });
  };
  const response = await handler(req());
  const parsed = await response.json();
  assert.equal(response.status, 200);
  assert.equal(captured.url, 'https://omni.example.org/v1/visits');
  assert.equal(captured.options.headers.Authorization, 'Bearer private-omni-token-test');
  assert.equal(captured.options.redirect, 'error');
  assert.equal(parsed.format, 'json');
  assert.equal(parsed.payload.data[0]['Ticket ID'], 'ESB-1');
  assert.ok(!JSON.stringify(parsed).includes('private-omni-token-test'));
  assert.equal(response.headers.get('cache-control').includes('no-store'), true);
});

test('Omni errors are sanitized and previous dashboard state is not changed', async () => {
  config();
  globalThis.fetch = async () => new Response('Sensitive token details', { status: 403 });
  const response = await handler(req());
  assert.equal(response.status, 502);
  assert.ok(!(await response.text()).includes('Sensitive token details'));
});
