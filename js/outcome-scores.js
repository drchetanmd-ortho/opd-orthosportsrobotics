// ── Outcome Scores ────────────────────────────────────────────────────────────

const OUTCOME_SCORES = {
  oxford_knee: {
    name: 'Oxford Knee Score (OKS)',
    range: '0–48 (48 = best)',
    interpret: s => s >= 41 ? 'Excellent' : s >= 34 ? 'Good' : s >= 27 ? 'Fair' : 'Poor',
    questions: [
      { q: 'How would you describe the pain you usually have in your knee?', opts: ['None (4)','Very mild (3)','Mild (2)','Moderate (1)','Severe (0)'] },
      { q: 'How much difficulty have you had washing and drying yourself?', opts: ['No (4)','Very little (3)','Moderate (2)','Extreme (1)','Impossible (0)'] },
      { q: 'Getting in and out of a car / using public transport?', opts: ['No (4)','Very little (3)','Moderate (2)','Extreme (1)','Impossible (0)'] },
      { q: 'How long can you walk before pain becomes severe?', opts: ['>30 min (4)','16–30 min (3)','5–15 min (2)','<5 min (1)','Cannot (0)'] },
      { q: 'After a meal, how much pain from your knee sitting?', opts: ['No (4)','Very little (3)','Moderate (2)','Very much (1)','Unbearable (0)'] },
      { q: 'Have you been limping when walking?', opts: ['Rarely/Never (4)','Sometimes (3)','Often (2)','Most of time (1)','All of time (0)'] },
      { q: 'Could you kneel down and get up again?', opts: ['Yes easily (4)','With little difficulty (3)','With moderate difficulty (2)','With extreme difficulty (1)','No (0)'] },
      { q: 'Have you been troubled by pain in bed at night?', opts: ['No nights (4)','1–2 nights (3)','Some nights (2)','Most nights (1)','Every night (0)'] },
      { q: 'How much has pain interfered with your work?', opts: ['Not at all (4)','A little (3)','Moderately (2)','Greatly (1)','Totally (0)'] },
      { q: 'Have you felt that your knee might suddenly give way?', opts: ['Rarely/Never (4)','Sometimes (3)','Often (2)','Most of time (1)','All of time (0)'] },
      { q: 'Could you do the household shopping on your own?', opts: ['Yes easily (4)','With little difficulty (3)','With moderate difficulty (2)','With extreme difficulty (1)','No (0)'] },
      { q: 'Could you walk down a flight of stairs?', opts: ['Yes easily (4)','With little difficulty (3)','With moderate difficulty (2)','With extreme difficulty (1)','No (0)'] },
    ]
  },
  oxford_hip: {
    name: 'Oxford Hip Score (OHS)',
    range: '0–48 (48 = best)',
    interpret: s => s >= 41 ? 'Excellent' : s >= 34 ? 'Good' : s >= 27 ? 'Fair' : 'Poor',
    questions: [
      { q: 'How would you describe the pain you usually have in your hip?', opts: ['None (4)','Very mild (3)','Mild (2)','Moderate (1)','Severe (0)'] },
      { q: 'How much difficulty have you had washing and drying yourself?', opts: ['No (4)','Very little (3)','Moderate (2)','Extreme (1)','Impossible (0)'] },
      { q: 'Getting in and out of a car or public transport?', opts: ['No (4)','Very little (3)','Moderate (2)','Extreme (1)','Impossible (0)'] },
      { q: 'How long can you walk before pain becomes severe?', opts: ['>30 min (4)','16–30 min (3)','5–15 min (2)','<5 min (1)','Cannot (0)'] },
      { q: 'How much pain have you had after sitting at a table?', opts: ['No (4)','Very little (3)','Moderate (2)','Very much (1)','Unbearable (0)'] },
      { q: 'Have you been limping when walking?', opts: ['Rarely/Never (4)','Sometimes (3)','Often (2)','Most of time (1)','All of time (0)'] },
      { q: 'Could you climb a flight of stairs?', opts: ['Yes easily (4)','With little difficulty (3)','Moderate difficulty (2)','Extreme difficulty (1)','No (0)'] },
      { q: 'After a walk, have you had pain in bed at night?', opts: ['No nights (4)','1–2 nights (3)','Some nights (2)','Most nights (1)','Every night (0)'] },
      { q: 'How much has pain interfered with your work?', opts: ['Not at all (4)','A little (3)','Moderately (2)','Greatly (1)','Totally (0)'] },
      { q: 'Have you had any sudden severe pain from your hip?', opts: ['No days (4)','1–2 days (3)','Some days (2)','Most days (1)','Every day (0)'] },
      { q: 'Could you do the household shopping on your own?', opts: ['Yes easily (4)','With little difficulty (3)','Moderate difficulty (2)','Extreme difficulty (1)','No (0)'] },
      { q: 'Could you walk down a flight of stairs?', opts: ['Yes easily (4)','With little difficulty (3)','Moderate difficulty (2)','Extreme difficulty (1)','No (0)'] },
    ]
  },
  koos: {
    name: 'KOOS – Knee Injury & OA Outcome Score',
    range: '0–100 (100 = no problems)',
    interpret: s => s >= 80 ? 'Minimal symptoms' : s >= 60 ? 'Mild symptoms' : s >= 40 ? 'Moderate symptoms' : 'Severe symptoms',
    questions: [
      { q: 'Pain frequency in your knee', opts: ['Never (4)','Monthly (3)','Weekly (2)','Daily (1)','Always (0)'] },
      { q: 'Pain: twisting / pivoting on knee', opts: ['None (4)','Mild (3)','Moderate (2)','Severe (1)','Extreme (0)'] },
      { q: 'Pain: straightening knee fully', opts: ['None (4)','Mild (3)','Moderate (2)','Severe (1)','Extreme (0)'] },
      { q: 'Pain: bending knee fully', opts: ['None (4)','Mild (3)','Moderate (2)','Severe (1)','Extreme (0)'] },
      { q: 'Pain: walking on flat surface', opts: ['None (4)','Mild (3)','Moderate (2)','Severe (1)','Extreme (0)'] },
      { q: 'Stiffness: how severe in morning?', opts: ['None (4)','Mild (3)','Moderate (2)','Severe (1)','Extreme (0)'] },
      { q: 'Stiffness: later in day after sitting?', opts: ['None (4)','Mild (3)','Moderate (2)','Severe (1)','Extreme (0)'] },
      { q: 'Function: going up/down stairs', opts: ['No (4)','Mild (3)','Moderate (2)','Severe (1)','Extreme (0)'] },
      { q: 'Function: rising from sitting', opts: ['No (4)','Mild (3)','Moderate (2)','Severe (1)','Extreme (0)'] },
      { q: 'Sport: squatting', opts: ['No (4)','Mild (3)','Moderate (2)','Severe (1)','Extreme (0)'] },
    ]
  },
  vas_pain: {
    name: 'VAS Pain Score',
    range: '0–10 (0 = no pain)',
    interpret: s => s === 0 ? 'No pain' : s <= 3 ? 'Mild pain' : s <= 6 ? 'Moderate pain' : 'Severe pain',
    questions: [
      { q: 'Current pain level (0 = no pain, 10 = worst pain imaginable)', opts: ['0','1','2','3','4','5','6','7','8','9','10'] }
    ]
  },
  constant_shoulder: {
    name: 'Constant Shoulder Score',
    range: '0–100 (100 = normal)',
    interpret: s => s >= 80 ? 'Excellent' : s >= 65 ? 'Good' : s >= 50 ? 'Fair' : 'Poor',
    questions: [
      { q: 'Pain (0=severe 15=none)', opts: ['15','12','9','6','3','0'] },
      { q: 'Activities of daily living (0=poor 20=full)', opts: ['20','15','10','5','0'] },
      { q: 'Forward flexion (0=<30° 10=151–180°)', opts: ['10','8','6','4','2','0'] },
      { q: 'Lateral abduction (0=<30° 10=151–180°)', opts: ['10','8','6','4','2','0'] },
      { q: 'External rotation full (0=no 10=yes+above head)', opts: ['10','6','4','2','0'] },
      { q: 'Internal rotation (0=none 10=to neck)', opts: ['10','8','6','4','2','0'] },
    ]
  },
  ikdc: {
    name: 'IKDC – International Knee Documentation Committee',
    range: '0–100 (100 = best)',
    interpret: s => s >= 80 ? 'Excellent' : s >= 60 ? 'Good' : s >= 40 ? 'Fair' : 'Poor',
    questions: [
      { q: 'Highest activity level without pain', opts: ['Very strenuous (4)','Strenuous (3)','Moderate (2)','Light (1)','Unable (0)'] },
      { q: 'How often do you have pain?', opts: ['Never (4)','Monthly (3)','Weekly (2)','Daily (1)','Constant (0)'] },
      { q: 'Pain severity today (VAS)', opts: ['0 (4)','1–3 (3)','4–6 (2)','7–8 (1)','9–10 (0)'] },
      { q: 'Joint stiffness severity', opts: ['None (4)','Mild (3)','Moderate (2)','Severe (1)','Extreme (0)'] },
      { q: 'Swelling severity', opts: ['None (4)','Mild (3)','Moderate (2)','Severe (1)','Extreme (0)'] },
      { q: 'Giving way frequency', opts: ['Never (4)','Rarely (3)','Sometimes (2)','Often (1)','Constant (0)'] },
      { q: 'Going up stairs', opts: ['No difficulty (4)','Minimal (3)','Moderate (2)','Extreme (1)','Unable (0)'] },
      { q: 'Going down stairs', opts: ['No difficulty (4)','Minimal (3)','Moderate (2)','Extreme (1)','Unable (0)'] },
      { q: 'Kneeling on front of knee', opts: ['No difficulty (4)','Minimal (3)','Moderate (2)','Extreme (1)','Unable (0)'] },
      { q: 'Squatting', opts: ['No difficulty (4)','Minimal (3)','Moderate (2)','Extreme (1)','Unable (0)'] },
    ]
  }
};

