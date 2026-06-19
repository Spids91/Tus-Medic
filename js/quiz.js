// ─── QUIZ.JS v0.8.0 ───────────────────────────────────────────────────────────
// Full quiz engine: standard, weak spots, timed, category, daily challenge
// Scenario + drug comparison = coming soon

// ── QUESTION TYPES ────────────────────────────────────────────────────────────
const EASY_QTYPES=[
  {id:'ind',prompt:'Indications',q:d=>`What are the main indications for ${d.name}?`,a:d=>d.indications.slice(0,3).join('; ')},
  {id:'dose',prompt:'Adult Dosage',q:d=>`What is the adult dose of ${d.name}?`,a:d=>typeof d.dosages.adult==='string'?d.dosages.adult:Object.values(d.dosages.adult).join(' | ')},
  {id:'fact',prompt:'Key Clinical Fact',q:d=>`What is the key clinical fact for ${d.name}?`,a:d=>d.quizHints.keyFact},
];
const HARD_QTYPES=[
  {id:'contra',prompt:'Contraindications',q:d=>`Name key contraindications for ${d.name}`,a:d=>d.contraindications.slice(0,3).join('; ')},
  {id:'mech',prompt:'Mechanism of Action',q:d=>`What is the mechanism of action of ${d.name}?`,a:d=>d.quizHints.mechanism},
  {id:'id',prompt:'Identify the Drug',q:d=>`"${d.quizHints.keyFact.split('—')[0].trim()}" — which drug?`,a:d=>`${d.name} (${d.classification})`},
  {id:'class',prompt:'Drug Classification',q:d=>`What class of drug is ${d.name}?`,a:d=>d.classification},
  {id:'route',prompt:'Administration Routes',q:d=>`What are the routes of administration for ${d.name}?`,a:d=>Array.isArray(d.administration)?d.administration.join(', '):d.administration},
  {id:'side',prompt:'Side Effects',q:d=>`Name the main side effects of ${d.name}`,a:d=>d.sideEffects.slice(0,3).join('; ')},
];
const TERM_QTYPES=[
  {prompt:'Define the Term',q:t=>`What does "${t.term}" mean?`,a:t=>t.def},
  {prompt:'Identify the Term',q:t=>`"${t.def.substring(0,80)}…" — what term is this?`,a:t=>t.term}
];

// ── SPACED REPETITION ─────────────────────────────────────────────────────────
function getNextReview(drugId){
  const correct=G.drugCorrect[drugId]||0;
  const mastery=getMastery(correct);
  const days={unseen:0,novice:2,learning:4,proficient:7,mastered:14};
  const d=new Date();
  d.setDate(d.getDate()+(days[mastery]||2));
  return d.toISOString().slice(0,10);
}
function isDueForReview(drugId){
  if(!G.nextReview)G.nextReview={};
  const due=G.nextReview[drugId];
  if(!due)return true;
  return todayKey()>=due;
}
function markReviewed(drugId,correct){
  if(!G.nextReview)G.nextReview={};
  if(correct){G.nextReview[drugId]=getNextReview(drugId);}
  else{
    // Wrong — review tomorrow
    const d=new Date();d.setDate(d.getDate()+1);
    G.nextReview[drugId]=d.toISOString().slice(0,10);
    // Track recent wrong answers
    if(!G.recentWrong)G.recentWrong=[];
    if(!G.recentWrong.includes(drugId))G.recentWrong.unshift(drugId);
    G.recentWrong=G.recentWrong.slice(0,20);
  }
}

