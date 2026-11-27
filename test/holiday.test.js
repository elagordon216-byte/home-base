import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshState, exportBackup, importBackup } from '../js/migrate.js';
import {
  awardHyperfocusManual, setDayType, toggleListed, toggleSpan, toggleWitch,
} from '../js/actions.js';
import { DAY_TYPES, dayTypeOf, essentialsOn, isFadePaused, isHoliday } from '../js/days.js';
import { activeSabbatKey, sabbatOn } from '../js/moon.js';
import { moonPhaseFor } from '../js/moon.js';
import { nowCard } from '../js/now.js';
import { catchUpRooms, roomViews, settleDay, initialRooms } from '../js/rooms.js';
import { totalXP } from '../js/xp.js';
import { lunarPhaseData } from '../js/v2-data.js';
import { viewHTML } from '../js/views.js';

const THU = '2026-11-19';
const MON = '2026-11-16';
const TUE = '2026-11-17';
const FRI = '2026-11-20';
const SAMHAIN = '2026-11-01';

function roomsAt(level) {
  const rooms = initialRooms();
  for (const id of Object.keys(rooms)) rooms[id] = { level, untouched: 0, focus: rooms[id].focus };
  return rooms;
}

function holidayState(date) {
  const state = freshState(date);
  setDayType(state, date, 'holiday');
  state.ui.tab = 'today';
  state.date = date;
  return state;
}

test('Holiday is a fifth day type and does not replace the older four', () => {
  assert.deepEqual(DAY_TYPES.map(t => t.id), ['weekday', 'break', 'sick', 'hyperfocus', 'holiday']);
  assert.equal(dayTypeOf({ dayType: 'holiday' }, THU), 'holiday');
  assert.equal(dayTypeOf({ kind: 'holiday' }, THU), 'holiday');
  assert.equal(dayTypeOf({ dayType: 'holiday', kind: 'normal' }, THU), 'holiday');
  assert.equal(dayTypeOf({ kind: 'normal' }, THU), 'weekday');
  assert.equal(dayTypeOf({ kind: 'fallbreak' }, THU), 'break');
  assert.equal(dayTypeOf({ kind: 'sick' }, THU), 'sick');
  assert.equal(dayTypeOf({ kind: 'hyperfocus' }, THU), 'hyperfocus');
  assert.equal(dayTypeOf({ kind: 'sunday' }, THU), 'break');
  assert.equal(dayTypeOf({ kind: 'tuesday' }, THU), 'weekday');
  assert.equal(dayTypeOf({}, THU), 'weekday');
  assert.equal(dayTypeOf({}, FRI), 'break');
});

test('choosing Holiday pays nothing and does not take XP or gold back', () => {
  const state = freshState(THU);
  const start = totalXP(state);
  const gold = state.gold;
  assert.equal(setDayType(state, THU, 'holiday'), 0);
  assert.equal(totalXP(state), start);
  assert.equal(state.gold, gold);
  assert.equal(state.days[THU].notes.dayType, 'holiday');
  assert.equal(state.days[THU].notes.kind, 'holiday');

  setDayType(state, THU, 'hyperfocus');
  assert.equal(totalXP(state) - start, 10);
  setDayType(state, THU, 'holiday');
  assert.equal(totalXP(state), start);
  assert.equal(state.gold, gold);

  awardHyperfocusManual(state, THU);
  setDayType(state, THU, 'holiday');
  assert.equal(totalXP(state) - start, 10);
  assert.equal(state.gold, gold);
});