// ── Outcome Score Modal ──────────────────────────────────────────────────────
let _activeScore = null;
let _scoreAnswers = [];

function openOutcomeScoreModal(scoreKey) {
  _activeScore = scoreKey;
  const score = OUTCOME_SCORES[scoreKey];
  if (!score) return;
  _scoreAnswers = new Array(score.questions.length).fill(null);

  const modal = document.getElementById('modal-outcome-score');
  document.getElementById('ocs-title').textContent = score.name;
  document.getElementById('ocs-range').textContent = score.range;

  const body = document.getElementById('ocs-questions');
  body.innerHTML = score.questions.map((q, i) => `
    <div class="ocs-question">
      <div class="ocs-q-text">${i+1}. ${q.q}</div>
      <div class="ocs-opts">
        ${q.opts.map((opt, j) => `
          <button class="ocs-opt" onclick="selectOcsOpt(${i},${j},this)" data-val="${j}">
            ${opt}
          </button>`).join('')}
      </div>
    </div>`).join('');

  document.getElementById('ocs-result').textContent = '';
  modal.style.display = 'flex';
}

function selectOcsOpt(qIdx, optIdx, btn) {
  const score = OUTCOME_SCORES[_activeScore];
  // Deselect others in same question
  btn.closest('.ocs-opts').querySelectorAll('.ocs-opt').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  // Store reversed score (last option = 0)
  _scoreAnswers[qIdx] = score.questions[qIdx].opts.length - 1 - optIdx;
  calcOutcomeScore();
}