// ── CATEGORIES ────────────────────────────────────────────────────────────────
const DRUG_CATEGORIES=[
  {name:'Analgesics',       icon:'💊', filter:d=>d.classification.toLowerCase().includes('analg')||d.classification.toLowerCase().includes('opioid')||d.classification.toLowerCase().includes('anaes')},
  {name:'Cardiovascular',   icon:'❤️', filter:d=>d.classification.toLowerCase().includes('cardio')||d.classification.toLowerCase().includes('antiarr')||d.classification.toLowerCase().includes('nitrate')||d.classification.toLowerCase().includes('antithromb')||d.classification.toLowerCase().includes('antiplatelet')},
  {name:'Respiratory',      icon:'🫁', filter:d=>d.classification.toLowerCase().includes('bronch')||d.classification.toLowerCase().includes('beta-2')||d.classification.toLowerCase().includes('inhaled')},
  {name:'Antiemetics',      icon:'🤢', filter:d=>d.classification.toLowerCase().includes('antiemetic')},
  {name:'Corticosteroids',  icon:'⚗️', filter:d=>d.classification.toLowerCase().includes('corticoster')},
  {name:'Benzodiazepines',  icon:'🧠', filter:d=>d.classification.toLowerCase().includes('benzodiazepin')},
  {name:'Fluids & Electrolytes',icon:'💧',filter:d=>d.classification.toLowerCase().includes('fluid')||d.classification.toLowerCase().includes('electrolyte')||d.classification.toLowerCase().includes('crystalloid')},
  {name:'Antimicrobials',   icon:'🦠', filter:d=>d.classification.toLowerCase().includes('antibact')||d.classification.toLowerCase().includes('cephalos')},
  {name:'Antidotes',        icon:'🧪', filter:d=>d.classification.toLowerCase().includes('antidote')||d.classification.toLowerCase().includes('antagonist')||d.classification.toLowerCase().includes('opioid ant')},
  {name:'Hormones & Oxytocics',icon:'🤱',filter:d=>d.classification.toLowerCase().includes('hormone')||d.classification.toLowerCase().includes('oxytoc')||d.classification.toLowerCase().includes('glycogen')},
];

// ── DAILY CHALLENGE ───────────────────────────────────────────────────────────
function getDailyChallengeSeed(){
  // Same seed for everyone on the same day
  return Math.floor(Date.now()/86400000);
}
function seededRandom(seed,i){
  const x=Math.sin(seed*9301+i*49297+233)*100000;
  return x-Math.floor(x);
}
function genDailyChallenge(){
  const seed=getDailyChallengeSeed();
  const qs=[];
  for(let i=0;i<5;i++){
    const drugIdx=Math.floor(seededRandom(seed,i)*MEDS.length);
    const qtIdx=Math.floor(seededRandom(seed,i+100)*EASY_QTYPES.length);
    const d=MEDS[drugIdx];
    const qt=EASY_QTYPES[qtIdx];
    const correct=qt.a(d);
    const wrongIdxs=[];
    while(wrongIdxs.length<3){
      const wi=Math.floor(seededRandom(seed,i*100+wrongIdxs.length+200)*MEDS.length);
      if(wi!==drugIdx&&!wrongIdxs.includes(wi))wrongIdxs.push(wi);
    }
    const wrong=wrongIdxs.map(wi=>qt.a(MEDS[wi]).split(';')[0].trim().substring(0,90));
    // Shuffle with seed
    const opts=[correct,...wrong];
    for(let j=opts.length-1;j>0;j--){
      const k=Math.floor(seededRandom(seed,i*1000+j)*( j+1));
      [opts[j],opts[k]]=[opts[k],opts[j]];
    }
    qs.push({drug:d,qt,opts,isTerm:false,isDaily:true});
  }
  return qs;
}
function isDailyDone(){
  return G.lastDailyDate===todayKey();
}

