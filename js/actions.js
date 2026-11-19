// Checklists, bonuses, timer, and the small new XP rules (focus +1, morning novel +3, hyperfocus +10).

import { dateShift, isISO, weekday } from './dates.js';
import { autoDayType, dayTypeOf, essentialsOn, noWriting } from './days.js';
import { BADDAY_ITEMS, TIMER_MILESTONES } from './v2-data.js';
import { awardGold, awardXP, maybeStreak, reverseGold, reverseXP, xpEntry } from './xp.js';
import { focusRoomIds, MAIN_CLEAN } from './rooms.js';
import { catchUpRooms } from './rooms.js';
import { setQuestStep, syncQuest } from './quests.js';
import { syncBadges } from './badges.js';
import { snapshotFor } from './snapshot.js';
import { blankDay } from './defaults.js';
import { priorityProject, tpl } from './labels.js';

export function ensureDay(state, date) {
  if (!state.days[date]) state.days[date] = blankDay();
  const d = state.days[date];
  if (!d.checks) d.checks = {};
  if (!d.custom) d.custom = [];
  if (!d.notes) d.notes = {};
  return d;
}

function afterGain(state, date, xp) {
  if (xp > 0) return xp + maybeStreak(state, date);
  return xp;
}

export function findListed(state, id) {
  for (const g of Object.keys(state.lists || {})) {
    const t = (state.lists[g] || []).find(t => t.id === id);
    if (t) return { task: t, group: g };
  }
  return null;
}

function goldForTask(group, id) {
  if (group === 'author' || id === 'morning-novel') return 2;
  return 1;
}

export function toggleListed(state, date, id, checked) {
  const found = findListed(state, id);
  if (!found || found.task.archived) return { xp: 0, gold: 0 };
  const { task, group } = found;
  const key = 'task:' + id;
  const label = tpl(state, task.label);
  const day = ensureDay(state, date);
  let xp = 0;
  let gold = 0;
  if (checked) {
    day.checks[key] = true;
    xp += awardXP(state, date, key, task.xp, label, 'task');
    gold += awardGold(state, date, key, goldForTask(group, id), label);
    if (id === MAIN_CLEAN && focusRoomIds(weekday(date)).length) {
      xp += awardXP(state, date, 'focus-bonus', 1, 'Weekday cleaning focus bonus', 'bonus');
    }
  } else {
    delete day.checks[key];
    xp -= reverseXP(state, date, key);
    gold -= reverseGold(state, date, key, label);
    if (id === MAIN_CLEAN) xp -= reverseXP(state, date, 'focus-bonus');
  }
  xp = afterGain(state, date, xp);
  return { xp, gold };
}

export function toggleMorningNovel(state, date, checked) {
  const key = 'task:morning-novel';
  const title = state.morningNovel?.title || 'your novel';
  const label = 'Morning novel: ' + title;
  const day = ensureDay(state, date);
  let xp = 0;
  let gold = 0;
  if (checked) {
    day.checks[key] = true;
    xp += awardXP(state, date, key, 3, label, 'task');
    gold += awardGold(state, date, key, 2, label);
  } else {
    delete day.checks[key];
    xp -= reverseXP(state, date, key);
    gold -= reverseGold(state, date, key, label);
  }
  return { xp: afterGain(state, date, xp), gold };
}

export function toggleBasket(state, date, id, checked) {
  const basket = (state.baskets || []).find(b => b.id === id);
  if (!basket) return { xp: 0, gold: 0 };
  const key = 'basket:' + id;
  const label = 'Laundry basket emptied: ' + basket.name;
  const day = ensureDay(state, date);
  let xp = 0;
  let gold = 0;
  if (checked) {
    day.checks[key] = true;
    xp += awardXP(state, date, key, 2, label, 'task');
    gold += awardGold(state, date, key, 2, label);
  } else {
    delete day.checks[key];
    xp -= reverseXP(state, date, key);
    gold -= reverseGold(state, date, key, label);
  }
  const questXP = syncQuest(state, date);
  return { xp: afterGain(state, date, xp) + questXP, gold };
}

