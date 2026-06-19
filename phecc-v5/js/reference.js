// ─── REFERENCE.JS ────────────────────────────────────────────────────────────
// Reference tab: drug list, search, scope filter chips

let refScope = 'all';
let refQ = '';

function getFiltered() {
  return MEDS.filter(m => {
    const scopeOk = refScope === 'all' || m.scope.includes(refScope);
    const qOk = !refQ ||
      m.name.toLowerCase().includes(refQ) ||
      m.classification.toLowerCase().includes(refQ) ||
      m.indications.some(i => i.toLowerCase().includes(refQ));
    return scopeOk && qOk;
  });
}

function renderDrugList() {
  const drugs = getFiltered();
  const names = { all:'All', EMT:'EMT', P:'Paramedic', AP:'Adv. Paramedic' };

  document.getElementById('listLabel').textContent = refQ
    ? `Results for "${refQ}"`
    : `${names[refScope] || 'All'} Medications (${drugs.length})`;

  const list = document.getElementById('drugList');
  if (!drugs.length) {
    list.innerHTML = '<div class="empty"><div class="empty-ico">🔍</div><p>No drugs match your search</p></div>';
    return;
  }

  list.innerHTML = drugs.map(d => {
    const m    = getDM(d.id);
    const dots = d.scope.map(s => `<div class="sdot sdot-${s}"></div>`).join('');
    return `
      <div class="drug-card" onclick="openDet(${d.id})">
        <div class="drug-info">
          <div class="drug-name">${d.name}</div>
          <div class="drug-class">${d.classification}</div>
        </div>
        <div class="drug-right">
          <div class="scope-dots">${dots}</div>
          <div class="mtag mt-${m}">${MASTERY_LABELS[m]}</div>
        </div>
        <svg class="chev" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 18l6-6-6-6"/>
        </svg>
      </div>`;
  }).join('');
}

// Scope chip click handlers
document.querySelectorAll('.chip').forEach(c => {
  c.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach(x => x.classList.remove('on'));
    c.classList.add('on');
    refScope = c.dataset.scope;
    haptic();
    renderDrugList();
  });
});

// Search input handler
document.getElementById('searchInput').addEventListener('input', e => {
  refQ = e.target.value.trim().toLowerCase();
  if (!refQ) renderDrugList();
});

// Init
renderDrugList();
