// ─── APP.JS — Tús Medic ───────────────────────────────────────────────────────

const LEVELS=[
  {name:"Rookie",          xp:0,     next:250,      color:"#475569",gradient:"linear-gradient(135deg,#0F172A,#334155)"},
  {name:"Student",         xp:250,   next:750,      color:"#0891B2",gradient:"linear-gradient(135deg,#0C4A6E,#0891B2)"},
  {name:"Responder",       xp:750,   next:1750,     color:"#2563EB",gradient:"linear-gradient(135deg,#1E3A8A,#2563EB)"},
  {name:"Clinician",       xp:1750,  next:3500,     color:"#7C3AED",gradient:"linear-gradient(135deg,#4C1D95,#7C3AED)"},
  {name:"Expert",          xp:3500,  next:6000,     color:"#D97706",gradient:"linear-gradient(135deg,#78350F,#D97706)"},
  {name:"Senior Clinician",xp:6000,  next:9500,     color:"#EA580C",gradient:"linear-gradient(135deg,#7C2D12,#EA580C)"},
  {name:"Master Clinician",xp:9500,  next:Infinity, color:"#DC2626",gradient:"linear-gradient(135deg,#7F1D1D,#DC2626)"}
];
function getLevel(xp){for(let i=LEVELS.length-1;i>=0;i--)if(xp>=LEVELS[i].xp)return LEVELS[i];return LEVELS[0];}

function getMastery(correct){
  if(correct>=10)return'mastered';
  if(correct>=6)return'proficient';
  if(correct>=3)return'learning';
  if(correct>=1)return'novice';
  return'unseen';
}
const MASTERY_LABELS={unseen:'· Unseen',novice:'◎ Novice',learning:'~ Learning',proficient:'✦ Proficient',mastered:'★ Mastered'};
// Mastery colours live in style.css as --mastery-* tokens and .mt-*/.det-mbadge-* classes

function masteryTag(id){
  const correct=G.drugCorrect[id]||0;
  const m=getMastery(correct);
  // Display caps at 10/10 — internal count still drives spaced repetition
  const label=m==='unseen'?`Questions (0/10)`:MASTERY_LABELS[m]+` (${Math.min(correct,10)}/10)`;
  return`<div class="mtag mt-${m}">${label}</div>`;
}

// BADGES
const BADGES=[
  {id:'first_quiz',     icon:'🎯', name:'First Quiz',           check:g=>g.quizzes>=1},
  {id:'streak_7',       icon:'📅', name:'7 Day Streak',          check:g=>g.streak>=7},
  {id:'streak_30',      icon:'🔥', name:'30 Day Streak',         check:g=>g.streak>=30},
  {id:'mastered_10',    icon:'⭐', name:'10 Drugs Mastered',     check:g=>Object.values(g.drugCorrect).filter(v=>v>=10).length>=10},
  {id:'mastered_25',    icon:'💜', name:'25 Drugs Mastered',     check:g=>Object.values(g.drugCorrect).filter(v=>v>=10).length>=25},
  {id:'mastered_all',   icon:'👑', name:'All 46 Drugs Mastered', check:g=>Object.values(g.drugCorrect).filter(v=>v>=10).length>=46},
  {id:'emt_mastered',   icon:'🏆', name:'All EMT Drugs Mastered',check:g=>MEDS.filter(m=>m.scope.includes('EMT')).every(m=>(g.drugCorrect[m.id]||0)>=10)},
  {id:'par_mastered',   icon:'🥈', name:'All Paramedic Drugs Mastered',check:g=>MEDS.filter(m=>m.scope.includes('P')).every(m=>(g.drugCorrect[m.id]||0)>=10)},
  {id:'ap_mastered',    icon:'🥇', name:'All AP Drugs Mastered', check:g=>MEDS.filter(m=>m.scope.includes('AP')).every(m=>(g.drugCorrect[m.id]||0)>=10)},
  {id:'xp_500',         icon:'⚡', name:'500 XP',                check:g=>g.xp>=500},
  {id:'xp_1000',        icon:'🚀', name:'1000 XP',               check:g=>g.xp>=1000},
  {id:'questions_100',  icon:'🧠', name:'100 Questions',         check:g=>g.totalQ>=100},
  {id:'all_opened',     icon:'💊', name:'Opened Every Drug',     check:g=>MEDS.every(m=>g.seenDrugs&&g.seenDrugs.includes(m.id))},
  {id:'freeze_used',    icon:'❄️', name:'Used Streak Freeze',    check:g=>g.freezesUsed>=1}
];

