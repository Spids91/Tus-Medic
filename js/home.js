// ─── HOME.JS ──────────────────────────────────────────────────────────────────
function getDotd(){
  const day=Math.floor(Date.now()/86400000);
  return MEDS[day%MEDS.length];
}
function openDotd(){
  const d=getDotd();
  // Mark as seen today
  const k=todayKey();
  if(!G.seenToday)G.seenToday={};
  G.seenToday[k]=true;
  saveG();
  openDet(d.id);
  renderHome();
}
function getGreeting(){
  const h=new Date().getHours();
  if(h<12)return'Good morning';
  if(h<17)return'Good afternoon';
  return'Good evening';
}
function renderHome(){
  // Greeting
  document.getElementById('homeGreeting').textContent=getGreeting();

  // Level card
  const lv=getLevel(G.xp),nxt=LEVELS[LEVELS.indexOf(lv)+1];
  document.getElementById('homeLevelCard').style.background=lv.gradient;
  document.getElementById('hlcName').textContent=lv.name;
  document.getElementById('hlcXP').textContent=G.xp;
  if(nxt){
    const pct=(G.xp-lv.xp)/(lv.next-lv.xp)*100;
    document.getElementById('hlcBar').style.width=pct+'%';
    document.getElementById('hlcNext').textContent=`${lv.next-G.xp} XP to ${nxt.name}`;
  }else{
    document.getElementById('hlcBar').style.width='100%';
    document.getElementById('hlcNext').textContent='Maximum level reached! 🎉';
  }

  // Streak + freeze tokens
  document.getElementById('homeStreakNum').textContent=`${G.streak} day streak`;
  const freezeEl=document.getElementById('homeFreezes');
  const total=Math.min((G.freezeTokens||0)+(G.freezesUsed||0),5);
  let freezeHtml='';
  for(let i=0;i<Math.max(total,1);i++){
    const used=i>=(G.freezeTokens||0);
    freezeHtml+=`<span class="freeze-token${used?' used':''}" onclick="useFreeze()" title="Streak freeze token">❄️</span>`;
  }
  freezeEl.innerHTML=freezeHtml;

  // Drug of the Day
  const d=getDotd();
  document.getElementById('dotdName').textContent=d.name;
  document.getElementById('dotdClass').textContent=d.classification;
  document.getElementById('dotdFact').textContent=d.quizHints.keyFact;
  const k=todayKey();
  const seen=G.seenToday&&G.seenToday[k];
  document.getElementById('dotdSeen').textContent=seen?'✓':'';

  // Quick stats
  const counts={unseen:0,novice:0,learning:0,proficient:0,mastered:0};
  MEDS.forEach(m=>counts[getDM(m.id)]++);
  document.getElementById('hsMastered').textContent=counts.mastered;
  document.getElementById('hsLearning').textContent=counts.novice+counts.learning+counts.proficient;
  document.getElementById('hsUnseen').textContent=counts.unseen;
  document.getElementById('hsStreak').textContent=G.streak;
}
