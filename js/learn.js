// ─── LEARN.JS ─────────────────────────────────────────────────────────────────
let learnSec='terms',learnQ='',paedScope='EMT';

function selLearn(sec,el){
  document.querySelectorAll('.lchip').forEach(c=>c.classList.remove('on'));
  el.classList.add('on');
  // Clear search when switching tabs
  learnQ='';
  document.getElementById('learnSearch').value='';
  document.getElementById('learnClear').style.display='none';
  learnSec=sec;haptic();renderLearn();
}

function handleLearnSearch(q){
  learnQ=q.toLowerCase();
  document.getElementById('learnClear').style.display=q?'flex':'none';
  if(learnQ){
    renderLearnSearch(learnQ);
  } else {
    renderLearn();
  }
}

function renderLearnSearch(q){
  const c=document.getElementById('learnContent');
  let html='';

  // Search terms
  const termResults=TERMS.filter(t=>t.term.toLowerCase().includes(q)||t.def.toLowerCase().includes(q));
  if(termResults.length){
    html+='<div class="term-cat-header"><span class="term-cat-icon">📖</span>Medical Terms</div>';
    html+=termResults.map(t=>`
      <div class="term-card" onclick="toggleTerm(this)" id="term-${t.term.replace(/\s+/g,'_').replace(/[()]/g,'')}">
        <div class="term-card-header"><div class="term-word">${t.term}</div><div class="term-chevron">›</div></div>
        <div class="term-def">${t.def}</div>
      </div>`).join('');
  }

  // Search hospitals
  const hospResults=HOSPITALS.filter(h=>
    h.name.toLowerCase().includes(q)||
    h.pcr.toLowerCase().includes(q)||
    h.county.toLowerCase().includes(q)
  );
  if(hospResults.length){
    html+='<div class="term-cat-header" style="margin-top:16px"><span class="term-cat-icon">🏥</span>Hospitals</div>';
    html+=hospResults.map(h=>{
      const mainDial=h.main.split('/')[0].replace(/[^0-9]/g,'');
      const edDial=h.ed!=='n/a'?h.ed.split('/')[0].replace(/[^0-9]/g,''):'';
      return`<div class="hosp-card" id="hosp-${h.pcr}">
        <div class="hosp-name">${h.name}</div>
        <div><span class="hosp-code">${h.pcr}</span></div>
        <div class="hosp-nums">
          <div class="hosp-num"><div class="hosp-num-lbl">Main Line</div><div class="hosp-num-val" onclick="callNumber('${mainDial}')">${h.main}</div></div>
          <div class="hosp-num"><div class="hosp-num-lbl">ED / Direct</div><div class="hosp-num-val ${h.ed==='n/a'?'na':''}" ${h.ed!=='n/a'?`onclick="callNumber('${edDial}')"`:''}>${h.ed}</div></div>
        </div>
      </div>`;
    }).join('');
  }

  if(!html){
    html='<div class="empty"><div class="empty-ico">🔍</div><p>No results found</p></div>';
  }

  c.innerHTML=html;
}

function clearLearnSearch(){
  learnQ='';
  document.getElementById('learnSearch').value='';
  document.getElementById('learnClear').style.display='none';
  renderLearn();
}

function renderLearn(){
  const c=document.getElementById('learnContent');
  if(learnSec==='pci')c.innerHTML=renderPCI();
  else if(learnSec==='pcr')c.innerHTML=renderPCR();
  else if(learnSec==='terms')c.innerHTML=renderTerms();
  else if(learnSec==='paed')c.innerHTML=renderPaed();
}

