// ── Orthopaedic Knowledge Base ──────────────────────────────────────────────
// Each diagnosis has: label, icd, body, exam (suggested tests), investigations, advice, tags[]

const ORTHO_DIAGNOSES = [
  // ── KNEE ──────────────────────────────────────────────────────────────────
  { label:'ACL Tear', icd:'S83.5', body:'knee', exam:'Lachman Test, Anterior Drawer, Pivot Shift', inv:'MRI Knee, X-Ray Knee AP/Lat', advice:'Avoid pivoting sports. Physiotherapy. Consider ACL Reconstruction.', tags:['acl','ligament','knee','tear','sport'] },
  { label:'ACL Tear – Complete', icd:'S83.51', body:'knee', exam:'Lachman Test, Anterior Drawer, Pivot Shift', inv:'MRI Knee, X-Ray Knee AP/Lat', advice:'ACL Reconstruction recommended. Pre-op physiotherapy.', tags:['acl','complete','knee','sport'] },
  { label:'ACL Tear – Partial', icd:'S83.50', body:'knee', exam:'Lachman Test, KT-1000', inv:'MRI Knee', advice:'Conservative physiotherapy trial. Review at 6 weeks.', tags:['acl','partial','knee'] },
  { label:'ACL Revision Surgery Required', icd:'Z96.651', body:'knee', exam:'Lachman, Pivot Shift, Tunnel Assessment', inv:'MRI Knee, CT Knee (tunnel assessment), X-Ray', advice:'Revision ACL Reconstruction planning. Bone graft may be needed.', tags:['acl','revision','graft','failure'] },
  { label:'PCL Tear', icd:'S83.52', body:'knee', exam:'Posterior Drawer, Posterior Sag Sign, Quadriceps Active Test', inv:'MRI Knee, X-Ray Stress Views', advice:'Conservative management often successful. PCL Reconstruction if symptomatic.', tags:['pcl','posterior','knee','ligament'] },
  { label:'MCL Injury Grade I', icd:'S83.41', body:'knee', exam:'Valgus Stress Test 0°/30°', inv:'X-Ray Knee, MRI if doubt', advice:'RICE. Hinged brace 2–4 weeks. Physiotherapy.', tags:['mcl','medial','collateral','knee','grade1'] },
  { label:'MCL Injury Grade II', icd:'S83.42', body:'knee', exam:'Valgus Stress Test 0°/30°', inv:'MRI Knee', advice:'Hinged brace 4–6 weeks. Physiotherapy. No surgery usually.', tags:['mcl','medial','grade2'] },
  { label:'MCL Injury Grade III', icd:'S83.43', body:'knee', exam:'Valgus Stress Test', inv:'MRI Knee', advice:'May require surgical repair if associated with ACL/PCL injury.', tags:['mcl','medial','grade3','complete'] },
  { label:'LCL Injury', icd:'S83.44', body:'knee', exam:'Varus Stress Test, External Rotation Recurvatum', inv:'MRI Knee', advice:'Conservative unless PLC injury. Physiotherapy.', tags:['lcl','lateral','collateral','knee'] },
  { label:'Posterolateral Corner Injury', icd:'S83.49', body:'knee', exam:'Dial Test, External Rotation Recurvatum, Reverse Pivot Shift', inv:'MRI Knee', advice:'Surgical reconstruction often required. Complex case.', tags:['plc','posterolateral','knee','corner'] },
  { label:'Medial Meniscus Tear', icd:'M23.21', body:'knee', exam:'McMurray Medial, Thessaly, Joint Line Tenderness', inv:'MRI Knee', advice:'Arthroscopic Meniscectomy or Repair depending on tear pattern.', tags:['meniscus','medial','tear','knee'] },
  { label:'Lateral Meniscus Tear', icd:'M23.22', body:'knee', exam:'McMurray Lateral, Thessaly', inv:'MRI Knee', advice:'Arthroscopic evaluation. Repair if possible, especially in young patients.', tags:['meniscus','lateral','tear','knee'] },
  { label:'Discoid Meniscus', icd:'Q68.8', body:'knee', exam:'Clunk Test, McMurray', inv:'MRI Knee', advice:'Saucerization arthroscopically if symptomatic.', tags:['discoid','meniscus','knee'] },
  { label:'Meniscus Root Tear', icd:'M23.20', body:'knee', exam:'McMurray, Thessaly', inv:'MRI Knee (Coronal)', advice:'Root repair should be considered to prevent OA progression.', tags:['meniscus','root','tear'] },
  { label:'Osteoarthritis Knee – Early', icd:'M17.11', body:'knee', exam:'Crepitus, ROM restriction, Varus/Valgus deformity', inv:'X-Ray Knee Standing AP/Lat/Skyline, HKA', advice:'Weight loss, physiotherapy, NSAIDs, Viscosupplementation/PRP.', tags:['oa','osteoarthritis','knee','early','arthritis'] },
  { label:'Osteoarthritis Knee – Moderate', icd:'M17.12', body:'knee', exam:'Crepitus, ROM, Deformity', inv:'X-Ray Knee Standing, HKA Long Leg', advice:'PRP/HA injection. Consider HTO if varus. NSAIDs.', tags:['oa','osteoarthritis','knee','moderate'] },
  { label:'Osteoarthritis Knee – Severe', icd:'M17.13', body:'knee', exam:'Crepitus, Fixed Flexion, Deformity', inv:'X-Ray Knee Standing, Long Leg AP', advice:'Total Knee Replacement recommended. Pre-op workup.', tags:['oa','osteoarthritis','knee','severe','tkr'] },
  { label:'Patellofemoral Pain Syndrome', icd:'M22.2', body:'knee', exam:'Patellar Grind, Clarke Test, J-Sign', inv:'X-Ray Skyline, MRI Patella', advice:'VMO strengthening, patellar taping, avoid stairs initially.', tags:['pfps','patella','patellofemoral','knee','pain'] },
  { label:'Patellar Instability', icd:'M22.0', body:'knee', exam:'Patellar Apprehension, J-Sign, Tilt', inv:'X-Ray Skyline, MRI (TT-TG distance), CT', advice:'Physiotherapy first. MPFL Reconstruction if recurrent dislocation.', tags:['patella','instability','dislocation','mpfl','knee'] },
  { label:'Patellar Dislocation – Acute', icd:'S83.0', body:'knee', exam:'Patellar Position, Tenderness', inv:'X-Ray Knee, MRI', advice:'Closed reduction. Immobilize 2–4 weeks. MRI to rule out osteochondral fracture.', tags:['patella','dislocation','acute'] },
  { label:'Quadriceps Tendon Rupture', icd:'S76.1', body:'knee', exam:'Inability to extend knee, Palpable gap', inv:'X-Ray Knee, Ultrasound/MRI', advice:'Surgical repair required urgently.', tags:['quadriceps','tendon','rupture','knee'] },
  { label:'Patellar Tendon Rupture', icd:'S76.1', body:'knee', exam:'Inability to extend, Low-riding patella', inv:'X-Ray, MRI', advice:'Surgical repair required.', tags:['patellar','tendon','rupture'] },
  { label:'Patellar Tendinopathy', icd:'M76.5', body:'knee', exam:'Inferior Pole Tenderness, Single Leg Squat', inv:'Ultrasound Knee, MRI', advice:'Eccentric loading program. PRP if chronic. Avoid jumping sports.', tags:['patellar','tendinopathy','jumper','knee'] },
  { label:'Osgood-Schlatter Disease', icd:'M92.5', body:'knee', exam:'Tibial Tuberosity Tenderness', inv:'X-Ray Knee Lateral', advice:'Activity modification, physiotherapy, ice. Usually self-limiting.', tags:['osgood','schlatter','knee','adolescent'] },
  { label:'Plica Syndrome', icd:'M67.5', body:'knee', exam:'Medial Plica tenderness, Snap at 60°', inv:'MRI Knee', advice:'Anti-inflammatory, physiotherapy. Arthroscopic plica excision if persistent.', tags:['plica','knee','medial'] },
  { label:'Bakers Cyst', icd:'M71.2', body:'knee', exam:'Posterior knee swelling, Fluctuant', inv:'Ultrasound Knee', advice:'Treat underlying cause (OA/Meniscus). Aspiration if large.', tags:['bakers','cyst','posterior','knee','popliteal'] },
  { label:'Prepatellar Bursitis', icd:'M70.4', body:'knee', exam:'Anterior swelling, Fluctuant', inv:'Ultrasound', advice:'RICE, NSAIDs. Aspiration. Consider steroid injection.', tags:['bursitis','prepatellar','knee'] },
  { label:'Osteochondral Defect Knee', icd:'M93.2', body:'knee', exam:'Locking, Catching, Tenderness', inv:'MRI Knee (SPGR sequence)', advice:'Microfracture/OATS/ACI depending on size. Avoid high impact.', tags:['ocd','osteochondral','cartilage','knee'] },

  // ── HIP ───────────────────────────────────────────────────────────────────
  { label:'Osteoarthritis Hip – Early', icd:'M16.11', body:'hip', exam:'FABER, FADIR, Log Roll, Thomas', inv:'X-Ray Pelvis AP, Hip Lateral, MRI Hip', advice:'Weight loss, physiotherapy, NSAIDs, PRP/HA injection.', tags:['oa','osteoarthritis','hip','early','arthritis'] },
  { label:'Osteoarthritis Hip – Moderate', icd:'M16.12', body:'hip', exam:'ROM restriction, Antalgic gait', inv:'X-Ray Pelvis AP, Hip Lateral', advice:'NSAIDs, cane, PRP. Consider THR planning.', tags:['oa','osteoarthritis','hip','moderate'] },
  { label:'Osteoarthritis Hip – Severe', icd:'M16.13', body:'hip', exam:'Fixed deformity, Leg length discrepancy', inv:'X-Ray Pelvis AP, Hip Lateral, Long Leg', advice:'Total Hip Replacement recommended.', tags:['oa','osteoarthritis','hip','severe','thr'] },
  { label:'Femoroacetabular Impingement – CAM', icd:'M24.85', body:'hip', exam:'FADIR, Internal Rotation restriction', inv:'X-Ray Pelvis (alpha angle), MRI Arthrogram Hip', advice:'Physiotherapy, activity modification. Arthroscopic cam resection if symptomatic.', tags:['fai','cam','hip','impingement','young'] },
  { label:'Femoroacetabular Impingement – Pincer', icd:'M24.85', body:'hip', exam:'FADIR, Reduced Internal Rotation', inv:'X-Ray Pelvis, MRI Hip', advice:'Activity modification. Acetabular rim trimming arthroscopically.', tags:['fai','pincer','hip','impingement'] },
  { label:'Hip Labral Tear', icd:'M24.85', body:'hip', exam:'FADIR, Internal Rotation Pain', inv:'MRI Arthrogram Hip', advice:'Physiotherapy. Arthroscopic labral repair/debridement.', tags:['labrum','labral','hip','tear'] },
  { label:'Avascular Necrosis Hip', icd:'M87.05', body:'hip', exam:'Antalgic gait, ROM restriction', inv:'MRI Hip (diagnostic), X-Ray (staging)', advice:'Stage-dependent: Core decompression/Fibular graft/THR.', tags:['avn','avascular','necrosis','hip','ficat'] },
  { label:'Hip Fracture – Neck of Femur', icd:'S72.0', body:'hip', exam:'External rotation, Shortened limb', inv:'X-Ray Pelvis AP, Hip Lateral, CT if doubt', advice:'Surgical: Hemiarthroplasty or THR (displaced). DHS/screws (undisplaced).', tags:['hip','fracture','neck','femur','nof'] },
  { label:'Intertrochanteric Fracture', icd:'S72.1', body:'hip', exam:'External rotation, Limb shortening', inv:'X-Ray Pelvis AP/Lat, CT', advice:'PFNA/DHS fixation. Early mobilization post-op.', tags:['intertrochanteric','fracture','hip','pfna','dhs'] },
  { label:'Subtrochanteric Fracture', icd:'S72.2', body:'hip', exam:'Limb shortening, External rotation', inv:'X-Ray Full Femur AP/Lat', advice:'Long IM nail fixation.', tags:['subtrochanteric','fracture','femur'] },
  { label:'Greater Trochanter Pain Syndrome', icd:'M70.6', body:'hip', exam:'Lateral hip tenderness, Trendelenburg', inv:'Ultrasound Hip, MRI', advice:'Physiotherapy, NSAIDs, steroid injection. PRP for chronic cases.', tags:['greater','trochanter','bursitis','hip','lateral'] },
  { label:'Piriformis Syndrome', icd:'G54.4', body:'hip', exam:'FAIR Test, Beatty Test', inv:'MRI Pelvis', advice:'Physiotherapy, piriformis stretching, steroid/botox injection.', tags:['piriformis','hip','sciatica'] },
  { label:'Developmental Dysplasia Hip', icd:'Q65.8', body:'hip', exam:'Leg length discrepancy, Galeazzi', inv:'X-Ray Pelvis, CT', advice:'PAO for young adults. THR for severe OA cases.', tags:['ddh','dysplasia','hip','developmental'] },

  // ── SHOULDER ──────────────────────────────────────────────────────────────
  { label:'Rotator Cuff Tear – Partial', icd:'M75.1', body:'shoulder', exam:'Jobe, Drop Arm, Painful Arc 60–120°', inv:'MRI Shoulder, Ultrasound Shoulder', advice:'Physiotherapy 3–6 months. PRP injection. Surgery if no improvement.', tags:['rotator','cuff','partial','tear','shoulder'] },
  { label:'Rotator Cuff Tear – Full Thickness', icd:'M75.12', body:'shoulder', exam:'Jobe, Drop Arm, Lift Off, Belly Press', inv:'MRI Shoulder', advice:'Arthroscopic Rotator Cuff Repair recommended in active patients.', tags:['rotator','cuff','full','tear','shoulder'] },
  { label:'Rotator Cuff Tear – Massive', icd:'M75.13', body:'shoulder', exam:'Drop Arm, Pseudoparalysis', inv:'MRI Shoulder (muscle quality assessment)', advice:'Reverse TSA / Superior Capsule Reconstruction / Tendon Transfer.', tags:['rotator','cuff','massive','tear','shoulder'] },
  { label:'Frozen Shoulder – Stage 1', icd:'M75.0', body:'shoulder', exam:'Painful ROM restriction all planes', inv:'X-Ray Shoulder, Blood (DM/Thyroid)', advice:'Steroid injection, physiotherapy, NSAIDs. Hydrodilatation.', tags:['frozen','shoulder','adhesive','capsulitis','stage1'] },
  { label:'Frozen Shoulder – Stage 2', icd:'M75.0', body:'shoulder', exam:'Restricted ROM, Stiffness > pain', inv:'X-Ray Shoulder', advice:'Physiotherapy, hydrodilatation. MUA/Arthroscopic capsular release if no progress.', tags:['frozen','shoulder','stage2'] },
  { label:'Frozen Shoulder – Stage 3', icd:'M75.0', body:'shoulder', exam:'Restricted ROM, Less pain', inv:'X-Ray Shoulder', advice:'Physiotherapy. ROM usually recovers spontaneously.', tags:['frozen','shoulder','stage3'] },
  { label:'Shoulder Instability – Anterior', icd:'M24.31', body:'shoulder', exam:'Apprehension Test, Relocation Test, Anterior Load Shift', inv:'X-Ray (Hill-Sachs, Bony Bankart), MRI Arthrogram', advice:'Physiotherapy first. Arthroscopic Bankart Repair if recurrent.', tags:['shoulder','instability','anterior','bankart','dislocation'] },
  { label:'Shoulder Instability – Posterior', icd:'M24.32', body:'shoulder', exam:'Posterior Load Shift, Jerk Test', inv:'MRI Arthrogram Shoulder', advice:'Physiotherapy. Posterior labral repair if symptomatic.', tags:['shoulder','instability','posterior'] },
  { label:'Shoulder Instability – MDI', iid:'M24.30', body:'shoulder', exam:'Sulcus Sign, Apprehension All Directions', inv:'MRI Arthrogram', advice:'Physiotherapy 6+ months. Capsular plication if fails.', tags:['shoulder','mdi','multidirectional','instability'] },
  { label:'SLAP Tear', icd:'M24.89', body:'shoulder', exam:'O\'Brien Test, Speed Test, Crank Test', inv:'MRI Arthrogram Shoulder', advice:'Physiotherapy first. Arthroscopic SLAP repair or biceps tenodesis.', tags:['slap','labrum','shoulder','biceps'] },
  { label:'Subacromial Impingement', icd:'M75.5', body:'shoulder', exam:'Hawkins, Neer, Painful Arc', inv:'X-Ray Shoulder, Ultrasound/MRI', advice:'Physiotherapy, NSAIDs, Subacromial steroid injection. Arthroscopic decompression if chronic.', tags:['impingement','subacromial','shoulder','hawkins','neer'] },
  { label:'AC Joint Injury – Grade I/II', icd:'S43.10', body:'shoulder', exam:'AC Joint Tenderness, Cross-body Adduction', inv:'X-Ray AC Joint (Weight-bearing)', advice:'Conservative: sling, NSAIDs, physiotherapy 4–6 weeks.', tags:['ac','acromioclavicular','shoulder','injury','grade1','grade2'] },
  { label:'AC Joint Injury – Grade III+', icd:'S43.13', body:'shoulder', exam:'Step Deformity, AC Tenderness', inv:'X-Ray AC Joint Stress Views', advice:'Grade III: controversial. Grade IV/V/VI: surgical stabilization.', tags:['ac','acromioclavicular','shoulder','grade3','dislocation'] },
  { label:'AC Joint Arthritis', icd:'M19.01', body:'shoulder', exam:'AC Tenderness, Cross-body Pain', inv:'X-Ray AC Joint, MRI', advice:'Steroid injection, activity modification. Arthroscopic resection if chronic.', tags:['ac','arthritis','shoulder'] },
  { label:'Biceps Tendinopathy', icd:'M75.2', body:'shoulder', exam:'Speed Test, Yergason Test, LHBT Groove Tenderness', inv:'Ultrasound Shoulder', advice:'Steroid injection in groove, physiotherapy. Tenodesis if chronic.', tags:['biceps','tendinopathy','lhbt','shoulder'] },
  { label:'Biceps Tendon Rupture – Proximal', icd:'S46.11', body:'shoulder', exam:'Popeye Sign, Weakness Supination', inv:'X-Ray, MRI Shoulder', advice:'Conservative in elderly. Tenodesis in active/young.', tags:['biceps','rupture','proximal','popeye','shoulder'] },
  { label:'Calcific Tendinitis', icd:'M75.3', body:'shoulder', exam:'Painful Arc, Subacromial Tenderness', inv:'X-Ray (calcium deposits), Ultrasound', advice:'Barbotage (needling), steroid injection. Arthroscopic removal if chronic.', tags:['calcific','tendinitis','shoulder','calcium'] },
  { label:'Clavicle Fracture', icd:'S42.0', body:'shoulder', exam:'Deformity, Tenderness, Shortening', inv:'X-Ray Clavicle AP/15° cephalic', advice:'Conservative (sling) for undisplaced. Plate fixation for displaced/shortening >2cm.', tags:['clavicle','fracture','shoulder'] },
  { label:'Proximal Humerus Fracture', icd:'S42.2', body:'shoulder', exam:'Deformity, Swelling, Neurovascular assessment', inv:'X-Ray Shoulder 3-views, CT', advice:'ORIF vs Hemiarthroplasty vs RSA depending on parts and age.', tags:['proximal','humerus','fracture','shoulder'] },

  // ── ELBOW ─────────────────────────────────────────────────────────────────
  { label:'Lateral Epicondylitis (Tennis Elbow)', icd:'M77.1', body:'elbow', exam:'Cozen Test, Mill Test, Lateral Epicondyle Tenderness', inv:'X-Ray Elbow, Ultrasound', advice:'Activity modification, physiotherapy, NSAID, counterforce brace. PRP injection.', tags:['tennis','elbow','lateral','epicondylitis','cozen'] },
  { label:'Medial Epicondylitis (Golfer\'s Elbow)', icd:'M77.0', body:'elbow', exam:'Medial Epicondyle Tenderness, Resisted Wrist Flexion', inv:'X-Ray Elbow, Ultrasound', advice:'Activity modification, physiotherapy, steroid injection. PRP if chronic.', tags:['golfers','elbow','medial','epicondylitis'] },
  { label:'Cubital Tunnel Syndrome', icd:'G54.2', body:'elbow', exam:'Elbow Flexion Test, Tinel at Cubital Tunnel, Froment Sign', inv:'NCS/EMG, X-Ray Elbow', advice:'Elbow pad, night extension splint. Surgical decompression/transposition if severe.', tags:['cubital','tunnel','ulnar','nerve','elbow'] },
  { label:'Radial Head Fracture', icd:'S52.1', body:'elbow', exam:'Lateral elbow pain, ROM restriction, Mason Classification', inv:'X-Ray Elbow, CT', advice:'Mason I/II: conservative. Mason III: ORIF or radial head replacement.', tags:['radial','head','fracture','elbow','mason'] },
  { label:'Distal Biceps Rupture', icd:'S46.21', body:'elbow', exam:'Weakness Supination/Flexion, Bruising Antecubital Fossa', inv:'MRI Elbow', advice:'Surgical reattachment recommended in active patients.', tags:['biceps','distal','rupture','elbow'] },
  { label:'Olecranon Bursitis', icd:'M70.2', body:'elbow', exam:'Posterior Elbow Swelling, Fluctuant', inv:'Ultrasound', advice:'RICE, NSAIDs, aspiration. Steroid injection. Excision if chronic.', tags:['olecranon','bursitis','elbow'] },
  { label:'OCD Elbow', icd:'M93.2', body:'elbow', exam:'Radiocapitellar Tenderness, Locking', inv:'X-Ray Elbow, MRI', advice:'Activity restriction. Arthroscopic debridement ± drilling.', tags:['ocd','osteochondral','elbow','capitellum'] },

  // ── WRIST / HAND ──────────────────────────────────────────────────────────
  { label:'Carpal Tunnel Syndrome – Mild', icd:'G56.0', body:'wrist', exam:'Tinel, Phalen, Reverse Phalen, Carpal Compression Test', inv:'NCS/EMG', advice:'Wrist splint at night, NSAIDs, corticosteroid injection.', tags:['carpal','tunnel','cts','wrist','mild'] },
  { label:'Carpal Tunnel Syndrome – Severe', icd:'G56.0', body:'wrist', exam:'Thenar Wasting, Phalen, Tinel', inv:'NCS/EMG', advice:'Surgical release (Carpal Tunnel Decompression).', tags:['carpal','tunnel','cts','severe','thenar'] },
  { label:'De Quervain Tenosynovitis', icd:'M65.4', body:'wrist', exam:'Finkelstein Test, First Dorsal Compartment Tenderness', inv:'Ultrasound Wrist', advice:'Thumb spica splint, steroid injection. Surgical release if persistent.', tags:['dequervain','tenosynovitis','thumb','wrist','finkelstein'] },
  { label:'Scaphoid Fracture', icd:'S62.0', body:'wrist', exam:'Anatomical Snuffbox Tenderness, Axial Compression', inv:'X-Ray Wrist (scaphoid views), MRI/CT if X-Ray negative', advice:'Undisplaced: scaphoid cast 8–12 weeks. Displaced: ORIF (Herbert screw).', tags:['scaphoid','fracture','wrist','snuffbox'] },
  { label:'Distal Radius Fracture', icd:'S52.5', body:'wrist', exam:'Dinner Fork Deformity, Wrist Tenderness', inv:'X-Ray Wrist PA/Lateral', advice:'Undisplaced: cast 6 weeks. Displaced: Closed reduction ± K-wire/ORIF (VLP).', tags:['distal','radius','fracture','colles','wrist'] },
  { label:'Trigger Finger', icd:'M65.3', body:'hand', exam:'Triggering, Nodule at A1 Pulley, Locking', inv:'Clinical diagnosis. Ultrasound if doubt.', advice:'Steroid injection (80% success). Surgical release if recurrent.', tags:['trigger','finger','stenosing','tenosynovitis','a1'] },
  { label:'Dupuytren\'s Contracture', icd:'M72.0', body:'hand', exam:'Palmar Cord, Flexion Contracture', inv:'Clinical. MRI occasionally.', advice:'Needle fasciotomy / Collagenase injection / Fasciotomy depending on severity.', tags:['dupuytren','contracture','hand','palmar'] },
  { label:'Mallet Finger', icd:'S63.1', body:'hand', exam:'DIP extension lag', inv:'X-Ray Finger', advice:'Stack splint DIP in extension 6–8 weeks (continuous). Surgery if bony fragment >30%.', tags:['mallet','finger','extensor','tendon','dip'] },
  { label:'Ganglion Cyst Wrist', icd:'M67.4', body:'wrist', exam:'Transilluminable swelling, Dorsal or Volar', inv:'Ultrasound', advice:'Observation (50% resolve), aspiration, or surgical excision.', tags:['ganglion','cyst','wrist'] },

  // ── SPINE ─────────────────────────────────────────────────────────────────
  { label:'Lumbar Disc Prolapse', icd:'M51.1', body:'spine', exam:'SLR, Crossed SLR, Neurological (power/sensation/reflexes)', inv:'MRI L-Spine, X-Ray L-Spine', advice:'Conservative 6 weeks: physio, NSAIDs, epidural. Surgery (microdiscectomy) if fails or cauda equina.', tags:['lumbar','disc','prolapse','herniation','slr','spine'] },
  { label:'Lumbar Canal Stenosis', icd:'M48.0', body:'spine', exam:'Neurogenic claudication, Extension worse, Bicycle Sign', inv:'MRI L-Spine, X-Ray L-Spine', advice:'Physiotherapy, epidural steroid. Surgical decompression if severe/progressive.', tags:['lumbar','stenosis','canal','neurogenic','claudication','spine'] },
  { label:'Lumbar Spondylolisthesis', icd:'M43.1', body:'spine', exam:'Step Deformity, Hamstring Tightness, Neurological', inv:'X-Ray L-Spine (flexion/extension), MRI', advice:'Conservative initially. Surgical stabilization (PLIF/TLIF) if symptomatic/progressive.', tags:['spondylolisthesis','lumbar','spine','slip'] },
  { label:'Lumbar Spondylosis', icd:'M47.8', body:'spine', exam:'Restricted lumbar movement, Paraspinal tenderness', inv:'X-Ray L-Spine, MRI', advice:'Physiotherapy, NSAIDs, lifestyle modification.', tags:['spondylosis','lumbar','spine','degeneration'] },
  { label:'Cervical Disc Prolapse', icd:'M50.1', body:'spine', exam:'Spurling Test, Arm Neurology, Hoffman', inv:'MRI C-Spine, X-Ray Cervical', advice:'Collar, NSAIDs, physiotherapy. ACDF/cervical disc replacement if severe.', tags:['cervical','disc','neck','spine','radiculopathy'] },
  { label:'Cervical Spondylosis', icd:'M47.8', body:'spine', exam:'Restricted neck movements, Spurling', inv:'X-Ray Cervical, MRI', advice:'Physiotherapy, NSAIDs, collar.', tags:['cervical','spondylosis','neck','spine'] },
  { label:'Cervical Myelopathy', icd:'G99.2', body:'spine', exam:'Hoffman, Hyperreflexia, Lhermitte, Myelopathy Score', inv:'MRI C-Spine (urgently)', advice:'Surgical decompression. Do not delay.', tags:['myelopathy','cervical','spine','cord','compression'] },
  { label:'Sacroiliac Joint Dysfunction', icd:'M53.3', body:'spine', exam:'FABER, Distraction Test, Gaenslen, Thigh Thrust', inv:'X-Ray Pelvis, MRI SI Joints', advice:'Physiotherapy, NSAIDs, SI Joint injection (steroid/PRP).', tags:['si','sacroiliac','joint','pain','spine'] },
  { label:'Vertebral Compression Fracture', icd:'M80.0', body:'spine', exam:'Point Tenderness Spine, Kyphotic Deformity', inv:'X-Ray Spine, MRI (edema = acute)', advice:'Pain management, bracing. Vertebroplasty/Kyphoplasty for acute osteoporotic fractures.', tags:['vertebral','compression','fracture','spine','osteoporosis'] },

  // ── ANKLE / FOOT ──────────────────────────────────────────────────────────
  { label:'Ankle Sprain – Grade I', icd:'S93.4', body:'ankle', exam:'ATFL Tenderness, Ottawa Rules, Anterior Drawer', inv:'X-Ray Ankle if Ottawa +ve', advice:'RICE, NSAIDs, walking boot 1–2 weeks, early physiotherapy.', tags:['ankle','sprain','grade1','atfl','lateral'] },
  { label:'Ankle Sprain – Grade II', icd:'S93.4', body:'ankle', exam:'ATFL/CFL Tenderness, Anterior Drawer, Talar Tilt', inv:'X-Ray Ankle, MRI if not settling', advice:'Walking boot 4–6 weeks, physiotherapy, bracing for sport return.', tags:['ankle','sprain','grade2','atfl','cfl'] },
  { label:'Ankle Sprain – Grade III', icd:'S93.4', body:'ankle', exam:'Complete ligament disruption, Anterior Drawer', inv:'MRI Ankle, X-Ray', advice:'Boot 6 weeks, physiotherapy. Surgery rarely needed.', tags:['ankle','sprain','grade3','complete'] },
  { label:'Achilles Tendon Rupture', icd:'S86.0', body:'ankle', exam:'Thompson Test, Palpable Gap', inv:'Ultrasound Achilles', advice:'Conservative (equinus cast) or surgical repair. Both outcomes similar in literature.', tags:['achilles','rupture','thompson','ankle'] },
  { label:'Achilles Tendinopathy', icd:'M76.6', body:'ankle', exam:'Tendon Thickening, Tenderness 2–6cm from insertion', inv:'Ultrasound Achilles', advice:'Eccentric heel drops, heel lift, PRP injection. Avoid fluoroquinolones.', tags:['achilles','tendinopathy','ankle'] },
  { label:'Plantar Fasciitis', icd:'M72.2', body:'foot', exam:'Heel Point Tenderness, Windlass Test', inv:'Ultrasound Heel, X-Ray Heel (heel spur)', advice:'Stretching, orthotic insole, night splint, steroid injection. PRP/shockwave therapy.', tags:['plantar','fasciitis','heel','foot'] },
  { label:'Hallux Valgus', icd:'M20.1', body:'foot', exam:'Bunion, HVA, IMA measurement', inv:'X-Ray Foot Standing AP/Lateral', advice:'Wide footwear, orthotic. Surgical correction (Scarf/Austin/Lapidus) if severe.', tags:['hallux','valgus','bunion','foot'] },
  { label:'Tibialis Posterior Dysfunction', icd:'M76.8', body:'ankle', exam:'Single Heel Raise, Too Many Toes, Medial Ankle Tenderness', inv:'MRI Ankle, Ultrasound', advice:'Orthotic arch support, physiotherapy. PTTD Stage-based surgical correction.', tags:['tibialis','posterior','flatfoot','pes','planus','ankle'] },
  { label:'Peroneal Tendon Tear', icd:'M66.3', body:'ankle', exam:'Lateral Ankle Tenderness, Instability', inv:'MRI Ankle', advice:'Physiotherapy if partial. Surgical repair if complete/recurrent.', tags:['peroneal','tendon','tear','ankle','lateral'] },
  { label:'Ankle Fracture – Lateral Malleolus', icd:'S82.6', body:'ankle', exam:'Lateral tenderness, Stability assessment, Ottawa', inv:'X-Ray Ankle AP/Lat/Mortise', advice:'Below syndesmosis: walking boot. Above: ORIF.', tags:['ankle','fracture','lateral','malleolus','fibula'] },
  { label:'Bimalleolar Fracture', icd:'S82.84', body:'ankle', exam:'Instability, Both malleoli tender', inv:'X-Ray Ankle, CT', advice:'ORIF both malleoli. Non-weight-bearing 6 weeks.', tags:['bimalleolar','fracture','ankle'] },
  { label:'Fifth Metatarsal Fracture (Jones)', icd:'S92.3', body:'foot', exam:'Base of 5th MT tenderness', inv:'X-Ray Foot', advice:'Zone 1 (avulsion): boot. Zone 2 (Jones): NWB cast or ORIF for athletes.', tags:['jones','fracture','fifth','metatarsal','foot'] },

  // ── FRACTURES ─────────────────────────────────────────────────────────────
  { label:'Femur Shaft Fracture', icd:'S72.3', body:'thigh', exam:'Deformity, Swelling, Neurovascular', inv:'X-Ray Full Femur AP/Lat', advice:'IM Nail fixation. Watch for blood loss.', tags:['femur','fracture','shaft','im','nail'] },
  { label:'Tibial Shaft Fracture', icd:'S82.2', body:'leg', exam:'Deformity, Open wound check, NV status', inv:'X-Ray Tibia + Fibula', advice:'IM Nail (definitive). Assess soft tissue injury.', tags:['tibia','fracture','shaft','leg','im','nail'] },
  { label:'Tibial Plateau Fracture', icd:'S82.1', body:'knee', exam:'Valgus/Varus stress, Effusion, NV', inv:'X-Ray Knee, CT Knee', advice:'Schatzker classification guides treatment. ORIF for most.', tags:['tibial','plateau','fracture','knee','schatzker'] },
  { label:'Pelvic Fracture', icd:'S32.8', body:'pelvis', exam:'Pelvic Stability, ATLS assessment', inv:'X-Ray Pelvis, CT Pelvis', advice:'Stable: conservative. Unstable: external fixator + ORIF.', tags:['pelvis','fracture','pelvic','ring','ring'] },
  { label:'Acetabular Fracture', icd:'S32.4', body:'pelvis', exam:'Hip ROM, Sciatic Nerve, NV', inv:'X-Ray Pelvis + Judet Views, CT 3D', advice:'Letournel classification. Most require ORIF.', tags:['acetabulum','fracture','pelvis','letournel'] },

  // ── PROCEDURES ────────────────────────────────────────────────────────────
  { label:'PRP Injection – Knee', icd:'', body:'knee', exam:'', inv:'', advice:'Platelet Rich Plasma injection. 3 sessions recommended. No NSAIDs 2 weeks.', tags:['prp','injection','knee','platelet'] },
  { label:'PRP Injection – Hip', icd:'', body:'hip', exam:'', inv:'', advice:'PRP injection. Avoid NSAIDs 2 weeks post injection.', tags:['prp','injection','hip','platelet'] },
  { label:'PRP Injection – Shoulder', icd:'', body:'shoulder', exam:'', inv:'', advice:'PRP injection. Rest sling 48 hours. Physiotherapy after 1 week.', tags:['prp','injection','shoulder','platelet'] },
  { label:'Hyaluronic Acid Injection – Knee', icd:'', body:'knee', exam:'', inv:'', advice:'HA Viscosupplementation. 3 weekly injections. Avoid NSAIDs same day.', tags:['ha','hyaluronic','viscosupplementation','knee','injection'] },
  { label:'Steroid Injection – Knee', icd:'', body:'knee', exam:'', inv:'', advice:'Triamcinolone / Methylprednisolone. Max 3 per year. Effect lasts 4–8 weeks.', tags:['steroid','injection','knee','cortisone'] },
  { label:'Steroid Injection – Shoulder', icd:'', body:'shoulder', exam:'', inv:'', advice:'Subacromial steroid injection. Max 3 per year.', tags:['steroid','injection','shoulder','subacromial'] },
  { label:'Trigger Finger Injection', icd:'', body:'hand', exam:'', inv:'', advice:'Corticosteroid injection at A1 pulley. 80% success. Repeat once if needed.', tags:['trigger','finger','injection','a1','steroid'] },
];

