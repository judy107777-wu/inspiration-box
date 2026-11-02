import 'fake-indexeddb/auto';
import { describe, test, expect, beforeEach } from 'vitest';
import { createQueue } from '../src/queue.js';

let dbCounter = 0;
const freshName = () => `test-outbox-${++dbCounter}`;

function sender(results) {
  const calls = [];
  const send = async (item) => {
    calls.push(item);
    const r = results.length ? results.shift() : 'ok';
    if (r instanceof Error) throw r;
    return { ...item, photoId: 'p-' + item.id };
  };
  return { send, calls };
}

describe('送出佇列', () => {
  let name;
  beforeEach(() => { name = freshName(); });

  test('加入一筆後排隊數是 1', async () => {
    const { send } = sender([new Error('offline')]);
    const q = createQueue({ send, dbName: name });
    await q.add({ id: 'x1', category: '烘焙' });
    expect(await q.count()).toBe(1);
  });

  test('送出成功才移除，並回報「已存入」', async () => {
    const { send } = sender(['ok']);
    const q = createQueue({ send, dbName: name });
    const saved = [];
    q.onSaved((rec) => saved.push(rec));
    await q.add({ id: 'x2', category: '烘焙' });
    await q.flush();
    expect(await q.count()).toBe(0);
    expect(saved).toHaveLength(1);
    expect(saved[0].photoId).toBe('p-x2');
  });

  test('送出失敗時資料還在，排隊數不變', async () => {
    const { send } = sender([new Error('offline'), new Error('offline')]);
    const q = createQueue({ send, dbName: name });
    await q.add({ id: 'x3' });
    await q.flush();
    expect(await q.count()).toBe(1);
  });

  test('重新建立佇列（重開 App）仍保有資料，並用同一個 id 重送', async () => {
    const first = sender([new Error('offline')]);
    const q1 = createQueue({ send: first.send, dbName: name });
    await q1.add({ id: 'x4', keywords: '酥皮' });
    await q1.flush();

    const second = sender(['ok']);
    const q2 = createQueue({ send: second.send, dbName: name });
    await q2.flush();
    expect(await q2.count()).toBe(0);
    expect(second.calls.map((c) => c.id)).toEqual(['x4']);
    expect(first.calls.map((c) => c.id)).toEqual(['x4']);
  });

  test('收到 online 事件會自動重送', async () => {
    const target = new EventTarget();
    const { send } = sender([new Error('offline'), 'ok']);
    const q = createQueue({ send, dbName: name, onlineTarget: target });
    await q.add({ id: 'x5' });
    await q.flush();
    expect(await q.count()).toBe(1);
    target.dispatchEvent(new Event('online'));
    await q.idle();
    expect(await q.count()).toBe(0);
  });

  test('同時呼叫兩次 flush 只會送一次', async () => {
    const { send, calls } = sender(['ok']);
    const q = createQueue({ send, dbName: name });
    await q.add({ id: 'x6' });
    await Promise.all([q.flush(), q.flush()]);
    expect(calls).toHaveLength(1);
  });

  test('send 拋出任何例外都不會刪掉資料', async () => {
    const send = async () => { throw new TypeError('boom'); };
    const q = createQueue({ send, dbName: name });
    await q.add({ id: 'x7' });
    await q.flush();
    await q.flush();
    expect(await q.count()).toBe(1);
  });

  test('排隊數變動時通知畫面', async () => {
    const { send } = sender(['ok']);
    const q = createQueue({ send, dbName: name });
    const counts = [];
    q.onChange((n) => counts.push(n));
    await q.add({ id: 'x8' });
    await q.flush();
    expect(counts).toContain(1);
    expect(counts[counts.length - 1]).toBe(0);
  });

  test('送不出去時把原因告訴畫面；之後送成功就清掉原因', async () => {
    const { send } = sender([new Error('通行碼不正確'), 'ok']);
    const q = createQueue({ send, dbName: name });
    const seen = [];
    q.onChange((n, error) => seen.push([n, error?.message ?? null]));
    await q.add({ id: 'x9' });
    await q.flush();
    expect(seen[seen.length - 1]).toEqual([1, '通行碼不正確']);
    await q.flush();
    expect(seen[seen.length - 1]).toEqual([0, null]);
  });
});
