// Moon phases and Wheel of the Year, copied from Home Base v2 (Meeus).

import { dateShift, fmtDate, isoOf, parseISO } from './dates.js';

const RAD = Math.PI / 180;
const jdToDate = jd => new Date((jd - 2440587.5) * 86400000);
const dateToJD = d => d.getTime() / 86400000 + 2440587.5;

function moonPhaseJDE(k) {
  const T = k / 1236.85, T2 = T * T, T3 = T2 * T, T4 = T3 * T, s = Math.sin, c = Math.cos;
  let jde = 2451550.09766 + 29.530588861 * k + 0.00015437 * T2 - 0.00000015 * T3 + 0.00000000073 * T4;
  const E = 1 - 0.002516 * T - 0.0000074 * T2;
  const M = (2.5534 + 29.1053567 * k - 0.0000014 * T2 - 0.00000011 * T3) * RAD;
  const Mp = (201.5643 + 385.81693528 * k + 0.0107582 * T2 + 0.00001238 * T3 - 0.000000058 * T4) * RAD;
  const F = (160.7108 + 390.67050284 * k - 0.0016118 * T2 - 0.00000227 * T3 + 0.000000011 * T4) * RAD;
  const O = (124.7746 - 1.56375588 * k + 0.0020672 * T2 + 0.00000215 * T3) * RAD;
  const f = Math.round((k - Math.floor(k)) * 4) % 4; let x;
  if (f === 0 || f === 2) {
    const a = f === 0 ? [-0.40720, 0.17241, 0.01608, 0.01039, 0.00739, -0.00514, 0.00208] : [-0.40614, 0.17302, 0.01614, 0.01043, 0.00734, -0.00515, 0.00209];
    x = a[0] * s(Mp) + a[1] * E * s(M) + a[2] * s(2 * Mp) + a[3] * s(2 * F) + a[4] * E * s(Mp - M) + a[5] * E * s(Mp + M) + a[6] * E * E * s(2 * M)
      - 0.00111 * s(Mp - 2 * F) - 0.00057 * s(Mp + 2 * F) + 0.00056 * E * s(2 * Mp + M) - 0.00042 * s(3 * Mp) + 0.00042 * E * s(M + 2 * F)
      + 0.00038 * E * s(M - 2 * F) - 0.00024 * E * s(2 * Mp - M) - 0.00017 * s(O);
  } else {
    x = -0.62801 * s(Mp) + 0.17172 * E * s(M) - 0.01183 * E * s(Mp + M) + 0.00862 * s(2 * Mp) + 0.00804 * s(2 * F) + 0.00454 * E * s(Mp - M)
      + 0.00204 * E * E * s(2 * M) - 0.00180 * s(Mp - 2 * F) - 0.00070 * s(Mp + 2 * F) - 0.00040 * s(3 * Mp) - 0.00034 * E * s(2 * Mp - M)
      + 0.00032 * E * s(M + 2 * F) + 0.00032 * E * s(M - 2 * F) - 0.00028 * E * E * s(Mp + 2 * M);
    const W = 0.00306 - 0.00038 * E * c(M) + 0.00026 * c(Mp) - 0.00002 * c(Mp - M) + 0.00002 * c(Mp + M) + 0.00002 * c(2 * F);
    x += f === 1 ? W : -W;
  }
  return jde + x - 0.0008;
}

export const PRINCIPAL = ['new', 'first-quarter', 'full', 'last-quarter'];
const AFTER = { 'new': 'waxing-crescent', 'first-quarter': 'waxing-gibbous', 'full': 'waning-gibbous', 'last-quarter': 'waning-crescent' };
export const PHASE_NAMES = {
  'new': '🌑 New Moon',
  'waxing-crescent': '🌒 Waxing Crescent',
  'first-quarter': '🌓 First Quarter',
  'waxing-gibbous': '🌔 Waxing Gibbous',
  'full': '🌕 Full Moon',
  'waning-gibbous': '🌖 Waning Gibbous',
  'last-quarter': '🌗 Last Quarter',
  'waning-crescent': '🌘 Waning Crescent',
};
const moonCache = {};

