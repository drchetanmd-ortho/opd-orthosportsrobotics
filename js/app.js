// ─── Utilities ───────────────────────────────────────────────────────────────
function esc(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ─── Medicine Master List (editable, persisted) ───────────────────────────────
// The list is stored in localStorage and seeded once from MEDICINE_SEED (sample
// list). After that it's fully clinic-managed — add/delete are permanent.
const MEDS_KEY = 'med_master_list';

let MEDICINE_DB = (function loadMedList() {
  try {
    const saved = localStorage.getItem(MEDS_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  const seed = (typeof MEDICINE_SEED !== 'undefined') ? MEDICINE_SEED.map(m => ({ ...m })) : [];
  try { localStorage.setItem(MEDS_KEY, JSON.stringify(seed)); } catch (e) {}
  return seed;
})();

function saveMedList() {
  try { localStorage.setItem(MEDS_KEY, JSON.stringify(MEDICINE_DB)); } catch (e) {}
}

// One-time migration: fold any medicines from the old "favourites"/custom stores
// into the master list, then clear those legacy stores. Runs harmlessly every load.
function migrateLegacyMedStores() {
  let changed = false;
  const have = new Set(MEDICINE_DB.map(m => String(m.id)));
  let legacy = [];
  try { legacy = legacy.concat(JSON.parse(localStorage.getItem('med_repository') || '[]')); } catch (e) {}
  try { legacy = legacy.concat(JSON.parse(localStorage.getItem('custom_medicines') || '[]')); } catch (e) {}
  legacy.forEach(m => {
    if (!m || m.id == null || have.has(String(m.id))) return;
    MEDICINE_DB.push({
      id: m.id, brand: m.brand || '', content: m.content || '',
      type: m.type || 'TAB', form: m.form || m.type || 'TAB',
      timings: m.timings || '1-0-0', timingsNote: m.timingsNote || 'After Food',
      frequency: m.frequency || 'Once Daily', duration: m.duration || '5 Days',
      dose: m.dose || '1', qty: m.qty || '', indications: m.indications || []
    });
    have.add(String(m.id));
    changed = true;
  });
  if (changed) saveMedList();
  // Favourites feature removed — clear legacy stores so nothing lingers.
  localStorage.removeItem('med_repository');
  localStorage.removeItem('custom_medicines');
}

// ─── State ───────────────────────────────────────────────────────────────────
const State = {
  currentPatient: null,
  currentVisit: null,
  medicines: [],        // [{med, dose, freq, duration, route, notes, qty}]
  searchTimeout: null,
  medSearchTimeout: null,
  isNewPatient: false,
  todayPatients: [],
  recentPatients: [],
};

// ─── Doctor Info ──────────────────────────────────────────────────────────────
const DOCTOR = {
  name: "Dr Chetan M Dojode",
  title: "Consultant Orthopaedic Surgeon",
  subtitle: "Arthroscopy, Sports Medicine & Robotic Joint Replacement",
  qualifications: "MBBS, MS (Orth), MCh (Orth, UK), MRCS (UK), FEBOT (Euro), FRCS (Orth, UK)",
  fellowships: [
    "Certificate of Specialist Registration (GMC, UK)",
    "Furlong Fellowship in Arthroplasty & Revision Surgery (UK)",
    "Clinical Fellowship in Shoulder & Knee Surgery (J&J, UK)",
    "Certified in Robotic Joint Replacements (MAKO Stryker)"
  ],
  kmc: "KMC no: 70561",
  phone: "9480909009",
  email: "joints.surgery@gmail.com",
  website: "www.drchetanmdojode.com",
  clinics: [
    {
      name: "Aarna Orthopaedic Clinic",
      address: "1182/1, 20th Main Rd, A Block,\nSahakar Nagar,\nBengaluru, Karnataka 560092",
      hours: "Hours: 5:00 pm to 7:00 pm"
    },
    {
      name: "SPARSH Hospital Yelahanka",
      address: "New Airport Road,\nKogilu Cross, Nehru Nagar,\nBengaluru, Karnataka 560064",
      hours: "Hours: 10:00 am to 4:00pm"
    }
  ]
};

// ─── Google Review ────────────────────────────────────────────────────────────
// Your Google Business Profile "write a review" links. Add/edit as needed.
const GOOGLE_REVIEW_PROFILES = [
  { label: "Aarna Orthopaedic Clinic",  code: "aarna",  url: "https://g.page/r/CbG5qO3MCVHOEAE/review" },
  { label: "SPARSH Hospital Yelahanka", code: "sparsh", url: "https://g.page/r/CSV6MSTxo0qDEAE/review" }
];

// Hosted star-rating page (5★ → Google, lower → private feedback).
// Update this to your GitHub Pages URL if it ever changes.
const REVIEW_GATE_BASE = "https://drchetanmd-ortho.github.io/opd-orthosportsrobotics/review.html";

// Opens a chooser; picking a profile either opens it, or (if a patient with a
// phone is loaded) offers to send it to the patient via WhatsApp.
function openGoogleReview() {
  document.getElementById('review-chooser')?.remove();

  const patient = State.currentPatient;
  const phone = (patient?.phone || '').replace(/\D/g, '');
  const canWhatsApp = phone.length >= 10;
  const patientName = patient?.name ? esc(patient.name) : '';

  const wrap = document.createElement('div');
  wrap.id = 'review-chooser';
  wrap.className = 'review-chooser-overlay';
  wrap.onclick = e => { if (e.target === wrap) wrap.remove(); };

  const rows = GOOGLE_REVIEW_PROFILES.map((p, i) => `
    <div class="review-profile">
      <div class="review-profile-name">⭐ ${esc(p.label)}</div>
      <div class="review-profile-actions">
        <button class="review-act review-open" onclick="reviewOpen(${i})">Open</button>
        ${canWhatsApp
          ? `<button class="review-act review-send" onclick="reviewSend(${i})">Send on WhatsApp</button>`
          : ``}
      </div>
    </div>`).join('');

  wrap.innerHTML = `
    <div class="review-chooser-card">
      <div class="review-chooser-head">
        <span>Request a Google review</span>
        <button onclick="document.getElementById('review-chooser').remove()">✕</button>
      </div>
      ${canWhatsApp
        ? `<div class="review-chooser-sub">Send to ${patientName} · ${esc(patient.phone)}</div>`
        : `<div class="review-chooser-sub">Open a profile to leave/share a review</div>`}
      ${rows}
      <button class="review-qr-link" onclick="showReviewQrModal()">📱 Show QR on screen</button>
      <button class="review-qr-link" onclick="openReviewQrCards()">🖨 Print QR desk cards</button>
    </div>`;
  document.body.appendChild(wrap);
}

function openReviewQrCards() {
  window.open(REVIEW_GATE_BASE.replace(/review\.html.*$/, 'qr.html'), '_blank', 'noopener');
  document.getElementById('review-chooser')?.remove();
}

// On-screen QR modal — show a patient the code to scan right at the desk.
function showReviewQrModal(startIdx) {
  document.getElementById('review-chooser')?.remove();
  document.getElementById('review-qr-modal')?.remove();

  if (typeof QRCode === 'undefined') {
    toast('QR library not loaded — check internet connection', 'error');
    return;
  }

  let idx = startIdx || 0;
  const wrap = document.createElement('div');
  wrap.id = 'review-qr-modal';
  wrap.className = 'review-chooser-overlay';
  wrap.onclick = e => { if (e.target === wrap) wrap.remove(); };
  wrap.innerHTML = `
    <div class="review-qr-card">
      <div class="review-chooser-head">
        <span>Scan to leave a review</span>
        <button onclick="document.getElementById('review-qr-modal').remove()">✕</button>
      </div>
      <div class="review-qr-tabs" id="review-qr-tabs"></div>
      <div class="review-qr-name" id="review-qr-name"></div>
      <div class="review-qr-box" id="review-qr-box"></div>
      <div class="review-qr-hint">Ask the patient to scan with their phone camera</div>
    </div>`;
  document.body.appendChild(wrap);

  const tabsEl = document.getElementById('review-qr-tabs');
  tabsEl.innerHTML = GOOGLE_REVIEW_PROFILES.map((p, i) =>
    `<button class="review-qr-tab" data-i="${i}" onclick="_renderReviewQr(${i})">${esc(p.label)}</button>`
  ).join('');

  window._renderReviewQr = function(i) {
    idx = i;
    const p = GOOGLE_REVIEW_PROFILES[i];
    document.querySelectorAll('.review-qr-tab').forEach(b =>
      b.classList.toggle('active', +b.dataset.i === i));
    document.getElementById('review-qr-name').textContent = p.label;
    const box = document.getElementById('review-qr-box');
    box.innerHTML = '';
    new QRCode(box, {
      text: `${REVIEW_GATE_BASE}?c=${p.code}`,
      width: 240, height: 240,
      colorDark: '#0d2136', colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H
    });
  };
  window._renderReviewQr(idx);
}

function reviewOpen(i) {
  const p = GOOGLE_REVIEW_PROFILES[i];
  if (!p) return;
  window.open(p.url, '_blank', 'noopener');
  document.getElementById('review-chooser')?.remove();
}

function reviewSend(i) {
  const p = GOOGLE_REVIEW_PROFILES[i];
  const patient = State.currentPatient;
  if (!p || !patient) return;
  const phone = (patient.phone || '').replace(/\D/g, '');
  const intl = phone.length === 10 ? '91' + phone : phone;   // default India code
  const first = (patient.name || '').split(' ')[0] || 'there';
  const gateUrl = `${REVIEW_GATE_BASE}?c=${p.code}`;
  const msg =
    `Dear ${first}, thank you for visiting ${DOCTOR.name}.\n\n` +
    `We'd love your feedback — please tap below and rate your experience:\n${gateUrl}\n\n` +
    `— ${p.label}`;
  window.open(`https://wa.me/${intl}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
  document.getElementById('review-chooser')?.remove();
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  }).replace(',', '');
}

function calcAge(dob) {
  if (!dob) return '';
  const diff = Date.now() - new Date(dob);
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

function uniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function toast(msg, type = 'success', duration = 2500) {
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  document.getElementById('toast-container').appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, duration);
}

// ─── Patient Panel ────────────────────────────────────────────────────────────
async function initPatientPanel() {
  State.todayPatients = await DB.getTodayPatients();
  State.recentPatients = await DB.searchPatients('');
  renderPatientList();
}

function renderPatientList(patients = null, mode = 'recent') {
  const list = document.getElementById('patient-list');
  const items = patients ?? (mode === 'today' ? State.todayPatients : State.recentPatients.slice(0, 15));

  if (!items.length) {
    list.innerHTML = `<div class="empty-state"><span class="empty-icon">👤</span><p>${mode === 'today' ? 'No patients seen today' : 'No recent patients'}</p></div>`;
    return;
  }

  list.innerHTML = items.map(p => `
    <div class="patient-item ${State.currentPatient?.id === p.id ? 'active' : ''}" onclick="loadPatient('${esc(p.id)}')">
      <div class="patient-avatar">${esc((p.name || 'U')[0].toUpperCase())}</div>
      <div class="patient-info">
        <div class="patient-name">${esc(p.name || 'Unknown')}</div>
        <div class="patient-meta">${esc(p.id)} · ${p.age || calcAge(p.dob) || '?'}y, ${esc(p.gender || '?')}</div>
        <div class="patient-phone">${esc(p.phone || '')}</div>
      </div>
      <div class="patient-item-right">
        <div class="patient-date">${p.lastVisit ? formatDate(p.lastVisit) : ''}</div>
        <button class="patient-del-btn" title="Delete patient" onclick="event.stopPropagation();deletePatient('${esc(p.id)}','${esc(p.name||'')}')">✕</button>
      </div>
    </div>
  `).join('');
}

async function searchPatients(query) {
  const searchResultsEl = document.getElementById('patient-search-results');
  const tabsArea = document.getElementById('left-tabs-area');

  if (!query.trim()) {
    searchResultsEl.style.display = 'none';
    tabsArea.style.display = 'flex';
    return;
  }

  searchResultsEl.style.display = 'block';
  tabsArea.style.display = 'none';

  const results = await DB.searchPatients(query);
  if (!results.length) {
    searchResultsEl.innerHTML = `<div class="empty-state"><span class="empty-icon">🔍</span><p>No patients found for "${query}"</p></div>`;
    return;
  }
  searchResultsEl.innerHTML = results.map(p => `
    <div class="patient-item ${State.currentPatient?.id === p.id ? 'active' : ''}" onclick="loadPatient('${esc(p.id)}')">
      <div class="patient-avatar">${esc((p.name || 'U')[0].toUpperCase())}</div>
      <div class="patient-info">
        <div class="patient-name">${esc(p.name || 'Unknown')}</div>
        <div class="patient-meta">${esc(p.id)} · ${p.age || calcAge(p.dob) || '?'}y, ${esc(p.gender || '?')}</div>
        <div class="patient-phone">${esc(p.phone || '')}</div>
      </div>
      <div class="patient-item-right">
        <div class="patient-date">${p.lastVisit ? formatDate(p.lastVisit) : ''}</div>
        <button class="patient-del-btn" title="Delete patient" onclick="event.stopPropagation();deletePatient('${esc(p.id)}','${esc(p.name||'')}')">✕</button>
      </div>
    </div>
  `).join('');
}

async function deletePatient(id, name) {
  if (!confirm('Move "' + name + '" to Recycle Bin?\n\nYou can restore them later from the bin at the bottom of the patient list.')) return;
  await DB.deletePatient(id);
  if (State.currentPatient?.id === id) {
    State.currentPatient = null;
    State.currentVisit = null;
    State.medicines = [];
    renderConsultationForm();
    renderMedicineTable();
    document.getElementById('prev-visits-section').style.display = 'none';
  }
  await initPatientPanel();
  await refreshRecycleBin();
  toast(name + ' moved to Recycle Bin');
}

async function refreshRecycleBin() {
  const items = await DB.getRecycleBin();
  const countEl = document.getElementById('recycle-bin-count');
  if (countEl) {
    if (items.length) { countEl.textContent = items.length; countEl.style.display = ''; }
    else { countEl.style.display = 'none'; }
  }
  const list = document.getElementById('recycle-bin-list');
  if (!list) return;
  if (!items.length) {
    list.innerHTML = '<div style="padding:10px 14px;font-size:11px;color:var(--text3)">Recycle bin is empty</div>';
    return;
  }
  list.innerHTML = items.map(entry => {
    const p = entry.patient;
    const deletedDate = new Date(entry.deletedAt).toLocaleDateString('en-IN');
    return `<div class="rb-row">
      <div class="rb-info">
        <div class="rb-name">${esc(p.name)}</div>
        <div class="rb-meta">${esc(p.id)} · Deleted ${deletedDate} · ${entry.visits.length} visit${entry.visits.length !== 1 ? 's' : ''}</div>
      </div>
      <div class="rb-actions">
        <button class="rb-restore-btn" onclick="restorePatient('${esc(p.id)}','${esc(p.name)}')">Restore</button>
        <button class="rb-perm-btn" onclick="permanentDelete('${esc(p.id)}','${esc(p.name)}')">Delete</button>
      </div>
    </div>`;
  }).join('');
}

async function restorePatient(id, name) {
  await DB.restorePatient(id);
  await initPatientPanel();
  await refreshRecycleBin();
  toast(name + ' restored');
}

async function permanentDelete(id, name) {
  if (!confirm('Permanently delete "' + name + '"?\n\nAll data will be lost forever. This cannot be undone.')) return;
  await DB.permanentDelete(id);
  await refreshRecycleBin();
  toast(name + ' permanently deleted');
}

function toggleRecycleBin() {
  const panel = document.getElementById('recycle-bin-panel');
  const chev = document.getElementById('recycle-bin-chevron');
  const open = panel.style.display !== 'none';
  panel.style.display = open ? 'none' : 'block';
  chev.style.transform = open ? '' : 'rotate(90deg)';
}

function isMobile() { return window.innerWidth <= 768; }

function switchMobilePanel(panelId, btn) {
  ['left-panel','center-panel','right-panel'].forEach(id => {
    document.getElementById(id).classList.remove('mob-active');
  });
  document.getElementById(panelId).classList.add('mob-active');
  document.querySelectorAll('.mob-nav-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}

function initMobilePanels() {
  if (!isMobile()) return;
  // Only set default panel on first load — don't reset on keyboard-triggered resize
  const hasActive = document.querySelector('.mob-active');
  if (!hasActive) {
    switchMobilePanel('left-panel', document.querySelector('.mob-nav-btn[data-panel="left-panel"]'));
  }
}

async function loadPatient(id) {
  const patient = await DB.getPatient(id);
  if (!patient) return;
  State.currentPatient = patient;
  State.isNewPatient = false;
  await startNewVisit(patient);
  // Auto-switch to consultation on mobile
  if (isMobile()) {
    switchMobilePanel('center-panel', document.querySelector('.mob-nav-btn[data-panel="center-panel"]'));
  }
  renderPatientList();
  updatePatientHeader();
  // Ensure body selector is always rendered (guard against stale DOM state)
  if (typeof renderBodySelector === 'function') {
    const wrap = document.getElementById('body-selector-wrap');
    if (wrap && !wrap.querySelector('.body-parts-grid')) renderBodySelector();
  }
}

function updatePatientHeader() {
  const p = State.currentPatient;
  if (!p) return;
  const age = p.age || calcAge(p.dob) || '?';
  const nameEl = document.getElementById('patient-header-name');
  nameEl.textContent = p.name || 'Unknown';
  nameEl.style.color = '';
  nameEl.style.fontWeight = '700';
  nameEl.style.fontSize = '17px';
  document.getElementById('patient-header-meta').textContent =
    `${p.id}  ·  ${age}y, ${p.gender || '—'}  ·  ${p.phone || ''}`;
  // Show consultation form, hide empty state
  document.getElementById('center-empty').style.display = 'none';
  document.getElementById('consultation-form').style.display = 'block';
  // Show edit button
  const editBtn = document.getElementById('btn-edit-patient');
  if (editBtn) editBtn.style.display = '';
}

async function startNewVisit(patient) {
  // Check if there's already a visit for today — reload it instead of starting fresh
  const allVisits = await DB.getPatientVisits(patient.id);
  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const todayVisit = allVisits.find(v => v.date >= todayStart.getTime());

  if (todayVisit) {
    State.currentVisit = todayVisit;
    State.medicines = (todayVisit.medicines || []).map(m => ({
      med: { id:m.id, brand:m.brand, content:m.content, type:m.type, form:m.form },
      dose: m.dose, timings: m.timings || '1-0-0',
      timingsNote: m.timingsNote || 'After Food',
      frequency: m.frequency || 'Once Daily',
      duration: m.duration || 'As Directed',
      qty: m.qty || '',
      details: m.details || '', notes: m.notes || ''
    }));
    renderConsultationForm();
    renderMedicineTable();
    // Fill all fields from saved visit
    const v = todayVisit;
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
    set('field-complaints', v.complaints); set('field-hopi', v.hopi);
    set('field-past-history', v.pastHistory); set('field-allergies', v.allergies);
    set('field-examination', v.examination); set('field-investigations', v.investigations);
    set('field-diagnosis', v.diagnosis); set('field-icd10', v.icd10);
    set('field-advice', v.advice); set('field-follow-up', v.followUp);
    set('field-referred-to', v.referredTo); set('field-procedure', v.procedure);
    set('field-notes', v.notes);
    // Pre-fill persistent fields from this visit
    const visits = allVisits;
    if (visits.length > 0) {
      const last = visits[0];
      if (!v.allergies)    set('field-allergies',    last.allergies);
      if (!v.pastHistory)  set('field-past-history', last.pastHistory);
    }
    return;
  }

  State.medicines = [];
  const visit = {
    id: uniqueId(),
    patientId: patient.id,
    date: Date.now(),
    complaints: '', hopi: '', pastHistory: '', allergies: '',
    examination: '', investigations: '',
    diagnosis: '', icd10: '', advice: '',
    followUp: '', referredTo: '', procedure: '', notes: '',
    medicines: [],
    saved: false
  };
  State.currentVisit = visit;
  renderConsultationForm();
  renderMedicineTable();

  // Pre-fill persistent fields from last visit (allVisits already fetched above)
  if (allVisits.length > 0) {
    const last = allVisits[0];
    document.getElementById('field-allergies').value    = last.allergies || '';
    document.getElementById('field-past-history').value = last.pastHistory || '';
    document.getElementById('field-diagnosis').value    = last.diagnosis || '';
    document.getElementById('field-icd10').value        = last.icd10 || '';
  }

  renderPreviousVisits(patient.id);
}

// ─── New Patient Modal ────────────────────────────────────────────────────────
let _phoneCheckTimer = null;
function checkExistingPatientByPhone(phone) {
  clearTimeout(_phoneCheckTimer);
  _phoneCheckTimer = setTimeout(() => _doPhoneCheck(phone), 400);
}

async function _doPhoneCheck(phone) {
  const alert = document.getElementById('np-existing-alert');
  if (!alert) return;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) { alert.style.display = 'none'; return; }

  const all = await DB.getAllPatients();
  const match = all.find(p => (p.phone || '').replace(/\D/g,'').endsWith(digits) ||
                               (p.whatsapp || '').replace(/\D/g,'').endsWith(digits));
  if (!match) { alert.style.display = 'none'; return; }

  alert.style.display = 'block';
  alert.innerHTML = `⚠️ <strong>${esc(match.name)}</strong> already registered (${esc(match.id)}) ·
    <a href="#" style="color:#b45309;font-weight:600;"
      onclick="event.preventDefault();closeNewPatientModal();loadPatientById('${esc(match.id)}')">
      Open as Follow-up →
    </a>`;
}

async function loadPatientById(id) {
  const p = await DB.getPatient(id);
  if (!p) { toast('Patient not found', 'error'); return; }
  loadPatient(id);
  if (typeof switchMobilePanel === 'function' && isMobile()) {
    switchMobilePanel('center-panel', document.querySelector('.mob-nav-btn[data-panel="center-panel"]'));
  }
  toast(`Opened ${p.name} — add today's visit`);
}

function openNewPatientModal() {
  // Start with gender unselected — clinician chooses
  document.querySelectorAll('.np-gender-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('np-gender').value = '';
  const modal = document.getElementById('modal-new-patient');
  modal.style.display = 'flex';
  modal.classList.add('open');
  setTimeout(() => document.getElementById('np-name').focus(), 50);
}

function closeNewPatientModal() {
  document.getElementById('modal-new-patient').classList.remove('open');
  document.getElementById('modal-new-patient').style.display = 'none';
  document.getElementById('form-new-patient').reset();
  // Reset to "new patient" mode
  const title = document.querySelector('#modal-new-patient .modal-title');
  if (title) title.textContent = '+ New Patient';
  const saveBtn = document.querySelector('#modal-new-patient .btn-primary');
  if (saveBtn) { saveBtn.textContent = 'Register Patient'; saveBtn.onclick = saveNewPatient; }
}

function npSetGender(val) {
  document.querySelectorAll('.np-gender-btn').forEach(b => b.classList.toggle('active', b.dataset.val === val));
  document.getElementById('np-gender').value = val;
}

function calcBMI() {
  const h = parseFloat(document.getElementById('np-height')?.value);
  const w = parseFloat(document.getElementById('np-weight')?.value);
  const el = document.getElementById('np-bmi');
  if (!el) return;
  if (h > 0 && w > 0) {
    const bmi = (w / ((h / 100) ** 2)).toFixed(1);
    const cat = bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese';
    el.value = `${bmi} (${cat})`;
  } else {
    el.value = '';
  }
}

function gatherPatientFormData() {
  return {
    name:       document.getElementById('np-name').value.trim(),
    phone:      document.getElementById('np-phone').value.trim(),
    gender:     document.getElementById('np-gender').value,
    dob:        document.getElementById('np-dob').value,
    age:        document.getElementById('np-age').value,
    city:       document.getElementById('np-city').value.trim(),
    address:    document.getElementById('np-address').value.trim(),
    whatsapp:   document.getElementById('np-whatsapp')?.value.trim() || '',
    email:      document.getElementById('np-email')?.value.trim() || '',
    height:     document.getElementById('np-height')?.value || '',
    weight:     document.getElementById('np-weight')?.value || '',
    bmi:        document.getElementById('np-bmi')?.value || '',
    occupation: document.getElementById('np-occupation')?.value.trim() || '',
    sport:      document.getElementById('np-sport')?.value.trim() || '',
    dominant:   document.getElementById('np-dominant')?.value || '',
    blood:      document.getElementById('np-blood')?.value || '',
    insurance:  document.getElementById('np-insurance')?.value.trim() || '',
    referral:   document.getElementById('np-referral')?.value.trim() || '',
  };
}

function fillPatientForm(p) {
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  set('np-name', p.name); set('np-phone', p.phone);
  set('np-dob', p.dob); set('np-age', p.age);
  set('np-city', p.city); set('np-address', p.address);
  set('np-whatsapp', p.whatsapp); set('np-email', p.email);
  set('np-height', p.height); set('np-weight', p.weight);
  set('np-occupation', p.occupation); set('np-sport', p.sport);
  set('np-dominant', p.dominant); set('np-blood', p.blood);
  set('np-insurance', p.insurance); set('np-referral', p.referral);
  npSetGender(p.gender || 'Male');
  calcBMI();
}

async function saveNewPatient() {
  const data = gatherPatientFormData();
  if (!data.name) { toast('Patient name is required', 'error'); return; }
  if (!data.phone || data.phone.replace(/\D/g,'').length < 6) { toast('Valid phone number is required', 'error'); return; }
  const id = await DB.generatePatientId(data.phone);
  const patient = { id, ...data, age: data.age || calcAge(data.dob), createdAt: Date.now(), lastVisit: Date.now() };
  await DB.savePatient(patient);
  State.recentPatients.unshift(patient);
  closeNewPatientModal();
  await loadPatient(id);
  toast(`Patient ${data.name} registered as ${id}`);
}

function openEditPatientModal() {
  const p = State.currentPatient;
  if (!p) return;
  fillPatientForm(p);
  const title = document.querySelector('#modal-new-patient .modal-title');
  if (title) title.textContent = '✏️ Edit Patient';
  const saveBtn = document.querySelector('#modal-new-patient .btn-primary');
  if (saveBtn) { saveBtn.textContent = 'Update Patient'; saveBtn.onclick = updatePatient; }
  document.getElementById('modal-new-patient').style.display = 'flex';
}

async function updatePatient() {
  const p = State.currentPatient;
  if (!p) return;
  const data = gatherPatientFormData();
  Object.assign(p, data, { age: data.age || calcAge(data.dob) });
  await DB.savePatient(p);
  closeNewPatientModal();
  updatePatientHeader();
  await initPatientPanel();
  toast('Patient details updated');
}

// ─── Consultation Form ────────────────────────────────────────────────────────
function renderConsultationForm() {
  const v = State.currentVisit;
  if (!v) return;
  const fieldMap = {
    complaints: 'field-complaints', hopi: 'field-hopi',
    pastHistory: 'field-past-history', allergies: 'field-allergies',
    examination: 'field-examination', investigations: 'field-investigations',
    diagnosis: 'field-diagnosis', icd10: 'field-icd10',
    advice: 'field-advice', followUp: 'field-follow-up',
    referredTo: 'field-referred-to', procedure: 'field-procedure',
    notes: 'field-notes'
  };
  Object.entries(fieldMap).forEach(([key, elId]) => {
    const el = document.getElementById(elId);
    if (el) el.value = v[key] || '';
  });
}

function updateVisitField(field, value) {
  if (State.currentVisit) {
    State.currentVisit[field] = value;
    scheduleAutoSave();
  }
}

let _autoSaveTimer = null;
function scheduleAutoSave() {
  clearTimeout(_autoSaveTimer);
  _autoSaveTimer = setTimeout(async () => {
    if (!State.currentPatient || !State.currentVisit) return;
    // Collect current field values
    const fields = ['complaints','hopi','past-history','allergies','examination',
      'investigations','diagnosis','icd10','advice','follow-up','referred-to','procedure','notes'];
    fields.forEach(f => {
      const el = document.getElementById('field-' + f);
      if (el) {
        const key = f.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        State.currentVisit[key === 'followUp' ? 'followUp' : key] = el.value;
      }
    });
    State.currentVisit.medicines = State.medicines.map(m => ({
      id: m.med.id, brand: m.med.brand, content: m.med.content,
      type: m.med.type, form: m.med.form,
      dose: m.dose, timings: m.timings, timingsNote: m.timingsNote,
      frequency: m.frequency, duration: m.duration, qty: m.qty,
      details: m.details || '', notes: m.notes || ''
    }));
    await DB.saveVisit(State.currentVisit);
  }, 1500);
}

// ─── Medicine Table ───────────────────────────────────────────────────────────
const DOSAGE_OPTS = ['1-0-0','0-1-0','0-0-1','1-1-0','1-0-1','0-1-1','1-1-1','1-1-1-1','SOS','As Directed'];
const ADMIN_OPTS  = ['After Food','Before Food','Empty Stomach','With Food','At Bedtime','With Milk','As Directed'];
const FREQ_OPTS   = ['Once Daily','Twice Daily','Thrice Daily','Four Times Daily','Weekly','Alternate Days','SOS','As Directed'];
const DUR_OPTS    = ['1 Day','2 Days','3 Days','5 Days','7 Days','10 Days','14 Days','1 Month','2 Months','3 Months','6 Months','As Directed'];
const TYPE_OPTS   = ['TAB','CAP','SYP','INJ','GEL','SPRAY','DROPS','PWD','CREAM','OINT'];

function rxSel(opts, val, idx, field) {
  const hasVal = opts.includes(val);
  return `<select class="rx-sel" onchange="updateMed(${idx},'${field}',this.value)">
    ${!hasVal && val ? `<option value="${val}" selected>${val}</option>` : ''}
    ${opts.map(o => `<option value="${o}"${o===val?' selected':''}>${o}</option>`).join('')}
  </select>`;
}

function renderMedicineTable() {
  const tbody = document.getElementById('rx-table-body');

  const rows = State.medicines.map((item, idx) => {
    const m = item.med;
    return `
      <tr class="rx-row">
        <td class="rx-num">${idx + 1}</td>
        <td>${rxSel(TYPE_OPTS, m.type, idx, 'type')}</td>
        <td class="rx-med-cell">
          <input class="rx-med-name" value="${esc(m.brand)}" onchange="updateMedName(${idx},'brand',this.value)" title="Edit medicine name">
          <input class="rx-med-comp" value="${esc(m.content||'')}" onchange="updateMedName(${idx},'content',this.value)" placeholder="Composition" title="Edit composition">
          <button class="rx-remove-btn" onclick="removeMed(${idx})" title="Remove this medicine">✕ Remove</button>
        </td>
        <td>${rxSel(DOSAGE_OPTS, item.timings, idx, 'timings')}</td>
        <td>${rxSel(ADMIN_OPTS,  item.timingsNote||'After Food', idx, 'timingsNote')}</td>
        <td>${rxSel(FREQ_OPTS,   item.frequency||'Once Daily',   idx, 'frequency')}</td>
        <td>${rxSel(DUR_OPTS,    item.duration,  idx, 'duration')}</td>
        <td><input class="rx-input rx-qty" value="${esc(item.qty||'')}" onchange="updateMed(${idx},'qty',this.value)" placeholder="Qty"></td>
        <td><input class="rx-input rx-details" value="${esc(item.details||'')}" onchange="updateMed(${idx},'details',this.value)" placeholder="Details…"></td>
        <td><input class="rx-input rx-notes" value="${esc(item.notes||'')}" onchange="updateMed(${idx},'notes',this.value)" placeholder="Notes…"></td>
        <td><button class="btn-icon btn-del" onclick="removeMed(${idx})" title="Remove">✕</button></td>
      </tr>
    `;
  }).join('');

  // Inline add-medicine row always at bottom
  const addRow = `
    <tr class="rx-add-row" id="rx-add-row">
      <td class="rx-num" style="color:var(--text3)">${State.medicines.length + 1}</td>
      <td colspan="9" style="position:relative;">
        <input id="rx-inline-search" class="rx-inline-search" type="text"
          placeholder="Search and add medicine…"
          autocomplete="off" spellcheck="false"
          oninput="rxInlineSearch(this.value)"
          onfocus="rxInlineSearch(this.value)">
      </td>
      <td></td>
    </tr>`;

  tbody.innerHTML = rows + addRow;
}

function updateMedName(idx, field, value) {
  if (!State.medicines[idx]) return;
  State.medicines[idx].med[field] = value;
}

function updateMed(idx, field, value) {
  if (!State.medicines[idx]) return;
  if (field === 'type') State.medicines[idx].med.type = value;
  else State.medicines[idx][field] = value;
  scheduleAutoSave();
}

function removeMed(idx) {
  State.medicines.splice(idx, 1);
  renderMedicineTable();
  refreshAlphaList();
  scheduleAutoSave();
}

function editNotes(idx) {
  const current = State.medicines[idx]?.notes || '';
  const note = prompt('Medicine notes / instructions:', current);
  if (note !== null) {
    State.medicines[idx].notes = note;
    renderMedicineTable();
  }
}

function addMedicine(med) {
  if (State.medicines.findIndex(m => String(m.med.id) === String(med.id)) >= 0) {
    toast(`${med.brand} already added`, 'warning');
    return;
  }
  State.medicines.push({
    med,
    dose: med.dose,
    timings: med.timings,
    timingsNote: med.timingsNote || 'After Food',
    frequency: 'Once Daily',
    duration: med.duration,
    qty: med.qty || ''
  });
  renderMedicineTable();
  refreshAlphaList();
  scheduleAutoSave();
  // Keep right-panel dropdown open
  const ms = document.getElementById('med-search');
  if (ms) { ms.value = ''; handleMedSearch(''); }
  // Refocus inline search row
  setTimeout(() => {
    const el = document.getElementById('rx-inline-search');
    if (el) { el.value = ''; el.focus(); }
  }, 50);
  toast(`✓ Added ${med.brand}`);
}

// ─── Inline Rx Search ─────────────────────────────────────────────────────────
// Dropdown is portalled to body (position:fixed) to escape .rx-section overflow:hidden clipping
function _getRxDropdown() {
  let el = document.getElementById('rx-inline-results');
  if (!el) {
    el = document.createElement('div');
    el.id = 'rx-inline-results';
    el.className = 'rx-inline-results';
    el.style.display = 'none';
    document.body.appendChild(el);
  }
  return el;
}

function rxInlineSearch(query) {
  const input = document.getElementById('rx-inline-search');
  const resultsEl = _getRxDropdown();

  const allMeds = MEDICINE_DB;
  const results = query.trim()
    ? allMeds.filter(m => {
        const q = query.toLowerCase();
        return m.brand.toLowerCase().includes(q) || (m.content||'').toLowerCase().includes(q) ||
               (m.indications||[]).join(' ').toLowerCase().includes(q);
      }).slice(0, 30)
    : allMeds.slice(0, 30);
  if (!results.length) { resultsEl.style.display = 'none'; return; }

  // Position dropdown — flip above if not enough space below (handles mobile keyboard)
  if (input) {
    const r = input.getBoundingClientRect();
    const dropH = Math.min(240, results.length * 52);
    const spaceBelow = window.innerHeight - r.bottom;
    const minW = Math.max(r.width, 260);
    resultsEl.style.width = minW + 'px';
    resultsEl.style.left  = Math.min(r.left, window.innerWidth - minW - 8) + 'px';
    if (spaceBelow < dropH + 8 && r.top > dropH) {
      resultsEl.style.top    = (r.top - dropH - 2) + 'px';
    } else {
      resultsEl.style.top    = (r.bottom + 2) + 'px';
    }
  }

  resultsEl.style.display = 'block';
  resultsEl.innerHTML = results.map(med => {
    const already = State.medicines.some(m => String(m.med.id) === String(med.id));
    return `<div class="rx-inline-opt${already ? ' rx-inline-added' : ''}" onclick="${already ? '' : `rxInlinePick('${String(med.id).replace(/'/g, "\\'")}')`}">
      <span class="rx-inline-type" style="${typeBadgeStyle(med.type)}">${med.type}</span>
      <span class="rx-inline-brand">${esc(med.brand)}</span>
      <span class="rx-inline-content">${esc(med.content)}</span>
      ${already ? '<span class="rx-inline-tick">✓</span>' : ''}
    </div>`;
  }).join('');
}

function rxInlinePick(medId) {
  // IDs may be numeric (seed) or string (custom) — compare as strings
  const med = MEDICINE_DB.find(m => String(m.id) === String(medId));
  if (!med) return;
  _getRxDropdown().style.display = 'none';
  addMedicine(med);
}

// Close inline results when clicking outside
document.addEventListener('click', e => {
  const results = _getRxDropdown();
  if (results.style.display !== 'none' && !results.contains(e.target) && e.target.id !== 'rx-inline-search') {
    results.style.display = 'none';
  }
});

// ─── Add / Delete Medicine ────────────────────────────────────────────────────
// Permanently delete a medicine from the master list.
function deleteMed(id) {
  const target = MEDICINE_DB.find(m => String(m.id) === String(id));
  const brand = target ? target.brand : 'this medicine';
  if (!confirm(`Delete "${brand}" from the medicines list?\n\nThis is permanent.`)) return;
  const before = MEDICINE_DB.length;
  MEDICINE_DB = MEDICINE_DB.filter(m => String(m.id) !== String(id));
  saveMedList();
  renderMedBrowserList();
  if (MEDICINE_DB.length < before) toast(`${brand} deleted`);
}

function openAddMedModal() {
  document.getElementById('modal-add-med').style.display = 'flex';
  switchAddTab('manual');
  setTimeout(() => document.getElementById('nm-brand').focus(), 50);
}

function closeAddMedModal() {
  document.getElementById('modal-add-med').style.display = 'none';
  ['nm-brand','nm-content'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  const paste = document.getElementById('am-paste-text'); if (paste) paste.value = '';
  const status = document.getElementById('am-paste-status'); if (status) status.textContent = '';
  const preview = document.getElementById('am-paste-preview'); if (preview) preview.style.display = 'none';
}

function switchAddTab(which) {
  document.getElementById('am-tab-manual').classList.toggle('active', which === 'manual');
  document.getElementById('am-tab-paste').classList.toggle('active', which === 'paste');
  document.getElementById('am-pane-manual').style.display = which === 'manual' ? 'flex' : 'none';
  document.getElementById('am-pane-paste').style.display  = which === 'paste'  ? 'block' : 'none';
}

// Decide: single link → analyze; otherwise treat as a pasted list
function smartAddFromPaste() {
  const raw = (document.getElementById('am-paste-text').value || '').trim();
  if (!raw) { toast('Paste a link or a list first', 'error'); return; }
  const lines = raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const isSingleLink = lines.length === 1 && /^https?:\/\//i.test(lines[0]);
  if (isSingleLink) importFromLink(lines[0]);
  else importMedList(raw);
}

function saveNewMed() {
  const brand = document.getElementById('nm-brand').value.trim();
  if (!brand) { toast('Brand name is required', 'error'); return; }
  const newMed = {
    id: 'cm_' + Date.now(),
    brand,
    content: document.getElementById('nm-content').value.trim(),
    type: document.getElementById('nm-type').value,
    form: document.getElementById('nm-type').value,
    timings: document.getElementById('nm-dosage').value,
    timingsNote: document.getElementById('nm-admin').value,
    frequency: document.getElementById('nm-freq').value,
    duration: document.getElementById('nm-dur').value,
    dose: document.getElementById('nm-dosage').value,
    qty: '',
    indications: []
  };
  MEDICINE_DB.push(newMed);
  saveMedList();
  closeAddMedModal();
  refreshAlphaList();
  toast('✓ ' + brand + ' added to medicine list');
}

// ─── Import Medicines (paste list or link) ────────────────────────────────────
// Guess medicine type/form from free text
function guessMedType(text) {
  const t = (text || '').toLowerCase();
  if (/\b(inj|injection|syringe|vial|ampoule|pfs|pre-?filled)\b/.test(t)) return 'INJ';
  if (/\b(cap|capsule|caps)\b/.test(t))                                    return 'CAP';
  if (/\b(syrup|syp|suspension|solution|oral liquid|elixir)\b/.test(t))    return 'SYP';
  if (/\b(drops?)\b/.test(t))                                              return 'DROPS';
  if (/\b(gel)\b/.test(t))                                                 return 'GEL';
  if (/\b(cream|ointment|oint)\b/.test(t))                                 return 'CREAM';
  if (/\b(spray)\b/.test(t))                                               return 'SPRAY';
  if (/\b(powder|sachet|pwd|granules)\b/.test(t))                          return 'PWD';
  if (/\b(kit)\b/.test(t))                                                 return 'KIT';
  return 'TAB';
}

// Parse one pasted line → {brand, content, type} (or null if blank)
function parseMedLine(line) {
  let s = (line || '').trim();
  if (!s) return null;
  s = s.replace(/^\s*(\d+[).]|[-*•·])\s+/, '');           // strip bullets / numbering
  const type = guessMedType(s);
  let brand = s, content = '';
  // Split on the FIRST separator that has a space after it (avoids hyphens inside names)
  const m = s.match(/^(.*?)\s*(?:[-–—]|::?|\||\t)\s+(.*)$/);
  if (m) { brand = m[1].trim(); content = m[2].trim(); }
  // Clean a trailing form-word from the brand if it's the only thing after strength
  return { brand: brand.trim(), content: content.trim(), type };
}

function importMedList(text) {
  const raw = text != null ? text : document.getElementById('am-paste-text').value;
  const lines = raw.split(/\r?\n/);
  const parsed = lines.map(parseMedLine).filter(Boolean);
  if (!parsed.length) { toast('Nothing to import — paste some medicines first', 'error'); return; }

  let added = 0, skipped = 0;
  parsed.forEach((p, i) => {
    if (!p.brand) return;
    const dup = MEDICINE_DB.some(m => m.brand.toLowerCase() === p.brand.toLowerCase()
      && (m.content || '').toLowerCase() === p.content.toLowerCase());
    if (dup) { skipped++; return; }
    MEDICINE_DB.push({
      id: 'cm_' + Date.now() + '_' + i,
      brand: p.brand, content: p.content, type: p.type, form: p.type,
      timings: '1-0-0', timingsNote: 'After Food', frequency: 'Once Daily',
      duration: '5 Days', dose: '1', qty: '', indications: []
    });
    added++;
  });
  saveMedList();
  closeAddMedModal();
  refreshAlphaList();
  toast(`✓ Imported ${added} medicine${added !== 1 ? 's' : ''}${skipped ? ` · ${skipped} duplicate${skipped !== 1 ? 's' : ''} skipped` : ''}`, 'success', 3500);
}

// Best-effort read of a pharmacy product page via a public CORS proxy
async function fetchViaProxy(url) {
  const proxies = [
    u => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    u => `https://corsproxy.io/?url=${encodeURIComponent(u)}`
  ];
  for (const build of proxies) {
    try {
      const res = await fetch(build(url), { signal: AbortSignal.timeout(9000) });
      if (res.ok) {
        const txt = await res.text();
        if (txt && txt.length > 200) return txt;
      }
    } catch (e) { /* try next proxy */ }
  }
  throw new Error('fetch failed');
}

function brandFromSlug(url) {
  try {
    const path = new URL(url).pathname.split('/').filter(Boolean).pop() || '';
    return decodeURIComponent(path)
      .replace(/\.(html?|php)$/i, '')
      .replace(/[-_]+/g, ' ')
      .replace(/\b\d{4,}\b/g, '')                    // drop long id numbers
      .replace(/\b(tablet|capsule|injection|syrup|cream|gel|price|buy|online|mg|ml)\b/gi, '')
      .replace(/\s{2,}/g, ' ').trim()
      .replace(/\b\w/g, c => c.toUpperCase());
  } catch (e) { return ''; }
}

function cleanTitle(title) {
  return (title || '')
    .split(/[|\-–—:]/)[0]                              // take text before first separator
    .replace(/\b(buy|online|price|uses|side effects|composition|substitute)\b/gi, '')
    .replace(/\s{2,}/g, ' ').trim();
}

async function importFromLink(linkUrl) {
  const url = (linkUrl || '').trim();
  const statusEl = document.getElementById('am-paste-status');
  const previewEl = document.getElementById('am-paste-preview');
  if (!url || !/^https?:\/\//i.test(url)) { statusEl.textContent = 'Please paste a full link starting with http…'; return; }

  // No internet → can't read the page. Ask user to enter details manually.
  if (!navigator.onLine) {
    statusEl.textContent = '⚠ No internet connection — please enter the details manually below.';
    document.getElementById('am-pv-brand').value = brandFromSlug(url);
    document.getElementById('am-pv-content').value = '';
    document.getElementById('am-pv-type').value = guessMedType(url);
    previewEl.style.display = 'block';
    document.getElementById('am-pv-brand').focus();
    return;
  }

  statusEl.textContent = 'Reading link…';
  previewEl.style.display = 'none';
  let brand = '', content = '';

  try {
    const html = await fetchViaProxy(url);
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const ogt = doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';
    const title = doc.querySelector('title')?.textContent || '';
    const desc = doc.querySelector('meta[name="description"]')?.getAttribute('content')
      || doc.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
    brand = cleanTitle(ogt || title);
    // Composition: look for "salt" info in description / structured data
    const saltMatch = desc.match(/(?:composition|contains|salt[s]?)[:\-\s]+([^.]{4,120})/i);
    content = saltMatch ? saltMatch[1].trim() : (desc.length < 140 ? desc.trim() : '');
    statusEl.textContent = brand ? 'Found — please review and edit if needed:' : 'Could not read the page — filling from link:';
  } catch (e) {
    statusEl.textContent = 'Could not read the page (site blocked it). Please check/complete the details:';
  }

  if (!brand) brand = brandFromSlug(url);
  document.getElementById('am-pv-brand').value = brand;
  document.getElementById('am-pv-content').value = content;
  document.getElementById('am-pv-type').value = guessMedType(brand + ' ' + content + ' ' + url);
  previewEl.style.display = 'block';
}

function addImportedFromLink() {
  const brand = document.getElementById('am-pv-brand').value.trim();
  if (!brand) { toast('Brand name is required', 'error'); return; }
  MEDICINE_DB.push({
    id: 'cm_' + Date.now(),
    brand,
    content: document.getElementById('am-pv-content').value.trim(),
    type: document.getElementById('am-pv-type').value,
    form: document.getElementById('am-pv-type').value,
    timings: '1-0-0', timingsNote: 'After Food', frequency: 'Once Daily',
    duration: '5 Days', dose: '1', qty: '', indications: []
  });
  saveMedList();
  closeAddMedModal();
  refreshAlphaList();
  toast('✓ ' + brand + ' added to medicine list');
}

// ─── Medicine Browser (flat alphabetical list) ────────────────────────────────
function initMedAlphaBrowser() {
  migrateLegacyMedStores();
  renderMedBrowserList();
  bindMedRowLongPress();
}

// Reveal a row's delete ✕ only after a long/hard press — prevents accidental deletes.
function bindMedRowLongPress() {
  const list = document.getElementById('med-alpha-list');
  if (!list || list._delBound) return;
  list._delBound = true;

  let timer = null, sx = 0, sy = 0, suppressClick = false;
  const clearTimer = () => { if (timer) { clearTimeout(timer); timer = null; } };
  const disarm = () => list.querySelectorAll('.med-alpha-row.del-armed')
    .forEach(r => r.classList.remove('del-armed'));

  // Swallow the click that fires when releasing a long-press (so it doesn't
  // also add the medicine to the prescription).
  list.addEventListener('click', e => {
    if (suppressClick && !e.target.closest('.med-del-btn')) {
      e.preventDefault(); e.stopPropagation(); suppressClick = false;
    }
  }, true);

  list.addEventListener('pointerdown', e => {
    suppressClick = false;
    if (e.target.closest('.med-del-btn')) return;          // pressing the ✕ itself
    const row = e.target.closest('.med-alpha-row');
    if (!row) return;
    sx = e.clientX; sy = e.clientY;
    clearTimer();
    timer = setTimeout(() => {
      disarm();
      row.classList.add('del-armed');
      suppressClick = true;
      if (navigator.vibrate) navigator.vibrate(30);
    }, 550);
  });
  list.addEventListener('pointermove', e => {
    if (timer && (Math.abs(e.clientX - sx) > 10 || Math.abs(e.clientY - sy) > 10)) clearTimer();
  }, { passive: true });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev =>
    list.addEventListener(ev, clearTimer, { passive: true }));
  list.addEventListener('scroll', clearTimer, { passive: true });

  // Right-click also arms it (handy on desktop)
  list.addEventListener('contextmenu', e => {
    const row = e.target.closest('.med-alpha-row');
    if (row) { e.preventDefault(); disarm(); row.classList.add('del-armed'); }
  });

  // Tapping/clicking anywhere else disarms
  document.addEventListener('pointerdown', e => {
    if (!e.target.closest('.med-alpha-row.del-armed') && !e.target.closest('.med-del-btn')) disarm();
  });
}

function refreshAlphaList() {
  const q = document.getElementById('med-search')?.value || '';
  renderMedBrowserList(q);
}

function renderMedBrowserList(query) {
  const list = document.getElementById('med-alpha-list');
  if (!list) return;
  const added = new Set(State.medicines.map(m => String(m.med.id)));
  const q = (query || '').toLowerCase();

  const matchesMed = (brand, content) =>
    !q || (brand || '').toLowerCase().includes(q) || (content || '').toLowerCase().includes(q);

  const hl = str => {
    const safe = esc(str || '');
    if (!q) return safe;
    const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return safe.replace(re, '<mark>$1</mark>');
  };

  const rows = MEDICINE_DB
    .filter(m => matchesMed(m.brand, m.content))
    .sort((a, b) => (a.brand || '').localeCompare(b.brand || ''))
    .map(m => {
      const isAdded = added.has(String(m.id));
      const idx = MEDICINE_DB.indexOf(m);
      return `<div class="med-alpha-row ${isAdded ? 'med-alpha-added' : ''}">
        <span class="med-alpha-badge" style="${typeBadgeStyle(m.type)}">${m.type}</span>
        <div class="med-alpha-info" onclick="${isAdded ? '' : `addMedicine(MEDICINE_DB[${idx}])`}" style="cursor:${isAdded?'default':'pointer'};flex:1">
          <div class="med-alpha-brand">${hl(m.brand)}</div>
          <div class="med-alpha-content">${hl(m.content)}</div>
        </div>
        ${isAdded ? '<span class="med-alpha-tick">✓</span>' : ''}
        <button class="med-del-btn" title="Delete from list" onclick="event.stopPropagation();deleteMed('${m.id}')">✕</button>
      </div>`;
    }).join('');

  if (!rows) {
    list.innerHTML = q
      ? `<div style="padding:12px;font-size:12px;color:var(--text3)">No medicines found for "${esc(q)}"</div>`
      : `<div style="padding:16px;font-size:12.5px;color:var(--text3);text-align:center">
          No medicines yet.<br>Use <b>＋ Add Medicine</b> to build your list.</div>`;
    return;
  }
  list.innerHTML = rows;
}

// ─── Medicine Search / Dropdown ────────────────────────────────────────────────
function handleMedSearch(query) {
  clearTimeout(State.medSearchTimeout);
  State.medSearchTimeout = setTimeout(() => renderMedBrowserList(query.trim()), query ? 80 : 0);
}

function medResultKey(event, dbIdx) {
  if (event.key === 'Enter' || event.key === ' ') {
    const med = MEDICINE_DB[dbIdx];
    if (med) addMedicine(med);
    event.preventDefault();
  }
}

// ─── Template State ────────────────────────────────────────────────────────────
const TmplState = {
  allTemplates: [],   // merged built-in + custom, ordered
  editingId: null,    // null = new, string = editing existing custom
  meds: [],           // medicines being built in the modal
  searchTimeout: null
};

// ─── Load & Render Templates ──────────────────────────────────────────────────
async function loadAndRenderTemplates() {
  // Built-ins always available from templates.js
  const builtIn = Object.entries(CONDITION_TEMPLATES).map(([key, t], i) => ({
    id: key, label: t.label, icon: t.icon,
    isBuiltIn: true, order: i,
    ...t
  }));
  // Custom from IndexedDB (may fail if DB blocked)
  let custom = [];
  try { custom = await DB.getAllTemplates(); } catch(e) { console.warn('Could not load custom templates', e); }
  TmplState.allTemplates = [...builtIn, ...custom];
  renderTemplateChips();
}

function renderTemplateChips() {
  const container = document.getElementById('templates-chips');
  if (!TmplState.allTemplates.length) {
    container.innerHTML = '<div style="padding:10px 12px;font-size:12px;color:var(--text3)">No templates yet. Click + New to add one.</div>';
    return;
  }
  container.innerHTML = TmplState.allTemplates.map(t => {
    const medCount = (t.medicines || []).length;
    return `<div class="tmpl-list-row" onclick="applyTemplateById('${t.id}')">
        <div style="flex:1;min-width:0">
          <div class="tmpl-list-name">${t.label}</div>
          ${medCount ? `<div class="tmpl-list-diag">${medCount} medicine${medCount>1?'s':''}</div>` : ''}
        </div>
        <div style="display:flex;gap:4px;flex-shrink:0;">
          <button class="tmpl-edit-btn" onclick="event.stopPropagation();openTemplateModal('${t.id}')">Edit</button>
          <button class="tmpl-del-btn" onclick="event.stopPropagation();deleteTemplate('${t.id}','${t.label.replace(/'/g,"\\'")}')" title="Delete">✕</button>
        </div>
      </div>`;
  }).join('');
}

async function deleteTemplate(id, label) {
  if (!confirm('Delete template "' + label + '"?')) return;
  // Built-in templates are in-memory only; custom ones are in DB
  TmplState.allTemplates = TmplState.allTemplates.filter(t => t.id !== id);
  try { await DB.deleteTemplate(id); } catch(e) {}
  renderTemplateChips();
  toast(label + ' deleted');
}

// ─── Apply Template ───────────────────────────────────────────────────────────
function applyTemplateById(id) {
  const tmpl = TmplState.allTemplates.find(t => t.id === id);
  if (!tmpl) return;

  if (State.medicines.length > 0 &&
      !confirm(`Replace ${State.medicines.length} medicine(s) with "${tmpl.label}" template?`)) return;

  const adviceText = Array.isArray(tmpl.advice) ? tmpl.advice.join('\n') : (tmpl.advice || '');

  const setField = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  setField('field-complaints',   tmpl.complaints || '');
  setField('field-examination',  tmpl.examination || '');
  setField('field-diagnosis',    tmpl.diagnosis || '');
  setField('field-icd10',        tmpl.icd10 || '');
  setField('field-advice',       adviceText);
  setField('field-follow-up',    tmpl.followUp || '');

  if (State.currentVisit) {
    Object.assign(State.currentVisit, {
      complaints: tmpl.complaints || '',
      examination: tmpl.examination || '',
      diagnosis: tmpl.diagnosis || '',
      icd10: tmpl.icd10 || '',
      advice: adviceText,
      followUp: tmpl.followUp || ''
    });
  }

  State.medicines = [];
  (tmpl.medicines || []).forEach(item => {
    const med = MEDICINE_DB.find(m => m.id === item.id);
    if (med) {
      State.medicines.push({
        med,
        dose: item.dose || med.dose,
        timings: item.timings || med.timings,
        timingsNote: item.timingsNote || med.timingsNote,
        duration: item.duration || med.duration,
        qty: item.qty || med.qty || ''
      });
    }
  });

  renderMedicineTable();
  toast(`Template applied: ${tmpl.label}`);
}

// keep old name working (used by built-in code paths if any)
function applyTemplate(key) { applyTemplateById(key); }

// ─── Template Modal ───────────────────────────────────────────────────────────
function openTemplateModal(id) {
  TmplState.editingId = id;
  TmplState.meds = [];

  const modal = document.getElementById('modal-template');
  const deleteBtn = document.getElementById('tmpl-delete-btn');
  const titleEl = document.getElementById('tmpl-modal-title');
  const clearField = (fid, val='') => { const el = document.getElementById(fid); if (el) el.value = val; };

  if (!id) {
    // New template
    titleEl.textContent = 'New Template';
    deleteBtn.style.display = 'none';
    clearField('tmpl-name'); clearField('tmpl-icon','📋');
    clearField('tmpl-diagnosis'); clearField('tmpl-icd10');
    clearField('tmpl-complaints'); clearField('tmpl-examination');
    clearField('tmpl-advice'); clearField('tmpl-followup');
  } else {
    const tmpl = TmplState.allTemplates.find(t => t.id === id);
    if (!tmpl) return;
    titleEl.textContent = tmpl.isBuiltIn ? `Edit Built-in: ${tmpl.label}` : `Edit: ${tmpl.label}`;
    deleteBtn.style.display = tmpl.isBuiltIn ? 'none' : 'inline-flex';

    document.getElementById('tmpl-name').value = tmpl.label || '';
    document.getElementById('tmpl-icon').value = tmpl.icon || '📋';
    document.getElementById('tmpl-diagnosis').value = tmpl.diagnosis || '';
    document.getElementById('tmpl-icd10').value = tmpl.icd10 || '';
    document.getElementById('tmpl-complaints').value = tmpl.complaints || '';
    document.getElementById('tmpl-examination').value = tmpl.examination || '';
    document.getElementById('tmpl-advice').value = Array.isArray(tmpl.advice)
      ? tmpl.advice.join('\n') : (tmpl.advice || '');
    document.getElementById('tmpl-followup').value = tmpl.followUp || '';

    // Clone medicines
    TmplState.meds = (tmpl.medicines || []).map(m => ({ ...m }));
  }

  renderTmplMedList();
  document.getElementById('tmpl-med-search').value = '';
  document.getElementById('tmpl-med-results').style.display = 'none';
  modal.classList.add('open');
  setTimeout(() => document.getElementById('tmpl-name').focus(), 100);
}

function closeTemplateModal() {
  document.getElementById('modal-template').classList.remove('open');
  document.getElementById('tmpl-med-results').style.display = 'none';
}

async function saveTemplate() {
  const name = document.getElementById('tmpl-name').value.trim();
  if (!name) { toast('Template name is required', 'error'); return; }

  const adviceRaw = document.getElementById('tmpl-advice').value;
  const adviceArr = adviceRaw.split('\n').map(s => s.trim()).filter(Boolean);
  const icon = document.getElementById('tmpl-icon').value.trim() || '📋';

  const isEditing = TmplState.editingId;
  const existingBuiltIn = isEditing
    ? TmplState.allTemplates.find(t => t.id === isEditing && t.isBuiltIn)
    : null;

  // For built-ins: save as a NEW custom template with a copy of the edited data
  // (we never overwrite the built-in JS object)
  const newId = existingBuiltIn
    ? (TmplState.editingId + '_custom_' + Date.now())
    : (isEditing || ('custom_' + Date.now()));

  const tmpl = {
    id: newId,
    label: name,
    icon,
    diagnosis: document.getElementById('tmpl-diagnosis').value.trim(),
    icd10: document.getElementById('tmpl-icd10').value.trim(),
    complaints: document.getElementById('tmpl-complaints').value.trim(),
    examination: document.getElementById('tmpl-examination').value.trim(),
    advice: adviceArr,
    followUp: document.getElementById('tmpl-followup').value.trim(),
    medicines: TmplState.meds,
    isBuiltIn: false,
    order: Date.now()
  };

  await DB.saveTemplate(tmpl);
  closeTemplateModal();
  await loadAndRenderTemplates();
  toast(`Template "${name}" saved`);
}

async function deleteCurrentTemplate() {
  const id = TmplState.editingId;
  if (!id) return;
  const tmpl = TmplState.allTemplates.find(t => t.id === id);
  if (!tmpl || tmpl.isBuiltIn) return;
  if (!confirm(`Delete template "${tmpl.label}"?`)) return;
  await DB.deleteTemplate(id);
  closeTemplateModal();
  await loadAndRenderTemplates();
  toast(`Template deleted`);
}

// ─── Invoice ──────────────────────────────────────────────────────────────────
const DEFAULT_SERVICES = [
  { id: 's1', name: 'Consultation – Dr Chetan M Dojode', price: 700 },
  { id: 's2', name: 'Follow-up Consultation', price: 300 },
  { id: 's3', name: 'Dressing', price: 300 },
  { id: 's4', name: 'Injection', price: 200 },
  { id: 's5', name: 'Orthopaedic Injection', price: 500 },
  { id: 's6', name: 'Plaster Application', price: 1000 },
];

function loadServices() {
  try {
    const stored = localStorage.getItem('aarna_services');
    return stored ? JSON.parse(stored) : JSON.parse(JSON.stringify(DEFAULT_SERVICES));
  } catch(e) {
    return JSON.parse(JSON.stringify(DEFAULT_SERVICES));
  }
}

function saveServices(services) {
  localStorage.setItem('aarna_services', JSON.stringify(services));
}

function openScorePicker() {
  const p = document.getElementById('score-picker-panel');
  if (p) p.style.display = p.style.display === 'none' ? 'block' : 'none';
}

function openInvoiceModal() {
  if (!State.currentPatient) { toast('Select a patient first', 'error'); return; }
  const p = State.currentPatient;
  const age = p.age || calcAge(p.dob) || '?';
  document.getElementById('inv-patient-info').textContent =
    `${p.name}  ·  ${age}y, ${p.gender || ''}  ·  ${p.phone || ''}  ·  ${p.id}`;

  // Restore previous invoice for this visit, or start fresh
  const saved = State.currentVisit?.invoice;
  const payMode = saved?.payMode || 'Cash';
  document.querySelectorAll('#inv-pay-group .np-gender-btn').forEach(b => b.classList.toggle('active', b.dataset.val === payMode));
  document.getElementById('inv-pay-mode').value = payMode;

  renderInvoiceRows(saved?.items || []);
  renderServiceChips();
  document.getElementById('modal-invoice').classList.add('open');
}

function renderServiceChips() {
  const services = loadServices();
  const container = document.getElementById('inv-service-chips');
  container.innerHTML = services.map(s => `
    <div class="inv-chip" onclick="addServiceToInvoice('${s.id}')">
      ${s.name} <span class="inv-chip-price">₹${s.price.toLocaleString('en-IN')}</span>
    </div>
  `).join('');
}

function addServiceToInvoice(id) {
  const services = loadServices();
  const svc = services.find(s => s.id === id);
  if (!svc) return;
  const tbody = document.getElementById('inv-rows');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input class="inv-desc-input" value="${svc.name}" oninput="updateInvoiceTotal()"></td>
    <td><input class="inv-amt-input" type="number" value="${svc.price}" min="0" oninput="updateInvoiceTotal()"></td>
    <td><button class="inv-del-btn" onclick="removeInvoiceRow(this)">×</button></td>
  `;
  tbody.appendChild(tr);
  updateInvoiceTotal();
}

function openAddServiceModal() {
  renderServiceList();
  document.getElementById('modal-services').classList.add('open');
}

function closeAddServiceModal() {
  document.getElementById('modal-services').classList.remove('open');
  document.getElementById('svc-new-name').value = '';
  document.getElementById('svc-new-price').value = '';
  renderServiceChips();
}

function renderServiceList() {
  const services = loadServices();
  const container = document.getElementById('svc-list');
  if (!services.length) {
    container.innerHTML = '<div style="color:var(--text3);font-size:12px;padding:8px 0;">No services yet.</div>';
    return;
  }
  container.innerHTML = services.map(s => `
    <div class="svc-list-row">
      <span class="svc-list-name">${s.name}</span>
      <span class="svc-list-price">₹ ${s.price.toLocaleString('en-IN')}</span>
      <button class="svc-list-del" onclick="deleteService('${s.id}')" title="Delete">×</button>
    </div>
  `).join('');
}

function addNewService() {
  const name = document.getElementById('svc-new-name').value.trim();
  const price = parseFloat(document.getElementById('svc-new-price').value) || 0;
  if (!name) { document.getElementById('svc-new-name').focus(); return; }
  const services = loadServices();
  services.push({ id: 's' + Date.now(), name, price });
  saveServices(services);
  document.getElementById('svc-new-name').value = '';
  document.getElementById('svc-new-price').value = '';
  renderServiceList();
  document.getElementById('svc-new-name').focus();
}

function deleteService(id) {
  const services = loadServices().filter(s => s.id !== id);
  saveServices(services);
  renderServiceList();
}

function closeInvoiceModal() {
  document.getElementById('modal-invoice').classList.remove('open');
}

function invSetPay(val) {
  document.querySelectorAll('#inv-pay-group .np-gender-btn').forEach(b => b.classList.toggle('active', b.dataset.val === val));
  document.getElementById('inv-pay-mode').value = val;
}

function renderInvoiceRows(rows) {
  const tbody = document.getElementById('inv-rows');
  tbody.innerHTML = rows.map((r, i) => `
    <tr>
      <td><input class="inv-desc-input" value="${r.desc}" placeholder="Description" oninput="updateInvoiceTotal()"></td>
      <td><input class="inv-amt-input" type="number" value="${r.amt}" placeholder="0" min="0" oninput="updateInvoiceTotal()"></td>
      <td><button class="inv-del-btn" onclick="removeInvoiceRow(this)">×</button></td>
    </tr>
  `).join('');
  updateInvoiceTotal();
}

function addInvoiceRow() {
  const tbody = document.getElementById('inv-rows');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><input class="inv-desc-input" placeholder="Description" oninput="updateInvoiceTotal()"></td>
    <td><input class="inv-amt-input" type="number" placeholder="0" min="0" oninput="updateInvoiceTotal()"></td>
    <td><button class="inv-del-btn" onclick="removeInvoiceRow(this)">×</button></td>
  `;
  tbody.appendChild(tr);
  tr.querySelector('.inv-desc-input').focus();
}

function removeInvoiceRow(btn) {
  btn.closest('tr').remove();
  updateInvoiceTotal();
}

function updateInvoiceTotal() {
  let total = 0;
  document.querySelectorAll('.inv-amt-input').forEach(inp => { total += parseFloat(inp.value) || 0; });
  document.getElementById('inv-total').textContent = `₹ ${total.toLocaleString('en-IN')}`;
}

function getInvoiceItems() {
  const items = [];
  document.querySelectorAll('#inv-rows tr').forEach(tr => {
    const desc = tr.querySelector('.inv-desc-input').value.trim();
    const amt = parseFloat(tr.querySelector('.inv-amt-input').value) || 0;
    if (desc) items.push({ desc, amt });
  });
  return items;
}

function printInvoice() {
  const p = State.currentPatient;
  if (!p) return;
  const items = getInvoiceItems();
  const payMode = document.getElementById('inv-pay-mode').value;
  const total = items.reduce((s, i) => s + i.amt, 0);
  const age = p.age || calcAge(p.dob) || '?';
  const now = new Date();
  const phone = (p.phone || p.whatsapp || '').replace(/\D/g,'');
  const invoiceNo = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${phone}-INV`;

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Invoice – ${p.name}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 12px; color: #000; }
  .page { width: 210mm; min-height: 148mm; padding: 12mm 14mm; }
  .inv-header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
  .clinic-name { font-size: 20px; font-weight: 900; }
  .clinic-sub { font-size: 10px; color: #444; margin-top: 3px; }
  .inv-label { font-size: 18px; font-weight: 700; color: #1a6ef5; text-align:right; }
  .inv-no { font-size: 10px; color: #666; text-align:right; margin-top:2px; }
  .patient-section { display:flex; justify-content:space-between; margin-bottom:14px; }
  .info-block p { font-size: 11px; line-height: 1.7; }
  .info-block strong { font-weight: 700; }
  table { width:100%; border-collapse:collapse; margin-bottom:12px; }
  th { background:#f5f5f5; text-align:left; padding:6px 10px; font-size:11px; font-weight:700; border:1px solid #ddd; }
  td { padding:6px 10px; border:1px solid #ddd; font-size:12px; }
  .amt { text-align:right; }
  .total-row td { font-weight:700; font-size:13px; background:#f5f5f5; }
  .footer-note { font-size:10px; color:#666; margin-top:8px; text-align:center; border-top:1px solid #ddd; padding-top:8px; }
  @media print { @page { size: A5 landscape; margin:0; } body { -webkit-print-color-adjust:exact; } }
</style></head><body>
<div class="page">
  <div class="inv-header">
    <div>
      <img src="assets/logo.png" style="height:52px;width:auto;object-fit:contain;margin-bottom:4px;display:block;" alt="logo">
      <div class="clinic-name">Aarna Orthopaedic Clinic</div>
      <div class="clinic-sub">Dr Chetan M Dojode · MS (Orth) · ${DOCTOR.phone}<br>${DOCTOR.clinics[0].address.replace(/\n/g,', ')}</div>
    </div>
    <div>
      <div class="inv-label">INVOICE</div>
      <div class="inv-no">${invoiceNo}</div>
      <div class="inv-no">Date: ${formatDate(now)}</div>
    </div>
  </div>
  <div class="patient-section">
    <div class="info-block">
      <p><strong>Patient:</strong> ${p.name}</p>
      <p><strong>ID:</strong> ${p.id} &nbsp; <strong>Age/Sex:</strong> ${age}y / ${p.gender || ''}</p>
      <p><strong>Phone:</strong> ${p.phone || '—'}</p>
    </div>
    <div class="info-block" style="text-align:right">
      <p><strong>Payment Mode:</strong> ${payMode}</p>
    </div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Description</th><th class="amt">Amount (₹)</th></tr></thead>
    <tbody>
      ${items.map((it,i)=>`<tr><td>${i+1}</td><td>${it.desc}</td><td class="amt">${it.amt > 0 ? it.amt.toLocaleString('en-IN') : '—'}</td></tr>`).join('')}
      <tr class="total-row"><td colspan="2" style="text-align:right">Total</td><td class="amt">₹ ${total.toLocaleString('en-IN')}</td></tr>
    </tbody>
  </table>
  <div class="footer-note">Thank you for visiting Aarna Orthopaedic Clinic · This is a computer-generated invoice</div>
</div>
<script>window.onload=()=>window.print();<\/script>
</body></html>`;

  const win = window.open('', '_blank', 'width=800,height=600');
  if (!win) { toast('Popup blocked — allow popups for this site in browser settings', 'error'); return; }
  win.document.write(html);
  win.document.close();
  closeInvoiceModal();
  // Auto-backup invoice PDF
  saveInvoicePdf();
}

async function shareInvoice() {
  const p = State.currentPatient;
  if (!p) { toast('No patient selected', 'error'); return; }
  const items = getInvoiceItems();
  if (!items.length) { toast('Add at least one item first', 'error'); return; }

  // Capture all data NOW before modal might close
  const invHtml = buildInvoiceHtml();
  if (!invHtml) { toast('Could not build invoice', 'error'); return; }

  const phone = (p.whatsapp || p.phone || '').replace(/\D/g, '');
  const patientName = p.name || 'Patient';
  const total = items.reduce((s, i) => s + i.amt, 0);
  const date = new Date().toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
  const msgText = `Dear ${patientName},\n\nYour invoice of ₹${total.toLocaleString('en-IN')} from Aarna Orthopaedic Clinic dated ${date}.\n\nThank you for visiting.\nDr Chetan M Dojode`;

  showInvoiceSharePanel(phone, msgText, patientName);

  // Generate PDF from already-captured HTML — no DOM dependency
  generateInvoicePdfFromHtml(invHtml, patientName, date, msgText);
}

async function generateInvoicePdfFromHtml(html, patientName, date, msgText) {
  try {
    const blob = await renderHtmlToPdfBlobA5(html);
    const fileName = `Invoice_${patientName.replace(/\s+/g,'_')}_${date.replace(/\s/g,'-')}.pdf`;
    const file = new File([blob], fileName, { type:'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);

    const dlBtn = document.getElementById('inv-share-pdf-btn');
    if (dlBtn) {
      dlBtn.outerHTML = `<a id="inv-share-pdf-btn" class="share-btn share-pdf" href="${blobUrl}" download="${fileName}">
        <span>📄</span> Download Invoice PDF
      </a>`;
    }

    if (navigator.share && navigator.canShare && navigator.canShare({ files:[file] })) {
      const nativeBtn = document.getElementById('inv-share-native-btn');
      if (nativeBtn) {
        nativeBtn.style.display = 'flex';
        nativeBtn.onclick = async () => {
          try { await navigator.share({ files:[file], title:`Invoice – ${patientName}`, text:msgText }); }
          catch(e) { if (e.name !== 'AbortError') toast('Share failed','error'); }
        };
      }
    }
  } catch(e) {
    console.error('Invoice PDF error', e);
    const btn = document.getElementById('inv-share-pdf-btn');
    if (btn) btn.textContent = '⚠️ PDF failed — try Download below';
  }
}

function showInvoiceSharePanel(phone, msgText, patientName) {
  const encoded = encodeURIComponent(msgText);
  const local = normalizePhone(phone);
  const waLink  = local ? `https://wa.me/91${local}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
  const smsLink = `sms:${local ? '+91'+local : ''}?body=${encoded}`;
  const email   = State.currentPatient?.email;
  const emailLink = email ? `mailto:${email}?subject=${encodeURIComponent('Invoice – '+patientName)}&body=${encoded}` : null;

  document.getElementById('inv-share-panel')?.remove();
  const panel = document.createElement('div');
  panel.id = 'inv-share-panel';
  panel.className = 'share-panel';
  panel.innerHTML = `
    <div class="share-panel-header">
      <span>📤 Send Invoice</span>
      <button onclick="document.getElementById('inv-share-panel').remove()">✕</button>
    </div>
    <div class="share-panel-body">
      <button id="inv-share-native-btn" class="share-btn share-native" style="display:none">
        <span>🚀</span> Share Invoice PDF (WhatsApp / any app)
      </button>
      <div id="inv-share-pdf-btn" class="share-btn share-pdf" style="opacity:.6;pointer-events:none">
        <span>📄</span> ⏳ Generating PDF…
      </div>
      <div class="share-divider">— or send text message —</div>
      <a class="share-btn share-wa" href="${waLink}" target="_blank" rel="noopener">
        <span>📱</span> WhatsApp${phone ? ' · '+phone : ''}
      </a>
      <a class="share-btn share-sms" href="${smsLink}">
        <span>💬</span> SMS${phone ? ' · '+phone : ''}
      </a>
      ${emailLink ? `<a class="share-btn share-email" href="${emailLink}"><span>📧</span> Email · ${email}</a>` : ''}
    </div>`;
  document.body.appendChild(panel);
}

// ─── Template Modal Medicine Management ──────────────────────────────────────
function renderTmplMedList() {
  const list = document.getElementById('tmpl-med-list');
  if (!TmplState.meds.length) {
    list.innerHTML = '<div style="padding:8px 10px;font-size:12px;color:var(--text3)">No medicines added yet</div>';
    return;
  }
  list.innerHTML = TmplState.meds.map((item, i) => {
    const med = MEDICINE_DB.find(m => m.id === item.id);
    const name = med ? med.brand : `Med #${item.id}`;
    return `
      <div class="tmpl-med-row">
        <span class="tmpl-med-name">${name}</span>
        <input class="modal-input tmpl-med-timing" value="${item.timings||''}"
          onchange="TmplState.meds[${i}].timings=this.value" title="Timings" placeholder="1-0-1" style="width:70px;padding:4px 6px;">
        <input class="modal-input tmpl-med-dur" value="${item.duration||''}"
          onchange="TmplState.meds[${i}].duration=this.value" title="Duration" placeholder="5 Days" style="width:80px;padding:4px 6px;">
        <button class="tmpl-med-del" onclick="removeTmplMed(${i})" title="Remove">✕</button>
      </div>`;
  }).join('');
}

function removeTmplMed(idx) {
  TmplState.meds.splice(idx, 1);
  renderTmplMedList();
}

function tmplSearchMeds(query) {
  clearTimeout(TmplState.searchTimeout);
  const resultsEl = document.getElementById('tmpl-med-results');
  if (!query.trim()) { resultsEl.style.display = 'none'; return; }

  TmplState.searchTimeout = setTimeout(() => {
    const found = searchMedicines(query, 8);
    if (!found.length) { resultsEl.style.display = 'none'; return; }
    resultsEl.style.display = 'block';
    resultsEl.innerHTML = found.map(m => `
      <div class="tmpl-med-option" onclick="addTmplMed(${JSON.stringify(m.id)})">
        <div class="tmpl-med-opt-brand">${esc(m.type)}. ${esc(m.brand)}</div>
        <div class="tmpl-med-opt-content">${esc(m.content)}</div>
      </div>`).join('');
  }, 80);
}

function addTmplMed(medId) {
  const med = MEDICINE_DB.find(m => String(m.id) === String(medId));
  if (!med) return;
  if (TmplState.meds.find(m => String(m.id) === String(medId))) {
    toast('Already in template', 'warning'); return;
  }
  TmplState.meds.push({
    id: med.id,
    dose: med.dose,
    timings: med.timings,
    timingsNote: med.timingsNote,
    duration: med.duration,
    qty: med.qty || ''
  });
  renderTmplMedList();
  document.getElementById('tmpl-med-search').value = '';
  document.getElementById('tmpl-med-results').style.display = 'none';
}

// ─── Save & Print ─────────────────────────────────────────────────────────────
async function saveVisit() {
  if (!State.currentPatient || !State.currentVisit) {
    toast('Please select a patient first', 'error'); return;
  }

  // Read all fields
  State.currentVisit.complaints    = document.getElementById('field-complaints').value;
  State.currentVisit.hopi          = document.getElementById('field-hopi').value;
  State.currentVisit.pastHistory   = document.getElementById('field-past-history').value;
  State.currentVisit.allergies     = document.getElementById('field-allergies').value;
  State.currentVisit.examination   = document.getElementById('field-examination').value;
  State.currentVisit.investigations= document.getElementById('field-investigations').value;
  State.currentVisit.diagnosis     = document.getElementById('field-diagnosis').value;
  State.currentVisit.icd10         = document.getElementById('field-icd10').value;
  State.currentVisit.advice        = document.getElementById('field-advice').value;
  State.currentVisit.followUp      = document.getElementById('field-follow-up').value;
  State.currentVisit.referredTo    = document.getElementById('field-referred-to').value;
  State.currentVisit.procedure     = document.getElementById('field-procedure').value;
  State.currentVisit.notes         = document.getElementById('field-notes').value;
  State.currentVisit.medicines = State.medicines.map(m => ({
    id: m.med.id, brand: m.med.brand, content: m.med.content,
    type: m.med.type, form: m.med.form,
    dose: m.dose, timings: m.timings, timingsNote: m.timingsNote,
    frequency: m.frequency, duration: m.duration, qty: m.qty,
    details: m.details || '', notes: m.notes || ''
  }));
  State.currentVisit.saved = true;
  State.currentVisit.savedAt = Date.now();

  await DB.saveVisit(State.currentVisit);

  // Update patient's lastVisit
  State.currentPatient.lastVisit = Date.now();
  await DB.savePatient(State.currentPatient);

  await initPatientPanel();
  renderPatientList();
  toast('Visit saved ✓  —  backing up PDF…');

  // Auto-backup PDF — always, regardless of content
  savePrescriptionPdf();
}

async function sharePrescription() {
  if (!State.currentPatient || !State.currentVisit) { toast('No patient selected', 'error'); return; }
  await saveVisit();

  const p = State.currentPatient;
  const v = State.currentVisit;
  const phone = (p.whatsapp || p.phone || '').replace(/\D/g, '');
  const patientName = p.name || 'Patient';
  const diagnosis = v.diagnosis || '';
  const date = new Date().toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
  const msgText = `Dear ${patientName},\n\nYour prescription from Dr Chetan M Dojode dated ${date}${diagnosis ? '\nDiagnosis: ' + diagnosis : ''}.\n\nAarna Orthopaedic & SportsMed Clinic\nPh: +91 ${DOCTOR.phone || ''}`;

  showSharePanel(phone, msgText, patientName);
  generateAndAttachPdf(patientName, date, msgText);
}

async function generateAndAttachPdf(patientName, date, msgText) {
  try {
    const rxHtml = await buildPrescriptionHtml();
    if (!rxHtml) { document.getElementById('share-pdf-btn').textContent = '⚠️ No patient data'; return; }
    const blob = await renderHtmlToPdfBlob(rxHtml);
    const fileName = `Rx_${patientName.replace(/\s+/g,'_')}_${date.replace(/\s/g,'-')}.pdf`;
    const file = new File([blob], fileName, { type:'application/pdf' });
    const blobUrl = URL.createObjectURL(blob);

    const dlBtn = document.getElementById('share-pdf-btn');
    if (dlBtn) {
      dlBtn.outerHTML = `<a id="share-pdf-btn" class="share-btn share-pdf" href="${blobUrl}" download="${fileName}">
        <span>📄</span> Download Prescription PDF
      </a>`;
    }

    if (navigator.share && navigator.canShare && navigator.canShare({ files:[file] })) {
      const nativeBtn = document.getElementById('share-native-btn');
      if (nativeBtn) {
        nativeBtn.style.display = 'flex';
        nativeBtn.onclick = async () => {
          try { await navigator.share({ files:[file], title:`Prescription – ${patientName}`, text:msgText }); }
          catch(e) { if (e.name !== 'AbortError') toast('Share failed','error'); }
        };
      }
    }
  } catch(e) {
    console.error('PDF generation failed', e);
    const btn = document.getElementById('share-pdf-btn');
    if (btn) btn.textContent = '⚠️ PDF generation failed';
  }
}

function normalizePhone(phone) {
  // Strip leading country code (91 for India) if already present, then re-add
  const digits = (phone || '').replace(/\D/g, '');
  return digits.startsWith('91') && digits.length > 10 ? digits.slice(2) : digits;
}

function showSharePanel(phone, msgText, patientName) {
  const encoded = encodeURIComponent(msgText);
  const local = normalizePhone(phone);
  const waLink  = local ? `https://wa.me/91${local}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
  const smsLink = `sms:${local ? '+91'+local : ''}?body=${encoded}`;
  const email   = State.currentPatient?.email;
  const emailLink = email
    ? `mailto:${email}?subject=${encodeURIComponent('Prescription – ' + patientName)}&body=${encoded}` : null;

  document.getElementById('share-panel')?.remove();
  const panel = document.createElement('div');
  panel.id = 'share-panel';
  panel.className = 'share-panel';
  panel.innerHTML = `
    <div class="share-panel-header">
      <span>📤 Send Prescription</span>
      <button onclick="document.getElementById('share-panel').remove()">✕</button>
    </div>
    <div class="share-panel-body">
      <button id="share-native-btn" class="share-btn share-native" style="display:none">
        <span>🚀</span> Share PDF directly (WhatsApp / any app)
      </button>
      <div id="share-pdf-btn" class="share-btn share-pdf" style="opacity:.6;pointer-events:none">
        <span>📄</span> ⏳ Generating PDF…
      </div>
      <div class="share-divider">— or send text message —</div>
      <a class="share-btn share-wa" href="${waLink}" target="_blank" rel="noopener">
        <span>📱</span> WhatsApp${phone ? ' · ' + phone : ' (no number saved)'}
      </a>
      <a class="share-btn share-sms" href="${smsLink}">
        <span>💬</span> SMS${phone ? ' · ' + phone : ' (no number saved)'}
      </a>
      ${emailLink ? `<a class="share-btn share-email" href="${emailLink}">
        <span>📧</span> Email · ${email}</a>` : ''}
      <div class="share-note">Tip: Download PDF → open WhatsApp → tap 📎 → Document → select PDF</div>
    </div>`;
  document.body.appendChild(panel);
}

async function printPrescription() {
  if (!State.currentPatient) { toast('No patient selected', 'error'); return; }

  // Auto-save first (saveVisit already triggers savePrescriptionPdf)
  await saveVisit();

  const p = State.currentPatient;
  const v = State.currentVisit;
  const age = p.age || calcAge(p.dob) || '?';
  const now = new Date();

  const medRows = State.medicines.map((item, i) => {
    const m = item.med;
    return `
      <tr class="print-med-row">
        <td class="pm-num">${i + 1})</td>
        <td class="pm-med">
          <strong>${m.type}. ${m.brand}</strong><br>
          <span class="pm-comp">Content : ${m.content}</span><br>
          ${item.timingsNote ? `<span class="pm-note">${item.timingsNote}</span>` : ''}
        </td>
        <td class="pm-dose">${item.timings}</td>
        <td class="pm-timings">${item.timingsNote || ''}</td>
        <td class="pm-timings">${item.frequency || ''}</td>
        <td class="pm-dur">${item.duration}</td>
        <td class="pm-qty">${item.qty || ''}</td>
      </tr>
    `;
  }).join('');

  const adviceLines = (v.advice || '').split('\n').filter(Boolean);

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Prescription - ${p.name}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #000; background: #fff; }
  .page { width: 210mm; min-height: 297mm; padding: 12mm 14mm 8mm; position: relative; }

  /* Header */
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 8px; }
  .header-left { flex: 1; }
  .doctor-name { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; }
  .doctor-title { font-size: 10px; font-weight: 700; color: #333; margin: 3px 0 2px; }
  .doctor-quals { font-size: 9px; color: #444; line-height: 1.5; }
  .header-right { text-align: center; }
  .clinic-logo { font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; border: 3px solid #000; padding: 6px 10px; }
  .clinic-logo span { font-size: 8px; display: block; font-weight: 400; letter-spacing: 2px; }

  /* Patient bar */
  .patient-bar { background: #f5f5f5; border: 1px solid #ccc; padding: 5px 10px; margin-bottom: 10px; display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; }

  /* Section labels */
  .section-label { font-weight: 700; font-size: 11px; margin-top: 8px; display: inline; }
  .section-value { font-size: 11px; }
  .section-block { margin-bottom: 6px; }

  /* Rx symbol */
  .rx-symbol { font-family: 'Times New Roman', serif; font-size: 28px; font-weight: 900; margin: 8px 0 4px; line-height: 1; }

  /* Medicine table */
  table.rx { width: 100%; border-collapse: collapse; margin-top: 4px; }
  table.rx th { text-align: left; padding: 4px 6px; font-size: 10px; font-weight: 700; background: #f0f0f0; border-bottom: 1.5px solid #000; border-top: 1px solid #ccc; }
  table.rx td { padding: 3px 6px; vertical-align: top; font-size: 10px; }
  .pm-num { width: 24px; font-weight: 700; }
  .pm-med { width: auto; }
  .pm-dose { width: 40px; text-align: center; }
  .pm-timings { width: 70px; text-align: center; }
  .pm-dur { width: 100px; }
  .pm-qty { width: 30px; text-align: right; }
  .pm-comp { font-size: 9px; color: #444; }
  .pm-note { font-size: 9px; color: #555; font-style: italic; }
  tr.print-med-row { border-bottom: 0.5px solid #e0e0e0; }

  /* Advice */
  .advice-section { margin-top: 10px; }
  .advice-item { padding: 1px 0 1px 12px; position: relative; font-size: 10.5px; }
  .advice-item::before { content: '•'; position: absolute; left: 0; }

  /* Footer */
  .footer { position: absolute; bottom: 10mm; left: 14mm; right: 14mm; border-top: 1.5px solid #000; padding-top: 8px; }
  .footer-label { font-weight: 700; font-size: 10px; text-decoration: underline; margin-bottom: 6px; }
  .footer-locs { display: flex; justify-content: space-between; }
  .footer-loc { width: 48%; font-size: 9px; line-height: 1.5; }
  .footer-loc-name { font-weight: 700; font-size: 10px; }

  /* Follow-up */
  .followup-box { margin-top: 8px; border: 1px dashed #999; padding: 5px 10px; font-size: 10.5px; display: inline-block; }

  @media print { @page { size: A4; margin: 0; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="page">
  <!-- Header -->
  <div class="header">
    <div class="header-left">
      <div class="doctor-name">${DOCTOR.name}</div>
      <div class="doctor-title">${DOCTOR.title} – ${DOCTOR.subtitle}</div>
      <div class="doctor-quals">
        ${DOCTOR.qualifications}<br>
        ${DOCTOR.fellowships.join('<br>')}<br>
        ${DOCTOR.kmc}, Phone: ${DOCTOR.phone}, Email: ${DOCTOR.email}, ${DOCTOR.website}
      </div>
    </div>
    <div class="header-right">
      <img src="assets/logo.png" style="height:64px;width:auto;object-fit:contain;" alt="Aarna Orthopaedic Clinic">
    </div>
  </div>

  <!-- Patient Bar -->
  <div class="patient-bar">
    <span>${p.id}: ${p.name} (${age}y, ${p.gender || 'M'}) &nbsp;&nbsp; ${p.phone || ''}</span>
    <span>Date &amp; Time : ${formatDateTime(now)}</span>
  </div>

  <!-- Chief Complaint -->
  ${v.complaints ? `<div class="section-block"><span class="section-label">Chief Complaint: </span><span class="section-value">${v.complaints}</span></div>` : ''}

  <!-- HoPi -->
  ${v.hopi ? `<div class="section-block"><span class="section-label">History of Present Illness: </span><span class="section-value">${v.hopi.replace(/\n/g,'<br>')}</span></div>` : ''}

  <!-- Past History + Allergies -->
  ${v.pastHistory ? `<div class="section-block"><span class="section-label">Past Medical History: </span><span class="section-value">${v.pastHistory.replace(/\n/g,'<br>')}</span></div>` : ''}
  ${v.allergies ? `<div class="section-block"><span class="section-label">Allergies: </span><span class="section-value">${v.allergies}</span></div>` : ''}

  <!-- Examination -->
  ${v.examination ? `<div class="section-block"><span class="section-label">Examination: </span><span class="section-value">${v.examination.replace(/\n/g,'<br>')}</span></div>` : ''}

  <!-- Investigations -->
  ${v.investigations ? `<div class="section-block"><span class="section-label">Investigations: </span><span class="section-value">${v.investigations.replace(/\n/g,'<br>')}</span></div>` : ''}

  <!-- Diagnosis -->
  ${v.diagnosis ? `<div class="section-block"><span class="section-label">Diagnosis: </span><span class="section-value"><strong>${v.diagnosis}</strong>${v.icd10 ? ` <span style="color:#666;font-size:10px;">(${v.icd10})</span>` : ''}</span></div>` : ''}

  <!-- Rx -->
  ${State.medicines.length ? `
  <div class="rx-symbol">&#x211E;</div>
  <table class="rx">
    <thead>
      <tr>
        <th></th>
        <th>Medication</th>
        <th>Dose</th>
        <th>Timings</th>
        <th>Duration</th>
        <th>Qty</th>
      </tr>
    </thead>
    <tbody>
      ${medRows}
    </tbody>
  </table>
  ` : ''}

  <!-- Advice -->
  ${adviceLines.length ? `
  <div class="advice-section">
    <div class="section-label">Advice:</div>
    ${adviceLines.map(a => `<div class="advice-item">${a}</div>`).join('')}
  </div>
  ` : ''}

  <!-- Procedure Done -->
  ${v.procedure ? `<div class="section-block" style="margin-top:8px;"><span class="section-label">Procedure Done: </span><span class="section-value">${v.procedure.replace(/\n/g,'<br>')}</span></div>` : ''}

  <!-- Follow Up Plan -->
  ${v.followUp ? `<div class="followup-box"><strong>Follow Up:</strong> ${v.followUp}</div>` : ''}

  <!-- Referral -->
  ${v.referredTo ? `<div class="section-block" style="margin-top:6px;"><span class="section-label">Referred To: </span><span class="section-value">${v.referredTo}</span></div>` : ''}

  <!-- Footer -->
  <div class="footer">
    <div class="footer-label">CONSULTATION LOCATIONS:</div>
    <div class="footer-locs">
      ${DOCTOR.clinics.map(c => `
        <div class="footer-loc">
          <div class="footer-loc-name">${c.name}</div>
          <div>${c.address.replace(/\n/g, '<br>')}</div>
          <div>${c.hours}</div>
        </div>
      `).join('')}
    </div>
  </div>
</div>
<script>window.onload = () => { window.print(); };<\/script>
</body></html>`;

  const win = window.open('', '_blank', 'width=900,height=700');
  if (!win) { toast('Popup blocked — allow popups for this site in browser settings', 'error'); return; }
  win.document.write(html);
  win.document.close();
}

// ─── Previous Visits ──────────────────────────────────────────────────────────
async function renderPreviousVisits(patientId) {
  const visits = await DB.getPatientVisits(patientId);
  const section = document.getElementById('prev-visits-section');
  const container = document.getElementById('prev-visits');
  const countEl = document.getElementById('pvb-count');

  if (!visits.length) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  if (countEl) countEl.textContent = visits.length + ' visit' + (visits.length > 1 ? 's' : '');

  container.innerHTML = visits.map(v => {
    const d = new Date(v.date);
    const day = d.getDate();
    const mon = d.toLocaleString('en-IN', { month: 'short' });
    const yr  = d.getFullYear();
    return `
      <div class="pvb-tab" onclick="pvbToggle(this, '${v.id}')">
        <div class="pvb-tab-head">
          <div class="pvb-tab-date">
            <span class="pvb-day">${day}</span>
            <span class="pvb-mon">${mon} ${yr}</span>
          </div>
          <div class="pvb-tab-diag">${v.diagnosis || 'Visit'}</div>
          <div class="pvb-tab-meta">${v.medicines?.length || 0} med${(v.medicines?.length||0)!==1?'s':''}</div>
          <span class="pvb-chevron">›</span>
        </div>
        <div class="pvb-tab-body" style="display:none">
          <div class="pvb-detail-row"><b>Complaints:</b> ${esc(v.complaints || '—')}</div>
          <div class="pvb-detail-row"><b>Diagnosis:</b> ${esc(v.diagnosis || '—')}</div>
          ${v.medicines?.length ? `<div class="pvb-detail-row"><b>Medicines:</b> ${v.medicines.map(m=>esc(m.brand)).join(', ')}</div>` : ''}
          ${v.advice ? `<div class="pvb-detail-row"><b>Advice:</b> ${esc(v.advice)}</div>` : ''}
          <button class="pvb-load-btn" onclick="event.stopPropagation();loadVisit('${v.id}')">Load this visit</button>
        </div>
      </div>`;
  }).join('');
}

function pvbToggle(tabEl, visitId) {
  const body = tabEl.querySelector('.pvb-tab-body');
  const chev = tabEl.querySelector('.pvb-chevron');
  const isOpen = body.style.display !== 'none';
  // Close all
  document.querySelectorAll('.pvb-tab-body').forEach(b => b.style.display = 'none');
  document.querySelectorAll('.pvb-chevron').forEach(c => { c.style.transform = ''; c.style.color = ''; });
  document.querySelectorAll('.pvb-tab').forEach(t => t.classList.remove('pvb-tab-open'));
  if (!isOpen) {
    body.style.display = 'block';
    chev.style.transform = 'rotate(90deg)';
    tabEl.classList.add('pvb-tab-open');
  }
}

async function loadVisit(id) {
  const v = await DB.getVisit(id);
  if (!v) return;
  State.currentVisit = v;

  // Restore medicines
  State.medicines = (v.medicines || []).map(m => {
    const med = MEDICINE_DB.find(x => x.id === m.id) || {
      id: m.id, brand: m.brand, content: m.content || m.composition || '',
      type: m.type || 'TAB', form: m.form || 'Tablet'
    };
    return {
      med, dose: m.dose,
      timings: m.timings || m.freq || med.timings,
      timingsNote: m.timingsNote || med.timingsNote || 'After Food',
      frequency: m.frequency || 'Once Daily',
      duration: m.duration, qty: m.qty || '',
      details: m.details || '', notes: m.notes || ''
    };
  });

  // Fill form fields
  document.getElementById('field-complaints').value    = v.complaints || '';
  document.getElementById('field-hopi').value          = v.hopi || '';
  document.getElementById('field-past-history').value  = v.pastHistory || '';
  document.getElementById('field-allergies').value     = v.allergies || '';
  document.getElementById('field-examination').value   = v.examination || '';
  document.getElementById('field-investigations').value= v.investigations || '';
  document.getElementById('field-diagnosis').value     = v.diagnosis || '';
  document.getElementById('field-icd10').value         = v.icd10 || '';
  document.getElementById('field-advice').value        = v.advice || '';
  document.getElementById('field-follow-up').value     = v.followUp || '';
  document.getElementById('field-notes').value         = v.notes || '';

  renderMedicineTable();
  toast(`Loaded visit from ${formatDate(v.date)}`);
}

// ─── Tab switching ────────────────────────────────────────────────────────────
function switchLeftTab(tab) {
  document.querySelectorAll('.left-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.left-tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelector(`.left-tab[data-tab="${tab}"]`)?.classList.add('active');
  document.getElementById(`ltab-${tab}`)?.classList.add('active');

  if (tab === 'today') {
    DB.getTodayPatients().then(ps => { State.todayPatients = ps; renderPatientList(ps, 'today'); });
  } else if (tab === 'recent') {
    DB.searchPatients('').then(ps => {
      State.recentPatients = ps;
      const list = document.getElementById('patient-list-recent');
      if (!ps.length) {
        list.innerHTML = '<div class="empty-state"><span class="empty-icon">👤</span><p>No patients yet</p></div>';
        return;
      }
      list.innerHTML = ps.slice(0, 20).map(p => `
        <div class="patient-item ${State.currentPatient?.id === p.id ? 'active' : ''}" onclick="loadPatient('${esc(p.id)}')">
          <div class="patient-avatar">${esc((p.name || 'U')[0].toUpperCase())}</div>
          <div class="patient-info">
            <div class="patient-name">${esc(p.name || 'Unknown')}</div>
            <div class="patient-meta">${esc(p.id)} · ${p.age || calcAge(p.dob) || '?'}y, ${esc(p.gender || '?')}</div>
            <div class="patient-phone">${esc(p.phone || '')}</div>
          </div>
          <div class="patient-date">${p.lastVisit ? formatDate(p.lastVisit) : ''}</div>
        </div>
      `).join('');
    });
  }
}

// ─── Keyboard Shortcuts ───────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  // Ctrl/Cmd+K = focus medicine search
  if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
    e.preventDefault();
    document.getElementById('med-search').focus();
  }
  // Ctrl+P = print
  if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
    e.preventDefault();
    printPrescription();
  }
  // Ctrl+S = save
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveVisit();
  }
  // Escape = close modals
  if (e.key === 'Escape') {
    closeNewPatientModal();
    closeTemplateModal();
    document.getElementById('med-results').innerHTML = '';
  }
  // Enter in med search = add first result
  if (e.key === 'Enter' && document.activeElement === document.getElementById('med-search')) {
    const first = document.querySelector('.med-result');
    if (first) first.click();
  }
  // ArrowDown in med search = focus first result
  if (e.key === 'ArrowDown' && document.activeElement === document.getElementById('med-search')) {
    const first = document.querySelector('.med-result');
    if (first) { first.focus(); e.preventDefault(); }
  }
});

