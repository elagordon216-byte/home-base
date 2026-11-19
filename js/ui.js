import { todayIso, minutesOf, isISO } from './dates.js';
import { freshState, importBackup, exportBackup } from './migrate.js';
import { levelNumber, totalXP, xpEntry } from './xp.js';
import { essentialsOn } from './days.js';
import { levelRewardCatalog, seasonalCatalog, EF_BONUSES } from './v2-data.js';
import { bannerHTML, tabsHTML, viewHTML } from './views.js';
import {
  addBonus, awardHyperfocusManual, buyGoldItem, claimLevelReward, claimShop,
  clearToday, clockIn, ensureDay, manualBadDay, manualStreak, openMystery, quickWin,
  refresh, setDayType, setEnergy, setItemWords, setProjectWords, markQuest,
  timerPause, timerStop, timerTick, toggleBasket, toggleCustom, toggleEssential,
  toggleListed, toggleMorningNovel, toggleTodo, toggleWitch,
} from './actions.js';
import { addCustomQuest, pickQuest } from './quests.js';
import { snapshotFor } from './snapshot.js';

const KEY = 'home-base-v3';
let state;
let demo = false;
let clockMinutes = null;

function $(id) { return document.getElementById(id); }

function beep() {
  try {
    const ctx = beep.ctx || (beep.ctx = new (window.AudioContext || window.webkitAudioContext)());
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 660;
    g.gain.value = 0.05;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.18);
  } catch (e) { /* sound is optional */ }
}

function toast(msg) {
  const t = $('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 2400);
}

function save() {
  if (demo || state?.demo) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    toast('Could not save on this phone. Export a backup.');
  }
}

function selectedDate() {
  return state.date || todayIso();
}

function actionDate() {
  if ((state.ui?.tab || 'home') === 'home') return todayIso();
  return selectedDate();
}

function draw() {
  try {
    $('tabs').innerHTML = tabsHTML(state);
    $('banner').innerHTML = bannerHTML(state, todayIso());
    $('view').innerHTML = viewHTML(state, todayIso(), clockMinutes == null ? minutesOf() : clockMinutes);
    const active = document.querySelector('.tabs button.on');
    if (active) active.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  } catch (err) {
    console.error(err);
    $('view').textContent = 'Something glitched: ' + (err && err.message ? err.message : err);
  }
}

function finish(result) {
  const before = state.lastSeenLevel || levelNumber(totalXP(state));
  refresh(state, todayIso());
  const now = levelNumber(totalXP(state));
  if (!state.lastSeenLevel) state.lastSeenLevel = now;
  save();
  draw();
  const xp = result?.xp || 0;
  const gold = result?.gold || 0;
  if (xp || gold) {
    const bits = [];
    if (xp) bits.push((xp > 0 ? '+' : '−') + Math.abs(xp) + ' XP');
    if (gold) bits.push((gold > 0 ? '+' : '−') + Math.abs(gold) + ' gold');
    toast(bits.join(' · '));
    try { navigator.vibrate?.(xp > 0 ? 12 : 8); } catch (e) { /* ignore */ }
  }
  if (now > before) {
    state.lastSeenLevel = now;
    save();
    celebrate(now);
  } else state.lastSeenLevel = Math.max(state.lastSeenLevel || 0, now);
}

function celebrate(level) {
  const o = document.createElement('div');
  o.className = 'celebrate';
  o.innerHTML = `<div class="card"><div style="font-size:2.4rem">🎉</div><h2>Level ${level}</h2><p>A free level reward is waiting in Rewards whenever you want it.</p><button type="button">Yay</button></div>`;
  o.querySelector('button').onclick = () => o.remove();
  document.body.appendChild(o);
}

