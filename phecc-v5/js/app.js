// ─── APP.JS ───────────────────────────────────────────────────────────────────
// Core app: state management, gamification, navigation, dark mode, offline

// ── XP LEVELS ─────────────────────────────────────────────────────────────────
const LEVELS = [
  {name:"Rookie",          xp:0,    next:100,      color:"#059669", gradient:"linear-gradient(135deg,#064E3B,#059669)"},
  {name:"Student",         xp:100,  next:300,      color:"#0891B2", gradient:"linear-gradient(135deg,#0C4A6E,#0891B2)"},
  {name:"Responder",       xp:300,  next:600,      color:"#2563EB", gradient:"linear-gradient(135deg,#1E3A8A,#2563EB)"},
  {name:"Clinician",       xp:600,  next:1000,     color:"#7C3AED", gradient:"linear-gradient(135deg,#4C1D95,#7C3AED)"},
  {name:"Expert",          xp:1000, next:1500,     color:"#D97706", gradient:"linear-gradient(135deg,#78350F,#D97706)"},
  {name:"Senior Clinician",xp:1500, next:2200,     color:"#EA580C", gradient:"linear-gradient(135deg,#7C2D12,#EA580C)"},
  {name:"Master Clinician",xp:2200, next:Infinity, color:"#DC2626", gradient:"linear-gradient(135deg,#7F1D1D,#DC2626)"}
];

function getLevel(xp) {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xp) return LEVELS[i];
  }
  return LEVELS[0];
}

// ── MASTERY ───────────────────────────────────────────────────────────────────
// 5 tiers based on correct answers per drug
// 0 = unseen, 1-2 = novice, 3-5 = learning, 6-9 = proficient, 10+ = mastered
function getMastery(correct) {
  if (correct >= 10) return 'mastered';
  if (correct >= 6)  return 'proficient';
  if (correct >= 3)  return 'learning';
  if (correct >= 1)  return 'novice';
  return 'unseen';
}

const MASTERY_LABELS = {
  unseen:    '· Unseen',
  novice:    '◎ Novice',
  learning:  '~ Learning',
  proficient:'✦ Proficient',
  mastered:  '★ Mastered'
};

const MASTERY_COLORS = {
  unseen:    '#94A3B8',
  novice:    '#D97706',
  learning:  '#0E7490',
  proficient:'#059669',
  mastered:  '#047857'
};

// ── STATE ─────────────────────────────────────────────────────────────────────
let G = {
  xp: 0,
  streak: 0,
  lastDate: null,
  quizzes: 0,
  totalQ: 0,
  totalCorrect: 0,
  drugCorrect: {},  // drugId -> number of correct answers
  notes: {}         // drugId -> string
};

function loadG() {
  try {
    const s = localStorage.getItem('pheccG5');
    if (s) G = { ...G, ...JSON.parse(s) };
  } catch(e) {}
  MEDS.forEach(m => {
    if (!G.drugCorrect[m.id]) G.drugCorrect[m.id] = 0;
    if (G.notes[m.id] === undefined) G.notes[m.id] = '';
  });
}

function saveG() {
  try { localStorage.setItem('pheccG5', JSON.stringify(G)); } catch(e) {}
}

function getDM(id) {
  return getMastery(G.drugCorrect[id] || 0);
}

// ── FEEDBACK ──────────────────────────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2400);
}

function haptic(type = 'light') {
  if (!navigator.vibrate) return;
  if (type === 'success') navigator.vibrate([10, 20, 10]);
  else if (type === 'error') navigator.vibrate([30]);
  else navigator.vibrate([10]);
}

// ── HEADER ────────────────────────────────────────────────────────────────────
function updateHdr() {
  document.getElementById('xpVal').textContent = G.xp;
  document.getElementById('streakVal').textContent = G.streak;
  const lv = getLevel(G.xp);
  const levelLabel = document.getElementById('levelLabel');
  levelLabel.textContent = lv.name;
  levelLabel.style.color = lv.color;
}

// ── DARK MODE ─────────────────────────────────────────────────────────────────
function toggleDark() {
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme') === 'dark';
  html.setAttribute('data-theme', isDark ? 'light' : 'dark');
  document.getElementById('darkBtn').textContent = isDark ? '🌙' : '☀️';
  try { localStorage.setItem('pheccTheme', isDark ? 'light' : 'dark'); } catch(e) {}
  haptic();
}

function loadTheme() {
  try {
    const t = localStorage.getItem('pheccTheme');
    if (t === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.getElementById('darkBtn').textContent = '☀️';
    }
  } catch(e) {}
}

// ── OFFLINE ───────────────────────────────────────────────────────────────────
function checkOnline() {
  document.getElementById('offlineBar').classList.toggle('show', !navigator.onLine);
}

// ── NAVIGATION ────────────────────────────────────────────────────────────────
function showPage(id, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nb').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + id).classList.add('active');
  btn.classList.add('active');
  haptic();
  if (id === 'quiz')  updateQuizCounts();
  if (id === 'stats') { updateStats(); renderDonut(); }
  if (id === 'learn') renderLearn();
}

function goHome() {
  showPage('ref', document.getElementById('btn-ref'));
}

function goProgress() {
  showPage('stats', document.getElementById('btn-stats'));
}