// ── QUESTION HELPERS ──────────────────────────────────────────────────────────
function getPlausibleDistractors(qt,drug,allDrugs){
  if(qt.id==='mech')return allDrugs.filter(x=>x.id!==drug.id).sort(()=>Math.random()-.5).slice(0,3).map(x=>x.quizHints.mechanism.substring(0,90));
  if(qt.id==='contra')return allDrugs.filter(x=>x.id!==drug.id).sort(()=>Math.random()-.5).slice(0,3).map(x=>x.contraindications.slice(0,3).join('; ').substring(0,90));
  return allDrugs.filter(x=>x.id!==drug.id).sort(()=>Math.random()-.5).slice(0,3).map(x=>qt.a(x).split(';')[0].split('.')[0].trim().substring(0,90));
}
function pickQType(drug){
  const correct=G.drugCorrect[drug.id]||0;
  const mastery=getMastery(correct);
  if(mastery==='unseen'||mastery==='novice')return EASY_QTYPES[Math.floor(Math.random()*EASY_QTYPES.length)];
  if(mastery==='learning'){const all=[...EASY_QTYPES,...HARD_QTYPES];return all[Math.floor(Math.random()*all.length)];}
  return HARD_QTYPES[Math.floor(Math.random()*HARD_QTYPES.length)];
}
function makeDrugQ(d,allDrugs){
  const qt=pickQType(d);
  const correct=qt.a(d);
  const wrong=getPlausibleDistractors(qt,d,allDrugs);
  return{drug:d,qt,opts:[correct,...wrong].sort(()=>Math.random()-.5),isTerm:false};
}
function genDrugQuestions(drugs,n=10){
  let pool=[];
  drugs.forEach(d=>{for(let i=0;i<3;i++)pool.push(makeDrugQ(d,drugs));});
  pool.sort((a,b)=>{const ma=G.drugCorrect[a.drug.id]||0,mb=G.drugCorrect[b.drug.id]||0;return ma-mb+Math.random()-.5;});
  return pool.slice(0,Math.min(n,pool.length));
}
function genTermQuestions(n=10){
  let pool=[];
  TERMS.forEach(t=>TERM_QTYPES.forEach(qt=>{
    const correct=qt.a(t);
    const wrong=TERMS.filter(x=>x.term!==t.term).sort(()=>Math.random()-.5).slice(0,3).map(x=>qt.a(x).substring(0,90));
    pool.push({term:t,qt,opts:[correct,...wrong].sort(()=>Math.random()-.5),isTerm:true});
  }));
  return pool.sort(()=>Math.random()-.5).slice(0,Math.min(n,pool.length));
}
function getQText(q){return q.isTerm?q.qt.q(q.term):q.qt.q(q.drug);}
function getQAns(q){return q.isTerm?q.qt.a(q.term):q.qt.a(q.drug);}
function getQPrompt(q){return q.qt.prompt;}

// ── QUIZ STATE ────────────────────────────────────────────────────────────────
let QZ={
  mode:'standard',scope:'all',category:null,
  qs:[],idx:0,correct:0,answered:false,flipped:false,
  xpThis:0,isTerms:false,isTimed:false,isDaily:false,
  timeLeft:30,timerInterval:null,
  streak:0,// consecutive correct in this quiz
  wrongAnswers:[],// {q, correctAns} for breakdown
  lastSettings:{mode:'standard',scope:'all'}
};

// ── QUIZ TAB RENDER ───────────────────────────────────────────────────────────
function renderQuizTab(){
  document.getElementById('quizTabContent').innerHTML=buildQuizTab();
}

