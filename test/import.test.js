import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exportBackup, importBackup } from '../js/migrate.js';
import { totalXP, levelNumber } from '../js/xp.js';
import { DEFAULT_LISTS } from '../js/v2-data.js';
import { lunarPhaseData } from '../js/v2-data.js';

const TODAY = '2026-11-19';

function v2Backup() {
  const lunar = {};
  for (const [id] of lunarPhaseData.new.tasks) lunar['new:' + id] = true;
  const data = {
    app: 'home-base-quest-board',
    schema: 2,
    baseline: 226,
    wallet: 410,
    reward: 'Run #1 tickets',
    kept: { note: 'extra field stays' },
    days: {
      '2026-11-16': { checks: { 'task:m-dressed': true }, custom: [], notes: { kind: 'normal', energy: 'medium' }, focusMs: 2 * 3600000 },
      '2026-11-17': { checks: { 'task:h-dishes': true }, custom: [], notes: { kind: 'tuesday' } },
      '2026-11-18': {
        checks: { 'task:a-open': true, 'basket:basket0': true },
        custom: [{ id: 'c1', label: 'Pack lunches', xp: 1 }],
        notes: { kind: 'normal', energy: 'high', author: 'Stopped at chapter 12' },
        witchy: { checks: { ground: true }, lunarChecks: lunar, sabbatChecks: {}, astro: 'A quiet moon.', moonPhase: 'new', moonPhaseManual: true },
        focusMs: 0,
      },
    },
    lists: {
      morning: DEFAULT_LISTS.morning.map(([id, label, xp]) => ({ id, label, xp })),
      home: DEFAULT_LISTS.home.map(([id, label, xp]) => ({ id, label: id === 'h-dishes' ? 'Dishes, renamed' : label, xp })),
      laundry: DEFAULT_LISTS.laundry.map(([id, label, xp]) => ({ id, label, xp })),
      author: DEFAULT_LISTS.author.map(([id, label, xp]) => ({ id, label, xp })),
      evening: DEFAULT_LISTS.evening.map(([id, label, xp]) => ({ id, label, xp })),
    },
    todos: [{ id: 't-gp', label: 'Call GP / handle GP appointment', xp: 1, created: '2026-10-01', done: '2026-11-01' }],
    baskets: [
      { id: 'basket0', name: 'My basket' },
      { id: 'basket1', name: 'Husband’s basket' },
      { id: 'basket2', name: 'Older child’s basket' },
      { id: 'basket3', name: 'Baby’s basket' },
      { id: 'basket4', name: 'Towels / blankets / bedding' },
    ],
    xpLog: [
      { date: '2026-11-16', key: 'task:m-dressed', amount: 1, reason: 'Get myself dressed and ready', kind: 'task', at: 100 },
      { date: '2026-11-17', key: 'task:h-dishes', amount: 1, reason: 'Dishes and kitchen reset', kind: 'task', at: 101 },
      { date: '2026-11-18', key: 'task:a-open', amount: 2, reason: 'Open Sophomore Year and begin', kind: 'task', at: 102 },
      { date: '2026-11-18', key: 'basket:basket0', amount: 2, reason: 'Laundry basket emptied: My basket', kind: 'task', at: 103 },
      { date: '2026-11-18', key: 'badday-protocol', amount: 10, reason: 'Bad-Day Protocol — survival counts', kind: 'badday', at: 104 },
    ],
    bonusLog: [{ date: '2026-11-18', amount: 10, reason: 'Bad-Day Protocol — survival counts' }],
    rewardLog: [{ name: 'Tiny reward', cost: 10, date: '2026-11-10' }],
    levelRewardsClaimed: { 2: '2026-11-01' },
    authorProjects: [
      { id: 'project-sophomore-year', name: 'Sophomore Year', stage: 'Revision', priority: true, wordCount: 12000 },
      { id: 'project-other', name: 'Side story', stage: 'Drafting', wordCount: 500 },
    ],
    gold: 30,
    goldLedger: { '2026-11-18': { 'task:a-open': 2, 'basket:basket0': 2 } },
    goldLog: [
      { amount: 2, description: 'Open Sophomore Year and begin', date: '2026-11-18', key: 'task:a-open' },
      { amount: 2, description: 'Laundry basket emptied: My basket', date: '2026-11-18', key: 'basket:basket0' },
      { amount: -12, description: 'Bought Samhain Window Candle', date: '2026-11-02', key: 'buy:samhain-candle' },
    ],
    goldInventory: [{ id: 'samhain-candle', name: 'Samhain Window Candle', season: 'Samhain', date: '2026-11-02' }],
    endOfDayLog: {
      '2026-11-16': { date: '2026-11-16', finalized: true, taskXP: 1, completedCount: 1 },
    },
    date: TODAY,
    activeDate: TODAY,
    lastBackup: '2026-11-18T18:00:00.000Z',
    backupSnooze: null,
    lastSeenLevel: 2,
    ui: { collapsed: { 'dailyView:Kitchen': true }, tab: 'dailyView' },
    timer: null,
    migration: null,
  };
  return {
    app: 'home-base-quest-board',
    schema: 2,
    exportedAt: '2026-11-18T18:00:00.000Z',
    data,
  };
}