function boot() {
  const params = new URLSearchParams(location.search);
  if (params.get('demo') === '1') {
    demo = true;
    if (params.get('at')) {
      const [h, m] = params.get('at').split(':').map(Number);
      if (Number.isFinite(h)) clockMinutes = h * 60 + (m || 0);
    }
    state = buildDemo(params.get('shot') || 'home');
    if (!state.lastSeenLevel) state.lastSeenLevel = levelNumber(totalXP(state));
    draw();
    bind();
    return;
  }
  const today = todayIso();
  let loaded = false;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const wrapped = parsed?.schema === 3 ? { app: 'home-base', schema: 3, data: parsed } : parsed;
      state = importBackup(wrapped, { today }).state;
      loaded = true;
    }
  } catch (e) {
    loaded = false;
  }
  if (!loaded) {
    try {
      const v2 = localStorage.getItem('homebase-board-v2');
      if (v2) {
        state = importBackup(JSON.parse(v2), { today }).state;
        loaded = true;
        state.upgrade = state.upgrade || { from: 2, seen: false, reported: true };
      }
    } catch (e) { /* keep going */ }
  }
  if (!loaded) {
    try {
      const old = localStorage.getItem('homebase-board');
      if (old) {
        state = importBackup(JSON.parse(old), { today }).state;
        loaded = true;
      }
    } catch (e) { /* keep going */ }
  }
  if (!loaded) state = freshState(today);
  refresh(state, today);
  if (!state.lastSeenLevel) state.lastSeenLevel = levelNumber(totalXP(state));
  if (!state.ui) state.ui = {};
  if (!state.ui.room) state.ui.room = 'kitchen';
  save();
  draw();
  bind();
  registerSW();
  const events = [];
  // Room dim messages are already applied. A quiet note if any room is dusty after catch-up is unnecessary.
  void events;
}

function buildDemo(tab) {
  const today = todayIso();
  const s = freshState(today);
  s.demo = true;
  s.ui.tab = tab;
  s.ui.room = 'living';
  s.date = today;
  const prev = ['2026-11-16', '2026-11-17', '2026-11-18'];
  // Use real yesterday chain only if those dates are before today; otherwise skip.
  if (prev[0] < today) {
    toggleListed(s, prev[0], 'h-main-clean', true);
    toggleListed(s, prev[1], 'h-dishes', true);
    toggleListed(s, prev[2], 'e-bedtime', true);
  }
  toggleMorningNovel(s, today, true);
  toggleListed(s, today, 'm-dressed', true);
  toggleListed(s, today, 'm-kids', true);
  toggleListed(s, today, 'm-breakfast', true);
  toggleListed(s, today, 'h-dishes', true);
  toggleListed(s, today, 'h-reset', true);
  pickQuest(s, 'laundry-mountain', today);
  toggleBasket(s, today, 'basket0', true);
  toggleBasket(s, today, 'basket1', true);
  toggleBasket(s, today, 'basket2', true);
  toggleWitch(s, today, 'checks', 'ground', 'witch:ground', 'Witchy practice', true);
  setProjectWords(s, 'project-sophomore-year', 40000, today);
  setProjectWords(s, 'project-sophomore-year', 41500, today);
  refresh(s, today);
  s.lastSeenLevel = levelNumber(totalXP(s));
  return s;
}

function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data?.type !== 'updated') return;
    const prev = localStorage.getItem('hb-sw');
    localStorage.setItem('hb-sw', event.data.version);
    if (prev && prev !== event.data.version) toast('Home Base updated. Close it and open it again. Your progress is still on this phone.');
  });
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

function bind() {
  document.body.addEventListener('click', onClick);
  document.body.addEventListener('change', onChange);
  document.body.addEventListener('input', onInput);
  setInterval(() => {
    if (!state?.timer) return;
    const gained = timerTick(state, Date.now());
    const face = $('timerFace');
    if (!state.timer) {
      beep();
      toast('Block done. Save, and leave a next step.');
      finish({ xp: gained, gold: 0 });
      return;
    }
    if (gained) finish({ xp: gained, gold: 0 });
    else if (face) {
      const T = state.timer;
      const left = T.running ? Math.max(0, T.endAt - Date.now()) : (T.remaining || 0);
      const sec = Math.ceil(left / 1000);
      face.textContent = Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
    }
  }, 1000);
  setInterval(() => {
    const t = todayIso();
    if (state && state.activeDate && state.activeDate < t) {
      refresh(state, t);
      save();
      draw();
    }
  }, 30000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || !state) return;
    if (state.timer) timerTick(state, Date.now());
    refresh(state, todayIso());
    save();
    draw();
  });
}