// STATE
let G={
  xp:0,streak:0,lastDate:null,quizzes:0,totalQ:0,totalCorrect:0,
  drugCorrect:{},notes:{},disclaimerDone:false,onboardingDone:false,
  seenDrugs:[],
  earnedBadges:[],
  freezeTokens:1,freezesUsed:0,
  dailyLog:{},
  trackingStart:null,
  nextReview:{},
  recentWrong:[],
  lastDailyDate:null,
  fcXpDate:null,fcXpToday:0
};

function loadG(){
  try{const s=localStorage.getItem('tusMedicG101');if(s)G={...G,...JSON.parse(s)};}catch(e){}
  MEDS.forEach(m=>{
    if(!G.drugCorrect[m.id])G.drugCorrect[m.id]=0;
    if(G.notes[m.id]===undefined)G.notes[m.id]='';
  });
  if(!G.seenDrugs)G.seenDrugs=[];
  if(!G.earnedBadges)G.earnedBadges=[];
  if(!G.dailyLog)G.dailyLog={};
  if(!G.trackingStart)G.trackingStart=todayKey();
  if(!G.nextReview)G.nextReview={};
  if(!G.recentWrong)G.recentWrong=[];
  if(G.lastDailyDate===undefined)G.lastDailyDate=null;
  if(G.fcXpDate===undefined)G.fcXpDate=null;
  if(G.fcXpToday===undefined)G.fcXpToday=0;
  if(!G.seenToday)G.seenToday={};
}
function saveG(){try{localStorage.setItem('tusMedicG101',JSON.stringify(G));}catch(e){}}
function getDM(id){return getMastery(G.drugCorrect[id]||0);}
function todayKey(){return new Date().toISOString().slice(0,10);}

// Daily log
function logToday(questions,correct,quizzes,xp){
  const k=todayKey();
  if(!G.dailyLog[k])G.dailyLog[k]={questions:0,correct:0,quizzes:0,xp:0};
  G.dailyLog[k].questions+=questions;
  G.dailyLog[k].correct+=correct;
  G.dailyLog[k].quizzes+=quizzes;
  G.dailyLog[k].xp+=xp;
}

// Level-up celebration
function showLevelUp(level){
  const overlay=document.getElementById('levelUpOverlay');
  if(!overlay)return;
  document.getElementById('luLevelName').textContent=level.name;
  const card=document.getElementById('luCard');
  if(card)card.style.background=level.gradient;
  // Build confetti
  const confettiWrap=document.getElementById('luConfetti');
  if(confettiWrap){
    const colors=['#FCD34D','#34D399','#60A5FA','#F87171','#C4B5FD','#FB923C'];
    let html='';
    for(let i=0;i<40;i++){
      const left=Math.random()*100;
      const delay=Math.random()*0.6;
      const dur=2+Math.random()*1.5;
      const col=colors[Math.floor(Math.random()*colors.length)];
      const size=6+Math.random()*6;
      const rot=Math.random()*360;
      html+=`<span class="lu-confetti-piece" style="left:${left}%;width:${size}px;height:${size}px;background:${col};animation-delay:${delay}s;animation-duration:${dur}s;transform:rotate(${rot}deg)"></span>`;
    }
    confettiWrap.innerHTML=html;
  }
  overlay.classList.add('show');
  haptic('success');
}
function closeLevelUp(){
  const overlay=document.getElementById('levelUpOverlay');
  if(overlay)overlay.classList.remove('show');
}

