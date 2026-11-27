// Room levels (D36). Visual only. A level never changes XP or gold.
// A room moves up one level when its main clean is done on a focus day.
// If none of its focus days are cleaned that week, it drops one level.
// Dusty is the floor. Sparkling is the cap.

import { dateShift, isISO, weekday, weekStart } from './dates.js';
import { dayTypeOf, isFadePaused } from './days.js';

export const ROOMS = [
  { id: 'mine', name: 'My bedroom', icon: '🛏️', fill: '#e7dfeb' },
  { id: 'kids', name: "Kids' bedroom", icon: '🧸', fill: '#e7dfeb' },
  { id: 'living', name: 'Living room', icon: '🛋️', fill: '#e4eadc' },
  { id: 'kitchen', name: 'Kitchen/dining', icon: '🍽️', fill: '#e8e4d3' },
  { id: 'laundry', name: 'Laundry room', icon: '🧺', fill: '#dce9e9' },
  { id: 'bath', name: 'Bathroom', icon: '🛁', fill: '#d9e9ed' },
];

/** Index 0 is level 1 Dusty. The app starts every room at Waking (D10, D11). */
export const LEVEL_NAMES = ['Dusty', 'Waking', 'Tidy', 'Bright', 'Sparkling'];
export const START_LEVEL = 1;
export const MAX_LEVEL = 4;

export const FOCUS_ROOMS = {
  0: [],
  1: ['bath'],
  2: ['kitchen'],
  3: ['mine', 'kids'],
  4: ['living'],
  5: ['mine', 'kids', 'living', 'kitchen', 'laundry', 'bath'],
  6: [],
};

export const FOCUS_LABELS = [
  'Minimum maintenance + meal prep',
  'Bathrooms + batch cooking',
  'Kitchen + floors',
  'Bedrooms',
  'Living areas + baking',
  'Whole-house reset + treat',
  'Family maintenance',
];

/** Tasks that live in a room. They do not move its level. Main cleaning does, on a focus day. */
export const TASK_ROOMS = {
  'm-breakfast': ['kitchen'],
  'h-dishes': ['kitchen'],
  'e-dinner': ['kitchen'],
  'e-kitchen': ['kitchen'],
  'h-dirty-load': ['laundry'],
  'l-washer': ['laundry'],
  'l-dryer': ['laundry'],
  'l-sort': ['laundry'],
  'l-empty-basket': ['laundry'],
  'e-machines': ['laundry'],
  'h-reset': ['living'],
  'e-toys': ['living'],
  'm-dressed': ['mine'],
  'e-shutdown': ['mine'],
  'm-kids': ['kids'],
  'e-bedtime': ['kids'],
};

/** Which room shows this basket. Putting it away does not move the level. Towels stay in laundry. */
export const BASKET_ROOMS = {
  basket0: ['laundry', 'mine'],
  basket1: ['laundry', 'mine'],
  basket2: ['laundry', 'kids'],
  basket3: ['laundry', 'kids'],
  basket4: ['laundry'],
};

export const MAIN_CLEAN = 'h-main-clean';

export function focusRoomIds(wd) {
  return FOCUS_ROOMS[wd] || [];
}

function blankFocus() {
  return { week: null, tended: false, open: false, dropped: null, settled: null };
}

function focusState(raw) {
  const f = raw?.focus;
  if (!f || typeof f !== 'object') return blankFocus();
  return {
    week: isISO(f.week) ? f.week : null,
    tended: !!f.tended,
    open: !!f.open,
    dropped: isISO(f.dropped) ? f.dropped : null,
    settled: isISO(f.settled) ? f.settled : null,
  };
}

export function initialRooms() {
  return Object.fromEntries(ROOMS.map(r => [r.id, { level: START_LEVEL, untouched: 0, focus: blankFocus() }]));
}

export function normalizeRooms(rooms) {
  const out = initialRooms();
  for (const r of ROOMS) {
    const s = rooms?.[r.id];
    if (!s) continue;
    const level = Math.floor(Number(s.level));
    const untouched = Math.floor(Number(s.untouched));
    out[r.id] = {
      level: Number.isFinite(level) ? Math.max(0, Math.min(MAX_LEVEL, level)) : START_LEVEL,
      untouched: Number.isFinite(untouched) ? Math.max(0, untouched) : 0,
      focus: focusState(s),
    };
  }
  return out;
}

/** Latest weekday this room is on the cleaning focus list. Friday for every room. */
export function lastFocusWeekday(roomId) {
  let last = -1;
  for (let wd = 0; wd <= 6; wd++) {
    if (focusRoomIds(wd).includes(roomId)) last = wd;
  }
  return last;
}