// ─── Init ─────────────────────────────────────────────────────────────────────
function purgeRemovedMedicines() {
  const PURGE = ['Axbex Suspension'];
  ['med_repository', 'custom_medicines'].forEach(key => {
    try {
      const list = JSON.parse(localStorage.getItem(key) || '[]');
      const cleaned = list.filter(m => !PURGE.includes(m.brand));
      if (cleaned.length !== list.length) localStorage.setItem(key, JSON.stringify(cleaned));
    } catch(e) {}
  });
  const cleaned = MEDICINE_DB.filter(m => !PURGE.includes(m.brand));
  if (cleaned.length !== MEDICINE_DB.length) { MEDICINE_DB = cleaned; saveMedList(); }
}

let _logoDataUrl = null;
async function getLogoDataUrl() {
  if (_logoDataUrl) return _logoDataUrl;
  try {
    const resp = await fetch('assets/logo.png');
    const blob = await resp.blob();
    return new Promise(res => {
      const r = new FileReader();
      r.onload = e => { _logoDataUrl = e.target.result; res(_logoDataUrl); };
      r.readAsDataURL(blob);
    });
  } catch(e) { return ''; }
}

async function init() {
  purgeRemovedMedicines();
  getLogoDataUrl(); // pre-cache logo for PDF generation
  initMobilePanels();
  // Render built-in templates immediately – no DB needed
  TmplState.allTemplates = Object.entries(CONDITION_TEMPLATES).map(([key, t], i) => ({
    id: key, label: t.label, icon: t.icon, isBuiltIn: true, order: i, ...t
  }));
  renderTemplateChips();
  initMedAlphaBrowser();

  await DB.init();
  await initPatientPanel();
  await refreshRecycleBin();

  // Phase 1 – Ortho upgrades
  if (typeof renderBodySelector === 'function') renderBodySelector();
  if (typeof initDiagSearch === 'function') initDiagSearch();

  // Patient search
  document.getElementById('patient-search').addEventListener('input', e => {
    clearTimeout(State.searchTimeout);
    const q = e.target.value;
    if (!q.trim()) { searchPatients(''); return; }
    State.searchTimeout = setTimeout(() => searchPatients(q), 150);
  });

  // Medicine search – show full dropdown on focus, filter on input
  const medSearchEl = document.getElementById('med-search');
  medSearchEl.addEventListener('focus', () => handleMedSearch(medSearchEl.value));
  medSearchEl.addEventListener('input', e => handleMedSearch(e.target.value));
  // Close dropdown when clicking outside
  document.addEventListener('click', e => {
    if (!e.target.closest('#right-panel')) {
      const medResults = document.getElementById('med-results');
      if (medResults) medResults.innerHTML = '';
    }
  });

  // Form field events — all fields that should auto-save
  ['complaints', 'hopi', 'past-history', 'allergies', 'examination', 'diagnosis', 'icd10', 'investigations', 'advice', 'follow-up', 'referred-to', 'procedure', 'notes'].forEach(f => {
    const el = document.getElementById(`field-${f}`);
    if (el) {
      el.addEventListener('input', () => {
        const key = f.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        updateVisitField(key === 'followUp' ? 'followUp' : key, el.value);
      });
    }
  });

  // Date display
  document.getElementById('today-date').textContent = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  // Load templates
  await loadAndRenderTemplates();

  // Default to Today tab
  switchLeftTab('today');

  // Auto-reconnect Google Drive silently if previously connected
  if (localStorage.getItem('gdrive_connected') === '1' && localStorage.getItem('gdrive_client_id')) {
    gdriveAutoReconnect();
  }
}

