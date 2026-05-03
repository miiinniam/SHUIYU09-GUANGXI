import assert from 'node:assert/strict';
import { readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('build script fails clearly when Firebase env vars are missing', () => {
  const result = spawnSync(process.execPath, ['scripts/build-static.mjs'], {
    cwd: root,
    env: { PATH: process.env.PATH },
    encoding: 'utf8'
  });

  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, /Missing Firebase env vars/);
});

test('build script injects Firebase config into dist output', async () => {
  const env = {
    ...process.env,
    FIREBASE_API_KEY: 'example-key',
    FIREBASE_AUTH_DOMAIN: 'example.firebaseapp.com',
    FIREBASE_DATABASE_URL: 'https://example-default-rtdb.firebaseio.com',
    FIREBASE_PROJECT_ID: 'example',
    FIREBASE_STORAGE_BUCKET: 'example.appspot.com',
    FIREBASE_MESSAGING_SENDER_ID: '123',
    FIREBASE_APP_ID: 'app-123'
  };

  const result = spawnSync(process.execPath, ['scripts/build-static.mjs'], {
    cwd: root,
    env,
    encoding: 'utf8'
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const built = await readFile(path.join(root, 'dist/firebase-config.js'), 'utf8');
  assert.match(built, /"apiKey": "example-key"/);
  assert.match(built, /"databaseURL": "https:\/\/example-default-rtdb\.firebaseio\.com"/);
});

test('build script can read Firebase config from .env.local', async () => {
  const envPath = path.join(root, '.env.local');
  await writeFile(envPath, [
    'FIREBASE_API_KEY=local-key',
    'FIREBASE_AUTH_DOMAIN=local.firebaseapp.com',
    'FIREBASE_DATABASE_URL=https://local-default-rtdb.firebaseio.com',
    'FIREBASE_PROJECT_ID=local',
    'FIREBASE_STORAGE_BUCKET=local.appspot.com',
    'FIREBASE_MESSAGING_SENDER_ID=456',
    'FIREBASE_APP_ID=local-app'
  ].join('\n'));

  try {
    const result = spawnSync(process.execPath, ['scripts/build-static.mjs'], {
      cwd: root,
      env: { PATH: process.env.PATH },
      encoding: 'utf8'
    });

    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const built = await readFile(path.join(root, 'dist/firebase-config.js'), 'utf8');
    assert.match(built, /"apiKey": "local-key"/);
    assert.match(built, /"projectId": "local"/);
  } finally {
    await rm(envPath, { force: true });
  }
});

test('build script does not require a Firebase config file rewrite in source', async () => {
  const source = await readFile(path.join(root, 'firebase-config.js'), 'utf8');
  assert.match(source, /apiKey:\s*"YOUR_API_KEY"/);
});
