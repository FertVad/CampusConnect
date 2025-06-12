import assert from 'assert';
import { UsersRepository } from './repository';
import * as schema from '@shared/schema';

function createFakeDb() {
  const state: any = {};
  return {
    state,
    select: () => ({ from: () => [] }),
    insert: () => ({
      values: (v: any) => { state.inserted = v; return { returning: () => [v] }; }
    }),
    update: () => ({
      set: (v: any) => ({ where: () => ({ returning: () => { state.updated = v; return [v]; } }) })
    }),
    delete: () => ({
      where: (c: any) => { state.deleted = c; return {}; }
    })
  } as any;
}

const fakeDb: any = createFakeDb();
const repo = new UsersRepository(fakeDb);

(async () => {
  const userData: schema.InsertUser = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    password: 'secret',
    role: 'student'
  };
  const user = await repo.createUser(userData);
  assert.notStrictEqual(user.password, 'secret');
  assert(fakeDb.state.inserted.password && fakeDb.state.inserted.password !== 'secret');

  const updated = await repo.updateUser(1, { password: 'new' });
  assert(updated && updated.password !== 'new');

  const authMissing = await repo.authenticate({ email: 'missing@example.com', password: 'pass' });
  assert.strictEqual(authMissing, undefined);

  console.log('UsersRepository tests passed');
})();
