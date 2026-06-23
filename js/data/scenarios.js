// ─── SCENARIOS.JS (DATA) — OSCE Scenario Generator ───────────────────────────────
// Data for the OSCE scenario generator. Three parts:
//   1. SCEN_VITALS    — normal vital-sign ranges by age band (physiological baseline)
//   2. DEV_PCT_BANDS  — how much a "relative" vital shifts, as a % that scales with age
//   3. PRESENTATIONS  — authored clinical templates (the "fingerprint" of each condition)
//
// HOW GENERATION WORKS (engine in js/scenario.js):
//   • Pick a presentation, then a random patient (age/sex) within its constraints.
//   • RELATIVE vitals (HR, RR, BP): the presentation says e.g. "HR raised". The engine
//     takes the patient's normal ceiling and pushes it UP by a percentage. Crucially
//     the percentage SCALES WITH AGE — a neonate's HR barely moves (little headroom),
//     an adult's can ~double. The age→max-% mapping is DEV_PCT_BANDS below.
//   • ABSOLUTE vitals (SpO₂, Temp, BGL): age-independent. The presentation gives a
//     direct target range (e.g. SpO₂ 85–93%) used as-is at any age.
//   • Severity is randomised each run (engine picks a fraction of the max shift), so
//     scenarios range from moderate to severe and the numbers differ every time.
//
// ⚠️ CLINICAL REVIEW STATUS:
//   ★  = from the app's existing PHECC-verified PAED_VITALS (reference.js)
//   ⚠️ = PLACEHOLDER (general medical refs / first-draft), PENDING Keith's PHECC review.
//        ALL of: diastolic BP, the DEV_PCT_BANDS percentages, and every presentation's
//        deviation + reveal content are placeholders to be replaced with verified values.
//
// ── TODO (future enhancement) — ADD AVPU / GCS AS A CONSCIOUS-LEVEL VITAL ─────────
//   Conscious level is currently conveyed only in each variant's presentation TEXT
//   (e.g. "unresponsive to voice, cannot swallow"). For some presentations — most
//   importantly HYPOGLYCAEMIA — conscious level is the pivotal decision step (alert &
//   able to swallow → buccal glucose; unresponsive/can't swallow → IM glucagon), so it
//   deserves to be a proper structured vital (AVPU and/or GCS) shown in Vital Signs,
//   not just prose. This is a model change (new vital field + per-variant value +
//   card rendering), so it's deferred to avoid scope creep. When added: make AVPU/GCS
//   COHERE with the variant (an "unresponsive" variant must read P or U / low GCS).
//
//   ── BUILD TOGETHER WITH: PAEDIATRIC ASSESSMENT TRIANGLE (PAT) ──
//   PROBLEM this solves: the engine currently applies the same presentation text at
//   any age, so it can describe a 1-year-old as "alert, talking, following commands" —
//   clinically nonsense (pre-verbal child can't). Real paeds assessment uses the PAT
//   (Appearance / Work of Breathing / Circulation to skin) precisely BECAUSE you can't
//   take a verbal history from a small child.
//   KEITH'S DESIGN DECISIONS (agreed):
//     • Age boundary: UNDER 5 = pre-verbal-style — no "talking / following commands"
//       language; assess via PAT. Age 5–15 can show BOTH AVPU and PAT.
//     • PAT SUPPLEMENTS the existing framing (doesn't replace vitals/SAMPLE) — show a
//       PAT block for paediatric patients in addition to the normal card.
//     • Pre-verbal patients must never be described as giving a verbal history or
//       following commands; presentation language must be age-appropriate.
//   This is a model + engine + rendering change; deferred to a dedicated session
//   alongside AVPU/GCS so the whole "age-appropriate neuro / global status" model is
//   designed coherently in one go.

