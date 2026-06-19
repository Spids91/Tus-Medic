// ─── LEARN.JS ─────────────────────────────────────────────────────────────────
// Learn tab: PCR codes, PCI line, medical terms, paediatric weight calculator

let learnSec = 'pcr';
let learnQ   = '';

function selLearn(sec, el) {
  document.querySelectorAll('.lchip').forEach(c => c.classList.remove('on'));
  el.classList.add('on');
  learnSec = sec;
  haptic();
  renderLearn();
}

function handleLearnSearch(q) {
  learnQ = q.toLowerCase();
  renderLearn();
}

function renderLearn() {
  const c = document.getElementById('learnContent');
  if      (learnSec === 'pci')   c.innerHTML = renderPCI();
  else if (learnSec === 'pcr')   c.innerHTML = renderPCR();
  else if (learnSec === 'terms') c.innerHTML = renderTerms();
  else if (learnSec === 'paed')  c.innerHTML = renderPaed();
}

// ── PRIMARY PCI LINE ──────────────────────────────────────────────────────────
function renderPCI() {
  const dialNum = PCI_NUMBER.replace(/\s/g, '');
  return `
    <div class="pci-card">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--em-400)">Primary PCI Line</div>
      <div class="pci-number" onclick="callNumber('${dialNum}')">📞 ${PCI_NUMBER}</div>
      <div style="font-size:11px;color:rgba(255,255,255,.5);margin-bottom:10px">Tap number to dial — then select:</div>
      ${PCI_LABS.map(l => `
        <div class="pci-row">
          <div class="pci-num">${l.n}</div>
          <div class="pci-hospital">${l.hospital}</div>
        </div>`).join('')}
    </div>`;
}

// ── PCR CODES ─────────────────────────────────────────────────────────────────
function renderPCR() {
  const filtered = learnQ
    ? HOSPITALS.filter(h =>
        h.name.toLowerCase().includes(learnQ) ||
        h.pcr.toLowerCase().includes(learnQ) ||
        h.county.toLowerCase().includes(learnQ))
    : HOSPITALS;

  if (!filtered.length) {
    return '<div class="empty"><div class="empty-ico">🔍</div><p>No hospitals match your search</p></div>';
  }

  // Group by county
  const grouped = {};
  filtered.forEach(h => {
    if (!grouped[h.county]) grouped[h.county] = [];
    grouped[h.county].push(h);
  });

  return Object.entries(grouped).map(([county, hosps]) => `
    <div class="hosp-county">${county}</div>
    ${hosps.map(h => {
      const mainDial = h.main.split('/')[0].replace(/[^0-9]/g, '');
      const edDial   = h.ed !== 'n/a' ? h.ed.split('/')[0].replace(/[^0-9]/g, '') : '';
      return `
        <div class="hosp-card">
          <div class="hosp-name">${h.name}</div>
          <div><span class="hosp-code">${h.pcr}</span></div>
          <div class="hosp-nums">
            <div class="hosp-num">
              <div class="hosp-num-lbl">Main Line</div>
              <div class="hosp-num-val" onclick="callNumber('${mainDial}')">${h.main}</div>
            </div>
            <div class="hosp-num">
              <div class="hosp-num-lbl">ED / Direct</div>
              <div class="hosp-num-val ${h.ed === 'n/a' ? 'na' : ''}"
                ${h.ed !== 'n/a' ? `onclick="callNumber('${edDial}')"` : ''}>${h.ed}</div>
            </div>
          </div>
        </div>`;
    }).join('')}
  `).join('');
}

// ── MEDICAL TERMS ─────────────────────────────────────────────────────────────
function renderTerms() {
  const filtered = learnQ
    ? TERMS.filter(t =>
        t.term.toLowerCase().includes(learnQ) ||
        t.def.toLowerCase().includes(learnQ))
    : TERMS;

  if (!filtered.length) {
    return '<div class="empty"><div class="empty-ico">🔍</div><p>No terms match your search</p></div>';
  }

  return `<div style="animation:pgIn .28s ease both">
    ${filtered.map(t => `
      <div class="term-card">
        <div class="term-word">${t.term}</div>
        <div class="term-def">${t.def}</div>
      </div>`).join('')}
  </div>`;
}

// ── PAEDIATRIC WEIGHT CALCULATOR ──────────────────────────────────────────────
// PHECC-approved weight estimation formula:
//   Neonate      = 3.5 kg
//   Six months   = 6 kg
//   1–5 years    = (age × 2) + 8 kg
//   > 5 years    = (age × 3) + 7 kg