function buildQuizTab(){
  const dailyDone=isDailyDone();
  const dailyQ=getDailyChallengeSeed();
  const weekDays=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const today=new Date().getDay();
  const todayDate=new Date();
  const dateStr=todayDate.toLocaleDateString('en-IE',{day:'numeric',month:'long'});

  // Weak spots count
  const weakCount=((G.recentWrong||[]).length);
  // Due for review count
  const dueCount=MEDS.filter(m=>isDueForReview(m.id)&&(G.drugCorrect[m.id]||0)>0).length;

  return`
  <!-- Daily Challenge -->
  <div class="daily-card ${dailyDone?'done':''}" onclick="${dailyDone?'':'startDailyChallenge()'}">
    <div class="daily-top">
      <div class="daily-icon">📅</div>
      <div class="daily-info">
        <div class="daily-title">Daily Challenge</div>
        <div class="daily-sub">5 questions · ${dateStr} · same for everyone</div>
      </div>
      <div class="daily-status">${dailyDone?'<span class="daily-done-badge">✓ Done</span>':'<span class="daily-start-btn">Start →</span>'}</div>
    </div>
    ${dailyDone?'<div class="daily-done-msg">Come back tomorrow for a new set</div>':'<div class="daily-bonus-msg">⚡ +15 XP bonus for completing daily challenge</div>'}
  </div>

  <!-- Mode grid -->
  <div class="quiz-mode-section-label">Quiz Modes</div>
  <div class="quiz-mode-grid">
    <div class="qmode-card" onclick="startModeSetup('standard')">
      <div class="qmode-icon">📚</div>
      <div class="qmode-name">Standard</div>
      <div class="qmode-desc">Mixed difficulty questions</div>
    </div>
    <div class="qmode-card" onclick="startModeSetup('adaptive')">
      <div class="qmode-icon">🧠</div>
      <div class="qmode-name">Adaptive</div>
      <div class="qmode-desc">Adjusts to your mastery level</div>
    </div>
    <div class="qmode-card ${weakCount===0?'qmode-dim':''}" onclick="startModeSetup('weakspots')">
      <div class="qmode-icon">🎯</div>
      <div class="qmode-name">Weak Spots</div>
      <div class="qmode-desc">${weakCount>0?`${weakCount} drugs to review`:'No weak spots yet'}</div>
    </div>
    <div class="qmode-card" onclick="startModeSetup('timed')">
      <div class="qmode-icon">⚡</div>
      <div class="qmode-name">Timed</div>
      <div class="qmode-desc">30 seconds per question</div>
    </div>
    <div class="qmode-card" onclick="showCategoryPicker()">
      <div class="qmode-icon">🔬</div>
      <div class="qmode-name">Category</div>
      <div class="qmode-desc">Quiz a specific drug class</div>
    </div>
    <div class="qmode-card qmode-coming" onclick="showComingSoon('Scenario Mode')">
      <div class="qmode-icon">🏥</div>
      <div class="qmode-name">Scenario</div>
      <div class="qmode-desc">Coming soon</div>
      <div class="qmode-soon-badge">Soon</div>
    </div>
    <div class="qmode-card qmode-coming" onclick="showComingSoon('Drug Comparison')">
      <div class="qmode-icon">💊</div>
      <div class="qmode-name">Comparison</div>
      <div class="qmode-desc">Coming soon</div>
      <div class="qmode-soon-badge">Soon</div>
    </div>
  </div>

  <!-- Spaced review -->
  ${dueCount>0?`<div class="review-banner" onclick="startModeSetup('review')">
    <div class="review-banner-icon">🔁</div>
    <div class="review-banner-text"><strong>${dueCount} drug${dueCount>1?'s':''} due for review</strong><br>Based on your spaced repetition schedule</div>
    <div class="review-banner-arrow">→</div>
  </div>`:''}

  <!-- Terms quiz -->
  <div class="terms-quiz-card" onclick="startModeSetup('terms')">
    <div class="qmode-icon">📖</div>
    <div class="terms-quiz-info">
      <div class="qmode-name">Medical Terms Quiz</div>
      <div class="qmode-desc">${TERMS.length} terms — flashcard or multiple choice</div>
    </div>
    <div style="color:var(--text3)">→</div>
  </div>`;
}

function showComingSoon(name){
  showToast(`${name} — coming in a future update`);
}

// ── SETUP FLOW ────────────────────────────────────────────────────────────────
function startModeSetup(mode){
  QZ.mode=mode;
  if(mode==='terms'){
    showQuizSetupScreen('terms');
  } else if(mode==='standard'||mode==='timed'||mode==='review'){
    showQuizSetupScreen(mode);
  } else if(mode==='weakspots'){
    const drugs=(G.recentWrong||[]).map(id=>MEDS.find(m=>m.id===id)).filter(Boolean);
    if(!drugs.length){showToast('No weak spots yet — keep quizzing!');return;}
    launchQuiz(genDrugQuestions(drugs,10),mode==='timed',false);
  }
}

