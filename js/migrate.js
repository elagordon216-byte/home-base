// Import v2 backups losslessly, and read or write schema 3.
// v2 export shape, from home-base-v2.html:
//   { app: 'home-base-quest-board', schema: 2, exportedAt, data: { ...db } }

import { clone, dateShift, isISO, num, todayIso } from './dates.js';
import { DEFAULT_LISTS, LEGACY_ADMIN, LIST_GROUPS } from './v2-data.js';
import { defaultBasketObjs, defaultLists, defaultProjects, defaultTodos, shell } from './defaults.js';
import { normalizeRooms } from './rooms.js';
import { freshQuests, normalizeQuests } from './quests.js';
import { defaultTracker } from './tracker.js';
import { levelIndex, totalXP } from './xp.js';
import { refresh } from './actions.js';

export const V2_APP = 'home-base-quest-board';
export const V3_APP = 'home-base';

export function freshState(today = todayIso()) {
  return normalize3(shell(today), today);
}

export function normalize3(raw, today) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const hadBaselines = !!src.wordBaselines;
  const hadRooms = !!src.rooms;
  const hadPen = Array.isArray(src.penNames);
  const hadQuests = !!src.quests;
  const hadNovel = !!src.morningNovel;
  const hadProfile = !!src.profile;
  const hadBadges = !!src.badges && typeof src.badges === 'object';
  const n = clone(src);

  n.baseline = num(n.baseline, 226);
  n.wallet = Math.max(0, num(n.wallet, 226));
  n.gold = Math.max(0, num(n.gold, 0));
  if (typeof n.reward !== 'string' || !n.reward) n.reward = 'Run #1 tickets';
  for (const k of ['xpLog', 'bonusLog', 'rewardLog', 'goldLog', 'goldInventory', 'todos', 'baskets', 'authorProjects', 'wordLog']) {
    if (!Array.isArray(n[k])) n[k] = [];
  }
  for (const k of ['days', 'levelRewardsClaimed', 'goldLedger', 'endOfDayLog']) {
    if (!n[k] || typeof n[k] !== 'object' || Array.isArray(n[k])) n[k] = {};
  }
  if (!n.ui || typeof n.ui !== 'object' || Array.isArray(n.ui)) n.ui = {};
  if (!n.ui.collapsed || typeof n.ui.collapsed !== 'object') n.ui.collapsed = {};
  if (!n.lists || typeof n.lists !== 'object' || Array.isArray(n.lists)) n.lists = defaultLists();
  for (const g of LIST_GROUPS) if (!Array.isArray(n.lists[g])) n.lists[g] = defaultLists()[g];
  for (const d of Object.values(n.days)) {
    if (!d || typeof d !== 'object') continue;
    if (!d.checks || typeof d.checks !== 'object') d.checks = {};
    if (!Array.isArray(d.custom)) d.custom = [];
    if (!d.notes || typeof d.notes !== 'object') d.notes = {};
  }
  if (!isISO(n.date)) n.date = today;
  if (!isISO(n.activeDate)) n.activeDate = today;
  n.rooms = hadRooms ? normalizeRooms(n.rooms) : normalizeRooms(null);
  if (!isISO(n.roomsSettledThrough)) n.roomsSettledThrough = dateShift(today, -1);
  n.quests = hadQuests ? normalizeQuests(n.quests) : freshQuests();
  if (!hadPen) n.penNames = defaultTracker();
  if (!hadNovel) n.morningNovel = { title: 'Sophomore Year', mode: 'editing' };
  if (!hadProfile || typeof n.profile !== 'object') n.profile = { name: 'Ela', className: 'Domestic Mage / Author' };
  if (!n.profile.name) n.profile.name = 'Ela';
  if (!n.profile.className) n.profile.className = 'Domestic Mage / Author';
  if (!hadBadges) n.badges = {};
  n.wordsAdded = Math.max(0, num(n.wordsAdded, 0));
  if (!hadBaselines || typeof n.wordBaselines !== 'object' || Array.isArray(n.wordBaselines)) n.wordBaselines = {};
  n.schema = 3;
  n.app = V3_APP;
  return n;
}

