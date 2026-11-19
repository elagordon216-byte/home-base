import { esc, panel, taskButton } from './html.js';
import { dateShift, fmtDate, fmtTime, isoOf, weekStart, weekday, WEEKDAYS } from './dates.js';
import { DAY_TYPES, dayNotice, dayTypeName, dayTypeOf, essentialsOn, morningNovelOptional, noWriting, preschoolUnlikely } from './days.js';
import { FOCUS_LABELS, LEVEL_NAMES, MAIN_CLEAN, TASK_ROOMS, focusRoomIds, roomViews } from './rooms.js';
import { nowCard } from './now.js';
import { badgeList } from './badges.js';
import { isCarried, canPick } from './quests.js';
import { statsOf } from './stats.js';
import { DAY_PLAN, PEN_BY_WEEKDAY, findPen } from './tracker.js';
import { currentStreak, dayXP, levelProgress, totalXP } from './xp.js';
import { labelForKey, snapshotFor } from './snapshot.js';
import { phaseOfDay, sabbatOfDay, sabbatRange, seasonalInfo, upcomingSabbats, moonPhaseFor, nextMoonEvent, PHASE_NAMES, PRINCIPAL, SABBAT_INFO } from './moon.js';
import { priorityName, tpl } from './labels.js';
import {
  BADDAY_ITEMS, EF_BONUSES, LIST_GROUPS, TIMER_MILESTONES, levelRewardCatalog, lunarPhaseData,
  projectStages, sabbatData, seasonalCatalog,
} from './v2-data.js';

const TABS = [
  ['home', '🏡 Home'],
  ['today', '✅ Today'],
  ['write', '📚 Write'],
  ['witchy', '🌙 Witchy'],
  ['log', '🌙 Log'],
  ['plan', '🗓️ Plan'],
  ['rewards', '🏆 Rewards'],
];

const GROUP_TITLES = {
  morning: ['☀️ Morning launch', 'Family basics'],
  home: ['🍽️ Kitchen & home reset', 'Functional, not perfect'],
  laundry: ['🧺 Laundry Mountain', 'Clean backlog'],
  author: ['📚 Author tasks', 'Short blocks count'],
  evening: ['🌙 Evening shutdown', 'Close Home Base'],
};

const WITCHY_DAILY = [
  ['ground', 'Grounding moment — breathe, notice the weather, or step outside briefly.', '1–3 minutes; counts even on a busy day.'],
  ['astro', 'Check daily astrology and choose one practical intention.', 'Keep it brief; no need to research every transit.'],
  ['card', 'Morning card pull or evening reflection.', 'Use your card as a journaling prompt, not a command.'],
  ['hearth', 'One small hearth/kitchen blessing or mindful home task.', 'Stir a meal with an intention, refresh altar water, or tidy one meaningful spot.'],
  ['close', 'Close the day: gratitude, release, or one sentence in a grimoire.', 'Skip freely when you need sleep.'],
];

const WEEKLY_WITCH = [
  ['Monday — Hearth & protection', 'Set a household intention; refresh one small home or altar area while doing the bathroom and batch-cooking routine.'],
  ['Tuesday — Kitchen witchery', 'Bread day: an intention for nourishment, a recipe note, or a kitchen blessing. No writing required.'],
  ['Wednesday — Study & divination', 'Pull a card, read a short reference, or add one note to your grimoire.'],
  ['Thursday — Craft & growth', 'Fiber craft, seasonal making, plant care, or baking with an intention.'],
  ['Friday — Beauty & gratitude', 'Seasonal decor, a self-care ritual, or three things to celebrate.'],
  ['Saturday — Nature & connection', 'Notice the season outdoors, or a family-friendly seasonal activity.'],
  ['Sunday — Reflection & reset', 'A weekly spread, a look at the coming week, one tiny intention. No writing required.'],
];

const DECOR = {
  'samhain-candle': '🕯️', 'ancestor-shelf': '🖼️', 'autumn-wreath': '🍂', 'winter-throw': '🧶',
  'evergreen-garland': '🌿', 'star-lantern': '🏮', 'seedling-pot': '🪴', 'hearth-basket': '🧺',
  'spring-herbs': '🌱', 'flower-cushion': '🌸', 'summer-lantern': '☀️', 'harvest-bowl': '🥣',
  'autumn-blanket': '🍁', 'houseplant': '🪴', 'book-nook': '📚', 'storage-basket': '🧺',
};

const SHOP = [
  [10, 'Tiny reward', 'Tea or coffee in peace, one favorite song, or 10 minutes of a cozy hobby.'],
  [25, 'Small reward', 'Short guilt-free hobby time, a special snack, or a little comfort within budget.'],
  [50, 'Medium reward', 'A planned treat, a longer craft session, or another meaningful reset.'],
  [100, 'Big reward', 'A bigger planned treat or experience you’ve been saving for.'],
  [250, 'Boss reward', 'Your major saved-for reward. Current goal is on the reward line above.'],
];

function checked(state, date, key) {
  return !!state.days[date]?.checks?.[key];
}

function openPanel(state, id) {
  return !state.ui?.collapsed?.[id];
}

export function tabsHTML(state) {
  const tab = state.ui?.tab || 'home';
  return TABS.map(([id, label]) => `<button type="button" class="${tab === id ? 'on' : ''}" data-act="tab" data-tab="${id}" role="tab" aria-selected="${tab === id}">${label}</button>`).join('');
}

export function bannerHTML(state, today) {
  const parts = [];
  if (state.demo) parts.push(`<div class="notice"><strong>Demo preview.</strong> Nothing here is saved. <button type="button" class="secondary small" data-act="exit-demo">Back to my Home Base</button></div>`);
  const up = state.upgrade;
  if (up && !up.seen) {
    parts.push(`<div class="notice"><strong>Your backup is in.</strong> XP, Hearthgold, and tasks came over as they were. Badges start from what you do next. Rooms start at Waking. <button type="button" class="small" data-act="dismiss-upgrade">Got it</button></div>`);
  }
  const due = !state.lastBackup || (Date.now() - Date.parse(state.lastBackup)) > 7 * 864e5;
  const snoozed = state.backupSnooze && Date.now() < Date.parse(state.backupSnooze);
  if (due && !snoozed && Object.keys(state.days || {}).length && !state.demo) {
    parts.push(`<div class="notice"><strong>Backup reminder.</strong> ${state.lastBackup ? 'Last backup ' + esc(fmtDate(state.lastBackup.slice(0, 10))) + '.' : 'No backup from this app yet.'} Your progress lives on this phone. <button type="button" class="small" data-act="export">Export now</button> <button type="button" class="secondary small" data-act="snooze-backup">Tomorrow</button></div>`);
  }
  if (!parts.length) return '';
  return `<div class="banner">${parts.join('')}</div>`;
}

function nowHTML(state, today, minutes) {
  const card = nowCard(state, { iso: today, minutes });
  const tasks = card.tasks.map(t => taskButton({
    kind: t.id.startsWith('bd-') ? 'essential' : (t.id === 'morning-novel' ? 'novel' : 'task'),
    id: t.id,
    label: t.label,
    xp: t.xp ? t.xp + ' XP' : '',
    done: false,
  })).join('');
  const empty = card.cleared ? '<p class="muted">This part of the day is clear. That’s enough.</p>' : '';
  return `<section class="panel">
    <div class="head"><h2>Now · ${esc(card.title)}</h2><span class="pill">${esc(card.range)}</span></div>
    ${card.unconfirmed ? '<p class="flag">Unconfirmed hours</p>' : ''}
    ${card.note ? `<p class="muted">${esc(card.note)}</p>` : ''}
    <div class="tasks">${tasks}${empty}</div>
  </section>`;
}