function onInput(e) {
  const el = e.target;
  const bindName = el.dataset.bind;
  if (!bindName) return;
  const date = selectedDate();
  if (bindName === 'note') {
    ensureDay(state, date).notes[el.dataset.key] = el.value;
    save();
  } else if (bindName === 'astro') {
    const day = ensureDay(state, date);
    day.witchy = day.witchy || { checks: {}, lunarChecks: {}, sabbatChecks: {}, astro: '' };
    day.witchy.astro = el.value;
    save();
  } else if (bindName === 'reward') {
    state.reward = el.value;
    save();
  } else if (bindName === 'novel-title') {
    state.morningNovel = state.morningNovel || { title: '', mode: 'editing' };
    state.morningNovel.title = el.value;
    save();
  } else if (bindName === 'novel-mode') {
    state.morningNovel = state.morningNovel || { title: 'Sophomore Year', mode: '' };
    state.morningNovel.mode = el.value;
    save();
  } else if (bindName === 'profile-name') {
    state.profile.name = el.value;
    save();
  } else if (bindName === 'profile-class') {
    state.profile.className = el.value;
    save();
  } else if (bindName === 'task-label') {
    const t = (state.lists[el.dataset.group] || []).find(x => x.id === el.dataset.id);
    if (t && el.value.trim()) t.label = el.value.trim();
    save();
  }
}

function onChange(e) {
  const el = e.target;
  if (el.id === 'importFile' && el.files?.[0]) {
    el.files[0].text().then(text => {
      try { doImport(JSON.parse(text)); } catch (err) { showImport(err.message || 'That file could not be read.', false); }
      el.value = '';
    });
    return;
  }
  const bindName = el.dataset.bind;
  if (!bindName) return;
  const date = selectedDate();
  if (bindName === 'date') {
    state.date = isISO(el.value) ? el.value : todayIso();
    ensureDay(state, state.date);
    finish();
  } else if (bindName === 'baseline') {
    state.baseline = Math.max(0, Math.floor(Number(el.value) || 0));
    finish();
  } else if (bindName === 'wallet') {
    state.wallet = Math.max(0, Math.floor(Number(el.value) || 0));
    finish();
  } else if (bindName === 'task-xp') {
    const t = (state.lists[el.dataset.group] || []).find(x => x.id === el.dataset.id);
    if (t) t.xp = Number(el.value);
    finish();
  } else if (bindName === 'project-stage') {
    const p = state.authorProjects.find(x => x.id === el.dataset.id);
    if (p) p.stage = el.value;
    finish();
  } else if (bindName === 'project-words') {
    setProjectWords(state, el.dataset.id, el.value.trim(), date);
    finish();
  } else if (bindName === 'item-words') {
    const item = findItem(el.dataset.id);
    const raw = el.value.trim();
    if (item) item.words = raw === '' ? '' : Math.max(0, Math.floor(Number(raw) || 0));
    if (raw !== '') setItemWords(state, el.dataset.id, raw, date);
    finish();
  } else if (bindName === 'item-status') {
    const item = findItem(el.dataset.id);
    if (item) item.status = el.value;
    finish();
  } else if (bindName === 'moon') {
    const day = ensureDay(state, date);
    day.witchy = day.witchy || { checks: {}, lunarChecks: {}, sabbatChecks: {} };
    day.witchy.moonPhase = el.value;
    day.witchy.moonPhaseManual = true;
    finish();
  } else if (bindName === 'sabbat') {
    const day = ensureDay(state, date);
    day.witchy = day.witchy || { checks: {}, lunarChecks: {}, sabbatChecks: {} };
    day.witchy.sabbatChoice = el.value;
    day.witchy.sabbatManual = true;
    finish();
  } else if (bindName === 'snap-date') {
    state.ui.snapDate = el.value;
    draw();
  } else if (bindName === 'week') {
    state.ui.week = el.value;
    draw();
  }
}

function findItem(id) {
  for (const pen of state.penNames || []) {
    for (const series of pen.series || []) {
      const item = (series.items || []).find(i => i.id === id);
      if (item) return item;
    }
  }
  return null;
}

