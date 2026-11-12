import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import express from 'express';
import multer from 'multer';
import { keepRequestContext, requestIdMiddleware } from './request-id.middleware.js';
import { getRequestId } from '../utils/request-context.js';

const app = express();
app.use(requestIdMiddleware);
app.use(express.json());

// Handlers report the ID they see after an await, as real services do
app.post('/json', async (_req, res) => {
  await new Promise((resolve) => setTimeout(resolve, 5));
  res.json({ seen: getRequestId() ?? null });
});

app.post('/upload', keepRequestContext(multer({ storage: multer.memoryStorage() }).single('file')), async (_req, res) => {
  await new Promise((resolve) => setTimeout(resolve, 5));
  res.json({ seen: getRequestId() ?? null });
});

const server = app.listen(0);
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
after(() => server.close());

async function call(path: string, init: RequestInit = {}) {
  const res = await fetch(`${base}${path}`, { method: 'POST', ...init });
  return { header: res.headers.get('x-request-id'), seen: (await res.json()).seen };
}

test('generates an ID when the caller sends none', async () => {
  const { header, seen } = await call('/json', { headers: { 'content-type': 'application/json' }, body: '{}' });
  assert.match(header!, /^[0-9a-f-]{36}$/);
  assert.equal(seen, header);
});

test("keeps the caller's ID when it is safe", async () => {
  const { header, seen } = await call('/json', {
    headers: { 'content-type': 'application/json', 'x-request-id': 'frontend-req_42' },
    body: '{}',
  });
  assert.equal(header, 'frontend-req_42');
  assert.equal(seen, 'frontend-req_42');
});

test('replaces an unsafe ID', async () => {
  const { header } = await call('/json', {
    headers: { 'content-type': 'application/json', 'x-request-id': 'a'.repeat(200) },
    body: '{}',
  });
  assert.notEqual(header, 'a'.repeat(200));
  assert.match(header!, /^[0-9a-f-]{36}$/);
});

test('the ID survives multipart upload parsing', async () => {
  const form = new FormData();
  form.append('file', new Blob(['hello']), 'note.txt');
  const { header, seen } = await call('/upload', { headers: { 'x-request-id': 'upload-1' }, body: form });
  assert.equal(header, 'upload-1');
  assert.equal(seen, 'upload-1');
});