// Streak freeze
function useFreeze(){
  if(G.freezeTokens<=0){showToast('No freeze tokens — master more drugs to earn them');return;}
  if(G.lastDate===todayKey()){showToast('Your streak is already safe for today');return;}
  showConfirm(
    '❄️ Use Streak Freeze?',
    'This will protect your streak today. You have '+G.freezeTokens+' token'+(G.freezeTokens===1?'':'s')+' remaining.',
    ()=>{
      G.freezeTokens--;G.freezesUsed++;
      G.lastDate=todayKey();
      checkBadges();saveG();renderHome();
      showToast('❄️ Streak freeze used — your streak is safe!');
    }
  );
}

// Badge checking
function checkBadges(){
  let newBadges=[];
  BADGES.forEach(b=>{
    if(!G.earnedBadges.includes(b.id)&&b.check(G)){
      G.earnedBadges.push(b.id);
      newBadges.push(b);
    }
  });
  // Earn freeze tokens at milestones
  const masteredCount=Object.values(G.drugCorrect).filter(v=>v>=10).length;
  const expectedTokens=1+Math.floor(masteredCount/10);
  if(expectedTokens>G.freezeTokens+G.freezesUsed){
    G.freezeTokens=Math.min(G.freezeTokens+1,5);
    showToast('❄️ Streak freeze token earned!');
  }
  if(newBadges.length){
    newBadges.forEach(b=>setTimeout(()=>showToast(`🏅 Badge unlocked: ${b.name}`),500));
  }
}

// Custom confirm modal — replaces browser confirm() which is blocked in WKWebView
function showConfirm(title, msg, onOK, isDanger=false){
  const modal=document.getElementById('confirmModal');
  document.getElementById('confirmTitle').textContent=title;
  document.getElementById('confirmMsg').textContent=msg;
  const okBtn=document.getElementById('confirmOK');
  okBtn.className='confirm-ok'+(isDanger?' danger':'');
  modal.style.display='flex';
  // Wire buttons — replace each time to avoid stacking listeners
  const cancelBtn=document.getElementById('confirmCancel');
  const close=()=>{ modal.style.display='none'; };
  okBtn.onclick=()=>{ close(); onOK(); };
  cancelBtn.onclick=close;
  modal.onclick=(e)=>{ if(e.target===modal)close(); };
}

// Feedback / toasts
function showToast(msg){
  const t=document.getElementById('toast');
  t.textContent=msg;t.classList.add('show');
  clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),2600);
}
function haptic(type='light'){
  if(!navigator.vibrate)return;
  if(type==='success')navigator.vibrate([10,20,10]);
  else if(type==='error')navigator.vibrate([30]);
  else navigator.vibrate([10]);
}

function updateHdr(){
  document.getElementById('xpVal').textContent=G.xp;
  document.getElementById('streakVal').textContent=G.streak;
  const lv=getLevel(G.xp);
  const ll=document.getElementById('levelLabel');
  ll.textContent=lv.name;
  // Always readable on dark header - use lighter tint of level colour
  // For dark colours like Rookie slate, use a fixed light colour instead
  const darkColours=['#475569','#334155'];
  ll.style.color=darkColours.includes(lv.color)?'rgba(255,255,255,.55)':lv.color;
}

function scrollTop(){window.scrollTo({top:0,behavior:'instant'});}

function toggleDark(){
  const h=document.documentElement,dark=h.getAttribute('data-theme')==='dark';
  h.setAttribute('data-theme',dark?'light':'dark');
  try{localStorage.setItem('tusMedicTheme',dark?'light':'dark');}catch(e){}
  haptic();
}
function loadTheme(){
  try{const t=localStorage.getItem('tusMedicTheme');if(t==='dark'){document.documentElement.setAttribute('data-theme','dark');}}catch(e){}
}

function checkOnline(){document.getElementById('offlineBar').classList.toggle('show',!navigator.onLine);}

