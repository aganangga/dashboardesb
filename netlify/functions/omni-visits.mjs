import { createHash, timingSafeEqual } from 'node:crypto';

// Omni credentials live exclusively in Netlify Functions environment variables.
// Browser visitors can never choose the upstream URL or send the Omni API token.
const MAX_UPSTREAM_BYTES = 10 * 1024 * 1024;

const send = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store, private, max-age=0',
    'Pragma': 'no-cache',
    'X-Content-Type-Options': 'nosniff',
  },
});

export function isAuthorizedAccessKey(provided, configured) {
  if (!configured || configured.length < 24 || typeof provided !== 'string') return false;
  const a = createHash('sha256').update(provided).digest();
  const b = createHash('sha256').update(configured).digest();
  return timingSafeEqual(a, b);
}

export function omniEndpoint(base, visitsPath) {
  if (!base || !visitsPath || !visitsPath.startsWith('/') || visitsPath.startsWith('//') ||
      visitsPath.includes('\\') || visitsPath.includes('#')) {
    throw new Error('Omni API URL/path belum dikonfigurasi dengan benar.');
  }

  const baseUrl = new URL(base);
  if (baseUrl.protocol !== 'https:' || baseUrl.username || baseUrl.password ||
      baseUrl.search || baseUrl.hash || baseUrl.pathname !== '/' ||
      ['localhost', '127.0.0.1', '::1'].includes(baseUrl.hostname) ||
      baseUrl.hostname.endsWith('.local')) {
    throw new Error('Omni API base harus alamat HTTPS yang dapat diakses Netlify.');
  }
  const target = new URL(visitsPath, baseUrl);
  if (target.origin !== baseUrl.origin || target.protocol !== 'https:' ||
      target.username || target.password) {
    throw new Error('Path Omni API harus tetap pada host yang diizinkan.');
  }
  return target.toString();
}

export default async function handler(request) {
  if (request.method !== 'POST') return send({ error: 'Method not allowed.' }, 405);

  // A credentialed cross-origin browser fetch must never reach Omni.
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return send({ error: 'Origin tidak diizinkan.' }, 403);
  }

  const accessKey = process.env.OMNI_DASHBOARD_ACCESS_KEY;
  if (!accessKey || accessKey.length < 24) {
    return send({ error: 'Integrasi Omni belum diaktifkan oleh administrator.' }, 503);
  }
  if (!isAuthorizedAccessKey(request.headers.get('x-dashboard-access-key'), accessKey)) {
    return send({ error: 'Kunci akses dashboard tidak valid.' }, 401);
  }

  const token = process.env.OMNI_API_TOKEN;
  const base = process.env.OMNI_API_BASE_URL;
  const path = process.env.OMNI_VISITS_PATH;
  if (!token || !base || !path) {
    return send({ error: 'Endpoint/token Omni belum dikonfigurasi pada Netlify.' }, 503);
  }

  let endpoint;
  try {
    endpoint = omniEndpoint(base, path);
  } catch {
    return send({ error: 'Konfigurasi endpoint Omni tidak valid. Hubungi admin.' }, 503);
  }

  try {
    const upstream = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer ' + token,
        Accept: 'application/json, text/csv;q=0.9',
      },
      redirect: 'error', // Never forward a Bearer token to a redirect destination.
      signal: AbortSignal.timeout(20000),
    });

    if (!upstream.ok) {
      return send({ error: 'Omni menolak permintaan atau tidak tersedia (HTTP ' + upstream.status + ').' }, 502);
    }
    const declaredSize = Number(upstream.headers.get('content-length')) || 0;
    if (declaredSize > MAX_UPSTREAM_BYTES) return send({ error: 'Data Omni terlalu besar untuk sinkronisasi satu halaman.' }, 413);

    const body = await upstream.text();
    if (Buffer.byteLength(body, 'utf8') > MAX_UPSTREAM_BYTES) return send({ error: 'Respons Omni melebihi batas 10 MB.' }, 413);

    const contentType = upstream.headers.get('content-type') || '';
    if (/text\/csv|application\/csv/.test(contentType)) {
      return send({ format: 'csv', payload: body, fetchedAt: new Date().toISOString() });
    }
    let payload;
    try { payload = JSON.parse(body); }
    catch { return send({ error: 'Respons Omni bukan JSON atau CSV yang valid.' }, 502); }
    // We don't guess Omni's proprietary schema: the client adapter validates before applying data.
    return send({ format: 'json', payload, fetchedAt: new Date().toISOString() });
  } catch {
    return send({ error: 'Tidak dapat menghubungi Omni dari Netlify. Periksa akses jaringan dan endpoint HTTPS.' }, 502);
  }
}

export const config = { path: '/api/omni/visits' };
