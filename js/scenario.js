// ─── SCENARIO.JS — OSCE Scenario Generator (engine + UI) ─────────────────────────
// Generates a physiologically-coherent OSCE station on demand. The app is the
// scenario AUTHOR, not an assessor: it hands a study group a fresh station to run,
// then a tap-to-reveal panel anchors their debrief. No marking, no branching.
// Data comes from js/data/scenarios.js (SCEN_VITALS + DEV_PCT_BANDS + PRESENTATIONS).

// ── HELPERS ──────────────────────────────────────────────────────────────────────
function _ri(lo, hi) { return Math.floor(Math.random() * (hi - lo + 1)) + lo; }       // int in [lo,hi]
function _rf(lo, hi) { return Math.round((Math.random() * (hi - lo) + lo) * 10) / 10; } // 1-dp float
function _pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// First vital age-band whose age >= patient age.
function scenVitalBand(age) {
  return SCEN_VITALS.find(b => age <= b.age) || SCEN_VITALS[SCEN_VITALS.length - 1];
}
// Age-appropriate MAX deviation percentage (the older the patient, the bigger the shift).
function scenMaxPct(age) {
  const b = DEV_PCT_BANDS.find(x => age <= x.age) || DEV_PCT_BANDS[DEV_PCT_BANDS.length - 1];
  return b.maxPct;
}

// Apply a RELATIVE deviation to a normal [lo,hi] range.
//   dir 'up'   → push above the ceiling by (maxPct% * intensity * random severity)
//   dir 'down' → drop below the floor by the same proportion
// Severity is randomised 0.5–1.0 of the requested intensity so scenarios vary
// moderate→severe and never repeat the same number.
function applyRelative(range, dev, age) {
  const [lo, hi] = range;
  const maxPct = scenMaxPct(age) / 100;
  const severity = 0.5 + Math.random() * 0.5;        // 0.5–1.0
  const shiftFrac = maxPct * dev.intensity * severity;
  if (dev.dir === 'up') {
    const target = Math.round(hi * (1 + shiftFrac));
    // sit somewhere between just-over-ceiling and the target, for spread
    return _ri(hi + 1, Math.max(hi + 2, target));
  } else {
    const target = Math.round(lo * (1 - shiftFrac));
    return _ri(Math.min(lo - 2, target), lo - 1);
  }
}

