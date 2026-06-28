// Dr Chetan M Dojode – Actual Medication List (from Chetan Medication-Alpha.docx)
// Format: { id, brand, type, form, content, dose, timings, timingsNote, duration, qty, indications }
// Timings format matches prescription Excel: "M-A-N"  e.g. "0-1-0"

const MEDICINE_DB = [
  {
    id: 1,
    brand: "Altraday",
    type: "TAB",
    form: "Tablet",
    content: "Aceclofenac 200 mg + Rabeprazole 20 mg",
    dose: "1",
    timings: "1-0-1",
    timingsNote: "After Food",
    duration: "5 Days",
    qty: "10",
    indications: ["pain", "OA", "arthritis", "joint pain", "back pain", "NSAID", "aceclofenac", "rabeprazole", "altraday"]
  },
  {
    id: 3,
    brand: "BONISTA PF",
    type: "INJ",
    form: "Injection",
    content: "Teriparatide 20 mcg",
    dose: "20 mcg",
    timings: "Once daily",
    timingsNote: "Subcutaneous injection",
    duration: "As directed",
    qty: "",
    indications: ["osteoporosis", "teriparatide", "bone building", "fracture prevention", "bonista"]
  },
  {
    id: 4,
    brand: "Cartigen DN",
    type: "TAB",
    form: "Tablet",
    content: "Glucosamine sulfate 750 mg + Diacerein 50 mg + Methyl Sulfonyl Methane (MSM) 500 mg",
    dose: "1",
    timings: "0-1-0",
    timingsNote: "After Food",
    duration: "90 Days",
    qty: "90",
    indications: ["OA", "knee OA", "hip OA", "cartilage", "glucosamine", "diacerein", "cartigen"]
  },
  {
    id: 5,
    brand: "Cartigen Duo",
    type: "TAB",
    form: "Tablet",
    content: "Glucosamine sulfate 750 mg + Chondroitin sulfate 400 mg",
    dose: "1",
    timings: "0-1-0",
    timingsNote: "After Food",
    duration: "90 Days",
    qty: "90",
    indications: ["OA", "cartilage", "glucosamine", "chondroitin", "cartigen"]
  },
  {
    id: 6,
    brand: "Cartigen Forte+",
    type: "TAB",
    form: "Tablet",
    content: "Glucosamine sulfate 750 mg + MSM 500 mg + Diacerein 50 mg + Cholecalciferol 1000–2000 IU + Calcium carbonate 500 mg",
    dose: "1",
    timings: "0-1-0",
    timingsNote: "After Food",
    duration: "90 Days",
    qty: "90",
    indications: ["OA", "knee OA", "cartilage", "glucosamine", "calcium", "vitamin D", "cartigen forte"]
  },
  {
    id: 7,
    brand: "Cartigen Pro",
    type: "TAB",
    form: "Tablet",
    content: "Glucosamine sulfate 750 mg + Collagen peptide 250 mg + Astaxanthin 4 mg",
    dose: "1",
    timings: "0-1-0",
    timingsNote: "After Food",
    duration: "90 Days",
    qty: "90",
    indications: ["OA", "cartilage", "glucosamine", "collagen", "cartigen"]
  },
  {
    id: 8,
    brand: "DFO 4X Solution",
    type: "GEL",
    form: "Topical Solution",
    content: "Diclofenac diethylamine 1.16% w/w + Methyl salicylate 10% w/w + Menthol 3% w/w + Linseed oil + Alcohol",
    dose: "Apply",
    timings: "3-4 times daily",
    timingsNote: "Over affected area",
    duration: "14 Days",
    qty: "1 bottle",
    indications: ["pain", "topical", "joint pain", "sports injury", "diclofenac", "DFO"]
  },
  {
    id: 9,
    brand: "D Rise 60,000 IU",
    type: "CAP",
    form: "Capsule",
    content: "Vitamin D₃ (Cholecalciferol) 60,000 IU",
    dose: "1",
    timings: "0-1-0",
    timingsNote: "Weekly – After Food",
    duration: "8 Weeks",
    qty: "8",
    indications: ["vitamin D", "Vit D deficiency", "calcium", "bone", "cholecalciferol", "D rise"]
  },
  {
    id: 10,
    brand: "Denu",
    type: "INJ",
    form: "Injection",
    content: "Denosumab 60 mg / 1 mL",
    dose: "60 mg",
    timings: "Once in 6 months",
    timingsNote: "Subcutaneous injection",
    duration: "As directed",
    qty: "",
    indications: ["osteoporosis", "denosumab", "bone loss", "fracture prevention", "denu"]
  },
  {
    id: 11,
    brand: "Disperzyme",
    type: "TAB",
    form: "Tablet",
    content: "Trypsin 48,000 IU + Bromelain 90 mg + Rutoside trihydrate 100 mg",
    dose: "1",
    timings: "1-0-1",
    timingsNote: "Empty Stomach",
    duration: "7 Days",
    qty: "14",
    indications: ["swelling", "edema", "post-surgery", "inflammation", "enzyme", "sprain", "disperzyme"]
  },
  {
    id: 12,
    brand: "Etoshine 90 mg",
    type: "TAB",
    form: "Tablet",
    content: "Etoricoxib 90 mg",
    dose: "1",
    timings: "1-0-0",
    timingsNote: "After Food",
    duration: "5 Days",
    qty: "5",
    indications: ["pain", "OA", "gout", "ankylosing spondylitis", "NSAID", "etoricoxib", "etoshine"]
  },
  {
    id: 13,
    brand: "Etoshine MR",
    type: "TAB",
    form: "Tablet",
    content: "Etoricoxib 90 mg + Thiocolchicoside 4 mg",
    dose: "1",
    timings: "1-0-0",
    timingsNote: "After Food",
    duration: "5 Days",
    qty: "5",
    indications: ["pain", "muscle spasm", "back pain", "neck pain", "etoricoxib", "thiocolchicoside", "etoshine MR"]
  },
  {
    id: 14,
    brand: "Febustat 40 mg",
    type: "TAB",
    form: "Tablet",
    content: "Febuxostat 40 mg",
    dose: "1",
    timings: "0-1-0",
    timingsNote: "After Food",
    duration: "90 Days",
    qty: "90",
    indications: ["gout", "hyperuricemia", "uric acid", "febuxostat", "febustat"]
  },
  {
    id: 15,
    brand: "Felicita OD",
    type: "TAB",
    form: "Tablet",
    content: "Benfotiamine 150 mg + Alpha-lipoic Acid 100 mg + Methylcobalamin 1500 µg + Chromium Polynicotinate 200 µg",
    dose: "1",
    timings: "1-0-0",
    timingsNote: "After Food",
    duration: "30 Days",
    qty: "30",
    indications: ["neuropathy", "nerve", "B12", "diabetic neuropathy", "felicita", "benfotiamine", "methylcobalamin"]
  },
  {
    id: 16,
    brand: "Flexura D",
    type: "TAB",
    form: "Tablet",
    content: "Chlorzoxazone 250 mg + Diclofenac Sodium 50 mg + Paracetamol 325 mg",
    dose: "1",
    timings: "1-0-1",
    timingsNote: "After Food",
    duration: "5 Days",
    qty: "10",
    indications: ["pain", "muscle spasm", "back pain", "neck pain", "chlorzoxazone", "diclofenac", "flexura"]
  },
  {
    id: 17,
    brand: "Frawik Plus",
    type: "TAB",
    form: "Tablet",
    content: "Methylcobalamin 1500 µg + Pregabalin 75 mg + Alpha-lipoic Acid 100 mg + Folic Acid 1.5 mg + Pyridoxine 2 mg",
    dose: "1",
    timings: "0-0-1",
    timingsNote: "After Food",
    duration: "30 Days",
    qty: "30",
    indications: ["neuropathy", "radiculopathy", "nerve pain", "sciatica", "pregabalin", "methylcobalamin", "frawik"]
  },
  {
    id: 18,
    brand: "Gabapin ME",
    type: "TAB",
    form: "Tablet",
    content: "Gabapentin 300 mg + Methylcobalamin 1500 µg",
    dose: "1",
    timings: "0-0-1",
    timingsNote: "After Food",
    duration: "30 Days",
    qty: "30",
    indications: ["neuropathy", "nerve pain", "radiculopathy", "gabapentin", "methylcobalamin", "gabapin"]
  },
  {
    id: 19,
    brand: "Gemcal",
    type: "CAP",
    form: "Capsule",
    content: "Calcium Carbonate 500 mg + Calcitriol 0.25 µg + Zinc 7.5 mg",
    dose: "1",
    timings: "0-1-0",
    timingsNote: "After Food",
    duration: "90 Days",
    qty: "90",
    indications: ["calcium", "bone", "osteoporosis", "calcitriol", "vitamin D", "gemcal"]
  },
  {
    id: 20,
    brand: "Gemcal Kit",
    type: "KIT",
    form: "Kit (Tablet + Capsule)",
    content: "Calcium Carbonate 500 mg + Calcitriol 0.25 µg + Zinc 7.5 mg + Folic Acid 1.5 mg + Methylcobalamin 1500 µg + Omega-3 Fatty Acids (EPA/DHA) 500 mg",
    dose: "1 kit",
    timings: "0-1-0",
    timingsNote: "After Food",
    duration: "90 Days",
    qty: "90",
    indications: ["calcium", "bone", "osteoporosis", "methylcobalamin", "omega3", "gemcal kit"]
  },
  {
    id: 21,
    brand: "Gemcal Plus",
    type: "CAP",
    form: "Capsule",
    content: "Calcium Citrate Malate 500 mg + Calcitriol 0.25 µg + Zinc 7.5 mg + Magnesium 50 mg + Methylcobalamin 1500 µg",
    dose: "1",
    timings: "0-1-0",
    timingsNote: "After Food",
    duration: "90 Days",
    qty: "90",
    indications: ["calcium", "bone", "osteoporosis", "magnesium", "methylcobalamin", "gemcal plus"]
  },
  {
    id: 22,
    brand: "Gemcal Nasal Spray",
    type: "SPRAY",
    form: "Nasal Spray",
    content: "Calcitonin 200 IU per actuation",
    dose: "1 spray",
    timings: "0-0-1",
    timingsNote: "Alternate nostrils daily",
    duration: "As directed",
    qty: "1 bottle",
    indications: ["osteoporosis", "calcitonin", "bone pain", "hypercalcemia", "gemcal nasal"]
  },
  {
    id: 23,
    brand: "Gemidro 150 mg",
    type: "TAB",
    form: "Tablet",
    content: "Risedronate Sodium 150 mg",
    dose: "1",
    timings: "Monthly",
    timingsNote: "Empty stomach – remain upright 30 min",
    duration: "12 Months",
    qty: "12",
    indications: ["osteoporosis", "risedronate", "bisphosphonate", "bone loss", "gemidro"]
  },
  {
    id: 24,
    brand: "Gemtide",
    type: "INJ",
    form: "Injection",
    content: "Teriparatide 20 µg / pre-filled syringe",
    dose: "20 µg",
    timings: "Once daily",
    timingsNote: "Subcutaneous injection",
    duration: "As directed",
    qty: "",
    indications: ["osteoporosis", "teriparatide", "bone building", "gemtide"]
  },
  {
    id: 25,
    brand: "GutGermina",
    type: "CAP",
    form: "Capsule",
    content: "Saccharomyces boulardii 250 mg + Bacillus mesentericus 0.5 billion + Clostridium butyricum 0.5 billion + Streptococcus faecalis 0.5 billion + Lactobacillus sporogenes 0.5 billion CFU",
    dose: "1",
    timings: "1-0-1",
    timingsNote: "After Food",
    duration: "14 Days",
    qty: "28",
    indications: ["probiotic", "diarrhea", "gut flora", "GI", "antibiotic associated", "gutgermina"]
  },
  {
    id: 26,
    brand: "Hitap ER 50 mg",
    type: "TAB",
    form: "Tablet (Extended Release)",
    content: "Tapentadol Extended Release 50 mg",
    dose: "1",
    timings: "1-0-1",
    timingsNote: "After Food – do not crush",
    duration: "5 Days",
    qty: "10",
    indications: ["severe pain", "chronic pain", "tapentadol", "opioid", "hitap"]
  },
  {
    id: 27,
    brand: "Lumia 60,000 IU",
    type: "CAP",
    form: "Capsule",
    content: "Cholecalciferol (Vitamin D₃) 60,000 IU",
    dose: "1",
    timings: "0-1-0",
    timingsNote: "Weekly – After Food",
    duration: "8 Weeks",
    qty: "8",
    indications: ["vitamin D", "Vit D deficiency", "bone", "cholecalciferol", "lumia"]
  },
  {
    id: 28,
    brand: "Lumia CK",
    type: "TAB",
    form: "Tablet",
    content: "Calcium Citrate 500 mg + Vitamin K₂ 45 µg + Magnesium 100 mg + Zinc 7.5 mg",
    dose: "1",
    timings: "0-1-0",
    timingsNote: "After Food",
    duration: "90 Days",
    qty: "90",
    indications: ["calcium", "bone", "osteoporosis", "vitamin K2", "magnesium", "lumia CK"]
  },
  {
    id: 29,
    brand: "MG D3",
    type: "TAB",
    form: "Tablet",
    content: "Methylcobalamin 1500 µg + Vitamin D₃ (Cholecalciferol) 60,000 IU",
    dose: "1",
    timings: "0-1-0",
    timingsNote: "Weekly – After Food",
    duration: "8 Weeks",
    qty: "8",
    indications: ["vitamin D", "methylcobalamin", "nerve", "bone", "MG D3"]
  },
  {
    id: 30,
    brand: "Mobizox LD",
    type: "TAB",
    form: "Tablet",
    content: "Chlorzoxazone 250 mg + Diclofenac Sodium 50 mg + Paracetamol 325 mg",
    dose: "1",
    timings: "1-0-1",
    timingsNote: "After Food",
    duration: "5 Days",
    qty: "10",
    indications: ["pain", "muscle spasm", "back pain", "chlorzoxazone", "diclofenac", "mobizox"]
  },
  {
    id: 31,
    brand: "Mupimet 10 g Cream",
    type: "CREAM",
    form: "Cream",
    content: "Mupirocin 2% w/w",
    dose: "Apply",
    timings: "3 times daily",
    timingsNote: "Over affected area",
    duration: "7 Days",
    qty: "1 tube",
    indications: ["wound", "infection", "skin", "mupirocin", "antibiotic cream", "mupimet"]
  },
  {
    id: 32,
    brand: "MyoFatige",
    type: "TAB",
    form: "Tablet",
    content: "MyoInositol 2 g + D-ChiroInositol 200 mg + L-Arginine 1 g + L-Carnitine 500 mg + Coenzyme Q10 100 mg + Folic Acid 1.5 mg",
    dose: "1",
    timings: "1-0-0",
    timingsNote: "After Food",
    duration: "90 Days",
    qty: "90",
    indications: ["fatigue", "muscle recovery", "energy", "myoinositol", "coenzyme Q10", "myofatige"]
  },
  {
    id: 33,
    brand: "Myospaz Forte",
    type: "TAB",
    form: "Tablet",
    content: "Chlorzoxazone 250 mg + Diclofenac Sodium 50 mg + Paracetamol 325 mg",
    dose: "1",
    timings: "1-0-1",
    timingsNote: "After Food",
    duration: "5 Days",
    qty: "10",
    indications: ["pain", "muscle spasm", "back pain", "chlorzoxazone", "diclofenac", "myospaz"]
  },
  {
    id: 34,
    brand: "Naprosyn 250 mg",
    type: "TAB",
    form: "Tablet",
    content: "Naproxen 250 mg",
    dose: "1",
    timings: "1-0-1",
    timingsNote: "After Food",
    duration: "5 Days",
    qty: "10",
    indications: ["pain", "OA", "RA", "gout", "NSAID", "naproxen", "naprosyn"]
  },
  {
    id: 35,
    brand: "Naso B12 Nasal Spray",
    type: "SPRAY",
    form: "Nasal Spray",
    content: "Methylcobalamin (Vitamin B₁₂) 500 µg per spray",
    dose: "1 spray each nostril",
    timings: "1-0-0",
    timingsNote: "Daily",
    duration: "30 Days",
    qty: "1 bottle",
    indications: ["B12 deficiency", "neuropathy", "nerve", "methylcobalamin", "naso B12"]
  },
  {
    id: 36,
    brand: "Nervijen D3",
    type: "TAB",
    form: "Tablet",
    content: "Methylcobalamin 1500 µg + Vitamin D₃ 1000 IU + Alpha-lipoic Acid 100 mg + Benfotiamine 7.5 mg + Folic Acid 1.5 mg + Biotin 5 µg + Inositol 1.5 mg",
    dose: "1",
    timings: "0-1-0",
    timingsNote: "After Food",
    duration: "30 Days",
    qty: "30",
    indications: ["neuropathy", "nerve", "vitamin D", "B12", "methylcobalamin", "nervijen D3"]
  },
  {
    id: 37,
    brand: "Nervijen P",
    type: "TAB",
    form: "Tablet",
    content: "Pregabalin 75 mg + Methylcobalamin 1500 µg + Benfotiamine 150 mg + Folic Acid 1.5 mg + Pyridoxine 2 mg",
    dose: "1",
    timings: "0-0-1",
    timingsNote: "After Food",
    duration: "30 Days",
    qty: "30",
    indications: ["neuropathy", "nerve pain", "radiculopathy", "sciatica", "pregabalin", "nervijen P"]
  },
  {
    id: 38,
    brand: "Nervmax Active",
    type: "TAB",
    form: "Tablet",
    content: "Methylcobalamin + Alpha-lipoic Acid + Pyridoxine + Folic Acid + Biotin",
    dose: "1",
    timings: "0-1-0",
    timingsNote: "After Food",
    duration: "30 Days",
    qty: "30",
    indications: ["neuropathy", "nerve", "B12", "nervmax active"]
  },
  {
    id: 39,
    brand: "Nervmax NT",
    type: "TAB",
    form: "Tablet",
    content: "Nortriptyline + Pregabalin + Methylcobalamin",
    dose: "1",
    timings: "0-0-1",
    timingsNote: "After Food",
    duration: "30 Days",
    qty: "30",
    indications: ["neuropathic pain", "chronic pain", "pregabalin", "nortriptyline", "nervmax NT"]
  },
  {
    id: 40,
    brand: "Nervmax SR 75",
    type: "TAB",
    form: "Tablet",
    content: "Pregabalin SR 75 mg + Methylcobalamin",
    dose: "1",
    timings: "0-0-1",
    timingsNote: "After Food",
    duration: "30 Days",
    qty: "30",
    indications: ["neuropathy", "radiculopathy", "sciatica", "pregabalin SR", "nervmax SR"]
  },
  {
    id: 41,
    brand: "NeuGaba M",
    type: "TAB",
    form: "Tablet",
    content: "Gabapentin 300 mg + Methylcobalamin 1500 µg",
    dose: "1",
    timings: "0-0-1",
    timingsNote: "After Food",
    duration: "30 Days",
    qty: "30",
    indications: ["neuropathy", "nerve pain", "gabapentin", "methylcobalamin", "neugaba"]
  },
  {
    id: 42,
    brand: "NeuGaba MN",
    type: "TAB",
    form: "Tablet",
    content: "Gabapentin 300 mg + Methylcobalamin 1500 µg + Nortriptyline 10 mg",
    dose: "1",
    timings: "0-0-1",
    timingsNote: "After Food",
    duration: "30 Days",
    qty: "30",
    indications: ["neuropathic pain", "chronic pain", "gabapentin", "nortriptyline", "neugaba MN"]
  },
  {
    id: 43,
    brand: "NeuroZin",
    type: "TAB",
    form: "Tablet",
    content: "Zinc 7.5 mg + Methylcobalamin 1500 µg + Folic Acid 1.5 mg + Multivitamins",
    dose: "1",
    timings: "1-0-0",
    timingsNote: "After Food",
    duration: "30 Days",
    qty: "30",
    indications: ["nerve", "B12", "zinc", "multivitamin", "neurozin"]
  },
  {
    id: 44,
    brand: "Nusowin Powder",
    type: "PWD",
    form: "Powder",
    content: "Protein ~10 g + Vitamins & Minerals (standard RDA) + DHA 100 mg + Antioxidants",
    dose: "1 scoop in 200 mL water/milk",
    timings: "1-0-0",
    timingsNote: "Before/After exercise",
    duration: "90 Days",
    qty: "1 tin",
    indications: ["protein", "nutrition", "muscle recovery", "nusowin"]
  },
  {
    id: 45,
    brand: "Ostoshine",
    type: "TAB",
    form: "Tablet",
    content: "Calcitriol 0.25 µg + Calcium 500 mg + Zinc 7.5 mg + Magnesium 50 mg",
    dose: "1",
    timings: "0-1-0",
    timingsNote: "After Food",
    duration: "90 Days",
    qty: "90",
    indications: ["calcium", "bone", "osteoporosis", "calcitriol", "ostoshine"]
  },
  {
    id: 46,
    brand: "Palocap 2 mg",
    type: "TAB",
    form: "Tablet",
    content: "Poliexar 2 mg",
    dose: "1",
    timings: "0-1-0",
    timingsNote: "After Food",
    duration: "14 Days",
    qty: "14",
    indications: ["muscle relaxant", "spasm", "palocap"]
  },
  {
    id: 47,
    brand: "Pantocid DSR 30",
    type: "CAP",
    form: "Capsule",
    content: "Pantoprazole 30 mg (enteric-coated SR) + Domperidone 10 mg",
    dose: "1",
    timings: "1-0-0",
    timingsNote: "30 min Before Food",
    duration: "14 Days",
    qty: "14",
    indications: ["acid reflux", "GERD", "gastroprotection", "NSAID protection", "pantoprazole", "pantocid"]
  },
  {
    id: 48,
    brand: "Pregabid CR",
    type: "TAB",
    form: "Tablet (Controlled Release)",
    content: "Pregabalin SR 150 mg",
    dose: "1",
    timings: "0-0-1",
    timingsNote: "After Food",
    duration: "30 Days",
    qty: "30",
    indications: ["neuropathic pain", "sciatica", "radiculopathy", "fibromyalgia", "pregabalin", "pregabid"]
  },
  {
    id: 49,
    brand: "Pregabid NT",
    type: "TAB",
    form: "Tablet",
    content: "Pregabalin 75 mg + Nortriptyline 10 mg",
    dose: "1",
    timings: "0-0-1",
    timingsNote: "After Food",
    duration: "30 Days",
    qty: "30",
    indications: ["neuropathic pain", "chronic pain", "sleep", "pregabalin", "nortriptyline", "pregabid NT"]
  },
  {
    id: 50,
    brand: "Pregabid Trio",
    type: "TAB",
    form: "Tablet",
    content: "Pregabalin 75 mg + Nortriptyline 10 mg + Methylcobalamin 1500 µg",
    dose: "1",
    timings: "0-0-1",
    timingsNote: "After Food",
    duration: "30 Days",
    qty: "30",
    indications: ["neuropathic pain", "radiculopathy", "pregabalin", "nortriptyline", "methylcobalamin", "pregabid trio"]
  },
  {
    id: 51,
    brand: "Prixain Gel",
    type: "GEL",
    form: "Gel",
    content: "Lignocaine 2% + Diclofenac Sodium 1.16% + Menthol 3% + Methyl Salicylate 10%",
    dose: "Apply",
    timings: "3 times daily",
    timingsNote: "Over affected area",
    duration: "14 Days",
    qty: "1 tube",
    indications: ["pain", "topical", "joint pain", "lignocaine", "diclofenac", "prixain"]
  },
  {
    id: 52,
    brand: "Proaxon",
    type: "TAB",
    form: "Tablet",
    content: "Cyanocobalamin 1500 µg + Cytidine 50 mg + Folic Acid 1.5 mg + Palmitoylethanolamide (PEA) 300 mg + Uridine 75 mg",
    dose: "1",
    timings: "1-0-0",
    timingsNote: "After Food",
    duration: "30 Days",
    qty: "30",
    indications: ["neuropathy", "nerve regeneration", "B12", "PEA", "proaxon"]
  },
  {
    id: 53,
    brand: "Prohance Active Power",
    type: "PWD",
    form: "Powder",
    content: "Whey Protein 20 g + DHA 250 mg + Vitamins & Minerals (Vit D₃ 400 IU, B-complex, Calcium, Magnesium) + Amino Acids 5 g",
    dose: "1 scoop in 200 mL water/milk",
    timings: "1-0-0",
    timingsNote: "After Exercise or with breakfast",
    duration: "90 Days",
    qty: "1 tin",
    indications: ["protein", "muscle", "nutrition", "recovery", "whey", "prohance"]
  },
  {
    id: 54,
    brand: "Remarch 5V",
    type: "TAB",
    form: "Tablet",
    content: "Vitamin D₃ 1000 IU + Vitamin K₂ 45 µg + Magnesium 100 mg + Zinc 7.5 mg + Calcium 500 mg",
    dose: "1",
    timings: "0-1-0",
    timingsNote: "After Food",
    duration: "90 Days",
    qty: "90",
    indications: ["bone", "calcium", "vitamin D", "vitamin K2", "osteoporosis", "remarch"]
  },
  {
    id: 55,
    brand: "Sentidor Gel",
    type: "GEL",
    form: "Gel",
    content: "Diclofenac Diethylamine 1.16% + Methyl Salicylate 10% + Menthol 3% + Linseed Oil",
    dose: "Apply",
    timings: "3-4 times daily",
    timingsNote: "Over affected area – gentle massage",
    duration: "14 Days",
    qty: "1 tube",
    indications: ["pain", "topical", "joint pain", "sports injury", "diclofenac gel", "sentidor"]
  },
  {
    id: 56,
    brand: "Shelcal Joints",
    type: "TAB",
    form: "Tablet",
    content: "Calcium Citrate 500 mg + Vitamin D₃ 1000 IU + Collagen Peptide 250 mg + Rosehip Extract 50 mg",
    dose: "1",
    timings: "0-1-0",
    timingsNote: "After Food",
    duration: "90 Days",
    qty: "90",
    indications: ["calcium", "bone", "joints", "collagen", "vitamin D", "shelcal"]
  },
  {
    id: 57,
    brand: "Shelcal XT",
    type: "TAB",
    form: "Tablet",
    content: "Calcium Carbonate 500 mg + Vitamin D₃ 400 IU + Folic Acid 1.5 mg + Ferrous Fumarate 100 mg",
    dose: "1",
    timings: "0-1-0",
    timingsNote: "After Food",
    duration: "90 Days",
    qty: "90",
    indications: ["calcium", "bone", "iron deficiency", "anemia", "shelcal XT"]
  },
  {
    id: 58,
    brand: "Somparz",
    type: "TAB",
    form: "Tablet",
    content: "Esomeprazole 40 mg",
    dose: "1",
    timings: "1-0-0",
    timingsNote: "30 min Before Food",
    duration: "14 Days",
    qty: "14",
    indications: ["acid reflux", "GERD", "gastroprotection", "NSAID protection", "esomeprazole", "somparz"]
  },
  {
    id: 59,
    brand: "Supracal Pro Plus",
    type: "TAB",
    form: "Tablet",
    content: "Calcium Citrate 500 mg + Calcitriol 0.25 µg + Zinc 7.5 mg + Magnesium 50 mg + Vitamin K₂ 45 µg",
    dose: "1",
    timings: "0-1-0",
    timingsNote: "After Food",
    duration: "90 Days",
    qty: "90",
    indications: ["calcium", "bone", "osteoporosis", "calcitriol", "vitamin K2", "supracal"]
  },
  {
    id: 60,
    brand: "T Heal Forte",
    type: "TAB",
    form: "Tablet",
    content: "Chondroitin sulfate 200 mg + Collagen peptide 40 mg + L-arginine 500 mg + Sodium hyaluronate 30 mg + Vitamin C 12.5 mg",
    dose: "1",
    timings: "0-1-0",
    timingsNote: "After Food",
    duration: "90 Days",
    qty: "90",
    indications: ["tendon", "collagen", "joint repair", "chondroitin", "hyaluronate", "T heal"]
  },
  {
    id: 61,
    brand: "Tapal ER 50",
    type: "TAB",
    form: "Tablet (Extended Release)",
    content: "Tapentadol ER 50 mg",
    dose: "1",
    timings: "1-0-1",
    timingsNote: "After Food – do not crush",
    duration: "5 Days",
    qty: "10",
    indications: ["severe pain", "chronic pain", "tapentadol", "opioid", "tapal"]
  },
  {
    id: 62,
    brand: "Tendocare Forte",
    type: "CAP",
    form: "Capsule",
    content: "Collagen Peptide 500 mg + Sodium Hyaluronate 20 mg + Chondroitin Sulfate 100 mg + Vitamin C 60 mg + Boswellia Extract 250 mg",
    dose: "1",
    timings: "0-1-0",
    timingsNote: "After Food",
    duration: "90 Days",
    qty: "90",
    indications: ["tendon", "collagen", "joints", "tendinitis", "boswellia", "tendocare"]
  },
  {
    id: 63,
    brand: "Tofashine XR",
    type: "TAB",
    form: "Tablet (Extended Release)",
    content: "Tofacitinib Extended Release 11 mg",
    dose: "1",
    timings: "1-0-0",
    timingsNote: "After Food",
    duration: "As directed",
    qty: "",
    indications: ["RA", "rheumatoid arthritis", "psoriatic arthritis", "tofacitinib", "JAK inhibitor", "tofashine"]
  },
  {
    id: 64,
    brand: "Tolagin 8",
    type: "TAB",
    form: "Tablet",
    content: "Type II Collagen 40 mg + Sodium Hyaluronate 20 mg + Vitamin C 60 mg + Boron 3 mg + Curcumin 100 mg + MSM 500 mg",
    dose: "1",
    timings: "0-1-0",
    timingsNote: "After Food",
    duration: "90 Days",
    qty: "90",
    indications: ["OA", "joint health", "collagen type II", "curcumin", "hyaluronate", "tolagin"]
  },
  {
    id: 65,
    brand: "Tolperitas SR 450/150 mg",
    type: "TAB",
    form: "Tablet (SR)",
    content: "Tolperisone SR 450 mg + Paracetamol 150 mg",
    dose: "1",
    timings: "1-0-1",
    timingsNote: "After Food",
    duration: "7 Days",
    qty: "14",
    indications: ["muscle spasm", "spasticity", "pain", "tolperisone", "tolperitas"]
  },
  {
    id: 66,
    brand: "Ultracet",
    type: "TAB",
    form: "Tablet",
    content: "Tramadol 37.5 mg + Paracetamol 325 mg",
    dose: "1",
    timings: "1-0-1",
    timingsNote: "After Food",
    duration: "5 Days",
    qty: "10",
    indications: ["moderate pain", "severe pain", "tramadol", "paracetamol", "ultracet"]
  },
  {
    id: 67,
    brand: "Unicalcin Nasal Spray",
    type: "SPRAY",
    form: "Nasal Spray",
    content: "Calcitonin 200 IU per spray",
    dose: "1 spray",
    timings: "0-0-1",
    timingsNote: "Alternate nostrils daily",
    duration: "As directed",
    qty: "1 bottle",
    indications: ["osteoporosis", "calcitonin", "bone pain", "unicalcin"]
  },
  {
    id: 68,
    brand: "Volitra Plus Gel",
    type: "GEL",
    form: "Gel",
    content: "Diclofenac Diethylamine 1.16% + Methyl Salicylate 10% + Menthol 3% + Linseed Oil",
    dose: "Apply",
    timings: "3-4 times daily",
    timingsNote: "Gently massage over affected area",
    duration: "14 Days",
    qty: "1 tube",
    indications: ["pain", "topical", "joint pain", "sports injury", "diclofenac gel", "volitra"]
  },
  {
    id: 69,
    brand: "Winzest Plus",
    type: "TAB",
    form: "Tablet",
    content: "MyoInositol 2 g + D-ChiroInositol 200 mg + Folic Acid 1.5 mg + Vitamin D₃ 1000 IU + Chromium 200 µg + L-Methylfolate 1 mg",
    dose: "1",
    timings: "1-0-0",
    timingsNote: "After Food",
    duration: "90 Days",
    qty: "90",
    indications: ["PCOS", "insulin resistance", "inositol", "folic acid", "winzest"]
  }
];