// Prevent WKWebView scroll freeze on modal overlays
// When a fixed overlay is visible, block touchmove from reaching the native scroll handler
function initModalScrollFix() {
  const preventScroll = (e) => {
    // Allow scrolling inside elements that are meant to scroll
    let el = e.target;
    while (el && el !== document.body) {
      const style = window.getComputedStyle(el);
      const overflow = style.overflow + style.overflowY;
      if (overflow.includes('auto') || overflow.includes('scroll')) {
        return; // let it scroll
      }
      el = el.parentElement;
    }
    e.preventDefault();
  };

  // Apply to all fixed overlays that shouldn't scroll
  ['disclaimerModal', 'settingsPanel', 'confirmModal', 'levelUpOverlay', 'legalModal', 'onbOverlay'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('touchmove', preventScroll, { passive: false });
    }
  });
}

function dismissDisclaimer(){
  document.getElementById('disclaimerModal').style.display='none';
  G.disclaimerDone=true;saveG();
  // Show onboarding next if not yet seen
  if(!G.onboardingDone)startOnboarding();
}

// ── ONBOARDING ────────────────────────────────────────────────────────────────
let onbStep=0;
const ONB_TOTAL=3;

function startOnboarding(){
  onbStep=0;
  updateOnboarding();
  document.getElementById('onbOverlay').classList.add('show');
}

function updateOnboarding(){
  // Panels
  document.querySelectorAll('.onb-panel').forEach((p,i)=>{
    p.classList.toggle('active',i===onbStep);
  });
  // Dots
  document.querySelectorAll('.onb-dot').forEach((d,i)=>{
    d.classList.toggle('active',i===onbStep);
  });
  // Back button visibility
  document.getElementById('onbBack').style.visibility=onbStep===0?'hidden':'visible';
  // Next button label
  document.getElementById('onbNext').textContent=onbStep===ONB_TOTAL-1?'Start First Quiz →':'Next';
}

function onbNext(){
  haptic();
  if(onbStep<ONB_TOTAL-1){
    onbStep++;
    updateOnboarding();
  }else{
    finishOnboarding();
  }
}

function onbPrev(){
  haptic();
  if(onbStep>0){
    onbStep--;
    updateOnboarding();
  }
}

function finishOnboarding(){
  document.getElementById('onbOverlay').classList.remove('show');
  G.onboardingDone=true;saveG();
  haptic();
  // Show quiz tab immediately to prevent flash of home page
  showPage('quiz',document.getElementById('btn-quiz'));
  scrollTop();
  // Launch intro quiz on next frame so page transition is complete
  requestAnimationFrame(()=>requestAnimationFrame(()=>launchIntroQuiz()));
}

// Onboarding feature card tooltips
function showOnbTip(id){
  const tip=document.getElementById('tip-'+id);
  if(!tip)return;
  const isOpen=tip.classList.contains('show');
  // Close all tips first
  document.querySelectorAll('.onb-tip').forEach(t=>t.classList.remove('show'));
  // Toggle this one
  if(!isOpen)tip.classList.add('show');
  haptic();
}

// Allow re-viewing onboarding from settings
function replayOnboarding(){
  closeSettings();
  setTimeout(startOnboarding,250);
}
function checkDisclaimer(){
  if(!G.disclaimerDone){
    // New user: show disclaimer first; onboarding follows on dismiss
    document.getElementById('disclaimerModal').style.display='flex';
  }else if(!G.onboardingDone){
    // Existing user who hasn't seen onboarding (e.g. after this update)
    startOnboarding();
  }
}

// NAV
function showPage(id,btn){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nb').forEach(b=>b.classList.remove('active'));
  document.getElementById('page-'+id).classList.add('active');
  btn.classList.add('active');
  haptic();
  if(id==='home')renderHome();
  if(id==='quiz')renderQuizTab();
  if(id==='stats'){updateStats();renderDonut();renderChart();}
  if(id==='learn')renderStudy();
  // Always reset scroll to top on any page switch
  window.scrollTo({top:0,behavior:'instant'});
}
function goHome(){showPage('home',document.getElementById('btn-home'));scrollTop();}
function goProgress(){showPage('stats',document.getElementById('btn-stats'));scrollTop();}