test('Holiday keeps ordinary task pay and skips the focus bonus', () => {
  const state = freshState(THU);
  setDayType(state, TUE, 'holiday');
  const before = totalXP(state);
  const gold = state.gold;
  const clean = toggleListed(state, TUE, 'h-main-clean', true);
  assert.equal(clean.xp, 1);
  assert.equal(clean.gold, 1);
  assert.equal(state.xpLog.some(e => e.key === 'focus-bonus'), false);
  const care = toggleListed(state, TUE, 's-shower', true);
  assert.equal(care.xp, 1);
  assert.equal(care.gold, 1);
  const witch = toggleWitch(state, TUE, 'checks', 'ground', 'witch:ground', 'Witchy practice', true);
  assert.equal(witch.xp, 0);
  assert.equal(witch.gold, 1);
  assert.equal(totalXP(state), before + 2);
  assert.equal(state.gold, gold + 3);

  const earned = totalXP(state);
  toggleListed(state, THU, 'h-main-clean', true);
  setDayType(state, THU, 'holiday');
  assert.equal(totalXP(state), earned + 2);
  assert.equal(state.xpLog.find(e => e.date === THU && e.key === 'focus-bonus').amount, 1);
});

test('a Holiday is not a missed focus day and does not level a room', () => {
  let paused = settleDay(roomsAt(1), { 'task:h-main-clean': true }, TUE, true, true).rooms;
  assert.equal(paused.kitchen.level, 1);
  assert.equal(paused.kitchen.focus.tended, false);
  paused = settleDay(paused, {}, FRI, true, true).rooms;
  assert.equal(paused.kitchen.level, 1);

  let cleaned = settleDay(roomsAt(1), { 'task:h-main-clean': true }, TUE, false, false).rooms;
  assert.equal(cleaned.kitchen.level, 2);
  cleaned = settleDay(cleaned, { 'task:h-main-clean': true }, FRI, true, true).rooms;
  assert.equal(cleaned.kitchen.level, 2);

  let earlierMiss = settleDay(roomsAt(1), {}, TUE, false, false).rooms;
  earlierMiss = settleDay(earlierMiss, {}, FRI, true, true).rooms;
  assert.equal(earlierMiss.kitchen.level, 0);

  const state = freshState(MON);
  const xp = totalXP(state);
  const gold = state.gold;
  setDayType(state, TUE, 'holiday');
  setDayType(state, FRI, 'holiday');
  toggleListed(state, TUE, 'h-main-clean', true);
  const afterPay = totalXP(state);
  state.roomsSettledThrough = '2026-11-15';
  catchUpRooms(state, '2026-11-23');
  assert.equal(state.rooms.kitchen.level, 1);
  assert.equal(state.rooms.laundry.level, 1);
  assert.equal(state.rooms.bath.level, 0);
  assert.equal(totalXP(state), afterPay);
  assert.equal(state.gold, gold + 1);
  assert.ok(afterPay > xp);

  state.date = TUE;
  const views = roomViews(state, TUE);
  assert.equal(views.every(r => r.focus === false), true);
  assert.equal(views.find(r => r.id === 'kitchen').gain, 0);
  assert.equal(isFadePaused(state, TUE), true);
  state.days[TUE].showFull = true;
  state.days[TUE].badDay = false;
  assert.equal(isHoliday(state.days[TUE].notes, TUE), true);
  assert.equal(isFadePaused(state, TUE), true);
  assert.equal(essentialsOn(state.days[TUE], TUE), false);
});

