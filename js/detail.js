// ─── DETAIL.JS ────────────────────────────────────────────────────────────────

function openDet(id) {
  const d = MEDS.find(m => m.id === id);
  if (!d) return;
  if (!G.seenDrugs.includes(id)) G.seenDrugs.push(id);
  document.getElementById('detName').textContent  = d.name;
  document.getElementById('detClass').textContent = d.classification;
  const smap = { EMT:'EMT', P:'Paramedic', AP:'Adv. Paramedic' };
  const m       = getDM(id);
  const correct = G.drugCorrect[id] || 0;
  const mLabel  = m === 'unseen' ? `Questions (0/10)` : `${MASTERY_LABELS[m]} (${Math.min(correct,10)}/10)`;
  document.getElementById('detBadges').innerHTML =
    d.scope.map(s => `<span class="sbadge sbadge-${s}">${smap[s]}</span>`).join('') +
    `<span class="det-mbadge det-mbadge-${m}">${mLabel}</span>`;
  document.getElementById('detBody').innerHTML = buildDet(d);
  const overlay = document.getElementById('detOverlay');
  overlay.classList.add('open');
  overlay.scrollTop = 0;
  document.body.style.overflow = 'hidden';
  haptic();
}

function closeDet() {
  document.getElementById('detOverlay').classList.remove('open');
  document.body.style.overflow = '';
  checkBadges();
  saveG();
  renderDrugList();
}

function buildDet(d) {
  const pres = Array.isArray(d.presentation)   ? d.presentation   : [d.presentation];
  const adm  = Array.isArray(d.administration) ? d.administration : [d.administration];
  const correct = G.drugCorrect[d.id] || 0;
  const pct     = Math.min(correct / 10 * 100, 100);
  const m       = getDM(d.id);
  const noteVal = (G.notes[d.id] || '').replace(/"/g, '&quot;');
  const smap2   = { EMT:'EMT', P:'Paramedic', AP:'Advanced Paramedic' };

  function dh(dose) {
    if (!dose || dose.trim() === 'Not indicated.') {
      return '<div style="color:var(--text3);font-size:14px">Not indicated.</div>';
    }
    const lines = Array.isArray(dose) ? dose : [dose];
    return lines.map(l => `<div class="dose-line">${l}</div>`).join('');
  }

  let out = '';

  // Mastery progress
  out += `<div class="dsec">
    <div class="dsec-hdr">📊 Mastery Progress</div>
    <div class="dsec-body">
      <div class="prog-wrap"><div class="prog-bar" style="width:${pct}%"></div></div>
      <div style="font-size:12px;color:var(--text3);margin-top:4px">${Math.min(correct,10)}/10 correct answers</div>
    </div>
  </div>`;

  // Scope
  out += `<div class="dsec">
    <div class="dsec-hdr">👥 Scope of Practice</div>
    <div class="dsec-body">${d.scope.map(s=>`<span class="sbadge sbadge-${s}">${smap2[s]}</span>`).join(' ')}</div>
  </div>`;

  // Indications
  if (d.indications?.length) {
    out += `<div class="dsec">
      <div class="dsec-hdr">✅ Indications</div>
      <div class="dsec-body"><ul class="det-list">${d.indications.map(i=>`<li>${i}</li>`).join('')}</ul></div>
    </div>`;
  }

  // Contraindications
  if (d.contraindications?.length) {
    out += `<div class="dsec">
      <div class="dsec-hdr">🚫 Contraindications</div>
      <div class="dsec-body"><ul class="det-list">${d.contraindications.map(i=>`<li>${i}</li>`).join('')}</ul></div>
    </div>`;
  }

  // Presentation
  out += `<div class="dsec">
    <div class="dsec-hdr">💊 Presentation</div>
    <div class="dsec-body">${pres.map(p=>`<div class="dose-line">${p}</div>`).join('')}</div>
  </div>`;

  // Administration
  out += `<div class="dsec">
    <div class="dsec-hdr">💉 Administration</div>
    <div class="dsec-body">${adm.map(a=>`<div class="dose-line">${a}</div>`).join('')}</div>
  </div>`;

  // Dosages (adult + paediatric)
  if (d.dosages?.adult) {
    out += `<div class="dsec">
      <div class="dsec-hdr">🧑 Adult Dose</div>
      <div class="dsec-body">${dh(d.dosages.adult)}</div>
    </div>`;
  }
  if (d.dosages?.paediatric) {
    out += `<div class="dsec">
      <div class="dsec-hdr">👶 Paediatric Dose</div>
      <div class="dsec-body">${dh(d.dosages.paediatric)}</div>
    </div>`;
  }

  // Side effects
  if (d.sideEffects?.length) {
    out += `<div class="dsec">
      <div class="dsec-hdr">⚠️ Side Effects</div>
      <div class="dsec-body"><ul class="det-list">${d.sideEffects.map(i=>`<li>${i}</li>`).join('')}</ul></div>
    </div>`;
  }

  // Additional info
  if (d.additionalInfo) {
    out += `<div class="dsec">
      <div class="dsec-hdr">ℹ️ Additional Information</div>
      <div class="dsec-body" style="font-size:14px;color:var(--text2);line-height:1.6">${d.additionalInfo}</div>
    </div>`;
  }

  // Mechanism (from quizHints)
  if (d.quizHints?.mechanism) {
    out += `<div class="dsec">
      <div class="dsec-hdr">🔬 Mechanism of Action</div>
      <div class="dsec-body" style="font-size:14px;color:var(--text2);line-height:1.6">${d.quizHints.mechanism}</div>
    </div>`;
  }

  // Notes
  out += `<div class="dsec">
    <div class="dsec-hdr">📝 My Notes</div>
    <div class="dsec-body">
      <textarea class="det-note" placeholder="Add your own notes…" oninput="G.notes['${d.id}']=this.value;saveG()">${noteVal}</textarea>
    </div>
  </div>`;

  return out;
}
