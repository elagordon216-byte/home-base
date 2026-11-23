import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshState } from '../js/migrate.js';
import {
  START_LEVEL, LEVEL_NAMES, gain, isTouched, liveLevel, settleDay, catchUpRooms, initialRooms,
  focusRoomIds, lastFocusWeekday, normalizeRooms,
} from '../js/rooms.js';
import { toggleBasket, toggleListed } from '../js/actions.js';
import { totalXP } from '../js/xp.js';

const TODAY = '2026-11-19';
const MON = '2026-11-16';
const TUE = '2026-11-17';
const FRI = '2026-11-20';
const NEXT_FRI = '2026-11-27';

function roomsAt(level, untouched = 0) {
  const rooms = initialRooms();
  for (const id of Object.keys(rooms)) rooms[id] = { level, untouched, focus: rooms[id].focus };
  return rooms;
}

test('every room starts at Waking, level 2 of 5', () => {
  assert.equal(LEVEL_NAMES[START_LEVEL], 'Waking');
  assert.equal(START_LEVEL + 1, 2);
  const state = freshState(TODAY);
  for (const room of Object.values(state.rooms)) {
    assert.equal(room.level, 1);
    assert.equal(room.untouched, 0);
    assert.equal(room.focus.tended, false);
  }
});

test('only a focus-day main clean moves a room, and Sparkling is the cap', () => {
  const clean = { 'task:h-main-clean': true };
  const dishes = { 'task:h-dishes': true };
  assert.equal(gain('kitchen', dishes, 2), 0);
  assert.equal(gain('kitchen', clean, 2), 1);
  assert.equal(gain('kitchen', clean, 4), 0);
  assert.equal(gain('bath', clean, 1), 1);
  assert.equal(gain('laundry', clean, 5), 1);
  assert.equal(gain('kitchen', { 'basket:basket0': true }, 2), 0);
  const capped = settleDay(roomsAt(4), clean, TUE, false);
  assert.equal(capped.rooms.kitchen.level, 4);
  assert.equal(LEVEL_NAMES[4], 'Sparkling');
  const again = settleDay(capped.rooms, clean, TUE, false);
  assert.equal(again.rooms.kitchen.level, 4);
});

test('main cleaning touches only that day’s focus rooms, one level each', () => {
  const checks = { 'task:h-main-clean': true };
  assert.deepEqual(focusRoomIds(1), ['bath']);
  assert.equal(lastFocusWeekday('kitchen'), 5);
  assert.equal(lastFocusWeekday('laundry'), 5);
  assert.equal(isTouched('bath', checks, 1), true);
  assert.equal(isTouched('kitchen', checks, 1), false);
  assert.equal(gain('bath', checks, 1), 1);
  for (const id of ['mine', 'kids', 'living', 'kitchen', 'laundry', 'bath']) {
    assert.equal(isTouched(id, checks, 5), true, id);
    assert.equal(gain(id, checks, 5), 1);
  }
  assert.equal(isTouched('kitchen', checks, 6), false);
  assert.equal(isTouched('bath', checks, 0), false);
  assert.equal(focusRoomIds(0).length, 0);
  assert.equal(focusRoomIds(6).length, 0);
});

test('baskets and everyday tasks do not move a room, and basket XP is still paid once', () => {
  assert.equal(isTouched('laundry', { 'basket:basket0': true }, 4), false);
  assert.equal(isTouched('mine', { 'basket:basket0': true }, 4), false);
  assert.equal(isTouched('kitchen', { 'task:h-dishes': true, 'task:e-kitchen': true }, 2), false);

  const state = freshState(TODAY);
  toggleBasket(state, TODAY, 'basket0', true);
  toggleBasket(state, TODAY, 'basket0', true);
  const awards = state.xpLog.filter(e => e.key === 'basket:basket0');
  assert.equal(awards.length, 1);
  assert.equal(awards[0].amount, 2);
  assert.equal(state.rooms.laundry.level, 1);
  assert.equal(state.rooms.mine.level, 1);
});

test('unticking the focus clean before the day settles removes the climb', () => {
  const rooms = roomsAt(1);
  const on = { 'task:h-main-clean': true };
  assert.equal(liveLevel(rooms, 'kitchen', on, 2), 2);
  assert.equal(liveLevel(rooms, 'kitchen', {}, 2), 1);
  assert.equal(liveLevel(rooms, 'kitchen', { 'task:h-dishes': true }, 2), 1);
});

