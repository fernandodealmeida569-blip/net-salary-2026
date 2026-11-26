import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as f from '../src/uk.js';

test('UK take-home 2026/27', () => {
  const a = f.ukTakeHome({ salary: 30000 });
  assert.deepEqual([a.tax, a.ni, a.net], [3486, 1394.4, 25119.6]);
  const b = f.ukTakeHome({ salary: 60000 });
  assert.deepEqual([b.tax, b.ni, b.net], [11432, 3210.6, 45357.4]);
  const c = f.ukTakeHome({ salary: 110000 }); // personal allowance reduced by £5,000
  assert.equal(c.personalAllowance, 7570);
  assert.equal(c.tax, 33432);
  const d = f.ukTakeHome({ salary: 150000 });
  assert.deepEqual([d.personalAllowance, d.tax], [0, 53703]);
  assert.equal(f.ukTakeHome({ salary: 12000 }).net, 12000);
  const e = f.ukTakeHome({ salary: 35000, pensionPct: 5, plan: 'plan2', postgrad: true });
  assert.deepEqual([e.pension, e.tax, e.ni, e.studentLoan, e.pgLoan], [1750, 4136, 1794.4, 505, 840]);
});
test('SDLT', () => {
  assert.equal(f.sdlt({ price: 295000 }).tax, 4750);
  assert.equal(f.sdlt({ price: 125000 }).tax, 0);
  assert.equal(f.sdlt({ price: 400000, buyer: 'first' }).tax, 5000);
  assert.equal(f.sdlt({ price: 300000, buyer: 'first' }).tax, 0);
  const g = f.sdlt({ price: 600000, buyer: 'first' });
  assert.deepEqual([g.tax, g.lostRelief], [20000, true]);
  assert.equal(f.sdlt({ price: 300000, buyer: 'additional' }).tax, 20000);
  assert.equal(f.sdlt({ price: 300000, nonResident: true }).tax, 11000);
  assert.equal(f.sdlt({ price: 2000000 }).tax, 153750);
});
