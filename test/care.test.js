import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freshState } from '../js/migrate.js';
import { toggleListed } from '../js/actions.js';
import { totalXP } from '../js/xp.js';
import { statsOf } from '../js/stats.js';
import { viewHTML } from '../js/views.js';
import { DEFAULT_LISTS } from '../js/v2-data.js';

const TODAY = '2026-11-19';

test('self-care rows use the ordinary checklist 1 XP and 1 gold', () => {
  const rows = DEFAULT_LISTS.self;
  assert.deepEqual(rows.map(([id]) => id), ['s-shower', 's-teeth', 's-hair', 's-face', 's-deodorant', 's-skin']);
  for (const [, , xp] of rows) assert.equal(xp, 1);

  const state = freshState(TODAY);
  const start = totalXP(state);
  const shower = toggleListed(state, TODAY, 's-shower', true);
  assert.equal(shower.xp, 1);
  assert.equal(shower.gold, 1);
  const teeth = toggleListed(state, TODAY, 's-teeth', true);
  assert.equal(teeth.xp, 1);
  assert.equal(teeth.gold, 1);
  assert.equal(statsOf(state).spiritXP, 2);
  assert.equal(totalXP(state) - start, 2);

  toggleListed(state, TODAY, 's-shower', false);
  toggleListed(state, TODAY, 's-teeth', false);
  assert.equal(totalXP(state), start);
  assert.equal(state.gold, 0);
  assert.equal(state.rooms.bath.level, 1);

  state.ui.tab = 'today';
  const html = viewHTML(state, TODAY, 8 * 60);
  for (const label of ['Shower', 'Brush teeth', 'Brush hair', 'Wash face', 'Deodorant', 'Skincare or moisturizer']) {
    assert.match(html, new RegExp(label));
  }
});