function gdriveAutoReconnect() {
  try {
    const clientId = localStorage.getItem('gdrive_client_id');
    if (!clientId) return;
    // Use prompt:none for silent re-auth (no popup if user already granted access)
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.file',
      prompt: 'none',
      callback: async function(resp) {
        if (resp.error || !resp.access_token) return; // silent fail, user can reconnect manually
        GDrive.token = resp.access_token;
        GDrive._tokenExpiry = Date.now() + 55 * 60 * 1000; // tokens expire in ~1hr; refresh at 55m
        updateGdriveUI();
        gdriveStartAutoBackup();
      }
    });
    client.requestAccessToken({ prompt: 'none' });
  } catch(e) { /* google lib not loaded yet, skip */ }
}

document.addEventListener('DOMContentLoaded', init);

// ─── Backup & Restore ─────────────────────────────────────────────────────────
function openBackupModal() {
  document.getElementById("modal-backup").style.display = "flex";
  const cid = localStorage.getItem("gdrive_client_id") || "";
  document.getElementById("gdrive-client-id").value = cid;
  updateGdriveUI();
  updatePdfFolderUI();

  // Trigger Drive backup immediately when Backup button pressed (skip if already running)
  if (GDrive.token && !GDrive._backupInProgress) {
    toast('Backing up to Google Drive…', 'success', 2000);
    GDrive._backupInProgress = true;
    gdriveBackupNow()
      .then(() => toast('Drive backup complete ✓', 'success', 3000))
      .catch(() => toast('Drive backup failed', 'error'))
      .finally(() => { GDrive._backupInProgress = false; });
  }
  if (PdfStore.dirHandle && State.currentPatient && State.currentVisit) {
    savePrescriptionPdf();
  }
}
function closeBackupModal() {
  document.getElementById("modal-backup").style.display = "none";
}

