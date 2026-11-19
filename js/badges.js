// Badges (D20, D21). Each badge pays +5 Hearthgold once. Streak XP is unchanged.

import { awardGold } from './xp.js';
import { bestStreak } from './xp.js';
import { lunarPhaseData, sabbatData } from './v2-data.js';
import { phaseOfDay, sabbatOfDay, PRINCIPAL, SABBAT_ORDER } from './moon.js';
import { roomViews } from './rooms.js';

export const WORD_MILESTONES = [1000, 5000, 10000, 25000, 50000];
export const FOCUS_HOUR_MILESTONES = [1, 5, 10, 25, 50];

export const BADGE_CATALOG = [
  { id: 'first-sparkling', name: 'First sparkling room', detail: 'A room reached Sparkling.' },
  { id: 'streak-3', name: '3-day streak', detail: 'Three days in a row with XP.' },
  { id: 'streak-5', name: '5-day streak', detail: 'Five days in a row with XP.' },
  { id: 'streak-7', name: '7-day streak', detail: 'Seven days in a row with XP.' },
  ...WORD_MILESTONES.map(n => ({ id: 'words-' + n, name: n.toLocaleString('en-US') + ' words added', detail: 'Words added across projects, counted from increases.' })),
  ...FOCUS_HOUR_MILESTONES.map(n => ({ id: 'focus-' + n + 'h', name: n + (n === 1 ? ' focus hour' : ' focus hours'), detail: 'Author-timer minutes, added up.' })),
  ...PRINCIPAL.map(p => ({ id: 'moon:' + p, name: 'Moon ritual · ' + p.replace('-', ' '), detail: 'Every task for this moon phase, on one day.' })),
  { id: 'moon:waxing-crescent', name: 'Moon ritual · waxing crescent', detail: 'Every task for this moon phase, on one day.' },
  { id: 'moon:waxing-gibbous', name: 'Moon ritual · waxing gibbous', detail: 'Every task for this moon phase, on one day.' },
  { id: 'moon:waning-gibbous', name: 'Moon ritual · waning gibbous', detail: 'Every task for this moon phase, on one day.' },
  { id: 'moon:waning-crescent', name: 'Moon ritual · waning crescent', detail: 'Every task for this moon phase, on one day.' },
  ...SABBAT_ORDER.map(s => ({ id: 'sabbat:' + s, name: 'Sabbat ritual · ' + s, detail: 'Every preparation task for this Sabbat, on one day.' })),
  { id: 'badday-survivor', name: 'Bad Day survivor', detail: 'The four essentials were all done.' },
];

function catalogName(id, fallback) {
  return BADGE_CATALOG.find(b => b.id === id)?.name || fallback || id;
}

function earn(state, today, id, name) {
  if (state.badges[id]) return null;
  if (Array.isArray(state.badgesWaived) && state.badgesWaived.includes(id)) return null;
  state.badges[id] = { id, name, earnedOn: today };
  awardGold(state, today, 'badge:' + id, 5, 'Badge: ' + name);
  return state.badges[id];
}

function focusHours(state) {
  let ms = 0;
  for (const day of Object.values(state.days || {})) ms += Number(day.focusMs) || 0;
  return ms / 3600000;
}

function moonComplete(day, iso) {
  const phase = phaseOfDay(day, iso);
  const tasks = (lunarPhaseData[phase] || lunarPhaseData.new).tasks;
  const checks = day.witchy?.lunarChecks || {};
  if (tasks.length && tasks.every(([tid]) => checks[phase + ':' + tid])) return phase;
  return null;
}

function sabbatComplete(day, iso) {
  const sab = sabbatOfDay(day, iso);
  const tasks = (sabbatData[sab] || sabbatData.samhain).tasks;
  const checks = day.witchy?.sabbatChecks || {};
  if (tasks.length && tasks.every(([tid]) => checks[sab + ':' + tid])) return sab;
  return null;
}

function finishedQuests(state) {
  const list = [...(state.quests?.history || [])];
  if (state.quests?.active?.doneOn) list.push(state.quests.active);
  return list.filter(q => q.doneOn).sort((a, b) => String(a.instanceId).localeCompare(String(b.instanceId)));
}

/** Badge ids the current history already qualifies for. Does not pay or save anything. */
export function qualifiedBadges(state, today) {
  const list = [];
  const add = (id, name) => list.push({ id, name: name || catalogName(id) });

  if (roomViews(state, today).some(r => r.level === 4)) add('first-sparkling');

  const streak = bestStreak(state);
  if (streak >= 3) add('streak-3');
  if (streak >= 5) add('streak-5');
  if (streak >= 7) add('streak-7');

  const words = Number(state.wordsAdded) || 0;
  for (const n of WORD_MILESTONES) if (words >= n) add('words-' + n);

  const hours = focusHours(state);
  for (const n of FOCUS_HOUR_MILESTONES) if (hours >= n) add('focus-' + n + 'h');

  const dates = Object.keys(state.days || {}).sort();
  const moons = new Set();
  const sabbats = new Set();
  for (const date of dates) {
    const day = state.days[date];
    if (!day?.witchy) continue;
    const m = moonComplete(day, date);
    const s = sabbatComplete(day, date);
    if (m) moons.add(m);
    if (s) sabbats.add(s);
  }
  for (const phase of [...PRINCIPAL, 'waxing-crescent', 'waxing-gibbous', 'waning-gibbous', 'waning-crescent']) {
    if (moons.has(phase)) add('moon:' + phase);
  }
  for (const sab of SABBAT_ORDER) if (sabbats.has(sab)) add('sabbat:' + sab);

  if ((state.xpLog || []).some(e => e.key === 'badday-protocol' && e.amount > 0)) add('badday-survivor');

  for (const q of finishedQuests(state)) add('quest:' + q.instanceId, 'Quest: ' + q.name);

  return list;
}

/**
 * Remember badges this history already qualifies for, without paying them.
 * Used when a backup is imported. Badges already stored on the file are left alone.
 */
export function waiveHistoricalBadges(state, today) {
  if (!state.badges || typeof state.badges !== 'object') state.badges = {};
  const waived = new Set(Array.isArray(state.badgesWaived) ? state.badgesWaived : []);
  for (const { id } of qualifiedBadges(state, today)) {
    if (!state.badges[id]) waived.add(id);
  }
  state.badgesWaived = [...waived].sort();
}

/** Grant badges for achievements that were not already true at import. Safe to call often. */
export function syncBadges(state, today) {
  if (!state.badges || typeof state.badges !== 'object') state.badges = {};
  const earned = [];
  for (const { id, name } of qualifiedBadges(state, today)) {
    const row = earn(state, today, id, name);
    if (row) earned.push(row);
  }
  return earned;
}

export function badgeList(state) {
  const known = new Set(BADGE_CATALOG.map(b => b.id));
  const rows = BADGE_CATALOG.map(b => ({ ...b, earned: state.badges?.[b.id] || null }));
  for (const id of Object.keys(state.badges || {})) {
    if (!known.has(id)) rows.push({ id, name: state.badges[id].name || id, detail: 'A finished quest.', earned: state.badges[id] });
  }
  return rows;
}
