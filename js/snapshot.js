// End-of-day snapshots. Same fields v2 stored, plus the weekly quest when there is one.

import { clone } from './dates.js';
import { autoDayType, dayTypeOf } from './days.js';
import { PHASE_NAMES, phaseOfDay } from './moon.js';
import { priorityName } from './labels.js';

export function labelForKey(state, key, day) {
  let m;
  if ((m = /^task:(.+)$/.exec(key))) {
    if (m[1] === 'morning-novel') return 'Morning novel: ' + (state.morningNovel?.title || 'current novel');
    for (const g of Object.keys(state.lists || {})) {
      const t = (state.lists[g] || []).find(t => t.id === m[1]);
      if (t) return String(t.label).replace(/\{priority\}/g, priorityName(state));
    }
    const c = (day.custom || []).find(c => c.id === m[1]);
    return c ? c.label : m[1];
  }
  if ((m = /^basket:(.+)$/.exec(key))) {
    const b = (state.baskets || []).find(b => b.id === m[1]);
    return 'Laundry basket emptied: ' + (b ? b.name : m[1]);
  }
  if ((m = /^todo:(.+)$/.exec(key))) {
    const t = (state.todos || []).find(t => t.id === m[1]);
    return 'To-do: ' + (t ? t.label : m[1]);
  }
  if ((m = /^bad:(.+)$/.exec(key))) {
    const names = { 'bd-kids': 'Kids safe and fed', 'bd-dishes': 'Dishes OR laundry handled', 'bd-food': 'Something edible available', 'bd-self': 'One self-care action' };
    return 'Essentials: ' + (names[m[1]] || m[1]);
  }
  if (key === 'focus:weekly-cleaning') return 'Weekly cleaning focus';
  return key;
}

export function snapshotFor(state, iso, finalized = false, now = new Date().toISOString()) {
  const d = state.days[iso] || { checks: {}, custom: [], notes: {} };
  const c = d.checks || {};
  const w = d.witchy || {};
  const completed = [];
  Object.keys(c).forEach(k => { if (c[k] && k !== 'focus:weekly-cleaning') completed.push(labelForKey(state, k, d)); });
  const entries = (state.xpLog || []).filter(e => e.date === iso);
  const taskXP = entries.filter(e => e.kind === 'task').reduce((a, e) => a + e.amount, 0);
  const bonusXP = entries.filter(e => e.kind !== 'task').reduce((a, e) => a + e.amount, 0);
  const authorIds = new Set((state.lists?.author || []).map(t => 'task:' + t.id));
  const gold = (state.goldLog || []).filter(x => x.date === iso);
  const earned = gold.filter(x => x.amount > 0).reduce((a, x) => a + x.amount, 0);
  const spent = -gold.filter(x => x.amount < 0).reduce((a, x) => a + x.amount, 0);
  const notes = clone(d.notes || {});
  if (!notes.kind && !notes.dayType) notes.kind = autoDayType(iso);
  const quest = state.quests?.active
    ? { name: state.quests.active.name, done: !!state.quests.active.doneOn, halfway: !!state.quests.active.halfOn }
    : null;
  return {
    date: iso,
    finalized,
    updatedAt: now,
    completed,
    completedCount: completed.length,
    taskXP,
    bonusXP,
    totalXP: taskXP + bonusXP,
    authorCount: Object.keys(c).filter(k => c[k] && authorIds.has(k)).length,
    focusMinutes: Math.floor((d.focusMs || 0) / 60000),
    witchyCount: Object.values(w.checks || {}).filter(Boolean).length,
    lunarCount: Object.values(w.lunarChecks || {}).filter(Boolean).length,
    sabbatCount: Object.values(w.sabbatChecks || {}).filter(Boolean).length,
    moonPhase: PHASE_NAMES[phaseOfDay(d, iso)],
    notes,
    witchyNotes: w.astro || '',
    badDay: d.badDay !== undefined ? !!d.badDay : (dayTypeOf(notes, iso) === 'sick' || notes.energy === 'low'),
    goldTransactions: gold.map(x => ({ amount: x.amount, description: x.description })),
    goldEarned: earned,
    goldSpent: spent,
    netGold: earned - spent,
    kind: notes.dayType || notes.kind || autoDayType(iso),
    energy: notes.energy || 'medium',
    authorProjects: clone(state.authorProjects || []),
    quest,
  };
}