function roomButton(view, selected, baskets) {
  const l = view.level;
  const messO = [1, .7, .35, .05, 0][l];
  const sparkO = [0, .15, .45, .85, 1][l];
  const spots = [[8, 60, 14, 10], [60, 86, 10, 10], [78, 40, 16, 9], [30, 80, 9, 12]];
  const mess = `<div class="mess" style="opacity:${messO}">${spots.map(s => `<span style="left:${s[0]}%;top:${s[1]}%;width:${s[2]}px;height:${s[3]}px"></span>`).join('')}</div>`;
  const spark = `<div class="sparkles" style="opacity:${sparkO}"><em style="left:70%;top:18%">✦</em><em style="left:84%;top:52%">✧</em><em style="left:12%;top:60%">✦</em></div>`;
  let icon = `<span class="ico">${view.icon}</span>`;
  if (view.id === 'laundry') {
    icon = `<div class="baskets">${(baskets || []).slice(0, 5).map((b, i) => `<u class="${b.emptied ? 'e' : ''}" style="background:${['#d8b17b', '#c5d3bd', '#d7c3d9', '#d9c9ad', '#b8d0d5'][i] || '#ddd'}"></u>`).join('')}</div>`;
  }
  const flag = view.gain ? `<span class="gain">+${view.gain} today</span>` : (view.focus ? '<span class="focusflag">⭐ focus</span>' : '');
  const fade = !view.gain && l > 0 && !view.paused ? `<span class="fadein">${view.untouched}/7</span>` : '';
  return `<button type="button" class="room${l === 4 ? ' spark' : ''}${selected === view.id ? ' sel' : ''}" style="background:${view.fill}" data-act="room" data-id="${view.id}" aria-label="${esc(view.name)}, ${esc(view.levelName)}, ${view.levelNumber} of 5">
    ${mess}${spark}<b>${esc(view.name).replace('/', '/<wbr>')}</b>${icon}
    <span class="lv">${esc(view.levelName)}${l === 4 ? ' ✨' : ''} · ${view.levelNumber}/5</span>
    <div class="pips">${[0, 1, 2, 3, 4].map(i => `<i class="${i <= l ? 'f' : ''}"></i>`).join('')}</div>
    ${flag}${fade}
  </button>`;
}

function homeHTML(state, today, minutes) {
  const views = roomViews(state, today);
  const selected = state.ui.room || views.find(v => v.focus)?.id || 'kitchen';
  const room = views.find(v => v.id === selected) || views[0];
  const wd = weekday(today);
  const baskets = (state.baskets || []).filter(b => !b.archived).map(b => ({ ...b, emptied: checked(state, today, 'basket:' + b.id) }));
  const focus = focusRoomIds(wd);
  const tasks = [];
  for (const [id, rooms] of Object.entries(TASK_ROOMS)) {
    if (!rooms.includes(room.id)) continue;
    const found = findTask(state, id);
    if (!found || found.task.archived) continue;
    tasks.push(taskButton({
      kind: 'task', id, label: tpl(state, found.task.label),
      sub: rooms.length > 1 ? 'Also counts for ' + rooms.filter(r => r !== room.id).map(r => views.find(v => v.id === r)?.name).join(', ') : '',
      xp: found.task.xp + ' XP', done: checked(state, today, 'task:' + id),
    }));
  }
  for (const b of state.baskets || []) {
    if (b.archived && !checked(state, today, 'basket:' + b.id)) continue;
    const owners = { basket0: ['laundry', 'mine'], basket1: ['laundry', 'mine'], basket2: ['laundry', 'kids'], basket3: ['laundry', 'kids'], basket4: ['laundry'] };
    const rooms = owners[b.id] || ['laundry'];
    if (!rooms.includes(room.id)) continue;
    tasks.push(taskButton({
      kind: 'basket', id: b.id, label: 'Emptied: ' + b.name,
      sub: rooms.length > 1 ? 'Also counts for ' + rooms.filter(r => r !== room.id).map(r => views.find(v => v.id === r)?.name).filter(Boolean).join(', ') + ' · XP once' : 'Laundry only · XP once',
      xp: '2 XP', done: checked(state, today, 'basket:' + b.id),
    }));
  }
  if (!tasks.length && room.id === 'bath') tasks.push('<p class="muted">No daily task lives here. It brightens from Monday’s cleaning focus, or from a Friday whole-house reset.</p>');
  const bonus = focus.length ? 1 : 0;
  const mainSub = focus.length
    ? 'Counts for ' + (focus.length >= 6 ? 'every room' : focus.map(id => views.find(v => v.id === id)?.name).join(', ')) + ' · 1 XP + 1 focus bonus'
    : 'No room focus today, so no bonus and no room credit';
  const decor = (state.goldInventory || []).map(item => `<span>${DECOR[item.id] || '✨'} ${esc(item.name)}</span>`).join('');
  const xp = dayXP(state, today);
  return [
    nowHTML(state, today, minutes),
    `<section class="panel">
      <div class="head"><h2>Your house</h2><span class="pill">${esc(fmtDate(today))} · ${esc(WEEKDAYS[wd])}</span></div>
      <div class="house">
        <svg class="roof" viewBox="0 0 520 78" aria-hidden="true"><path d="M25 74 L260 8 L495 74 Z" fill="#8a6657" stroke="#60493e" stroke-width="4"/><path d="M70 70 L260 22 L450 70" fill="none" stroke="#b98e75" stroke-width="7"/><circle cx="452" cy="28" r="16" fill="#f2d98a"/></svg>
        <div class="rooms">${views.map(v => roomButton(v, selected, baskets)).join('')}</div>
      </div>
      <p class="muted">Tap a room. Five levels, and the top one sparkles. Fading never takes XP. ${room.paused ? 'Fading is paused today.' : 'Quiet rooms dim one level after 7 untouched days.'}</p>
      <div class="stats">
        <div class="stat"><span>Today’s XP</span><strong>${xp}</strong></div>
        <div class="stat"><span>Total XP</span><strong>${totalXP(state)}</strong></div>
        <div class="stat"><span>Level</span><strong>${levelProgress(totalXP(state)).level}</strong></div>
      </div>
      ${decor ? `<div class="decor" style="margin-top:10px">${decor}</div>` : ''}
    </section>`,
    `<section class="panel">
      <div class="head"><h2>${room.icon} ${esc(room.name)}</h2><span class="pill">${esc(room.levelName)} · ${room.levelNumber}/5</span></div>
      <p class="muted">${room.focus ? '⭐ Today’s cleaning focus is here (' + esc(FOCUS_LABELS[wd]) + '). This room climbs 2 levels if you do a task here.' : 'Any task here climbs this room 1 level today.'}</p>
      <div class="tasks">${tasks.join('')}</div>
      <div class="tasks" style="margin-top:8px">${taskButton({
        kind: 'task', id: MAIN_CLEAN, label: 'Today’s main cleaning task', sub: mainSub,
        xp: (1 + bonus) + ' XP', done: checked(state, today, 'task:' + MAIN_CLEAN),
      })}</div>
    </section>`,
    questHTML(state, today),
    focusHTML(state, today),
    characterHTML(state, today, true),
  ].join('');
}

function findTask(state, id) {
  for (const g of Object.keys(state.lists || {})) {
    const t = (state.lists[g] || []).find(t => t.id === id);
    if (t) return { task: t, group: g };
  }
  return null;
}

