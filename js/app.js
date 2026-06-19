// ─── APP.JS — Tús Medic v6.1 ──────────────────────────────────────────────────

const LEVELS=[
  {name:"Rookie",          xp:0,    next:100,      color:"#475569",gradient:"linear-gradient(135deg,#0F172A,#334155)"},
  {name:"Student",         xp:100,  next:300,      color:"#0891B2",gradient:"linear-gradient(135deg,#0C4A6E,#0891B2)"},
  {name:"Responder",       xp:300,  next:600,      color:"#2563EB",gradient:"linear-gradient(135deg,#1E3A8A,#2563EB)"},
  {name:"Clinician",       xp:600,  next:1000,     color:"#7C3AED",gradient:"linear-gradient(135deg,#4C1D95,#7C3AED)"},
  {name:"Expert",          xp:1000, next:1500,     color:"#D97706",gradient:"linear-gradient(135deg,#78350F,#D97706)"},
  {name:"Senior Clinician",xp:1500, next:2200,     color:"#EA580C",gradient:"linear-gradient(135deg,#7C2D12,#EA580C)"},
  {name:"Master Clinician",xp:2200, next:Infinity, color:"#DC2626",gradient:"linear-gradient(135deg,#7F1D1D,#DC2626)"}
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
const MASTERY_COLORS={unseen:'#9CA3AF',novice:'#D97706',learning:'#0891B2',proficient:'#2563EB',mastered:'#00875A'};

function masteryTag(id){
  const correct=G.drugCorrect[id]||0;
  const m=getMastery(correct);
  // Don't show "unseen" label — just show count
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
  {id:'mastered_all',   icon:'👑', name:'All 46 Mastered',       check:g=>Object.values(g.drugCorrect).filter(v=>v>=10).length>=46},
  {id:'emt_mastered',   icon:'🏆', name:'All EMT Drugs Mastered',check:g=>MEDS.filter(m=>m.scope.includes('EMT')).every(m=>(g.drugCorrect[m.id]||0)>=10)},
  {id:'xp_500',         icon:'⚡', name:'500 XP',                check:g=>g.xp>=500},
  {id:'xp_1000',        icon:'🚀', name:'1000 XP',               check:g=>g.xp>=1000},
  {id:'questions_100',  icon:'🧠', name:'100 Questions',         check:g=>g.totalQ>=100},
  {id:'all_opened',     icon:'💊', name:'Opened Every Drug',     check:g=>MEDS.every(m=>(g.drugCorrect[m.id]||0)>=0&&g.seenDrugs&&g.seenDrugs.includes(m.id))},
  {id:'freeze_used',    icon:'❄️', name:'Used Streak Freeze',    check:g=>g.freezesUsed>=1}
];

// STATE
let G={
  xp:0,streak:0,lastDate:null,quizzes:0,totalQ:0,totalCorrect:0,
  drugCorrect:{},notes:{},disclaimerDone:false,
  seenDrugs:[],
  earnedBadges:[],
  freezeTokens:1,freezesUsed:0,
  dailyLog:{},
  trackingStart:null,
  nextReview:{},
  recentWrong:[],
  lastDailyDate:null
};

function loadG(){
  try{const s=localStorage.getItem('tusMedicG10');if(s)G={...G,...JSON.parse(s)};}catch(e){}
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
}
function saveG(){try{localStorage.setItem('tusMedicG10',JSON.stringify(G));}catch(e){}}
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

// Streak freeze
function useFreeze(){
  if(G.freezeTokens<=0){showToast('No freeze tokens remaining');return;}
  if(confirm('Use a streak freeze token to protect your streak today?')){
    G.freezeTokens--;G.freezesUsed++;
    // Extend lastDate to today so streak isn't broken
    G.lastDate=todayKey();
    checkBadges();saveG();renderHome();
    showToast('❄️ Streak freeze used!');
  }
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
  document.getElementById('darkBtn').textContent=dark?'🌙':'☀️';
  try{localStorage.setItem('tusMedicTheme',dark?'light':'dark');}catch(e){}
  haptic();
}
function loadTheme(){
  try{const t=localStorage.getItem('tusMedicTheme');if(t==='dark'){document.documentElement.setAttribute('data-theme','dark');document.getElementById('darkBtn').textContent='☀️';}}catch(e){}
}

function checkOnline(){document.getElementById('offlineBar').classList.toggle('show',!navigator.onLine);}

function dismissDisclaimer(){
  document.getElementById('disclaimerModal').style.display='none';
  G.disclaimerDone=true;saveG();
}
function checkDisclaimer(){
  if(!G.disclaimerDone)document.getElementById('disclaimerModal').style.display='flex';
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
  if(id==='learn')renderLearn();
}
function goHome(){showPage('home',document.getElementById('btn-home'));scrollTop();}
function goProgress(){showPage('stats',document.getElementById('btn-stats'));scrollTop();}

// STATS
function updateStats(){
  const counts={unseen:0,novice:0,learning:0,proficient:0,mastered:0};
  MEDS.forEach(m=>counts[getDM(m.id)]++);
  document.getElementById('stXP').textContent=G.xp;
  document.getElementById('stStreak').textContent=G.streak;
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
  for(let i=13;i>=0;i--){
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
  const colors={questions:['#2563EB','#1E3A8A'],accuracy:['#00875A','#006644'],quizzes:['#7C3AED','#4C1D95'],xp:['#D97706','#78350F']};
  const [c1,c2]=colors[chartMetric]||['#2563EB','#1E3A8A'];
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
  if(!confirm('Reset all progress? This cannot be undone.'))return;
  const ts=G.trackingStart||todayKey();
  G={xp:0,streak:0,lastDate:null,quizzes:0,totalQ:0,totalCorrect:0,drugCorrect:{},notes:{},
     disclaimerDone:G.disclaimerDone,seenDrugs:[],earnedBadges:[],freezeTokens:1,freezesUsed:0,
     dailyLog:{},trackingStart:ts};
  MEDS.forEach(m=>{G.drugCorrect[m.id]=0;G.notes[m.id]='';});
  saveG();updateHdr();updateStats();renderDonut();renderChart();renderDrugList();renderHome();
  showToast('Progress reset');
}

// GLOBAL SEARCH
let _gsTimer=null;
function handleGlobalSearch(q,clearId,resultsId){
  const clearBtn=document.getElementById(clearId||'searchClear');
  if(clearBtn)clearBtn.style.display=q?'flex':'none';
  clearTimeout(_gsTimer);
  const el=document.getElementById(resultsId||'gsearchResults');
  if(!q.trim()){
    el.classList.remove('show');el.innerHTML='';
    if(resultsId!=='homeSearchResults'){refQ='';renderDrugList();}
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

    TERMS.filter(t=>t.term.toLowerCase().includes(ql)||t.def.toLowerCase().includes(ql))
      .slice(0,3).forEach(t=>results.push({type:'term',name:t.term,sub:t.def.substring(0,60)+'…',action:()=>{
        showPage('learn',document.getElementById('btn-learn'));
        selLearn('terms',document.querySelector('[data-lsec="terms"]'));
        setTimeout(()=>{document.getElementById('learnSearch').value=t.term;handleLearnSearch(t.term);scrollToTerm(t.term);},150);
      }}));

    HOSPITALS.filter(h=>h.name.toLowerCase().includes(ql)||h.pcr.toLowerCase().includes(ql)||h.county.toLowerCase().includes(ql))
      .slice(0,3).forEach(h=>results.push({type:'hospital',name:h.name,sub:`${h.county} — PCR: ${h.pcr}`,action:()=>{
        showPage('learn',document.getElementById('btn-learn'));
        selLearn('pcr',document.querySelector('[data-lsec="pcr"]'));
        setTimeout(()=>scrollToHospital(h.pcr),350);
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
  const el=document.getElementById(resultsId||'gsearchResults');
  if(el._actions&&el._actions[i])el._actions[i]();
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

function scrollToTerm(termName){
  setTimeout(()=>{
    const cards=document.querySelectorAll('.term-card');
    for(const card of cards){
      if(card.querySelector('.term-word')&&card.querySelector('.term-word').textContent===termName){
        card.scrollIntoView({behavior:'smooth',block:'center'});
        card.classList.add('open');break;
      }
    }
  },300);
}

// INIT
window.addEventListener('online',checkOnline);
window.addEventListener('offline',checkOnline);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDet();});
loadG();loadTheme();checkOnline();checkDisclaimer();updateHdr();
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});

function updateDarkToggle(){
  const isDark=document.documentElement.getAttribute('data-theme')==='dark';
  const t=document.getElementById('darkToggle');
  if(t)t.classList.toggle('on',isDark);
}
