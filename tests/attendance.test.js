const test = require('node:test');
const assert = require('node:assert/strict');
const Utils = require('../js/utils.js');

test('Utils.safePercent - handles zero denominators and boundary values without NaN', () => {
  assert.equal(Utils.safePercent(0, 0), 0);
  assert.equal(Utils.safePercent(1, 1), 100);
  assert.equal(Utils.safePercent(3, 4), 75);
  assert.equal(Utils.safePercent(75, 100), 75);
  assert.equal(Utils.safePercent(74, 100), 74);
  assert.equal(Utils.safePercent(-1, 0), 0);
  assert.equal(Utils.safePercent(0, 10), 0);
});

test('Utils.classesCanMiss - boundary assertions', () => {
  // Attended 8 out of 8 with 75% safe threshold:
  // Can miss: 8 / (8 + x) >= 0.75 => x <= (800/75) - 8 = 10.66 - 8 = 2.
  const canMiss = Utils.classesCanMiss(8, 8, 75);
  assert.equal(canMiss, 2);

  // Asserting boundary property:
  // With 2 misses: 8 / 10 = 80% (>= 75%)
  assert.ok(Utils.safePercent(8, 8 + canMiss) >= 75);
  // With 1 more miss (3 misses): 8 / 11 = 72.7% (< 75%) - drops below threshold!
  assert.ok(Utils.safePercent(8, 8 + canMiss + 1) < 75);

  // If already below threshold, can miss 0:
  assert.equal(Utils.classesCanMiss(6, 10, 75), 0);
  // Zero total classes:
  assert.equal(Utils.classesCanMiss(0, 0, 75), 0);
});

test('Utils.classesNeededToRecover - boundary assertions', () => {
  // Attended 5 out of 10 (50%), target threshold is 75%:
  // Formula: (75*10 - 100*5) / (100 - 75) = (750 - 500) / 25 = 250 / 25 = 10 classes.
  const needed = Utils.classesNeededToRecover(5, 10, 75);
  assert.equal(needed, 10);

  // Asserting boundary property:
  // With 10 attended in a row: 15 / 20 = 75% (reaches threshold!)
  assert.ok(Utils.safePercent(5 + needed, 10 + needed) >= 75);
  // With 1 fewer attended (9 attended): 14 / 19 = 73.7% (fails to reach threshold!)
  assert.ok(Utils.safePercent(5 + needed - 1, 10 + needed - 1) < 75);

  // If already at or above threshold, needed is 0:
  assert.equal(Utils.classesNeededToRecover(8, 10, 75), 0);

  // 100% threshold when attended < total is impossible (Infinity):
  assert.equal(Utils.classesNeededToRecover(9, 10, 100), Infinity);
});
