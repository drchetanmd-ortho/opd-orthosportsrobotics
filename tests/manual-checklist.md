# Aarna OPD — Pre-Deploy Manual Test Checklist

Run before every GitHub push. ~10 minutes.
Open the app at: https://drchetanmd-ortho.github.io/opd-orthosportsrobotics/

---

## PATIENT FLOW
- [ ] Register new patient with a 10-digit phone → ID format is `YYYYMMDD-PHONE`
- [ ] **Double-tap "Register Patient" fast → only ONE patient is created**
- [ ] New Patient modal → nothing pre-selected (no gender highlighted; age/height/weight show "e.g." hints)
- [ ] Click Edit Patient → title shows "✏️ Edit Patient"; close → resets to "+ New Patient"
- [ ] "+ New" works again after finishing a patient (no refresh needed)

## CONSULTATION — AUTO-SAVE (most important)
- [ ] Type in Complaints → **immediately switch to another patient → switch back → text retained**
- [ ] Type in Diagnosis → **refresh the page mid-typing → reload patient → text retained**
- [ ] Close tab completely → reopen → same patient → fields and medicines reload
- [ ] Type text containing `<` and `>` (e.g. "ROM < 90") → saves and prints correctly

## Rx PRESCRIPTION TABLE
- [ ] Columns: # Type Medicine Route Frequency Schedule Dosage Instructions Duration Notes ✕
- [ ] Add medicine via search row → row appears with defaults (route auto from type)
- [ ] Schedule shows combined style, e.g. `1-0-1 (Morning-Night)`
- [ ] Duration = number + unit (Days/Weeks/Months/Years); blank number = "As Directed"
- [ ] Edit brand/composition text in a row → switch patient and back → edit retained
- [ ] **＋ Blank** button → empty editable row; type a one-off medicine → saves with visit; does NOT appear in Medicines list
- [ ] Right-panel ✓ marks RESET when switching patients (no stale ticks)

## MEDICINES LIST (right panel / Medicines tab)
- [ ] ＋ Add Medicine → Enter manually: Route/Frequency/Schedule/Instructions/Duration in new format
- [ ] Paste/link tab: paste 3 lines "Brand - Composition" → all added, duplicates skipped
- [ ] Paste a single pharmacy URL → reads or falls back to manual entry (offline → manual prompt)
- [ ] Long-press a medicine row → red ✕ appears → delete → **permanent** (refresh: still gone)
- [ ] Normal tap never deletes

## PRESCRIPTION OUTPUT
- [ ] Print Rx → print dialog; PDF saved to folder as `YYYYMMDD-PHONE-RX.pdf`
- [ ] Send → Download PDF → **footer with both clinic locations present**
- [ ] Sent PDF has ALL sections (HoPI, Examination, Investigations…) same as saved PDF
- [ ] Long prescription (8+ meds + long advice) → flows to page 2, nothing cut off
- [ ] PDF logo visible; WhatsApp link has correct number (no double 91)

## INVOICE
- [ ] Add 2 services → Save → toast confirms; file `-INV.pdf` in folder
- [ ] Reopen invoice → previous entries retained
- [ ] Description with `&` (e.g. "X-ray & review") renders correctly

## GOOGLE REVIEW SYSTEM
- [ ] ⭐ Review (topbar desktop / bottom nav mobile — only ONE button on mobile)
- [ ] Chooser: both clinics, each with Open / WhatsApp / SMS
- [ ] WhatsApp/SMS message contains the review.html gate link with correct clinic code
- [ ] Show QR on screen → QR renders, tabs switch clinics
- [ ] Scan QR → rating page → 5★ goes to Google; 3★ goes to private feedback form

## BACKUP & RESTORE (tabbed)
- [ ] Backup button → opens on **Local tab only**, nothing auto-runs
- [ ] Export JSON → contains the text you typed seconds ago (flush works)
- [ ] Import same JSON → patient count correct; corrupted file → error toast, no crash
- [ ] Import while a patient is open → open patient reloads (no stale overwrite)
- [ ] Drive tab → Backup Now → "all patients" toast → complete ✓
- [ ] PDF Folder tab → Backup Now → generates PDFs for ALL patients with changes
- [ ] Press PDF Backup Now again immediately → "already backed up ✓"
- [ ] While PDF sweep runs: clicking another patient shows "please wait" toast (no corruption)
- [ ] Recycle bin: delete patient → restore → patient AND all visits back intact

## MOBILE (test on phone after push)
- [ ] Bottom nav: Patients / Consult / Medicines / Backup / Review — all work
- [ ] Rx table scrolls sideways
- [ ] Medicine search dropdown appears above keyboard
- [ ] Row ✕ delete reachable without horizontal scroll

---

Date tested: ___________
Tested by: ___________
Build/commit: ___________