test('Today on a Holiday is essentials, self-care, and that day’s witchy tasks', () => {
  const state = holidayState(THU);
  const html = viewHTML(state, THU, 10 * 60);
  const phase = moonPhaseFor(THU).phase;
  const lunarId = phase + ':' + lunarPhaseData[phase].tasks[0][0];

  assert.match(html, /data-act="day-type" data-id="holiday"/);
  assert.match(html, /class="on"[^>]*data-id="holiday"|data-id="holiday"[^>]*class="on"/);
  assert.match(html, /data-kind="essential" data-id="bd-kids"/);
  assert.match(html, /data-kind="task" data-id="s-shower"/);
  assert.match(html, /data-kind="witch" data-id="ground"/);
  assert.match(html, new RegExp('data-kind="lunar" data-id="' + lunarId + '"'));
  assert.equal(activeSabbatKey(state.days[THU], THU), null);
  assert.equal(sabbatOn(THU), null);
  assert.doesNotMatch(html, /data-kind="sabbat"/);
  assert.doesNotMatch(html, /data-id="h-main-clean"/);
  assert.doesNotMatch(html, /data-id="h-dishes"/);
  assert.doesNotMatch(html, /data-id="l-washer"/);
  assert.doesNotMatch(html, /data-id="l-dryer"/);
  assert.doesNotMatch(html, /data-id="h-dirty-load"/);
  assert.doesNotMatch(html, /Clean laundry waiting/);
  assert.match(html, /Show the full checklist/);

  const card = nowCard(state, { iso: THU, minutes: 10 * 60 });
  assert.equal(card.blockId, 'essentials');
  assert.deepEqual(card.tasks.map(t => t.id), ['bd-kids', 'bd-dishes', 'bd-food']);

  state.days[THU].showFull = true;
  const full = viewHTML(state, THU, 10 * 60);
  assert.match(full, /data-id="h-main-clean"/);
  assert.match(full, /data-id="l-washer"/);
  assert.match(full, /data-kind="task" data-id="s-shower"/);
  assert.equal(full.split('data-id="s-shower"').length - 1, 1);
  assert.match(full, /data-kind="witch" data-id="ground"/);
  assert.doesNotMatch(full, /1 XP \+ 1 focus bonus/);

  state.days[THU].witchy = { sabbatManual: true, sabbatChoice: 'yule', checks: {} };
  const chosen = viewHTML(state, THU, 10 * 60);
  assert.match(chosen, /data-kind="sabbat" data-id="yule:intention"/);

  const feast = holidayState(SAMHAIN);
  assert.equal(sabbatOn(SAMHAIN).key, 'samhain');
  assert.equal(activeSabbatKey(feast.days[SAMHAIN], SAMHAIN), 'samhain');
  const feastHTML = viewHTML(feast, SAMHAIN, 10 * 60);
  assert.match(feastHTML, /data-kind="sabbat" data-id="samhain:intention"/);
  assert.equal(sabbatOn('2026-04-29'), null);
  assert.equal(sabbatOn('2026-04-30').key, 'beltane');

  state.ui.tab = 'home';
  state.days[THU].showFull = false;
  const home = viewHTML(state, THU, 10 * 60);
  assert.doesNotMatch(home, /focusflag/);
  assert.doesNotMatch(home, /data-id="h-main-clean"/);
  assert.doesNotMatch(home, /data-id="l-washer"/);
  assert.doesNotMatch(home, /Dishes and kitchen reset are the daily anchor/);
  assert.doesNotMatch(home, /Living areas \+ baking/);
  assert.match(home, /doesn’t count as a missed focus day/);

  state.ui.tab = 'plan';
  const plan = viewHTML(state, THU, 10 * 60);
  assert.doesNotMatch(plan, /Mark today’s cleaning focus noted/);
  assert.match(plan, /no cleaning focus to note/);
});

test('a Holiday in a schema 3 backup round-trips without moving XP or gold', () => {
  const state = freshState(THU);
  setDayType(state, THU, 'holiday');
  toggleListed(state, THU, 's-shower', true);
  toggleSpan(state, THU, 'sabbat', 'samhain:intention', true);
  const xp = totalXP(state);
  const gold = state.gold;
  const log = JSON.parse(JSON.stringify(state.xpLog));
  const again = importBackup(exportBackup(state, '2026-11-19T18:00:00.000Z'), { today: THU });
  assert.equal(again.mode, 'v3');
  assert.equal(again.state.schema, 3);
  assert.equal(again.state.days[THU].notes.dayType, 'holiday');
  assert.equal(again.state.days[THU].notes.kind, 'holiday');
  assert.equal(totalXP(again.state), xp);
  assert.equal(again.state.gold, gold);
  assert.deepEqual(again.state.xpLog, log);
  assert.equal(again.state.days[THU].checks['task:s-shower'], true);
});