function showQuizSetupScreen(mode){
  const isTimed=mode==='timed';
  const isTerms=mode==='terms';
  const isReview=mode==='review';
  const isAdaptive=mode==='adaptive';
  document.getElementById('quizTabContent').innerHTML=`
    <div class="quiz-back-sticky" onclick="renderQuizTab()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> Back
    </div>
    <div class="pg-title">${isTimed?'⚡ Timed Quiz':isTerms?'📖 Terms Quiz':isReview?'🔁 Spaced Review':'📚 Standard Quiz'}</div>
    <div class="pg-sub">${isTimed?'30 seconds per question — think fast':isReview?'Drugs due for review based on your performance':'Adaptive difficulty based on your mastery'}</div>
    ${isTerms||isReview?'':`
    <div class="og">
      <span class="og-lbl">Scope</span>
      <div class="scope-opts">
        <div class="sopt on-all" onclick="selScope('all',this)"><div class="sdot-sm" style="background:var(--sl-500)"></div><div class="sopt-txt"><div class="sopt-name">All Drugs</div><div class="sopt-cnt" id="cntAll">${MEDS.length} drugs</div></div><div class="sopt-chk">✓</div></div>
        <div class="sopt" onclick="selScope('EMT',this)"><div class="sdot-sm" style="background:var(--emt)"></div><div class="sopt-txt"><div class="sopt-name">EMT</div><div class="sopt-cnt">${MEDS.filter(m=>m.scope.includes('EMT')).length} drugs</div></div><div class="sopt-chk">✓</div></div>
        <div class="sopt" onclick="selScope('P',this)"><div class="sdot-sm" style="background:var(--par)"></div><div class="sopt-txt"><div class="sopt-name">Paramedic</div><div class="sopt-cnt">${MEDS.filter(m=>m.scope.includes('P')).length} drugs</div></div><div class="sopt-chk">✓</div></div>
        <div class="sopt" onclick="selScope('AP',this)"><div class="sdot-sm" style="background:var(--ap)"></div><div class="sopt-txt"><div class="sopt-name">Advanced Paramedic</div><div class="sopt-cnt">${MEDS.filter(m=>m.scope.includes('AP')).length} drugs</div></div><div class="sopt-chk">✓</div></div>
      </div>
    </div>`}
    <div class="og">
      <span class="og-lbl">Format</span>
      <div class="mode-grid">
        <div class="mode-card on" onclick="selMode('mc',this)"><div class="mode-ico">🎯</div><div class="mode-name">Multiple Choice</div><div class="mode-desc">4 options — auto-marked</div></div>
        <div class="mode-card" onclick="selMode('fc',this)"><div class="mode-ico">🃏</div><div class="mode-name">Flashcard</div><div class="mode-desc">Tap to flip — self-mark</div></div>
      </div>
    </div>
    ${isTimed?'<div class="adaptive-badge">⏱ 30 seconds per question — timer starts when question appears</div>':'<div class="adaptive-badge">⚡ Adaptive — difficulty adjusts to your mastery level</div>'}
    <button class="btn-pri" onclick="launchFromSetup('${mode}')">Start Quiz</button>`;
}

function showCategoryPicker(){
  document.getElementById('quizTabContent').innerHTML=`
    <div class="quiz-back-sticky" onclick="renderQuizTab()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> Back
    </div>
    <div class="pg-title">🔬 Category Quiz</div>
    <div class="pg-sub">Pick a drug class to focus on</div>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${DRUG_CATEGORIES.map(cat=>{
        const drugs=MEDS.filter(cat.filter);
        return`<div class="cat-card ${drugs.length===0?'cat-empty':''}" onclick="${drugs.length>0?`selectCategory('${cat.name}')`:''}" >
          <div class="cat-icon">${cat.icon}</div>
          <div class="cat-info"><div class="cat-name">${cat.name}</div><div class="cat-count">${drugs.length} drug${drugs.length!==1?'s':''}</div></div>
          <div style="color:var(--text3)">→</div>
        </div>`;
      }).join('')}
    </div>`;
}

function selectCategory(catName){
  QZ.category=catName;
  QZ.mode='category';
  document.getElementById('quizTabContent').innerHTML=`
    <div class="quiz-back-sticky" onclick="showCategoryPicker()">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> Back
    </div>
    <div class="pg-title">🔬 ${catName}</div>
    <div class="pg-sub">Quiz this drug category</div>
    <div class="og">
      <span class="og-lbl">Format</span>
      <div class="mode-grid">
        <div class="mode-card on" onclick="selMode('mc',this)"><div class="mode-ico">🎯</div><div class="mode-name">Multiple Choice</div><div class="mode-desc">4 options — auto-marked</div></div>
        <div class="mode-card" onclick="selMode('fc',this)"><div class="mode-ico">🃏</div><div class="mode-name">Flashcard</div><div class="mode-desc">Tap to flip — self-mark</div></div>
      </div>
    </div>
    <button class="btn-pri" onclick="launchCategoryQuiz()">Start Quiz</button>`;
}

function launchCategoryQuiz(){
  const cat=DRUG_CATEGORIES.find(c=>c.name===QZ.category);
  if(!cat)return;
  const drugs=MEDS.filter(cat.filter);
  if(!drugs.length){showToast('No drugs in this category');return;}
  launchQuiz(genDrugQuestions(drugs,10),QZ.mode==='timed',false);
}

