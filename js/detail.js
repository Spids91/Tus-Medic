// ─── DETAIL.JS ────────────────────────────────────────────────────────────────
function openDet(id){
  const d=MEDS.find(m=>m.id===id);if(!d)return;
  // Track seen drugs
  if(!G.seenDrugs.includes(id))G.seenDrugs.push(id);
  document.getElementById('detName').textContent=d.name;
  document.getElementById('detClass').textContent=d.classification;
  const smap={EMT:'EMT',P:'Paramedic',AP:'Adv. Paramedic'};
  const m=getDM(id),correct=G.drugCorrect[id]||0;
  document.getElementById('detBadges').innerHTML=
    d.scope.map(s=>`<span class="sbadge sbadge-${s}">${smap[s]}</span>`).join('')+
    `<span class="det-mbadge" style="background:${MASTERY_COLORS[m]}22;color:${MASTERY_COLORS[m]}">Questions (${Math.min(correct,10)}/10)</span>`;
  document.getElementById('detBody').innerHTML=buildDet(d);
  document.getElementById('detOverlay').classList.add('open');
  document.body.style.overflow='hidden';
  haptic();
}
function closeDet(){
  document.getElementById('detOverlay').classList.remove('open');
  document.body.style.overflow='';
  checkBadges();saveG();renderDrugList();
}
function buildDet(d){
  const pres=Array.isArray(d.presentation)?d.presentation:[d.presentation];
  const adm=Array.isArray(d.administration)?d.administration:[d.administration];
  const correct=G.drugCorrect[d.id]||0;
  const pct=Math.min(correct/10*100,100);
  const m=getDM(d.id);
  const noteVal=(G.notes[d.id]||'').replace(/"/g,'&quot;');
  function dh(dose){
    if(!dose)return'<div style="color:var(--text3);font-size:14px">Not indicated.</div>';
    if(typeof dose==='string')return`<div class="dose-text">${dose.replace(/\n/g,'<br>')}</div>`;
    return Object.entries(dose).map(([k,v])=>`<div style="margin-bottom:8px"><div style="font-size:11px;font-weight:600;color:var(--em-700);margin-bottom:3px">${k}</div><div class="dose-text">${v.replace(/\n/g,'<br>')}</div></div>`).join('');
  }
  return`
  <div class="dsec"><div class="dsh"><div class="sico" style="background:var(--em-50)">💊</div><div class="dst">Presentation</div></div><div class="dsb"><ul class="blist">${pres.map(p=>`<li>${p}</li>`).join('')}</ul></div></div>
  <div class="dsec"><div class="dsh"><div class="sico" style="background:var(--em-50)">🛤</div><div class="dst">Routes of Administration</div></div><div class="dsb"><ul class="blist">${adm.map(a=>`<li>${a}</li>`).join('')}</ul></div></div>
  <div class="dsec"><div class="dsh"><div class="sico" style="background:#F0FDF4">✅</div><div class="dst">Indications</div></div><div class="dsb"><ul class="blist">${d.indications.map(i=>`<li>${i}</li>`).join('')}</ul></div></div>
  <div class="dsec"><div class="dsh"><div class="sico" style="background:#FFF5F5">🚫</div><div class="dst">Contraindications</div></div><div class="dsb"><div class="ci-list">${d.contraindications.map(c=>`<div class="ci"><div class="ci-dot"></div><div class="ci-text">${c}</div></div>`).join('')}</div></div></div>
  <div class="dsec"><div class="dsh"><div class="sico" style="background:#FFFBEB">💉</div><div class="dst">Dosages</div></div><div class="dsb"><div class="dose-block"><div class="dose-grp"><div class="dose-lbl">👤 Adult</div>${dh(d.dosages.adult)}</div><div class="dose-grp"><div class="dose-lbl">👶 Paediatric</div>${dh(d.dosages.paediatric)}</div></div></div></div>
  <div class="dsec"><div class="dsh"><div class="sico" style="background:#FFF5F5">⚠️</div><div class="dst">Side Effects</div></div><div class="dsb"><ul class="blist">${d.sideEffects.map(s=>`<li>${s}</li>`).join('')}</ul></div></div>
  <div class="dsec"><div class="dsh"><div class="sico" style="background:var(--em-50)">ℹ️</div><div class="dst">Additional Information</div></div><div class="dsb"><div class="info-box">${d.additionalInfo}</div></div></div>
  <div class="dsec"><div class="dsh"><div class="sico" style="background:var(--em-50)">📈</div><div class="dst">Question Progress</div></div>
  <div class="dsb"><div class="prog-wrap"><div class="prog-fill" style="width:${pct}%;background:${MASTERY_COLORS[m]}"></div></div>
  <div class="prog-lbl"><span>${MASTERY_LABELS[m]}</span><span>Questions (${Math.min(correct,10)}/10)</span></div></div></div>
  <div class="dsec"><div class="dsh"><div class="sico" style="background:#F5F3FF">📝</div><div class="dst">My Notes</div></div><div class="dsb">
  <textarea class="notes-area" id="note-${d.id}" placeholder="Add your own notes, mnemonics, clinical pearls…" oninput="G.notes[${d.id}]=this.value;saveG()">${noteVal}</textarea>
  <div class="notes-hint">Notes save automatically</div></div></div>`;
}