function onClick(e) {
  const el = e.target.closest('[data-act]');
  if (!el) return;
  const act = el.dataset.act;
  const date = actionDate();
  if (act === 'tab') {
    state.ui.tab = el.dataset.tab;
    save();
    draw();
    window.scrollTo({ top: 0 });
    return;
  }
  if (act === 'collapse') {
    if (e.target.closest('button') && e.target.closest('button') !== el) return;
    const id = el.dataset.id;
    if (!id) return;
    state.ui.collapsed = state.ui.collapsed || {};
    if (state.ui.collapsed[id]) delete state.ui.collapsed[id];
    else state.ui.collapsed[id] = true;
    save();
    draw();
    return;
  }
  if (act === 'room') { state.ui.room = el.dataset.id; save(); draw(); return; }
  if (act === 'check') return doCheck(el.dataset.kind, el.dataset.id, date);
  if (act === 'day-type') { finish({ xp: setDayType(state, selectedDate(), el.dataset.id), gold: 0 }); return; }
  if (act === 'energy') { setEnergy(state, selectedDate(), el.dataset.id); finish(); return; }
  if (act === 'bad-toggle') {
    const day = ensureDay(state, selectedDate());
    day.badDay = !essentialsOn(day, selectedDate());
    if (!day.badDay) delete day.showFull;
    finish();
    return;
  }
  if (act === 'show-full') {
    const day = ensureDay(state, selectedDate());
    day.showFull = !day.showFull;
    finish();
    return;
  }
  if (act === 'quest-pick') {
    const res = pickQuest(state, el.dataset.id, todayIso());
    if (res.error) toast(res.error);
    finish();
    return;
  }
  if (act === 'quest-step') {
    markQuest(state, el.dataset.flag, el.dataset.on === '1', todayIso());
    finish();
    return;
  }
  if (act === 'add-quest') {
    const item = addCustomQuest(state, $('questName')?.value, $('questDetail')?.value);
    if (!item) return toast('Name the quest first.');
    const res = pickQuest(state, item.id, todayIso());
    if (res.error) toast(res.error);
    finish();
    return;
  }
  if (act === 'add-task') return addTask();
  if (act === 'add-todo') return addTodo();
  if (act === 'add-basket') return addBasket();
  if (act === 'add-recurring') return addRecurring(el.dataset.group);
  if (act === 'edit-list') {
    state.ui.editing = state.ui.editing === el.dataset.group ? null : el.dataset.group;
    draw();
    return;
  }
  if (act === 'archive-task') {
    const t = (state.lists[el.dataset.group] || []).find(x => x.id === el.dataset.id);
    if (t && confirm('Remove this from the everyday list? XP it already earned stays.')) {
      t.archived = true;
      finish();
    }
    return;
  }
  if (act === 'remove-custom') {
    const day = ensureDay(state, selectedDate());
    const c = day.custom.find(x => x.id === el.dataset.id);
    if (c && confirm('Remove this from today? XP it earned stays.')) { c.removed = true; finish(); }
    return;
  }
  if (act === 'remove-basket') {
    const b = state.baskets.find(x => x.id === el.dataset.id);
    if (b && confirm('Remove this basket? XP it earned stays.')) { b.archived = true; finish(); }
    return;
  }
  if (act === 'remove-todo') {
    const t = state.todos.find(x => x.id === el.dataset.id);
    if (t && confirm('Delete this to-do? XP it earned stays.')) { t.archived = true; finish(); }
    return;
  }
  if (act === 'remove-project') {
    const p = state.authorProjects.find(x => x.id === el.dataset.id);
    if (p && confirm('Remove this project? Past notes keep their copy.')) {
      state.authorProjects = state.authorProjects.filter(x => x.id !== p.id);
      finish();
    }
    return;
  }
  if (act === 'priority') {
    state.authorProjects.forEach(p => { p.priority = p.id === el.dataset.id; });
    finish();
    toast('Priority updated');
    return;
  }
  if (act === 'add-project') return addProject();
  if (act === 'quick') {
    const spec = EF_BONUSES.find(x => x[0] === el.dataset.id);
    if (!spec) return;
    const xp = quickWin(state, selectedDate(), spec[0], spec[1].replace(/^\S+\s/, ''), spec[2]);
    finish({ xp, gold: 0 });
    return;
  }
  if (act === 'timer') {
    const dateNow = todayIso();
    if (state.timer?.running && !confirm('A block is already running. Start a new one?')) return;
    if (state.timer) timerTick(state, Date.now());
    const xp = clockIn(state, dateNow, Number(el.dataset.min), Date.now());
    finish({ xp, gold: 0 });
    return;
  }
  if (act === 'timer-pause') { timerPause(state, Date.now()); finish(); return; }
  if (act === 'timer-stop') { timerStop(state, Date.now()); toast('Clocked out. Leave a next step if you can.'); finish(); return; }
  if (act === 'write-anyway') { ensureDay(state, selectedDate()).authorOverride = true; finish(); return; }
  if (act === 'undo-override') { delete ensureDay(state, selectedDate()).authorOverride; finish(); return; }
  if (act === 'witch-tab') { state.ui.witchy = el.dataset.id; draw(); return; }
  if (act === 'open-pen') { state.ui.openPen = state.ui.openPen === el.dataset.id ? null : el.dataset.id; draw(); return; }
  if (act === 'open-season') { state.ui.openSeason = state.ui.openSeason === el.dataset.id ? null : el.dataset.id; draw(); return; }
  if (act === 'add-item') return addTrackerItem(el.dataset.pen, el.dataset.series);
  if (act === 'clear-today') {
    if (!confirm('Clear today’s checkboxes and the XP and gold they earned today? Notes, quick wins, and timer minutes stay.')) return;
    clearToday(state, selectedDate());
    finish();
    return;
  }
  if (act === 'export') return doExport();
  if (act === 'copy-backup') return copyBackup();
  if (act === 'import-text') {
    const text = $('restoreText')?.value?.trim();
    if (!text) return;
    try { doImport(JSON.parse(text)); } catch (err) { showImport(err.message || 'That isn’t backup text.', false); }
    return;
  }
  if (act === 'dismiss-upgrade') { if (state.upgrade) state.upgrade.seen = true; save(); draw(); return; }
  if (act === 'snooze-backup') { state.backupSnooze = new Date(Date.now() + 864e5).toISOString(); save(); draw(); return; }
  if (act === 'exit-demo') { location.href = './'; return; }
  if (act === 'claim') {
    const res = claimShop(state, Number(el.dataset.cost), el.dataset.name, selectedDate());
    if (res.error) toast(res.error);
    else toast('Reward claimed. Enjoy it.');
    finish();
    return;
  }
  if (act === 'mystery') {
    const res = openMystery(state, selectedDate());
    if (res.error) toast(res.error);
    else toast('Mystery box: ' + res.outcome);
    finish();
    return;
  }
  if (act === 'level-reward') {
    const reward = levelRewardCatalog.find(r => r.level === Number(el.dataset.level));
    if (!reward) return;
    claimLevelReward(state, reward, selectedDate(), totalXP(state));
    toast('Level reward claimed. No XP spent.');
    finish();
    return;
  }
  if (act === 'buy-gold') {
    const item = seasonalCatalog.find(i => i.id === el.dataset.id);
    if (!item) return;
    const res = buyGoldItem(state, item, selectedDate());
    if (res.error) toast(res.error);
    else toast(item.name + ' is in your house.');
    finish();
    return;
  }
  if (act === 'bonus-fixed') return bonusFixed(el);
  if (act === 'hyperfocus') {
    const xp = awardHyperfocusManual(state, selectedDate());
    if (!xp) toast('Hyperfocus is already counted today.');
    else toast('Hyperfocus +10. Pause for food, water, the bathroom, and the kids.');
    finish({ xp, gold: 0 });
    return;
  }
  if (act === 'add-bonus') {
    const xp = addBonus(state, selectedDate(), $('bonusAmount')?.value, $('bonusReason')?.value);
    finish({ xp, gold: 0 });
    return;
  }
  if (act === 'save-snap') {
    const iso = state.ui.snapDate || selectedDate();
    state.endOfDayLog[iso] = snapshotFor(state, iso, true);
    toast('Snapshot saved');
    finish();
    return;
  }
  if (act === 'print') { window.print(); return; }
  if (act === 'view-snap') {
    state.ui.snapDate = el.dataset.id;
    state.ui.tab = 'log';
    draw();
    return;
  }
}