// STATS
function updateStats(){
  const counts={unseen:0,novice:0,learning:0,proficient:0,mastered:0};
  MEDS.forEach(m=>counts[getDM(m.id)]++);
  document.getElementById('stXP').textContent=G.xp;
  document.getElementById('stStreak').textContent=G.streak;
  document.getElementById('stQuestions').textContent=G.totalQ;
  document.getElementById('stQuizzes').textContent=G.quizzes;
  document.getElementById('stAccuracy').textContent=G.totalQ>0?Math.round(G.totalCorrect/G.totalQ*100)+'%':'—';
  document.getElementById('tCorrect').textContent=G.totalCorrect;
  document.getElementById('tWrong').textContent=G.totalQ-G.totalCorrect;
  Object.keys(counts).forEach(k=>{const el=document.getElementById('dl'+k.charAt(0).toUpperCase()+k.slice(1));if(el)el.textContent=counts[k];});
  const lv=getLevel(G.xp),nxt=LEVELS[LEVELS.indexOf(lv)+1];
  document.getElementById('lcName').textContent=lv.name;
  document.getElementById('levelCard').style.background=lv.gradient;
  if(nxt){
    document.getElementById('lcBar').style.width=((G.xp-lv.xp)/(lv.next-lv.xp)*100)+'%';
    document.getElementById('lcNext').textContent=`${lv.next-G.xp} XP to ${nxt.name}`;
  }else{
    document.getElementById('lcBar').style.width='100%';
    document.getElementById('lcNext').textContent='Maximum level reached! 🎉';
  }
  // Study time (approx 2 min per quiz)
  const mins=G.quizzes*2;
  const hrs=Math.floor(mins/60),rem=mins%60;
  document.getElementById('studyTime').textContent=hrs>0?`${hrs}h ${rem}m`:`${rem}m`;
  // Badges
  renderBadges();
}

function renderBadges(){
  const el=document.getElementById('badgesGrid');
  if(!el)return;
  el.innerHTML=BADGES.map(b=>{
    const earned=G.earnedBadges.includes(b.id);
    return`<div class="badge-item ${earned?'earned':''}">
      <div class="badge-icon ${earned?'earned':''}">${b.icon}</div>
      <div class="badge-name">${b.name}</div>
    </div>`;
  }).join('');
}

function renderDonut(){
  const counts={unseen:0,novice:0,learning:0,proficient:0,mastered:0};
  MEDS.forEach(m=>counts[getDM(m.id)]++);
  const total=MEDS.length,circ=2*Math.PI*35;
  const order=[{key:'mastered',id:'dMastered'},{key:'proficient',id:'dProficient'},{key:'learning',id:'dLearning'},{key:'novice',id:'dNovice'}];
  let offset=0;
  order.forEach(({key,id})=>{
    const dash=circ*(counts[key]/total);
    const el=document.getElementById(id);
    if(el){el.setAttribute('stroke-dasharray',`${dash} ${circ-dash}`);el.setAttribute('stroke-dashoffset',-(offset-circ/4));offset+=dash;}
  });
}

// CHART
let chartMetric='questions';
function setChartMetric(m,el){
  chartMetric=m;
  const classes={'questions':'on','accuracy':'on-accuracy','quizzes':'on-quizzes','xp':'on-xp'};
  document.querySelectorAll('.chart-tab').forEach(t=>{
    t.classList.remove('on','on-accuracy','on-quizzes','on-xp');
  });
  el.classList.add(classes[m]||'on');
  renderChart();haptic();
}