// ── NORMAL VITAL RANGES BY AGE BAND ──────────────────────────────────────────────
// age = upper bound (years) for the band; engine picks first band whose age >= patient age.
// Ranges are [low, high]. BP is now [sysLow, sysHigh, diaLow, diaHigh].
const SCEN_VITALS = [
  // label        age   hr(★)       rr(★)      spo2(⚠️)   bp sys+dia (⚠️)        temp(⚠️)          bgl(⚠️)
  { label:'Neonate',  age:0,   hr:[90,180], rr:[30,60], spo2:[94,99], bp:[60,85,30,55],    temp:[36.1,37.2], bgl:[4.0,7.0] },
  { label:'6 months', age:0.5, hr:[80,160], rr:[30,60], spo2:[94,99], bp:[72,104,37,56],   temp:[36.1,37.2], bgl:[4.0,7.0] },
  { label:'1 year',   age:1,   hr:[75,130], rr:[20,30], spo2:[94,99], bp:[72,104,37,56],   temp:[36.1,37.2], bgl:[4.0,7.0] },
  { label:'2 years',  age:2,   hr:[75,130], rr:[20,30], spo2:[94,99], bp:[86,106,42,63],   temp:[36.1,37.2], bgl:[4.0,7.0] },
  { label:'3 years',  age:3,   hr:[75,130], rr:[20,30], spo2:[94,99], bp:[89,112,46,72],   temp:[36.1,37.2], bgl:[4.0,7.0] },
  { label:'4 years',  age:4,   hr:[70,110], rr:[16,24], spo2:[94,99], bp:[89,112,46,72],   temp:[36.1,37.2], bgl:[4.0,7.0] },
  { label:'5 years',  age:5,   hr:[70,110], rr:[16,24], spo2:[94,99], bp:[89,112,46,72],   temp:[36.1,37.2], bgl:[4.0,7.0] },
  { label:'6 years',  age:6,   hr:[70,110], rr:[16,24], spo2:[94,99], bp:[97,115,57,76],   temp:[36.1,37.2], bgl:[4.0,7.0] },
  { label:'7 years',  age:7,   hr:[60,90],  rr:[14,20], spo2:[94,99], bp:[97,115,57,76],   temp:[36.1,37.2], bgl:[4.0,7.0] },
  { label:'8 years',  age:8,   hr:[60,90],  rr:[14,20], spo2:[94,99], bp:[97,115,57,76],   temp:[36.1,37.2], bgl:[4.0,7.0] },
  { label:'9 years',  age:9,   hr:[60,90],  rr:[14,20], spo2:[94,99], bp:[97,120,57,80],   temp:[36.1,37.2], bgl:[4.0,7.0] },
  { label:'10 years', age:10,  hr:[60,90],  rr:[14,20], spo2:[94,99], bp:[102,120,61,80],  temp:[36.1,37.2], bgl:[4.0,7.0] },
  { label:'11 years', age:11,  hr:[60,90],  rr:[14,20], spo2:[94,99], bp:[102,120,61,80],  temp:[36.1,37.2], bgl:[4.0,7.0] },
  { label:'12 years', age:12,  hr:[60,90],  rr:[14,20], spo2:[94,99], bp:[110,131,64,83],  temp:[36.1,37.2], bgl:[4.0,7.0] },
  { label:'13 years', age:13,  hr:[60,90],  rr:[14,20], spo2:[94,99], bp:[110,131,64,83],  temp:[36.1,37.2], bgl:[4.0,7.0] },
  { label:'14 years', age:14,  hr:[60,90],  rr:[14,20], spo2:[94,99], bp:[110,131,64,83],  temp:[36.1,37.2], bgl:[4.0,7.0] },
  { label:'15 years', age:15,  hr:[60,90],  rr:[14,20], spo2:[94,99], bp:[110,131,64,83],  temp:[36.1,37.2], bgl:[4.0,7.0] },
  { label:'Adult',    age:120, hr:[60,100], rr:[12,20], spo2:[94,99], bp:[100,130,60,85],  temp:[36.1,37.2], bgl:[4.0,7.0] },
];

// ── AGE-SCALED DEVIATION PERCENTAGES ─────────────────────────────────────────────
// The MAXIMUM % a relative vital (HR/RR/BP) can shift, scaled by age. A presentation
// asks for a direction + intensity; the engine multiplies the age-appropriate max %
// here by a random severity fraction. Younger = smaller % (less physiological reserve),
// rising to 100% for adults. age = upper bound of the band.
// ⚠️ PLACEHOLDER ramp — Keith to tune every value.
const DEV_PCT_BANDS = [
  { age:0,   maxPct:10 },   // neonate
  { age:0.5, maxPct:13 },
  { age:1,   maxPct:14 },
  { age:2,   maxPct:20 },
  { age:5,   maxPct:25 },
  { age:8,   maxPct:35 },
  { age:11,  maxPct:50 },
  { age:15,  maxPct:70 },
  { age:120, maxPct:100 }, // adult — can ~double
];