function questHTML(state, today) {
  const q = state.quests.active;
  let body = '<p class="muted">Pick one quest. An unfinished one stays until it’s done, and then you can pick another. +5 XP at halfway and +5 XP when it’s done. Boss battles are saved for later.</p>';
  if (q) {
    const carried = isCarried(q, today);
    const progress = q.kind === 'laundry-mountain' && q.progress ? `${q.progress.done}/${q.progress.total} baskets put away` : esc(q.detail);
    body += `<div class="card"><strong>${esc(q.name)}</strong><small>${carried ? 'Carried over from last week. Finish this before a new one. ' : ''}${progress}</small>
      <small>${q.halfOn ? 'Halfway paid. ' : ''}${q.doneOn ? 'Done. ' : ''}</small></div>`;
    if (q.kind !== 'laundry-mountain' && !q.doneOn) {
      body += `<div class="row" style="margin-top:8px">
        <button type="button" class="secondary" data-act="quest-step" data-flag="half" data-on="${q.halfOn ? '0' : '1'}">${q.halfOn ? 'Halfway done' : 'Mark halfway · +5'}</button>
        <button type="button" data-act="quest-step" data-flag="done" data-on="1">Mark done · +5</button>
      </div>`;
    }
    if (q.doneOn) body += '<p class="muted">That’s the whole +10. You can pick another quest whenever you want.</p>';
  }
  if (canPick(state, today)) {
    body += '<div class="tasks" style="margin-top:8px">';
    for (const item of state.quests.catalog) {
      if (q && item.id === q.questId && !q.doneOn) continue;
      body += `<button type="button" class="task" data-act="quest-pick" data-id="${esc(item.id)}"><span class="t">${esc(item.name)}<small>${esc(item.detail)}</small></span><span class="xp">+10</span></button>`;
    }
    body += '</div>';
    body += `<div class="row" style="margin-top:8px"><input id="questName" type="text" placeholder="Your own quest name"><input id="questDetail" type="text" placeholder="What done means"></div>
      <button type="button" class="secondary" style="margin-top:8px" data-act="add-quest">Add my quest</button>`;
  }
  return panel('Weekly quest', body, { id: 'quest', pill: q ? (q.doneOn ? 'Done' : 'In progress') : 'Pick one', open: openPanel(state, 'quest') });
}

function focusHTML(state, today) {
  const wd = weekday(today);
  const d = state.days[today] || {};
  const w = d.witchy || {};
  const phase = phaseOfDay(d, today);
  const sab = sabbatOfDay(d, today);
  const lunarTasks = (lunarPhaseData[phase] || lunarPhaseData.new).tasks;
  const sabTasks = (sabbatData[sab] || sabbatData.samhain).tasks;
  const witchDone = WITCHY_DAILY.filter(([id]) => w.checks?.[id]).length;
  const lunarDone = lunarTasks.filter(([id]) => w.lunarChecks?.[phase + ':' + id]).length;
  const sabDone = sabTasks.filter(([id]) => w.sabbatChecks?.[sab + ':' + id]).length;
  const authorList = (state.lists.author || []).filter(t => !t.archived);
  const authorDone = authorList.filter(t => d.checks?.['task:' + t.id]).length;
  const cards = [
    ['Author', noWriting(d, today) ? 'No writing today. Rest is part of the plan.' : `${authorDone}/${authorList.length} author tasks. Priority: ${priorityName(state)}.`, 'write'],
    ['Kitchen', d.checks?.['task:h-dishes'] ? 'Kitchen reset is checked.' : 'Dishes and kitchen reset are the daily anchor.', 'today'],
    ['Cleaning focus', FOCUS_LABELS[wd] + (d.checks?.['focus:weekly-cleaning'] ? ' · noted' : ''), 'plan'],
    ['Witchy', `${witchDone}/5 daily · ${PHASE_NAMES[phase]} ${lunarDone}/${lunarTasks.length} · ${SABBAT_INFO[sab].name} ${sabDone}/${sabTasks.length}`, 'witchy'],
  ];
  const body = `<div class="tasks">${cards.map(([title, detail, tab]) => `<div class="card"><strong>${esc(title)}</strong><small>${esc(detail)}</small><button type="button" class="secondary small" style="margin-top:8px" data-act="tab" data-tab="${tab}">Open</button></div>`).join('')}</div>`;
  return panel('Today’s focus', body, { id: 'focus', open: openPanel(state, 'focus') });
}

function characterHTML(state, today, compact) {
  const total = totalXP(state);
  const prog = levelProgress(total);
  const stats = statsOf(state);
  const max = Math.max(10, stats.hearth, stats.craft, stats.spirit, 1);
  const bar = (label, value, note) => `<div><div class="bar-label"><span>${label}</span><strong>${value}</strong></div><div class="progress"><span style="width:${Math.min(100, value / max * 100)}%"></span></div>${note ? `<small class="muted">${note}</small>` : ''}</div>`;
  const earned = badgeList(state).filter(b => b.earned);
  const badges = (compact ? earned.slice(-4) : badgeList(state)).map(b => `<div class="badge${b.earned ? ' on' : ''}"><b>${b.earned ? '✦ ' : ''}${esc(b.name)}</b><span>${esc(b.detail)}${b.earned ? ' · +5 gold' : ''}</span></div>`).join('');
  const name = esc(state.profile?.name || 'Ela');
  const klass = esc(state.profile?.className || 'Domestic Mage / Author');
  if (compact) {
    return `<section class="hero"><div class="head"><h2>${name}</h2><span class="pill">${klass}</span></div>
      <p>Level ${prog.level} · ${total} XP</p>
      <div class="bars">${bar('Hearth', stats.hearth)}${bar('Craft', stats.craft)}${bar('Spirit', stats.spirit, stats.practices ? stats.practices + ' witchy practices included' : '')}</div>
      <button type="button" class="secondary" style="margin-top:10px" data-act="tab" data-tab="rewards">Character sheet</button>
    </section>`;
  }
  return `<section class="hero">
    <label class="field" style="color:#e4eee7">Name<input id="profileName" data-bind="profile-name" type="text" value="${name}"></label>
    <label class="field" style="color:#e4eee7">Class<input id="profileClass" data-bind="profile-class" type="text" value="${klass}"></label>
    <p style="margin:8px 0 0">Level ${prog.level} · ${esc(prog.label)}</p>
    <div class="bars">${bar('Hearth', stats.hearth, 'Home, kitchen, laundry, kids')}${bar('Craft', stats.craft, 'Author work and the morning novel')}${bar('Spirit', stats.spirit, stats.practices ? stats.spiritXP + ' XP + ' + stats.practices + ' witchy practices (practices are not XP)' : 'Self-care and quick wins')}</div>
    <p class="muted">Stats are a mirror. They never change your XP.</p>
  </section>
  <section class="panel"><h2>Badges</h2><p class="muted">Each new badge pays +5 Hearthgold once. Streak XP is still +10 / +20 / +35.</p><div class="badges">${badges}</div></section>`;
}