function renderChart(){
  const el=document.getElementById('chartArea');
  if(!el)return;
  const days=[];
  for(let i=6;i>=0;i--){
    const d=new Date();d.setDate(d.getDate()-i);
    days.push(d.toISOString().slice(0,10));
  }
  const vals=days.map(d=>{
    const log=G.dailyLog[d]||{questions:0,correct:0,quizzes:0,xp:0};
    if(chartMetric==='questions')return log.questions;
    if(chartMetric==='accuracy')return log.questions>0?Math.round(log.correct/log.questions*100):0;
    if(chartMetric==='quizzes')return log.quizzes;
    if(chartMetric==='xp')return log.xp;
    return 0;
  });
  const max=Math.max(...vals,1);
  // Round up to a clean number for y-axis
  const niceMax=max<=5?5:max<=10?10:max<=25?25:max<=50?50:max<=100?100:Math.ceil(max/50)*50;
  const hasData=vals.some(v=>v>0);
  const suffix=chartMetric==='accuracy'?'%':'';
  const labels=days.map(d=>{const dt=new Date(d+'T12:00:00');return dt.toLocaleDateString('en-IE',{weekday:'short'}).slice(0,2);});
  const colors={questions:['#0F172A','#1E293B'],accuracy:['#00875A','#006644'],quizzes:['#7C3AED','#4C1D95'],xp:['#D97706','#78350F']};
  const [c1,c2]=colors[chartMetric]||['#0F172A','#1E293B'];
  el.innerHTML=days.map((d,i)=>{
    const h=Math.round((vals[i]/niceMax)*120);
    return '<div class="chart-bar-wrap">'
      +'<div class="chart-bar" style="height:'+Math.max(h,0)+'px;background:linear-gradient(to top,'+c2+','+c1+')"></div>'
      +'<div class="chart-day">'+labels[i]+'</div>'
      +'</div>';
  }).join('');
  // Y-axis
  const yEl=document.getElementById('chartYAxis');
  if(yEl){
    yEl.innerHTML=
      '<div class="chart-ylabel">'+niceMax+suffix+'</div>'+
      '<div class="chart-ylabel">'+Math.round(niceMax/2)+suffix+'</div>'+
      '<div class="chart-ylabel">0</div>';
  }
  const noteEl=document.getElementById('chartNote');
  if(noteEl)noteEl.textContent=hasData?'Tracking from '+(G.trackingStart||todayKey()):'Data will appear here as you study';
}

function confirmReset(){
  showConfirm(
    'Reset All Progress',
    'This will erase all your XP, streaks and mastery. This cannot be undone.',
    ()=>{
      const ts=G.trackingStart||todayKey();
      G={xp:0,streak:0,lastDate:null,quizzes:0,totalQ:0,totalCorrect:0,drugCorrect:{},notes:{},
         disclaimerDone:G.disclaimerDone,onboardingDone:G.onboardingDone,seenDrugs:[],earnedBadges:[],freezeTokens:1,freezesUsed:0,
         dailyLog:{},trackingStart:ts};
      MEDS.forEach(m=>{G.drugCorrect[m.id]=0;G.notes[m.id]='';});
      saveG();updateHdr();updateStats();renderDonut();renderChart();renderDrugList();renderHome();
      showToast('Progress reset');
    },
    true  // danger style
  );
}