export function toggleCustom(state, date, id, checked) {
  const day = ensureDay(state, date);
  const item = day.custom.find(c => c.id === id);
  if (!item || item.removed) return { xp: 0, gold: 0 };
  const key = 'task:' + id;
  const xpVal = item.xp || 1;
  let xp = 0;
  let gold = 0;
  if (checked) {
    day.checks[key] = true;
    xp += awardXP(state, date, key, xpVal, item.label, 'task');
    gold += awardGold(state, date, key, 1, item.label);
  } else {
    delete day.checks[key];
    xp -= reverseXP(state, date, key);
    gold -= reverseGold(state, date, key, item.label);
  }
  return { xp: afterGain(state, date, xp), gold };
}

export function toggleTodo(state, date, id, checked) {
  const todo = (state.todos || []).find(t => t.id === id);
  if (!todo) return { xp: 0, gold: 0 };
  const key = 'todo:' + id;
  const day = ensureDay(state, date);
  let xp = 0;
  let gold = 0;
  if (checked) {
    todo.done = date;
    day.checks[key] = true;
    xp += awardXP(state, date, key, todo.xp || 1, todo.label, 'task');
    gold += awardGold(state, date, key, 1, todo.label);
  } else {
    if (todo.done === date) todo.done = null;
    delete day.checks[key];
    xp -= reverseXP(state, date, key);
    gold -= reverseGold(state, date, key, todo.label);
  }
  return { xp: afterGain(state, date, xp), gold };
}

export function toggleEssential(state, date, id, checked) {
  const known = BADDAY_ITEMS.find(b => b[0] === id);
  if (!known) return { xp: 0, gold: 0 };
  const key = 'bad:' + id;
  const label = 'Essentials: ' + known[1];
  const day = ensureDay(state, date);
  let xp = 0;
  let gold = 0;
  if (checked) {
    day.checks[key] = true;
    gold += awardGold(state, date, key, 1, label);
  } else {
    delete day.checks[key];
    gold -= reverseGold(state, date, key, label);
  }
  const all = BADDAY_ITEMS.every(([bid]) => day.checks['bad:' + bid]);
  if (all) xp += awardXP(state, date, 'badday-protocol', 10, 'Bad-Day Protocol — survival counts', 'badday');
  else xp -= reverseXP(state, date, 'badday-protocol');
  return { xp: afterGain(state, date, xp), gold };
}

export function toggleWitch(state, date, field, itemKey, goldKey, desc, checked) {
  const day = ensureDay(state, date);
  day.witchy = day.witchy || { checks: {}, lunarChecks: {}, sabbatChecks: {}, astro: '' };
  const bag = day.witchy[field] || (day.witchy[field] = {});
  let gold = 0;
  if (checked) {
    bag[itemKey] = true;
    gold += awardGold(state, date, goldKey, 1, desc);
  } else {
    delete bag[itemKey];
    gold -= reverseGold(state, date, goldKey, desc);
  }
  return { xp: 0, gold };
}

export function setDayType(state, date, type) {
  const day = ensureDay(state, date);
  const auto = autoDayType(date);
  if (type === auto) {
    delete day.notes.dayType;
    delete day.notes.kind;
  } else {
    day.notes.dayType = type;
    const kindMap = { weekday: 'normal', break: 'fallbreak', sick: 'sick', hyperfocus: 'hyperfocus' };
    day.notes.kind = kindMap[type] || type;
  }
  return syncHyperfocus(state, date);
}

export function setEnergy(state, date, energy) {
  ensureDay(state, date).notes.energy = energy;
}

export function syncHyperfocus(state, date) {
  const day = ensureDay(state, date);
  const type = dayTypeOf(day.notes, date);
  if (type === 'hyperfocus') {
    if (xpEntry(state, date, 'hyperfocus')) return 0;
    day.hyperfocusSource = 'auto';
    const xp = awardXP(state, date, 'hyperfocus', 10, 'Hyperfocus achievement', 'bonus');
    return afterGain(state, date, xp);
  }
  if (day.hyperfocusSource === 'auto') {
    const back = reverseXP(state, date, 'hyperfocus');
    if (back) delete day.hyperfocusSource;
    return -back;
  }
  return 0;
}