function launchFromSetup(mode){
  const isTerms=mode==='terms';
  const isTimed=mode==='timed';
  const isReview=mode==='review';
  const isAdaptive=mode==='adaptive';
  let qs;
  if(isTerms){qs=genTermQuestions(10);}
  else if(isReview){
    const due=MEDS.filter(m=>isDueForReview(m.id)&&(G.drugCorrect[m.id]||0)>0);
    if(!due.length){showToast('No drugs due for review');renderQuizTab();return;}
    qs=genDrugQuestions(due,10);
  } else {
    const drugs=QZ.scope==='all'?MEDS:MEDS.filter(m=>m.scope.includes(QZ.scope));
    if(!drugs.length){showToast('No drugs for this filter');return;}
    qs=genDrugQuestions(drugs,10);
  }
  launchQuiz(qs,isTimed,isTerms);
}

function startDailyChallenge(){
  if(isDailyDone()){showToast('Already completed today — come back tomorrow!');return;}
  const qs=genDailyChallenge();
  QZ.mode='mc';
  QZ.isDaily=true;
  launchQuiz(qs,false,false,true);
}

// ── LAUNCH ────────────────────────────────────────────────────────────────────
function launchQuiz(qs,isTimed=false,isTerms=false,isDaily=false){
  QZ={...QZ,qs,idx:0,correct:0,answered:false,flipped:false,xpThis:0,
      isTimed,isTerms,isDaily,streak:0,wrongAnswers:[],
      timeLeft:30,timerInterval:null};
  QZ.lastSettings={mode:QZ.mode,scope:QZ.scope};
  const qtc=document.getElementById('quizTabContent');
  const qaw=document.getElementById('quizActiveWrap');
  if(qtc)qtc.style.display='none';
  if(qaw)qaw.style.display='block';
  const qres=document.getElementById('qResults');
  if(qres)qres.classList.remove('show');
  if(QZ.mode==='fc'||QZ.mode==='flashcard'){
    document.getElementById('fcMode').style.display='block';
    document.getElementById('mcMode').style.display='none';
    renderFC();
  } else {
    document.getElementById('fcMode').style.display='none';
    document.getElementById('mcMode').style.display='block';
    renderMC();
  }
}

function exitToQuizTab(){
  clearTimerInterval();
  const qtc=document.getElementById('quizTabContent');
  const qaw=document.getElementById('quizActiveWrap');
  const qres=document.getElementById('qResults');
  if(qtc)qtc.style.display='block';
  if(qaw)qaw.style.display='none';
  if(qres)qres.classList.remove('show');
  renderQuizTab();
}

function newQuiz(){
  exitToQuizTab();
  // Relaunch same mode
  setTimeout(()=>startModeSetup(QZ.lastSettings.mode||'standard'),100);
}
function resetQuiz(){exitToQuizTab();}
function confirmResetQuiz(){if(confirm('End this quiz?'))exitToQuizTab();}

// ── TIMER ─────────────────────────────────────────────────────────────────────
function startTimer(){
  clearTimerInterval();
  QZ.timeLeft=30;
  updateTimerDisplay();
  QZ.timerInterval=setInterval(()=>{
    QZ.timeLeft--;
    updateTimerDisplay();
    if(QZ.timeLeft<=0){
      clearTimerInterval();
      // Time's up — mark wrong
      if(!QZ.answered){
        timeUp();
      }
    }
  },1000);
}
function clearTimerInterval(){
  if(QZ.timerInterval){clearInterval(QZ.timerInterval);QZ.timerInterval=null;}
}
function updateTimerDisplay(){
  const el=document.getElementById('timerDisplay');
  if(!el)return;
  el.textContent=QZ.timeLeft;
  el.style.color=QZ.timeLeft<=10?'var(--red)':'var(--text)';
  // Update ring
  const ring=document.getElementById('timerRing');
  if(ring){
    const pct=QZ.timeLeft/30;
    const circ=2*Math.PI*18;
    ring.style.strokeDashoffset=circ*(1-pct);
    ring.style.stroke=QZ.timeLeft<=10?'#DC2626':'#2563EB';
  }
}
function timeUp(){
  QZ.answered=true;
  QZ.streak=0;
  // Record wrong answer
  const q=QZ.qs[QZ.idx];
  QZ.wrongAnswers.push({q,correctAns:getQAns(q)});
  if(!q.isTerm)markReviewed(q.drug.id,false);
  G.totalQ++;
  // Highlight correct in MC
  document.querySelectorAll('.mc-opt').forEach(o=>{
    if(o.textContent===getQAns(q)||o.textContent===getQAns(q).substring(0,107)+'…')o.classList.add('correct');
    o.classList.add('revealed');
  });
  document.getElementById('mcNext').classList.add('show');
  haptic('error');
  saveG();
}

