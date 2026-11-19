// Weekly quest (D13–D17). One at a time. +5 halfway and +5 when done. Boss battles are not built.

import { dateShift, weekStart } from './dates.js';
import { awardXP, maybeStreak, reverseXP } from './xp.js';

export function freshQuests() {
  return {
    catalog: [
      {
        id: 'laundry-mountain',
        name: 'Laundry Mountain',
        detail: 'Done when every basket is folded and fully put away.',
        kind: 'laundry-mountain',
      },
      {
        id: 'cleanse-base',
        name: 'Cleanse Base',
        detail: 'Done when everything the sick kids touched is washed or sanitized.',
        kind: 'cleanse-base',
      },
    ],
    active: null,
    history: [],
  };
}

export function normalizeQuests(q) {
  const base = freshQuests();
  if (!q || typeof q !== 'object') return base;
  const catalog = Array.isArray(q.catalog) ? q.catalog.map(item => ({ ...item })) : [];
  for (const starter of [...base.catalog].reverse()) {
    if (!catalog.some(c => c.id === starter.id)) catalog.unshift({ ...starter });
  }
  return {
    catalog,
    active: q.active || null,
    history: Array.isArray(q.history) ? q.history : [],
  };
}

export function isCarried(quest, today) {
  return !!(quest && !quest.doneOn && weekStart(today) > weekStart(quest.startedOn));
}

export function canPick(state, today) {
  const a = state.quests?.active;
  if (!a) return true;
  return !!a.doneOn;
}

function activeBaskets(state) {
  return (state.baskets || []).filter(b => !b.archived);
}

/** A basket counts if it was emptied on any day from the quest start through today. */
export function basketProgress(state, quest, today) {
  const baskets = activeBaskets(state);
  const done = new Set();
  const start = quest.startedOn;
  for (const [date, day] of Object.entries(state.days || {})) {
    if (date < start || date > today) continue;
    const checks = day.checks || {};
    for (const b of baskets) if (checks['basket:' + b.id]) done.add(b.id);
  }
  return { total: baskets.length, done: done.size };
}

function applyStep(state, quest, flag, reached, today) {
  const key = 'quest:' + quest.instanceId + ':' + flag;
  const field = flag === 'half' ? 'halfOn' : 'doneOn';
  if (reached && !quest[field]) {
    const reason = flag === 'half' ? quest.name + ' halfway' : quest.name + ' complete';
    const xp = awardXP(state, today, key, 5, reason, 'quest');
    quest[field] = today;
    if (xp) maybeStreak(state, today);
    return xp;
  }
  if (!reached && quest[field] === today) {
    const back = reverseXP(state, today, key);
    quest[field] = null;
    return -back;
  }
  return 0;
}

export function syncQuest(state, today) {
  const q = state.quests?.active;
  if (!q) return 0;
  if (q.kind !== 'laundry-mountain') {
    q.progress = null;
    return 0;
  }
  const progress = basketProgress(state, q, today);
  q.progress = progress;
  const halfNeed = Math.ceil(progress.total / 2);
  const halfReached = progress.total > 0 && progress.done >= halfNeed;
  const allReached = progress.total > 0 && progress.done >= progress.total;
  let xp = 0;
  xp += applyStep(state, q, 'half', halfReached, today);
  xp += applyStep(state, q, 'done', allReached, today);
  return xp;
}

export function addCustomQuest(state, name, detail) {
  const clean = String(name || '').trim();
  if (!clean) return null;
  const id = 'custom-' + state.quests.catalog.length + '-' + clean.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 18);
  const item = {
    id,
    name: clean,
    detail: String(detail || '').trim() || 'Done when you say it is done.',
    kind: 'custom',
  };
  state.quests.catalog.push(item);
  return item;
}

export function pickQuest(state, questId, today) {
  if (!canPick(state, today)) {
    return { error: 'Finish the quest you already have before picking a new one.' };
  }
  const found = state.quests.catalog.find(q => q.id === questId);
  if (!found) return { error: 'That quest isn’t on the list.' };
  if (state.quests.active?.doneOn) {
    state.quests.history.push(state.quests.active);
    state.quests.active = null;
  }
  state.quests.active = {
    instanceId: found.id + ':' + today + ':' + state.quests.history.length,
    questId: found.id,
    name: found.name,
    detail: found.detail,
    kind: found.kind,
    startedOn: today,
    halfOn: null,
    doneOn: null,
    progress: null,
  };
  syncQuest(state, today);
  return { ok: true, quest: state.quests.active };
}

/** Cleanse Base and custom quests. Laundry Mountain follows the baskets. */
export function setQuestStep(state, flag, on, today) {
  const q = state.quests?.active;
  if (!q) return { error: 'No quest picked yet.' };
  if (q.kind === 'laundry-mountain') return { error: 'Laundry Mountain follows your baskets.' };
  if (flag === 'done' && on && !q.halfOn) {
    applyStep(state, q, 'half', true, today);
  }
  applyStep(state, q, flag, !!on, today);
  if (flag === 'half' && !on) applyStep(state, q, 'done', false, today);
  return { ok: true, xp: 0 };
}

export function iterDates(from, to) {
  const out = [];
  let c = from;
  while (c <= to) { out.push(c); c = dateShift(c, 1); }
  return out;
}
