// ─── Utilities ───────────────────────────────────────────────────────────────
function esc(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
// Escape for HTML, preserving line breaks — for multi-line clinical notes in PDFs
function escNl(str) {
  return esc(str).replace(/\n/g, '<br>');
}

// ─── Medicine Master List (editable, persisted) ───────────────────────────────
// The list is stored in localStorage and seeded once from MEDICINE_SEED (sample
// list). After that it's fully clinic-managed — add/delete are permanent.
const MEDS_KEY = 'med_master_list';

let MEDICINE_DB = (function loadMedList() {
  const makeSeed = () => (typeof MEDICINE_SEED !== 'undefined') ? MEDICINE_SEED.map(m => ({ ...m })) : [];
  const raw = localStorage.getItem(MEDS_KEY);
  if (raw == null) {
    // First run — seed once from the sample list
    const seed = makeSeed();
    try { localStorage.setItem(MEDS_KEY, JSON.stringify(seed)); } catch (e) {}
    return seed;
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;   // normal path
  } catch (e) { /* fall through */ }
  // Corrupt or unexpected data: DO NOT overwrite it (would lose the clinic's list).
  // Preserve the original for recovery and work from a fresh sample list in memory.
  try { localStorage.setItem(MEDS_KEY + '_corrupt_backup', raw); } catch (e) {}
  console.error('Medicine list unreadable; using sample list. Original preserved at ' + MEDS_KEY + '_corrupt_backup');
  return makeSeed();
})();

function saveMedList() {
  let ok = false;
  try {
    localStorage.setItem(MEDS_KEY, JSON.stringify(MEDICINE_DB));
    ok = true;
  } catch (e) {
    console.error('Failed to save medicine list to localStorage', e);
    if (typeof toast === 'function') toast('Could not save medicine list — device storage may be full', 'error', 4000);
  }
  // Durable mirror in IndexedDB (survives localStorage eviction — the main cause
  // of medicines "disappearing"). Fire-and-forget; safe before DB.init too.
  try { if (typeof DB === 'object' && DB.setMeta) DB.setMeta(MEDS_KEY, MEDICINE_DB).catch(() => {}); } catch (e) {}
  // Tell other open tabs to reload so a stale tab can't overwrite this list.
  try { if (window._medBC) window._medBC.postMessage('med-updated'); } catch (e) {}
  return ok;
}

// Union two medicine lists by id — never drops a medicine from either source.
function _mergeMedLists(a, b) {
  const byId = new Map();
  (a || []).forEach(m => { if (m && m.id != null) byId.set(String(m.id), m); });
  (b || []).forEach(m => { if (m && m.id != null && !byId.has(String(m.id))) byId.set(String(m.id), m); });
  return [...byId.values()];
}

// On startup, reconcile the localStorage list with the durable IndexedDB mirror.
// If localStorage was evicted (re-seeded to samples), this recovers the real
// list from IndexedDB. Union means neither store can silently drop a medicine.
async function reconcileMedList() {
  try {
    const mirror = await DB.getMeta(MEDS_KEY);
    if (Array.isArray(mirror) && mirror.length) {
      const merged = _mergeMedLists(MEDICINE_DB, mirror);
      if (merged.length !== MEDICINE_DB.length) {
        const recovered = merged.length - MEDICINE_DB.length;
        MEDICINE_DB = merged;
        saveMedList();
        if (typeof refreshAlphaList === 'function') refreshAlphaList();
        console.info('Medicine list reconciled — recovered ' + recovered + ' medicine(s) from durable backup');
        if (recovered > 0 && typeof toast === 'function') {
          toast('Recovered ' + recovered + ' medicine(s) from backup ✓', 'success', 3500);
        }
      }
    } else {
      // No durable mirror yet on this device — create it from the current list.
      await DB.setMeta(MEDS_KEY, MEDICINE_DB);
    }
  } catch (e) {
    console.warn('Medicine list reconcile skipped', e);
  }
}

// Export the medicine master list to a downloadable JSON file
function exportMedList() {
  const data = {
    type: 'ortho-opd-medicine-list', version: 1,
    exportedAt: new Date().toISOString(),
    count: MEDICINE_DB.length,
    medicines: MEDICINE_DB
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'medicine-list-' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(`Medicine list exported (${MEDICINE_DB.length} medicines)`);
}

// Import a medicine list file — merges into the existing list (by id), skips duplicates
async function importMedListFile(input) {
  const file = input.files && input.files[0];
  if (!file) return;
  let parsed;
  try {
    parsed = JSON.parse(await file.text());
  } catch (e) {
    toast('Invalid file — not valid JSON', 'error');
    input.value = '';
    return;
  }
  // Accept either our export wrapper or a bare array of medicines
  const incoming = Array.isArray(parsed) ? parsed
    : (Array.isArray(parsed.medicines) ? parsed.medicines : null);
  if (!incoming) {
    toast('Unrecognised medicine list file', 'error');
    input.value = '';
    return;
  }
  const valid = incoming.filter(m => m && typeof m === 'object' && m.id != null && typeof m.brand === 'string');
  if (!valid.length) {
    toast('No valid medicines found in file', 'error');
    input.value = '';
    return;
  }
  if (!confirm(`Import ${valid.length} medicine(s)?\n\nThese will be merged into your list. Existing medicines with the same ID are kept as-is.`)) {
    input.value = '';
    return;
  }
  const have = new Set(MEDICINE_DB.map(m => String(m.id)));
  let added = 0, skipped = 0;
  valid.forEach(m => {
    if (have.has(String(m.id))) { skipped++; return; }
    MEDICINE_DB.push({
      id: m.id, brand: m.brand, content: m.content || '',
      type: m.type || 'TAB', form: m.form || m.type || 'TAB',
      route: m.route || '', timings: m.timings || '1-0-0', timingsNote: m.timingsNote || 'After Food',
      frequency: m.frequency || 'Once a day', duration: m.duration || '5 Days',
      dose: m.dose || '1', qty: m.qty || '', indications: m.indications || []
    });
    have.add(String(m.id));
    added++;
  });
  if (added) saveMedList();
  refreshAlphaList();
  input.value = '';
  toast(`✓ Imported ${added} medicine${added !== 1 ? 's' : ''}${skipped ? ` · ${skipped} already present` : ''}`, 'success', 4000);
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
      name: "OSR — OrthoSportsRobotics Clinic / Aarna Clinic",
      address: "1182/1, 20th Main Rd, A Block,\nSahakar Nagar,\nBengaluru, Karnataka 560092",
      hours: "Hours: 5:00 pm to 7:00 pm"
    },
    {
      name: "Sparsh Hospital Yelahanka",
      address: "New Airport Road,\nKogilu Cross, Nehru Nagar,\nBengaluru, Karnataka 560064",
      hours: "Hours: 10:00 am to 4:00pm"
    }
  ]
};

