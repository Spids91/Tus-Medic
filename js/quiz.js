// ─── QUIZ.JS — Adaptive difficulty ────────────────────────────────────────────
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
function getPlausibleDistractors(qt,drug,allDrugs){
  if(qt.id==='mech')return allDrugs.filter(x=>x.id!==drug.id).sort(()=>Math.random()-.5).slice(0,3).map(x=>x.quizHints.mechanism.substring(0,90));
  if(qt.id==='contra')return allDrugs.filter(x=>x.id!==drug.id).sort(()=>Math.random()-.5).slice(0,3).map(x=>x.contraindications.slice(0,3).join('; ').substring(0,90));
  return allDrugs.filter(x=>x.id!==drug.id).sort(()=>Math.random()-.5).slice(0,3).map(x=>qt.a(x).split(';')[0].split('.')[0].trim().substring(0,90));
}
const TERM_QTYPES=[
  {prompt:'Define the Term',q:t=>`What does "${t.term}" mean?`,a:t=>t.def},
  {prompt:'Identify the Term',q:t=>`"${t.def.substring(0,80)}…" — what term is this?`,a:t=>t.term}
];
let QZ={scope:'all',mode:'fc',qs:[],idx:0,correct:0,flipped:false,answered:false,xpThis:0,isTerms:false,lastSettings:{scope:'all',mode:'fc'}};
function updateQuizCounts(){
  document.getElementById('cntAll').textContent=`${MEDS.length} drugs`;
  document.getElementById('cntTerms').textContent=`${TERMS.length} terms`;
  ['EMT','P','AP'].forEach(s=>document.getElementById('cnt'+s).textContent=`${MEDS.filter(m=>m.scope.includes(s)).length} drugs`);
}
function selScope(s,el){
  document.querySelectorAll('.sopt').forEach(o=>o.className='sopt');
  const cls={all:'on-all',EMT:'on-emt',P:'on-p',AP:'on-ap',terms:'on-terms'};
  el.classList.add(cls[s]||'on-all');QZ.scope=s;haptic();
}
function selMode(m,el){
  document.querySelectorAll('.mode-card').forEach(o=>o.classList.remove('on'));
  el.classList.add('on');QZ.mode=m;haptic();
}
function pickQType(drug){
  const correct=G.drugCorrect[drug.id]||0;
  const mastery=getMastery(correct);
  if(mastery==='unseen'||mastery==='novice')return EASY_QTYPES[Math.floor(Math.random()*EASY_QTYPES.length)];
  if(mastery==='learning'){const all=[...EASY_QTYPES,...HARD_QTYPES];return all[Math.floor(Math.random()*all.length)];}
  return HARD_QTYPES[Math.floor(Math.random()*HARD_QTYPES.length)];
}
function genDrugQuestions(drugs,n=10){
  let pool=[];
  drugs.forEach(d=>{
    for(let i=0;i<3;i++){
      const qt=pickQType(d);
      const correct=qt.a(d);
      const wrong=getPlausibleDistractors(qt,d,drugs);
      pool.push({drug:d,qt,opts:[correct,...wrong].sort(()=>Math.random()-.5),isTerm:false});
    }
  });
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
function startQuiz(){
  const isTerms=QZ.scope==='terms';
  let qs;
  if(isTerms){qs=genTermQuestions(10);}
  else{
    const drugs=QZ.scope==='all'?MEDS:MEDS.filter(m=>m.scope.includes(QZ.scope));
    if(!drugs.length){showToast('No drugs for this filter');return;}
    qs=genDrugQuestions(drugs,10);
  }
  QZ.lastSettings={scope:QZ.scope,mode:QZ.mode};
  QZ={...QZ,qs,idx:0,correct:0,flipped:false,answered:false,xpThis:0,isTerms};
  document.getElementById('quizSetup').style.display='none';
  document.getElementById('quizActive').classList.add('open');
  document.getElementById('qResults').classList.remove('show');
  if(QZ.mode==='fc'){document.getElementById('fcMode').style.display='block';document.getElementById('mcMode').style.display='none';renderFC();}
  else{document.getElementById('fcMode').style.display='none';document.getElementById('mcMode').style.display='block';renderMC();}
}
function newQuiz(){
  const isTerms=QZ.lastSettings.scope==='terms';
  let qs;
  if(isTerms){qs=genTermQuestions(10);}
  else{
    const drugs=QZ.lastSettings.scope==='all'?MEDS:MEDS.filter(m=>m.scope.includes(QZ.lastSettings.scope));
    qs=genDrugQuestions(drugs,10);
  }
  QZ={...QZ,scope:QZ.lastSettings.scope,mode:QZ.lastSettings.mode,qs,idx:0,correct:0,flipped:false,answered:false,xpThis:0,isTerms};
  document.getElementById('qResults').classList.remove('show');
  if(QZ.mode==='fc'){document.getElementById('fcMode').style.display='block';document.getElementById('mcMode').style.display='none';renderFC();}
  else{document.getElementById('fcMode').style.display='none';document.getElementById('mcMode').style.display='block';renderMC();}
}
function resetQuiz(){
  document.getElementById('quizSetup').style.display='block';
  document.getElementById('quizActive').classList.remove('open');
  document.getElementById('qResults').classList.remove('show');
  updateQuizCounts();scrollTop();
}
function confirmResetQuiz(){if(confirm('End this quiz?'))resetQuiz();}
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
  if(correct){
    QZ.correct++;G.totalCorrect++;QZ.xpThis+=10;
    if(!QZ.isTerms){const id=QZ.qs[QZ.idx].drug.id;G.drugCorrect[id]=(G.drugCorrect[id]||0)+1;}
    haptic('success');
  }else haptic('error');
  G.totalQ++;QZ.idx++;saveG();renderFC();
}
function skipCard(){QZ.idx++;renderFC();haptic();}
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
  if(correct){
    btn.classList.add('correct');QZ.correct++;G.totalCorrect++;QZ.xpThis+=10;
    if(drugId)G.drugCorrect[drugId]=(G.drugCorrect[drugId]||0)+1;
    haptic('success');
  }else{
    btn.classList.add('wrong');haptic('error');
    const correctAns=getQAns(QZ.qs[QZ.idx]);
    document.querySelectorAll('.mc-opt').forEach(o=>{if(o.textContent===correctAns||o.textContent===correctAns.substring(0,107)+'…')o.classList.add('correct');});
  }
  G.totalQ++;
  document.querySelectorAll('.mc-opt').forEach(o=>o.classList.add('revealed'));
  document.getElementById('mcNext').classList.add('show');
  saveG();
}
function nextMC(){QZ.idx++;renderMC();haptic();}
function showResults(){
  const{correct,qs,xpThis}=QZ;
  const total=qs.length,pct=Math.round(correct/total*100);
  G.quizzes++;
  const today=new Date().toDateString();
  if(G.lastDate!==today){G.streak++;G.lastDate=today;}
  G.xp+=xpThis;
  // Log daily data
  logToday(total,correct,1,xpThis);
  checkBadges();saveG();updateHdr();
  document.getElementById('fcMode').style.display='none';
  document.getElementById('mcMode').style.display='none';
  document.getElementById('qResults').classList.add('show');
  document.getElementById('resCorrect').textContent=correct;
  document.getElementById('resTotal').textContent=total;
  document.getElementById('resPct').textContent=pct+'%';
  document.getElementById('xpEarnedBtn').textContent=`⚡ +${xpThis} XP earned — tap to see progress`;
  const emoji=pct>=90?'🏆':pct>=70?'🎯':pct>=50?'📚':'💪';
  const title=pct>=90?'Outstanding!':pct>=70?'Great Work!':pct>=50?'Good Effort':'Keep Studying!';
  const sub=pct>=90?'Excellent clinical knowledge.':pct>=70?'Solid performance.':pct>=50?'More revision will sharpen you.':'Review the formulary and try again.';
  document.getElementById('resRing').textContent=emoji;
  document.getElementById('resTitle').textContent=title;
  document.getElementById('resSub').textContent=sub;
  renderHome();
}
updateQuizCounts();