function fillWordBaselines(state) {
  for (const p of state.authorProjects || []) {
    if (p && p.wordCount !== '' && p.wordCount != null && Number.isFinite(Number(p.wordCount))) {
      const key = 'project:' + p.id;
      if (state.wordBaselines[key] == null) state.wordBaselines[key] = Number(p.wordCount);
    }
  }
}

export function upgradeFromV2(data, today) {
  const hadBaselines = !!(data && data.wordBaselines);
  const state = normalize3(data, today);
  if (!hadBaselines) {
    state.wordsAdded = 0;
    state.wordLog = [];
    state.wordBaselines = {};
    fillWordBaselines(state);
  }
  if (!(data && data.rooms)) {
    state.rooms = normalizeRooms(null);
    state.roomsSettledThrough = dateShift(today, -1);
  }
  state.importedFrom = data?.schema || 2;
  if (!state.upgrade) state.upgrade = { from: state.importedFrom, seen: false };
  return state;
}

function legacyKeyInfo(group, i) {
  if (group === 'admin') {
    const a = LEGACY_ADMIN[i];
    return a ? { key: 'todo:' + a[0], todo: a[0], label: a[1], xp: 1, gold: 1 } : null;
  }
  const l = DEFAULT_LISTS[group];
  if (!l || !l[i]) return null;
  return { key: 'task:' + l[i][0], label: l[i][1].replace('{priority}', 'Sophomore Year'), xp: l[i][2], gold: group === 'author' ? 2 : 1 };
}

function customId(date, i) { return 'c' + String(date).replace(/-/g, '') + '-' + i; }

