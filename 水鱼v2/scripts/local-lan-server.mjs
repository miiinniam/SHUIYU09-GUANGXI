import { createServer } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { networkInterfaces } from 'node:os';

const args = new Map();
for (let i = 2; i < process.argv.length; i += 2) {
  args.set(process.argv[i], process.argv[i + 1]);
}

const port = Number(args.get('--port') || process.env.PORT || 4173);
const host = args.get('--host') || '0.0.0.0';
const root = process.cwd();
const dist = join(root, 'dist');
const handleMockDb = createMockStore();

await loadDotEnvLocal();
setDefaultEnv();
await import('./build-static.mjs');

async function loadDotEnvLocal() {
  try {
    const content = await readFile(join(root, '.env.local'), 'utf8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
      if (key && process.env[key] === undefined) process.env[key] = value;
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

const server = createServer(async (request, response) => {
  try {
    if (request.url === '/__mockdb/health') {
      sendJson(response, { ok: true });
      return;
    }

    if (request.url === '/__mockdb' && request.method === 'POST') {
      const body = JSON.parse(await readBody(request) || '{}');
      const result = handleMockDb(body);
      sendJson(response, result);
      return;
    }

    serveStatic(request, response);
  } catch (error) {
    response.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
    response.end(JSON.stringify({ ok: false, error: error.message }));
  }
});

if (process.env.NODE_ENV !== 'test') {
  server.listen(port, host, () => {
    const urls = getLanUrls(port);
    console.log(`Local LAN server running:`);
    console.log(`- http://localhost:${port}/index.html`);
    for (const url of urls) console.log(`- ${url}/index.html`);
    console.log('');
    console.log('Use one LAN URL on all devices connected to the same Wi-Fi.');
  });
}

export function createMockStore(initialData = {}) {
  let store = structuredClone(initialData);

  return function handleMockDb({ op, path = '', value }) {
    if (op === 'read') return { ok: true, value: readAt(store, path) };
    if (op === 'set') {
      store = setAt(store, path, value);
      return { ok: true };
    }
    if (op === 'update') {
      for (const [key, item] of Object.entries(value || {})) {
        store = setAt(store, joinPath(path, key), item);
      }
      return { ok: true };
    }
    if (op === 'remove') {
      store = removeAt(store, path);
      return { ok: true };
    }
    return { ok: false, error: `Unknown operation: ${op}` };
  };
}

function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const requested = url.pathname === '/' ? '/index.html' : url.pathname;
  const filePath = safeFilePath(requested);

  if (!filePath || !existsSync(filePath)) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  response.writeHead(200, { 'content-type': contentType(filePath) });
  createReadStream(filePath).pipe(response);
}

function safeFilePath(pathname) {
  const clean = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
  const filePath = join(dist, clean);
  return filePath.startsWith(dist) ? filePath : null;
}

function readAt(rootValue, path) {
  const parts = splitPath(path);
  let node = rootValue;
  for (const part of parts) {
    if (node === undefined || node === null) return null;
    node = node[part];
  }
  return node ?? null;
}

function setAt(rootValue, path, value) {
  const next = structuredClone(rootValue || {});
  const parts = splitPath(path);
  const leaf = parts.pop();
  let node = next;
  for (const part of parts) {
    if (!node[part] || typeof node[part] !== 'object') node[part] = {};
    node = node[part];
  }
  if (leaf) node[leaf] = structuredClone(value);
  return next;
}

function removeAt(rootValue, path) {
  const next = structuredClone(rootValue || {});
  const parts = splitPath(path);
  const leaf = parts.pop();
  let node = next;
  for (const part of parts) {
    if (!node[part]) return next;
    node = node[part];
  }
  if (leaf) delete node[leaf];
  return next;
}

function splitPath(path) {
  return String(path || '').replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
}

function joinPath(base, key) {
  return [base, key].map((part) => String(part || '').replace(/^\/+|\/+$/g, '')).filter(Boolean).join('/');
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) {
        request.destroy();
        reject(new Error('Request body too large'));
      }
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

function sendJson(response, value) {
  response.writeHead(200, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  response.end(JSON.stringify(value));
}

function contentType(filePath) {
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml'
  };
  return types[extname(filePath)] || 'application/octet-stream';
}

function getLanUrls(serverPort) {
  return Object.values(networkInterfaces())
    .flat()
    .filter((item) => item && item.family === 'IPv4' && !item.internal)
    .map((item) => `http://${item.address}:${serverPort}`);
}

function setDefaultEnv() {
  const defaults = {
    FIREBASE_API_KEY: 'example',
    FIREBASE_AUTH_DOMAIN: 'example.firebaseapp.com',
    FIREBASE_DATABASE_URL: 'https://example-default-rtdb.firebaseio.com',
    FIREBASE_PROJECT_ID: 'example',
    FIREBASE_STORAGE_BUCKET: 'example.appspot.com',
    FIREBASE_MESSAGING_SENDER_ID: '123',
    FIREBASE_APP_ID: 'app'
  };
  for (const [key, value] of Object.entries(defaults)) {
    if (!process.env[key]) process.env[key] = value;
  }
}