function listTasks(state, date, group) {
  const day = state.days[date] || { checks: {}, custom: [], notes: {} };
  if (state.ui.editing === group) {
    const rows = (state.lists[group] || []).filter(t => !t.archived).map(t => `<div class="task-line">
      <input data-bind="task-label" data-group="${group}" data-id="${esc(t.id)}" type="text" value="${esc(t.label)}" aria-label="Task name">
      <select data-bind="task-xp" data-group="${group}" data-id="${esc(t.id)}" aria-label="XP">${[1, 2, 3, 5].map(n => `<option value="${n}"${n === t.xp ? ' selected' : ''}>${n} XP</option>`).join('')}</select>
      <button type="button" class="icon-btn" data-act="archive-task" data-group="${group}" data-id="${esc(t.id)}" aria-label="Remove">×</button>
    </div>`).join('');
    return rows + `<div class="row"><input id="new-${group}" type="text" placeholder="New everyday task"><button type="button" class="small" data-act="add-recurring" data-group="${group}">Add</button></div>`;
  }
  const rows = (state.lists[group] || []).filter(t => !t.archived || day.checks['task:' + t.id]).map(t => {
    let sub = '+' + t.xp + ' XP';
    if (t.id === 'm-preschool' && preschoolUnlikely(day.notes, date)) sub += ' · probably not needed today';
    if (t.id === MAIN_CLEAN && focusRoomIds(weekday(date)).length) sub = '1 XP + 1 focus bonus';
    return taskButton({ kind: 'task', id: t.id, label: tpl(state, t.label), sub, xp: (t.id === MAIN_CLEAN && focusRoomIds(weekday(date)).length ? t.xp + 1 : t.xp) + ' XP', done: !!day.checks['task:' + t.id] });
  });
  if (group === 'morning') {
    const optional = morningNovelOptional(date);
    rows.unshift(taskButton({
      kind: 'novel', id: 'morning-novel',
      label: 'Morning novel · ' + (state.morningNovel?.title || 'your novel'),
      sub: optional ? 'Optional today. No nudge if you skip it. +3 XP if you do it.' : '10–30 minutes on the current novel. +3 XP.',
      xp: '3 XP', done: !!day.checks['task:morning-novel'],
    }));
  }
  if (group === 'home') {
    for (const c of day.custom || []) {
      if (c.removed) continue;
      rows.push(`<div class="task-line">${taskButton({ kind: 'custom', id: c.id, label: c.label, sub: '+' + (c.xp || 1) + ' XP · just for ' + fmtDate(date), xp: (c.xp || 1) + ' XP', done: !!day.checks['task:' + c.id] })}<button type="button" class="icon-btn" data-act="remove-custom" data-id="${esc(c.id)}" aria-label="Remove">×</button></div>`);
    }
  }
  return `<div class="tasks">${rows.join('')}</div>`;
}

function todayHTML(state, todayReal, minutes) {
  const date = state.date || todayReal;
  const day = state.days[date] || { checks: {}, notes: {}, custom: [] };
  const type = dayTypeOf(day.notes, date);
  const energy = day.notes?.energy || 'medium';
  const essentials = essentialsOn(day, date);
  const total = totalXP(state);
  const prog = levelProgress(total);
  const streak = currentStreak(state, todayReal);
  const typeButtons = DAY_TYPES.map(t => `<button type="button" class="${type === t.id ? 'on' : ''}" data-act="day-type" data-id="${t.id}">${esc(t.short)}</button>`).join('');
  const energyButtons = ['low', 'medium', 'high'].map(e => `<button type="button" class="${energy === e ? 'on' : ''}" data-act="energy" data-id="${e}">${e[0].toUpperCase() + e.slice(1)}</button>`).join('');
  const essentialsBody = essentials ? `<div class="tasks">${BADDAY_ITEMS.map(([id, label]) => taskButton({ kind: 'essential', id, label, sub: 'Part of the four. All four pay +10 XP.', xp: '', done: !!day.checks['bad:' + id] })).join('')}</div>
    <button type="button" class="secondary" style="margin-top:8px" data-act="show-full">${day.showFull ? 'Hide the full checklist' : 'Show the full checklist'}</button>` : '<p class="muted">Hard day? Turn this on for the four essentials. Sick Day and Hyperfocus turn it on by themselves, and low energy does too.</p>';
  const lists = LIST_GROUPS.filter(g => g !== 'author').map(g => {
    const [title, pill] = GROUP_TITLES[g];
    const edit = state.ui.editing === g;
    return panel(`${title} <button type="button" class="secondary small" data-act="edit-list" data-group="${g}">${edit ? 'Done' : 'Edit'}</button>`, listTasks(state, date, g), { id: 'list-' + g, pill, open: openPanel(state, 'list-' + g) });
  }).join('');
  const baskets = (state.baskets || []).filter(b => !b.archived || day.checks['basket:' + b.id]).map(b => `<div class="task-line">${taskButton({ kind: 'basket', id: b.id, label: b.name, sub: (day.checks['basket:' + b.id] ? 'Emptied and put away' : 'Clean laundry waiting') + ' · +2 XP', xp: '2 XP', done: !!day.checks['basket:' + b.id] })}${b.archived ? '' : `<button type="button" class="icon-btn" data-act="remove-basket" data-id="${esc(b.id)}" aria-label="Remove basket">×</button>`}</div>`).join('');
  const todos = (state.todos || []).filter(t => !t.archived && (!t.done || t.done === date));
  const todoRows = todos.map(t => `<div class="task-line">${taskButton({ kind: 'todo', id: t.id, label: t.label, sub: (t.done === date ? 'Done today' : (t.created && t.created < date ? 'Carried over since ' + fmtDate(t.created) : 'Stays until done')) + ' · +' + (t.xp || 1) + ' XP', xp: (t.xp || 1) + ' XP', done: t.done === date })}${`<button type="button" class="icon-btn" data-act="remove-todo" data-id="${esc(t.id)}" aria-label="Delete">×</button>`}</div>`).join('') || '<p class="muted">Nothing waiting. A to-do stays until you finish it.</p>';
  const quick = EF_BONUSES.map(([id, label, amt]) => `<button type="button" class="secondary" data-act="quick" data-id="${esc(id)}" data-xp="${amt}" data-label="${esc(label.replace(/^\S+\s/, ''))}">${esc(label)} <strong>+${amt}</strong></button>`).join('');
  const showLists = !essentials || day.showFull;
  return `<section class="panel">
      <label class="field">Date<input id="day" data-bind="date" type="date" value="${esc(date)}"></label>
      <p class="muted">${esc(fmtDate(date, { year: true }))}${date === todayReal ? ' · today' : ''}${date !== todayReal ? ' · room levels stay on today' : ''}</p>
      <div class="seg two" style="margin-top:8px">${typeButtons}</div>
      <p class="muted">${esc(DAY_TYPES.find(t => t.id === type)?.hint || '')} ${day.notes?.dayType ? '' : 'Set from the weekday.'}</p>
      <div class="seg three">${energyButtons}</div>
      <div class="notice" style="margin-top:8px">${esc(dayNotice(type, energy, date))}</div>
      <div class="stats" style="margin-top:10px">
        <div class="stat"><span>XP today</span><strong>${dayXP(state, date)}</strong></div>
        <div class="stat"><span>Total XP</span><strong>${total}</strong></div>
        <div class="stat"><span>Level</span><strong>${prog.level}</strong></div>
      </div>
      <p class="muted">${esc(prog.label)} · ${streak ? '🔥 ' + streak + '-day streak' : '🔥 A streak can start today'}</p>
      <div class="progress"><span style="width:${prog.ratio}%"></span></div>
      <label class="field">Reward goal<input id="reward" data-bind="reward" type="text" value="${esc(state.reward || '')}"></label>
    </section>
    ${date === todayReal ? nowHTML(state, todayReal, minutes) : ''}
    <section class="panel" style="${essentials ? 'border-color:var(--gold);background:#fff8e6' : ''}">
      <div class="head"><h2>🛟 Essentials</h2><button type="button" class="secondary small" data-act="bad-toggle">${essentials ? 'Turn off' : 'Turn on'}</button></div>
      ${essentialsBody}
    </section>
    ${questHTML(state, date)}
    ${panel('⚡ Quick wins', `<p class="muted">One tap each time it happens. Hard starts count.</p><div class="quick">${quick}</div>`, { id: 'quick', open: openPanel(state, 'quick') })}
    ${showLists ? lists : ''}
    ${showLists ? panel('🧺 Baskets', `<p class="muted">A basket counts when the clean laundry is folded and fully put away. XP is paid once, and it also brightens the owner’s room. Towels and bedding brighten laundry only.</p><div class="tasks">${baskets}</div><div class="row" style="margin-top:8px"><input id="newBasket" type="text" placeholder="Basket name"><button type="button" class="small" data-act="add-basket">Add basket</button></div>`, { id: 'baskets', open: openPanel(state, 'baskets') }) : ''}
    ${showLists ? panel('📞 To-dos', `<div class="tasks">${todoRows}</div><div class="row" style="margin-top:8px"><input id="newTodo" type="text" placeholder="Add a to-do (it carries over)"><button type="button" class="small" data-act="add-todo">Add</button></div><label class="field">Notes<textarea id="adminNotes" data-bind="note" data-key="admin">${esc(day.notes?.admin || '')}</textarea></label>`, { id: 'todos', open: openPanel(state, 'todos') }) : ''}
    ${showLists ? `<section class="panel"><div class="row"><input id="newTask" type="text" placeholder="Add a task for today"><button type="button" class="small" data-act="add-task">Add</button></div><label class="muted" style="display:flex;gap:8px;align-items:center;min-height:44px"><input id="repeatTask" type="checkbox" style="width:22px;height:22px"> Repeat every day</label></section>` : ''}
    ${panel('📝 Brain dump', `<textarea id="brain" data-bind="note" data-key="brain">${esc(day.notes?.brain || '')}</textarea><label class="field">Shutdown note<input id="shutdown" data-bind="note" data-key="shutdown" type="text" value="${esc(day.notes?.shutdown || '')}"></label><div class="row"><button type="button" data-act="clear-today" class="secondary">Clear today’s checkboxes</button></div>`, { id: 'brain', open: openPanel(state, 'brain') })}
    ${backupHTML(state)}`;
}

