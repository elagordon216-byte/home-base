import { LIST_GROUPS, DEFAULT_LISTS, LEGACY_ADMIN, defaultBaskets } from './v2-data.js';
import { initialRooms } from './rooms.js';
import { freshQuests } from './quests.js';
import { defaultTracker } from './tracker.js';
import { dateShift } from './dates.js';

export function defaultLists() {
  const o = {};
  for (const g of LIST_GROUPS) o[g] = DEFAULT_LISTS[g].map(([id, label, xp]) => ({ id, label, xp }));
  return o;
}

export function defaultBasketObjs() {
  return defaultBaskets.map((name, i) => ({ id: 'basket' + i, name }));
}

export function defaultProjects() {
  return [{ id: 'project-sophomore-year', name: 'Sophomore Year', stage: 'Revision', priority: true }];
}

export function defaultTodos(today) {
  return LEGACY_ADMIN.map(([id, label]) => ({ id, label, xp: 1, created: today, done: null }));
}

export function blankDay() {
  return { checks: {}, custom: [], notes: {} };
}

export function shell(today) {
  return {
    app: 'home-base',
    schema: 3,
    baseline: 226,
    wallet: 226,
    reward: 'Run #1 tickets',
    days: {},
    lists: defaultLists(),
    todos: defaultTodos(today),
    baskets: defaultBasketObjs(),
    xpLog: [],
    bonusLog: [],
    rewardLog: [],
    levelRewardsClaimed: {},
    authorProjects: defaultProjects(),
    gold: 0,
    goldLedger: {},
    goldLog: [],
    goldInventory: [],
    endOfDayLog: {},
    date: today,
    activeDate: today,
    lastBackup: null,
    backupSnooze: null,
    lastSeenLevel: 0,
    ui: { collapsed: {}, tab: 'home' },
    timer: null,
    migration: null,
    rooms: initialRooms(),
    roomsSettledThrough: dateShift(today, -1),
    quests: freshQuests(),
    badges: {},
    penNames: defaultTracker(),
    profile: { name: 'Ela', className: 'Domestic Mage / Author' },
    morningNovel: { title: 'Sophomore Year', mode: 'editing' },
    wordsAdded: 0,
    wordBaselines: {},
    wordLog: [],
  };
}
