export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function taskButton({ kind, id, label, sub, xp, done }) {
  return `<button type="button" class="task${done ? ' done' : ''}" data-act="check" data-kind="${esc(kind)}" data-id="${esc(id)}">
    <span class="box" aria-hidden="true">${done ? '✓' : ''}</span>
    <span class="t">${esc(label)}${sub ? `<small>${esc(sub)}</small>` : ''}</span>
    ${xp ? `<span class="xp">+${esc(xp)}</span>` : '<span class="xp"></span>'}
  </button>`;
}

export function panel(title, body, { id, pill, open = true } = {}) {
  const collapsed = open ? '' : ' collapsed';
  return `<section class="panel${collapsed}" ${id ? `data-panel="${esc(id)}"` : ''}>
    <div class="head" data-act="collapse" data-id="${esc(id || '')}" role="button" tabindex="0" aria-expanded="${open ? 'true' : 'false'}">
      <h2>${title}</h2>${pill ? `<span class="pill">${pill}</span>` : ''}<span class="chev" aria-hidden="true">▾</span>
    </div>
    <div class="panel-body">${body}</div>
  </section>`;
}