export function awardHyperfocusManual(state, date) {
  if (xpEntry(state, date, 'hyperfocus')) return 0;
  const day = ensureDay(state, date);
  day.hyperfocusSource = 'manual';
  const xp = awardXP(state, date, 'hyperfocus', 10, 'Hyperfocus achievement', 'bonus');
  return afterGain(state, date, xp);
}

export function addBonus(state, date, amount, reason) {
  amount = Math.max(0, Math.floor(Number(amount) || 0));
  if (!amount) return 0;
  const xp = awardXP(state, date, 'bonus:' + Date.now() + ':' + Math.random().toString(36).slice(2, 6), amount, reason || 'Bonus XP', 'bonus');
  return afterGain(state, date, xp);
}

export function quickWin(state, date, id, label, amount) {
  const xp = awardXP(state, date, 'ef:' + id + ':' + Date.now(), amount, label, 'bonus');
  return afterGain(state, date, xp);
}

export function manualStreak(state, date, len, amount) {
  if (xpEntry(state, date, 'streak:' + len)) return 0;
  const xp = awardXP(state, date, 'streak:' + len, amount, len + '-day combo bonus', 'streak');
  return xp;
}

export function manualBadDay(state, date) {
  if (xpEntry(state, date, 'badday-protocol')) return 0;
  const xp = awardXP(state, date, 'badday-protocol', 10, 'Bad-Day Protocol — survival counts', 'badday');
  return afterGain(state, date, xp);
}

export function setProjectWords(state, projectId, raw, date) {
  const project = (state.authorProjects || []).find(p => p.id === projectId);
  if (!project) return 0;
  if (raw === '' || raw == null) {
    project.wordCount = '';
    return 0;
  }
  const count = Math.max(0, Math.floor(Number(raw) || 0));
  project.wordCount = count;
  return addWordDelta(state, 'project:' + projectId, count, date);
}

export function setItemWords(state, itemId, raw, date) {
  const count = Math.max(0, Math.floor(Number(raw) || 0));
  return addWordDelta(state, 'item:' + itemId, count, date);
}

function addWordDelta(state, key, count, date) {
  if (!state.wordBaselines) state.wordBaselines = {};
  if (!state.wordLog) state.wordLog = [];
  const prev = state.wordBaselines[key];
  if (prev == null || prev === '') {
    state.wordBaselines[key] = count;
    return 0;
  }
  if (count > Number(prev)) {
    const delta = count - Number(prev);
    state.wordBaselines[key] = count;
    state.wordsAdded = (Number(state.wordsAdded) || 0) + delta;
    state.wordLog.push({ key, delta, date });
    return delta;
  }
  return 0;
}

export function addFocusMs(state, date, ms) {
  if (!ms || ms < 0) return 0;
  const day = ensureDay(state, date);
  const before = Math.floor((day.focusMs || 0) / 60000);
  day.focusMs = (day.focusMs || 0) + ms;
  const after = Math.floor(day.focusMs / 60000);
  let gained = 0;
  if (after !== before) {
    for (const m of TIMER_MILESTONES) {
      if (after >= m) gained += awardXP(state, date, 'author-time:' + m, 2, 'Author focus: ' + m + ' minutes', 'timer');
    }
  }
  if (gained) gained += maybeStreak(state, date);
  return gained;
}

export function clockIn(state, date, minutes, now) {
  const xp = awardXP(state, date, 'author-time:open', 2, 'Clocked in — opened the manuscript', 'timer');
  const streak = xp ? maybeStreak(state, date) : 0;
  state.timer = {
    date,
    minutes,
    running: true,
    endAt: now + minutes * 60000,
    lastTick: now,
    startedAt: now,
  };
  return xp + streak;
}

export function timerTick(state, now) {
  const T = state.timer;
  if (!T || !T.running) return 0;
  const upto = Math.min(now, T.endAt);
  const delta = upto - T.lastTick;
  let gained = 0;
  if (delta > 0) {
    gained = addFocusMs(state, T.date, delta);
    T.lastTick = upto;
  }
  if (now >= T.endAt) state.timer = null;
  return gained;
}

export function timerPause(state, now) {
  const T = state.timer;
  if (!T) return;
  if (T.running) {
    timerTick(state, now);
    if (!state.timer) return;
    state.timer.remaining = Math.max(0, state.timer.endAt - now);
    state.timer.running = false;
  } else {
    state.timer.endAt = now + (state.timer.remaining || 0);
    state.timer.lastTick = now;
    state.timer.running = true;
    delete state.timer.remaining;
  }
}