/** Original app (`homebase-board`) and v2's one-day export, ported from v2's migrateLegacy. */
export function migrateLegacy(old, today = todayIso()) {
  if (!old || typeof old !== 'object') throw new Error('Not a Home Base data object');
  const n = {
    app: V2_APP,
    schema: 2,
    baseline: num(old.baseline, 226),
    wallet: 226,
    reward: old.reward ? String(old.reward) : 'Run #1 tickets',
    days: {},
    lists: defaultLists(),
    todos: defaultTodos(today),
    baskets: defaultBasketObjs(),
    xpLog: [],
    bonusLog: [],
    rewardLog: [],
    levelRewardsClaimed: {},
    authorProjects: defaultProjects(),
    gold: Math.max(0, num(old.gold, 0)),
    goldLedger: {},
    goldLog: [],
    goldInventory: [],
    endOfDayLog: {},
    date: isISO(old.date) ? old.date : today,
    activeDate: isISO(old.activeDate) ? old.activeDate : (isISO(old.date) ? old.date : today),
    lastBackup: null,
    backupSnooze: null,
    lastSeenLevel: 0,
    ui: { collapsed: {} },
    timer: null,
    migration: null,
  };
  const rep = { days: 0, checks: 0, taskXP: 0, bonusXP: 0 };
  const oldWallet = Math.max(0, num(old.wallet, 226));
  for (const k of ['rewardLog', 'bonusLog', 'goldLog', 'goldInventory']) if (Array.isArray(old[k])) n[k] = clone(old[k]);
  for (const k of ['levelRewardsClaimed', 'endOfDayLog']) if (old[k] && typeof old[k] === 'object') n[k] = clone(old[k]);
  if (Array.isArray(old.authorProjects)) n.authorProjects = clone(old.authorProjects);
  if (Array.isArray(old.baskets)) n.baskets = old.baskets.filter(b => b && b.id != null).map(b => ({ id: String(b.id), name: String(b.name || 'Basket') }));
  const todoById = Object.fromEntries(n.todos.map(t => [t.id, t]));
  const log = (date, key, amount, reason) => {
    n.xpLog.push({ date, key, amount, reason, kind: 'task', migrated: true });
    rep.checks++;
    rep.taskXP += amount;
  };
  const days = old.days && typeof old.days === 'object' ? old.days : {};
  let firstDate = null;
  for (const date of Object.keys(days).sort()) {
    if (!isISO(date)) continue;
    const od = days[date] || {};
    const nd = { checks: {}, custom: [], notes: clone(od.notes || {}) };
    rep.days++;
    if (!firstDate) firstDate = date;
    if (od.witchy && typeof od.witchy === 'object') {
      const w = nd.witchy = clone(od.witchy);
      const usedP = Object.keys(w.lunarChecks || {}).some(k => w.lunarChecks[k] && k.startsWith((w.moonPhase || 'new') + ':'));
      if (w.moonPhase && usedP) w.moonPhaseManual = true;
      else delete w.moonPhase;
      const usedS = Object.keys(w.sabbatChecks || {}).some(k => w.sabbatChecks[k] && k.startsWith((w.sabbatChoice || 'samhain') + ':'));
      if (w.sabbatChoice && usedS) w.sabbatManual = true;
      else delete w.sabbatChoice;
    }
    (Array.isArray(od.custom) ? od.custom : []).forEach((t, i) => nd.custom.push({ id: customId(date, i), label: String((t && t.label) || 'Task'), xp: num(t && t.xp, 1) || 1 }));
    for (const [k, v] of Object.entries(od.checks || {})) {
      if (!v) continue;
      let m;
      if ((m = /^(morning|home|laundry|admin|author|evening):(\d+)$/.exec(k))) {
        const info = legacyKeyInfo(m[1], +m[2]);
        if (!info) continue;
        nd.checks[info.key] = true;
        if (info.todo) {
          const t = todoById[info.todo];
          if (t && (!t.done || t.done < date)) t.done = date;
        }
        log(date, info.key, info.xp, info.label);
      } else if ((m = /^basket:(.+)$/.exec(k))) {
        let b = n.baskets.find(b => b.id === m[1]);
        if (!b) { b = { id: m[1], name: 'Removed basket', archived: true }; n.baskets.push(b); }
        nd.checks[k] = true;
        log(date, k, 2, 'Emptied laundry basket: ' + b.name);
      } else if ((m = /^custom:(\d+)$/.exec(k))) {
        const c = nd.custom[+m[1]];
        if (!c) continue;
        nd.checks['task:' + c.id] = true;
        log(date, 'task:' + c.id, c.xp, c.label);
      } else nd.checks[k] = true;
    }
    n.days[date] = nd;
  }
  if (firstDate) n.todos.forEach(t => { t.created = firstDate; });
  let bsum = 0;
  n.bonusLog.forEach((b, i) => {
    const a = num(b && b.amount, 0);
    if (a > 0) {
      bsum += a;
      n.xpLog.push({ date: isISO(b.date) ? b.date : n.date, key: 'bonus:legacy:' + i, amount: a, reason: String(b.reason || 'Bonus XP'), kind: 'bonus', migrated: true });
    }
  });
  const oldBonus = num(old.bonusXP, 0);
  if (oldBonus > bsum) n.xpLog.push({ date: n.date, key: 'bonus:legacy-adjust', amount: oldBonus - bsum, reason: 'Earlier bonus XP (from original app)', kind: 'bonus', migrated: true });
  rep.bonusXP = Math.max(oldBonus, bsum);
  n.wallet = oldWallet + rep.taskXP;
  rep.walletBefore = oldWallet;
  rep.walletCredit = rep.taskXP;
  for (const [date, keys] of Object.entries(old.goldLedger || {})) {
    const out = {};
    for (const [k, v] of Object.entries(keys || {})) {
      if (!v) continue;
      let nk = k;
      let amt = 1;
      let m;
      if ((m = /^task:(morning|home|laundry|admin|author|evening):(\d+)$/.exec(k))) {
        const info = legacyKeyInfo(m[1], +m[2]);
        if (!info) continue;
        nk = info.key;
        amt = info.gold;
      } else if ((m = /^custom:(\d+)$/.exec(k))) nk = 'task:' + customId(date, m[1]);
      else if (k.startsWith('basket:')) amt = 2;
      out[nk] = amt;
    }
    n.goldLedger[date] = out;
  }
  const od = (old.days || {})[old.date] || {};
  const oc = od.checks || {};
  rep.basketDouble = 2 * (old.baskets || []).filter(b => oc['basket:' + b.id]).length;
  rep.totalAfter = totalXP(n);
  rep.oldTotalDisplayed = rep.totalAfter + rep.basketDouble;
  n.lastSeenLevel = levelIndex(totalXP(n)) + 1;
  n.migration = Object.assign({ from: 'homebase-board', at: null, seen: false }, rep);
  return n;
}