function doCheck(kind, id, date) {
  const day = ensureDay(state, date);
  let result = { xp: 0, gold: 0 };
  if (kind === 'task') {
    const on = !day.checks['task:' + id];
    result = toggleListed(state, date, id, on);
  } else if (kind === 'novel') {
    result = toggleMorningNovel(state, date, !day.checks['task:morning-novel']);
  } else if (kind === 'basket') {
    result = toggleBasket(state, date, id, !day.checks['basket:' + id]);
  } else if (kind === 'custom') {
    result = toggleCustom(state, date, id, !day.checks['task:' + id]);
  } else if (kind === 'todo') {
    const todo = state.todos.find(t => t.id === id);
    result = toggleTodo(state, date, id, !(todo && todo.done === date));
  } else if (kind === 'essential') {
    result = toggleEssential(state, date, id, !day.checks['bad:' + id]);
  } else if (kind === 'witch') {
    const w = day.witchy || {};
    result = toggleWitch(state, date, 'checks', id, 'witch:' + id, 'Witchy practice', !w.checks?.[id]);
  } else if (kind === 'lunar') {
    const w = day.witchy || {};
    result = toggleWitch(state, date, 'lunarChecks', id, 'lunar:' + id, 'Lunar task', !w.lunarChecks?.[id]);
  } else if (kind === 'sabbat') {
    const w = day.witchy || {};
    result = toggleWitch(state, date, 'sabbatChecks', id, 'sabbat:' + id, 'Sabbat task', !w.sabbatChecks?.[id]);
  } else if (kind === 'focus') {
    if (day.checks['focus:weekly-cleaning']) delete day.checks['focus:weekly-cleaning'];
    else day.checks['focus:weekly-cleaning'] = true;
  }
  finish(result);
}