async function exportBackup() {
  const [patients, templates] = await Promise.all([DB.getAllPatients(), DB.getAllTemplates()]);
  // Fetch all visits in parallel
  const visitArrays = await Promise.all(patients.map(p => DB.getPatientVisits(p.id)));
  const allVisits = visitArrays.flat();
  const data = {
    version: 3, exportedAt: new Date().toISOString(),
    clinic: "Aarna Orthopaedic Clinic",
    patients, visits: allVisits, templates,
    medList: JSON.parse(localStorage.getItem(MEDS_KEY) || "[]"),
    // kept for backward-compatible restores of older backups
    medRepository: JSON.parse(localStorage.getItem("med_repository") || "[]")
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const date = new Date().toISOString().slice(0, 10);
  a.href = url; a.download = "aarna-opd-backup-" + date + ".json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  setLastBackupInfo("Local export done at " + new Date().toLocaleTimeString("en-IN"));
  toast("Backup exported (" + patients.length + " patients)");
}

function validatePatient(p) {
  return p && typeof p === 'object' && typeof p.id === 'string' && p.id.length > 0
    && typeof p.name === 'string';
}

function validateVisit(v) {
  return v && typeof v === 'object' && typeof v.id === 'string' && v.id.length > 0
    && typeof v.patientId === 'string' && typeof v.date === 'number';
}

async function importBackup(input) {
  const file = input.files[0]; if (!file) return;
  const text = await file.text();
  let data;
  try { data = JSON.parse(text); } catch(e) { toast("Invalid backup file — not valid JSON", "error"); return; }
  if (!Array.isArray(data.patients) || !Array.isArray(data.visits)) {
    toast("Unrecognised backup format", "error"); return;
  }

  const validPatients = data.patients.filter(validatePatient);
  const validVisits   = data.visits.filter(validateVisit);
  const skipped = (data.patients.length - validPatients.length) + (data.visits.length - validVisits.length);

  const msg = `Restore ${validPatients.length} patients and ${validVisits.length} visits`
    + ` from ${(data.exportedAt || "").slice(0,10)}?`
    + (skipped ? `\n\n⚠️ ${skipped} records skipped (invalid structure).` : "")
    + "\n\nExisting data will be merged (not deleted).";
  if (!confirm(msg)) return;

  let errors = 0;
  for (const p of validPatients) {
    try { await DB.savePatient(p); } catch(e) { errors++; }
  }
  for (const v of validVisits) {
    try { await DB.saveVisit(v); } catch(e) { errors++; }
  }
  if (data.templates && Array.isArray(data.templates)) {
    for (const t of data.templates) {
      try { await DB.saveTemplate(t); } catch(e) { errors++; }
    }
  }
  // Restore the medicine list (new backups use medList; older ones used medRepository)
  const restoredMeds = Array.isArray(data.medList) ? data.medList
    : (Array.isArray(data.medRepository) ? data.medRepository : null);
  if (restoredMeds) {
    const have = new Set(MEDICINE_DB.map(m => String(m.id)));
    restoredMeds.forEach(m => {
      if (m && m.id != null && !have.has(String(m.id))) {
        MEDICINE_DB.push(m);
        have.add(String(m.id));
      }
    });
    saveMedList();
    refreshAlphaList();
  }

  await initPatientPanel();
  await loadAndRenderTemplates();
  input.value = "";
  if (errors) {
    toast(`Restored with ${errors} error(s) — some records may be missing`, "warning");
  } else {
    toast(`Restored ${validPatients.length} patients successfully`);
  }
}

// ── Google Drive ──────────────────────────────────────────────────────────────
const GDrive = {
  token: null, autoTimer: null, _tokenExpiry: null,
  FOLDER_NAME: "Aarna OPD Backups",
  folderId: null,
  fileId: localStorage.getItem("gdrive_file_id") || null
};

function gdriveSaveClientId() {
  const val = document.getElementById("gdrive-client-id").value.trim();
  if (!val) { toast("Enter a Client ID", "error"); return; }
  localStorage.setItem("gdrive_client_id", val);
  toast("Client ID saved");
  updateGdriveUI();
}

function gdriveConnect() {
  const clientId = localStorage.getItem("gdrive_client_id");
  if (!clientId) {
    document.getElementById("gdrive-setup").style.display = "block";
    toast("Enter your Google Client ID first", "warning"); return;
  }
  const client = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: "https://www.googleapis.com/auth/drive.file",
    callback: async function(resp) {
      if (resp.error) { toast("Google auth failed: " + resp.error, "error"); return; }
      GDrive.token = resp.access_token;
      GDrive._tokenExpiry = Date.now() + 55 * 60 * 1000;
      localStorage.setItem("gdrive_connected", "1");
      updateGdriveUI();
      toast("Connected to Google Drive");
      await gdriveBackupNow();
      gdriveStartAutoBackup();
    }
  });
  client.requestAccessToken();
}

