import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeKeyDates, normalizeKeyDates } from './workspace-memory.service.js';

test('accepts bare dates and labelled dates from the AI', () => {
  assert.deepEqual(
    normalizeKeyDates(['2026-11-05', { label: 'Next hearing', date: '2026-12-01' }]),
    [
      { label: 'Mentioned in chat', date: '2026-11-05' },
      { label: 'Next hearing', date: '2026-12-01' },
    ]
  );
});

test('drops impossible or malformed dates', () => {
  assert.deepEqual(
    normalizeKeyDates(['2026-02-30', '05/11/2026', 'soon', { label: 'x' }, null, 42]),
    []
  );
});

test('ignores anything that is not a list', () => {
  assert.deepEqual(normalizeKeyDates('2026-11-05'), []);
  assert.deepEqual(normalizeKeyDates(undefined), []);
});

test('appends only dates that are not already recorded', () => {
  const existing = [{ label: 'Hearing (set by lawyer)', date: '2026-11-05' }];
  const merged = mergeKeyDates(existing, [
    { label: 'Mentioned in chat', date: '2026-11-05' },
    { label: 'Reply due', date: '2026-11-20' },
    { label: 'Reply due again', date: '2026-11-20' },
  ]);

  assert.deepEqual(merged, [
    { label: 'Hearing (set by lawyer)', date: '2026-11-05' },
    { label: 'Reply due', date: '2026-11-20' },
  ]);
});

test('reports no change when every date is already known', () => {
  assert.equal(mergeKeyDates([{ label: 'Hearing', date: '2026-11-05' }], [{ label: 'x', date: '2026-11-05' }]), null);
  assert.equal(mergeKeyDates(null, []), null);
});