// ─── Google Review ────────────────────────────────────────────────────────────
// Google Business Profile "write a review" links (open the review box directly).
// ⚠ These must stay in sync with PROFILES in review.html and qr.html.
// Verified mapping — do not swap:
//   OSR / Aarna  → CSV6MSTxo0qDEBM
//   Sparsh       → CbG5qO3MCVHOEBM
const GOOGLE_REVIEW_PROFILES = [
  { label: "OSR — OrthoSportsRobotics Clinic / Aarna Clinic", code: "aarna",  url: "https://g.page/r/CSV6MSTxo0qDEBM/review" },
  { label: "Sparsh Hospital Yelahanka",                       code: "sparsh", url: "https://g.page/r/CbG5qO3MCVHOEBM/review" }
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
          ? `<button class="review-act review-send" onclick="reviewSend(${i})">WhatsApp</button>
             <button class="review-act review-sms" onclick="reviewSms(${i})">SMS</button>`
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

// Build the review message + international phone for a given clinic profile
function _reviewMessage(p, patient) {
  const phone = (patient.phone || '').replace(/\D/g, '');
  const intl = phone.length === 10 ? '91' + phone : phone;   // default India code
  const first = (patient.name || '').split(' ')[0] || 'there';
  const gateUrl = `${REVIEW_GATE_BASE}?c=${p.code}`;
  const msg =
    `Dear ${first}, thank you for visiting ${DOCTOR.name}.\n\n` +
    `We'd love your feedback — please tap below and rate your experience:\n${gateUrl}\n\n` +
    `— ${p.label}`;
  return { intl, msg };
}

function reviewSend(i) {
  const p = GOOGLE_REVIEW_PROFILES[i];
  const patient = State.currentPatient;
  if (!p || !patient) return;
  const { intl, msg } = _reviewMessage(p, patient);
  window.open(`https://wa.me/${intl}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
  document.getElementById('review-chooser')?.remove();
}

function reviewSms(i) {
  const p = GOOGLE_REVIEW_PROFILES[i];
  const patient = State.currentPatient;
  if (!p || !patient) return;
  const { intl, msg } = _reviewMessage(p, patient);
  // sms: URI opens the phone's default messaging app with the text prefilled
  window.location.href = `sms:+${intl}?body=${encodeURIComponent(msg)}`;
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
    refreshRxDateTimeInput();
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

// ─── Patient Calendar ─────────────────────────────────────────────────────────
const CalState = { year: new Date().getFullYear(), month: new Date().getMonth(), byDay: null, selectedKey: null };

async function toggleCalendar() {
  const panel = document.getElementById('calendar-panel');
  const chev = document.getElementById('calendar-chevron');
  const opening = panel.style.display === 'none';
  panel.style.display = opening ? 'block' : 'none';
  chev.style.transform = opening ? 'rotate(90deg)' : '';
  if (opening) {
    // Default to the current month each time it's opened
    const now = new Date();
    CalState.year = now.getFullYear();
    CalState.month = now.getMonth();
    CalState.selectedKey = null;
    await loadCalendarData();
    renderCalendarGrid();
    renderCalDayList();
  }
}

// Build a map of day → { seen: Map(patientId→patient), booked: [{appt, patient}] }
async function loadCalendarData() {
  try {
    const [visits, patients, appts] = await Promise.all([
      DB.getAllVisits(), DB.getAllPatients(), DB.getAllAppointments()
    ]);
    CalState.patientMap = {};
    patients.forEach(p => { CalState.patientMap[p.id] = p; });
    const byDay = {};
    const ensure = key => (byDay[key] || (byDay[key] = { seen: new Map(), booked: [] }));
    visits.forEach(v => {
      if (!v.date) return;
      const d = new Date(v.date);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const p = CalState.patientMap[v.patientId];
      if (p) ensure(key).seen.set(p.id, p);
    });
    appts.forEach(a => {
      if (!a.date) return;
      const d = new Date(a.date);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const p = CalState.patientMap[a.patientId];
      ensure(key).booked.push({ appt: a, patient: p || { id: a.patientId, name: a.patientName || 'Unknown' } });
    });
    CalState.byDay = byDay;
  } catch (e) {
    console.error('Calendar data load failed', e);
    CalState.byDay = {};
  }
}

function calShift(deltaMonths, e) {
  if (e) e.stopPropagation();
  let m = CalState.month + deltaMonths;
  let y = CalState.year + Math.floor(m / 12);
  m = ((m % 12) + 12) % 12;
  CalState.year = y;
  CalState.month = m;
  renderCalendarGrid();
}

function renderCalendarGrid() {
  const grid = document.getElementById('cal-grid');
  const title = document.getElementById('cal-title');
  if (!grid || !title) return;
  const { year, month } = CalState;
  title.textContent = new Date(year, month, 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
  const startDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;

  let html = ['S','M','T','W','T','F','S'].map(d => `<div class="cal-dow">${d}</div>`).join('');
  for (let i = 0; i < startDow; i++) html += '<div class="cal-cell cal-empty"></div>';
  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${year}-${month}-${day}`;
    const data = CalState.byDay && CalState.byDay[key];
    const seen = data ? data.seen.size : 0;
    const booked = data ? data.booked.length : 0;
    // Cell colour: seen (teal) takes priority; else booked (amber)
    let tier = '';
    if (seen) tier = seen >= 6 ? ' cal-c3' : seen >= 3 ? ' cal-c2' : ' cal-c1';
    else if (booked) tier = ' cal-booked';
    const sel = CalState.selectedKey === key ? ' cal-sel' : '';
    const isToday = key === todayKey ? ' cal-today' : '';
    const badges =
      (seen ? `<span class="cal-count">${seen}</span>` : '') +
      (booked ? `<span class="cal-count cal-count-bk">${booked}</span>` : '');
    html += `<div class="cal-cell${tier}${sel}${isToday}" onclick="selectCalDay('${key}',event)">
      <span class="cal-num">${day}</span>${badges}
    </div>`;
  }
  grid.innerHTML = html;
}

function selectCalDay(key, e) {
  if (e) e.stopPropagation();
  CalState.selectedKey = CalState.selectedKey === key ? null : key;
  renderCalendarGrid();
  renderCalDayList();
}

function renderCalDayList() {
  const el = document.getElementById('cal-day-list');
  if (!el) return;
  const key = CalState.selectedKey;
  if (!key) { el.innerHTML = ''; return; }
  const [y, m, d] = key.split('-').map(Number);
  const label = new Date(y, m, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const data = CalState.byDay && CalState.byDay[key];
  const seen = data ? [...data.seen.values()].sort((a, b) => (a.name || '').localeCompare(b.name || '')) : [];
  const booked = data ? [...data.booked].sort((a, b) => (a.patient.name || '').localeCompare(b.patient.name || '')) : [];

  let html = `<div class="cal-day-head" style="display:flex;justify-content:space-between;align-items:center;">
      <span>${label}</span>
      <button class="cal-book-btn" onclick="openBookingPicker('${key}',event)" title="Book an appointment on this day">＋ Book</button>
    </div>`;

  if (seen.length) {
    html += `<div class="cal-sec-label cal-sec-seen">Seen · ${seen.length}</div>` +
      seen.map(p => `<div class="cal-day-item" onclick="loadPatient('${esc(p.id)}')">
        <div class="patient-avatar">${esc((p.name || 'U')[0].toUpperCase())}</div>
        <div class="cal-day-info">
          <div class="patient-name">${esc(p.name || 'Unknown')}</div>
          <div class="cal-day-id">${esc(p.id)}${p.phone ? ' · ' + esc(p.phone) : ''}</div>
        </div>
      </div>`).join('');
  }
  if (booked.length) {
    html += `<div class="cal-sec-label cal-sec-booked">Booked · ${booked.length}</div>` +
      booked.map(({ appt, patient }) => `<div class="cal-day-item">
        <div class="patient-avatar cal-avatar-bk">${esc((patient.name || 'U')[0].toUpperCase())}</div>
        <div class="cal-day-info" onclick="loadPatient('${esc(patient.id)}')" style="flex:1;cursor:pointer;">
          <div class="patient-name">${esc(patient.name || 'Unknown')}</div>
          <div class="cal-day-id">${appt.note ? esc(appt.note) : esc(patient.id)}</div>
        </div>
        <button class="cal-cancel-btn" onclick="cancelBooking('${esc(appt.id)}',event)" title="Cancel booking">✕</button>
      </div>`).join('');
  }
  if (!seen.length && !booked.length) {
    html += `<div style="font-size:11px;color:var(--text3);padding:8px 4px;">No patients this day. Use ＋ Book to schedule one.</div>`;
  }
  el.innerHTML = html;
}

// ── Appointment booking ──────────────────────────────────────────────────────
function openBookingPicker(key, e) {
  if (e) e.stopPropagation();
  CalState.bookingKey = key;
  const [y, m, d] = key.split('-').map(Number);
  const label = new Date(y, m, d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  document.getElementById('book-date-label').textContent = label;
  document.getElementById('book-search').value = '';
  document.getElementById('book-results').innerHTML = '';
  document.getElementById('modal-book').style.display = 'flex';
  setTimeout(() => document.getElementById('book-search').focus(), 50);
}

function closeBookingModal() {
  document.getElementById('modal-book').style.display = 'none';
  CalState.bookingKey = null;
}

async function bookSearch(query) {
  const el = document.getElementById('book-results');
  const results = await DB.searchPatients((query || '').trim());
  if (!results.length) {
    el.innerHTML = `<div style="font-size:12px;color:var(--text3);padding:10px;">No patient found. Register the patient first, then book.</div>`;
    return;
  }
  el.innerHTML = results.slice(0, 15).map(p => `<div class="book-result" onclick="bookAppointment('${esc(p.id)}')">
    <div class="patient-avatar">${esc((p.name || 'U')[0].toUpperCase())}</div>
    <div><div class="patient-name">${esc(p.name || 'Unknown')}</div>
      <div class="cal-day-id">${esc(p.id)}${p.phone ? ' · ' + esc(p.phone) : ''}</div></div>
  </div>`).join('');
}

// Register a brand-new patient and book them for the chosen day, in one step
function registerAndBook() {
  const key = CalState.bookingKey;
  if (!key) return;
  const q = document.getElementById('book-search').value.trim();
  CalState.pendingBookKey = key;   // saveNewPatient will book after registering
  closeBookingModal();             // (clears bookingKey; pendingBookKey persists)
  openNewPatientModal();
  // Prefill from whatever was typed in the search box
  if (q) {
    if (/^[\d\s+\-()]+$/.test(q)) {
      const el = document.getElementById('np-phone'); if (el) el.value = q.replace(/[^\d]/g, '');
    } else {
      const el = document.getElementById('np-name'); if (el) el.value = q;
    }
  }
  setTimeout(() => {
    const nameEl = document.getElementById('np-name');
    if (nameEl && !nameEl.value) nameEl.focus();
  }, 60);
}

async function bookAppointment(patientId) {
  const key = CalState.bookingKey;
  if (!key) return;
  const [y, m, d] = key.split('-').map(Number);
  const p = CalState.patientMap && CalState.patientMap[patientId];
  const appt = {
    id: 'appt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    patientId,
    patientName: p ? p.name : '',
    date: new Date(y, m, d, 9, 0).getTime(),   // 9 AM on the chosen day
    note: '',
    createdAt: Date.now()
  };
  try {
    await DB.saveAppointment(appt);
    closeBookingModal();
    await loadCalendarData();
    CalState.selectedKey = key;
    renderCalendarGrid();
    renderCalDayList();
    toast(`Appointment booked for ${p ? p.name : 'patient'} ✓`);
  } catch (e) {
    console.error('Booking failed', e);
    toast('Could not save the booking', 'error');
  }
}

async function cancelBooking(apptId, e) {
  if (e) e.stopPropagation();
  if (!confirm('Cancel this booking?')) return;
  try {
    await DB.deleteAppointment(apptId);
    await loadCalendarData();
    renderCalendarGrid();
    renderCalDayList();
    toast('Booking cancelled');
  } catch (e) {
    console.error('Cancel booking failed', e);
    toast('Could not cancel the booking', 'error');
  }
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
  if (_pdfAllRunning) { toast('PDF backup running — please wait a moment…', 'warning'); return; }
  // Flush any pending autosave of the patient being left, so their last
  // keystrokes aren't lost when we swap State to the new patient.
  if (State.currentPatient && State.currentVisit) {
    clearTimeout(_autoSaveTimer);
    try { await _autoSaveNow(); } catch (e) { console.warn('Flush save on switch failed', e); }
  }
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
  // Show + populate the editable prescription date/time
  refreshRxDateTimeInput();
}

// Format a timestamp for an <input type="datetime-local"> (local time, no TZ shift)
function _toDatetimeLocal(ts) {
  const d = new Date(ts || Date.now());
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function refreshRxDateTimeInput() {
  const wrap = document.getElementById('rx-datetime-wrap');
  const input = document.getElementById('rx-datetime');
  if (!wrap || !input) return;
  if (State.currentVisit) {
    input.value = _toDatetimeLocal(State.currentVisit.date || Date.now());
    wrap.style.display = 'inline-flex';
  } else {
    wrap.style.display = 'none';
  }
}

// Edit the prescription date/time — updates the visit's date (used on the
// printed Rx, calendar, and sorting). Blank input is ignored.
function setVisitDateTime(value) {
  if (!State.currentVisit || !value) { refreshRxDateTimeInput(); return; }
  const ts = new Date(value).getTime();
  if (isNaN(ts)) { refreshRxDateTimeInput(); return; }
  State.currentVisit.date = ts;
  scheduleAutoSave();
  toast('Prescription date set to ' + new Date(ts).toLocaleString('en-IN'), 'success', 2500);
  // Reflect on the calendar if it's open
  if (document.getElementById('calendar-panel')?.style.display === 'block') {
    loadCalendarData().then(() => renderCalendarGrid());
  }
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
      route: m.route || routeFromType(m.type),
      schedule: m.schedule || schedFromTimings(m.timings),
      dosage: m.dosage || m.dose || '1',
      instructions: m.instructions || normInstr(m.timingsNote),
      dose: m.dose, timings: m.timings || '1-0-0',
      timingsNote: m.timingsNote || 'After Food',
      frequency: m.frequency || 'Once a day',
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
  CalState.pendingBookKey = null;   // cancel any pending register-and-book
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

let _savingPatient = false;
async function saveNewPatient() {
  if (_savingPatient) return;                       // guard against double-tap
  const data = gatherPatientFormData();
  if (!data.name) { toast('Patient name is required', 'error'); return; }
  if (!data.phone || data.phone.replace(/\D/g,'').length < 6) { toast('Valid phone number is required', 'error'); return; }
  _savingPatient = true;
  try {
    const id = await DB.generatePatientId(data.phone);
    const patient = { id, ...data, age: data.age || calcAge(data.dob), createdAt: Date.now(), lastVisit: Date.now() };
    await DB.savePatient(patient);
    State.recentPatients.unshift(patient);

    // Register-and-book flow: opened from the calendar to schedule a NEW patient
    const bookKey = CalState.pendingBookKey;
    if (bookKey) {
      CalState.pendingBookKey = null;
      const [yy, mm, dd] = bookKey.split('-').map(Number);
      await DB.saveAppointment({
        id: 'appt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
        patientId: id, patientName: data.name,
        date: new Date(yy, mm, dd, 9, 0).getTime(), note: '', createdAt: Date.now()
      });
      closeNewPatientModal();
      await loadCalendarData();
      CalState.selectedKey = bookKey;
      renderCalendarGrid();
      renderCalDayList();
      toast(`Registered & booked ${data.name} ✓`);
      return;
    }

    closeNewPatientModal();
    await loadPatient(id);
    toast(`Patient ${data.name} registered as ${id}`);
  } catch (e) {
    console.error('Patient registration failed', e);
    toast('Could not save patient — please try again', 'error');
  } finally {
    _savingPatient = false;
  }
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
let _pdfAllRunning = false;   // true while the all-patients PDF sweep has State swapped

// Single source of truth: read the on-screen consultation form + medicine table
// into State.currentVisit (in-memory only, no DB write). Used by every save path
// so the serialized shape can never drift between them.
function _collectVisitFromForm() {
  if (!State.currentPatient || !State.currentVisit) return false;
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
    route: m.route || routeFromType(m.med.type),
    schedule: m.schedule || schedFromTimings(m.timings),
    dosage: m.dosage || m.dose || '1',
    instructions: m.instructions || normInstr(m.timingsNote),
    dose: m.dose, timings: m.timings, timingsNote: m.timingsNote,
    frequency: m.frequency, duration: m.duration, qty: m.qty,
    details: m.details || '', notes: m.notes || ''
  }));
  return true;
}

// Persist the on-screen form + medicines into the current visit immediately.
async function _autoSaveNow() {
  // While the all-patients PDF sweep has State swapped, the on-screen form
  // belongs to a different patient — never mix the two.
  if (_pdfAllRunning) return;
  if (!_collectVisitFromForm()) return;
  await DB.saveVisit(State.currentVisit);
}

function scheduleAutoSave() {
  clearTimeout(_autoSaveTimer);
  _autoSaveTimer = setTimeout(async () => {
    // Never autosave while the all-patients PDF sweep has State swapped to
    // another patient — the form fields on screen belong to someone else.
    if (_pdfAllRunning) return;
    await _autoSaveNow();
  }, 1500);
}

// Best-effort flush when the tab closes / refreshes — IndexedDB writes started
// here almost always complete, shrinking the data-loss window to near zero.
window.addEventListener('beforeunload', () => {
  if (!_pdfAllRunning && State.currentPatient && State.currentVisit) {
    clearTimeout(_autoSaveTimer);
    _autoSaveNow();
  }
});

// ─── Medicine Table ───────────────────────────────────────────────────────────
const ROUTE_OPTS = [
  'Oral','Sublingual','Eye','Ear','Nasal','Inhalation','Puff','Skin','Topical','Transdermal',
  'Local','Intramuscular','IV Injection','IV Infusion','Subcutaneous','Intradermal',
  'Intra-articular','Intrathecal','Epidural','Rectal','Vaginal','RT','As Directed'
];
const FREQ_OPTS = [
  'Once a day','Twice Daily','Thrice Daily','Four times a day','Five times a day','Six times a day',
  'Every hour','Every 2 hours','Every 4 hours','Every 6 hours',
  'Once a week','Twice a week','Thrice a week','Alternate days',
  'Once a month','Twice a month','Once in six months',
  'Bed Time','Once','Continuous','SOS / As required','As Directed'
];
const SCHEDULE_OPTS = [
  '1-0-0 (Morning)','0-1-0 (Afternoon)','0-0-1 (Night)',
  '1-1-0 (Morning-Afternoon)','1-0-1 (Morning-Night)','0-1-1 (Afternoon-Night)',
  '1-1-1 (Morning-Afternoon-Night)','1-1-1-1 (Morning-Afternoon-Evening-Night)',
  'Evening','Morning-Evening','Evening-Night','Morning-Afternoon-Evening','Morning-Evening-Night',
  'SOS','As Directed'
];
const INSTR_OPTS = [
  'As directed','Empty stomach','Before meals','With meals','After meals',
  'Before Breakfast','With Breakfast','After Breakfast',
  'Before Lunch','With Lunch','After Lunch',
  'Before Dinner','With Dinner','After Dinner',
  'At Bedtime','At Night','With Milk'
];
const DUR_UNITS = ['Days','Weeks','Months','Years'];
const TYPE_OPTS = ['TAB','CAP','SYP','INJ','GEL','SPRAY','DROPS','PWD','CREAM','OINT'];

// Default route of administration inferred from the medicine's form/type
function routeFromType(type) {
  switch ((type || '').toUpperCase()) {
    case 'INJ':   return 'Subcutaneous';
    case 'GEL':
    case 'CREAM':
    case 'OINT':  return 'Topical';
    case 'SPRAY': return 'Inhalation';
    case 'DROPS': return 'Eye';
    default:      return 'Oral';   // TAB, CAP, SYP, PWD…
  }
}

// Convert legacy "1-0-1"-style timings (or word-only schedules) to the
// combined "1-0-1 (Morning-Night)" label
function schedFromTimings(t) {
  const map = {
    '1-0-0':'1-0-0 (Morning)','0-1-0':'0-1-0 (Afternoon)','0-0-1':'0-0-1 (Night)',
    '1-1-0':'1-1-0 (Morning-Afternoon)','1-0-1':'1-0-1 (Morning-Night)','0-1-1':'0-1-1 (Afternoon-Night)',
    '1-1-1':'1-1-1 (Morning-Afternoon-Night)','1-1-1-1':'1-1-1-1 (Morning-Afternoon-Evening-Night)',
    'SOS':'SOS','As Directed':'As Directed','As directed':'As Directed'
  };
  if (map[t]) return map[t];
  if (SCHEDULE_OPTS.includes(t)) return t;
  // Word-only value from an older save (e.g. "Morning-Night") → find its combined label
  const match = SCHEDULE_OPTS.find(o => o === t || o.endsWith(`(${t})`));
  if (match) return match;
  return '1-0-0 (Morning)';
}

// Normalise legacy instruction wording to the new list
function normInstr(s) {
  const map = {
    'After Food':'After meals','Before Food':'Before meals','With Food':'With meals',
    'Along with Food':'With meals','Empty Stomach':'Empty stomach','As Directed':'As directed'
  };
  const v = map[s] || s;
  return INSTR_OPTS.includes(v) ? v : 'As directed';
}

// Duration cell: number + unit (e.g. "90 Days"); blank number = As Directed
function parseDuration(d) {
  const m = /^(\d+)\s*(Day|Week|Month|Year)s?$/i.exec((d || '').trim());
  if (m) {
    const unit = m[2].charAt(0).toUpperCase() + m[2].slice(1).toLowerCase() + 's';
    return { num: m[1], unit };
  }
  return { num: '', unit: 'Days' };
}

function updateDuration(idx) {
  const item = State.medicines[idx];
  if (!item) return;
  const num = document.getElementById(`rx-dur-num-${idx}`)?.value.trim();
  const unit = document.getElementById(`rx-dur-unit-${idx}`)?.value || 'Days';
  item.duration = num ? `${num} ${unit}` : 'As Directed';
  scheduleAutoSave();
}

function rxSel(opts, val, idx, field) {
  const hasVal = opts.includes(val);
  return `<select class="rx-sel" onchange="updateMed(${idx},'${field}',this.value)">
    ${!hasVal && val ? `<option value="${esc(val)}" selected>${esc(val)}</option>` : ''}
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
        </td>
        <td>${rxSel(ROUTE_OPTS, item.route || routeFromType(m.type), idx, 'route')}</td>
        <td>${rxSel(FREQ_OPTS, item.frequency || 'Once a day', idx, 'frequency')}</td>
        <td>${rxSel(SCHEDULE_OPTS, item.schedule || schedFromTimings(item.timings), idx, 'schedule')}</td>
        <td><input class="rx-input rx-dosage" value="${esc(item.dosage || item.dose || '1')}" onchange="updateMed(${idx},'dosage',this.value)" placeholder="1" title="Dosage per administration"></td>
        <td>${rxSel(INSTR_OPTS, item.instructions || normInstr(item.timingsNote), idx, 'instructions')}</td>
        <td class="rx-dur-cell">
          <input id="rx-dur-num-${idx}" class="rx-input rx-dur-num" type="number" min="1"
            value="${esc(parseDuration(item.duration).num)}" placeholder="—" onchange="updateDuration(${idx})">
          <select id="rx-dur-unit-${idx}" class="rx-sel rx-dur-unit" onchange="updateDuration(${idx})">
            ${DUR_UNITS.map(u => `<option${parseDuration(item.duration).unit === u ? ' selected' : ''}>${u}</option>`).join('')}
          </select>
        </td>
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
        <div style="display:flex;gap:6px;align-items:center;">
          <input id="rx-inline-search" class="rx-inline-search" type="text"
            placeholder="Search and add medicine…"
            autocomplete="off" spellcheck="false" style="flex:1"
            oninput="rxInlineSearch(this.value)"
            onfocus="rxInlineSearch(this.value)">
          <button class="rx-blank-btn" onclick="addBlankMedicine()"
            title="Add a blank row — type a one-off medicine for this patient only">＋ Blank</button>
        </div>
      </td>
      <td></td>
    </tr>`;

  tbody.innerHTML = rows + addRow;

  // Keep the right-panel medicine browser's ✓ marks in sync with the current
  // prescription — covers patient switches, visit loads, template applies, etc.
  if (typeof refreshAlphaList === 'function') refreshAlphaList();
}

function updateMedName(idx, field, value) {
  if (!State.medicines[idx]) return;
  State.medicines[idx].med[field] = value;
  scheduleAutoSave();
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
  scheduleAutoSave();
}

// Blank editable row for a one-off medicine — saved with this patient's visit
// only, never added to the master medicine list.
function addBlankMedicine() {
  State.medicines.push({
    med: { id: 'adhoc_' + Date.now(), brand: '', content: '', type: 'TAB', form: 'TAB' },
    route: 'Oral',
    frequency: 'Once a day',
    schedule: '1-0-0 (Morning)',
    dosage: '1',
    instructions: 'After meals',
    duration: '5 Days',
    dose: '1', timings: '1-0-0', timingsNote: 'After Food', qty: ''
  });
  renderMedicineTable();
  scheduleAutoSave();
  // Focus the new row's name box so the doctor can type straight away
  setTimeout(() => {
    const names = document.querySelectorAll('#rx-table-body .rx-med-name');
    names[names.length - 1]?.focus();
  }, 50);
}


function addMedicine(med) {
  if (State.medicines.findIndex(m => String(m.med.id) === String(med.id)) >= 0) {
    toast(`${med.brand} already added`, 'warning');
    return;
  }
  State.medicines.push({
    med,
    route: med.route || routeFromType(med.type),
    frequency: FREQ_OPTS.includes(med.frequency) ? med.frequency : 'Once a day',
    schedule: schedFromTimings(med.timings),
    dosage: med.dose || '1',
    instructions: normInstr(med.timingsNote),
    duration: med.duration,
    // legacy fields kept for templates/old visits
    dose: med.dose,
    timings: med.timings,
    timingsNote: med.timingsNote,
    qty: med.qty || ''
  });
  renderMedicineTable();
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

let _editMedId = null;   // id of the medicine being edited, null = adding new

function openAddMedModal() {
  _editMedId = null;
  document.getElementById('nm-modal-title').textContent = 'Add Medicine';
  document.getElementById('nm-save-btn').textContent = 'Add to Medicine List';
  document.getElementById('modal-add-med').style.display = 'flex';
  switchAddTab('manual');
  setTimeout(() => document.getElementById('nm-brand').focus(), 50);
}

// Set a select's value; if the stored value isn't among the options, add it
function _setSelVal(id, val) {
  const sel = document.getElementById(id);
  if (!sel || val == null || val === '') return;
  sel.value = val;
  if (sel.value !== val) {
    const opt = document.createElement('option');
    opt.textContent = val; opt.value = val; opt.selected = true;
    sel.appendChild(opt);
  }
}

// Open the modal pre-filled with an existing medicine's details for editing
function editMed(id) {
  const med = MEDICINE_DB.find(m => String(m.id) === String(id));
  if (!med) return;
  _editMedId = med.id;
  document.getElementById('nm-modal-title').textContent = 'Edit Medicine';
  document.getElementById('nm-save-btn').textContent = 'Save Changes';
  document.getElementById('nm-brand').value = med.brand || '';
  document.getElementById('nm-content').value = med.content || '';
  _setSelVal('nm-type', med.type || 'TAB');
  _setSelVal('nm-route', med.route || routeFromType(med.type));
  _setSelVal('nm-freq', FREQ_OPTS.includes(med.frequency) ? med.frequency : 'Once a day');
  _setSelVal('nm-dosage', schedFromTimings(med.timings));
  _setSelVal('nm-admin', normInstr(med.timingsNote));
  const d = parseDuration(med.duration);
  document.getElementById('nm-dur-num').value = d.num;
  _setSelVal('nm-dur-unit', d.unit);
  document.getElementById('modal-add-med').style.display = 'flex';
  switchAddTab('manual');
  setTimeout(() => document.getElementById('nm-brand').focus(), 50);
}

function closeAddMedModal() {
  _editMedId = null;
  document.getElementById('modal-add-med').style.display = 'none';
  document.getElementById('nm-modal-title').textContent = 'Add Medicine';
  document.getElementById('nm-save-btn').textContent = 'Add to Medicine List';
  ['nm-brand','nm-content','nm-dur-num'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
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
  const durNum = document.getElementById('nm-dur-num').value.trim();
  const durUnit = document.getElementById('nm-dur-unit').value || 'Days';
  const fields = {
    brand,
    content: document.getElementById('nm-content').value.trim(),
    type: document.getElementById('nm-type').value,
    form: document.getElementById('nm-type').value,
    route: document.getElementById('nm-route').value,
    timings: document.getElementById('nm-dosage').value,       // schedule, e.g. "1-0-1 (Morning-Night)"
    timingsNote: document.getElementById('nm-admin').value,    // instructions
    frequency: document.getElementById('nm-freq').value,
    duration: durNum ? `${durNum} ${durUnit}` : 'As Directed'
  };

  if (_editMedId != null) {
    // Editing an existing medicine — update it in place, keep its id
    const med = MEDICINE_DB.find(m => String(m.id) === String(_editMedId));
    if (med) {
      Object.assign(med, fields);
      saveMedList();
      closeAddMedModal();
      refreshAlphaList();
      toast('✓ ' + brand + ' updated');
      return;
    }
    // fall through to add if it vanished (deleted in another tab)
  }

  MEDICINE_DB.push({ id: 'cm_' + Date.now(), ...fields, dose: '1', qty: '', indications: [] });
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
    if (e.target.closest('.med-del-btn') || e.target.closest('.med-edit-btn')) return; // pressing ✕/✎ itself
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

// Reveal a patient row's delete ✕ only after a long/hard press — prevents
// accidental soft-deletes (the #1 cause of patients "disappearing" into the bin).
function bindPatientRowLongPress() {
  const root = document.getElementById('left-panel');
  if (!root || root._delBound) return;
  root._delBound = true;

  let timer = null, sx = 0, sy = 0, suppressClick = false;
  const clearTimer = () => { if (timer) { clearTimeout(timer); timer = null; } };
  const disarm = () => root.querySelectorAll('.patient-item.del-armed')
    .forEach(r => r.classList.remove('del-armed'));

  // Swallow the click that fires when releasing a long-press (so it doesn't
  // also open the patient).
  root.addEventListener('click', e => {
    if (suppressClick && !e.target.closest('.patient-del-btn')) {
      e.preventDefault(); e.stopPropagation(); suppressClick = false;
    }
  }, true);

  root.addEventListener('pointerdown', e => {
    suppressClick = false;
    if (e.target.closest('.patient-del-btn')) return;   // pressing ✕ itself
    const row = e.target.closest('.patient-item');
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
  root.addEventListener('pointermove', e => {
    if (timer && (Math.abs(e.clientX - sx) > 10 || Math.abs(e.clientY - sy) > 10)) clearTimer();
  }, { passive: true });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev =>
    root.addEventListener(ev, clearTimer, { passive: true }));
  root.addEventListener('scroll', clearTimer, { passive: true, capture: true });

  root.addEventListener('contextmenu', e => {
    const row = e.target.closest('.patient-item');
    if (row) { e.preventDefault(); disarm(); row.classList.add('del-armed'); }
  });
  document.addEventListener('pointerdown', e => {
    if (!e.target.closest('.patient-item.del-armed') && !e.target.closest('.patient-del-btn')) disarm();
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
        <button class="med-edit-btn" title="Edit medicine details" onclick="event.stopPropagation();editMed('${m.id}')">✎</button>
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
        route: routeFromType(med.type),
        frequency: FREQ_OPTS.includes(item.frequency) ? item.frequency : 'Once a day',
        schedule: schedFromTimings(item.timings || med.timings),
        dosage: item.dose || med.dose || '1',
        instructions: normInstr(item.timingsNote || med.timingsNote),
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
  .inv-label { font-size: 18px; font-weight: 700; color: #0d2136; text-align:right; }
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
      <img src="assets/logo.png?v=20260806" style="height:52px;width:52px;object-fit:contain;margin-bottom:4px;display:block;" alt="OSR">
      <div class="clinic-name">OSR — OrthoSportsRobotics Clinic / Aarna Clinic</div>
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
      <p><strong>Patient:</strong> ${esc(p.name)}</p>
      <p><strong>ID:</strong> ${esc(p.id)} &nbsp; <strong>Age/Sex:</strong> ${age}y / ${esc(p.gender || '')}</p>
      <p><strong>Phone:</strong> ${esc(p.phone || '—')}</p>
    </div>
    <div class="info-block" style="text-align:right">
      <p><strong>Payment Mode:</strong> ${esc(payMode)}</p>
    </div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Description</th><th class="amt">Amount (₹)</th></tr></thead>
    <tbody>
      ${items.map((it,i)=>`<tr><td>${i+1}</td><td>${esc(it.desc)}</td><td class="amt">${it.amt > 0 ? it.amt.toLocaleString('en-IN') : '—'}</td></tr>`).join('')}
      <tr class="total-row"><td colspan="2" style="text-align:right">Total</td><td class="amt">₹ ${total.toLocaleString('en-IN')}</td></tr>
    </tbody>
  </table>
  <div class="footer-note">Thank you for visiting OSR — OrthoSportsRobotics Clinic / Aarna Clinic · This is a computer-generated invoice</div>
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
  const msgText = `Dear ${patientName},\n\nYour invoice of ₹${total.toLocaleString('en-IN')} from OSR — OrthoSportsRobotics Clinic / Aarna Clinic dated ${date}.\n\nThank you for visiting.\nDr Chetan M Dojode`;

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
      <div class="tmpl-med-option" onclick="addTmplMed('${String(m.id).replace(/'/g, "\\'")}')">
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
let _savingVisit = false;
async function saveVisit() {
  if (_pdfAllRunning) { toast('PDF backup running — please wait a moment…', 'warning'); return; }
  if (!State.currentPatient || !State.currentVisit) {
    toast('Please select a patient first', 'error'); return;
  }
  if (_savingVisit) return;                          // guard against double-tap
  _savingVisit = true;
  clearTimeout(_autoSaveTimer);                      // cancel any pending debounced save
  setTimeout(() => { _savingVisit = false; }, 1200); // release even if a later step throws

  // Collect the form + medicines via the shared serializer (single source of truth)
  _collectVisitFromForm();
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
  const msgText = `Dear ${patientName},\n\nYour prescription from Dr Chetan M Dojode dated ${date}${diagnosis ? '\nDiagnosis: ' + diagnosis : ''}.\n\nOSR — OrthoSportsRobotics Clinic / Aarna Clinic\nPh: +91 ${DOCTOR.phone || ''}`;

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
  const now = new Date(v.date || Date.now());   // prescription date/time (editable)

  const medRows = State.medicines.map((item, i) => {
    const m = item.med;
    return `
      <tr class="print-med-row">
        <td class="pm-num">${i + 1})</td>
        <td class="pm-med">
          <strong>${esc(m.type)}. ${esc(m.brand)}</strong><br>
          <span class="pm-comp">Content : ${esc(m.content)}</span>
        </td>
        <td class="pm-route">${esc(item.route || routeFromType(m.type))}</td>
        <td class="pm-timings">${esc(item.frequency || '')}</td>
        <td class="pm-timings">${esc(item.schedule || schedFromTimings(item.timings))}</td>
        <td class="pm-dose">${esc(item.dosage || item.dose || '1')}</td>
        <td class="pm-timings">${esc(item.instructions || normInstr(item.timingsNote))}</td>
        <td class="pm-dur">${esc(item.duration)}</td>
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
  .pm-route { width: 80px; text-align: center; }
  .pm-dose { width: 40px; text-align: center; }
  .pm-timings { width: 70px; text-align: center; }
  .pm-dur { width: 90px; }
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
      <img src="assets/logo.png?v=20260806" style="height:70px;width:70px;object-fit:contain;" alt="OSR — OrthoSportsRobotics Clinic / Aarna Clinic">
    </div>
  </div>

  <!-- Patient Bar -->
  <div class="patient-bar">
    <span>${esc(p.id)}: ${esc(p.name)} (${age}y, ${esc(p.gender) || 'M'}) &nbsp;&nbsp; ${esc(p.phone || '')}</span>
    <span>Date &amp; Time : ${formatDateTime(now)}</span>
  </div>

  <!-- Chief Complaint -->
  ${v.complaints ? `<div class="section-block"><span class="section-label">Chief Complaint: </span><span class="section-value">${escNl(v.complaints)}</span></div>` : ''}

  <!-- HoPi -->
  ${v.hopi ? `<div class="section-block"><span class="section-label">History of Present Illness: </span><span class="section-value">${escNl(v.hopi)}</span></div>` : ''}

  <!-- Past History + Allergies -->
  ${v.pastHistory ? `<div class="section-block"><span class="section-label">Past Medical History: </span><span class="section-value">${escNl(v.pastHistory)}</span></div>` : ''}
  ${v.allergies ? `<div class="section-block"><span class="section-label">Allergies: </span><span class="section-value">${escNl(v.allergies)}</span></div>` : ''}

  <!-- Examination -->
  ${v.examination ? `<div class="section-block"><span class="section-label">Examination: </span><span class="section-value">${escNl(v.examination)}</span></div>` : ''}

  <!-- Investigations -->
  ${v.investigations ? `<div class="section-block"><span class="section-label">Investigations: </span><span class="section-value">${escNl(v.investigations)}</span></div>` : ''}

  <!-- Diagnosis -->
  ${v.diagnosis ? `<div class="section-block"><span class="section-label">Diagnosis: </span><span class="section-value"><strong>${esc(v.diagnosis)}</strong>${v.icd10 ? ` <span style="color:#666;font-size:10px;">(${esc(v.icd10)})</span>` : ''}</span></div>` : ''}

  <!-- Rx -->
  ${State.medicines.length ? `
  <div class="rx-symbol">&#x211E;</div>
  <table class="rx">
    <thead>
      <tr>
        <th></th>
        <th>Medication</th>
        <th>Route</th>
        <th>Frequency</th>
        <th>Schedule</th>
        <th>Dosage</th>
        <th>Instructions</th>
        <th>Duration</th>
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
    ${adviceLines.map(a => `<div class="advice-item">${esc(a)}</div>`).join('')}
  </div>
  ` : ''}

  <!-- Procedure Done -->
  ${v.procedure ? `<div class="section-block" style="margin-top:8px;"><span class="section-label">Procedure Done: </span><span class="section-value">${escNl(v.procedure)}</span></div>` : ''}

  <!-- Follow Up Plan -->
  ${v.followUp ? `<div class="followup-box"><strong>Follow Up:</strong> ${esc(v.followUp)}</div>` : ''}

  <!-- Referral -->
  ${v.referredTo ? `<div class="section-block" style="margin-top:6px;"><span class="section-label">Referred To: </span><span class="section-value">${escNl(v.referredTo)}</span></div>` : ''}

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
  if (_pdfAllRunning) { toast('PDF backup running — please wait a moment…', 'warning'); return; }
  // Flush pending edits of the visit being left before swapping
  if (State.currentPatient && State.currentVisit) {
    clearTimeout(_autoSaveTimer);
    try { await _autoSaveNow(); } catch (e) { console.warn('Flush save on visit load failed', e); }
  }
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
      med, route: m.route || routeFromType(m.type || med.type),
      schedule: m.schedule || schedFromTimings(m.timings || med.timings),
      dosage: m.dosage || m.dose || '1',
      instructions: m.instructions || normInstr(m.timingsNote || med.timingsNote),
      dose: m.dose,
      timings: m.timings || m.freq || med.timings,
      timingsNote: m.timingsNote || med.timingsNote || 'After Food',
      frequency: m.frequency || 'Once a day',
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
    const resp = await fetch('assets/logo.png?v=20260806');
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

  // Ask the browser to keep our storage (prevents the eviction that wipes the
  // medicine list). Best-effort — supported browsers grant it for installed PWAs.
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}

  // Recover the medicine list from the durable IndexedDB mirror if localStorage
  // was evicted/re-seeded, then keep tabs in sync so none can overwrite it.
  await reconcileMedList();
  try {
    window._medBC = new BroadcastChannel('aarna-opd-med');
    window._medBC.onmessage = (ev) => {
      if (ev.data === 'med-updated') {
        try {
          const raw = localStorage.getItem(MEDS_KEY);
          if (raw) { const parsed = JSON.parse(raw); if (Array.isArray(parsed)) MEDICINE_DB = parsed; }
        } catch (e) {}
        if (typeof refreshAlphaList === 'function') refreshAlphaList();
      }
    };
  } catch (e) { /* BroadcastChannel unsupported */ }

  await initPatientPanel();
  bindPatientRowLongPress();
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

  // Auto-reconnect Google Drive silently if previously connected, then verify
  // backup health (warns loudly if backups have silently stopped).
  if (localStorage.getItem('gdrive_connected') === '1' && localStorage.getItem('gdrive_client_id')) {
    gdriveAutoReconnect();
  }
  // Give the silent reconnect ~4s to complete, then check whether backups are healthy
  setTimeout(checkBackupHealth, 4000);

  // Multi-tab guard: two tabs both autosaving can overwrite each other's edits.
  // Warn any tab opened while another is already running so the doctor uses one.
  try {
    const bc = new BroadcastChannel('aarna-opd');
    bc.onmessage = (ev) => {
      if (ev.data === 'ping') { bc.postMessage('pong'); }        // existing tab replies
      else if (ev.data === 'pong' && !window._multiTabWarned) {  // another tab exists
        window._multiTabWarned = true;
        toast('⚠ OSR OPD is already open in another tab/window. Use only ONE at a time to avoid overwriting patient data.', 'warning', 9000);
      }
    };
    bc.postMessage('ping');
  } catch (e) { /* BroadcastChannel unsupported — non-critical */ }

  // PWA "New Patient" app shortcut → open the registration modal on launch
  try {
    if (new URLSearchParams(location.search).get('action') === 'new-patient') {
      openNewPatientModal();
    }
  } catch (e) {}
}

async function gdriveAutoReconnect() {
  try {
    await gdriveRequestToken(true);   // silent re-auth
    updateGdriveUI();
    gdriveStartAutoBackup();
    gdriveBackupNow();                // back up immediately on reconnect
  } catch (e) {
    // Silent reconnect failed (Google session gone / cookies blocked). Make it
    // VISIBLE so backups never stop unnoticed — the doctor can reconnect manually.
    console.warn('Drive silent reconnect failed', e);
    updateGdriveUI();                 // shows "⚠ Reconnect needed — backups paused"
  }
}

document.addEventListener('DOMContentLoaded', init);

// ─── Backup & Restore ─────────────────────────────────────────────────────────
// Main Backup button: opens the modal on the Local tab (backup/restore only).
// Google Drive and PDF folder live in their own tabs, each with its own
// "Backup Now" button — nothing runs automatically.
function openBackupModal() {
  document.getElementById("modal-backup").style.display = "flex";
  const cid = localStorage.getItem("gdrive_client_id") || "";
  document.getElementById("gdrive-client-id").value = cid;
  updateGdriveUI();
  updatePdfFolderUI();
  switchBackupTab('local');
}

function switchBackupTab(which) {
  ['local', 'drive', 'pdf'].forEach(t => {
    document.getElementById(`bk-tab-${t}`)?.classList.toggle('active', t === which);
    const pane = document.getElementById(`bk-pane-${t}`);
    if (pane) pane.style.display = t === which ? 'block' : 'none';
  });
}

// "Backup Now" in the Google Drive section — full JSON of ALL patients to Drive
async function driveBackupNowClick() {
  if (!GDrive.token) { toast('Connect Google Drive first', 'error'); return; }
  if (GDrive._backupInProgress) { toast('Drive backup already running…', 'warning'); return; }
  // Include the open patient's very latest keystrokes
  if (State.currentPatient && State.currentVisit) {
    clearTimeout(_autoSaveTimer);
    try { await _autoSaveNow(); } catch (e) {}
  }
  toast('Backing up all patients to Google Drive…', 'success', 2500);
  GDrive._backupInProgress = true;
  gdriveBackupNow()
    .then(() => toast('Drive backup complete ✓ (all patients)', 'success', 3500))
    .catch(() => toast('Drive backup failed', 'error'))
    .finally(() => { GDrive._backupInProgress = false; });
}

// "Backup Now" in the PDF folder section — regenerates prescription PDFs for
// ALL patients' visits changed since the last run (not just the open patient).
const PDF_ALL_KEY = 'pdf_backup_all_at';

async function backupAllPdfsNow() {
  if (_pdfAllRunning) { toast('PDF backup already running…', 'warning'); return; }
  if (!PdfStore.dirHandle && !GDrive.token) {
    toast('Select a folder or connect Drive first', 'error'); return;
  }
  // Flush any pending edit of the open patient BEFORE raising the sweep flag
  // and swapping State, so their unsaved changes are neither lost nor misfiled.
  clearTimeout(_autoSaveTimer);
  await _autoSaveNow();
  _pdfAllRunning = true;
  try {
    const since = parseInt(localStorage.getItem(PDF_ALL_KEY) || '0', 10);
    const patients = await DB.getAllPatients();
    const jobs = [];
    for (const p of patients) {
      const visits = await DB.getPatientVisits(p.id);
      for (const v of visits) {
        const changedAt = v.savedAt || v.date || 0;
        if (changedAt > since) jobs.push({ p, v });
      }
    }
    if (!jobs.length) { toast('All prescriptions already backed up ✓', 'success', 3000); return; }
    if (jobs.length > 25 &&
        !confirm(`Generate & back up ${jobs.length} prescription PDFs?\n\nThis may take a few minutes.`)) return;

    // Temporarily swap State to render each visit's PDF, then restore
    const keep = { p: State.currentPatient, v: State.currentVisit, m: State.medicines };
    let done = 0, failed = 0;
    toast(`Backing up ${jobs.length} prescription${jobs.length > 1 ? 's' : ''}…`, 'success', 3000);
    for (const { p, v } of jobs) {
      try {
        State.currentPatient = p;
        State.currentVisit = v;
        State.medicines = (v.medicines || []).map(m => ({
          med: { id: m.id, brand: m.brand, content: m.content, type: m.type, form: m.form },
          route: m.route || routeFromType(m.type),
          schedule: m.schedule || schedFromTimings(m.timings),
          dosage: m.dosage || m.dose || '1',
          instructions: m.instructions || normInstr(m.timingsNote),
          dose: m.dose, timings: m.timings, timingsNote: m.timingsNote,
          frequency: m.frequency || 'Once a day',
          duration: m.duration || 'As Directed',
          qty: m.qty || '', details: m.details || '', notes: m.notes || ''
        }));
        const html = await buildPrescriptionHtml();
        if (!html) { failed++; continue; }
        const blob = await renderHtmlToPdfBlob(html);
        const phone = (p.phone || '').replace(/\D/g, '');
        const visitDate = v.date
          ? new Date(v.date).toISOString().slice(0, 10).replace(/-/g, '')
          : new Date().toISOString().slice(0, 10).replace(/-/g, '');
        await autoBackupPdf(blob, `${visitDate}-${phone}-RX.pdf`, p.id);
        done++;
      } catch (e) { console.error('PDF backup failed for', p.id, e); failed++; }
    }
    // Restore whatever was open before
    State.currentPatient = keep.p; State.currentVisit = keep.v; State.medicines = keep.m;
    if (keep.p) renderMedicineTable();

    localStorage.setItem(PDF_ALL_KEY, String(Date.now()));
    setLastBackupInfo(`PDF backup: ${done} saved${failed ? `, ${failed} failed` : ''} at ${new Date().toLocaleTimeString('en-IN')}`);
    toast(`✓ ${done} prescription PDF${done !== 1 ? 's' : ''} backed up${failed ? ` · ${failed} failed` : ''}`, failed ? 'warning' : 'success', 4500);
  } finally {
    _pdfAllRunning = false;
    // Re-arm autosave: anything typed while the sweep suppressed it gets saved
    if (State.currentPatient && State.currentVisit) scheduleAutoSave();
  }
}
function closeBackupModal() {
  document.getElementById("modal-backup").style.display = "none";
}

async function exportBackup() {
  // Include the open patient's very latest keystrokes in the export
  if (State.currentPatient && State.currentVisit) {
    clearTimeout(_autoSaveTimer);
    try { await _autoSaveNow(); } catch (e) {}
  }
  const [patients, templates, appointments] = await Promise.all([
    DB.getAllPatients(), DB.getAllTemplates(), DB.getAllAppointments()
  ]);
  // Fetch all visits in parallel
  const visitArrays = await Promise.all(patients.map(p => DB.getPatientVisits(p.id)));
  const allVisits = visitArrays.flat();
  const data = {
    version: 4, exportedAt: new Date().toISOString(),
    clinic: "OSR — OrthoSportsRobotics Clinic / Aarna Clinic",
    patients, visits: allVisits, templates, appointments,
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
  if (data.appointments && Array.isArray(data.appointments)) {
    for (const a of data.appointments) {
      if (a && a.id && a.patientId && a.date) {
        try { await DB.saveAppointment(a); } catch(e) { errors++; }
      }
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
  // Reload the open patient so stale in-memory data can't overwrite the
  // freshly imported records on the next autosave.
  if (State.currentPatient) {
    const openId = State.currentPatient.id;
    clearTimeout(_autoSaveTimer);
    State.currentPatient = null; State.currentVisit = null; State.medicines = [];
    await loadPatient(openId);
  }
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

const LAST_DRIVE_OK_KEY = 'last_drive_backup_at';

// Request/refresh a Drive access token as a Promise (used by connect, silent
// reconnect, and 401-retry). Resolves with the token or rejects on failure.
function gdriveRequestToken(silent) {
  return new Promise((resolve, reject) => {
    const clientId = localStorage.getItem('gdrive_client_id');
    if (!clientId || typeof google === 'undefined' || !google.accounts) {
      return reject(new Error('gis-unavailable'));
    }
    try {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.file',
        prompt: silent ? 'none' : '',
        callback: (resp) => {
          if (resp && resp.access_token) {
            GDrive.token = resp.access_token;
            GDrive._tokenExpiry = Date.now() + 55 * 60 * 1000;
            localStorage.setItem('gdrive_connected', '1');
            resolve(resp.access_token);
          } else {
            reject(new Error((resp && resp.error) || 'token-failed'));
          }
        }
      });
      client.requestAccessToken({ prompt: silent ? 'none' : '' });
    } catch (e) { reject(e); }
  });
}

function updateGdriveUI() {
  const connected = !!GDrive.token;
  const statusEl = document.getElementById("gdrive-status");
  const connectBtn = document.getElementById("gdrive-connect-btn");
  const disconnectBtn = document.getElementById("gdrive-disconnect-btn");
  const icon = document.getElementById("backup-status-icon");
  if (!statusEl) return;
  if (connected) {
    const last = parseInt(localStorage.getItem(LAST_DRIVE_OK_KEY) || '0', 10);
    statusEl.textContent = last
      ? "Connected — last backup " + new Date(last).toLocaleString("en-IN")
      : "Connected — auto-backup every 10 min";
    statusEl.style.color = "#16a34a";
    if (connectBtn) connectBtn.style.display = "none";
    if (disconnectBtn) disconnectBtn.style.display = "";
    if (icon) { icon.textContent = "✓"; icon.style.color = "#16a34a"; icon.title = "Google Drive backup active"; }
  } else {
    const wasConnected = localStorage.getItem("gdrive_connected") === "1";
    statusEl.textContent = wasConnected ? "⚠ Reconnect needed — backups paused" : "Not connected";
    statusEl.style.color = wasConnected ? "#dc2626" : "var(--text3)";
    if (connectBtn) connectBtn.style.display = "";
    if (disconnectBtn) disconnectBtn.style.display = "none";
    if (icon) {
      icon.textContent = wasConnected ? "!" : "☁";
      icon.style.color = wasConnected ? "#dc2626" : "";
      icon.title = wasConnected ? "Google Drive backup NEEDS RECONNECT" : "Backup";
    }
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

let _driveFailToastAt = 0;

// Performs the actual upload. Returns true on success. Throws {status} on HTTP error.
async function _gdriveUpload(json) {
  const folderId = await gdriveEnsureFolder();
  if (GDrive.fileId) {
    const patchRes = await fetch("https://www.googleapis.com/upload/drive/v3/files/" + GDrive.fileId + "?uploadType=media", {
      method: "PATCH",
      headers: { Authorization: "Bearer " + GDrive.token, "Content-Type": "application/json" },
      body: json
    });
    if (patchRes.status === 404) {
      GDrive.fileId = null; localStorage.removeItem("gdrive_file_id");   // stale ID → recreate
    } else if (!patchRes.ok) {
      const err = new Error("Drive PATCH failed: " + patchRes.status); err.status = patchRes.status; throw err;
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
    if (!res.ok) { const err = new Error("Drive POST failed: " + res.status); err.status = res.status; throw err; }
    const created = await res.json();
    GDrive.fileId = created.id;
    localStorage.setItem("gdrive_file_id", GDrive.fileId);
  }
}

async function gdriveBackupNow() {
  if (!GDrive.token) return false;
  let json;
  try {
    const [patients, templates, appointments] = await Promise.all([
      DB.getAllPatients(), DB.getAllTemplates(), DB.getAllAppointments()
    ]);
    const visitArrays = await Promise.all(patients.map(p => DB.getPatientVisits(p.id)));
    const allVisits = visitArrays.flat();
    json = JSON.stringify({
      version: 4, exportedAt: new Date().toISOString(),
      clinic: "OSR — OrthoSportsRobotics Clinic / Aarna Clinic",
      patients, visits: allVisits, templates, appointments,
      medList: JSON.parse(localStorage.getItem(MEDS_KEY) || "[]"),
      medRepository: JSON.parse(localStorage.getItem("med_repository") || "[]")
    });
  } catch (e) {
    console.error("Drive backup: could not read DB", e);
    return false;
  }

  try {
    await _gdriveUpload(json);
  } catch (e) {
    // Expired/invalid token → refresh once and retry the upload
    if (e.status === 401 || e.status === 403) {
      try {
        await gdriveRequestToken(true);
        await _gdriveUpload(json);
      } catch (e2) {
        return _gdriveBackupFailed(e2);
      }
    } else {
      return _gdriveBackupFailed(e);
    }
  }

  // Success
  localStorage.setItem(LAST_DRIVE_OK_KEY, String(Date.now()));
  setLastBackupInfo("Last Drive backup: " + new Date().toLocaleTimeString("en-IN"));
  const icon = document.getElementById("backup-status-icon");
  if (icon) { icon.textContent = "✓"; icon.style.color = "#16a34a"; icon.title = "Google Drive backup active"; }
  updateGdriveUI();
  return true;
}

function _gdriveBackupFailed(e) {
  console.error("Drive backup failed", e);
  const icon = document.getElementById("backup-status-icon");
  if (icon) { icon.textContent = "!"; icon.style.color = "#dc2626"; icon.title = "Google Drive backup FAILED — check connection"; }
  // Loud but throttled: warn at most once every 5 minutes so it isn't spammy
  if (Date.now() - _driveFailToastAt > 5 * 60 * 1000) {
    _driveFailToastAt = Date.now();
    toast("⚠ Google Drive backup failed — your data is NOT backed up to Drive. Open Backup to reconnect.", "error", 6000);
  }
  return false;
}

// Warn on load if Drive was set up but hasn't backed up successfully in >24h
function checkBackupHealth() {
  if (localStorage.getItem("gdrive_connected") !== "1") return;
  const last = parseInt(localStorage.getItem(LAST_DRIVE_OK_KEY) || "0", 10);
  const age = Date.now() - last;
  if (!last || age > 24 * 60 * 60 * 1000) {
    const days = last ? Math.floor(age / (24 * 60 * 60 * 1000)) : null;
    toast(
      last
        ? `⚠ No Google Drive backup for ${days}+ day(s). Open Backup and reconnect to protect your data.`
        : "⚠ Google Drive is set up but no backup has completed yet. Open Backup to reconnect.",
      "error", 7000
    );
    const icon = document.getElementById("backup-status-icon");
    if (icon) { icon.textContent = "!"; icon.style.color = "#dc2626"; icon.title = "Backup overdue — reconnect Google Drive"; }
  }
}

function gdriveStartAutoBackup() {
  clearInterval(GDrive.autoTimer);
  let lastAutoBackup = 0;
  GDrive.autoTimer = setInterval(() => {
    // Silently refresh token 5 minutes before it expires (~55-min window)
    if (GDrive._tokenExpiry && Date.now() > GDrive._tokenExpiry - 5 * 60 * 1000) {
      gdriveAutoReconnect();
      return;
    }
    // Full-DB upload every 10 minutes is plenty; every 60s would hammer
    // Drive quota and re-serialize the whole database each minute.
    if (Date.now() - lastAutoBackup >= 10 * 60 * 1000) {
      lastAutoBackup = Date.now();
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
  const now = new Date(v.date || Date.now());   // prescription date/time (editable)
  const logoSrc = await getLogoDataUrl();

  const medRows = State.medicines.map((item, i) => {
    const m = item.med;
    return `<tr class="print-med-row">
      <td class="pm-num">${i + 1})</td>
      <td class="pm-med"><strong>${esc(m.type)}. ${esc(m.brand)}</strong><br>
        <span class="pm-comp">${esc(m.content)}</span></td>
      <td class="pm-route">${esc(item.route || routeFromType(m.type))}</td>
      <td class="pm-timings">${esc(item.frequency || '')}</td>
      <td class="pm-timings">${esc(item.schedule || schedFromTimings(item.timings))}</td>
      <td class="pm-dose">${esc(item.dosage || item.dose || '1')}</td>
      <td class="pm-timings">${esc(item.instructions || normInstr(item.timingsNote))}</td>
      <td class="pm-dur">${esc(item.duration || '')}</td>
    </tr>`;
  }).join('');

  const adviceLines = (v.advice || '').split('\n').filter(Boolean);

  return `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family: Arial, sans-serif; font-size:11px; color:#000; background:#fff; }
.page { width:210mm; min-height:297mm; padding:12mm 14mm 10mm; display:flex; flex-direction:column; }
.page-content { flex:1; }
.footer { margin-top:auto; border-top:1.5px solid #000; padding-top:8px; }
.footer-label { font-weight:700; font-size:10px; text-decoration:underline; margin-bottom:6px; }
.footer-locs { display:flex; justify-content:space-between; }
.footer-loc { width:48%; font-size:9px; line-height:1.5; }
.footer-loc-name { font-weight:700; font-size:10px; }
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
.pm-num { width:24px; font-weight:700; }
.pm-med { width:auto; }
.pm-route { width:70px; text-align:center; }
.pm-timings { width:75px; text-align:center; }
.pm-dose { width:42px; text-align:center; }
.pm-dur { width:60px; text-align:center; }
.pm-comp { font-size:9px; color:#444; }
.advice-section { margin-top:10px; }
.advice-item { padding:1px 0 1px 12px; position:relative; font-size:10.5px; }
.advice-item::before { content:'•'; position:absolute; left:0; }
${v.followUp ? `.followup-box { margin-top:10px; border:1px dashed #999; padding:5px 10px; font-size:10.5px; display:inline-block; }` : ''}
</style></head><body><div class="page">
<div class="page-content">
<div class="header">
  <div>
    <div class="doctor-name">${DOCTOR.name}</div>
    <div class="doctor-title">${DOCTOR.title} – ${DOCTOR.subtitle}</div>
    <div class="doctor-quals">${DOCTOR.qualifications}<br>${DOCTOR.fellowships.join('<br>')}<br>${DOCTOR.kmc} | Ph: ${DOCTOR.phone}</div>
  </div>
  ${logoSrc ? `<img src="${logoSrc}" style="height:70px;width:70px;object-fit:contain;">` : ''}
</div>
<div class="patient-bar">
  <span>${esc(p.id)}: ${esc(p.name)} (${age}y, ${esc(p.gender) || 'M'}) &nbsp; ${esc(p.phone || '')}</span>
  <span>${formatDateTime(now)}</span>
</div>
${v.complaints ? `<div class="section-block"><span class="section-label">Chief Complaint: </span>${escNl(v.complaints)}</div>` : ''}
${v.hopi ? `<div class="section-block"><span class="section-label">History of Present Illness: </span>${escNl(v.hopi)}</div>` : ''}
${v.pastHistory ? `<div class="section-block"><span class="section-label">Past Medical History: </span>${escNl(v.pastHistory)}</div>` : ''}
${v.allergies ? `<div class="section-block"><span class="section-label">Allergies: </span>${escNl(v.allergies)}</div>` : ''}
${v.examination ? `<div class="section-block"><span class="section-label">Examination: </span>${escNl(v.examination)}</div>` : ''}
${v.investigations ? `<div class="section-block"><span class="section-label">Investigations: </span>${escNl(v.investigations)}</div>` : ''}
${v.diagnosis ? `<div class="section-block"><span class="section-label">Diagnosis: </span><strong>${esc(v.diagnosis)}</strong>${v.icd10 ? ` <span style="color:#666;font-size:10px;">(${esc(v.icd10)})</span>` : ''}</div>` : ''}
${State.medicines.length ? `<div class="rx-symbol">&#x211E;</div>
<table class="rx"><thead><tr><th></th><th>Medication</th><th>Route</th><th>Frequency</th><th>Schedule</th><th>Dosage</th><th>Instructions</th><th>Duration</th></tr></thead>
<tbody>${medRows}</tbody></table>` : ''}
${adviceLines.length ? `<div class="advice-section"><div class="section-label">Advice:</div>${adviceLines.map(a => `<div class="advice-item">${esc(a)}</div>`).join('')}</div>` : ''}
${v.procedure ? `<div class="section-block" style="margin-top:8px;"><span class="section-label">Procedure Done: </span>${escNl(v.procedure)}</div>` : ''}
${v.followUp ? `<div class="followup-box"><strong>Follow Up:</strong> ${esc(v.followUp)}</div>` : ''}
${v.referredTo ? `<div class="section-block" style="margin-top:6px;"><span class="section-label">Referred To: </span>${escNl(v.referredTo)}</div>` : ''}
</div>
<div class="footer">
  <div class="footer-label">CONSULTATION LOCATIONS:</div>
  <div class="footer-locs">
    ${DOCTOR.clinics.map(c => `
      <div class="footer-loc">
        <div class="footer-loc-name">${esc(c.name)}</div>
        <div>${escNl(c.address)}</div>
        <div>${esc(c.hours)}</div>
      </div>`).join('')}
  </div>
</div>
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
.inv-label { font-size:18px;font-weight:700;color:#0d2136;text-align:right; }
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
      <div class="clinic-name">OSR — OrthoSportsRobotics Clinic / Aarna Clinic</div>
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
      <p><strong>Patient:</strong> ${esc(p.name)}</p>
      <p><strong>ID:</strong> ${esc(p.id)} &nbsp; <strong>Age/Sex:</strong> ${age}y / ${esc(p.gender||'')}</p>
      <p><strong>Phone:</strong> ${esc(p.phone||'—')}</p>
    </div>
    <div class="info-block" style="text-align:right"><p><strong>Payment Mode:</strong> ${esc(payMode)}</p></div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Description</th><th class="amt">Amount (₹)</th></tr></thead>
    <tbody>
      ${items.map((it,i)=>`<tr><td>${i+1}</td><td>${esc(it.desc)}</td><td class="amt">${it.amt>0?it.amt.toLocaleString('en-IN'):'—'}</td></tr>`).join('')}
      <tr class="total-row"><td colspan="2" style="text-align:right">Total</td><td class="amt">₹ ${total.toLocaleString('en-IN')}</td></tr>
    </tbody>
  </table>
  <div class="footer-note">Thank you for visiting OSR — OrthoSportsRobotics Clinic / Aarna Clinic · Computer-generated invoice</div>
</div></body></html>`;
}

async function renderHtmlToPdfBlobA5(html) {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;height:560px;border:none;';
    document.body.appendChild(iframe);

    const cleanup = () => { if (iframe.parentNode) document.body.removeChild(iframe); };
    const timeout = setTimeout(() => { cleanup(); reject(new Error('Invoice PDF render timed out')); }, 20000);

    iframe.onload = async () => {
      try {
        await new Promise(r => setTimeout(r, 500));
        const body = iframe.contentDocument.body;
        const fullHeight = Math.max(body.scrollHeight, body.offsetHeight, 560);
        const canvas = await html2canvas(body, {
          scale: 2, useCORS: true, allowTaint: true,
          width: 794, height: fullHeight, windowWidth: 794, windowHeight: fullHeight
        });
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation:'landscape', unit:'px', format:'a5', compress:true });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const imgW = pageW;
        const imgH = canvas.height * (pageW / canvas.width);
        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        let heightLeft = imgH, position = 0;
        pdf.addImage(imgData, 'JPEG', 0, position, imgW, imgH);
        heightLeft -= pageH;
        while (heightLeft > 0.5) {
          position -= pageH;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, imgW, imgH);
          heightLeft -= pageH;
        }
        clearTimeout(timeout);
        resolve(pdf.output('blob'));
      } catch(e) { clearTimeout(timeout); reject(e); }
      finally { cleanup(); }
    };
    iframe.srcdoc = html;
  });
}

// Render prescription + invoice as a combined multi-page PDF
async function renderCombinedPdfBlob(rxHtml, invHtml) {
  // Capture full content height so nothing is clipped; return image + its px size
  const renderPage = (html, w, minH) => new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    iframe.style.cssText = `position:fixed;left:-9999px;top:0;width:${w}px;height:${minH}px;border:none;`;
    document.body.appendChild(iframe);
    const cleanup = () => { if (iframe.parentNode) document.body.removeChild(iframe); };
    const timeout = setTimeout(() => { cleanup(); reject(new Error('PDF page render timed out')); }, 20000);
    iframe.onload = async () => {
      try {
        await new Promise(r => setTimeout(r, 500));
        const body = iframe.contentDocument.body;
        const fullHeight = Math.max(body.scrollHeight, body.offsetHeight, minH);
        const canvas = await html2canvas(body, {
          scale:2, useCORS:true, allowTaint:true,
          width:w, height:fullHeight, windowWidth:w, windowHeight:fullHeight
        });
        clearTimeout(timeout);
        resolve({ data: canvas.toDataURL('image/jpeg', 0.92), cw: canvas.width, ch: canvas.height });
      } catch(e) { clearTimeout(timeout); reject(e); }
      finally { cleanup(); }
    };
    iframe.srcdoc = html;
  });

  const [rx, inv] = await Promise.all([
    renderPage(rxHtml, 794, 1123),
    renderPage(invHtml, 794, 560)
  ]);

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit:'px', format:'a4', compress:true });

  // Adds an image across as many pages of (pageW×pageH) as needed.
  // Assumes the target page already exists as the current page.
  const addPaginated = (img, pageW, pageH, orientation) => {
    const imgW = pageW;
    const imgH = img.ch * (pageW / img.cw);
    let heightLeft = imgH, position = 0;
    pdf.addImage(img.data, 'JPEG', 0, position, imgW, imgH);
    heightLeft -= pageH;
    while (heightLeft > 0.5) {
      position -= pageH;
      pdf.addPage([pageW, pageH], orientation);
      pdf.addImage(img.data, 'JPEG', 0, position, imgW, imgH);
      heightLeft -= pageH;
    }
  };

  // Page(s) 1..n: A4 prescription
  const a4W = pdf.internal.pageSize.getWidth();
  const a4H = pdf.internal.pageSize.getHeight();
  addPaginated(rx, a4W, a4H, 'portrait');

  // Following page(s): A5 landscape invoice
  const a5W = a4W;
  const a5H = a4W * 0.707;
  pdf.addPage([a5W, a5H], 'landscape');
  addPaginated(inv, a5W, a5H, 'landscape');

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
    // Start at one A4 page tall; it grows to fit the real content below.
    iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;height:1123px;border:none;';
    document.body.appendChild(iframe);

    const cleanup = () => { if (iframe.parentNode) document.body.removeChild(iframe); };
    const timeout = setTimeout(() => { cleanup(); reject(new Error('PDF render timed out')); }, 20000);

    iframe.onload = async () => {
      try {
        await new Promise(r => setTimeout(r, 500)); // let fonts/images settle
        const body = iframe.contentDocument.body;
        // Capture the FULL content height so nothing at the bottom is clipped
        const fullHeight = Math.max(body.scrollHeight, body.offsetHeight, 1123);
        const canvas = await html2canvas(body, {
          scale: 2, useCORS: true, allowTaint: true,
          width: 794, height: fullHeight,
          windowWidth: 794, windowHeight: fullHeight
        });
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ unit: 'px', format: 'a4', compress: true });
        const pageW = pdf.internal.pageSize.getWidth();
        const pageH = pdf.internal.pageSize.getHeight();
        const imgW = pageW;
        const imgH = canvas.height * (pageW / canvas.width);
        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        // Slice the tall image across as many A4 pages as needed
        let heightLeft = imgH;
        let position = 0;
        pdf.addImage(imgData, 'JPEG', 0, position, imgW, imgH);
        heightLeft -= pageH;
        while (heightLeft > 0.5) {
          position -= pageH;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, position, imgW, imgH);
          heightLeft -= pageH;
        }
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

