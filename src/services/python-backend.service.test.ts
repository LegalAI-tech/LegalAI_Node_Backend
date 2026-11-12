import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type IncomingHttpHeaders } from 'node:http';
import type { AddressInfo } from 'node:net';
import jwt from 'jsonwebtoken';
import { requestContext } from '../utils/request-context.js';

// The Python backend's utils/auth.py checks exactly these; change both together.
const SECRET = 'test-secret-'.padEnd(48, 'x');
const ISSUER = 'legalai-node';
const AUDIENCE = 'legalai-python';

// A stand-in Python backend that records what each call sent
const received: IncomingHttpHeaders[] = [];
const server = createServer((req, res) => {
  received.push(req.headers);
  req.resume();
  req.on('end', () => {
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ response: 'ok', session_id: 's1' }));
  });
});
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
after(() => server.close());

// The client reads its settings when the module loads
process.env.PYTHON_BACKEND_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
process.env.PYTHON_BACKEND_SECRETKEY = SECRET;
const { default: pythonBackend, pythonCaller } = await import('./python-backend.service.js');

function lastToken(): jwt.JwtPayload {
  const auth = received.at(-1)?.authorization;
  assert.match(auth ?? '', /^Bearer /);
  return jwt.verify(auth!.slice('Bearer '.length), SECRET, {
    algorithms: ['HS256'],
    issuer: ISSUER,
    audience: AUDIENCE,
  }) as jwt.JwtPayload;
}

test("a lawyer's call is signed for that lawyer's tenant and matter", async () => {
  await pythonBackend.agentChat(pythonCaller.lawyer('L1', 'M1'), 'hello');

  const claims = lastToken();
  assert.equal(claims.sub, 'node-backend');
  assert.equal(claims.role, 'LAWYER');
  assert.equal(claims.tenant, 'lawyer:L1');
  assert.equal(claims.matter, 'M1');
  assert.ok(claims.exp! - claims.iat! <= 300, 'tokens live at most 5 minutes');
});

test('lawyers and citizens never share a tenant', async () => {
  await pythonBackend.agentChat(pythonCaller.citizen('L1'), 'hello');

  const claims = lastToken();
  assert.equal(claims.role, 'CITIZEN');
  assert.equal(claims.tenant, 'citizen:L1');
  assert.equal(claims.matter, undefined);
  assert.notEqual(claims.tenant, pythonCaller.lawyer('L1').tenant);
});

test('a token signed with another secret is not accepted', async () => {
  await pythonBackend.agentChat(pythonCaller.citizen('U1'), 'hello');

  const token = received.at(-1)!.authorization!.slice('Bearer '.length);
  assert.throws(() => jwt.verify(token, 'another-secret'.padEnd(48, 'y'), { algorithms: ['HS256'] }));
});

test('the request ID is forwarded inside a request, and only then', async () => {
  await requestContext.run({ requestId: 'req-42' }, () => pythonBackend.agentChat(pythonCaller.citizen('U1'), 'hello'));
  assert.equal(received.at(-1)!['x-request-id'], 'req-42');

  await pythonBackend.agentChat(pythonCaller.citizen('U1'), 'hello');
  assert.equal(received.at(-1)!['x-request-id'], undefined);
});