function calcOutcomeScore() {
  const score = OUTCOME_SCORES[_activeScore];
  if (_scoreAnswers.includes(null)) return;
  const total = _scoreAnswers.reduce((a, b) => a + b, 0);
  // Normalize to range
  const maxRaw = score.questions.reduce((a, q) => a + (q.opts.length - 1), 0);
  let normalized = Math.round((total / maxRaw) * (score.name.includes('VAS') ? 10 : score.name.includes('KOOS') || score.name.includes('IKDC') || score.name.includes('Constant') ? 100 : 48));
  // VAS: stored answer is reversed (opts.length-1-optIdx); un-reverse to get actual pain score
  if (score.name.includes('VAS')) normalized = maxRaw - _scoreAnswers[0];
  const interpretation = score.interpret(normalized);
  const resultEl = document.getElementById('ocs-result');
  resultEl.innerHTML = `Score: <strong>${normalized}</strong> / ${score.range.split('(')[0].trim().split('–')[1]} &nbsp;·&nbsp; <span class="ocs-interpret">${interpretation}</span>`;
}

function saveOutcomeScore() {
  const score = OUTCOME_SCORES[_activeScore];
  if (!score || _scoreAnswers.includes(null)) { toast('Please answer all questions', 'error'); return; }
  const total = _scoreAnswers.reduce((a, b) => a + b, 0);
  const maxRaw = score.questions.reduce((a, q) => a + (q.opts.length - 1), 0);
  let normalized = Math.round((total / maxRaw) * (score.name.includes('VAS') ? 10 : score.name.includes('KOOS') || score.name.includes('IKDC') || score.name.includes('Constant') ? 100 : 48));
  if (score.name.includes('VAS')) normalized = maxRaw - _scoreAnswers[0];
  const interpretation = score.interpret(normalized);

  // Append to visit notes only (not examination — score text prints on prescriptions)
  const notesEl = document.getElementById('field-notes');
  const entry = `[${score.name}: ${normalized} — ${interpretation} — ${new Date().toLocaleDateString('en-IN')}]`;
  if (notesEl) notesEl.value = (notesEl.value ? notesEl.value + '\n' : '') + entry;

  if (notesEl) updateVisitField('notes', notesEl.value);
  closeOutcomeScoreModal();
  toast(`${score.name}: ${normalized} (${interpretation}) saved`);
}

function closeOutcomeScoreModal() {
  document.getElementById('modal-outcome-score').style.display = 'none';
}