// ── CORE GENERATOR ───────────────────────────────────────────────────────────────
function generateScenario(presId) {
  const pres = presId ? PRESENTATIONS.find(p => p.id === presId) : _pick(PRESENTATIONS);
  if (!pres) return null;

  // 1. Patient within demographic constraints.
  const lo = pres.demographics.minAge, hi = pres.demographics.maxAge;
  let age;
  if (lo < 2 && Math.random() < 0.25) age = _pick([0, 0.5, 1]);     // occasional infant
  else age = _ri(Math.max(1, Math.ceil(lo)), Math.floor(hi));
  const sex = pres.demographics.sex === 'any' ? _pick(['male', 'female']) : pres.demographics.sex;

  // 2. Narrative variant (the cause/story).
  const variant = _pick(pres.variants);

  // 3. Vitals. Relative vitals (hr/rr/bpSys/bpDia) use age-scaled % shifts; absolute
  //    vitals (spo2/temp/bgl) use direct target ranges; anything omitted stays normal.
  const band = scenVitalBand(age);
  const d = pres.deviations || {};
  const hr  = d.hr  ? applyRelative(band.hr, d.hr, age) : _ri(band.hr[0], band.hr[1]);
  const rr  = d.rr  ? applyRelative(band.rr, d.rr, age) : _ri(band.rr[0], band.rr[1]);
  const sys = d.bpSys ? applyRelative([band.bp[0], band.bp[1]], d.bpSys, age) : _ri(band.bp[0], band.bp[1]);
  const dia = d.bpDia ? applyRelative([band.bp[2], band.bp[3]], d.bpDia, age) : _ri(band.bp[2], band.bp[3]);
  const spo2 = Array.isArray(d.spo2) ? _ri(d.spo2[0], d.spo2[1]) : _ri(band.spo2[0], band.spo2[1]);
  const temp = Array.isArray(d.temp) ? _rf(d.temp[0], d.temp[1]) : _rf(band.temp[0], band.temp[1]);
  const bgl  = Array.isArray(d.bgl)  ? _rf(d.bgl[0], d.bgl[1])   : _rf(band.bgl[0], band.bgl[1]);
  const ecg = pres.ecg ? _pick(pres.ecg) : null;

  // 4. Readable patient descriptor + a random (diagnosis-neutral) location for dispatch.
  const ageLabel = age < 1 ? band.label.toLowerCase()
                 : age <= 15 ? `${age}-year-old` : `${age}-year-old`;
  const personWord = age <= 15 ? (sex === 'male' ? 'boy' : 'girl')
                               : (sex === 'male' ? 'man' : 'woman');
  const location = _pick(SCEN_LOCATIONS);  // {name, found}
  const dispatch = variant.dispatch
    .replace('{location}', location.name)
    .replace('a PATIENT', `a ${ageLabel} ${personWord}`)
    .replace('PATIENT', `${ageLabel} ${personWord}`);

  // Build a COHERENT events line. For an unconscious patient the history can't come
  // from the patient, so it's framed by how they came to attention — and that framing
  // must fit the location: you can be "found unresponsive" somewhere you'd be come
  // across (home, street), but somewhere you travelled to (GP surgery, café) you
  // "collapsed / became unresponsive there", never "found".
  const conscious = variant.conscious !== false;  // default conscious unless flagged false
  let events = variant.events;
  if (!conscious) {
    const frame = location.found
      ? 'Found unresponsive by a bystander.'
      : `Collapsed and became unresponsive at ${location.name}.`;
    events = `${frame} ${variant.events}`;
  }

  // Last oral intake: an unresponsive patient can't tell you — Unknown is the honest,
  // realistic value rather than fabricating a history.
  const lastIntake = conscious ? pres.sample.lastIntake : 'Unknown — patient unresponsive, no reliable history.';

  // For an UNCONSCIOUS patient, almost no reliable history is obtainable — the student's
  // learning is to assess (vitals/BGL), NOT to interrogate a bystander and hope they
  // mention "diabetic". So SAMPLE/OPQRST default to "Unknown" — EXCEPT Events Leading Up,
  // which can carry the witnessed-collapse framing (a bystander plausibly saw them go
  // down even if they know nothing else about them).
  const UNK = 'Unknown — no reliable history available.';
  const UNK_SHORT = 'Unknown';
  const sample = conscious ? {
    symptoms:    pres.sample.symptoms,
    allergies:   variant.allergies,
    medications: pres.sample.medications,
    pmh:         pres.sample.pmh,
    lastIntake:  lastIntake,
  } : {
    symptoms:    UNK,
    allergies:   UNK_SHORT,
    medications: UNK_SHORT,
    pmh:         UNK_SHORT,
    lastIntake:  lastIntake,   // already the unresponsive message
  };
  // OPQRST: also Unknown for unconscious (can't self-report pain/onset/etc).
  const opqrst = !pres.opqrst ? null : (conscious ? pres.opqrst : {
    onset: UNK_SHORT, provocation: UNK_SHORT, quality: UNK_SHORT,
    radiates: UNK_SHORT, severity: 'Unknown', time: UNK_SHORT,
  });

  return { pres, variant, age, sex, band, dispatch, ecg, conscious, location,
           events, lastIntake, sample, opqrst,
           vitals: { hr, rr, spo2, sys, dia, temp, bgl } };
}