// MEDICAL TERMS — grouped by category with accordion
const TERM_CATEGORIES=[
  {name:'Cardiovascular',icon:'❤️',terms:['Angina','Arrhythmia','Asystole','Bradycardia','Cardiac Tamponade','Cardiogenic Shock','Defibrillation','Diastole','Fibrillation','Hypertension','Hypertensive Crisis','Hypotension','Myocardial Infarction (MI)','Palpitation','Pericarditis','Sinus Rhythm','Systole','Tachycardia','Thrombosis','Torsades de Pointes','Ventricular Fibrillation (VF)','Ventricular Tachycardia (VT)']},
  {name:'Respiratory',icon:'🫁',terms:['Apnoea','Asphyxia','Bronchospasm','Croup','Dyspnoea','Hyperventilation','Pneumothorax','Pulmonary Embolism (PE)','Pulmonary Oedema','Stridor','Tachypnoea','Tension Pneumothorax','Wheeze']},
  {name:'Neurology',icon:'🧠',terms:['Ataxia','Cerebrovascular Accident (CVA)','Coma','Convulsion','Dissociation','Dystonia','Lethargy','Meningism','Meningitis','Paraesthesia','Seizure','Syncope','Transient Ischaemic Attack (TIA)','Vertigo']},
  {name:'Metabolic & Endocrine',icon:'⚗️',terms:['Acidosis','Alkalosis','Dehydration','Hyperglycaemia','Hyperkalaemia','Hyperthermia','Hypoglycaemia','Hypokalaemia','Hypothermia','Pyrexia']},
  {name:'Haematology & Bleeding',icon:'🩸',terms:['Anaemia','Haematoma','Haematuria','Haemolysis','Haemoptysis','Haemorrhage','Haemostasis']},
  {name:'Renal & Fluid',icon:'💧',terms:['Diuresis','Hypovolaemia','Oedema','Oliguria','Orthostatic Hypotension','Polydipsia','Polyuria']},
  {name:'Gastrointestinal',icon:'🫃',terms:['Nausea','Dysphagia','Jaundice']},
  {name:'Musculoskeletal & Trauma',icon:'🦴',terms:['Crepitus','Rhabdomyolysis','Trauma']},
  {name:'Obstetric',icon:'🤱',terms:['Eclampsia','Pre-eclampsia']},
  {name:'Pharmacology & Drug Terms',icon:'💊',terms:['Analgesia','Antipyretic','Contraindication','Dysuria','Extravasation','Pruritus']},
  {name:'General Clinical',icon:'🏥',terms:['Acute','Aetiology','Auscultation','Capillary Refill Time (CRT)','Cellulitis','Chronic','Constriction','Decompensation','Diaphoresis','Dilatation','Embolism','Epistaxis','Exacerbation','Hypoxia','Idiopathic','Infarction','Ischaemia','Malaise','Necrosis','Neurogenic Shock','Orthopnoea','Pallor','Perfusion','Periorbital','Shock','Subcutaneous','Tinnitus','Triage','Urticaria','Vasoconstriction','Vasodilation']}
];

function renderTerms(){
  // Find term object by name
  function getTerm(name){return TERMS.find(t=>t.term===name);}

  if(learnQ){
    // Search mode — flat filtered list
    const filtered=TERMS.filter(t=>t.term.toLowerCase().includes(learnQ)||t.def.toLowerCase().includes(learnQ));
    if(!filtered.length)return'<div class="empty"><div class="empty-ico">🔍</div><p>No terms match your search</p></div>';
    return`<div>${filtered.map(t=>`
      <div class="term-card" onclick="toggleTerm(this)" id="term-${t.term.replace(/\s+/g,'_').replace(/[()]/g,'')}">
        <div class="term-card-header"><div class="term-word">${t.term}</div><div class="term-chevron">›</div></div>
        <div class="term-def">${t.def}</div>
      </div>`).join('')}</div>`;
  }

  // Category mode
  return TERM_CATEGORIES.map(cat=>{
    const catTerms=cat.terms.map(name=>getTerm(name)).filter(Boolean);
    if(!catTerms.length)return'';
    return`<div style="margin-bottom:20px">
      <div class="term-cat-header"><span class="term-cat-icon">${cat.icon}</span>${cat.name}</div>
      ${catTerms.map(t=>`
        <div class="term-card" onclick="toggleTerm(this)" id="term-${t.term.replace(/\s+/g,'_').replace(/[()]/g,'')}">
          <div class="term-card-header"><div class="term-word">${t.term}</div><div class="term-chevron">›</div></div>
          <div class="term-def">${t.def}</div>
        </div>`).join('')}
    </div>`;
  }).join('');
}