export function timerStop(state, now) {
  if (!state.timer) return;
  timerTick(state, now);
  state.timer = null;
}

export function claimShop(state, cost, name, date) {
  cost = Number(cost);
  if (state.wallet < cost) return { error: 'Not enough unspent XP yet. Keep earning at your own pace — nothing is lost.' };
  state.wallet -= cost;
  state.rewardLog.push({ name, cost, date });
  return { ok: true };
}

export const MYSTERY_OUTCOMES = [
  'A tiny treat',
  'Cozy hobby time',
  'A special drink or snack',
  '20 minutes of guilt-free rest',
  'A craft/writing accessory from supplies you already own',
  'Choose-your-own reward token',
];

export function openMystery(state, date, roll = Math.random()) {
  if (state.wallet < 50) return { error: 'The mystery box costs 50 unspent XP. No rush.' };
  const outcome = MYSTERY_OUTCOMES[Math.min(MYSTERY_OUTCOMES.length - 1, Math.floor(roll * MYSTERY_OUTCOMES.length))];
  state.wallet -= 50;
  state.rewardLog.push({ name: 'Mystery box: ' + outcome, cost: 50, date });
  return { ok: true, outcome };
}

export function claimLevelReward(state, reward, date, total) {
  if (total < reward.xp || state.levelRewardsClaimed[reward.level]) return { error: 'Not available.' };
  state.levelRewardsClaimed[reward.level] = date;
  state.rewardLog.push({ name: 'Level ' + reward.level + ': ' + reward.name, cost: 0, date, levelReward: true });
  return { ok: true };
}

export function buyGoldItem(state, item, date) {
  if (state.goldInventory.some(x => x.id === item.id)) return { error: 'Already owned.' };
  if (state.gold < item.cost) return { error: 'Not enough Hearthgold yet.' };
  state.gold -= item.cost;
  state.goldInventory.push({ id: item.id, name: item.name, season: item.season, date });
  state.goldLog.push({ amount: -item.cost, description: 'Bought ' + item.name, date, key: 'buy:' + item.id });
  return { ok: true };
}

export function clearToday(state, date) {
  const day = ensureDay(state, date);
  let xp = 0;
  let gold = 0;
  for (const key of Object.keys(day.checks)) {
    if (/^(task|basket|todo|bad):/.test(key)) {
      xp += reverseXP(state, date, key);
      gold += reverseGold(state, date, key, key);
      delete day.checks[key];
    }
  }
  xp += reverseXP(state, date, 'badday-protocol');
  xp += reverseXP(state, date, 'focus-bonus');
  for (const t of state.todos || []) if (t.done === date) t.done = null;
  syncQuest(state, date);
  return { xp, gold };
}

export function rollover(state, today) {
  if (!state.activeDate || !isISO(state.activeDate) || state.activeDate >= today) return false;
  let cursor = dateShift(state.activeDate, 1);
  while (cursor < today) {
    if (state.days[cursor] && !state.endOfDayLog[cursor]) state.endOfDayLog[cursor] = snapshotFor(state, cursor, true);
    cursor = dateShift(cursor, 1);
  }
  if (state.days[state.activeDate] && !state.endOfDayLog[state.activeDate]) {
    state.endOfDayLog[state.activeDate] = snapshotFor(state, state.activeDate, true);
  }
  if (state.date === state.activeDate) state.date = today;
  state.activeDate = today;
  return true;
}

export function refresh(state, today) {
  rollover(state, today);
  const roomEvents = catchUpRooms(state, today);
  syncQuest(state, today);
  const newBadges = syncBadges(state, today);
  if (state.upgrade && !state.upgrade.reported) {
    state.upgrade.reported = true;
    state.upgrade.newBadges = newBadges.map(b => b.id);
    state.upgrade.goldAdded = newBadges.length * 5;
  }
  return { roomEvents, newBadges };
}

export function markQuest(state, flag, on, today) {
  return setQuestStep(state, flag, on, today);
}

export { essentialsOn, noWriting, priorityProject };