/** True only when today’s main clean is checked and this room is in focus. */
export function isTouched(roomId, checks, wd) {
  if (!checks?.['task:' + MAIN_CLEAN]) return false;
  return focusRoomIds(wd).includes(roomId);
}

/** +1 when the room is cleaned on its focus day, otherwise 0. Capped by the caller. A holiday holds the level. */
export function gain(roomId, checks, wd, holdLevel = false) {
  if (holdLevel) return 0;
  return isTouched(roomId, checks, wd) ? 1 : 0;
}

export function liveLevel(rooms, roomId, checks, wd) {
  const start = rooms[roomId]?.level ?? START_LEVEL;
  return Math.min(MAX_LEVEL, start + gain(roomId, checks, wd));
}

/**
 * End one day. A focus-day clean bakes in +1. On the room’s last focus day
 * of the week, no clean that week drops one level. A paused focus day is not
 * a miss. Sick, hyperfocus, and bad-day pauses still count a clean if one happened.
 * holdLevel (a Holiday) does not climb and does not count as the week’s clean.
 * It is also not a miss. An earlier miss in the week still drops on the last focus day.
 * Calling this twice for the same date does not move the level again.
 */
export function settleDay(rooms, checks, iso, fadePaused, holdLevel = false) {
  const wd = weekday(iso);
  const week = weekStart(iso);
  const next = {};
  const events = [];
  for (const room of ROOMS) {
    const s = rooms[room.id] || { level: START_LEVEL, untouched: 0, focus: blankFocus() };
    const prev = focusState(s);
    if (prev.settled === iso) {
      next[room.id] = { level: s.level, untouched: s.untouched || 0, focus: prev };
      continue;
    }
    let level = s.level ?? START_LEVEL;
    let { tended, open, dropped } = prev;
    if (prev.week !== week) {
      tended = false;
      open = false;
    }
    const focus = focusRoomIds(wd).includes(room.id);
    const cleaned = !holdLevel && isTouched(room.id, checks, wd);
    if (cleaned) {
      level = Math.min(MAX_LEVEL, level + 1);
      tended = true;
    } else if (focus && !fadePaused && !holdLevel) {
      open = true;
    }
    const last = lastFocusWeekday(room.id) === wd;
    if (focus && last && !tended && open && dropped !== week) {
      if (level > 0) {
        level -= 1;
        events.push({ type: 'dim', roomId: room.id, to: level });
      }
      dropped = week;
    }
    next[room.id] = {
      level,
      untouched: s.untouched || 0,
      focus: { week, tended, open, dropped, settled: iso },
    };
  }
  return { rooms: next, events };
}

/**
 * Apply every finished day after roomsSettledThrough, up through the day
 * before `today`. Today stays live, so a focus clean can still be unticked.
 * A paused day (Sunday, sick, hyperfocus, holiday, bad day) is not a missed focus day.
 * A holiday also does not level a room.
 */
export function catchUpRooms(state, today) {
  if (!state.rooms) state.rooms = initialRooms();
  state.rooms = normalizeRooms(state.rooms);
  if (!state.roomsSettledThrough) state.roomsSettledThrough = dateShift(today, -1);
  const log = [];
  let cursor = dateShift(state.roomsSettledThrough, 1);
  while (cursor < today) {
    const day = state.days?.[cursor] || {};
    const holdLevel = dayTypeOf(day.notes, cursor) === 'holiday';
    const result = settleDay(state.rooms, day.checks || {}, cursor, isFadePaused(state, cursor), holdLevel);
    state.rooms = result.rooms;
    if (result.events.length) log.push({ date: cursor, events: result.events });
    cursor = dateShift(cursor, 1);
  }
  state.roomsSettledThrough = dateShift(today, -1);
  return log;
}

export function roomViews(state, iso) {
  const wd = weekday(iso);
  const checks = state.days?.[iso]?.checks || {};
  const paused = isFadePaused(state, iso);
  const holdLevel = dayTypeOf(state.days?.[iso]?.notes, iso) === 'holiday';
  return ROOMS.map(room => {
    const start = state.rooms?.[room.id] || { level: START_LEVEL, untouched: 0 };
    const g = gain(room.id, checks, wd, holdLevel);
    const level = Math.min(MAX_LEVEL, start.level + g);
    return {
      ...room,
      level,
      levelName: LEVEL_NAMES[level],
      levelNumber: level + 1,
      gain: g,
      untouched: start.untouched || 0,
      focus: !holdLevel && focusRoomIds(wd).includes(room.id),
      paused,
      sparkling: level === MAX_LEVEL,
    };
  });
}
