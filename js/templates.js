// Orthopaedic Condition Templates – using Dr Chetan's actual medicine list
// Medicine IDs reference MEDICINE_DB in medicines.js
const CONDITION_TEMPLATES = {

  "knee-oa": {
    label: "Knee OA",
    icon: "🦵",
    diagnosis: "Osteoarthritis of Knee (M17.1)",
    icd10: "M17.1",
    complaints: "Knee pain, stiffness especially in the morning, difficulty climbing stairs, swelling",
    examination: "Tenderness at joint line\nCrepitus on movement\nRestricted range of motion\nVarus/Valgus deformity (if present)\nLachman's test – Negative\nMcMurray's test – Negative",
    advice: [
      "Low-impact exercises: swimming, cycling, walking on flat surface",
      "Quadriceps strengthening exercises",
      "Knee brace / knee cap",
      "Avoid sitting cross-legged, squatting, and using Indian-style toilet",
      "Weight reduction",
      "Hot/cold pack application"
    ],
    followUp: "4 Weeks",
    medicines: [
      { id: 12, dose: "1", timings: "1-0-0", timingsNote: "After Food", duration: "5 Days", qty: "5" },
      { id: 58, dose: "1", timings: "1-0-0", timingsNote: "30 min Before Food", duration: "5 Days", qty: "5" },
      { id: 4,  dose: "1", timings: "0-1-0", timingsNote: "After Food", duration: "90 Days", qty: "90" },
      { id: 19, dose: "1", timings: "0-1-0", timingsNote: "After Food", duration: "90 Days", qty: "90" },
      { id: 27, dose: "1", timings: "0-1-0", timingsNote: "Weekly – After Food", duration: "8 Weeks", qty: "8" }
    ]
  },

  "hip-oa": {
    label: "Hip OA",
    icon: "🦴",
    diagnosis: "Osteoarthritis of Hip (M16.1)",
    icd10: "M16.1",
    complaints: "Hip pain, groin pain, difficulty walking, stiffness, limping",
    examination: "Tenderness over hip joint\nPABER test – Positive\nLimited internal rotation\nTrendelenburg sign – Negative\nLeg length – Equal",
    advice: [
      "Swimming and water exercises",
      "Avoid impact activities",
      "Use walking stick / cane if needed",
      "Sleep on unaffected side with pillow between knees",
      "Hip strengthening exercises",
      "Weight reduction"
    ],
    followUp: "4 Weeks",
    medicines: [
      { id: 12, dose: "1", timings: "1-0-0", timingsNote: "After Food", duration: "5 Days", qty: "5" },
      { id: 58, dose: "1", timings: "1-0-0", timingsNote: "30 min Before Food", duration: "5 Days", qty: "5" },
      { id: 4,  dose: "1", timings: "0-1-0", timingsNote: "After Food", duration: "90 Days", qty: "90" },
      { id: 19, dose: "1", timings: "0-1-0", timingsNote: "After Food", duration: "90 Days", qty: "90" },
      { id: 27, dose: "1", timings: "0-1-0", timingsNote: "Weekly – After Food", duration: "8 Weeks", qty: "8" }
    ]
  },

  "cervical-radiculopathy": {
    label: "Cervical Radiculopathy",
    icon: "🫁",
    diagnosis: "Cervical Radiculopathy (M54.2)",
    icd10: "M54.2",
    complaints: "Neck pain, pain radiating to arm, tingling/numbness in hand, weakness in grip",
    examination: "Tenderness over cervical spine\nSpurling's test – Positive\nShoulder abduction relief sign\nReflexes – Normal/Reduced\nGrip strength – Reduced",
    advice: [
      "Cervical soft collar for 2 weeks",
      "Gentle neck exercises after acute phase",
      "Physiotherapy – cervical traction",
      "Ergonomic workspace adjustment – monitor at eye level",
      "Cervical pillow at night",
      "Avoid prolonged neck flexion (phone/laptop)",
      "Warm fomentation to neck"
    ],
    followUp: "2 Weeks",
    medicines: [
      { id: 13, dose: "1", timings: "1-0-0", timingsNote: "After Food", duration: "5 Days", qty: "5" },
      { id: 58, dose: "1", timings: "1-0-0", timingsNote: "30 min Before Food", duration: "5 Days", qty: "5" },
      { id: 37, dose: "1", timings: "0-0-1", timingsNote: "After Food", duration: "30 Days", qty: "30" },
      { id: 55, dose: "Apply", timings: "3-4 times daily", timingsNote: "Over neck/shoulder area", duration: "14 Days", qty: "1 tube" }
    ]
  },

  "lumbar-radiculopathy": {
    label: "Lumbar Radiculopathy",
    icon: "🔰",
    diagnosis: "Lumbar Radiculopathy / Sciatica (M54.4)",
    icd10: "M54.4",
    complaints: "Lower back pain, pain radiating to leg, tingling/numbness, sciatica",
    examination: "Tenderness over lumbar spine\nSLR – Positive at ___ degrees\nFemoral stretch test – Negative\nAnkle jerk – Normal/Reduced\nMotor power – Normal/Reduced",
    advice: [
      "Bed rest for 48 hours then gradual mobilization",
      "Lumbar support/corset",
      "Core strengthening exercises when pain reduces",
      "Physiotherapy – lumbar traction",
      "Avoid bending, lifting heavy weights, twisting",
      "Hot pack over lower back",
      "Sleep supine with pillow under knees"
    ],
    followUp: "2 Weeks",
    medicines: [
      { id: 13, dose: "1", timings: "1-0-0", timingsNote: "After Food", duration: "5 Days", qty: "5" },
      { id: 58, dose: "1", timings: "1-0-0", timingsNote: "30 min Before Food", duration: "5 Days", qty: "5" },
      { id: 17, dose: "1", timings: "0-0-1", timingsNote: "After Food", duration: "30 Days", qty: "30" },
      { id: 55, dose: "Apply", timings: "3-4 times daily", timingsNote: "Over lower back", duration: "14 Days", qty: "1 tube" }
    ]
  },

  "frozen-shoulder": {
    label: "Frozen Shoulder",
    icon: "💪",
    diagnosis: "Adhesive Capsulitis of Shoulder (M75.0)",
    icd10: "M75.0",
    complaints: "Shoulder pain, stiffness, inability to raise arm, difficulty with daily activities",
    examination: "Restricted ROM in all directions\nForward flexion: ___ degrees\nAbduction: ___ degrees\nExternal rotation: ___ degrees\nNo muscle wasting",
    advice: [
      "Pendulum exercises – Codman's exercises",
      "Overhead pulley exercises",
      "Physiotherapy 3×/week",
      "Hot pack before exercises",
      "Sleep on unaffected side",
      "Gradual progressive exercises",
      "Patient education – recovery takes 12–18 months"
    ],
    followUp: "3 Weeks",
    medicines: [
      { id: 12, dose: "1", timings: "1-0-0", timingsNote: "After Food", duration: "7 Days", qty: "7" },
      { id: 58, dose: "1", timings: "1-0-0", timingsNote: "30 min Before Food", duration: "7 Days", qty: "7" },
      { id: 33, dose: "1", timings: "1-0-1", timingsNote: "After Food", duration: "7 Days", qty: "14" }
    ]
  },

  "tennis-elbow": {
    label: "Tennis Elbow",
    icon: "🎾",
    diagnosis: "Lateral Epicondylitis – Tennis Elbow (M77.1)",
    icd10: "M77.1",
    complaints: "Lateral elbow pain, pain on gripping, pain on wrist extension, tenderness over lateral epicondyle",
    examination: "Tenderness at lateral epicondyle\nCozen's test – Positive\nMill's test – Positive\nGrip strength – Reduced on affected side",
    advice: [
      "Rest from aggravating activities",
      "Counterforce brace (tennis elbow brace)",
      "Ice pack 15–20 min, 3×/day for first 48 hours",
      "Eccentric wrist extension exercises",
      "Physiotherapy – ultrasound, deep transverse massage",
      "Modify technique if sports-related",
      "Ergonomic keyboard/mouse"
    ],
    followUp: "3 Weeks",
    medicines: [
      { id: 12, dose: "1", timings: "1-0-0", timingsNote: "After Food", duration: "5 Days", qty: "5" },
      { id: 58, dose: "1", timings: "1-0-0", timingsNote: "30 min Before Food", duration: "5 Days", qty: "5" },
      { id: 11, dose: "1", timings: "1-0-1", timingsNote: "Empty Stomach", duration: "7 Days", qty: "14" },
      { id: 55, dose: "Apply", timings: "3 times daily", timingsNote: "Over lateral elbow", duration: "14 Days", qty: "1 tube" }
    ]
  },

  "plantar-fasciitis": {
    label: "Plantar Fasciitis",
    icon: "🦶",
    diagnosis: "Plantar Fasciitis (M72.2)",
    icd10: "M72.2",
    complaints: "Heel pain, morning pain worse on first steps, pain under the heel, difficulty walking",
    examination: "Tenderness at medial calcaneal tubercle\nPlantar fascia stretch test – Positive\nCalcaneal spur on X-ray (if present)\nNo neurological deficit",
    advice: [
      "Silicone heel pad / plantar fascia insole",
      "Plantar fascia stretching exercises – 3×/day",
      "Calf stretching exercises",
      "Ice bottle rolling under foot – 15 min daily",
      "Avoid walking barefoot on hard surfaces",
      "Supportive footwear with cushioned sole",
      "Night splint for persistent cases",
      "Avoid prolonged standing"
    ],
    followUp: "3 Weeks",
    medicines: [
      { id: 12, dose: "1", timings: "1-0-0", timingsNote: "After Food", duration: "7 Days", qty: "7" },
      { id: 58, dose: "1", timings: "1-0-0", timingsNote: "30 min Before Food", duration: "7 Days", qty: "7" },
      { id: 11, dose: "1", timings: "1-0-1", timingsNote: "Empty Stomach", duration: "7 Days", qty: "14" }
    ]
  },

  "acl-injury": {
    label: "ACL Injury",
    icon: "⚽",
    diagnosis: "Rupture of Anterior Cruciate Ligament (S83.5)",
    icd10: "S83.5",
    complaints: "Knee pain, swelling, instability, feeling of giving way, unable to bear weight",
    examination: "Knee swelling – present\nLachman's test – Positive\nAnterior drawer test – Positive\nPivot shift test – Positive\nMeniscal tests – Negative\nMRI advised",
    advice: [
      "RICE – Rest, Ice, Compression, Elevation",
      "Hinged knee brace",
      "Non-weight bearing / partial weight bearing with crutches",
      "Quadriceps strengthening exercises",
      "MRI Knee advised",
      "Surgical ACL reconstruction discussion",
      "Physiotherapy referral"
    ],
    followUp: "2 Weeks",
    medicines: [
      { id: 12, dose: "1", timings: "1-0-0", timingsNote: "After Food", duration: "7 Days", qty: "7" },
      { id: 58, dose: "1", timings: "1-0-0", timingsNote: "30 min Before Food", duration: "7 Days", qty: "7" },
      { id: 11, dose: "1", timings: "1-0-1", timingsNote: "Empty Stomach", duration: "5 Days", qty: "10" }
    ]
  },

  "meniscus-tear": {
    label: "Meniscus Tear",
    icon: "🏃",
    diagnosis: "Tear of Medial Meniscus (S83.2)",
    icd10: "S83.2",
    complaints: "Knee pain, swelling, locking, clicking, difficulty fully straightening or bending knee",
    examination: "Tenderness at medial/lateral joint line\nMcMurray's test – Positive\nApley's test – Positive\nLachman's test – Negative\nMRI Knee advised",
    advice: [
      "RICE therapy initially",
      "Knee brace support",
      "Non-weight bearing on affected side",
      "Avoid squatting and twisting",
      "MRI Knee advised",
      "Arthroscopic surgery discussion"
    ],
    followUp: "2 Weeks",
    medicines: [
      { id: 12, dose: "1", timings: "1-0-0", timingsNote: "After Food", duration: "5 Days", qty: "5" },
      { id: 58, dose: "1", timings: "1-0-0", timingsNote: "30 min Before Food", duration: "5 Days", qty: "5" },
      { id: 11, dose: "1", timings: "1-0-1", timingsNote: "Empty Stomach", duration: "5 Days", qty: "10" }
    ]
  },

  "ankle-sprain": {
    label: "Ankle Sprain",
    icon: "🦵",
    diagnosis: "Sprain of Ankle – Lateral Ligament (S93.4)",
    icd10: "S93.4",
    complaints: "Ankle pain, swelling, bruising after twisting injury, difficulty weight bearing",
    examination: "Swelling over lateral malleolus\nTenderness at ATFL/CFL\nAnterior drawer test – Positive (Grade II/III)\nNo bony tenderness (Ottawa – Negative)",
    advice: [
      "RICE – Rest, Ice, Compression, Elevation for 48–72 hours",
      "Ankle crepe bandage compression",
      "Ankle brace for 3–4 weeks",
      "Gentle ankle mobilization after 48 hours",
      "Proprioceptive exercises when weight bearing",
      "Crutches if unable to bear weight",
      "X-ray done / X-ray advised"
    ],
    followUp: "2 Weeks",
    medicines: [
      { id: 16, dose: "1", timings: "1-0-1", timingsNote: "After Food", duration: "5 Days", qty: "10" },
      { id: 58, dose: "1", timings: "1-0-0", timingsNote: "30 min Before Food", duration: "5 Days", qty: "5" },
      { id: 11, dose: "1", timings: "1-0-1", timingsNote: "Empty Stomach", duration: "5 Days", qty: "10" },
      { id: 55, dose: "Apply", timings: "3 times daily", timingsNote: "Over ankle", duration: "7 Days", qty: "1 tube" }
    ]
  }
};
