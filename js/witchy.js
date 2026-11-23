// Lunar and Sabbat checks (D35). A mark stays for the whole phase or sabbat
// stretch, and clears when that stretch ends or the user unchecks it.
// Gold is still awarded only by the toggle, on the day it is tapped.

import { isISO } from './dates.js';
import { phaseWindow, sabbatWindow, sameSpan } from './moon.js';

export function spanWindow(state, date, kind) {
  const day = state.days?.[date];
  return kind === 'lunar' ? phaseWindow(day, date) : sabbatWindow(day, date);
}

function fieldFor(kind) {
  return kind === 'lunar' ? 'lunarChecks' : 'sabbatChecks';
}

/** Checks set on this date or earlier in the same phase / sabbat stretch. */
export function carriedOn(state, date, kind) {
  const target = spanWindow(state, date, kind);
  const field = fieldFor(kind);
  const on = {};
  for (const d of Object.keys(state.days || {}).sort()) {
    if (!isISO(d) || d > date) continue;
    if (!sameSpan(spanWindow(state, d, kind), target)) continue;
    const bag = state.days[d]?.witchy?.[field] || {};
    for (const [key, value] of Object.entries(bag)) {
      if (value) on[key] = true;
    }
  }
  return on;
}

export function spanChecked(state, date, kind, itemKey) {
  return !!carriedOn(state, date, kind)[itemKey];
}

/** Forget a mark everywhere in this stretch. Does not touch gold or XP. */
export function clearSpanKey(state, date, kind, itemKey) {
  const target = spanWindow(state, date, kind);
  const field = fieldFor(kind);
  for (const d of Object.keys(state.days || {})) {
    if (!sameSpan(spanWindow(state, d, kind), target)) continue;
    const bag = state.days[d]?.witchy?.[field];
    if (bag) delete bag[itemKey];
  }
}