function renderPaed() {
  return `
    <div class="paed-card">
      <div class="paed-title">PHECC Paediatric Weight Estimation</div>
      <div class="paed-input-row">
        <input type="number" class="paed-input" id="paedAge"
          placeholder="0" min="0" max="18" oninput="calcPaed(this.value)"/>
        <span class="paed-unit">years old</span>
      </div>
      <div id="paedResult" style="display:none" class="paed-result">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--em-400)">Estimated Weight</div>
        <div class="paed-weight" id="paedWeight">— kg</div>
        <div class="paed-formula-grid">
          <div class="paed-f-item"><div class="paed-f-lbl">Adrenaline 1:10,000 (cardiac arrest)</div><div class="paed-f-val" id="pdAdr">—</div></div>
          <div class="paed-f-item"><div class="paed-f-lbl">Adrenaline 1:1,000 (anaphylaxis IM)</div><div class="paed-f-val" id="pdAdrIM">—</div></div>
          <div class="paed-f-item"><div class="paed-f-lbl">Glucose 10% IV</div><div class="paed-f-val" id="pdGluc">—</div></div>
          <div class="paed-f-item"><div class="paed-f-lbl">Midazolam buccal (seizure)</div><div class="paed-f-val" id="pdMid">—</div></div>
          <div class="paed-f-item"><div class="paed-f-lbl">Morphine IV (50mcg/kg)</div><div class="paed-f-val" id="pdMorph">—</div></div>
          <div class="paed-f-item"><div class="paed-f-lbl">Naloxone IN/EMT (20mcg/kg)</div><div class="paed-f-val" id="pdNalox">—</div></div>
          <div class="paed-f-item"><div class="paed-f-lbl">NaCl 0.9% (anaphylaxis 20mL/kg)</div><div class="paed-f-val" id="pdNacl">—</div></div>
          <div class="paed-f-item"><div class="paed-f-lbl">Paracetamol PO (15mg/kg)</div><div class="paed-f-val" id="pdParac">—</div></div>
        </div>
      </div>
    </div>

    <div class="paed-card" style="margin-top:0">
      <div class="paed-title">PHECC Weight Formula Reference</div>
      <table class="paed-table">
        <tr><th>Age Group</th><th>Formula</th></tr>
        <tr><td>Neonate</td><td>3.5 kg</td></tr>
        <tr><td>Six months</td><td>6 kg</td></tr>
        <tr><td>1–5 years</td><td>(age × 2) + 8 kg</td></tr>
        <tr><td>&gt;5 years</td><td>(age × 3) + 7 kg</td></tr>
      </table>
    </div>`;
}

function calcPaed(age) {
  age = parseFloat(age);
  if (isNaN(age) || age < 0) {
    document.getElementById('paedResult').style.display = 'none';
    return;
  }

  // PHECC weight estimation
  let wt;
  if (age === 0)       wt = 3.5;
  else if (age <= 0.5) wt = 6;
  else if (age <= 5)   wt = Math.round((age * 2 + 8) * 10) / 10;
  else                 wt = Math.round((age * 3 + 7) * 10) / 10;

  document.getElementById('paedResult').style.display = 'block';
  document.getElementById('paedWeight').textContent   = wt + ' kg';

  // Drug doses
  document.getElementById('pdAdr').textContent   = `${(wt * 0.1).toFixed(1)} mL of 1:10,000`;
  document.getElementById('pdGluc').textContent  = `${(wt * 2).toFixed(0)} mL`;
  document.getElementById('pdMorph').textContent = `${(wt * 0.05).toFixed(2)} mg IV`;
  document.getElementById('pdNalox').textContent = `${(wt * 0.02 * 1000).toFixed(0)} mcg IN`;
  document.getElementById('pdNacl').textContent  = `${(wt * 20).toFixed(0)} mL`;
  document.getElementById('pdParac').textContent = `${(wt * 15).toFixed(0)} mg PO`;

  // Adrenaline IM (anaphylaxis — age-banded)
  let adrIM;
  if (age < 0.5)      adrIM = `${(wt * 0.01).toFixed(2)} mL (10mcg/kg)`;
  else if (age < 6)   adrIM = '0.15 mL IM (150mcg)';
  else if (age < 12)  adrIM = '0.3 mL IM (300mcg)';
  else                adrIM = '0.3–0.5 mL IM';
  document.getElementById('pdAdrIM').textContent = adrIM;

  // Midazolam buccal (seizure — age-banded)
  let mid;
  if (age < 0.25)    mid = `${(wt * 0.3).toFixed(2)} mg (max 2.5mg)`;
  else if (age < 1)  mid = '2.5 mg buccal';
  else if (age < 5)  mid = '5 mg buccal';
  else if (age < 10) mid = '7.5 mg buccal';
  else               mid = '10 mg buccal';
  document.getElementById('pdMid').textContent = mid;
}

// ── TAP TO CALL ───────────────────────────────────────────────────────────────
function callNumber(num) {
  const clean = num.replace(/[^0-9+]/g, '');
  window.location.href = `tel:${clean}`;
  haptic();
}

// Init
renderLearn();
