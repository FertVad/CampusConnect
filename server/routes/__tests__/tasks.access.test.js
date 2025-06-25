import { test } from 'node:test';
import assert from 'node:assert';

function filterTasksForUser(tasks, user) {
  if (user.role === 'admin') return tasks;
  const filtered = tasks.filter(t => t.clientId === user.id || t.executorId === user.id);
  if (filtered.length === 0) {
    throw new Error('Forbidden');
  }
  return filtered;
}

test('non-admin cannot access tasks of others', () => {
  const tasks = [
    { id: 1, clientId: 'u2', executorId: 'u3' }
  ];
  assert.throws(() => filterTasksForUser(tasks, { id: 'u1', role: 'student' }), /Forbidden/);
});

test('non-admin only receives own tasks', () => {
  const tasks = [
    { id: 1, clientId: 'u1', executorId: 'u2' },
    { id: 2, clientId: 'u3', executorId: 'u2' }
  ];
  const res = filterTasksForUser(tasks, { id: 'u1', role: 'student' });
  assert.deepStrictEqual(res, [tasks[0]]);
});
