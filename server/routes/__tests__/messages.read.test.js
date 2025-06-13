import { test } from 'node:test';
import assert from 'node:assert';

class FakeStorage {
  constructor() {
    this.users = new Map();
    this.messages = new Map();
    this.userId = 1;
    this.messageId = 1;
  }
  createUser(data) {
    const user = { ...data, id: this.userId++ };
    this.users.set(user.id, user);
    return user;
  }
  createMessage(data) {
    const message = { ...data, id: this.messageId++, sentAt: new Date(), status: 'sent' };
    this.messages.set(message.id, message);
    return message;
  }
  getMessage(id) {
    return this.messages.get(id);
  }
  updateMessageStatus(id, status) {
    const msg = this.messages.get(id);
    if (!msg) return undefined;
    const updated = { ...msg, status };
    this.messages.set(id, updated);
    return updated;
  }
}

function markMessagesAsRead(storage, userId, ids) {
  const updated = [];
  for (const id of ids) {
    const msg = storage.getMessage(id);
    if (!msg) continue;
    if (msg.toUserId !== userId) {
      throw new Error('Forbidden');
    }
    updated.push(storage.updateMessageStatus(id, 'read'));
  }
  return updated;
}

test('cannot mark other user messages as read', () => {
  const s = new FakeStorage();
  const u1 = s.createUser({ firstName: 'A', lastName: 'A', email: 'a' });
  const u2 = s.createUser({ firstName: 'B', lastName: 'B', email: 'b' });
  const m = s.createMessage({ fromUserId: u1.id, toUserId: u2.id, content: 'hi' });
  assert.throws(() => markMessagesAsRead(s, u1.id, [m.id]), /Forbidden/);
  assert.strictEqual(s.getMessage(m.id).status, 'sent');
});

test('recipient can mark own message as read', () => {
  const s = new FakeStorage();
  const u1 = s.createUser({ firstName: 'A', lastName: 'A', email: 'a' });
  const u2 = s.createUser({ firstName: 'B', lastName: 'B', email: 'b' });
  const m = s.createMessage({ fromUserId: u1.id, toUserId: u2.id, content: 'hi' });
  const res = markMessagesAsRead(s, u2.id, [m.id]);
  assert.strictEqual(res.length, 1);
  assert.strictEqual(s.getMessage(m.id).status, 'read');
});