function toggleTerm(el){
  // Close any other open term first
  document.querySelectorAll(".term-card.open").forEach(c=>{if(c!==el)c.classList.remove("open");});
  el.classList.toggle('open');
  haptic();
}

// PAED CALCULATOR
const PAED_DRUGS={
  EMT:[
    {lbl:'Adrenaline 1:1,000 (anaphylaxis IM)',drugName:'Adrenaline 1:1,000',fn:(wt,age)=>{if(age<0.5)return`${(wt*0.01).toFixed(2)} mL IM`;if(age<6)return'0.15 mL IM (150mcg)';if(age<12)return'0.3 mL IM (300mcg)';return'0.3–0.5 mL IM';}},
    {lbl:'Glucose Gel (buccal)',drugName:'Glucose Gel',fn:(wt,age)=>age<=8?'5–10g buccal':'10–20g buccal'},
    {lbl:'Glucagon IM',drugName:'Glucagon',fn:(wt)=>wt<25?'500mcg IM':'1mg IM'},
    {lbl:'Ibuprofen PO (10mg/kg)',drugName:'Ibuprofen',fn:(wt)=>`${Math.min(wt*10,400).toFixed(0)} mg PO`},
    {lbl:'Methoxyflurane INH',drugName:'Methoxyflurane',fn:()=>'3mL INH (≥5yr only)'},
    {lbl:'Naloxone IN (20mcg/kg)',drugName:'Naloxone',fn:(wt)=>`${(wt*0.02*1000).toFixed(0)} mcg IN`},
    {lbl:'Oxygen',drugName:'Oxygen',fn:()=>'100% until SpO₂ reliable, then 96–98%'},
    {lbl:'Paracetamol PO (15mg/kg)',drugName:'Paracetamol',fn:(wt)=>`${(wt*15).toFixed(0)} mg PO`},
    {lbl:'Salbutamol NEB',drugName:'Salbutamol',fn:(wt,age)=>age<5?'2.5mg NEB':'5mg NEB'},
  ],
  P:[
    {lbl:'Adrenaline 1:1,000 (anaphylaxis IM)',drugName:'Adrenaline 1:1,000',fn:(wt,age)=>{if(age<0.5)return`${(wt*0.01).toFixed(2)} mL IM`;if(age<6)return'0.15 mL IM (150mcg)';if(age<12)return'0.3 mL IM (300mcg)';return'0.3–0.5 mL IM';}},
    {lbl:'Chlorphenamine IM',drugName:'Chlorphenamine',fn:(wt,age)=>{if(age<0.5)return`${(wt*0.25).toFixed(2)} mg IM`;if(age<6)return'2.5mg IM';if(age<12)return'5mg IM';return'10mg IM';}},
    {lbl:'Dexamethasone PO (croup)',drugName:'Dexamethasone',fn:(wt)=>`${Math.min(wt*0.3,12).toFixed(1)} mg PO`},
    {lbl:'Glucose 10% IV (2mL/kg)',drugName:'Glucose 10% Solution',fn:(wt)=>`${(wt*2).toFixed(0)} mL IV`},
    {lbl:'Hydrocortisone IM (anaphylaxis)',drugName:'Hydrocortisone',fn:(wt,age)=>{if(age<0.5)return'25mg IM';if(age<6)return'50mg IM';if(age<12)return'100mg IM';return'200mg IM';}},
    {lbl:'Midazolam buccal (seizure)',drugName:'Midazolam',fn:(wt,age)=>{if(age<0.25)return`${(wt*0.3).toFixed(2)}mg`;if(age<1)return'2.5mg buccal';if(age<5)return'5mg buccal';if(age<10)return'7.5mg buccal';return'10mg buccal';}},
    {lbl:'Naloxone IM (10mcg/kg)',drugName:'Naloxone',fn:(wt)=>`${(wt*0.01*1000).toFixed(0)} mcg IM`},
    {lbl:'NaCl 0.9% (anaphylaxis 20mL/kg)',drugName:'Sodium Chloride 0.9%',fn:(wt)=>`${(wt*20).toFixed(0)} mL IV`},
    {lbl:'Ondansetron IM (100mcg/kg)',drugName:'Ondansetron',fn:(wt)=>`${Math.min(wt*0.1,4).toFixed(2)} mg IM`},
    {lbl:'Salbutamol NEB',drugName:'Salbutamol',fn:(wt,age)=>age<5?'2.5mg NEB':'5mg NEB'},
  ],
  AP:[
    {lbl:'Adrenaline 1:10,000 (cardiac arrest)',drugName:'Adrenaline 1:10,000',fn:(wt)=>`${(wt*0.1).toFixed(1)} mL IV/IO (10mcg/kg)`},
    {lbl:'Adrenaline 1:1,000 (anaphylaxis IM)',drugName:'Adrenaline 1:1,000',fn:(wt,age)=>{if(age<0.5)return`${(wt*0.01).toFixed(2)} mL IM`;if(age<6)return'0.15 mL IM (150mcg)';if(age<12)return'0.3 mL IM (300mcg)';return'0.3–0.5 mL IM';}},
    {lbl:'Amiodarone VF/pVT (5mg/kg)',drugName:'Amiodarone',fn:(wt)=>`${(wt*5).toFixed(0)} mg IV/IO`},
    {lbl:'Ceftriaxone IV (50mg/kg)',drugName:'Ceftriaxone',fn:(wt)=>`${Math.min(wt*50,2000).toFixed(0)} mg IV`},
    {lbl:'Fentanyl IN (1.5mcg/kg)',drugName:'Fentanyl',fn:(wt)=>`${Math.min(wt*1.5,100).toFixed(0)} mcg IN`},
    {lbl:'Glucose 10% IV (2mL/kg)',drugName:'Glucose 10% Solution',fn:(wt)=>`${(wt*2).toFixed(0)} mL IV`},
    {lbl:'Ketamine IV pain (0.1–0.3mg/kg)',drugName:'Ketamine',fn:(wt)=>`${(wt*0.1).toFixed(1)}–${(wt*0.3).toFixed(1)} mg IV`},
    {lbl:'Lidocaine IO pain (500mcg/kg)',drugName:'Lidocaine',fn:(wt)=>`${Math.min(wt*0.5,40).toFixed(1)} mg IO`},
    {lbl:'Midazolam buccal (seizure)',drugName:'Midazolam',fn:(wt,age)=>{if(age<0.25)return`${(wt*0.3).toFixed(2)}mg`;if(age<1)return'2.5mg buccal';if(age<5)return'5mg buccal';if(age<10)return'7.5mg buccal';return'10mg buccal';}},
    {lbl:'Morphine IV (50mcg/kg)',drugName:'Morphine Sulphate',fn:(wt)=>`${(wt*0.05).toFixed(2)} mg IV`},
    {lbl:'Naloxone IV (10mcg/kg)',drugName:'Naloxone',fn:(wt)=>`${(wt*0.01*1000).toFixed(0)} mcg IV/IO`},
    {lbl:'NaCl 0.9% (anaphylaxis 20mL/kg)',drugName:'Sodium Chloride 0.9%',fn:(wt)=>`${(wt*20).toFixed(0)} mL IV`},
  ]
};

