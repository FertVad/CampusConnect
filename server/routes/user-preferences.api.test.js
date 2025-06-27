import assert from 'assert';
import express from 'express';
import { registerUserPreferencesRoutes } from './user-preferences';
import { MemStorage, setStorage } from '../storage';
import { logger } from '../utils/logger';

const storage = new MemStorage();
setStorage(storage);

const app = express();
app.use(express.json());

const fakeAuth = (req, _res, next) => {
  req.user = { id: 'user1' };
  next();
};

registerUserPreferencesRoutes(app, { authenticateUser: fakeAuth });

const server = app.listen(0);
const { port } = server.address();

(async () => {
  try {
    // GET returns defaults when no preferences exist
    let resp = await fetch(`http://localhost:${port}/api/user-preferences`);
    assert.strictEqual(resp.status, 200);
    let data = await resp.json();
    assert.strictEqual(data.userId, 'user1');
    assert.strictEqual(data.theme, 'light');

    // POST creates preferences
    resp = await fetch(`http://localhost:${port}/api/user-preferences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: 'dark', language: 'en', notificationsEnabled: false })
    });
    assert.strictEqual(resp.status, 201);
    data = await resp.json();
    assert.strictEqual(data.theme, 'dark');

    // GET returns created preferences
    resp = await fetch(`http://localhost:${port}/api/user-preferences`);
    data = await resp.json();
    assert.strictEqual(data.theme, 'dark');
    assert.strictEqual(data.notificationsEnabled, false);

    // PUT updates preferences
    resp = await fetch(`http://localhost:${port}/api/user-preferences`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationsEnabled: true })
    });
    assert.strictEqual(resp.status, 200);
    data = await resp.json();
    assert.strictEqual(data.notificationsEnabled, true);

    // Force a failing database call to verify logging
    const originalError = logger.error;
    const errors = [];
    logger.error = (...args) => { errors.push(args); };
    storage.getUserPreferences = async () => {
      throw { id: 'FAIL1', message: 'db failure' };
    };

    resp = await fetch(`http://localhost:${port}/api/user-preferences`);
    assert.strictEqual(resp.status, 500);
    data = await resp.json();
    assert.strictEqual(data.message, 'Failed to fetch preferences');
    assert.strictEqual(data.errorId, 'FAIL1');
    assert.ok(errors.length > 0);
    logger.error = originalError;

    logger.info('User preferences API tests passed');
  } finally {
    server.close();
  }
})();