function addTask() {
  const value = $('newTask')?.value?.trim();
  if (!value) return;
  if ($('repeatTask')?.checked) {
    state.lists.home.push({ id: 'h-' + Date.now().toString(36), label: value, xp: 1 });
    toast('Added to every day');
  } else {
    ensureDay(state, selectedDate()).custom.push({ id: 'c' + Date.now().toString(36), label: value, xp: 1 });
  }
  finish();
}

function addTodo() {
  const value = $('newTodo')?.value?.trim();
  if (!value) return;
  state.todos.push({ id: 't' + Date.now().toString(36), label: value, xp: 1, created: selectedDate(), done: null });
  finish();
}

function addBasket() {
  const value = $('newBasket')?.value?.trim();
  if (!value) return;
  state.baskets.push({ id: 'b' + Date.now().toString(36), name: value });
  finish();
}

function addRecurring(group) {
  const input = document.getElementById('new-' + group);
  const value = input?.value?.trim();
  if (!value) return;
  state.lists[group].push({ id: group.slice(0, 1) + '-' + Date.now().toString(36), label: value, xp: 1 });
  finish();
}

function addProject() {
  const name = $('newProjectName')?.value?.trim();
  if (!name) return;
  const stage = $('newProjectStage')?.value || 'Idea / brainstorming';
  const hasPriority = state.authorProjects.some(p => p.priority && p.stage !== 'Complete');
  state.authorProjects.push({ id: 'project-' + Date.now().toString(36), name, stage, priority: !hasPriority });
  finish();
}

function addTrackerItem(penId, seriesId) {
  const pen = (state.penNames || []).find(p => p.id === penId);
  const series = pen?.series?.find(s => s.id === seriesId);
  if (!series) return;
  const n = (series.items?.length || 0) + 1;
  series.items.push({ id: seriesId + '-extra-' + n, name: 'New ' + n, kind: 'episode', status: 'planned' });
  finish();
}

function bonusFixed(el) {
  const key = el.dataset.key;
  const date = selectedDate();
  if (key === 'badday-protocol') {
    if (xpEntry(state, date, key)) return toast('Already counted today.');
    finish({ xp: manualBadDay(state, date), gold: 0 });
    return;
  }
  if (key.startsWith('streak:')) {
    const len = Number(key.slice(7));
    if (xpEntry(state, date, key)) return toast('Already counted today.');
    finish({ xp: manualStreak(state, date, len, Number(el.dataset.amount)), gold: 0 });
  }
}

function doExport() {
  state.lastBackup = new Date().toISOString();
  save();
  const file = exportBackup(state);
  const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'home-base-backup-' + todayIso() + '.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  toast('Backup file saved');
  draw();
}

async function copyBackup() {
  const text = JSON.stringify(exportBackup(state));
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; } catch (e) { ok = false; }
  state.lastBackup = new Date().toISOString();
  save();
  toast(ok ? 'Backup copied. Paste it into a note or an email to yourself.' : 'Could not copy. Use Export instead.');
  draw();
}

function doImport(obj) {
  const replace = confirm('Replace what’s on this phone with that backup? A copy of the current Home Base is kept here first. XP already earned is not thrown away by the import itself.');
  if (!replace) return;
  try {
    if (!demo) localStorage.setItem(KEY + '-before-import', localStorage.getItem(KEY) || '');
    const result = importBackup(obj, { today: todayIso(), current: state });
    state = result.state;
    if (demo) state.demo = true;
    if (!state.ui) state.ui = {};
    save();
    draw();
    showImport(result.mode === 'partial' ? 'Merged that one day.' : 'Backup restored.', true);
  } catch (err) {
    showImport(err.message || 'Could not restore that backup.', false);
  }
}

function showImport(message, ok) {
  const el = $('importMsg');
  if (!el) { toast(message); return; }
  el.hidden = false;
  el.textContent = message;
  el.className = ok ? 'notice soft' : 'notice';
}

boot();