function backupHTML(state) {
  const when = state.lastBackup ? fmtDate(String(state.lastBackup).slice(0, 10)) : 'not yet';
  return `<section class="panel">
    <div class="head"><h2>💾 Backup & restore</h2><span class="pill">Last: ${esc(when)}</span></div>
    <p class="muted">Everything important stays on this phone. Export a file named home-base-backup-YYYY-MM-DD.json. This app reads your old v2 backup, and a backup from this app reads back in.</p>
    <div class="row"><button type="button" data-act="export">Export full backup</button><button type="button" class="secondary" data-act="copy-backup">Copy as text</button></div>
    <label class="field">Restore from a file<input id="importFile" type="file" accept=".json,application/json,text/plain"></label>
    <details><summary class="muted">Or paste backup text</summary><textarea id="restoreText" placeholder="Paste backup text"></textarea><button type="button" class="secondary" data-act="import-text">Restore pasted text</button></details>
    <p id="importMsg" class="notice" hidden></p>
  </section>
  <section class="panel placeholder">
    <h2>Google Drive auto-backup</h2>
    <p><span class="flag">Not set up yet</span></p>
    <p>Sign-in isn’t designed, so this does not connect to Google and nothing is uploaded. Export a backup and put the file in Drive yourself. Manual backup and restore above work today.</p>
  </section>`;
}

function writeHTML(state, today) {
  const date = state.date || today;
  const day = state.days[date] || { notes: {}, checks: {} };
  const wd = weekday(date);
  const penId = PEN_BY_WEEKDAY[wd];
  const pen = penId ? findPen(state.penNames, penId) : null;
  const nw = noWriting(day, date);
  const banner = pen
    ? `<section class="hero"><p class="muted">${esc(DAY_PLAN[wd])}</p><h2>${esc(pen.name)}</h2><p>${esc(pen.blurb || '')}</p></section>`
    : `<section class="hero"><h2>${wd === 2 ? 'Tuesday · no writing' : wd === 0 ? 'Sunday · no writing' : 'Low / no work'}</h2><p>${esc(DAY_PLAN[wd])}</p></section>`;
  const novel = state.morningNovel || { title: 'Sophomore Year', mode: 'editing' };
  const optional = morningNovelOptional(date);
  const novelBlock = `<section class="panel">
    <h2>Morning novel</h2>
    <p class="muted">${optional ? 'Optional today. Skipping it is fine, and doing it still pays +3 XP.' : 'Begin the day with 10–30 minutes. +3 XP.'}</p>
    <label class="field">Current novel<input id="novelTitle" data-bind="novel-title" type="text" value="${esc(novel.title || '')}"></label>
    <label class="field">What you’re doing<input id="novelMode" data-bind="novel-mode" type="text" value="${esc(novel.mode || '')}"></label>
    ${taskButton({ kind: 'novel', id: 'morning-novel', label: 'Did the morning novel block', sub: novel.title, xp: '3 XP', done: !!day.checks['task:morning-novel'] })}
  </section>`;
  const tracker = (state.penNames || []).map(p => seriesHTML(state, p, p.id === penId || state.ui.openPen === p.id)).join('');
  const authorTasks = nw ? '' : panel('Author tasks', listTasks(state, date, 'author') + timerHTML(state, date), { id: 'author-tasks', open: true });
  const override = `<div class="notice">${nw
    ? `<strong>No writing ${wd === 2 ? 'on Tuesday' : wd === 0 ? 'on Sunday' : 'on a sick day'}.</strong> Rest counts. <button type="button" class="secondary small" data-act="write-anyway">Writing anyway today</button>`
    : (day.authorOverride ? `<strong>Writing anyway today.</strong> Keep it short. <button type="button" class="secondary small" data-act="undo-override">Back to no-writing</button>` : '')}
  </div>`;
  return banner + novelBlock + (nw || day.authorOverride ? override : '') + tracker + authorTasks + projectsHTML(state) + protocolHTML(state);
}

function seriesHTML(state, pen, open) {
  if (!open) {
    return `<section class="panel"><button type="button" class="task" data-act="open-pen" data-id="${esc(pen.id)}"><span class="t">${esc(pen.name)}<small>${esc(pen.blurb || '')}</small></span></button></section>`;
  }
  const blocks = pen.series.map(series => {
    const items = series.items || [];
    const done = items.filter(i => i.status === 'done').length;
    let inner;
    if (items.length > 8) {
      const seasons = new Map();
      for (const item of items) {
        const s = item.season || 1;
        if (!seasons.has(s)) seasons.set(s, []);
        seasons.get(s).push(item);
      }
      inner = [...seasons.entries()].map(([season, eps]) => {
        const key = series.id + ':' + season;
        const opened = state.ui.openSeason === key;
        const seasonDone = eps.filter(i => i.status === 'done').length;
        const rows = opened ? eps.map(item => itemRow(pen.id, series.id, item)).join('') : '';
        const seasonLabel = eps.some(i => i.season) ? 'Season ' + season : 'Episodes';
        return `<button type="button" class="task" data-act="open-season" data-id="${esc(key)}"><span class="t">${esc(seasonLabel)}<small>${seasonDone}/${eps.length}</small></span></button>${rows}`;
      }).join('');
    } else inner = items.map(item => itemRow(pen.id, series.id, item)).join('');
    return `<div class="series"><strong>${esc(series.name)}</strong><p class="muted">${esc(series.note || '')} ${done}/${items.length}</p>${inner}
      <button type="button" class="secondary small" data-act="add-item" data-pen="${esc(pen.id)}" data-series="${esc(series.id)}">Add next</button></div>`;
  }).join('');
  return `<section class="panel"><h2>${esc(pen.name)}</h2>${blocks}</section>`;
}

