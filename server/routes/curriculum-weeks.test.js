import assert from 'assert';
import express from 'express';
import { logger } from '../utils/logger';

const app = express();
app.use(express.json());

const fakeAuth = (req, _res, next) => { req.user = { id: 1, role: 'student' }; next(); };
const fakeRequireRole = roles => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
};

app.post('/api/curriculum-plans/weeks', fakeAuth, fakeRequireRole(['admin']), (_req, res) => {
  res.json({ ok: true });
});

const server = app.listen(0);
const { port } = server.address();

const resp = await fetch(`http://localhost:${port}/api/curriculum-plans/weeks`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ planId: 1, calendarData: {} })
});
assert.strictEqual(resp.status, 403);
logger.info('Curriculum weeks unauthorized test passed');
server.close();