// ── SHARED LOCATION BANK ─────────────────────────────────────────────────────────
// Any presentation draws from this pool, so the setting never correlates with the
// diagnosis. Irish-flavoured, demographically NEUTRAL (no nursing homes / schools /
// playgrounds — a location implying an age would mislead the student's reasoning).
//
// `found` flag = can a patient plausibly be FOUND (come across) here?
//   true  → places you'd come across someone (home, street, public space).
//   false → places a patient actively TRAVELLED to and is already present at (GP
//           surgery, pharmacy, salon, café). You're never "found" in a GP office —
//           you made your way there. For these, an unconscious patient is described
//           as having COLLAPSED / become unresponsive there, never "found".
// (When unsure, set found:false — "collapsed there" reads correctly anywhere.)
const SCEN_LOCATIONS = [
  { name:'a private residence',        found:true  },
  { name:'a terraced house',           found:true  },
  { name:'an apartment',               found:true  },
  { name:'a shopping centre',          found:true  },
  { name:'a Centra car park',          found:true  },
  { name:'a supermarket',              found:true  },
  { name:'a bus stop',                 found:true  },
  { name:'a Luas stop',                found:true  },
  { name:'a train station',            found:true  },
  { name:'a petrol station',           found:true  },
  { name:'a public park',              found:true  },
  { name:'a town square',              found:true  },
  { name:'a rural farmhouse',          found:true  },
  { name:'a country road layby',       found:true  },
  { name:'a beach car park',           found:true  },
  { name:'a building site',            found:true  },
  { name:'a factory floor',            found:true  },
  { name:'a busy café',                found:false },
  { name:'a restaurant',               found:false },
  { name:'a pub',                      found:false },
  { name:'a hotel lobby',              found:false },
  { name:'a GP surgery waiting room',  found:false },
  { name:'a pharmacy',                 found:false },
  { name:'an office',                  found:false },
  { name:'a hair salon',               found:false },
  { name:'a gym',                      found:false },
  { name:'a leisure centre',           found:false },
  { name:'a GAA clubhouse',            found:false },
  { name:'a sports ground',            found:false },
  { name:'a community hall',           found:false },
];

