import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshState } from '../js/migrate.js';
import { toggleSpan } from '../js/actions.js';
import { dateShift } from '../js/dates.js';
import { moonPhaseFor, phaseWindow, sabbatWindow, sameSpan } from '../js/moon.js';
import { spanChecked } from '../js/witchy.js';
import { qualifiedBadges } from '../js/badges.js';
import { lunarPhaseData } from '../js/v2-data.js';
import { viewHTML } from '../js/views.js';

function samePhasePair() {
  let iso = '2026-11-01';
  for (let i = 0; i < 50; i++) {
    const next = dateShift(iso, 1);
    const a = phaseWindow(null, iso);
    const b = phaseWindow(null, next);
    if (sameSpan(a, b)) return [iso, next, a.phase];
    iso = next;
  }
  throw new Error('no two-day phase stretch');
}

test('a lunar check stays on through the phase, and the next phase starts clear', () => {
  const [day, next, phase] = samePhasePair();
  let after = dateShift(next, 1);
  for (let i = 0; i < 40 && sameSpan(phaseWindow(null, next), phaseWindow(null, after)); i++) {
    after = dateShift(after, 1);
  }
  assert.equal(sameSpan(phaseWindow(null, day), phaseWindow(null, next)), true);
  assert.equal(sameSpan(phaseWindow(null, next), phaseWindow(null, after)), false);
  const state = freshState(day);
  const key = phase + ':pause';
  const got = toggleSpan(state, day, 'lunar', key, true);
  assert.equal(got.gold, 1);
  assert.equal(got.xp, 0);
  assert.equal(spanChecked(state, next, 'lunar', key), true);
  assert.equal(toggleSpan(state, next, 'lunar', key, true).gold, 0);
  assert.equal(state.gold, 1);

  assert.equal(spanChecked(state, after, 'lunar', key), false);
  assert.equal(state.days[day].witchy.lunarChecks[key], true);
  assert.notEqual(moonPhaseFor(next).phase, moonPhaseFor(after).phase);
});

test('unchecking a lunar task clears the stretch, and only same-day gold comes back', () => {
  const [day, next, phase] = samePhasePair();
  const state = freshState(day);
  const key = phase + ':intention';
  toggleSpan(state, day, 'lunar', key, true);
  toggleSpan(state, next, 'lunar', key, false);
  assert.equal(state.gold, 1);
  assert.equal(spanChecked(state, day, 'lunar', key), false);
  assert.equal(spanChecked(state, next, 'lunar', key), false);
  assert.equal(state.xpLog.length, 0);

  const same = freshState(day);
  toggleSpan(same, day, 'lunar', key, true);
  toggleSpan(same, day, 'lunar', key, false);
  assert.equal(same.gold, 0);
  assert.equal(spanChecked(same, next, 'lunar', key), false);
});

test('a sabbat check lasts until the next sabbat', () => {
  const during = '2026-10-20';
  const still = '2026-11-01';
  const after = '2026-11-02';
  assert.equal(sameSpan(sabbatWindow(null, during), sabbatWindow(null, still)), true);
  assert.equal(sameSpan(sabbatWindow(null, still), sabbatWindow(null, after)), false);
  const state = freshState(during);
  const key = 'samhain:intention';
  toggleSpan(state, during, 'sabbat', key, true);
  assert.equal(spanChecked(state, still, 'sabbat', key), true);
  assert.equal(spanChecked(state, after, 'sabbat', key), false);
  assert.equal(state.gold, 1);
  toggleSpan(state, still, 'sabbat', key, false);
  assert.equal(spanChecked(state, during, 'sabbat', key), false);
  assert.equal(state.gold, 1);
});

test('a moon badge still needs every task on one day, and the board shows a carried check', () => {
  const [day, next, phase] = samePhasePair();
  const state = freshState(day);
  const tasks = (lunarPhaseData[phase] || lunarPhaseData.new).tasks;
  const keys = tasks.map(([id]) => phase + ':' + id);
  for (const key of keys.slice(0, -1)) toggleSpan(state, day, 'lunar', key, true);
  toggleSpan(state, next, 'lunar', keys[keys.length - 1], true);
  assert.equal(qualifiedBadges(state, next).some(b => b.id === 'moon:' + phase), false);
  toggleSpan(state, day, 'lunar', keys[keys.length - 1], true);
  assert.equal(qualifiedBadges(state, day).some(b => b.id === 'moon:' + phase), true);

  state.date = next;
  state.ui.tab = 'witchy';
  state.ui.witchy = 'lunar';
  const html = viewHTML(state, next, 8 * 60);
  assert.match(html, new RegExp('data-kind="lunar" data-id="' + keys[0] + '"'));
  assert.match(html, /class="task done"/);
  assert.match(html, /until the next phase/);
});