// ── Search ────────────────────────────────────────────────────────────────────
function searchMedicines(query, limit = 15) {
  if (!query || !query.trim()) return [...MEDICINE_DB]; // return ALL when empty (dropdown)
  const q = query.toLowerCase().trim();

  const scored = MEDICINE_DB.map(med => {
    const brand   = med.brand.toLowerCase();
    const content = med.content.toLowerCase();
    const indics  = med.indications.join(' ').toLowerCase();
    let score = 0;

    if (brand.startsWith(q))          score += 100;
    else if (brand.includes(q))        score += 70;
    else if (content.includes(q))      score += 50;
    else if (indics.includes(q))       score += 30;
    else if (fuzzyMatch(q, brand))     score += 20;
    else if (fuzzyMatch(q, content))   score += 10;
    else if (fuzzyMatch(q, indics))    score += 5;

    return { med, score };
  });

  return scored
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(x => x.med);
}

function fuzzyMatch(query, text) {
  let qi = 0;
  for (let i = 0; i < text.length && qi < query.length; i++) {
    if (text[i] === query[qi]) qi++;
  }
  return qi === query.length;
}

// Type badge colour map
const TYPE_COLORS = {
  TAB:   { bg: '#e3f2fd', color: '#1565c0' },
  CAP:   { bg: '#f3e5f5', color: '#6a1b9a' },
  INJ:   { bg: '#fce4ec', color: '#c62828' },
  GEL:   { bg: '#e8f5e9', color: '#2e7d32' },
  CREAM: { bg: '#e8f5e9', color: '#2e7d32' },
  SPRAY: { bg: '#fff3e0', color: '#e65100' },
  SYP:   { bg: '#e0f7fa', color: '#006064' },
  PWD:   { bg: '#fafafa', color: '#424242' },
  KIT:   { bg: '#e8eaf6', color: '#283593' },
};
function typeBadgeStyle(type) {
  const c = TYPE_COLORS[type] || { bg: '#f5f5f5', color: '#555' };
  return `background:${c.bg};color:${c.color}`;
}