function itemRow(penId, seriesId, item) {
  const words = item.projectId ? '' : `<input data-bind="item-words" data-id="${esc(item.id)}" type="number" min="0" placeholder="Words" value="${item.words ?? ''}" style="max-width:110px">`;
  return `<div class="ep"><span style="flex:1">${esc(item.name)}</span>${words}
    <select data-bind="item-status" data-pen="${esc(penId)}" data-series="${esc(seriesId)}" data-id="${esc(item.id)}" aria-label="Status for ${esc(item.name)}">
      ${['planned', 'current', 'done'].map(s => `<option value="${s}"${item.status === s ? ' selected' : ''}>${s}</option>`).join('')}
    </select></div>`;
}

function timerHTML(state, date) {
  const T = state.timer;
  const mins = Math.floor(((state.days[T ? T.date : date]?.focusMs) || 0) / 60000);
  let face = '—:—';
  let status = 'Clocking in pays +2 XP, then +2 XP at 30, 60, 90, and 120 focused minutes today. It keeps counting if the screen sleeps.';
  if (T) {
    const left = T.running ? Math.max(0, T.endAt - Date.now()) : (T.remaining || 0);
    const s = Math.ceil(left / 1000);
    face = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
    status = T.running ? 'Running.' : 'Paused. Restarting counts.';
  }
  const pills = [['open', 'Clocked in'], ...TIMER_MILESTONES.map(m => [String(m), m + ' min'])].map(([k, label]) => {
    const got = (state.xpLog || []).some(e => e.date === (T ? T.date : date) && e.key === 'author-time:' + k);
    return `<span class="pill ${got ? 'got' : 'wait'}">${got ? '✓ ' : ''}${esc(label)} +2</span>`;
  }).join(' ');
  const day = state.days[date] || { notes: {} };
  return `<div class="card" style="margin-top:10px"><div class="head"><strong>Author timer</strong><span class="pill">${mins} min today</span></div>
    <div class="timer-face" id="timerFace">${face}</div>
    <div class="seg three"><button type="button" data-act="timer" data-min="10">10 min</button><button type="button" data-act="timer" data-min="25">25 min</button><button type="button" data-act="timer" data-min="50">50 min</button></div>
    <div class="row" style="margin-top:8px"><button type="button" class="secondary" data-act="timer-pause">${T?.running ? 'Pause' : 'Resume'}</button><button type="button" class="secondary" data-act="timer-stop">Stop & save</button></div>
    <p class="muted">${esc(status)}</p><div class="row">${pills}</div>
    <label class="field">Bookmark<input id="bookmark" data-bind="note" data-key="bookmark" type="text" value="${esc(day.notes?.bookmark || '')}"></label>
    <textarea id="authorNotes" data-bind="note" data-key="author" placeholder="Next step">${esc(day.notes?.author || '')}</textarea>
  </div>`;
}

function projectsHTML(state) {
  const rows = (state.authorProjects || []).map(p => {
    const pastOutline = projectStages.indexOf(p.stage) > projectStages.indexOf('Outlining / planning');
    return `<div class="card"><strong>${p.priority ? '★ ' : ''}${esc(p.name)}</strong>
      <select data-bind="project-stage" data-id="${esc(p.id)}" aria-label="Stage">${projectStages.map(s => `<option${s === p.stage ? ' selected' : ''}>${esc(s)}</option>`).join('')}</select>
      ${pastOutline ? `<label class="field">Word count<input data-bind="project-words" data-id="${esc(p.id)}" type="number" min="0" value="${p.wordCount ?? ''}"></label><p class="muted">The first number is the starting point. Badges count words you add after that.</p>` : ''}
      <div class="row">${p.priority ? '' : `<button type="button" class="secondary small" data-act="priority" data-id="${esc(p.id)}">Make priority</button>`}<button type="button" class="secondary small" data-act="remove-project" data-id="${esc(p.id)}">Remove</button></div>
    </div>`;
  }).join('');
  return panel('Writing projects', `<p class="muted">${(state.authorProjects || []).length} projects. Priority right now: ${esc(priorityName(state))}.</p>${rows}
    <div class="row"><input id="newProjectName" type="text" placeholder="Project name"><button type="button" class="small" data-act="add-project">Add</button></div>
    <label class="field">Stage<select id="newProjectStage">${projectStages.map(s => `<option>${esc(s)}</option>`).join('')}</select></label>`, { id: 'projects', open: openPanel(state, 'projects') });
}

function protocolHTML(state) {
  const name = esc(priorityName(state));
  return panel('Author shift', `<div class="tasks">
    <div class="card"><strong>1. Clock in</strong><small>Open the manuscript and read the bookmark.</small></div>
    <div class="card"><strong>2. Start tiny</strong><small>The morning novel block, then 10 minutes, then 25 if you can.</small></div>
    <div class="card"><strong>3. Today’s pen name first</strong><small>Then ${name}, unless a deadline says otherwise.</small></div>
    <div class="card"><strong>4. Clock out</strong><small>Save, leave a next step, and stop. No making up no-writing days.</small></div>
  </div>`, { id: 'protocol', open: openPanel(state, 'protocol') });
}

function witchyHTML(state, today) {
  const date = state.date || today;
  const day = state.days[date] || {};
  const sub = state.ui.witchy || 'daily';
  const tabs = [['daily', '☀️ Daily'], ['weekly', '📅 Weekly'], ['lunar', '🌙 Lunar'], ['sabbat', '🕯️ Sabbat']].map(([id, label]) => `<button type="button" class="${sub === id ? 'on' : ''}" data-act="witch-tab" data-id="${id}">${label}</button>`).join('');
  let body = '';
  if (sub === 'daily') {
    const w = day.witchy || {};
    body = `<p class="muted">One small action is enough. Witchy checks pay 1 Hearthgold, not XP.</p>
      <label class="field">Astrology / intention<textarea id="astroNote" data-bind="astro">${esc(w.astro || '')}</textarea></label>
      <div class="tasks">${WITCHY_DAILY.map(([id, label, subtext]) => taskButton({ kind: 'witch', id, label, sub: subtext, xp: '1 🪙', done: !!w.checks?.[id] })).join('')}</div>`;
  } else if (sub === 'weekly') {
    body = `<div class="tasks">${WEEKLY_WITCH.map(([t, d]) => `<div class="card"><strong>${esc(t)}</strong><small>${esc(d)}</small></div>`).join('')}</div><p class="muted">One breath, one card, or one sentence counts.</p>`;
  } else if (sub === 'lunar') {
    const phase = phaseOfDay(day, date);
    const auto = moonPhaseFor(date);
    const data = lunarPhaseData[phase] || lunarPhaseData.new;
    const checks = day.witchy?.lunarChecks || {};
    const options = Object.entries(PHASE_NAMES).map(([id, name]) => `<option value="${id}"${id === phase ? ' selected' : ''}>${esc(name)}</option>`).join('');
    const nexts = PRINCIPAL.map(t => [t, nextMoonEvent(t, date)]).filter(([, e]) => e);
    body = `<label class="field">Moon phase<select id="moonPhase" data-bind="moon">${options}</select></label>
      <p class="muted">${phase === auto.phase ? 'Calculated for this date: ' + esc(PHASE_NAMES[auto.phase]) : 'You picked a different phase. Calculated: ' + esc(PHASE_NAMES[auto.phase])} ${auto.exact ? '· exact ' + esc(fmtTime(auto.exact)) : ''}</p>
      <div class="notice">${esc(data.title)}</div>
      <div class="tasks">${data.tasks.map(([id, label]) => taskButton({ kind: 'lunar', id: phase + ':' + id, label, sub: 'Optional. A small version counts.', xp: '1 🪙', done: !!checks[phase + ':' + id] })).join('')}</div>
      <p class="muted">${nexts.map(([t, e]) => esc(PHASE_NAMES[t]) + ' · ' + esc(fmtDate(isoOf(e.at), { weekday: false }))).join(' · ')}</p>`;
  } else {
    const sab = sabbatOfDay(day, date);
    const data = sabbatData[sab] || sabbatData.samhain;
    const checks = day.witchy?.sabbatChecks || {};
    const ups = upcomingSabbats(date, 6);
    const options = Object.entries(SABBAT_INFO).map(([id, info]) => `<option value="${id}"${id === sab ? ' selected' : ''}>${info.emoji} ${esc(info.name)}</option>`).join('');
    body = `<label class="field">Sabbat<select id="sabbatPick" data-bind="sabbat">${options}</select></label>
      <p class="muted">Next: ${esc(SABBAT_INFO[ups[0].key].name)}, ${esc(sabbatRange(ups[0]))}.</p>
      <div class="notice">${esc(data.title)}</div>
      <div class="tasks">${data.tasks.map(([id, label]) => taskButton({ kind: 'sabbat', id: sab + ':' + id, label, sub: 'Adapt it to your household.', xp: '1 🪙', done: !!checks[sab + ':' + id] })).join('')}</div>
      <div class="tasks">${ups.map(s => `<div class="card"><strong>${SABBAT_INFO[s.key].emoji} ${esc(SABBAT_INFO[s.key].name)}</strong><small>${esc(sabbatRange(s))}. ${esc(SABBAT_INFO[s.key].desc)}</small></div>`).join('')}</div>`;
  }
  return `<div class="tabs" style="position:static;padding-left:0">${tabs}</div><section class="panel">${body}</section>`;
}

