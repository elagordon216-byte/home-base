import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshState } from '../js/migrate.js';
import { TIME, WEEKEND_DAYTIME, WEEKEND_DAYTIME_UNCONFIRMED, blockFor, nowCard } from '../js/now.js';
import { weekday } from '../js/dates.js';

const THU = '2026-11-19';
const TUE = '2026-11-17';
const FRI = '2026-11-20';
const SUN = '2026-11-22';

test('clock boundaries and the unconfirmed weekend daytime block', () => {
  assert.equal(weekday(THU), 4);
  assert.equal(TIME.morningEnd, 7 * 60 + 50);
  assert.equal(TIME.preschoolEnd, 15 * 60 + 20);
  assert.equal(TIME.daytimeEnd, 17 * 60);
  assert.equal(TIME.eveningEnd, 20 * 60 + 30);
  assert.equal(WEEKEND_DAYTIME_UNCONFIRMED, true);
  assert.equal(WEEKEND_DAYTIME.startMin, 7 * 60 + 50);
  assert.equal(WEEKEND_DAYTIME.endMin, 17 * 60);

  assert.equal(blockFor(7 * 60 + 49, { wd: 4, dayType: 'weekday' }), 'morning');
  assert.equal(blockFor(7 * 60 + 50, { wd: 4, dayType: 'weekday' }), 'preschool');
  assert.equal(blockFor(15 * 60 + 19, { wd: 4, dayType: 'weekday' }), 'preschool');
  assert.equal(blockFor(15 * 60 + 20, { wd: 4, dayType: 'weekday' }), 'pickup');
  assert.equal(blockFor(17 * 60 - 1, { wd: 4, dayType: 'weekday' }), 'pickup');
  assert.equal(blockFor(17 * 60, { wd: 4, dayType: 'weekday' }), 'evening');
  assert.equal(blockFor(20 * 60 + 29, { wd: 4, dayType: 'weekday' }), 'evening');
  assert.equal(blockFor(20 * 60 + 30, { wd: 4, dayType: 'weekday' }), 'author');
  assert.equal(blockFor(10 * 60, { wd: 5, dayType: 'break' }), 'weekend-day');
  assert.equal(blockFor(10 * 60, { wd: 1, dayType: 'break' }), 'weekend-day');
  assert.equal(blockFor(10 * 60, { wd: 4, dayType: 'weekday' }), 'preschool');
});

test('Now card shows the next three tasks, with no morning-novel nudge on Tuesday or Sunday', () => {
  const state = freshState(THU);
  const morning = nowCard(state, { iso: THU, minutes: 7 * 60 });
  assert.deepEqual(morning.tasks.map(t => t.id), ['morning-novel', 'm-dressed', 'm-kids']);
  assert.equal(morning.tasks[0].xp, 3);

  const tue = nowCard(state, { iso: TUE, minutes: 7 * 60 });
  assert.equal(tue.tasks.some(t => t.id === 'morning-novel'), false);
  assert.equal(tue.tasks[0].id, 'm-dressed');

  const sun = nowCard(state, { iso: SUN, minutes: 10 * 60 });
  assert.equal(sun.blockId, 'weekend-day');
  assert.equal(sun.unconfirmed, true);
  assert.equal(sun.tasks.some(t => t.id === 'morning-novel'), false);

  const friday = nowCard(state, { iso: FRI, minutes: 10 * 60 });
  assert.equal(friday.blockId, 'weekend-day');

  state.days[THU] = { checks: { 'task:h-dishes': true, 'task:h-dirty-load': true }, notes: {}, custom: [] };
  const school = nowCard(state, { iso: THU, minutes: 9 * 60 });
  assert.equal(school.blockId, 'preschool');
  assert.deepEqual(school.tasks.map(t => t.id), ['h-main-clean', 'l-washer', 'l-dryer']);

  const done = {
    'task:morning-novel': true,
    'task:m-dressed': true,
    'task:m-kids': true,
    'task:m-breakfast': true,
    'task:m-preschool': true,
  };
  state.days[THU] = { checks: done, notes: {}, custom: [] };
  const groom = nowCard(state, { iso: THU, minutes: 7 * 60 });
  assert.deepEqual(groom.tasks.map(t => t.id), ['s-shower', 's-teeth', 's-hair']);
  assert.equal(groom.tasks[0].xp, 1);
  assert.equal(groom.tasks[0].label, 'Shower');
});

test('Sick Day and Hyperfocus Now cards are the four essentials', () => {
  const state = freshState(THU);
  state.days[THU] = { checks: {}, notes: { dayType: 'sick' }, custom: [] };
  const sick = nowCard(state, { iso: THU, minutes: 9 * 60 });
  assert.equal(sick.blockId, 'essentials');
  assert.deepEqual(sick.tasks.map(t => t.id), ['bd-kids', 'bd-dishes', 'bd-food']);

  state.days[THU].notes.dayType = 'hyperfocus';
  const hyper = nowCard(state, { iso: THU, minutes: 21 * 60 });
  assert.equal(hyper.blockId, 'essentials');
  assert.equal(hyper.tasks.length, 3);
});