// GLOBAL SEARCH
let _gsTimer=null;
function handleGlobalSearch(q,clearId,resultsId){
  const clearBtn=document.getElementById(clearId||'homeSearchClear');
  if(clearBtn)clearBtn.style.display=q?'flex':'none';
  clearTimeout(_gsTimer);
  const el=document.getElementById(resultsId||'homeSearchResults');
  if(!q.trim()){
    el.classList.remove('show');el.innerHTML='';
    return;
  }
  _gsTimer=setTimeout(()=>{
    const ql=q.toLowerCase(),results=[];

    // Rank drug matches: name match first, then classification, then indications
    const drugMatches=MEDS.filter(m=>
      m.name.toLowerCase().includes(ql)||
      m.classification.toLowerCase().includes(ql)||
      m.indications.some(i=>i.toLowerCase().includes(ql))
    ).sort((a,b)=>{
      const aName=a.name.toLowerCase().includes(ql);
      const bName=b.name.toLowerCase().includes(ql);
      if(aName&&!bName)return -1;
      if(!aName&&bName)return 1;
      // Both match name — rank by how early the match appears
      const aIdx=a.name.toLowerCase().indexOf(ql);
      const bIdx=b.name.toLowerCase().indexOf(ql);
      return aIdx-bIdx;
    }).slice(0,5);
    drugMatches.forEach(m=>results.push({type:'drug',name:m.name,sub:m.classification,action:()=>openDet(m.id)}));

    // Score terms by relevance: exact name > name starts-with > name contains > definition contains
    TERMS.map(t=>{
      const term=t.term.toLowerCase();
      let score=0;
      if(term===ql)score=100;
      else if(term.startsWith(ql))score=80;
      else if(term.includes(ql))score=60;
      else if(t.def.toLowerCase().includes(ql))score=20;
      return{t,score};
    }).filter(x=>x.score>0)
      .sort((a,b)=>b.score-a.score||a.t.term.localeCompare(b.t.term))
      .slice(0,3)
      .forEach(({t})=>results.push({type:'term',name:t.term,sub:t.def.substring(0,60)+'…',action:()=>{
        showPage('learn',document.getElementById('btn-learn'));
        selStudy('terms',document.querySelector('[data-ssec="terms"]'));
        scrollToStudyTerm(t.term);
      }}));

    HOSPITALS.filter(h=>h.name.toLowerCase().includes(ql)||h.pcr.toLowerCase().includes(ql)||h.county.toLowerCase().includes(ql))
      .slice(0,3).forEach(h=>results.push({type:'hospital',name:h.name,sub:`${h.county} — PCR: ${h.pcr}`,action:()=>{
        showPage('ref',document.getElementById('btn-ref'));
        selRefSection('pcr',document.querySelector('[data-refsec="pcr"]'));
        // Wait for both showPage and section render to complete before scrolling
        setTimeout(()=>scrollToHospital(h.pcr),300);
      }}));

    if(!results.length){
      el.innerHTML='<div class="gsr-item"><div style="color:var(--text3);font-size:13px">No results found</div></div>';
      el.classList.add('show');return;
    }
    el.innerHTML=results.map((r,i)=>`<div class="gsr-item" onclick="gsrClick(${i},'${resultsId||'gsearchResults'}')"><span class="gsr-type gsr-${r.type}">${r.type}</span><div><div class="gsr-name">${r.name}</div><div class="gsr-sub">${r.sub}</div></div></div>`).join('');
    el.classList.add('show');el._actions=results.map(r=>r.action);
  },200);
}

function gsrClick(i,resultsId){
  const el=document.getElementById(resultsId||'homeSearchResults');
  if(el._actions&&el._actions[i]){
    // Clear the home search bar before navigating
    document.getElementById('homeSearchInput').value='';
    document.getElementById('homeSearchClear').style.display='none';
    el.classList.remove('show');
    el.innerHTML='';
    el._actions[i]();
  }
}

function clearSearch(){
  document.getElementById('searchInput').value='';
  document.getElementById('searchClear').style.display='none';
  document.getElementById('gsearchResults').classList.remove('show');
  document.getElementById('gsearchResults').innerHTML='';
  refQ='';
  renderDrugList();
}

function clearHomeSearch(){
  document.getElementById('homeSearchInput').value='';
  document.getElementById('homeSearchClear').style.display='none';
  document.getElementById('homeSearchResults').classList.remove('show');
  document.getElementById('homeSearchResults').innerHTML='';
}

function scrollToHospital(pcr){
  const el=document.getElementById('hosp-'+pcr);
  if(el){
    el.scrollIntoView({behavior:'smooth',block:'center'});
    el.style.transition='box-shadow 0.3s ease';
    el.style.boxShadow='0 0 0 2px var(--primary)';
    setTimeout(()=>{el.style.boxShadow='';},2000);
  }
}

// INIT
window.addEventListener('online',checkOnline);
window.addEventListener('offline',checkOnline);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDet();});
loadG();loadTheme();checkOnline();checkDisclaimer();updateHdr();
// Run after DOM is fully parsed (scripts load at end of body)
initModalScrollFix();
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});

function updateDarkToggle(){
  const isDark=document.documentElement.getAttribute('data-theme')==='dark';
  const t=document.getElementById('darkToggle');
  if(t)t.classList.toggle('on',isDark);
}