function logHTML(state, today) {
  const date = state.ui.snapDate || state.date || today;
  const live = date === today || !state.endOfDayLog?.[date];
  const snap = live ? snapshotFor(state, date, false) : state.endOfDayLog[date];
  const tasks = (snap.completed || []).map(t => `<div class="card">✓ ${esc(t)}</div>`).join('') || '<p class="muted">No completed tasks recorded.</p>';
  const log = Object.keys(state.endOfDayLog || {}).sort().reverse().slice(0, 21).map(d => {
    const z = state.endOfDayLog[d];
    return `<button type="button" class="task" data-act="view-snap" data-id="${d}"><span class="t">${esc(fmtDate(d))}<small>${z.completedCount || 0} tasks · ${z.taskXP || 0} checklist XP</small></span></button>`;
  }).join('') || '<p class="muted">No finalized days yet. Today stays a live preview until the next day.</p>';
  const start = weekStart(state.ui.week || today);
  const days = Array.from({ length: 7 }, (_, i) => dateShift(start, i));
  const rows = days.map(d => state.endOfDayLog[d] || (state.days[d] || d === today ? snapshotFor(state, d, false) : null)).filter(Boolean);
  const sum = rows.reduce((a, x) => ({ tasks: a.tasks + (x.completedCount || 0), xp: a.xp + (x.taskXP || 0), bonus: a.bonus + (x.bonusXP || 0), writing: a.writing + ((x.authorCount || x.focusMinutes) ? 1 : 0), minutes: a.minutes + (x.focusMinutes || 0) }), { tasks: 0, xp: 0, bonus: 0, writing: 0, minutes: 0 });
  return `<section class="panel">
    <div class="head"><h2>End of day</h2><span class="pill">${snap.finalized ? 'Final' : 'Live preview'}</span></div>
    <label class="field">Snapshot date<input id="snapDate" data-bind="snap-date" type="date" value="${esc(date)}"></label>
    <div class="row"><button type="button" data-act="save-snap">Finalize this day</button><button type="button" class="secondary" data-act="print">Print</button></div>
    <div class="stats" style="margin-top:8px"><div class="stat"><span>Tasks</span><strong>${snap.completedCount || 0}</strong></div><div class="stat"><span>Checklist XP</span><strong>${snap.taskXP || 0}</strong></div><div class="stat"><span>Other XP</span><strong>${snap.bonusXP || 0}</strong></div></div>
    <h3>Completed</h3><div class="tasks">${tasks}</div>
    <p class="muted">Author timer ${snap.focusMinutes || 0} min. Witchy ${snap.witchyCount || 0} daily, ${snap.lunarCount || 0} lunar, ${snap.sabbatCount || 0} Sabbat. ${esc(snap.moonPhase || '')}</p>
    ${snap.quest ? `<p class="muted">Quest: ${esc(snap.quest.name)}${snap.quest.done ? ' · done' : ''}</p>` : ''}
  </section>
  ${panel('Running log', `<div class="tasks">${log}</div>`, { id: 'runlog', open: true })}
  <section class="panel"><h2>Week</h2>
    <label class="field">Week containing<input id="weekPicker" data-bind="week" type="date" value="${esc(state.ui.week || today)}"></label>
    <div class="stats"><div class="stat"><span>Tasks</span><strong>${sum.tasks}</strong></div><div class="stat"><span>Checklist XP</span><strong>${sum.xp}</strong></div><div class="stat"><span>Writing days</span><strong>${sum.writing}</strong></div></div>
    <p class="muted">Other XP ${sum.bonus}. Focus minutes ${sum.minutes}. Missed days, rest, and no-writing days never subtract anything.</p>
  </section>`;
}

function planHTML(state) {
  const name = esc(priorityName(state));
  const days = [1, 2, 3, 4, 5, 6, 0].map(wd => `<div class="card"><strong>${esc(WEEKDAYS[wd])}</strong><small>${esc(DAY_PLAN[wd])} Cleaning: ${esc(FOCUS_LABELS[wd]) || 'no room focus'}.</small></div>`).join('');
  return `<section class="panel"><h2>Week at a glance</h2>
    <p class="muted">A rhythm, not a contract. Preschool is Monday–Thursday, 7:50 AM–3:20 PM. Tuesday and Sunday are no-writing days. The morning novel is optional those days.</p>
    <div class="tasks">${days}</div>
  </section>
  <section class="panel"><h2>Daily rhythm</h2>
    <div class="card"><strong>Morning</strong><small>Get dressed, feed everyone, preschool bag, 7:50 drop-off on school days. Start with the morning novel when it’s a writing day.</small></div>
    <div class="card"><strong>While they’re at school</strong><small>Short housework with the 1-year-old nearby. Don’t count on a nap for a long project.</small></div>
    <div class="card"><strong>3:20 pickup</strong><small>Snack, connection, then dinner around 5:00.</small></div>
    <div class="card"><strong>Evening</strong><small>Kids in bed around 8:30. Bedtime outranks housework.</small></div>
    <div class="card"><strong>After 8:30</strong><small>Author shift, except Tuesday and Sunday. Today’s pen name first, and ${name} stays the novel until you say it’s finished.</small></div>
  </section>
  <section class="panel"><h2>Laundry</h2>
    <p>The mountain is clean laundry waiting to be put away. Dirty laundry is a separate stream. “Emptied” means folded and fully put away. Partial progress still counts as effort, and the named basket task is the one worth 2 XP.</p>
  </section>
  <section class="panel"><h2>Food</h2>
    <p class="muted">Monday batch cooking. Tuesday bread if you can. Wednesday a simple meal. Thursday baking. Friday a treat. Saturday flexible. Sunday light prep. Every day, fed and hydrated counts.</p>
    ${taskButton({ kind: 'focus', id: 'weekly-cleaning', label: 'Mark today’s cleaning focus noted', sub: 'A note only. It does not add XP. The main cleaning task is what pays the focus bonus.', xp: '', done: !!state.days?.[state.date]?.checks?.['focus:weekly-cleaning'] })}
  </section>
  <section class="panel"><h2>Manager’s rules</h2>
    <ul>
      <li>Kids’ safety, food, and health come first.</li>
      <li>Sick days and Hyperfocus days: the four essentials are enough.</li>
      <li>Short blocks. Restarting after the baby counts.</li>
      <li>No XP debt. A missed streak removes nothing.</li>
      <li>Rooms can dim. Your XP cannot.</li>
    </ul>
  </section>`;
}

