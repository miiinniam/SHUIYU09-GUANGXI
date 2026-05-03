import assert from 'node:assert/strict';
import test from 'node:test';

test('local LAN mock store shares database state', async () => {
  process.env.NODE_ENV = 'test';
  const { createMockStore } = await import('../scripts/local-lan-server.mjs');
  const handleMockDb = createMockStore();

  const setResult = handleMockDb({ op: 'set', path: 'rooms/1234', value: { roomId: '1234', drinkCount: 0 } });
  const updateResult = handleMockDb({ op: 'update', path: '', value: { 'rooms/1234/drinkCount': 2 } });
  const readResult = handleMockDb({ op: 'read', path: 'rooms/1234' });

  assert.equal(setResult.ok, true);
  assert.equal(updateResult.ok, true);
  assert.deepEqual(readResult.value, { roomId: '1234', drinkCount: 2 });
});