// ── PRESENTATION TEMPLATES ───────────────────────────────────────────────────────
// Each presentation is authored clinical content. The engine randomises patient +
// vital numbers; everything else here is fixed and authored.
//
// Fields:
//   id, name        — identity
//   demographics    — { minAge, maxAge (years), sex: 'any'|'male'|'female' }
//   variants[]      — narrative variants (the cause) so the STORY differs each run.
//                     { cause, dispatch, presentation, allergies, events }
//   deviations      — per-vital instruction:
//       RELATIVE vitals (hr/rr/bpSys/bpDia): { dir:'up'|'down', intensity:0–1 }
//         intensity scales the age-appropriate max %. dir=up raises above normal ceiling,
//         dir=down drops below normal floor.
//       ABSOLUTE vitals (spo2/temp/bgl): [low, high] target range used directly.
//   sample          — fixed SAMPLE parts { symptoms, medications, pmh, lastIntake }
//   opqrst          — OPQRST findings (optional; lighter for non-pain calls)
//   reveal          — AUTHORED debrief, Paramedic-scope-aware:
//       { diagnosis, pathway, interventions,
//         drugs: [ { name, paramedic:'IM dose...', ap:'IV dose...'(optional) } ] }
//     'paramedic' shows normally; 'ap' (if present) renders in an amber AP-scope bubble.
//
// ⚠️ Anaphylaxis content below is FIRST-DRAFT PLACEHOLDER for engine demonstration.
const PRESENTATIONS = [
  {
    id: 'anaphylaxis',
    name: 'Anaphylaxis',
    demographics: { minAge: 1, maxAge: 90, sex: 'any' },
    variants: [
      { cause:'bee sting', conscious:true,
        dispatch:'You are called to {location} for a PATIENT with difficulty breathing.',
        presentation:'Visible facial and lip swelling, widespread urticarial (hive-like) rash, audible wheeze, looks anxious and flushed.',
        allergies:'Known allergy to bee/wasp stings.',
        events:'Was stung by a bee roughly 10 minutes ago; symptoms came on rapidly afterwards.' },
      { cause:'peanuts', conscious:true,
        dispatch:'You are called to {location} for a PATIENT who has become acutely unwell.',
        presentation:'Swollen lips and tongue, blotchy raised rash on neck and chest, noisy breathing, clutching at throat.',
        allergies:'Known nut allergy.',
        events:'Ate a dessert that unknowingly contained peanuts about 15 minutes ago.' },
      { cause:'shellfish', conscious:true,
        dispatch:'You are called to {location} for a PATIENT with sudden difficulty breathing.',
        presentation:'Facial swelling, urticaria over the arms and torso, wheeze, appears distressed and sweaty.',
        allergies:'Known shellfish allergy.',
        events:'Had just eaten a seafood dish shortly before the symptoms started.' },
      { cause:'penicillin', conscious:true,
        dispatch:'You are called to {location} for a PATIENT who is acutely short of breath.',
        presentation:'Lip and periorbital swelling, spreading hives, wheeze, anxious and flushed.',
        allergies:'No previously documented drug allergy.',
        events:'Took a first dose of a newly prescribed antibiotic about 20 minutes ago.' },
    ],
    painBased: false,   // anaphylaxis is not a pain complaint → OPQRST shows honest negatives
    // ⚠️ PLACEHOLDER deviations — Keith to verify direction + intensity.
    deviations: {
      hr:    { dir:'up',   intensity:0.7 },   // tachycardia
      rr:    { dir:'up',   intensity:0.6 },   // tachypnoea
      bpSys: { dir:'down', intensity:0.5 },   // hypotension
      bpDia: { dir:'down', intensity:0.5 },
      spo2:  [85, 93],                        // absolute hypoxia target
      // temp + bgl omitted → stay normal
    },
    sample: {
      symptoms:'Difficulty breathing, throat tightness, itching, feeling of impending doom.',
      medications:'Nil regular.',
      pmh:'Previous milder allergic reactions.',
      lastIntake:'As per the triggering event.',
    },
    // Non-pain presentation: OPQRST still asked, but answered honestly/negative.
    opqrst: {
      onset:'Sudden, over a few minutes.',
      provocation:'No.',
      quality:'No pain — throat and chest tightness.',
      radiates:'No.',
      severity:'0',
      time:'Began roughly 10–20 minutes ago.',
    },
    reveal: {
      diagnosis:'Anaphylaxis (severe systemic allergic reaction).',
      pathway:'Recognise anaphylaxis early (airway/breathing/circulation compromise + skin changes after exposure). Remove trigger if possible, high-flow O₂, position appropriately, IM adrenaline without delay, reassess and transport urgently.',
      interventions:'High-flow oxygen, IM adrenaline (repeat every 5 min PRN), nebulised salbutamol if wheeze, continuous monitoring, early transport. (IV access and IV fluids are Advanced Paramedic scope.)',
      // Paramedic-scope drugs shown normally; AP routes flagged in amber.
      drugs: [
        { name:'Adrenaline 1:1,000', paramedic:'500mcg IM (0.5mL of 1:1,000). Repeat every 5 min PRN.' },
        { name:'Chlorphenamine',     paramedic:'10mg IM.', ap:'10mg IV.' },
        { name:'Hydrocortisone',     paramedic:'200mg IM.', ap:'200mg IV.' },
        { name:'Salbutamol',         paramedic:'5mg NEB (if wheeze present).' },
      ],
    },
  },

  {
    id: 'hypoglycaemia',
    name: 'Hypoglycaemia',
    demographics: { minAge: 1, maxAge: 90, sex: 'any' },
    variants: [
      // Conscious level is the key decision fork here (gel vs glucagon). The engine
      // adds "found unresponsive" vs "collapsed there" framing based on the location.
      // CONSCIOUS / able to swallow → leads toward buccal glucose.
      { cause:'missed meal — conscious', conscious:true,
        dispatch:'You are called to {location} for a PATIENT who is confused and not themselves.',
        presentation:'Alert but confused and sweaty, pale and clammy, slurred speech — but able to talk, follow simple instructions and hold a cup. Airway is their own and they can swallow.',
        allergies:'No known drug allergies.',
        events:'Took their usual insulin this morning but skipped breakfast; became increasingly confused over the last half hour.' },
      { cause:'odd behaviour — conscious', conscious:true,
        dispatch:'You are called to {location} for a PATIENT who is behaving strangely.',
        presentation:'Confused and agitated but awake and responsive, sweating heavily, unsteady, almost intoxicated in manner though no alcohol involved. Able to protect their own airway and swallow.',
        allergies:'No known drug allergies.',
        events:'Has been increasingly muddled and clumsy over the past 20 minutes; this reportedly happens if they go too long without eating.' },
      // UNCONSCIOUS / unable to swallow → leads toward IM glucagon.
      { cause:'collapse — unresponsive', conscious:false,
        dispatch:'You are called to {location} for a PATIENT who has collapsed.',
        presentation:'Slumped and unresponsive to voice, only groaning to a painful stimulus, profuse sweating, cool clammy skin. NOT able to swallow or protect their own airway.',
        allergies:'No known drug allergies.',
        events:'Was reportedly well earlier, then became vacant and slumped over a short time ago.' },
      { cause:'unresponsive', conscious:false,
        dispatch:'You are called to {location} for a PATIENT who is unconscious.',
        presentation:'Unrousable to voice, withdraws to pain only, sweaty and pale, breathing on their own. Cannot swallow safely — no gag/airway protection.',
        allergies:'No known drug allergies.',
        events:'Known diabetic on insulin; became unresponsive a short time ago.' },
    ],
    painBased: false,   // hypoglycaemia is not a pain complaint → OPQRST shows honest negatives
    // ⚠️ PLACEHOLDER deviations — Keith to verify.
    // The DEFINING abnormal vital is BGL (driven LOW, absolute range). HR mildly
    // raised (adrenergic response); other vitals largely normal — the teaching
    // point is that hypoglycaemia mimics many things until you CHECK THE BGL.
    deviations: {
      hr:  { dir:'up', intensity:0.4 },   // mild adrenergic tachycardia
      bgl: [1.5, 3.2],                    // absolute hypoglycaemia (mmol/L)
      // rr / bp / spo2 / temp omitted → stay normal
    },
    sample: {
      symptoms:'Confusion, sweating, tremor, hunger, slurred speech, altered behaviour.',
      medications:'Insulin (and/or oral hypoglycaemic agents).',
      pmh:'Type 1 (or insulin-treated) diabetes mellitus.',
      lastIntake:'Missed or inadequate food intake relative to insulin/medication.',
    },
    opqrst: {
      onset:'Came on gradually over the last while.',
      provocation:'No.',
      quality:'No pain — confused and weak.',
      radiates:'No.',
      severity:'0',
      time:'Over roughly the last 20–30 minutes.',
    },
    reveal: {
      diagnosis:'Hypoglycaemia (low blood glucose), commonly in insulin-treated diabetes.',
      pathway:'Confirm with a BGL reading. If the patient can protect their own airway and swallow → oral/buccal glucose. If they cannot swallow safely or are unresponsive → IM glucagon. Reassess BGL and conscious level, then encourage a longer-acting carbohydrate once recovered. Transport if not fully recovered or recurrent.',
      interventions:'Check BGL, position safely, buccal glucose if able to swallow, IM glucagon if unable to swallow / unresponsive, recheck BGL after ~15 min, complex carbohydrate on recovery, monitor. (IV glucose is Advanced Paramedic scope.)',
      drugs: [
        { name:'Glucose Gel', paramedic:'10–20g buccal (if able to swallow). Recheck BGL, repeat after 15 min if required.' },
        { name:'Glucagon',    paramedic:'1mg IM (adult) if unable to swallow / unresponsive.' },
        { name:'Glucose 10% Solution', paramedic:'Not in Paramedic scope.', ap:'100mL IV/IO, repeat after 5 min to max 300mL.' },
      ],
    },
  },

  {
    id: 'acs',
    name: 'Acute Coronary Syndrome',
    demographics: { minAge: 35, maxAge: 90, sex: 'any' },
    // ECG rhythm field (first presentation to use it). Descriptive labels — a real
    // 12-lead would be handed to candidates in the room; here the student reads the
    // rhythm and interprets. Picked at random per scenario.
    ecg: [
      'Sinus rhythm.',
      'Sinus tachycardia.',
      'Sinus rhythm with ST elevation in the inferior leads (II, III, aVF).',
      'Sinus rhythm with ST elevation in the anterior leads (V2–V4).',
      'Sinus rhythm with ST depression and T-wave inversion.',
      'Sinus rhythm with hyperacute (peaked) T-waves.',
      'Atrial fibrillation with a controlled ventricular rate.',
    ],
    variants: [
      { cause:'exertional onset', conscious:true,
        dispatch:'You are called to {location} for a PATIENT complaining of chest pain.',
        presentation:'Clutching their chest, pale and sweaty (diaphoretic), looks anxious and uncomfortable, mild shortness of breath.',
        allergies:'No known drug allergies.',
        events:'Pain started about 40 minutes ago while climbing stairs and has not settled.' },
      { cause:'at rest onset', conscious:true,
        dispatch:'You are called to {location} for a PATIENT with central chest pain.',
        presentation:'Grey and clammy, holding the centre of their chest, nauseated, breathing a little fast.',
        allergies:'No known drug allergies.',
        events:'Was sitting watching television when the pain came on suddenly about half an hour ago.' },
      { cause:'building pressure', conscious:true,
        dispatch:'You are called to {location} for a PATIENT who feels unwell with chest discomfort.',
        presentation:'Sitting forward, sweaty and pale, one hand on the chest, looks frightened, mild breathlessness.',
        allergies:'No known drug allergies.',
        events:'Felt heavy chest pressure that built up over the last 20–30 minutes and is ongoing.' },
      { cause:'atypical presentation', conscious:true,
        dispatch:'You are called to {location} for a PATIENT who feels generally unwell and short of breath.',
        presentation:'Pale and sweaty, vague discomfort across the chest and into the jaw, a little breathless, uneasy.',
        allergies:'No known drug allergies.',
        events:'Has felt off and clammy for about an hour with discomfort that is hard to pin down.' },
    ],
    painBased: true,    // ACS is a pain complaint → full meaningful OPQRST
    // ⚠️ PLACEHOLDER deviations — Keith to verify.
    // ACS has NO single rigid vital fingerprint — the history + ECG carry the diagnosis,
    // not dramatically abnormal vitals. So shifts here are deliberately MILD: a student
    // who waits for crashing vitals in ACS has missed it. That is the teaching point.
    deviations: {
      hr:    { dir:'up', intensity:0.3 },   // mild — pain/anxiety; often near-normal
      bpSys: { dir:'up', intensity:0.25 },  // mild catecholamine rise; can also be normal
      // rr / spo2 / bgl / temp omitted → largely normal (SpO₂ may sit at lower-normal)
    },
    sample: {
      symptoms:'Central chest pain/pressure, sweating, nausea, shortness of breath, anxiety.',
      medications:'May be on antihypertensives, statins, or none.',
      pmh:'Possible hypertension, high cholesterol, smoking, diabetes, or previous cardiac history.',
      lastIntake:'A normal meal earlier in the day.',
    },
    // Pain-based: full OPQRST with the classic cardiac descriptors (heavy/crushing/tight,
    // radiating to arm/jaw). Quality deliberately uses cardiac language, NOT sharp/stabbing
    // (which clinically argues AGAINST ACS).
    opqrst: {
      onset:'Came on over a few minutes.',
      provocation:'Worse on exertion; not affected by breathing or movement.',
      quality:'Heavy, tight, pressure-like — "a weight on the chest".',
      radiates:'Into the left arm and up to the jaw.',
      severity:'7',
      time:'Ongoing for the last 20–40 minutes.',
    },
    reveal: {
      diagnosis:'Acute Coronary Syndrome (suspected) — possible STEMI/NSTEMI/unstable angina depending on ECG.',
      pathway:'Recognise the ACS picture (cardiac-sounding pain + risk factors + ECG changes). Position of comfort, oxygen only if hypoxic, aspirin, GTN if not contraindicated and SBP adequate, acquire/transmit a 12-lead early, and pre-alert/transport to a PCI-capable centre. Reassess pain and vitals throughout.',
      interventions:'12-lead ECG early, position of comfort, oxygen titrated only if SpO₂ low, aspirin PO, GTN sublingual if SBP ≥110 mmHg and not contraindicated, antiplatelet per pathway, continuous monitoring, pre-alert and rapid transport. (IV access and IV analgesia such as morphine are Advanced Paramedic scope.)',
      drugs: [
        { name:'Aspirin',  paramedic:'300mg PO (chewed).' },
        { name:'GTN (Glyceryl Trinitrate)', paramedic:'400mcg sublingual, repeat at 3–5 min intervals (max 1200mcg). Requires SBP ≥110 mmHg.' },
        { name:'Oxygen',   paramedic:'Only if hypoxic — titrate to SpO₂ 94–98%.' },
        { name:'Morphine Sulphate', paramedic:'Not in Paramedic scope.', ap:'4mg IV initial, repeat 2mg at ≥2 min PRN (max 16mg).' },
      ],
    },
  },
];