function rewardsHTML(state, today) {
  const date = state.date || today;
  const total = totalXP(state);
  const prog = levelProgress(total);
  const info = seasonalInfo(date);
  const shop = SHOP.map(([cost, name, detail]) => `<div class="card"><strong>${cost} XP — ${esc(name)}</strong><small>${esc(detail)}</small><button type="button" class="small" data-act="claim" data-cost="${cost}" data-name="${esc(name)}">Claim</button></div>`).join('');
  const levels = levelRewardCatalog.map(r => {
    const earned = total >= r.xp;
    const claimed = !!state.levelRewardsClaimed[r.level];
    return `<div class="card"><strong>Level ${r.level} — ${esc(r.name)}</strong><small>${esc(r.desc)} · ${claimed ? 'Claimed' : earned ? 'Unlocked' : 'Locked'}</small><button type="button" class="small secondary" data-act="level-reward" data-level="${r.level}" ${earned && !claimed ? '' : 'disabled'}>${claimed ? 'Claimed' : earned ? 'Claim free' : 'Locked'}</button></div>`;
  }).join('');
  const history = (state.rewardLog || []).slice().reverse().slice(0, 12).map(r => `<div class="card"><strong>${esc(r.name)}</strong><small>${esc(fmtDate(r.date))} · ${r.cost} XP</small></div>`).join('') || '<p class="muted">No rewards claimed yet.</p>';
  const goldItems = seasonalCatalog.filter(i => i.season === info.name || i.season === 'Any season').map(item => {
    const owned = (state.goldInventory || []).some(x => x.id === item.id);
    return `<div class="card"><strong>${esc(item.name)}</strong><small>${esc(item.desc)} · ${item.cost} gold</small><button type="button" class="small" data-act="buy-gold" data-id="${esc(item.id)}" ${owned || state.gold < item.cost ? 'disabled' : ''}>${owned ? 'Owned' : 'Buy · ' + item.cost}</button></div>`;
  }).join('');
  const owned = (state.goldInventory || []).slice().reverse().map(x => `<div class="card"><strong>${DECOR[x.id] || '✨'} ${esc(x.name)}</strong><small>${esc(x.season)} · ${esc(fmtDate(x.date))}</small></div>`).join('') || '<p class="muted">Your shelves are ready.</p>';
  const ledger = (state.goldLog || []).slice().reverse().slice(0, 12).map(x => `<div class="card"><strong>${x.amount > 0 ? '+' : ''}${x.amount} gold</strong><small>${esc(x.description)} · ${esc(fmtDate(x.date))}</small></div>`).join('') || '<p class="muted">Gold you earn will show up here.</p>';
  const bonuses = `<div class="row">
    <button type="button" class="secondary" data-act="bonus-fixed" data-amount="10" data-reason="Bad-Day Protocol — survival counts" data-key="badday-protocol">Bad-Day +10</button>
    <button type="button" class="secondary" data-act="bonus-fixed" data-amount="10" data-reason="3-day combo bonus" data-key="streak:3">3-day +10</button>
    <button type="button" class="secondary" data-act="bonus-fixed" data-amount="20" data-reason="5-day combo bonus" data-key="streak:5">5-day +20</button>
    <button type="button" class="secondary" data-act="bonus-fixed" data-amount="35" data-reason="7-day combo bonus" data-key="streak:7">7-day +35</button>
    <button type="button" class="secondary" data-act="hyperfocus">Hyperfocus +10</button>
  </div>
  <div class="row" style="margin-top:8px"><input id="bonusAmount" type="number" min="0" placeholder="XP"><input id="bonusReason" type="text" placeholder="Why"><button type="button" data-act="add-bonus">Add XP</button></div>
  <p class="muted">Streaks and the essentials bonus also award themselves. These buttons won’t pay twice for the same day. Nothing here removes XP.</p>`;
  return characterHTML(state, today, false) + `
    <section class="panel"><h2>XP</h2>
      <div class="stats"><div class="stat"><span>Lifetime</span><strong>${total}</strong></div><div class="stat"><span>Level</span><strong>${prog.level}</strong></div><div class="stat"><span>To spend</span><strong>${state.wallet}</strong></div></div>
      <div class="progress"><span style="width:${prog.ratio}%"></span></div>
      <p class="muted">${esc(prog.label)}. Lifetime XP is the record. Spending uses the unspent wallet only.</p>
      <label class="field">Whiteboard baseline<input id="baseline" data-bind="baseline" type="number" min="0" value="${state.baseline}"></label>
      <label class="field">Unspent XP<input id="wallet" data-bind="wallet" type="number" min="0" value="${state.wallet}"></label>
    </section>
    ${panel('Reward shop', shop + '<h3>Level-up rewards</h3><p class="muted">Free, once each, and they don’t spend XP or gold.</p>' + levels + `<div class="notice" style="margin-top:8px"><strong>Mystery box · 50 XP.</strong> A tiny treat, cozy hobby time, a special snack, 20 minutes of rest, a supply you already own, or a choose-your-own token.</div><button type="button" data-act="mystery">Open a mystery box</button><h3>Claimed</h3><div class="tasks">${history}</div>`, { id: 'shop', open: openPanel(state, 'shop') })}
    ${panel('Bonuses', `<p class="muted">Kids, house, food, and self-care are a guide of about 1–5 XP each. Author work about 1–10. A gentle day is often 20–30 XP. That is not a quota.</p>${bonuses}`, { id: 'bonuses', open: openPanel(state, 'bonuses') })}
    <section class="panel"><div class="head"><h2>🪙 Hearthgold</h2><span class="pill">${state.gold} gold</span></div>
      <p class="muted">${esc(info.intro)} Ordinary tasks 1, author tasks and baskets 2, witchy items 1, badges 5. Gold is not XP.</p>
      <div class="tasks">${goldItems}</div>
      <h3>Home collection</h3><div class="tasks">${owned}</div>
      <h3>Ledger</h3><div class="tasks">${ledger}</div>
    </section>
    <section class="panel"><h2>Level ladder</h2><div class="tasks">${levelRewardCatalog.map(r => `<div class="card"><strong>Level ${r.level}</strong><small>${r.xp} XP — ${esc(r.name)}. ${esc(r.desc)}</small></div>`).join('')}</div></section>`;
}

export function viewHTML(state, today, minutes) {
  const tab = state.ui?.tab || 'home';
  if (tab === 'home') return homeHTML(state, today, minutes);
  if (tab === 'today') return todayHTML(state, today, minutes);
  if (tab === 'write') return writeHTML(state, today);
  if (tab === 'witchy') return witchyHTML(state, today);
  if (tab === 'log') return logHTML(state, today);
  if (tab === 'plan') return planHTML(state);
  if (tab === 'rewards') return rewardsHTML(state, today);
  return homeHTML(state, today, minutes);
}

export { labelForKey };