test('built-in task XP matches v2', () => {
  const xp = Object.fromEntries(Object.values(DEFAULT_LISTS).flat().map(([id, , amount]) => [id, amount]));
  assert.equal(xp['m-dressed'], 1);
  assert.equal(xp['h-dishes'], 1);
  assert.equal(xp['h-main-clean'], 1);
  assert.equal(xp['l-empty-basket'], 2);
  assert.equal(xp['a-open'], 2);
  assert.equal(xp['a-10'], 2);
  assert.equal(xp['a-25'], 2);
  assert.equal(xp['a-another'], 2);
  assert.equal(xp['a-save'], 1);
  assert.equal(xp['e-bedtime'], 1);
});

test('v2 backup imports losslessly and round-trips through schema 3', () => {
  const file = v2Backup();
  const beforeLog = JSON.parse(JSON.stringify(file.data.xpLog));
  const beforeWallet = file.data.wallet;
  const beforeGold = file.data.gold;
  const beforeInventory = JSON.parse(JSON.stringify(file.data.goldInventory));
  const expectedTotal = file.data.baseline + beforeLog.reduce((a, e) => a + e.amount, 0);

  const { state, mode } = importBackup(file, { today: TODAY });
  assert.equal(mode, 'v2');
  assert.equal(state.schema, 3);
  assert.deepEqual(state.xpLog, beforeLog);
  assert.equal(state.wallet, beforeWallet);
  assert.equal(totalXP(state), expectedTotal);
  assert.equal(levelNumber(totalXP(state)), levelNumber(expectedTotal));
  assert.deepEqual(state.goldInventory, beforeInventory);
  assert.equal(state.gold, beforeGold + state.upgrade.goldAdded);
  assert.ok(state.upgrade.goldAdded > 0);
  assert.equal(state.kept.note, 'extra field stays');
  assert.equal(state.lists.home.find(t => t.id === 'h-dishes').label, 'Dishes, renamed');
  assert.equal(state.lists.home.find(t => t.id === 'h-dishes').xp, 1);
  assert.equal(state.days['2026-11-18'].notes.author, 'Stopped at chapter 12');
  assert.equal(state.days['2026-11-18'].checks['basket:basket0'], true);
  assert.equal(state.rewardLog[0].name, 'Tiny reward');
  assert.equal(state.levelRewardsClaimed[2], '2026-11-01');
  assert.equal(state.endOfDayLog['2026-11-16'].taskXP, 1);
  assert.equal(state.authorProjects[0].wordCount, 12000);
  assert.equal(state.wordsAdded, 0);
  assert.equal(state.wordBaselines['project:project-sophomore-year'], 12000);
  assert.equal(state.todos[0].done, '2026-11-01');
  assert.equal(state.goldLedger['2026-11-18']['basket:basket0'], 2);
  for (const room of Object.values(state.rooms)) assert.equal(room.level, 1);

  assert.ok(state.badges['streak-3']);
  assert.ok(state.badges['focus-1h']);
  assert.ok(state.badges['moon:new']);
  assert.ok(state.badges['badday-survivor']);
  assert.equal(state.badges['streak-5'], undefined);
  assert.equal(state.badges['words-1000'], undefined);
  assert.equal(state.badges['focus-5h'], undefined);

  const exported = exportBackup(state, '2026-11-19T15:00:00.000Z');
  assert.equal(exported.app, 'home-base');
  assert.equal(exported.schema, 3);
  const again = importBackup(JSON.parse(JSON.stringify(exported)), { today: TODAY });
  assert.equal(again.mode, 'v3');
  assert.deepEqual(again.state, state);
});

test('original-app data migrates without dropping the checked task', () => {
  const old = {
    baseline: 226,
    wallet: 226,
    bonusXP: 0,
    date: '2026-11-01',
    activeDate: '2026-11-01',
    days: { '2026-11-01': { checks: { 'morning:0': true }, notes: {}, custom: [] } },
    baskets: [],
  };
  const { state, mode } = importBackup(old, { today: TODAY });
  assert.equal(mode, 'legacy');
  assert.equal(state.days['2026-11-01'].checks['task:m-dressed'], true);
  assert.equal(state.xpLog.find(e => e.key === 'task:m-dressed').amount, 1);
  assert.equal(state.wallet, 227);
  assert.equal(totalXP(state), 227);
});