// ── STATION CARD UI ──────────────────────────────────────────────────────────────
function renderScenarioCard(sc) {
  if (!sc) return;
  const v = sc.vitals, p = sc.pres, variant = sc.variant;

  const vitalRows = [
    ['Heart Rate', `${v.hr} bpm`],
    ['Resp Rate', `${v.rr} /min`],
    ['SpO₂', `${v.spo2}%`],
    ['Blood Pressure', `${v.sys}/${v.dia} mmHg`],
    ['BGL', `${v.bgl} mmol/L`],
    ['Temperature', `${v.temp}°C`],
  ];
  if (sc.ecg) vitalRows.push(['ECG Rhythm', sc.ecg]);

  const sampleRows = [
    ['Signs/Symptoms', sc.sample.symptoms],
    ['Allergies', sc.sample.allergies],
    ['Medications', sc.sample.medications],
    ['Past Medical History', sc.sample.pmh],
    ['Last Oral Intake', sc.sample.lastIntake],
    ['Events Leading Up', sc.events],
  ];
  // OPQRST: severity is a 0–10 number for conscious pain cases; "Unknown" if unconscious.
  const opqrst = sc.opqrst ? [
    ['Onset', sc.opqrst.onset], ['Provocation', sc.opqrst.provocation],
    ['Quality', sc.opqrst.quality], ['Radiates', sc.opqrst.radiates],
    ['Severity', sc.conscious ? `${sc.opqrst.severity}/10` : sc.opqrst.severity], ['Time', sc.opqrst.time],
  ] : [];

  const sec = (title, rows) => `
    <div class="scen-sec">
      <div class="scen-sec-title">${title}</div>
      <div class="scen-rows">
        ${rows.map(([k, val]) => `<div class="scen-row"><span class="scen-k">${k}</span><span class="scen-v">${val}</span></div>`).join('')}
      </div>
    </div>`;

  // Authored reveal drugs: Paramedic dose normal, optional AP route in amber bubble.
  // Each drug carries age-specific dosing. Patients >15 get adult doses; <=15 get
  // paediatric doses, matching the split between the Adult and Paediatric CPGs.
  const isAdult = sc.age > 15;
  const drugLines = (p.reveal.drugs || []).map(dr => {
    const d = isAdult ? (dr.adult || dr) : (dr.paed || dr);
    return `
    <li>
      <strong>${dr.name}</strong> &mdash; ${d.paramedic}
      ${d.ap ? `<span class="scen-ap-pill">AP only: ${d.ap}</span>` : ''}
    </li>`;
  }).join('');

  const html = `
    <div class="scen-card">
      <div class="scen-head">
        <div class="scen-badge">OSCE Station</div>
        <div class="scen-title">Emergency Call</div>
      </div>
      <div class="scen-sec"><div class="scen-sec-title">Dispatch</div><div class="scen-dispatch">${sc.dispatch}</div></div>
      ${sec('Patient', [['Age', sc.age < 1 ? sc.band.label : `${sc.age} years`], ['Sex', sc.sex === 'male' ? 'Male' : 'Female']])}
      <div class="scen-sec"><div class="scen-sec-title">On Arrival</div><div class="scen-dispatch">${variant.presentation}</div></div>
      ${sec('Vital Signs', vitalRows)}
      ${sec('SAMPLE History', sampleRows)}
      ${opqrst.length ? sec('OPQRST', opqrst) : ''}
      <button class="scen-reveal-btn" id="scenRevealBtn">Reveal Diagnosis &amp; Management</button>
      <div class="scen-reveal" id="scenReveal" style="display:none">
        <div class="scen-sec"><div class="scen-sec-title">Diagnosis</div><div class="scen-dispatch">${p.reveal.diagnosis}</div></div>
        <div class="scen-sec"><div class="scen-sec-title">Pathway</div><div class="scen-dispatch">${p.reveal.pathway}</div></div>
        <div class="scen-sec"><div class="scen-sec-title">Interventions</div><div class="scen-dispatch">${p.reveal.interventions}</div></div>
        <div class="scen-sec"><div class="scen-sec-title">Drugs &amp; Doses (Paramedic scope)</div><ul class="scen-drugs">${drugLines}</ul></div>
        <div class="scen-disclaimer">Placeholder clinical content pending PHECC verification. For study practice only — always follow current clinical practice guidelines.</div>
      </div>
      <button class="scen-new-btn" id="scenNewBtn">Generate New Scenario</button>
    </div>`;

  const wrap = document.getElementById('scenarioContent');
  if (wrap) {
    wrap.innerHTML = html;
    const rb = document.getElementById('scenRevealBtn'), rv = document.getElementById('scenReveal');
    if (rb && rv) rb.addEventListener('click', () => {
      const open = rv.style.display !== 'none';
      rv.style.display = open ? 'none' : 'block';
      rb.textContent = open ? 'Reveal Diagnosis & Management' : 'Hide Diagnosis & Management';
      // Land the Diagnosis bubble near the top of the screen (not just barely in view).
      if (!open) {
        requestAnimationFrame(() => rv.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      }
      haptic();
    });
    document.getElementById('scenNewBtn')?.addEventListener('click', () => { startScenario(); haptic(); });
  }
}

// ── ENTRY POINTS ─────────────────────────────────────────────────────────────────
// Open the Scenario landing page inside the quiz tab: explains the feature and lets
// the user start. (Future: this is where a presentation/category picker will live.)
function goScenario() {
  window.scrollTo({ top: 0, behavior: 'instant' });
  const wrap = document.getElementById('quizTabContent');
  if (!wrap) return;
  wrap.innerHTML = `
    <div class="quiz-back-sticky" id="scenBack">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> Back
    </div>
    <div class="pg-title">🏥 OSCE Scenario Generator</div>
    <div class="pg-sub">Practice stations for OSCE prep, generated fresh every time.</div>

    <div class="scen-intro">
      <div class="scen-intro-card">
        <div class="scen-intro-icon">🎲</div>
        <div class="scen-intro-txt"><strong>A new station each time</strong><br>Random patient, plausible vitals, and a full clinical picture. The numbers change every run, so you reason it out rather than memorise.</div>
      </div>
      <div class="scen-intro-card">
        <div class="scen-intro-icon">👥</div>
        <div class="scen-intro-txt"><strong>Built for syndicate practice</strong><br>Two people step out, the group sets up the station, then run it like a real OSCE. Everyone but the candidates knows what it is.</div>
      </div>
      <div class="scen-intro-card">
        <div class="scen-intro-icon">📋</div>
        <div class="scen-intro-txt"><strong>Reveal for the debrief</strong><br>After the station, tap to reveal the diagnosis, pathway and Paramedic-scope management to anchor the discussion.</div>
      </div>
    </div>

    <button class="btn-pri" id="scenStartBtn">Generate a Scenario</button>
    <div class="scen-intro-note">Scenarios are study practice only. Always follow your current clinical practice guidelines.</div>`;
  document.getElementById('scenBack')?.addEventListener('click', renderQuizTab);
  document.getElementById('scenStartBtn')?.addEventListener('click', () => { openScenarioRunner(); haptic(); });
}

// The runner view: the back bar returns to the landing page, and a container the
// generated station card renders into.
function openScenarioRunner() {
  window.scrollTo({ top: 0, behavior: 'instant' });
  const wrap = document.getElementById('quizTabContent');
  if (!wrap) return;
  wrap.innerHTML = `
    <div class="quiz-back-sticky" id="scenRunnerBack">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg> Back
    </div>
    <div id="scenarioContent"></div>`;
  document.getElementById('scenRunnerBack')?.addEventListener('click', goScenario);
  startScenario();
}

function startScenario(presId) {
  const wrap = document.getElementById('scenarioContent');
  // Brief "generating" beat — hints that each station is freshly built, and stops
  // the card from just popping in. ~900ms, then render.
  if (wrap) {
    wrap.innerHTML = `
      <div class="scen-generating">
        <div class="scen-gen-pulse"><div></div><div></div><div></div></div>
        <div class="scen-gen-text" id="scenGenText">Building a fresh station…</div>
      </div>`;
    const msgs = ['Building a fresh station…', 'Setting the scene…', 'Generating vitals…', 'Taking the history…'];
    let mi = 0;
    const textEl = document.getElementById('scenGenText');
    const cyc = setInterval(() => { mi = (mi + 1) % msgs.length; if (textEl) textEl.textContent = msgs[mi]; }, 280);
    setTimeout(() => {
      clearInterval(cyc);
      const sc = generateScenario(presId);
      renderScenarioCard(sc);
    }, 900);
  } else {
    const sc = generateScenario(presId);
    renderScenarioCard(sc);
  }
}
