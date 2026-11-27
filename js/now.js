// Now card (D28, D29). Weekend/Break daytime is explicitly unconfirmed.

import { weekday } from './dates.js';
import { BADDAY_ITEMS, DEFAULT_LISTS } from './v2-data.js';
import { dayTypeOf, essentialsOn, morningNovelOptional, noWriting, preschoolUnlikely } from './days.js';
import { focusRoomIds } from './rooms.js';

export const TIME = {
  morningEnd: 7 * 60 + 50,
  preschoolEnd: 15 * 60 + 20,
  daytimeEnd: 17 * 60,
  eveningEnd: 20 * 60 + 30,
};

/**
 * UNCONFIRMED — Ela skipped this card (open question 2). Not an adopted decision.
 * Weekend/Break daytime is one block, 7:50 AM–5:00 PM, until she says otherwise.
 */
export const WEEKEND_DAYTIME_UNCONFIRMED = true;
export const WEEKEND_DAYTIME = { startMin: TIME.morningEnd, endMin: TIME.daytimeEnd };

const XP = {};
for (const group of Object.values(DEFAULT_LISTS)) {
  for (const [id, , xp] of group) XP[id] = xp;
}

const LABEL = {};
for (const group of Object.values(DEFAULT_LISTS)) {
  for (const [id, label] of group) LABEL[id] = label;
}
for (const [id, label] of BADDAY_ITEMS) LABEL[id] = label;

function clock(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return m ? `${hr}:${String(m).padStart(2, '0')} ${suffix}` : `${hr} ${suffix}`;
}

export function useWeekendDaytime(wd, dayType) {
  if (dayType === 'break') return true;
  return wd === 0 || wd === 5 || wd === 6;
}

export function blockFor(minutes, { wd, dayType }) {
  if (minutes < TIME.morningEnd) return 'morning';
  if (minutes >= TIME.eveningEnd) return 'author';
  if (minutes >= TIME.daytimeEnd) return 'evening';
  if (useWeekendDaytime(wd, dayType)) return 'weekend-day';
  if (minutes < TIME.preschoolEnd) return 'preschool';
  return 'pickup';
}

const BLOCK_META = {
  morning: { title: 'Morning', range: () => `until ${clock(TIME.morningEnd)}` },
  preschool: { title: 'Preschool hours', range: () => `${clock(TIME.morningEnd)}–${clock(TIME.preschoolEnd)}` },
  pickup: { title: 'After pickup', range: () => `${clock(TIME.preschoolEnd)}–${clock(TIME.daytimeEnd)}` },
  'weekend-day': { title: 'Daytime', range: () => `${clock(WEEKEND_DAYTIME.startMin)}–${clock(WEEKEND_DAYTIME.endMin)}`, unconfirmed: true },
  evening: { title: 'Evening', range: () => `${clock(TIME.daytimeEnd)}–${clock(TIME.eveningEnd)}` },
  author: { title: 'Author shift', range: () => `after ${clock(TIME.eveningEnd)}` },
  essentials: { title: 'Essentials', range: () => 'just these' },
};

function poolFor(blockId, { wd, dayType, notes, iso, writing }) {
  if (blockId === 'morning') {
    const ids = ['morning-novel', 'm-dressed', 'm-kids', 'm-breakfast'];
    if (!preschoolUnlikely(notes, iso)) ids.push('m-preschool');
    ids.push('s-shower', 's-teeth', 's-hair', 's-face', 's-deodorant', 's-skin');
    if (morningNovelOptional(iso)) return ids.filter(id => id !== 'morning-novel');
    return ids;
  }
  if (blockId === 'preschool') return ['h-dishes', 'h-dirty-load', 'h-main-clean', 'l-washer', 'l-dryer', 'h-reset'];
  if (blockId === 'pickup') return ['e-toys', 'l-sort', 'e-machines', 'e-prep'];
  if (blockId === 'weekend-day') return ['h-dishes', 'h-dirty-load', 'h-main-clean', 'l-washer', 'h-reset', 'e-toys'];
  if (blockId === 'evening') return ['e-dinner', 'e-kitchen', 'e-toys', 'e-bedtime', 'e-machines'];
  if (!writing) return ['e-shutdown'];
  return ['morning-novel', 'a-open', 'a-10', 'a-25', 'a-save'];
}

function taskMeta(state, id, wd) {
  if (id === 'morning-novel') {
    const title = state.morningNovel?.title || 'your novel';
    return { label: `Morning novel · ${title}`, xp: 3, key: 'task:morning-novel' };
  }
  if (id.startsWith('bd-')) return { label: LABEL[id] || id, xp: 0, key: 'bad:' + id };
  let xp = XP[id] ?? 1;
  if (id === 'h-main-clean' && focusRoomIds(wd).length) xp += 1;
  let label = LABEL[id] || id;
  if (id === 'a-open') label = label.replace('{priority}', prioritySafe(state));
  return { label, xp, key: 'task:' + id };
}

function prioritySafe(state) {
  const ps = state.authorProjects || [];
  const p = ps.find(x => x.priority && x.stage !== 'Complete') || ps.find(x => !['Complete', 'On hold'].includes(x.stage));
  return p ? p.name : 'your current project';
}

/**
 * Next 3 tasks for this time of day.
 * Sick Day, Hyperfocus, Holiday, and Bad Day mode show the four essentials instead.
 * A Holiday stays on that list so the card never nudges cleaning or laundry.
 */
export function nowCard(state, { iso, minutes }) {
  const day = state.days?.[iso] || { checks: {}, notes: {} };
  const notes = day.notes || {};
  const type = dayTypeOf(notes, iso);
  const wd = weekday(iso);
  const checks = day.checks || {};
  const essentials = essentialsOn(day, iso);
  const bare = type === 'holiday' || essentials;
  const blockId = bare ? 'essentials' : blockFor(minutes, { wd, dayType: type });
  const meta = BLOCK_META[blockId];
  const ids = bare
    ? BADDAY_ITEMS.map(([id]) => id)
    : poolFor(blockId, { wd, dayType: type, notes, iso, writing: !noWriting(day, iso) });
  const tasks = ids.map(id => {
    const info = taskMeta(state, id, wd);
    const done = !!checks[info.key];
    return { id, ...info, done };
  });
  const open = tasks.filter(t => !t.done);
  let note = '';
  if (blockId === 'weekend-day') note = 'Daytime block is a placeholder (7:50 AM–5:00 PM) until you confirm weekend hours.';
  if (blockId === 'author' && noWriting(day, iso)) note = 'No writing tonight. Rest counts.';
  if (type === 'holiday') note = 'Holiday: just the essentials. No cleaning or laundry nudge. The full list is still there.';
  else if (essentials && type === 'hyperfocus') note = 'Hyperfocus: just the essentials. The rest of the list is still there.';
  else if (essentials && type === 'sick') note = 'Sick day: just the essentials. Survival counts.';
  if (!essentials && morningNovelOptional(iso) && blockId === 'morning') note = 'Morning novel is optional today. No nudge if you skip it.';
  return {
    blockId,
    title: meta.title,
    range: meta.range(),
    unconfirmed: !!meta.unconfirmed,
    note,
    tasks: open.slice(0, 3),
    remaining: open.length,
    cleared: open.length === 0,
  };
}