function openPaedDrugByName(name){
  if(!name)return;
  const drug=MEDS.find(m=>m.name===name);
  if(drug){openDet(drug.id);haptic();}
}

function renderPaed(){
  return`<div class="paed-card">
    <div class="paed-title">PHECC Paediatric Weight Estimation</div>
    <div class="paed-scope-btns">
      <button class="paed-scope-btn on-emt" onclick="setPaedScope('EMT',this)">EMT</button>
      <button class="paed-scope-btn" onclick="setPaedScope('P',this)">Paramedic</button>
      <button class="paed-scope-btn" onclick="setPaedScope('AP',this)">Adv. Paramedic</button>
    </div>
    <div class="paed-input-row">
      <input type="number" class="paed-input" id="paedAge" placeholder="0" min="0" max="18" oninput="calcPaed(this.value)"/>
      <span class="paed-unit">years old</span>
    </div>
    <div id="paedResult" style="display:none" class="paed-result">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#93C5FD">Estimated Weight</div>
      <div class="paed-weight" id="paedWeight">— kg</div>
      <div class="paed-formula-grid" id="paedDrugs"></div>
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

function setPaedScope(scope,el){
  paedScope=scope;
  document.querySelectorAll('.paed-scope-btn').forEach(b=>{b.className='paed-scope-btn';});
  el.classList.add(`on-${scope.toLowerCase()}`);
  haptic();
  const age=parseFloat(document.getElementById('paedAge')?.value);
  if(!isNaN(age))calcPaed(age);
}

function calcPaed(age){
  age=parseFloat(age);
  if(isNaN(age)||age<0){document.getElementById('paedResult').style.display='none';return;}
  let wt;
  if(age===0)wt=3.5;
  else if(age<=0.5)wt=6;
  else if(age<=5)wt=Math.round((age*2+8)*10)/10;
  else wt=Math.round((age*3+7)*10)/10;
  document.getElementById('paedResult').style.display='block';
  document.getElementById('paedWeight').textContent=wt+' kg';
  const drugs=PAED_DRUGS[paedScope]||PAED_DRUGS.EMT;
  document.getElementById('paedDrugs').innerHTML=drugs.map(d=>`
    <div class="paed-f-item" onclick="openPaedDrugByName('${d.drugName||''}')">
      <div class="paed-f-lbl">${d.lbl}</div>
      <div class="paed-f-val">${d.fn(wt,age)}</div>
      <div class="paed-f-tap">Tap to open →</div>
    </div>`).join('');
}

// PCI
function renderPCI(){
  return`<div class="pci-card">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#93C5FD">Primary PCI Line</div>
    <div class="pci-number" onclick="callNumber('${PCI_NUMBER.replace(/\s/g,'')}')">${PCI_NUMBER}</div>
    <div style="font-size:11px;color:rgba(255,255,255,.5);margin-bottom:10px">Tap number to dial — then select:</div>
    ${PCI_LABS.map(l=>`<div class="pci-row"><div class="pci-num">${l.n}</div><div class="pci-hospital">${l.hospital}</div></div>`).join('')}
  </div>`;
}

// PCR
function renderPCR(){
  const filtered=learnQ?HOSPITALS.filter(h=>h.name.toLowerCase().includes(learnQ)||h.pcr.toLowerCase().includes(learnQ)||h.county.toLowerCase().includes(learnQ)):HOSPITALS;
  if(!filtered.length)return'<div class="empty"><div class="empty-ico">🔍</div><p>No hospitals match your search</p></div>';
  const grouped={};
  filtered.forEach(h=>{if(!grouped[h.county])grouped[h.county]=[];grouped[h.county].push(h);});
  return Object.entries(grouped).map(([county,hosps])=>`
    <div class="hosp-county">${county}</div>
    ${hosps.map(h=>{
      const mainDial=h.main.split('/')[0].replace(/[^0-9]/g,'');
      const edDial=h.ed!=='n/a'?h.ed.split('/')[0].replace(/[^0-9]/g,''):'';
      return`<div class="hosp-card" id="hosp-${h.pcr}">
        <div class="hosp-name">${h.name}</div>
        <div><span class="hosp-code">${h.pcr}</span></div>
        <div class="hosp-nums">
          <div class="hosp-num"><div class="hosp-num-lbl">Main Line</div><div class="hosp-num-val" onclick="callNumber('${mainDial}')">${h.main}</div></div>
          <div class="hosp-num"><div class="hosp-num-lbl">ED / Direct</div><div class="hosp-num-val ${h.ed==='n/a'?'na':''}" ${h.ed!=='n/a'?`onclick="callNumber('${edDial}')"`:''}>${h.ed}</div></div>
        </div>
      </div>`;
    }).join('')}`).join('');
}

function callNumber(num){
  const clean=num.replace(/[^0-9+]/g,'');
  window.location.href=`tel:${clean}`;
  haptic();
}

renderLearn();