function gdriveDisconnect() {
  GDrive.token = null;
  GDrive.folderId = null;
  localStorage.removeItem("gdrive_connected");
  clearInterval(GDrive.autoTimer);
  GDrive.autoTimer = null;
  updateGdriveUI();
  toast("Disconnected from Google Drive");
}

function updateGdriveUI() {
  const connected = !!GDrive.token;
  const statusEl = document.getElementById("gdrive-status");
  const connectBtn = document.getElementById("gdrive-connect-btn");
  const disconnectBtn = document.getElementById("gdrive-disconnect-btn");
  const icon = document.getElementById("backup-status-icon");
  if (!statusEl) return;
  if (connected) {
    statusEl.textContent = "Connected — auto-backup every minute";
    statusEl.style.color = "#16a34a";
    if (connectBtn) connectBtn.style.display = "none";
    if (disconnectBtn) disconnectBtn.style.display = "";
    if (icon) { icon.textContent = "✓"; icon.style.color = "#16a34a"; }
  } else {
    statusEl.textContent = "Not connected";
    statusEl.style.color = "var(--text3)";
    if (connectBtn) connectBtn.style.display = "";
    if (disconnectBtn) disconnectBtn.style.display = "none";
    if (icon) { icon.textContent = "☁"; icon.style.color = ""; }
  }
}