// ── STREAK BURST ──────────────────────────────────────────────────────────────
function checkStreakBurst(){
  if(QZ.streak>0&&QZ.streak%3===0){
    const burst=document.getElementById('streakBurst');
    if(burst){
      burst.textContent=`🔥 ${QZ.streak} in a row! +5 XP`;
      burst.classList.add('show');
      setTimeout(()=>burst.classList.remove('show'),2000);
    }
    QZ.xpThis+=5;G.xp+=5;updateHdr();
  }
}

// ── FLASHCARD ─────────────────────────────────────────────────────────────────
function renderFC(){
  const{qs,idx}=QZ;
  if(idx>=qs.length){showResults();return;}
  const q=qs[idx];
  document.getElementById('fcProg').style.width=(idx/qs.length*100)+'%';
  document.getElementById('fcCtr').textContent=`${idx+1} / ${qs.length}`;
  document.getElementById('fcPrompt').textContent=getQPrompt(q);
  document.getElementById('fcQ').textContent=getQText(q);
  document.getElementById('fcAnsLbl').textContent=getQPrompt(q);
  document.getElementById('fcAns').textContent=getQAns(q);
  document.getElementById('fc').classList.remove('flipped');
  QZ.flipped=false;
  document.getElementById('fcActions').style.display='none';
}
function flipCard(){
  document.getElementById('fc').classList.toggle('flipped');
  QZ.flipped=!QZ.flipped;
  document.getElementById('fcActions').style.display=QZ.flipped?'grid':'none';
  haptic();
}
function markCard(correct){
  const q=QZ.qs[QZ.idx];
  if(correct){
    QZ.correct++;G.totalCorrect++;QZ.xpThis+=3;QZ.streak++;
    if(!q.isTerm){G.drugCorrect[q.drug.id]=(G.drugCorrect[q.drug.id]||0)+1;markReviewed(q.drug.id,true);}
    checkStreakBurst();haptic('success');
  }else{
    QZ.streak=0;
    QZ.wrongAnswers.push({q,correctAns:getQAns(q)});
    if(!q.isTerm)markReviewed(q.drug.id,false);
    haptic('error');
  }
  G.totalQ++;QZ.idx++;saveG();renderFC();
}
function skipCard(){QZ.idx++;QZ.streak=0;renderFC();haptic();}

