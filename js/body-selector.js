// ── Body Part Selector + Examination Templates ───────────────────────────────

const BODY_PARTS = [
  { id:'neck',     label:'Neck',      emoji:'🔵' },
  { id:'shoulder', label:'Shoulder',  emoji:'🔵' },
  { id:'elbow',    label:'Elbow',     emoji:'🔵' },
  { id:'wrist',    label:'Wrist',     emoji:'🔵' },
  { id:'hand',     label:'Hand',      emoji:'🔵' },
  { id:'spine',    label:'Spine',     emoji:'🔵' },
  { id:'pelvis',   label:'Pelvis',    emoji:'🔵' },
  { id:'hip',      label:'Hip',       emoji:'🔵' },
  { id:'knee',     label:'Knee',      emoji:'🔵' },
  { id:'ankle',    label:'Ankle',     emoji:'🔵' },
  { id:'foot',     label:'Foot',      emoji:'🔵' },
];

const EXAM_TEMPLATES = {
  knee: {
    history: 'Pain: site/radiation/severity (VAS /10)\nDuration / Mechanism of injury\nSwelling: acute vs chronic\nInstability / Locking / Giving way\nNight pain\nWalking distance\nStairs: up/down\nSquatting / Kneeling\nPrevious surgery / injections',
    examination: 'Inspection: Gait, Alignment, Swelling, Muscle wasting\nPalpation: Joint line (medial/lateral), Patella, Tibial tuberosity\nROM: Flexion ___° Extension ___° (FFD ___°)\nStability:\n• Lachman: Neg/Pos (soft/firm end-point)\n• Anterior Drawer: Neg/Pos\n• Posterior Drawer/Sag: Neg/Pos\n• Pivot Shift: Neg/Pos\n• Valgus Stress (0°/30°): Neg/Pos\n• Varus Stress (0°/30°): Neg/Pos\n• McMurray (Med/Lat): Neg/Pos\n• Thessaly: Neg/Pos\n• Patellar Grind / Apprehension: Neg/Pos\n• Clarke Test: Neg/Pos\nNeurovascular: Intact',
    investigations: 'X-Ray Knee AP (Standing) / Lateral / Skyline\nMRI Knee (3T preferred)',
    advice: 'Physiotherapy: Quadriceps strengthening, hamstring flexibility\nWeight loss if BMI >25\nAvoid high-impact activities\nKnee brace as required\nIce 20 min TID',
    specialTests: ['Lachman','Anterior Drawer','Posterior Drawer','Pivot Shift','Valgus Stress','Varus Stress','McMurray','Thessaly','Patellar Grind','Clarke Test','Patella Apprehension','J-Sign','Ober Test','Dial Test']
  },
  hip: {
    history: 'Pain: groin/lateral/buttock/thigh/referred knee\nDuration / Mechanism\nStart-up pain vs activity pain\nLimp\nWalking distance\nStairs\nShoe tying difficulty\nPrevious surgery / injections',
    examination: 'Inspection: Gait (Trendelenburg/Antalgic), LLD, Muscle wasting\nPalpation: Greater trochanter, Groin, ASIS\nROM: Flexion ___° Extension ___° Abduction ___° Adduction ___° IR ___° ER ___°\nSpecial Tests:\n• FABER (Patrick): Neg/Pos\n• FADIR: Neg/Pos\n• Log Roll: Neg/Pos\n• Thomas Test: Neg/Pos\n• Trendelenburg: Neg/Pos\n• Straight Leg Raise: ___°\nLLD: True ___cm Apparent ___cm\nNeurovascular: Intact',
    investigations: 'X-Ray Pelvis AP\nX-Ray Hip Lateral (Cross-table/Frog-leg)\nMRI Hip',
    advice: 'Walking aid if required\nWeight loss\nLow-impact exercise: swimming, cycling\nAvoid high-impact sports',
    specialTests: ['FABER (Patrick)','FADIR','Log Roll','Thomas Test','Trendelenburg','Ober Test','Ely Test','SLR','Gaenslen']
  },
  shoulder: {
    history: 'Pain: location / radiation / severity (VAS /10)\nDuration / Mechanism\nInstability episodes\nNight pain\nOverhead activity pain\nSport: throwing / racquet / swimming\nDominant hand involvement\nNeck symptoms',
    examination: 'Inspection: Muscle wasting (Supraspinatus/Infraspinatus), Winging, Deformity\nPalpation: AC Joint, Bicipital groove, Subacromial space, GHJ\nROM: Flexion ___° Abduction ___° ER (0°/90°) ___° IR (behind back to ___ level)\nRotator Cuff:\n• Jobe (Empty Can): Neg/Pos\n• Full Can: Neg/Pos\n• Lift Off (Subscapularis): Neg/Pos\n• Belly Press: Neg/Pos\n• Drop Arm: Neg/Pos\nImpingement:\n• Hawkins: Neg/Pos\n• Neer: Neg/Pos\nInstability:\n• Apprehension: Neg/Pos\n• Relocation: Neg/Pos\n• Sulcus Sign: Neg/Pos\nACJ: Cross-body Adduction: Neg/Pos\nBiceps: Speed: Neg/Pos  Yergason: Neg/Pos\nNeurovascular: Intact',
    investigations: 'X-Ray Shoulder AP / Outlet / Axillary\nMRI Shoulder / MR Arthrogram',
    advice: 'Rotator cuff strengthening program\nPostural correction\nAvoid overhead activities initially\nHeat/Ice as required',
    specialTests: ['Jobe (Empty Can)','Full Can','Lift Off','Belly Press','Drop Arm','Hawkins','Neer','Painful Arc','Apprehension','Relocation','Sulcus Sign','Cross-body Adduction','Speed Test','Yergason','O\'Brien','Crank Test']
  },
  elbow: {
    history: 'Pain: medial/lateral/posterior\nDuration / Mechanism\nOccupation / Sport\nParaesthesia / Numbness\nInstability',
    examination: 'Inspection: Carrying angle, Swelling, Deformity\nPalpation: Lateral Epicondyle, Medial Epicondyle, Olecranon\nROM: Flexion ___° Extension ___° Supination ___° Pronation ___°\nSpecial Tests:\n• Cozen (Tennis Elbow): Neg/Pos\n• Mill Test: Neg/Pos\n• Medial Epicondyle Tenderness: Neg/Pos\n• Valgus Stress: Neg/Pos\n• Tinel at Cubital Tunnel: Neg/Pos\n• Elbow Flexion Test: Neg/Pos\nNeurovascular: Intact',
    investigations: 'X-Ray Elbow AP/Lat\nNCS/EMG if neuropathy suspected\nUltrasound if tendinopathy',
    advice: 'Activity modification\nPhysiotherapy\nCounter-force brace for epicondylitis',
    specialTests: ['Cozen Test','Mill Test','Medial Epicondyle Tenderness','Valgus Stress','Lateral Pivot Shift','Tinel at Cubital Tunnel','Elbow Flexion Test','Moving Valgus Stress']
  },
  wrist: {
    history: 'Pain: dorsal/volar/radial/ulnar\nDuration / Mechanism (FOOSH?)\nSwelling\nClicking / Instability\nOccupation / Sport',
    examination: 'Inspection: Swelling, Deformity, Muscle wasting\nPalpation: Anatomical snuffbox, Distal radius, Scaphoid, TFCC, Carpal Tunnel\nROM: Flexion ___° Extension ___° RD ___° UD ___° Pro ___° Sup ___°\nSpecial Tests:\n• Tinel (Carpal Tunnel): Neg/Pos\n• Phalen: Neg/Pos\n• Finkelstein: Neg/Pos\n• Watson Scaphoid Shift: Neg/Pos\n• Piano Key (DRUJ): Neg/Pos\nGrip Strength: Right ___kg Left ___kg\nNeurovascular: Intact',
    investigations: 'X-Ray Wrist PA/Lat/Scaphoid views\nMRI Wrist / CT if fracture suspected',
    advice: 'Wrist splint\nAvoid heavy lifting\nActivity modification',
    specialTests: ['Tinel (Carpal Tunnel)','Phalen','Finkelstein','Watson Shift','Piano Key (DRUJ)','Grind Test','Fovea Sign (TFCC)','Lunotriquetral Shear']
  },
  hand: {
    history: 'Pain / Triggering / Locking\nDuration\nOccupation\nDiabetes / Hypothyroidism\nDominant hand',
    examination: 'Inspection: Deformity, Swelling, Thenar/Hypothenar wasting\nPalpation: Nodules, Tenderness A1 Pulley\nROM: Individual finger active/passive\nSpecial Tests:\n• Triggering: Present/Absent\n• Tinel at Carpal Tunnel: Neg/Pos\n• Froment Sign: Neg/Pos\n• Intrinsic Tightness: Neg/Pos\nSensation: 2-point discrimination',
    investigations: 'X-Ray Hand\nNCS/EMG\nUltrasound',
    advice: 'Splinting\nSteroid injection\nOccupational therapy',
    specialTests: ['Triggering','Froment Sign','Bunnell-Littler Test','Intrinsic Tightness','Tinel CTS','Phalen']
  },
  spine: {
    history: 'Pain: neck/back/radiation (dermatomal pattern)\nDuration / Mechanism\nNeurological symptoms: numbness/tingling/weakness/bladder/bowel\nAggravating/relieving factors\nRest pain / Night pain\nMyelopathy symptoms (unsteady gait, hand clumsiness)',
    examination: 'Inspection: Posture, Scoliosis, Kyphosis\nPalpation: Spinous processes, Paraspinal tenderness\nROM: Flexion/Extension/Lateral Flexion/Rotation ___°\nNeurological:\n• Power: Hip flexors / Quad / TA / EHL / Gastroc — L2/3/4/5/S1\n• Sensation: Dermatomes\n• Reflexes: KJ / AJ / Plantar\n• Clonus: Present/Absent\nSpecial Tests:\n• SLR (L/R): ___°\n• Crossed SLR: Neg/Pos\n• Femoral Stretch: Neg/Pos\n• Hoffman Sign: Neg/Pos\n• Spurling (Cervical): Neg/Pos',
    investigations: 'X-Ray L-Spine / C-Spine AP/Lat (± Flexion-Extension)\nMRI Spine',
    advice: 'Activity modification\nPhysiotherapy: core strengthening, postural correction\nNSAIDs\nEpidural steroid injection if radiculopathy',
    specialTests: ['SLR','Crossed SLR','Femoral Nerve Stretch','Hoffman Sign','Spurling Test','Lhermitte','Kemp Test','FABER','Distraction Test']
  },
  ankle: {
    history: 'Pain: anterior/posterior/medial/lateral\nMechanism: inversion/eversion\nSwelling / Bruising\nWeight-bearing ability\nRecurrent sprains\nSport',
    examination: 'Inspection: Swelling, Bruising, Deformity\nPalpation: ATFL, CFL, PTFL, Medial Malleolus, Base 5th MT, Navicular\nROM: Dorsiflexion ___° Plantarflexion ___° Inversion ___° Eversion ___°\nSpecial Tests:\n• Anterior Drawer: Neg/Pos\n• Talar Tilt: Neg/Pos\n• Thompson: Neg/Pos\n• Ottawa Rules: Bone tenderness? Weight-bearing?\nNeurovascular: Intact',
    investigations: 'X-Ray Ankle AP/Lat/Mortise (if Ottawa +ve)\nMRI Ankle if ligament/tendon assessment needed',
    advice: 'RICE protocol\nAnkle brace\nPhysiotherapy: proprioception, strengthening',
    specialTests: ['Anterior Drawer','Talar Tilt','Thompson Test','Single Heel Raise','Too Many Toes Sign','Squeeze Test (Syndesmosis)','External Rotation Stress']
  },
  foot: {
    history: 'Pain location: heel/arch/forefoot/toes\nDuration\nWorse: first steps AM vs activity\nFootwear\nOccupation: prolonged standing',
    examination: 'Inspection: Arch (flat/high), Deformities, Callosity, Nail changes\nPalpation: Heel point, Plantar fascia, Metatarsal heads, 1st MTPJ\nROM: 1st MTPJ ___°\nSpecial Tests:\n• Windlass Test: Neg/Pos\n• Mulder Click (Morton): Neg/Pos\n• Tinel (Tarsal Tunnel): Neg/Pos\nNeurovascular: Intact',
    investigations: 'X-Ray Foot AP/Lat (Standing)\nUltrasound Heel if plantar fasciitis',
    advice: 'Appropriate footwear\nOrthotic insole\nCalf/plantar fascia stretching',
    specialTests: ['Windlass Test','Mulder Click','Tinel Tarsal Tunnel','Coleman Block Test','Silverskiold']
  },
  neck: {
    history: 'Pain: neck/radiation to arm\nDuration / Mechanism (whiplash?)\nNumbness / Tingling / Weakness\nHeadaches\nMyelopathy: gait disturbance, hand clumsiness, bladder',
    examination: 'Inspection: Posture, Head tilt\nPalpation: C-spine spinous processes, Paraspinals, Trapezius\nROM: Flexion ___° Extension ___° LF R___° L___° Rotation R___° L___°\nNeurological: C5 (deltoid), C6 (biceps/wrist ext), C7 (triceps), C8 (finger flex)\nSpecial Tests:\n• Spurling: Neg/Pos\n• Distraction: Neg/Pos\n• Hoffman: Neg/Pos\n• Lhermitte: Neg/Pos\nNeurovascular: Intact',
    investigations: 'X-Ray Cervical AP/Lat (± Flexion-Extension)\nMRI C-Spine',
    advice: 'Cervical collar short-term\nPhysiotherapy: cervical stabilization\nNSAIDs\nTENS',
    specialTests: ['Spurling','Distraction','Hoffman','Lhermitte','Jackson Compression','Shoulder Abduction Relief','Upper Limb Tension Test']
  },
  pelvis: {
    history: 'Pain: groin/buttock/pelvic\nMechanism (trauma vs atraumatic)\nWeight-bearing ability\nNeurological symptoms\nBladder/Bowel',
    examination: 'Inspection: Posture, Gait, LLD\nPalpation: ASIS, PSIS, Pubic Symphysis, SI Joints\nSpecial Tests:\n• FABER: Neg/Pos\n• SI Distraction: Neg/Pos\n• SI Compression: Neg/Pos\n• Gaenslen: Neg/Pos\n• Thigh Thrust: Neg/Pos\nNeurovascular: Intact',
    investigations: 'X-Ray Pelvis AP\nCT Pelvis (trauma)\nMRI SI Joints (inflammatory)',
    advice: 'Weight-bearing as per injury\nSI Belt\nPhysiotherapy',
    specialTests: ['FABER','SI Distraction','SI Compression','Gaenslen','Thigh Thrust','Patrick Test']
  },
};