async function gdriveEnsureFolder() {
  if (GDrive.folderId) return GDrive.folderId;
  const q = encodeURIComponent("name='" + GDrive.FOLDER_NAME + "' and mimeType='application/vnd.google-apps.folder' and trashed=false");
  const search = await fetch("https://www.googleapis.com/drive/v3/files?q=" + q + "&fields=files(id)",
    { headers: { Authorization: "Bearer " + GDrive.token } });
  const found = await search.json();
  if (found.files && found.files.length) { GDrive.folderId = found.files[0].id; return GDrive.folderId; }
  const create = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: { Authorization: "Bearer " + GDrive.token, "Content-Type": "application/json" },
    body: JSON.stringify({ name: GDrive.FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" })
  });
  const folder = await create.json();
  GDrive.folderId = folder.id;
  return GDrive.folderId;
}

async function gdriveBackupNow() {
  if (!GDrive.token) return;
  try {
    const [patients, templates] = await Promise.all([DB.getAllPatients(), DB.getAllTemplates()]);
    const visitArrays = await Promise.all(patients.map(p => DB.getPatientVisits(p.id)));
    const allVisits = visitArrays.flat();
    const data = {
      version: 3, exportedAt: new Date().toISOString(),
      clinic: "Aarna Orthopaedic Clinic",
      patients, visits: allVisits, templates,
      medList: JSON.parse(localStorage.getItem(MEDS_KEY) || "[]"),
      medRepository: JSON.parse(localStorage.getItem("med_repository") || "[]")
    };
    const json = JSON.stringify(data);
    const folderId = await gdriveEnsureFolder();

    if (GDrive.fileId) {
      const patchRes = await fetch("https://www.googleapis.com/upload/drive/v3/files/" + GDrive.fileId + "?uploadType=media", {
        method: "PATCH",
        headers: { Authorization: "Bearer " + GDrive.token, "Content-Type": "application/json" },
        body: json
      });
      if (patchRes.status === 404) {
        // File was deleted from Drive — clear stale ID so we create a new one
        GDrive.fileId = null;
        localStorage.removeItem("gdrive_file_id");
      } else if (!patchRes.ok) {
        throw new Error("Drive PATCH failed: " + patchRes.status);
      }
    }
    if (!GDrive.fileId) {
      const meta = { name: "aarna-opd-backup.json", parents: [folderId] };
      const form = new FormData();
      form.append("metadata", new Blob([JSON.stringify(meta)], { type: "application/json" }));
      form.append("file", new Blob([json], { type: "application/json" }));
      const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", {
        method: "POST", headers: { Authorization: "Bearer " + GDrive.token }, body: form
      });
      const created = await res.json();
      GDrive.fileId = created.id;
      localStorage.setItem("gdrive_file_id", GDrive.fileId);
    }

    const timeStr = new Date().toLocaleTimeString("en-IN");
    setLastBackupInfo("Last Drive backup: " + timeStr);
    const icon = document.getElementById("backup-status-icon");
    if (icon) { icon.textContent = "✓"; icon.style.color = "#16a34a"; }
  } catch(e) {
    console.error("Drive backup failed", e);
    const icon = document.getElementById("backup-status-icon");
    if (icon) { icon.textContent = "!"; icon.style.color = "#dc2626"; }
  }
}

