import assert from 'node:assert/strict';
import { test } from 'node:test';
import { activityDays, utcDayStart } from './activityDays';

test('days are UTC and zero-filled, oldest first', () => {
  const now = new Date('2026-11-28T03:50:00Z');
  assert.equal(utcDayStart(now).toISOString(), '2026-11-28T00:00:00.000Z');
  const days = activityDays([
    { day: '2026-11-27', is_buy: 1, kind: 'repriced', n: '4', units: '0' },
    { day: '2026-11-27', is_buy: 0, kind: 'traded', n: 2, units: '150' },
    { day: '2026-11-28', is_buy: 0, kind: 'appeared', n: 1, units: 0 },
    { day: '2026-10-01', is_buy: 1, kind: 'repriced', n: 9, units: 0 },
  ], now, 3);
  assert.deepEqual(days.map((day) => day.date), ['2026-11-26', '2026-11-27', '2026-11-28']);
  assert.deepEqual(days[1].buy, { repriced: 4, appeared: 0, unitsTraded: 0 });
  assert.deepEqual(days[1].sell, { repriced: 0, appeared: 0, unitsTraded: 150 });
  assert.equal(days[2].sell.appeared, 1);
});