export function moonEventsNear(iso) {
  const key = iso.slice(0, 7);
  if (moonCache[key]) return moonCache[key];
  const k0 = Math.floor((dateToJD(parseISO(iso)) - 2451550.09766) / 29.530588861);
  const out = [];
  for (let k = k0 - 2; k <= k0 + 3; k++) {
    for (let q = 0; q < 4; q++) out.push({ type: PRINCIPAL[q], at: jdToDate(moonPhaseJDE(k + q / 4)) });
  }
  out.sort((a, b) => a.at - b.at);
  return (moonCache[key] = out);
}

export function moonPhaseFor(iso) {
  const start = new Date(iso + 'T00:00:00');
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const ev = moonEventsNear(iso);
  const on = ev.find(e => e.at >= start && e.at < end);
  if (on) return { phase: on.type, exact: on.at };
  const prev = ev.filter(e => e.at < start).pop();
  return { phase: prev ? AFTER[prev.type] : 'waxing-crescent', since: prev };
}

export function nextMoonEvent(type, iso) {
  const start = new Date(iso + 'T00:00:00');
  for (const probe of [iso, dateShift(iso, 20), dateShift(iso, 40)]) {
    const e = moonEventsNear(probe).find(e => e.type === type && e.at >= start);
    if (e) return e;
  }
  return null;
}

function seasonJDE(year, which) {
  const Y = (year - 2000) / 1000;
  const c = [
    [2451623.80984, 365242.37404, 0.05169, -0.00411, -0.00057],
    [2451716.56767, 365241.62603, 0.00325, 0.00888, -0.00030],
    [2451810.21715, 365242.01767, -0.11575, 0.00337, 0.00078],
    [2451900.05952, 365242.74049, -0.06223, -0.00823, 0.00032],
  ][which];
  const jde0 = c[0] + c[1] * Y + c[2] * Y * Y + c[3] * Y ** 3 + c[4] * Y ** 4;
  const T = (jde0 - 2451545) / 36525;
  const W = (35999.373 * T - 2.47) * RAD;
  const dl = 1 + 0.0334 * Math.cos(W) + 0.0007 * Math.cos(2 * W);
  const A = [485, 203, 199, 182, 156, 136, 77, 74, 70, 58, 52, 50, 45, 44, 29, 18, 17, 16, 14, 12, 12, 12, 9, 8];
  const B = [324.96, 337.23, 342.08, 27.85, 73.14, 171.52, 222.54, 296.72, 243.58, 119.81, 297.17, 21.02, 247.54, 325.15, 60.93, 155.12, 288.79, 198.04, 199.76, 95.39, 287.11, 320.81, 227.73, 15.45];
  const C = [1934.136, 32964.467, 20.186, 445267.112, 45036.886, 22518.443, 65928.934, 3034.906, 9037.513, 33718.147, 150.678, 2281.226, 29929.562, 31555.956, 4443.417, 67555.328, 4562.452, 62894.029, 31436.921, 14577.848, 31931.756, 34777.259, 1222.114, 16859.074];
  let S = 0;
  for (let i = 0; i < 24; i++) S += A[i] * Math.cos((B[i] + C[i] * T) * RAD);
  return jde0 + 0.00001 * S / dl - 0.0008;
}

export const SABBAT_INFO = {
  samhain: { name: 'Samhain', emoji: '🎃', desc: 'Honor ancestors and loved ones, reflect on endings and transitions, tell seasonal stories, and set aside a quiet remembrance moment if desired.' },
  yule: { name: 'Yule', emoji: '🕯️', desc: 'Begin planning a light-in-darkness ritual, evergreen or nature craft, cozy baking, and a simple family tradition.' },
  imbolc: { name: 'Imbolc', emoji: '🌱', desc: 'Plan a candle/light ritual, seed or spring-preparation activity, and a small home refresh.' },
  ostara: { name: 'Ostara', emoji: '🌷', desc: 'Plan a spring nature walk, planting, renewal journaling, or a growth-themed craft.' },
  beltane: { name: 'Beltane', emoji: '🌼', desc: 'Plan flowers, joyful creativity, outdoor time, and a celebration of connection.' },
  litha: { name: 'Litha', emoji: '☀️', desc: 'Celebrate the longest day: sunshine, outdoor time, bright corners, and gratitude for the light.' },
  lammas: { name: 'Lammas / Lughnasadh', emoji: '🌾', desc: 'First harvest: bread, pantry comforts, handmade goods, and gratitude for skills and abundance.' },
  mabon: { name: 'Mabon', emoji: '🍎', desc: 'Harvest balance: gratitude, harvest colors, cozy layers, and a seasonal meal.' },
};

