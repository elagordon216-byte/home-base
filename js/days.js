// Four day types (D31) and the weekday rules that still apply (D4, D27, D32).

import { weekday } from './dates.js';

export const DAY_TYPES = [
  { id: 'weekday', name: 'Weekday/Preschool', short: 'Weekday', hint: 'Monday–Thursday, preschool in session.' },
  { id: 'break', name: 'Weekend/Break', short: 'Break', hint: 'Friday–Sunday, plus spring, summer, and fall breaks.' },
  { id: 'sick', name: 'Sick Day', short: 'Sick', hint: 'Low energy or another focus. Four essentials are enough.' },
  { id: 'hyperfocus', name: 'Hyperfocus', short: 'Hyper', hint: 'The day went somewhere else. +10 XP, fading pauses, essentials only.' },
];

export function autoDayType(iso) {
  const w = weekday(iso);
  return (w === 0 || w === 5 || w === 6) ? 'break' : 'weekday';
}

/**
 * Old v2 day-type strings stay in the saved day and are read here.
 * Tuesday/Sunday no-writing is decided from the real weekday, not from those old labels.
 */
export function dayTypeOf(notes, iso) {
  if (notes?.dayType && DAY_TYPES.some(t => t.id === notes.dayType)) return notes.dayType;
  switch (notes?.kind) {
    case 'fallbreak': return 'break';
    case 'sick': return 'sick';
    case 'hyperfocus': return 'hyperfocus';
    case 'sunday': return 'break';
    case 'tuesday': return 'weekday';
    case 'normal': return 'weekday';
    case 'custom': return 'weekday';
    default: return autoDayType(iso);
  }
}

export function dayTypeName(id) {
  return DAY_TYPES.find(t => t.id === id)?.name || id;
}

/** Essentials checklist is showing. Explicit badDay wins, matching v2. */
export function essentialsOn(day, iso) {
  if (!day) return false;
  if (day.badDay !== undefined) return !!day.badDay;
  const type = dayTypeOf(day.notes, iso);
  if (type === 'sick' || type === 'hyperfocus') return true;
  return (day.notes?.energy || 'medium') === 'low';
}

/**
 * A focus day does not count as missed on this date (D4, D32, D36).
 * Sunday pauses by weekday. Sick Day and Hyperfocus pause even if the full list is open.
 * Low energy and a manual Bad Day toggle also pause, because that is Bad Day mode.
 * A day with no saved record pauses only on Sunday. A clean done on a paused focus day still counts.
 */
export function isFadePaused(state, iso) {
  if (weekday(iso) === 0) return true;
  const day = state.days?.[iso];
  if (!day) return false;
  const type = dayTypeOf(day.notes, iso);
  if (type === 'sick' || type === 'hyperfocus') return true;
  return essentialsOn(day, iso);
}

/** Tuesday and Sunday by weekday, plus Sick Day (v2 hid author work on sick days). */
export function noWriting(day, iso) {
  if (day?.authorOverride) return false;
  const w = weekday(iso);
  if (w === 0 || w === 2) return true;
  return dayTypeOf(day?.notes, iso) === 'sick';
}

/** D27: morning novel is optional on Tuesday and Sunday. No nudge if skipped. */
export function morningNovelOptional(iso) {
  const w = weekday(iso);
  return w === 0 || w === 2;
}

export function preschoolUnlikely(notes, iso) {
  if (dayTypeOf(notes, iso) !== 'weekday') return true;
  const w = weekday(iso);
  return w === 0 || w === 5 || w === 6;
}

export function dayNotice(type, energy, iso) {
  const w = weekday(iso);
  const bits = [];
  if (type === 'weekday') bits.push('Weekday: essentials first, then today’s main cleaning task.');
  if (type === 'break') bits.push('Weekend or break: no preschool run. A slower start is part of the plan.');
  if (type === 'sick') bits.push('Sick day: kids safe, everyone fed, urgent needs only. Cleaning and author work are optional.');
  if (type === 'hyperfocus') bits.push('Hyperfocus day: +10 XP. A focus day missed for this reason doesn’t drop a room. The four essentials are enough, and the full list is still there.');
  if (w === 2) bits.push('Tuesday: no writing, unless you tap “Writing anyway.”');
  if (w === 0) bits.push('Sunday: no writing. Sunday isn’t a cleaning focus day.');
  if (energy === 'low') bits.push('Low energy: bare basics are enough.');
  if (energy === 'high') bits.push('Extra energy is welcome. Every extra task stays optional.');
  return bits.join(' ');
}