// ── Smart Diagnosis Search ───────────────────────────────────────────────────
function searchOrthoDiagnoses(query) {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase();
  const results = ORTHO_DIAGNOSES.filter(d =>
    d.label.toLowerCase().includes(q) ||
    d.tags.some(t => t.includes(q))
  );
  // Exact label matches first, then tag matches
  results.sort((a, b) => {
    const aLabel = a.label.toLowerCase().includes(q) ? 0 : 1;
    const bLabel = b.label.toLowerCase().includes(q) ? 0 : 1;
    return aLabel - bLabel;
  });
  return results.slice(0, 12);
}

function applyDiagnosis(d) {
  document.getElementById('field-diagnosis').value = d.label;
  if (d.icd) document.getElementById('field-icd10').value = d.icd;
  if (d.exam && document.getElementById('field-examination')) {
    const examEl = document.getElementById('field-examination');
    if (!examEl.value) examEl.value = d.exam;
  }
  if (d.inv && document.getElementById('field-investigations')) {
    const invEl = document.getElementById('field-investigations');
    if (!invEl.value) invEl.value = d.inv;
  }
  if (d.advice && document.getElementById('field-advice')) {
    const advEl = document.getElementById('field-advice');
    if (!advEl.value) advEl.value = d.advice;
  }
  hideDiagSearch();
  document.getElementById('field-diagnosis').dispatchEvent(new Event('input'));
}