// ── MULTIPLE CHOICE ───────────────────────────────────────────────────────────
function renderMC(){
  const{qs,idx}=QZ;
  if(idx>=qs.length){showResults();return;}
  const q=qs[idx];
  document.getElementById('mcProg').style.width=(idx/qs.length*100)+'%';
  document.getElementById('mcCtr').textContent=`${idx+1} / ${qs.length}`;
  document.getElementById('mcPrompt').textContent=getQPrompt(q);
  document.getElementById('mcQ').textContent=getQText(q);
  document.getElementById('mcNext').classList.remove('show');
  QZ.answered=false;
  // Timer display
  const timerEl=document.getElementById('timerWrap');
  if(timerEl)timerEl.style.display=QZ.isTimed?'flex':'none';
  if(QZ.isTimed)startTimer();
  const correct=getQAns(q);
  const drugId=q.isTerm?null:q.drug.id;
  document.getElementById('mcOpts').innerHTML=q.opts.map(opt=>{
    const short=opt.length>110?opt.substring(0,107)+'…':opt;
    return`<button class="mc-opt" onclick="answerMC(this,${opt===correct},${drugId})">${short}</button>`;
  }).join('');
}
function answerMC(btn,correct,drugId){
  if(QZ.answered)return;
  QZ.answered=true;
  clearTimerInterval();
  const q=QZ.qs[QZ.idx];
  if(correct){
    btn.classList.add('correct');QZ.correct++;G.totalCorrect++;QZ.xpThis+=3;QZ.streak++;
    if(drugId){G.drugCorrect[drugId]=(G.drugCorrect[drugId]||0)+1;markReviewed(drugId,true);}
    checkStreakBurst();haptic('success');
  }else{
    btn.classList.add('wrong');QZ.streak=0;
    QZ.wrongAnswers.push({q,correctAns:getQAns(q)});
    if(drugId)markReviewed(drugId,false);
    haptic('error');
    const correctAns=getQAns(q);
    document.querySelectorAll('.mc-opt').forEach(o=>{
      if(o.textContent===correctAns||o.textContent===correctAns.substring(0,107)+'…')o.classList.add('correct');
    });
  }
  G.totalQ++;
  document.querySelectorAll('.mc-opt').forEach(o=>o.classList.add('revealed'));
  document.getElementById('mcNext').classList.add('show');
  saveG();
}
function nextMC(){QZ.idx++;renderMC();haptic();}

// ── RESULTS ───────────────────────────────────────────────────────────────────
function showResults(){
  clearTimerInterval();
  const{correct,qs,xpThis,isDaily,wrongAnswers}=QZ;
  const total=qs.length,pct=Math.round(correct/total*100);
  G.quizzes++;
  const today=new Date().toDateString();
  if(G.lastDate!==today){G.streak++;G.lastDate=today;}
  // Daily bonus
  let bonusXP=0;
  if(isDaily&&!isDailyDone()){bonusXP=15;G.lastDailyDate=todayKey();}
  const totalXP=xpThis+bonusXP;
  G.xp+=totalXP;
  logToday(total,correct,1,totalXP);
  checkBadges();saveG();updateHdr();
  document.getElementById('fcMode').style.display='none';
  document.getElementById('mcMode').style.display='none';
  const res=document.getElementById('qResults');
  res.classList.add('show');
  document.getElementById('resCorrect').textContent=correct;
  document.getElementById('resTotal').textContent=total;
  document.getElementById('resPct').textContent=pct+'%';
  let xpMsg=`⚡ +${totalXP} XP earned`;
  if(bonusXP>0)xpMsg+=` (incl. +${bonusXP} daily bonus!)`;
  document.getElementById('xpEarnedBtn').textContent=xpMsg+' — tap to see progress';
  const emoji=pct>=90?'🏆':pct>=70?'🎯':pct>=50?'📚':'💪';
  const title=pct>=90?'Outstanding!':pct>=70?'Great Work!':pct>=50?'Good Effort':'Keep Studying!';
  document.getElementById('resRing').textContent=emoji;
  document.getElementById('resTitle').textContent=title;
  // Wrong answer breakdown
  const breakdown=document.getElementById('wrongBreakdown');
  if(wrongAnswers.length>0&&breakdown){
    breakdown.innerHTML=`<div class="breakdown-title">Review your mistakes</div>`+
      wrongAnswers.map(({q,correctAns})=>`
        <div class="breakdown-item">
          <div class="breakdown-q">${getQText(q)}</div>
          <div class="breakdown-a"><span class="breakdown-label">Correct answer:</span> ${correctAns.substring(0,120)}</div>
        </div>`).join('');
    breakdown.style.display='block';
  } else if(breakdown){
    breakdown.style.display='none';
  }
  renderHome();
}

// ── SCOPE / MODE SELECTORS ────────────────────────────────────────────────────
function selScope(s,el){
  document.querySelectorAll('.sopt').forEach(o=>o.className='sopt');
  const cls={all:'on-all',EMT:'on-emt',P:'on-p',AP:'on-ap',terms:'on-terms'};
  el.classList.add(cls[s]||'on-all');QZ.scope=s;haptic();
}
function selMode(m,el){
  document.querySelectorAll('.mode-card').forEach(o=>o.classList.remove('on'));
  el.classList.add('on');QZ.mode=m;haptic();
}
function updateQuizCounts(){}// kept for compatibility

// Init handled by inline script in index.html
