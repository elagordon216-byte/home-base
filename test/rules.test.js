import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshState } from '../js/migrate.js';
import {
  awardHyperfocusManual, refresh, setDayType, setProjectWords, toggleEssential, toggleMorningNovel,
} from '../js/actions.js';
import { statsOf } from '../js/stats.js';
import { totalXP } from '../js/xp.js';
import { BADDAY_ITEMS } from '../js/v2-data.js';

const TODAY = '2026-11-19';
const TUE = '2026-11-17';
const SUN = '2026-11-15';

test('morning novel is +3 and still pays on Tuesday and Sunday', () => {
  const state = freshState(TODAY);
  for (const date of [TODAY, TUE, SUN]) {
    const got = toggleMorningNovel(state, date, true);
    assert.equal(got.xp, 3);
    assert.equal(got.gold, 2);
  }
  assert.equal(state.xpLog.filter(e => e.key === 'task:morning-novel').length, 3);
});

test('hyperfocus pays +10 once and reverses the same day if it was automatic', () => {
  const state = freshState(TODAY);
  const start = totalXP(state);
  setDayType(state, TODAY, 'hyperfocus');
  assert.equal(totalXP(state) - start, 10);
  setDayType(state, TODAY, 'weekday');
  assert.equal(totalXP(state), start);
  awardHyperfocusManual(state, TODAY);
  setDayType(state, TODAY, 'weekday');
  assert.equal(totalXP(state) - start, 10);
  setDayType(state, TODAY, 'hyperfocus');
  assert.equal(state.xpLog.filter(e => e.key === 'hyperfocus').length, 1);
});

test('four essentials pay +10 once, and word-count badges count only increases after the first number', () => {
  const state = freshState(TODAY);
  const start = totalXP(state);
  for (const [id] of BADDAY_ITEMS) toggleEssential(state, TODAY, id, true);
  assert.equal(totalXP(state) - start, 10);
  toggleEssential(state, TODAY, 'bd-self', false);
  assert.equal(totalXP(state), start);

  assert.equal(setProjectWords(state, 'project-sophomore-year', 40000, TODAY), 0);
  assert.equal(state.wordsAdded, 0);
  assert.equal(setProjectWords(state, 'project-sophomore-year', 41000, TODAY), 1000);
  assert.equal(state.wordsAdded, 1000);
  setProjectWords(state, 'project-sophomore-year', 39000, TODAY);
  assert.equal(state.wordsAdded, 1000);
  refresh(state, TODAY);
  assert.ok(state.badges['words-1000']);
  assert.equal(state.badges['words-5000'], undefined);
  assert.equal(state.goldLog.some(g => g.key === 'badge:words-1000' && g.amount === 5), true);
});

test('stats are a display: Hearth, Craft, and Spirit do not change the XP total', () => {
  const state = freshState(TODAY);
  const before = totalXP(state);
  state.xpLog.push(
    { date: TODAY, key: 'task:h-dishes', amount: 1, reason: 'dishes', kind: 'task' },
    { date: TODAY, key: 'task:a-open', amount: 2, reason: 'open', kind: 'task' },
    { date: TODAY, key: 'ef:help:1', amount: 2, reason: 'Asked for help', kind: 'bonus' },
    { date: TODAY, key: 'streak:3', amount: 10, reason: 'streak', kind: 'streak' },
  );
  state.days[TODAY] = { checks: {}, custom: [], notes: {}, witchy: { checks: { ground: true, card: true }, lunarChecks: {}, sabbatChecks: {} } };
  const stats = statsOf(state);
  assert.equal(stats.hearth, 1);
  assert.equal(stats.craft, 2);
  assert.equal(stats.spiritXP, 2);
  assert.equal(stats.practices, 2);
  assert.equal(stats.spirit, 4);
  assert.equal(totalXP(state), before + 15);
});