function gdriveStartAutoBackup() {
  clearInterval(GDrive.autoTimer);
  GDrive.autoTimer = setInterval(() => {
    // Silently refresh token 5 minutes before it expires (~55-min window)
    if (GDrive._tokenExpiry && Date.now() > GDrive._tokenExpiry - 5 * 60 * 1000) {
      gdriveAutoReconnect();
    } else {
      gdriveBackupNow();
    }
  }, 60000);
}

function setLastBackupInfo(msg) {
  const el = document.getElementById("backup-last-info");
  if (el) { el.textContent = msg; el.style.color = "#16a34a"; }
}


// ─── Prescription PDF Folder ───────────────────────────────────────────────────
const PdfStore = { dirHandle: null };

async function selectPdfFolder() {
  if (!window.showDirectoryPicker) {
    toast('File System Access not supported — use Chrome/Edge', 'error'); return;
  }
  try {
    PdfStore.dirHandle = await window.showDirectoryPicker({ mode: 'readwrite', id: 'rx-pdfs' });
    updatePdfFolderUI();
    toast('Prescription folder set: ' + PdfStore.dirHandle.name);
  } catch(e) {
    if (e.name !== 'AbortError') toast('Could not access folder', 'error');
  }
}

function updatePdfFolderUI() {
  const el = document.getElementById('pdf-folder-status');
  const syncBtn = document.getElementById('btn-sync-pdfs');
  if (!el) return;
  if (PdfStore.dirHandle) {
    el.textContent = 'Folder: ' + PdfStore.dirHandle.name;
    el.style.color = '#16a34a';
    if (syncBtn) syncBtn.style.display = GDrive.token ? '' : 'none';
  } else {
    el.textContent = 'No folder selected';
    el.style.color = 'var(--text3)';
    if (syncBtn) syncBtn.style.display = 'none';
  }
}

