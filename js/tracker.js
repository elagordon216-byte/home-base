// Pen names, series, and books or episodes in order (D23, D24).

function episodes(seriesId, seasons, per, kind = 'episode') {
  const items = [];
  for (let s = 1; s <= seasons; s++) {
    for (let e = 1; e <= per; e++) {
      items.push({
        id: seriesId + '-s' + s + 'e' + e,
        name: 'S' + s + ' E' + e,
        kind,
        season: s,
        episode: e,
        status: 'planned',
      });
    }
  }
  return items;
}

function numbered(prefix, count, label, kind) {
  return Array.from({ length: count }, (_, i) => ({
    id: prefix + '-' + (i + 1),
    name: label + ' ' + (i + 1),
    kind,
    status: 'planned',
  }));
}

export function defaultTracker() {
  return [
    {
      id: 'ela-gordon',
      name: 'Ela Gordon',
      days: [1],
      blurb: 'Mondays.',
      series: [
        {
          id: 'wyatt',
          name: 'Wyatt Universe',
          note: 'Currently St. Andrew’s Academy: Sophomore Year.',
          items: [
            {
              id: 'sophomore',
              name: "St. Andrew's Academy: Sophomore Year",
              kind: 'book',
              status: 'current',
              projectId: 'project-sophomore-year',
            },
          ],
        },
        {
          id: 'haneul',
          name: 'Haneul International Academy',
          note: '',
          items: [
            { id: 'haneul-1', name: 'Haneul International Academy', kind: 'book', status: 'planned' },
          ],
        },
      ],
    },
    {
      id: 'raegan-fox',
      name: 'Raegan Fox',
      days: [3],
      blurb: 'Wednesdays.',
      series: [
        {
          id: 'spectrum',
          name: 'SPECTRUM',
          note: 'Starting with Red Eye episodes. Add the next episode when you have its title.',
          items: [
            { id: 'red-eye', name: 'Red Eye', kind: 'episode', season: 1, episode: 1, status: 'current' },
          ],
        },
        {
          id: 'missing-week',
          name: 'Missing Week',
          note: 'Dead Week is novella 1 of 7.',
          items: [
            { id: 'dead-week', name: 'Dead Week', kind: 'novella', status: 'current' },
            ...numbered('mw', 6, 'Novella', 'novella').map((item, i) => ({ ...item, id: 'mw-' + (i + 2), name: 'Novella ' + (i + 2) })),
          ],
        },
        {
          id: 'unsent',
          name: 'Unsent Postcard Project',
          note: '5 seasons of 10 episodes.',
          items: episodes('unsent', 5, 10),
        },
      ],
    },
    {
      id: 'lyra-ashmere',
      name: 'Lyra Ashmere',
      days: [4],
      blurb: 'Thursdays.',
      series: [
        {
          id: 'journeys',
          name: 'Journeys of Return',
          note: 'Monthly. 9 seasons of 4.',
          items: episodes('jor', 9, 4),
        },
        {
          id: 'kin',
          name: 'The Concordant Kin',
          note: 'Quarterly. Currently 19 episodes, and it may grow.',
          items: numbered('kin', 19, 'Episode', 'episode').map((item, i) => ({ ...item, episode: i + 1 })),
        },
        {
          id: 'whiskers',
          name: 'Whiskers of the Weave',
          note: 'Biweekly. 18 seasons of 12 episodes.',
          items: episodes('whiskers', 18, 12),
        },
        {
          id: 'engines',
          name: 'The Seven Engines Saga',
          note: '8 books.',
          items: numbered('engines', 8, 'Book', 'book'),
        },
        {
          id: 'lydia',
          name: 'Lydia trilogy',
          note: 'Unnamed trilogy.',
          items: numbered('lydia', 3, 'Book', 'book'),
        },
      ],
    },
    {
      id: 'gameplay-han',
      name: 'Gameplay and Han',
      days: [5],
      blurb: 'Fridays. Xanzia TTRPGs and fanfics.',
      series: [
        {
          id: 'xanzia',
          name: 'Xanzia TTRPGs',
          note: '',
          items: [
            { id: 'xanzia-1', name: 'Xanzia TTRPG', kind: 'game', status: 'planned' },
          ],
        },
        {
          id: 'fanfics',
          name: 'Fanfics',
          note: 'Glamour of Belonging and The City of Waking Dreams first.',
          items: [
            { id: 'glamour', name: 'Glamour of Belonging', kind: 'story', status: 'current' },
            { id: 'waking-dreams', name: 'The City of Waking Dreams', kind: 'story', status: 'planned' },
          ],
        },
      ],
    },
  ];
}

/** Weekday (0 Sunday) → pen name id. Tuesday, Saturday, and Sunday have none. */
export const PEN_BY_WEEKDAY = {
  0: null,
  1: 'ela-gordon',
  2: null,
  3: 'raegan-fox',
  4: 'lyra-ashmere',
  5: 'gameplay-han',
  6: null,
};

export const DAY_PLAN = {
  0: 'Sunday — low/no work. No writing.',
  1: 'Monday — Ela Gordon.',
  2: 'Tuesday — no writing.',
  3: 'Wednesday — Raegan Fox.',
  4: 'Thursday — Lyra Ashmere.',
  5: 'Friday — Gameplay and Han.',
  6: 'Saturday — low/no work.',
};

export function penForWeekday(wd) {
  const id = PEN_BY_WEEKDAY[wd];
  return id;
}

export function findPen(tracker, id) {
  return (tracker || []).find(p => p.id === id) || null;
}
