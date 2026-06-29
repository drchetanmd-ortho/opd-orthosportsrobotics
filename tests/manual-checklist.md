# Aarna OPD — Pre-Deploy Manual Test Checklist

Run before every GitHub push. Takes ~5 minutes.
Open the app at: https://drchetanmd-ortho.github.io/ortho-opd-github/

---

## PATIENT FLOW
- [ ] Register new patient with a 10-digit phone → ID format is `YYYYMMDD-PHONE`
- [ ] Try registering the SAME phone again → duplicate alert appears with patient name
- [ ] Click "Open as Follow-up" in the alert → opens that patient correctly (no crash)
- [ ] Click Edit Patient → title shows "✏️ Edit Patient"
- [ ] Close without saving → modal title resets to "+ New Patient" on reopen

## CONSULTATION — AUTO-SAVE (most important)
- [ ] Select a patient → type in Complaints field
- [ ] Type in HOPI field
- [ ] Type in Allergies field
- [ ] Switch to Backup tab (left panel)
- [ ] Switch back to Consultation → ALL fields still filled (no data loss)
- [ ] Add 2 medicines
- [ ] Close browser tab completely → reopen → select same patient → fields and medicines reload

## PRESCRIPTION
- [ ] Click Print → browser print dialog opens
- [ ] Click Save (💾) → toast shows "Prescription backed up ✓"
- [ ] Check file saved in selected folder as `YYYYMMDD-PHONE-RX.pdf`
- [ ] Click Send → share panel appears IMMEDIATELY (not after a delay)
- [ ] WhatsApp link → correct number, no double 91 prefix (e.g. not 919191...)
- [ ] PDF logo is visible (not a broken image icon)

## INVOICE
- [ ] Open invoice modal → add 2 services → click Save → toast confirms
- [ ] Click Print → PDF saves to folder with `-INV.pdf` suffix
- [ ] Invoice number format: `YYYYMMDD-PHONENUMBER-INV` (not `INV-DATE-271`)
- [ ] Click Send → share panel opens with patient phone number

## OUTCOME SCORES
- [ ] Click Outcome Scores → select VAS Pain
- [ ] Select "10" (worst pain) → score shows 10/10 (not 0/10)
- [ ] Click Save → entry appears in Notes field
- [ ] Open Examination field → score entry is NOT there (should not print on prescription)
- [ ] Close modal → Notes field retains the entry after tab switch

## GOOGLE DRIVE
- [ ] Reload the page → Drive reconnects automatically (no manual reconnect needed)
- [ ] Leave page open for 5+ minutes → backup icon stays green (not "!")
- [ ] Generate a prescription → Drive syncs the PDF

## BACKUP IMPORT
- [ ] Export backup JSON
- [ ] Import it back → confirmation shows correct patient count
- [ ] Try importing a corrupted JSON file → shows "Invalid backup file" error, no crash

---

## MOBILE (test on phone after push)
- [ ] Diagnosis chips visible in body exam panel (not cut off)
- [ ] Share prescription → native Android share sheet opens
- [ ] All 3 panels accessible via bottom nav bar

---

Date tested: ___________  
Tested by: ___________  
Build/commit: ___________