async function buildPrescriptionHtml() {
  const p = State.currentPatient;
  const v = State.currentVisit;
  if (!p || !v) return null;
  const age = p.age || calcAge(p.dob) || '?';
  const now = new Date();
  const logoSrc = await getLogoDataUrl();

  const medRows = State.medicines.map((item, i) => {
    const m = item.med;
    return `<tr class="print-med-row">
      <td class="pm-num">${i + 1})</td>
      <td class="pm-med"><strong>${m.type}. ${m.brand}</strong><br>
        <span class="pm-comp">${m.content}</span></td>
      <td class="pm-dose">${item.timings || ''}</td>
      <td class="pm-timings">${item.timingsNote || ''}</td>
      <td class="pm-timings">${item.frequency || ''}</td>
      <td class="pm-dur">${item.duration || ''}</td>
      <td class="pm-qty">${item.qty || ''}</td>
    </tr>`;
  }).join('');

  const adviceLines = (v.advice || '').split('\n').filter(Boolean);

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: Arial, sans-serif; font-size:11px; color:#000; background:#fff; }
.page { width:210mm; padding:12mm 14mm 20mm; }
.header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #000; padding-bottom:8px; margin-bottom:8px; }
.doctor-name { font-size:20px; font-weight:900; }
.doctor-title { font-size:10px; font-weight:700; margin:3px 0 2px; }
.doctor-quals { font-size:9px; color:#444; line-height:1.5; }
.patient-bar { background:#f5f5f5; border:1px solid #ccc; padding:5px 10px; margin-bottom:10px; display:flex; justify-content:space-between; font-size:10px; font-weight:700; }
.section-block { margin-bottom:6px; }
.section-label { font-weight:700; }
.rx-symbol { font-family:'Times New Roman',serif; font-size:28px; font-weight:900; margin:8px 0 4px; }
table.rx { width:100%; border-collapse:collapse; margin-top:4px; }
table.rx th { text-align:left; padding:4px 6px; font-size:10px; font-weight:700; background:#f0f0f0; border-bottom:1.5px solid #000; }
table.rx td { padding:3px 6px; vertical-align:top; font-size:10px; }
.pm-comp { font-size:9px; color:#444; }
.advice-section { margin-top:10px; }
.advice-item { padding:1px 0 1px 12px; position:relative; font-size:10.5px; }
.advice-item::before { content:'•'; position:absolute; left:0; }
${v.followUp ? `.followup-box { margin-top:10px; border:1px dashed #999; padding:5px 10px; font-size:10.5px; display:inline-block; }` : ''}
</style></head><body><div class="page">
<div class="header">
  <div>
    <div class="doctor-name">${DOCTOR.name}</div>
    <div class="doctor-title">${DOCTOR.title} – ${DOCTOR.subtitle}</div>
    <div class="doctor-quals">${DOCTOR.qualifications}<br>${DOCTOR.fellowships.join('<br>')}<br>${DOCTOR.kmc} | Ph: ${DOCTOR.phone}</div>
  </div>
  ${logoSrc ? `<img src="${logoSrc}" style="height:60px;object-fit:contain;">` : ''}
</div>
<div class="patient-bar">
  <span>${p.id}: ${p.name} (${age}y, ${p.gender || 'M'}) &nbsp; ${p.phone || ''}</span>
  <span>${formatDateTime(now)}</span>
</div>
${v.complaints ? `<div class="section-block"><span class="section-label">Chief Complaint: </span>${v.complaints}</div>` : ''}
${v.diagnosis ? `<div class="section-block"><span class="section-label">Diagnosis: </span><strong>${v.diagnosis}</strong></div>` : ''}
${State.medicines.length ? `<div class="rx-symbol">&#x211E;</div>
<table class="rx"><thead><tr><th></th><th>Medication</th><th>Dose</th><th>Timings</th><th>Frequency</th><th>Duration</th><th>Qty</th></tr></thead>
<tbody>${medRows}</tbody></table>` : ''}
${adviceLines.length ? `<div class="advice-section"><div class="section-label">Advice:</div>${adviceLines.map(a => `<div class="advice-item">${a}</div>`).join('')}</div>` : ''}
${v.followUp ? `<div class="followup-box">Next Visit: ${v.followUp}</div>` : ''}
</div></body></html>`;
}

function buildInvoiceHtml() {
  const p = State.currentPatient;
  const items = getInvoiceItems();
  if (!p || !items.length) return null;
  const payMode = document.getElementById('inv-pay-mode')?.value || 'Cash';
  const total = items.reduce((s, i) => s + i.amt, 0);
  const age = p.age || calcAge(p.dob) || '?';
  const now = new Date();
  const phone = (p.phone || p.whatsapp || '').replace(/\D/g,'');
  const invoiceNo = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${phone}-INV`;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
* { margin:0;padding:0;box-sizing:border-box; }
body { font-family:Arial,sans-serif;font-size:12px;color:#000;background:#fff; }
.page { width:210mm;min-height:148mm;padding:12mm 14mm; }
.inv-header { display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:12px; }
.clinic-name { font-size:18px;font-weight:900; }
.clinic-sub { font-size:10px;color:#444;margin-top:3px; }
.inv-label { font-size:18px;font-weight:700;color:#1a6ef5;text-align:right; }
.inv-no { font-size:10px;color:#666;text-align:right;margin-top:2px; }
.patient-section { display:flex;justify-content:space-between;margin-bottom:14px; }
.info-block p { font-size:11px;line-height:1.7; }
table { width:100%;border-collapse:collapse;margin-bottom:12px; }
th { background:#f5f5f5;text-align:left;padding:6px 10px;font-size:11px;font-weight:700;border:1px solid #ddd; }
td { padding:6px 10px;border:1px solid #ddd;font-size:12px; }
.amt { text-align:right; }
.total-row td { font-weight:700;font-size:13px;background:#f5f5f5; }
.footer-note { font-size:10px;color:#666;margin-top:8px;text-align:center;border-top:1px solid #ddd;padding-top:8px; }
</style></head><body>
<div class="page">
  <div class="inv-header">
    <div>
      <div class="clinic-name">Aarna Orthopaedic Clinic</div>
      <div class="clinic-sub">Dr Chetan M Dojode · MS (Orth) · ${DOCTOR.phone}<br>${DOCTOR.clinics[0].address.replace(/\n/g,', ')}</div>
    </div>
    <div>
      <div class="inv-label">INVOICE</div>
      <div class="inv-no">${invoiceNo}</div>
      <div class="inv-no">Date: ${formatDate(now)}</div>
    </div>
  </div>
  <div class="patient-section">
    <div class="info-block">
      <p><strong>Patient:</strong> ${p.name}</p>
      <p><strong>ID:</strong> ${p.id} &nbsp; <strong>Age/Sex:</strong> ${age}y / ${p.gender||''}</p>
      <p><strong>Phone:</strong> ${p.phone||'—'}</p>
    </div>
    <div class="info-block" style="text-align:right"><p><strong>Payment Mode:</strong> ${payMode}</p></div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Description</th><th class="amt">Amount (₹)</th></tr></thead>
    <tbody>
      ${items.map((it,i)=>`<tr><td>${i+1}</td><td>${it.desc}</td><td class="amt">${it.amt>0?it.amt.toLocaleString('en-IN'):'—'}</td></tr>`).join('')}
      <tr class="total-row"><td colspan="2" style="text-align:right">Total</td><td class="amt">₹ ${total.toLocaleString('en-IN')}</td></tr>
    </tbody>
  </table>
  <div class="footer-note">Thank you for visiting Aarna Orthopaedic Clinic · Computer-generated invoice</div>
</div></body></html>`;
}

async function renderHtmlToPdfBlobA5(html) {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;height:560px;border:none;';
    document.body.appendChild(iframe);

    const cleanup = () => { if (iframe.parentNode) document.body.removeChild(iframe); };
    const timeout = setTimeout(() => { cleanup(); reject(new Error('Invoice PDF render timed out')); }, 15000);

    iframe.onload = async () => {
      try {
        await new Promise(r => setTimeout(r, 500));
        const canvas = await html2canvas(iframe.contentDocument.body, {
          scale: 2, useCORS: true, allowTaint: true,
          width: 794, height: 560, windowWidth: 794, windowHeight: 560
        });
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation:'landscape', unit:'px', format:'a5', compress:true });
        pdf.addImage(canvas.toDataURL('image/jpeg',0.92), 'JPEG', 0, 0,
          pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
        clearTimeout(timeout);
        resolve(pdf.output('blob'));
      } catch(e) { clearTimeout(timeout); reject(e); }
      finally { cleanup(); }
    };
    iframe.srcdoc = html;
  });
}

// Render prescription + invoice as a combined 2-page PDF
async function renderCombinedPdfBlob(rxHtml, invHtml) {
  const renderPage = (html, w, h) => new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = `position:fixed;left:-9999px;top:0;width:${w}px;height:${h}px;border:none;`;
    document.body.appendChild(iframe);
    const cleanup = () => { if (iframe.parentNode) document.body.removeChild(iframe); };
    const timeout = setTimeout(() => { cleanup(); reject(new Error('PDF page render timed out')); }, 15000);
    iframe.onload = async () => {
      try {
        await new Promise(r => setTimeout(r, 500));
        const canvas = await html2canvas(iframe.contentDocument.body, {
          scale:2, useCORS:true, allowTaint:true, width:w, height:h, windowWidth:w, windowHeight:h
        });
        clearTimeout(timeout);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      } catch(e) { clearTimeout(timeout); reject(e); }
      finally { cleanup(); }
    };
    iframe.srcdoc = html;
  });

  const [rxImg, invImg] = await Promise.all([
    renderPage(rxHtml, 794, 1123),
    renderPage(invHtml, 794, 560)
  ]);

  const { jsPDF } = window.jspdf;
  // Page 1: A4 prescription
  const pdf = new jsPDF({ unit:'px', format:'a4', compress:true });
  pdf.addImage(rxImg, 'JPEG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
  // Page 2: A5 landscape invoice
  pdf.addPage([pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getWidth() * 0.707], 'landscape');
  pdf.addImage(invImg, 'JPEG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
  return pdf.output('blob');
}

// Central backup: saves blob to local folder + Google Drive
async function autoBackupPdf(blob, fileName, patientId) {
  let savedLocal = false;
  // 1. Local folder (desktop/supported browsers)
  if (PdfStore.dirHandle) {
    try {
      const perm = await PdfStore.dirHandle.queryPermission({ mode: 'readwrite' });
      if (perm !== 'granted') await PdfStore.dirHandle.requestPermission({ mode: 'readwrite' });
      const dir = await PdfStore.dirHandle.getDirectoryHandle(patientId, { create: true });
      const fh = await dir.getFileHandle(fileName, { create: true });
      const w = await fh.createWritable();
      await w.write(blob); await w.close();
      savedLocal = true;
    } catch(e) { console.warn('Local folder save failed', e); }
  }
  // 2. Google Drive queue (only queue if Drive is configured; cap at 50 to prevent memory leak)
  if (GDrive.token || localStorage.getItem('gdrive_connected') === '1') {
    PdfDriveQueue.push({ patientId, fileName, blob });
    if (PdfDriveQueue.length > 50) PdfDriveQueue.splice(0, PdfDriveQueue.length - 50);
    if (GDrive.token) syncPdfsToDrive();
  }
  return savedLocal;
}

async function savePrescriptionPdf() {
  if (!State.currentPatient || !State.currentVisit) return;
  try {
    const rxHtml = await buildPrescriptionHtml();
    if (!rxHtml) return;
    const now = new Date();
    const patientId = State.currentPatient.id;
    const phone = (State.currentPatient.phone || '').replace(/\D/g,'');
    // Use visit date so re-saves overwrite the same file
    const visitDate = State.currentVisit.date
      ? new Date(State.currentVisit.date).toISOString().slice(0,10).replace(/-/g,'')
      : now.toISOString().slice(0,10).replace(/-/g,'');
    const rxFileName = `${visitDate}-${phone}-RX.pdf`;
    const rxBlob = await renderHtmlToPdfBlob(rxHtml);
    await autoBackupPdf(rxBlob, rxFileName, patientId);
    toast('Prescription PDF backed up ✓', 'success', 4000);
  } catch(e) {
    console.error('Rx backup failed', e);
    toast('PDF backup failed — check folder/Drive settings', 'error');
  }
}

async function saveInvoicePdf() {
  const items = getInvoiceItems();
  if (!items.length) { toast('Add items to invoice first', 'error'); return; }
  if (!State.currentPatient) return;

  // Persist invoice into the visit so it's retained on reopen and included in JSON backup
  if (State.currentVisit) {
    State.currentVisit.invoice = {
      items,
      payMode: document.getElementById('inv-pay-mode')?.value || 'Cash',
      total: items.reduce((s, i) => s + i.amt, 0),
      savedAt: Date.now()
    };
    await DB.saveVisit(State.currentVisit);
  }

  const invHtml = buildInvoiceHtml();
  if (!invHtml) return;
  try {
    const now = new Date();
    const patientId = State.currentPatient.id;
    const phone = (State.currentPatient.phone || '').replace(/\D/g,'');
    const dateCompact = now.toISOString().slice(0,10).replace(/-/g,'');
    const invFileName = `${dateCompact}-${phone}-INV.pdf`;
    const invBlob = await renderHtmlToPdfBlobA5(invHtml);
    await autoBackupPdf(invBlob, invFileName, patientId);
    toast('Invoice saved & backed up ✓');
  } catch(e) { console.error('Invoice backup failed', e); toast('Invoice backup failed', 'error'); }
}

const PdfDriveQueue = [];

async function renderHtmlToPdfBlob(html) {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;height:1123px;border:none;';
    document.body.appendChild(iframe);

    const cleanup = () => { if (iframe.parentNode) document.body.removeChild(iframe); };
    const timeout = setTimeout(() => { cleanup(); reject(new Error('PDF render timed out')); }, 15000);

    iframe.onload = async () => {
      try {
        await new Promise(r => setTimeout(r, 500)); // let fonts/images settle
        const canvas = await html2canvas(iframe.contentDocument.body, {
          scale: 2, useCORS: true, allowTaint: true,
          width: 794, height: 1123,
          windowWidth: 794, windowHeight: 1123
        });
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ unit: 'px', format: 'a4', compress: true });
        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        pdf.addImage(imgData, 'JPEG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
        clearTimeout(timeout);
        resolve(pdf.output('blob'));
      } catch(e) { clearTimeout(timeout); reject(e); }
      finally { cleanup(); }
    };
    iframe.srcdoc = html;
  });
}

async function syncPdfsToDrive() {
  if (!GDrive.token || !PdfDriveQueue.length) return;
  try {
    const folderId = await gdriveEnsureFolder();
    // Get or create Prescriptions sub-folder in Drive
    const q = encodeURIComponent("name='Prescriptions' and mimeType='application/vnd.google-apps.folder' and '" + folderId + "' in parents and trashed=false");
    const search = await fetch("https://www.googleapis.com/drive/v3/files?q=" + q + "&fields=files(id)",
      { headers: { Authorization: "Bearer " + GDrive.token } });
    const found = await search.json();
    let rxFolderId;
    if (found.files && found.files.length) {
      rxFolderId = found.files[0].id;
    } else {
      const create = await fetch("https://www.googleapis.com/drive/v3/files", {
        method: "POST",
        headers: { Authorization: "Bearer " + GDrive.token, "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Prescriptions", mimeType: "application/vnd.google-apps.folder", parents: [folderId] })
      });
      rxFolderId = (await create.json()).id;
    }

    for (const item of PdfDriveQueue) {
      // Patient sub-folder in Drive
      const pq = encodeURIComponent("name='" + item.patientId + "' and mimeType='application/vnd.google-apps.folder' and '" + rxFolderId + "' in parents and trashed=false");
      const ps = await fetch("https://www.googleapis.com/drive/v3/files?q=" + pq + "&fields=files(id)",
        { headers: { Authorization: "Bearer " + GDrive.token } });
      const pf = await ps.json();
      let patDirId;
      if (pf.files && pf.files.length) {
        patDirId = pf.files[0].id;
      } else {
        const pc = await fetch("https://www.googleapis.com/drive/v3/files", {
          method: "POST",
          headers: { Authorization: "Bearer " + GDrive.token, "Content-Type": "application/json" },
          body: JSON.stringify({ name: item.patientId, mimeType: "application/vnd.google-apps.folder", parents: [rxFolderId] })
        });
        patDirId = (await pc.json()).id;
      }

      const meta = { name: item.fileName, parents: [patDirId] };
      const form = new FormData();
      form.append("metadata", new Blob([JSON.stringify(meta)], { type: "application/json" }));
      form.append("file", item.blob);
      await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart",
        { method: "POST", headers: { Authorization: "Bearer " + GDrive.token }, body: form });
    }

    PdfDriveQueue.length = 0;
    toast("PDFs synced to Google Drive");
  } catch(e) {
    console.error("PDF Drive sync failed", e);
  }
}