// ── PROGRESS / STATS ──────────────────────────────────────────────────────────
function updateStats() {
  const counts = { unseen:0, novice:0, learning:0, proficient:0, mastered:0 };
  MEDS.forEach(m => counts[getDM(m.id)]++);

  document.getElementById('stXP').textContent       = G.xp;
  document.getElementById('stStreak').textContent   = G.streak;
  document.getElementById('stQuizzes').textContent  = G.quizzes;
  document.getElementById('stAccuracy').textContent = G.totalQ > 0
    ? Math.round(G.totalCorrect / G.totalQ * 100) + '%' : '—';
  document.getElementById('tCorrect').textContent   = G.totalCorrect;
  document.getElementById('tWrong').textContent     = G.totalQ - G.totalCorrect;

  // Donut legend counts
  Object.keys(counts).forEach(k => {
    const el = document.getElementById('dl' + k.charAt(0).toUpperCase() + k.slice(1));
    if (el) el.textContent = counts[k];
  });

  // Level card
  const lv  = getLevel(G.xp);
  const nxt = LEVELS[LEVELS.indexOf(lv) + 1];
  document.getElementById('lcName').textContent      = lv.name;
  document.getElementById('levelCard').style.background = lv.gradient;
  if (nxt) {
    const pct = (G.xp - lv.xp) / (lv.next - lv.xp) * 100;
    document.getElementById('lcBar').style.width  = pct + '%';
    document.getElementById('lcNext').textContent = `${lv.next - G.xp} XP to ${nxt.name}`;
  } else {
    document.getElementById('lcBar').style.width  = '100%';
    document.getElementById('lcNext').textContent = 'Maximum level reached! 🎉';
  }
}

function renderDonut() {
  const counts = { unseen:0, novice:0, learning:0, proficient:0, mastered:0 };
  MEDS.forEach(m => counts[getDM(m.id)]++);
  const total = MEDS.length;
  const circ  = 2 * Math.PI * 35;

  const order = [
    { key:'mastered',   id:'dMastered' },
    { key:'proficient', id:'dProficient' },
    { key:'learning',   id:'dLearning' },
    { key:'novice',     id:'dNovice' }
  ];

  let offset = 0;
  order.forEach(({ key, id }) => {
    const pct  = counts[key] / total;
    const dash = circ * pct;
    const el   = document.getElementById(id);
    if (el) {
      el.setAttribute('stroke-dasharray', `${dash} ${circ - dash}`);
      el.setAttribute('stroke-dashoffset', -(offset - circ / 4));
      offset += dash;
    }
  });
}

function confirmReset() {
  if (!confirm('Reset all progress? This cannot be undone.')) return;
  G = { xp:0, streak:0, lastDate:null, quizzes:0, totalQ:0, totalCorrect:0, drugCorrect:{}, notes:{} };
  MEDS.forEach(m => { G.drugCorrect[m.id] = 0; G.notes[m.id] = ''; });
  saveG(); updateHdr(); updateStats(); renderDonut(); renderDrugList();
  showToast('Progress reset');
}

// ── GLOBAL SEARCH ─────────────────────────────────────────────────────────────
let _gsTimer = null;

function handleGlobalSearch(q) {
  clearTimeout(_gsTimer);
  const el = document.getElementById('gsearchResults');
  if (!q.trim()) {
    el.classList.remove('show');
    el.innerHTML = '';
    renderDrugList();
    return;
  }
  _gsTimer = setTimeout(() => {
    const ql = q.toLowerCase();
    const results = [];

    MEDS.filter(m =>
      m.name.toLowerCase().includes(ql) ||
      m.classification.toLowerCase().includes(ql) ||
      m.indications.some(i => i.toLowerCase().includes(ql))
    ).slice(0, 5).forEach(m => results.push({
      type:   'drug',
      name:   m.name,
      sub:    m.classification,
      action: () => openDet(m.id)
    }));

    TERMS.filter(t =>
      t.term.toLowerCase().includes(ql) ||
      t.def.toLowerCase().includes(ql)
    ).slice(0, 4).forEach(t => results.push({
      type:   'term',
      name:   t.term,
      sub:    t.def.substring(0, 60) + '…',
      action: () => {
        showPage('learn', document.getElementById('btn-learn'));
        selLearn('terms', document.querySelector('[data-lsec="terms"]'));
        setTimeout(() => { document.getElementById('learnSearch').value = t.term; renderLearn(); }, 100);
      }
    }));

    HOSPITALS.filter(h =>
      h.name.toLowerCase().includes(ql) ||
      h.pcr.toLowerCase().includes(ql) ||
      h.county.toLowerCase().includes(ql)
    ).slice(0, 4).forEach(h => results.push({
      type:   'hospital',
      name:   h.name,
      sub:    `${h.county} — PCR: ${h.pcr}`,
      action: () => showPage('learn', document.getElementById('btn-learn'))
    }));

    if (!results.length) {
      el.innerHTML = '<div class="gsr-item"><div style="color:var(--text3);font-size:13px">No results found</div></div>';
      el.classList.add('show');
      return;
    }

    el.innerHTML = results.map((r, i) => `
      <div class="gsr-item" onclick="gsrClick(${i})">
        <span class="gsr-type gsr-${r.type}">${r.type}</span>
        <div>
          <div class="gsr-name">${r.name}</div>
          <div class="gsr-sub">${r.sub}</div>
        </div>
      </div>`).join('');

    el.classList.add('show');
    el._actions = results.map(r => r.action);
  }, 200);
}

function gsrClick(i) {
  const el = document.getElementById('gsearchResults');
  if (el._actions && el._actions[i]) el._actions[i]();
  el.classList.remove('show');
  document.getElementById('searchInput').value = '';
}

// ── INIT ─────────────────────────────────────────────────────────────────────
window.addEventListener('online', checkOnline);
window.addEventListener('offline', checkOnline);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDet(); });

loadG();
loadTheme();
checkOnline();
updateHdr();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