// ── Body Part Selector UI ────────────────────────────────────────────────────
function renderBodySelector() {
  const container = document.getElementById('body-selector-wrap');
  if (!container) return;

  container.innerHTML = `
    <div class="body-selector">
      <div class="body-selector-title">Select Body Part</div>
      <div class="body-parts-grid">
        ${BODY_PARTS.map(p => `
          <button class="body-part-btn" data-part="${p.id}" onclick="selectBodyPart('${p.id}')">
            ${p.label}
          </button>`).join('')}
      </div>
    </div>
  `;
}

function selectBodyPart(partId) {
  // Highlight selected
  document.querySelectorAll('.body-part-btn').forEach(b => b.classList.toggle('active', b.dataset.part === partId));

  const tmpl = EXAM_TEMPLATES[partId];
  if (!tmpl) return;

  // Show quick-fill panel
  let panel = document.getElementById('body-exam-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'body-exam-panel';
    panel.className = 'body-exam-panel';
    const wrap = document.getElementById('body-selector-wrap');
    wrap.parentElement.insertBefore(panel, wrap.nextSibling);
  }

  panel.innerHTML = `
    <div class="bep-header">
      <span class="bep-title">${partId.charAt(0).toUpperCase()+partId.slice(1)} – Quick Fill</span>
      <button class="bep-close" onclick="document.getElementById('body-exam-panel').style.display='none'">✕</button>
    </div>
    <div class="bep-actions">
      <button class="bep-btn" onclick="fillExamField('field-hopi','${encodeField(tmpl.history)}')">Fill History</button>
      <button class="bep-btn" onclick="fillExamField('field-examination','${encodeField(tmpl.examination)}')">Fill Examination</button>
      <button class="bep-btn" onclick="fillExamField('field-investigations','${encodeField(tmpl.investigations)}')">Fill Investigations</button>
      <button class="bep-btn" onclick="fillExamField('field-advice','${encodeField(tmpl.advice)}')">Fill Advice</button>
    </div>
    <div class="bep-tests">
      <div class="bep-tests-label">Special Tests (tap to add):</div>
      <div class="bep-tests-grid">
        ${tmpl.specialTests.map(t => `<button class="bep-test-btn" onclick="addSpecialTest('${t.replace(/'/g,"\\'")}')">${t}</button>`).join('')}
      </div>
    </div>
    ${buildDiagChips(partId)}
  `;
  panel.style.display = 'block';
}

function buildDiagChips(partId) {
  if (typeof ORTHO_DIAGNOSES === 'undefined') return '';
  const results = ORTHO_DIAGNOSES.filter(d => d.body === partId).slice(0, 12);
  if (!results.length) return '';
  const chips = results.map(d =>
    `<button class="bep-diag-chip" onclick='applyDiagnosis(${JSON.stringify(d).replace(/'/g,"&#39;")})'>${d.label}</button>`
  ).join('');
  return `<div class="bep-diag-section">
    <div class="bep-tests-label">Diagnoses — tap to apply:</div>
    <div class="bep-diag-chips">${chips}</div>
  </div>`;
}

