export function priorityProject(state) {
  const ps = state.authorProjects || [];
  return ps.find(p => p.priority && p.stage !== 'Complete')
    || ps.find(p => !['Complete', 'On hold'].includes(p.stage))
    || null;
}

export function priorityName(state) {
  const p = priorityProject(state);
  return p ? p.name : 'your current project';
}

export function tpl(state, label) {
  return String(label ?? '').replace(/\{priority\}/g, priorityName(state));
}
