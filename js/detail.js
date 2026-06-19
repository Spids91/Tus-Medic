// ─── DETAIL.JS v6.2 ───────────────────────────────────────────────────────────

// iOS-style swipe right to close with animation
let _touchStartX = 0;
let _touchStartY = 0;
let _swiping = false;

function initSwipeBack() {
  const overlay = document.getElementById('detOverlay');

  overlay.addEventListener('touchstart', e => {
    _touchStartX = e.touches[0].clientX;
    _touchStartY = e.touches[0].clientY;
    _swiping = false;
  }, { passive: true });

  overlay.addEventListener('touchmove', e => {
    const dx = e.touches[0].clientX - _touchStartX;
    const dy = Math.abs(e.touches[0].clientY - _touchStartY);
    // Only track horizontal swipe starting from left edge area
    if (dx > 0 && dy < 60) {
      _swiping = true;
      const pct = Math.min(dx / window.innerWidth, 1);
      overlay.style.transform = 'translateX(' + (dx * 0.6) + 'px)';
      overlay.style.opacity = String(1 - pct * 0.3);
    }
  }, { passive: true });

  overlay.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - _touchStartX;
    const dy = Math.abs(e.changedTouches[0].clientY - _touchStartY);
    if (_swiping && dx > 100 && dy < 60) {
      // Complete the swipe
      overlay.style.transition = 'transform 0.25s ease, opacity 0.25s ease';
      overlay.style.transform = 'translateX(100%)';
      overlay.style.opacity = '0';
      setTimeout(() => {
        overlay.style.transition = '';
        overlay.style.transform = '';
        overlay.style.opacity = '';
        closeDet();
      }, 250);
    } else {
      // Snap back
      overlay.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
      overlay.style.transform = '';
      overlay.style.opacity = '';
      setTimeout(() => { overlay.style.transition = ''; }, 300);
    }
    _swiping = false;
  }, { passive: true });
}

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
    `<span class="det-mbadge" style="background:${MASTERY_COLORS[m]}22;color:${MASTERY_COLORS[m]}">${mLabel}</span>`;
  document.getElementById('detBody').innerHTML = buildDet(d);
  document.getElementById('detOverlay').classList.add('open');
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
  const pres    = Array.isArray(d.presentation)   ? d.presentation   : [d.presentation];
  const adm     = Array.isArray(d.administration) ? d.administration : [d.administration];
  const correct = G.drugCorrect[d.id] || 0;
  const pct     = Math.min(correct / 10 * 100, 100);
  const m       = getDM(d.id);
  const noteVal = (G.notes[d.id] || '').replace(/"/g, '&quot;');

  function dh(dose) {
    if (!dose) return '<div style="color:var(--text3);font-size:14px">Not indicated.</div>';
    if (typeof dose === 'string') return `<div class="dose-text">${dose.replace(/\n/g, '<br>')}</div>`;
    return Object.entries(dose).map(([k, v]) => `
      <div style="margin-bottom:8px">
        <div style="font-size:11px;font-weight:600;color:var(--em-700);margin-bottom:3px">${k}</div>
        <div class="dose-text">${v.replace(/\n/g, '<br>')}</div>
      </div>`).join('');
  }

  const mLabel = m === 'unseen' ? 'Questions (0/10)' : `${MASTERY_LABELS[m]} (${Math.min(correct,10)}/10)`;

  return `
    <div class="dsec">
      <div class="dsh"><div class="sico" style="background:var(--em-50)">💊</div><div class="dst">Presentation</div></div>
      <div class="dsb"><ul class="blist">${pres.map(p => `<li>${p}</li>`).join('')}</ul></div>
    </div>
    <div class="dsec">
      <div class="dsh"><div class="sico" style="background:var(--em-50)">🛤</div><div class="dst">Routes of Administration</div></div>
      <div class="dsb"><ul class="blist">${adm.map(a => `<li>${a}</li>`).join('')}</ul></div>
    </div>
    <div class="dsec">
      <div class="dsh"><div class="sico" style="background:var(--success-light)">✅</div><div class="dst">Indications</div></div>
      <div class="dsb"><ul class="blist">${d.indications.map(i => `<li>${i}</li>`).join('')}</ul></div>
    </div>
    <div class="dsec">
      <div class="dsh"><div class="sico" style="background:var(--error-light)">🚫</div><div class="dst">Contraindications</div></div>
      <div class="dsb"><div class="ci-list">${d.contraindications.map(c => `
        <div class="ci"><div class="ci-dot"></div><div class="ci-text">${c}</div></div>`).join('')}
      </div></div>
    </div>
    <div class="dsec">
      <div class="dsh"><div class="sico" style="background:var(--warning-light)">💉</div><div class="dst">Dosages</div></div>
      <div class="dsb"><div class="dose-block">
        <div class="dose-grp"><div class="dose-lbl">👤 Adult</div>${dh(d.dosages.adult)}</div>
        <div class="dose-grp"><div class="dose-lbl">👶 Paediatric</div>${dh(d.dosages.paediatric)}</div>
      </div></div>
    </div>
    <div class="dsec">
      <div class="dsh"><div class="sico" style="background:var(--error-light)">⚠️</div><div class="dst">Side Effects</div></div>
      <div class="dsb"><ul class="blist">${d.sideEffects.map(s => `<li>${s}</li>`).join('')}</ul></div>
    </div>
    <div class="dsec">
      <div class="dsh"><div class="sico" style="background:var(--em-50)">ℹ️</div><div class="dst">Additional Information</div></div>
      <div class="dsb"><div class="info-box">${d.additionalInfo}</div></div>
    </div>
    <div class="dsec">
      <div class="dsh"><div class="sico" style="background:var(--primary-light)">📈</div><div class="dst">Question Progress</div></div>
      <div class="dsb">
        <div class="prog-wrap">
          <div class="prog-fill" style="width:${pct}%;background:linear-gradient(to right,#1E3A8A,#3B82F6)"></div>
        </div>
        <div class="prog-lbl"><span>${mLabel}</span><span>${correct}/10 correct</span></div>
      </div>
    </div>
    <div class="dsec">
      <div class="dsh"><div class="sico" style="background:rgba(124,58,237,.08)">📝</div><div class="dst">My Notes</div></div>
      <div class="dsb">
        <textarea class="notes-area" id="note-${d.id}"
          placeholder="Add your own notes, mnemonics, clinical pearls…"
          oninput="G.notes[${d.id}]=this.value;saveG()">${noteVal}</textarea>
        <div class="notes-hint">Notes save automatically</div>
      </div>
    </div>`;
}

// Init swipe on load
document.addEventListener('DOMContentLoaded', initSwipeBack);
// Also init immediately in case DOMContentLoaded already fired
initSwipeBack();