function encodeField(text) {
  return text.replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/\n/g,'\\n');
}

function fillExamField(fieldId, text) {
  const el = document.getElementById(fieldId);
  if (!el) return;
  const decoded = text.replace(/\\n/g,'\n');
  el.value = decoded;
  el.focus();
  toast('Field filled — edit as needed');
}

function addSpecialTest(testName) {
  const examEl = document.getElementById('field-examination');
  if (!examEl) return;
  const line = `• ${testName}: `;
  if (!examEl.value.includes(testName)) {
    examEl.value += (examEl.value ? '\n' : '') + line;
  }
  examEl.focus();
}

function filterDiagByBodyPart(partId) {
  const results = ORTHO_DIAGNOSES.filter(d => d.body === partId).slice(0, 10);
  const dd = document.getElementById('diag-dropdown');
  const input = document.getElementById('field-diagnosis');
  if (!dd || !results.length || !input) return;
  dd.innerHTML = results.map(d => `
    <div class="diag-item" onclick="applyDiagnosis(${JSON.stringify(d).replace(/"/g,'&quot;')})">
      <span class="diag-label">${d.label}</span>
      ${d.icd ? `<span class="diag-icd">${d.icd}</span>` : ''}
    </div>`).join('');
  dd.style.display = 'block';
}
