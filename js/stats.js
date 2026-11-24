// Character-sheet stats (D18, D19). Display only. They never change XP.
// Witchy work pays Hearthgold in v2, not XP, so each completed witchy item
// adds one Spirit practice point on the card and is labeled as a practice, not XP.

const HEARTH_TASKS = new Set([
  'm-kids', 'm-breakfast', 'm-preschool',
  'h-dishes', 'h-dirty-load', 'h-main-clean', 'h-reset',
  'l-washer', 'l-dryer', 'l-empty-basket', 'l-sort',
  'e-dinner', 'e-kitchen', 'e-toys', 'e-prep', 'e-machines', 'e-bedtime',
]);
const SPIRIT_TASKS = new Set(['m-dressed', 'e-shutdown']);

function findGroup(state, id) {
  const lists = state.lists || {};
  for (const g of Object.keys(lists)) {
    if ((lists[g] || []).some(t => t.id === id)) return g;
  }
  return null;
}

export function bucketFor(state, entry) {
  const key = entry.key || '';
  if (key.startsWith('streak:')) return null;
  if (key === 'hyperfocus') return 'spirit';
  if (key === 'badday-protocol') return 'spirit';
  if (key === 'focus-bonus') return 'hearth';
  if (key.startsWith('quest:')) return 'hearth';
  if (key.startsWith('ef:')) return 'spirit';
  if (key.startsWith('author-time:')) return 'craft';
  if (key.startsWith('basket:')) return 'hearth';
  if (key.startsWith('bad:')) return key === 'bad:bd-self' ? 'spirit' : 'hearth';
  if (key.startsWith('task:')) {
    const id = key.slice(5);
    if (id === 'morning-novel') return 'craft';
    if (SPIRIT_TASKS.has(id)) return 'spirit';
    if (HEARTH_TASKS.has(id)) return 'hearth';
    const group = findGroup(state, id);
    if (group === 'author') return 'craft';
    if (group === 'self') return 'spirit';
    if (group) return 'hearth';
    return null;
  }
  return null;
}

export function witchyPractices(state) {
  let n = 0;
  for (const day of Object.values(state.days || {})) {
    const w = day.witchy;
    if (!w) continue;
    n += Object.values(w.checks || {}).filter(Boolean).length;
    n += Object.values(w.lunarChecks || {}).filter(Boolean).length;
    n += Object.values(w.sabbatChecks || {}).filter(Boolean).length;
  }
  return n;
}

export function statsOf(state) {
  let hearth = 0, craft = 0, spiritXP = 0;
  for (const e of state.xpLog || []) {
    const b = bucketFor(state, e);
    const amt = Number(e.amount) || 0;
    if (b === 'hearth') hearth += amt;
    else if (b === 'craft') craft += amt;
    else if (b === 'spirit') spiritXP += amt;
  }
  const practices = witchyPractices(state);
  return { hearth, craft, spiritXP, practices, spirit: spiritXP + practices };
}