function hideDiagSearch() {
  const el = document.getElementById('diag-dropdown');
  if (el) el.style.display = 'none';
}

function initDiagSearch() {
  const input = document.getElementById('field-diagnosis');
  if (!input) return;

  // Create dropdown
  let dd = document.getElementById('diag-dropdown');
  if (!dd) {
    dd = document.createElement('div');
    dd.id = 'diag-dropdown';
    dd.className = 'diag-dropdown';
    input.parentElement.style.position = 'relative';
    input.parentElement.appendChild(dd);
  }

  input.addEventListener('input', () => {
    const q = input.value.trim();
    const results = searchOrthoDiagnoses(q);
    if (!results.length || !q) { dd.style.display = 'none'; return; }
    dd.innerHTML = results.map(d => `
      <div class="diag-item" onclick="applyDiagnosis(${JSON.stringify(d).replace(/"/g,'&quot;')})">
        <span class="diag-label">${d.label}</span>
        ${d.icd ? `<span class="diag-icd">${d.icd}</span>` : ''}
        <span class="diag-body">${d.body}</span>
      </div>`).join('');
    dd.style.display = 'block';
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') hideDiagSearch();
  });

  document.addEventListener('click', e => {
    if (!input.contains(e.target) && !dd.contains(e.target)) hideDiagSearch();
  });
}