export function detectBackup(obj) {
  if (!obj || typeof obj !== 'object') return 'unknown';
  if (obj.app === V3_APP && obj.schema === 3 && obj.data) return 'v3';
  if (obj.schema === 3 && obj.xpLog && obj.rooms && !obj.data) return 'v3';
  if (obj.app === V2_APP && obj.data) return 'v2';
  if (obj.schema === 2 && obj.data && obj.data.xpLog) return 'v2';
  if (obj.schema === 2 && Array.isArray(obj.xpLog)) return 'v2';
  if (obj.app === V2_APP && Array.isArray(obj.xpLog)) return 'v2';
  if (isISO(obj.date) && obj.day && typeof obj.day === 'object' && !obj.days) return 'partial';
  if (obj.days && typeof obj.days === 'object') return 'legacy';
  return 'unknown';
}

function v2Payload(obj) {
  if (obj.data && obj.data.xpLog) return obj.data;
  return obj;
}

export function exportBackup(state, exportedAt = new Date().toISOString()) {
  return { app: V3_APP, schema: 3, exportedAt, data: state };
}

export function importBackup(obj, opts = {}) {
  const today = opts.today || todayIso();
  const kind = detectBackup(obj);
  let state;
  let mode = kind;
  if (kind === 'v3') {
    const raw = obj.data && obj.schema === 3 ? obj.data : obj;
    state = normalize3(clone(raw), today);
  } else if (kind === 'v2') {
    state = upgradeFromV2(clone(v2Payload(obj)), today);
  } else if (kind === 'legacy') {
    state = upgradeFromV2(migrateLegacy(obj, today), today);
  } else if (kind === 'partial') {
    if (!opts.current) throw new Error('A one-day backup needs a Home Base that is already open.');
    state = mergePartial(clone(opts.current), obj, today);
    mode = 'partial';
  } else {
    throw new Error('This file doesn’t look like a Home Base backup.');
  }
  refresh(state, today);
  return { state, mode };
}

function mergePartial(current, obj, today) {
  const incoming = migrateLegacy({
    date: obj.date,
    activeDate: obj.date,
    baseline: obj.baseline,
    baskets: obj.baskets,
    gold: obj.gold,
    goldLedger: obj.goldLedger,
    goldLog: obj.goldLog,
    goldInventory: obj.goldInventory,
    days: { [obj.date]: obj.day },
    wallet: current.wallet,
  }, today);
  const date = obj.date;
  current.days[date] = incoming.days[date];
  current.xpLog = current.xpLog.filter(e => !(e.date === date && e.migrated)).concat(incoming.xpLog.filter(e => e.date === date && e.kind === 'task'));
  for (const b of incoming.baskets) {
    if (!current.baskets.some(x => x.id === b.id)) current.baskets.push(b);
  }
  current.baseline = incoming.baseline;
  current.gold = incoming.gold;
  current.goldLog = incoming.goldLog;
  current.goldInventory = incoming.goldInventory;
  Object.assign(current.goldLedger, incoming.goldLedger);
  current.migration = Object.assign({}, incoming.migration, { partial: true, seen: false });
  return normalize3(current, today);
}