export const SABBAT_ORDER = ['samhain', 'yule', 'imbolc', 'ostara', 'beltane', 'litha', 'lammas', 'mabon'];

function sabbatsOfYear(y) {
  const loc = jd => isoOf(jdToDate(jd));
  return [
    { key: 'imbolc', start: y + '-02-01', end: y + '-02-02' },
    { key: 'ostara', start: loc(seasonJDE(y, 0)) },
    { key: 'beltane', start: y + '-04-30', end: y + '-05-01' },
    { key: 'litha', start: loc(seasonJDE(y, 1)) },
    { key: 'lammas', start: y + '-08-01' },
    { key: 'mabon', start: loc(seasonJDE(y, 2)) },
    { key: 'samhain', start: y + '-10-31', end: y + '-11-01' },
    { key: 'yule', start: loc(seasonJDE(y, 3)) },
  ].map(s => Object.assign(s, { end: s.end || s.start }));
}

export function upcomingSabbats(iso, count = 6) {
  const y = +iso.slice(0, 4);
  return [...sabbatsOfYear(y - 1), ...sabbatsOfYear(y), ...sabbatsOfYear(y + 1)].filter(s => s.end >= iso).slice(0, count);
}

export function sabbatRange(s) {
  return s.start === s.end
    ? fmtDate(s.start, { year: true, weekday: false })
    : fmtDate(s.start, { weekday: false }) + '–' + fmtDate(s.end, { year: true, weekday: false });
}

export function seasonalInfo(iso) {
  const d = new Date(iso + 'T12:00:00');
  const m = d.getMonth() + 1;
  const daynum = d.getDate();
  if ((m === 10 && daynum >= 15) || (m === 11 && daynum <= 1)) return { name: 'Samhain', intro: 'Samhain Hearth: cozy remembrance, autumn light, and a welcoming home.' };
  if ((m === 11 && daynum >= 2) || (m === 12 && daynum < 21)) return { name: 'Yule', intro: 'Yule Hearth: warm light, evergreen touches, blankets, and comfort through the dark.' };
  if ((m === 12 && daynum >= 21) || m === 1 || (m === 2 && daynum <= 2)) return { name: 'Imbolc', intro: 'Imbolc Hearth: tending the flame, fresh starts, seedlings, and a cared-for hearth.' };
  if (m === 2 || (m === 3 && daynum < 20)) return { name: 'Ostara', intro: 'Ostara Home: fresh greens, open windows when weather allows, and signs of spring.' };
  if ((m === 3 && daynum >= 20) || m === 4 || (m === 5 && daynum < 1)) return { name: 'Beltane', intro: 'Beltane Home: flowers, color, creativity, and a little joyful abundance.' };
  if (m === 5 || (m === 6 && daynum < 21)) return { name: 'Litha', intro: 'Litha Home: sunshine, bright corners, and celebrating the light.' };
  if ((m === 6 && daynum >= 21) || m === 7 || (m === 8 && daynum < 1)) return { name: 'Lammas', intro: 'Lammas Home: bread, pantry comforts, handmade goods, and first harvest.' };
  if (m === 8 || (m === 9 && daynum < 22)) return { name: 'Mabon', intro: 'Mabon Home: harvest colors, gratitude, cozy layers, and balancing the home.' };
  return { name: 'Samhain', intro: 'Samhain Hearth: cozy remembrance, autumn light, and a welcoming home.' };
}

export function phaseOfDay(day, iso) {
  const w = day?.witchy;
  if (w?.moonPhaseManual && w.moonPhase) return w.moonPhase;
  return moonPhaseFor(iso).phase;
}

export function sabbatOfDay(day, iso) {
  const w = day?.witchy;
  if (w?.sabbatManual && w.sabbatChoice) return w.sabbatChoice;
  return upcomingSabbats(iso, 1)[0].key;
}
