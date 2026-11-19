import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshState } from '../js/migrate.js';
import { addCustomQuest, canPick, isCarried, pickQuest } from '../js/quests.js';
import { markQuest, toggleBasket } from '../js/actions.js';
import { totalXP } from '../js/xp.js';

const TODAY = '2026-11-19';

test('one quest at a time, and an unfinished quest carries to the next week', () => {
  const state = freshState(TODAY);
  assert.equal(pickQuest(state, 'laundry-mountain', '2026-11-16').ok, true);
  assert.equal(canPick(state, '2026-11-18'), false);
  assert.equal(isCarried(state.quests.active, '2026-11-18'), false);
  assert.equal(isCarried(state.quests.active, '2026-11-23'), true);
  const blocked = pickQuest(state, 'cleanse-base', '2026-11-23');
  assert.equal(blocked.ok, undefined);
  assert.match(blocked.error, /Finish/);
});

test('Laundry Mountain pays +5 at halfway and +5 when every basket is put away', () => {
  const state = freshState(TODAY);
  const startXP = totalXP(state);
  pickQuest(state, 'laundry-mountain', TODAY);
  toggleBasket(state, TODAY, 'basket0', true);
  toggleBasket(state, TODAY, 'basket1', true);
  toggleBasket(state, TODAY, 'basket2', true);
  assert.equal(state.quests.active.halfOn, TODAY);
  assert.equal(state.quests.active.doneOn, null);
  assert.equal(totalXP(state) - startXP, 2 * 3 + 5);
  toggleBasket(state, TODAY, 'basket3', true);
  toggleBasket(state, TODAY, 'basket4', true);
  assert.equal(state.quests.active.doneOn, TODAY);
  assert.equal(totalXP(state) - startXP, 2 * 5 + 10);
  const questAwards = state.xpLog.filter(e => e.key.startsWith('quest:'));
  assert.deepEqual(questAwards.map(e => e.amount), [5, 5]);
});

test('unticking baskets the same day gives the halfway XP back, a later day does not', () => {
  const state = freshState(TODAY);
  pickQuest(state, 'laundry-mountain', '2026-11-18');
  toggleBasket(state, '2026-11-18', 'basket0', true);
  toggleBasket(state, '2026-11-18', 'basket1', true);
  toggleBasket(state, '2026-11-18', 'basket2', true);
  assert.ok(state.xpLog.some(e => e.key.endsWith(':half')));
  toggleBasket(state, TODAY, 'basket2', false);
  assert.ok(state.xpLog.some(e => e.key.endsWith(':half')));
  toggleBasket(state, '2026-11-18', 'basket2', false);
  assert.equal(state.quests.active.halfOn, null);
  assert.equal(state.xpLog.some(e => e.key.endsWith(':half')), false);
});

test('Cleanse Base and a custom quest are marked by hand', () => {
  const state = freshState(TODAY);
  pickQuest(state, 'cleanse-base', TODAY);
  markQuest(state, 'half', true, TODAY);
  assert.equal(state.quests.active.halfOn, TODAY);
  assert.equal(state.quests.active.doneOn, null);
  markQuest(state, 'done', true, TODAY);
  assert.equal(state.quests.active.doneOn, TODAY);
  assert.equal(state.xpLog.filter(e => e.kind === 'quest').reduce((a, e) => a + e.amount, 0), 10);

  const state2 = freshState(TODAY);
  const custom = addCustomQuest(state2, 'Sort the craft shelf', 'Done when the shelf is clear enough to use.');
  pickQuest(state2, custom.id, TODAY);
  assert.equal(state2.quests.active.kind, 'custom');
  markQuest(state2, 'done', true, TODAY);
  assert.equal(state2.quests.active.halfOn, TODAY);
  assert.equal(state2.quests.active.doneOn, TODAY);
});
