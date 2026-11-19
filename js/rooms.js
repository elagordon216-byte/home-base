// Room levels D3–D12. Levels never change XP. Dusty is the floor.

import { dateShift, weekday } from './dates.js';
import { isFadePaused } from './days.js';

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
export const FADE_DAYS = 7;

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

/** Task id → rooms it brightens. Basket rows are separate. Main cleaning uses the focus list. */
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

/** Default basket ids. Towels/bedding are laundry only (D12). A renamed basket keeps its id. */
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

export function initialRooms() {
  return Object.fromEntries(ROOMS.map(r => [r.id, { level: START_LEVEL, untouched: 0 }]));
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
    };
  }
  return out;
}

function roomsForBasket(id) {
  return BASKET_ROOMS[id] || ['laundry'];
}

export function isTouched(roomId, checks, wd) {
  if (!checks) return false;
  if (checks['task:' + MAIN_CLEAN] && focusRoomIds(wd).includes(roomId)) return true;
  for (const [taskId, rooms] of Object.entries(TASK_ROOMS)) {
    if (checks['task:' + taskId] && rooms.includes(roomId)) return true;
  }
  for (const key of Object.keys(checks)) {
    if (!checks[key] || !key.startsWith('basket:')) continue;
    if (roomsForBasket(key.slice(7)).includes(roomId)) return true;
  }
  return false;
}

/** +2 on a focus day, +1 on any other day with a task here, otherwise 0. Capped by the caller. */
export function gain(roomId, checks, wd) {
  if (!isTouched(roomId, checks, wd)) return 0;
  return focusRoomIds(wd).includes(roomId) ? 2 : 1;
}

export function liveLevel(rooms, roomId, checks, wd) {
  const start = rooms[roomId]?.level ?? START_LEVEL;
  return Math.min(MAX_LEVEL, start + gain(roomId, checks, wd));
}

/**
 * End one day. Climb is baked in first. An untouched, unpaused day adds 1
 * toward the fade. At 7 the room dims one level and the count restarts (D12).
 * A paused day still keeps a climb from tasks done that day.
 */
export function settleDay(rooms, checks, wd, fadePaused) {
  const next = {};
  const events = [];
  for (const room of ROOMS) {
    const s = rooms[room.id] || { level: START_LEVEL, untouched: 0 };
    let level = Math.min(MAX_LEVEL, s.level + gain(room.id, checks, wd));
    let untouched = s.untouched || 0;
    if (isTouched(room.id, checks, wd)) {
      untouched = 0;
    } else if (!fadePaused) {
      untouched += 1;
      if (untouched >= FADE_DAYS) {
        if (level > 0) {
          level -= 1;
          events.push({ type: 'dim', roomId: room.id, to: level });
        }
        untouched = 0;
      }
    }
    next[room.id] = { level, untouched };
  }
  return { rooms: next, events };
}

/**
 * Apply every finished day after roomsSettledThrough, up through the day
 * before `today`. Today stays live. Days with no saved record are untouched,
 * except Sundays, which pause.
 */
export function catchUpRooms(state, today) {
  if (!state.rooms) state.rooms = initialRooms();
  state.rooms = normalizeRooms(state.rooms);
  if (!state.roomsSettledThrough) state.roomsSettledThrough = dateShift(today, -1);
  const log = [];
  let cursor = dateShift(state.roomsSettledThrough, 1);
  while (cursor < today) {
    const day = state.days?.[cursor] || {};
    const result = settleDay(state.rooms, day.checks || {}, weekday(cursor), isFadePaused(state, cursor));
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
  return ROOMS.map(room => {
    const start = state.rooms?.[room.id] || { level: START_LEVEL, untouched: 0 };
    const g = gain(room.id, checks, wd);
    const level = Math.min(MAX_LEVEL, start.level + g);
    return {
      ...room,
      level,
      levelName: LEVEL_NAMES[level],
      levelNumber: level + 1,
      gain: g,
      untouched: start.untouched || 0,
      focus: focusRoomIds(wd).includes(room.id),
      paused,
      sparkling: level === MAX_LEVEL,
    };
  });
}
