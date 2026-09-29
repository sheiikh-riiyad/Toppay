const assert = require('node:assert/strict');
const { test } = require('node:test');
const {
  hashCardPaymentPin,
  matchesCardPaymentPin,
  isValidCardPaymentPin,
  evaluateCardPaymentPinAttempt,
} = require('../node_modules/.cache/card-pin-tests/card-payment-pin.js');

test('only 3 or 4 ASCII digits are accepted, including leading zeros', () => {
  for (const pin of ['123', '0123', '000']) assert.equal(isValidCardPaymentPin(pin), true);
  for (const pin of ['', '12', '12345', '1a3', ' 123', '123 ', '1.23']) {
    assert.equal(isValidCardPaymentPin(pin), false);
  }
});

test('a saved PIN verifies exactly and the stored record contains no readable PIN', async () => {
  const record = await hashCardPaymentPin('0123', 'user-a:card-a');
  assert.deepEqual(Object.keys(record).sort(), ['hash', 'salt', 'version']);
  assert.equal(record.hash.length, 64);
  assert.equal(await matchesCardPaymentPin('0123', record), true);
  assert.equal(await matchesCardPaymentPin('123', record), false);
  assert.equal(await matchesCardPaymentPin('0124', record), false);
  assert.equal(await matchesCardPaymentPin('0123', { ...record, version: 2 }), false);
  assert.equal(await matchesCardPaymentPin('0123', { ...record, hash: 'bad-data' }), false);
});

test('the same PIN has different hashes for different cards', async () => {
  const first = await hashCardPaymentPin('123', 'user-a:card-a');
  const second = await hashCardPaymentPin('123', 'user-a:card-b');
  assert.notEqual(first.hash, second.hash);
  assert.equal(await matchesCardPaymentPin('123', second), true);
});

test('invalid PINs cannot be enrolled', async () => {
  await assert.rejects(hashCardPaymentPin('12', 'user-a:card-a'));
  await assert.rejects(hashCardPaymentPin('1234', ''));
});

test('five failures block attempts until the cooldown expires, including a correct PIN', () => {
  let state = {};
  const now = 1000;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const outcome = evaluateCardPaymentPinAttempt(false, state, now);
    assert.equal(outcome.result, attempt === 5 ? 'locked' : 'incorrect');
    state = outcome.updates;
  }
  assert.equal(state.paymentPinLockedUntil, now + 300000);
  const duringCooldown = evaluateCardPaymentPinAttempt(true, state, now + 1000);
  assert.equal(duringCooldown.result, 'locked');
  assert.equal(duringCooldown.updates, undefined);
  const afterCooldown = evaluateCardPaymentPinAttempt(true, state, now + 300000);
  assert.equal(afterCooldown.result, 'ok');
  assert.deepEqual(afterCooldown.updates, { paymentPinFailures: 0, paymentPinLockedUntil: 0 });
});

test('a correct PIN clears previous failures', () => {
  const outcome = evaluateCardPaymentPinAttempt(true, { paymentPinFailures: 4 }, 1000);
  assert.equal(outcome.result, 'ok');
  assert.equal(outcome.updates.paymentPinFailures, 0);
});
