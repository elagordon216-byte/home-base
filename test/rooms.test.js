import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshState } from '../js/migrate.js';
import {
  START_LEVEL, LEVEL_NAMES, gain, isTouched, liveLevel, settleDay, catchUpRooms, initialRooms, focusRoomIds,
} from '../js/rooms.js';
import { toggleBasket, toggleListed } from '../js/actions.js';

const TODAY = '2026-11-19';

function roomsAt(level, untouched = 0) {
  const rooms = initialRooms();
  for (const id of Object.keys(rooms)) rooms[id] = { level, untouched };
  return rooms;
}

test('every room starts at Waking, level 2 of 5', () => {
  assert.equal(LEVEL_NAMES[START_LEVEL], 'Waking');
  assert.equal(START_LEVEL + 1, 2);
  const state = freshState(TODAY);
  for (const room of Object.values(state.rooms)) {
    assert.equal(room.level, 1);
    assert.equal(room.untouched, 0);
  }
});

test('a task climbs one level, a focus day climbs two, and Sparkling is the cap', () => {
  const checks = { 'task:h-dishes': true };
  assert.equal(gain('kitchen', checks, 1), 1);
  assert.equal(gain('kitchen', checks, 2), 2);
  const capped = settleDay(roomsAt(3), checks, 2, false);
  assert.equal(capped.rooms.kitchen.level, 4);
  assert.equal(LEVEL_NAMES[4], 'Sparkling');
  const held = settleDay(roomsAt(4), checks, 2, false);
  assert.equal(held.rooms.kitchen.level, 4);
});

test('main cleaning touches only that day’s focus rooms', () => {
  const checks = { 'task:h-main-clean': true };
  assert.deepEqual(focusRoomIds(1), ['bath']);
  assert.equal(isTouched('bath', checks, 1), true);
  assert.equal(isTouched('kitchen', checks, 1), false);
  assert.equal(gain('bath', checks, 1), 2);
  for (const id of ['mine', 'kids', 'living', 'kitchen', 'laundry', 'bath']) {
    assert.equal(isTouched(id, checks, 5), true, id);
    assert.equal(gain(id, checks, 5), 2);
  }
  assert.equal(isTouched('kitchen', checks, 6), false);
  assert.equal(isTouched('bath', checks, 0), false);
  assert.equal(focusRoomIds(0).length, 0);
  assert.equal(focusRoomIds(6).length, 0);
});

test('baskets credit laundry and the owner, towels credit laundry only, and XP is paid once', () => {
  assert.equal(isTouched('laundry', { 'basket:basket0': true }, 4), true);
  assert.equal(isTouched('mine', { 'basket:basket0': true }, 4), true);
  assert.equal(isTouched('kids', { 'basket:basket0': true }, 4), false);
  assert.equal(isTouched('laundry', { 'basket:basket2': true }, 4), true);
  assert.equal(isTouched('kids', { 'basket:basket2': true }, 4), true);
  assert.equal(isTouched('mine', { 'basket:basket4': true }, 4), false);
  assert.equal(isTouched('laundry', { 'basket:basket4': true }, 4), true);
  assert.equal(isTouched('laundry', { 'basket:extra': true }, 4), true);
  assert.equal(isTouched('mine', { 'basket:extra': true }, 4), false);

  const state = freshState(TODAY);
  toggleBasket(state, TODAY, 'basket0', true);
  toggleBasket(state, TODAY, 'basket0', true);
  const awards = state.xpLog.filter(e => e.key === 'basket:basket0');
  assert.equal(awards.length, 1);
  assert.equal(awards[0].amount, 2);
});

test('unticking before the day settles removes the climb', () => {
  const rooms = roomsAt(1);
  const on = { 'task:h-dishes': true };
  assert.equal(liveLevel(rooms, 'kitchen', on, 4), 2);
  assert.equal(liveLevel(rooms, 'kitchen', {}, 4), 1);
});

test('seven untouched days dim one level and the count restarts, Dusty is the floor', () => {
  let rooms = roomsAt(1, 0);
  for (let i = 0; i < 6; i++) rooms = settleDay(rooms, {}, 3, false).rooms;
  assert.equal(rooms.kitchen.level, 1);
  assert.equal(rooms.kitchen.untouched, 6);
  const dimmed = settleDay(rooms, {}, 3, false);
  assert.equal(dimmed.events.some(e => e.roomId === 'kitchen' && e.to === 0), true);
  assert.equal(dimmed.rooms.kitchen.level, 0);
  assert.equal(dimmed.rooms.kitchen.untouched, 0);
  const floor = settleDay(roomsAt(0, 6), {}, 3, false);
  assert.equal(floor.rooms.kitchen.level, 0);
  assert.equal(floor.events.length, 0);
  assert.equal(floor.rooms.kitchen.untouched, 0);
});

test('a paused day does not count, and a task that day still brightens the room', () => {
  let rooms = roomsAt(1, 6);
  rooms = settleDay(rooms, {}, 3, true).rooms;
  assert.equal(rooms.kitchen.untouched, 6);
  assert.equal(rooms.kitchen.level, 1);
  const climbed = settleDay(rooms, { 'task:h-dishes': true }, 3, true);
  assert.equal(climbed.rooms.kitchen.level, 2);
  assert.equal(climbed.rooms.kitchen.untouched, 0);
});

test('fading catches up across missed days and skips Sunday', () => {
  const state = freshState('2026-11-19');
  state.roomsSettledThrough = '2026-11-10';
  catchUpRooms(state, '2026-11-19');
  assert.equal(state.rooms.kitchen.level, 0);
  assert.equal(state.rooms.kitchen.untouched, 0);
  assert.equal(state.roomsSettledThrough, '2026-11-18');
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
