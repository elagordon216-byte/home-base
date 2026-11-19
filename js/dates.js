// Date helpers. The phone's local calendar, same as Home Base v2.

export const pad = n => String(n).padStart(2, '0');
export const isoOf = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
export const todayIso = (now = new Date()) => isoOf(now);
export const parseISO = iso => new Date(iso + 'T12:00:00');
export const isISO = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
export const clone = x => JSON.parse(JSON.stringify(x));
export const num = (v, d) => (v === null || v === '' || v === undefined || !Number.isFinite(Number(v))) ? d : Number(v);

export function dateShift(iso, n) {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return isoOf(d);
}

/** Monday that starts the week containing iso. */
export function weekStart(iso) {
  const d = parseISO(iso);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return isoOf(d);
}

export function weekday(iso) { return parseISO(iso).getDay(); }

export function daysBetween(a, b) {
  return Math.round((parseISO(b) - parseISO(a)) / 86400000);
}

export function fmtDate(iso, opt = {}) {
  if (!isISO(iso)) return String(iso ?? '');
  const d = parseISO(iso);
  const o = { month: 'short', day: 'numeric' };
  if (opt.weekday !== false) o.weekday = 'short';
  if (opt.year === true || (opt.year !== false && d.getFullYear() !== new Date().getFullYear())) o.year = 'numeric';
  return d.toLocaleDateString('en-US', o);
}

export function fmtTime(d) {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function minutesOf(d = new Date()) {
  return d.getHours() * 60 + d.getMinutes();
}

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