test('a missed focus week drops one level, a cleaned focus day does not, and Dusty is the floor', () => {
  let rooms = roomsAt(1);
  rooms = settleDay(rooms, { 'task:h-main-clean': true }, TUE, false).rooms;
  assert.equal(rooms.kitchen.level, 2);
  assert.equal(rooms.bath.level, 1);
  rooms = settleDay(rooms, {}, FRI, false).rooms;
  assert.equal(rooms.kitchen.level, 2);
  assert.equal(rooms.bath.level, 0);
  assert.equal(rooms.laundry.level, 0);
  const floor = settleDay(roomsAt(0), {}, FRI, false);
  assert.equal(floor.rooms.kitchen.level, 0);
  assert.equal(floor.events.some(e => e.roomId === 'kitchen'), false);

  let twice = roomsAt(2);
  twice = settleDay(twice, {}, FRI, false).rooms;
  assert.equal(twice.kitchen.level, 1);
  twice = settleDay(twice, {}, FRI, false).rooms;
  assert.equal(twice.kitchen.level, 1);
  twice = settleDay(twice, {}, NEXT_FRI, false).rooms;
  assert.equal(twice.kitchen.level, 0);
});

test('a paused focus day is not a miss, and a clean that day still moves the room', () => {
  let paused = settleDay(roomsAt(1), {}, TUE, true).rooms;
  paused = settleDay(paused, {}, FRI, true).rooms;
  assert.equal(paused.kitchen.level, 1);

  let cleaned = settleDay(roomsAt(1), { 'task:h-main-clean': true }, TUE, true).rooms;
  assert.equal(cleaned.kitchen.level, 2);
  cleaned = settleDay(cleaned, {}, FRI, false).rooms;
  assert.equal(cleaned.kitchen.level, 2);

  let missedLater = settleDay(roomsAt(1), {}, TUE, true).rooms;
  missedLater = settleDay(missedLater, {}, FRI, false).rooms;
  assert.equal(missedLater.kitchen.level, 0);
});

test('catch-up drops a missed week once and does not change XP or gold', () => {
  const state = freshState(MON);
  const paid = toggleListed(state, MON, 'h-dishes', true);
  assert.equal(paid.xp, 1);
  assert.equal(paid.gold, 1);
  const xp = totalXP(state);
  const gold = state.gold;
  const wallet = state.wallet;
  state.roomsSettledThrough = '2026-11-15';
  catchUpRooms(state, '2026-11-23');
  assert.equal(state.rooms.kitchen.level, 0);
  assert.equal(state.rooms.bath.level, 0);
  assert.equal(state.roomsSettledThrough, '2026-11-22');
  assert.equal(totalXP(state), xp);
  assert.equal(state.gold, gold);
  assert.equal(state.wallet, wallet);
});

test('an older room save keeps its level and starts the focus week fresh', () => {
  const rooms = normalizeRooms({ kitchen: { level: 3, untouched: 4 } });
  assert.equal(rooms.kitchen.level, 3);
  assert.equal(rooms.kitchen.untouched, 4);
  assert.equal(rooms.kitchen.focus.tended, false);
  assert.equal(rooms.kitchen.focus.week, null);
  assert.equal(rooms.bath.level, 1);
});

test('focus bonus is +1 XP on top of the task’s own 1 XP, and only when a room is in focus', () => {
  const tuesday = '2026-11-17';
  const saturday = '2026-11-14';
  const state = freshState(TODAY);
  const on = toggleListed(state, tuesday, 'h-main-clean', true);
  assert.equal(state.xpLog.find(e => e.key === 'task:h-main-clean').amount, 1);
  assert.equal(state.xpLog.find(e => e.key === 'focus-bonus').amount, 1);
  assert.equal(on.xp, 2);
  toggleListed(state, saturday, 'h-main-clean', true);
  const saturdayAwards = state.xpLog.filter(e => e.date === saturday);
  assert.deepEqual(saturdayAwards.map(e => e.key), ['task:h-main-clean']);
  assert.equal(saturdayAwards[0].amount, 1);
});
