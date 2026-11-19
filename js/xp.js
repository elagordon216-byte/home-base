// XP ledger, Hearthgold, streaks, and levels. Lifetime XP is never removed as a penalty.
// Unticking only reverses an award from that same date, matching Home Base v2.

import { dateShift } from './dates.js';
import { MILESTONES } from './v2-data.js';

export function totalXP(state) {
  return (Number(state.baseline) || 0) + state.xpLog.reduce((a, e) => a + (Number(e.amount) || 0), 0);
}

export function levelIndex(total) {
  let i = 0;
  MILESTONES.forEach((m, j) => { if (total >= m) i = j; });
  return i;
}

export function levelNumber(total) { return levelIndex(total) + 1; }

export function xpEntry(state, date, key) {
  return state.xpLog.find(e => e.date === date && e.key === key);
}

export function awardXP(state, date, key, amount, reason, kind = 'task') {
  amount = Math.max(0, Math.floor(Number(amount) || 0));
  if (!amount || xpEntry(state, date, key)) return 0;
  state.xpLog.push({ date, key, amount, reason: String(reason || ''), kind, at: Date.now() });
  state.wallet += amount;
  return amount;
}

export function reverseXP(state, date, key) {
  const i = state.xpLog.findIndex(e => e.date === date && e.key === key);
  if (i < 0) return 0;
  const [e] = state.xpLog.splice(i, 1);
  state.wallet = Math.max(0, state.wallet - e.amount);
  return e.amount;
}

export function awardGold(state, date, key, amount, desc) {
  amount = Math.max(0, Math.floor(Number(amount) || 0));
  const L = state.goldLedger[date] || (state.goldLedger[date] = {});
  if (L[key] || !amount) return 0;
  L[key] = amount;
  state.gold += amount;
  state.goldLog.push({ amount, description: desc, date, key });
  return amount;
}

export function reverseGold(state, date, key, desc) {
  const L = state.goldLedger[date];
  if (!L || !L[key]) return 0;
  const amt = typeof L[key] === 'number' ? L[key] : (key.startsWith('basket:') || key.startsWith('task:a-') ? 2 : 1);
  delete L[key];
  let i = state.goldLog.findIndex(x => x.key === key && x.date === date && x.amount > 0);
  if (i < 0) i = state.goldLog.findIndex(x => !x.key && x.date === date && x.amount === amt && x.description === desc);
  if (i >= 0) state.goldLog.splice(i, 1);
  else state.goldLog.push({ amount: -amt, description: 'Unticked: ' + desc, date, key: 'undo:' + key });
  state.gold = Math.max(0, state.gold - amt);
  return amt;
}

export function dayXP(state, date) {
  return state.xpLog.filter(e => e.date === date).reduce((a, e) => a + e.amount, 0);
}

export function earnedDates(state) {
  const s = new Set();
  state.xpLog.forEach(e => { if (e.kind !== 'streak' && e.amount > 0) s.add(e.date); });
  return s;
}

export function streakEnding(state, date, set = earnedDates(state)) {
  let n = 0;
  let c = date;
  while (set.has(c)) { n++; c = dateShift(c, -1); }
  return n;
}

export function currentStreak(state, today) {
  const s = earnedDates(state);
  return s.has(today) ? streakEnding(state, today, s) : streakEnding(state, dateShift(today, -1), s);
}

export function bestStreak(state) {
  const dates = [...earnedDates(state)].sort();
  let best = 0;
  let run = 0;
  let prev = null;
  for (const d of dates) {
    run = prev && dateShift(prev, 1) === d ? run + 1 : 1;
    prev = d;
    if (run > best) best = run;
  }
  return best;
}

export function streakBonusFor(len) {
  return len === 3 ? 10 : len === 5 ? 20 : (len >= 7 && len % 7 === 0) ? 35 : 0;
}

export function maybeStreak(state, date) {
  const len = streakEnding(state, date);
  const amt = streakBonusFor(len);
  if (!amt) return 0;
  return awardXP(state, date, 'streak:' + len, amt, len + '-day streak bonus (automatic)', 'streak');
}

export function levelProgress(total) {
  const idx = levelIndex(total);
  const next = MILESTONES[Math.min(idx + 1, MILESTONES.length - 1)];
  const prev = MILESTONES[idx];
  const top = total >= 2000;
  return {
    level: idx + 1,
    prev,
    next,
    top,
    label: top ? 'Top listed level reached' : (next - total) + ' XP to Level ' + (idx + 2),
    ratio: Math.min(100, ((total - prev) / (next - prev || 1)) * 100),
  };
}
