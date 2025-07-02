export const MEDICAL_CASES = {
    cardiovascular: [
        {
            id: 'cv-1',
            difficulty: 'medium',
            presentation: 'A 55-year-old male presents to the emergency department with central crushing chest pain that started 2 hours ago while climbing stairs. The pain radiates to his left arm and jaw. He appears sweaty and anxious. He has a 20-pack-year smoking history and takes medication for hypertension.',
            examFindings: 'BP 150/90, HR 95, RR 20, O2 sat 96% on room air. JVP not elevated. Heart sounds normal with no murmurs. Chest clear. No peripheral edema.',
            investigations: 'ECG shows ST elevation in leads II, III, and aVF with reciprocal changes in I and aVL. Troponin I elevated at 2.5 ng/mL (normal <0.04).',
            questions: [
                'What is your primary diagnosis?',
                'What immediate management would you initiate?',
                'What complications should you monitor for?',
                'What long-term medications would you prescribe?'
            ]
        },
        {
            id: 'cv-2',
            difficulty: 'hard',
            presentation: 'A 72-year-old woman presents with progressive dyspnea over 3 months, now unable to lie flat. She reports waking at night gasping for air. Past medical history includes hypertension and type 2 diabetes.',
            examFindings: 'BP 160/95, HR 110 irregular, RR 24, O2 sat 92% on room air. JVP elevated to angle of jaw. Bilateral basal crackles. S3 gallop present. Bilateral pitting edema to knees.',
            investigations: 'ECG shows atrial fibrillation with rapid ventricular response. CXR shows cardiomegaly, upper lobe diversion, and bilateral pleural effusions. BNP 1200 pg/mL.',
            questions: [
                'What is your diagnosis and NYHA classification?',
                'What is the likely etiology?',
                'Outline your acute management plan',
                'What investigations would help determine the cause?'
            ]
        }
    ],
    respiratory: [
        {
            id: 'resp-1',
            difficulty: 'easy',
            presentation: 'A 23-year-old female presents with acute onset shortness of breath and wheeze. She has a history of atopy and mentions her symptoms started after exposure to a cat at a friend\'s house.',
            examFindings: 'RR 28, O2 sat 92%, widespread expiratory wheeze bilaterally, using accessory muscles. Unable to complete sentences.',
            investigations: 'Peak flow 250 L/min (baseline 450 L/min). ABG on room air: pH 7.48, pCO2 32, pO2 65, HCO3 24.',
            questions: [
                'What is your diagnosis and severity assessment?',
                'What is your immediate management?',
                'When would you consider ICU referral?',
                'What discharge planning is needed?'
            ]
        },
        {
            id: 'resp-2',
            difficulty: 'medium',
            presentation: 'A 68-year-old man, heavy smoker (40 pack-years), presents with 3-week history of cough, hemoptysis, and 5kg weight loss. He also reports right shoulder pain.',
            examFindings: 'Cachexic appearance. Clubbing present. Reduced air entry right upper zone. No lymphadenopathy palpable.',
            investigations: 'CXR shows right upper lobe mass with hilar enlargement. Hyponatremia: Na 128 mmol/L.',
            questions: [
                'What is your differential diagnosis?',
                'What is the significance of the hyponatremia?',
                'What investigations would you order?',
                'What paraneoplastic syndromes are associated with this condition?'
            ]
        }
    ],
    neurological: [
        {
            id: 'neuro-1',
            difficulty: 'hard',
            presentation: 'A 68-year-old right-handed woman presents with sudden onset left-sided weakness and slurred speech that started 3 hours ago. She has a history of atrial fibrillation but stopped taking warfarin 6 months ago due to a minor fall.',
            examFindings: 'GCS 14 (E4V4M6), dysarthria present, left facial droop (forehead spared), power 2/5 left upper and lower limbs, hyperreflexia on left, upgoing plantar on left. NIHSS score 12.',
            investigations: 'CT head shows no hemorrhage or established infarct. Blood glucose 5.8 mmol/L. INR 1.1.',
            questions: [
                'Localize the lesion and explain your reasoning',
                'What is the most likely etiology?',
                'Is the patient eligible for thrombolysis? Why/why not?',
                'What secondary prevention measures are indicated?'
            ]
        },
        {
            id: 'neuro-2',
            difficulty: 'medium',
            presentation: 'A 28-year-old woman presents with 2-day history of ascending weakness and numbness. Started in feet, now affecting hands. She had gastroenteritis 2 weeks ago.',
            examFindings: 'Power 3/5 in lower limbs, 4/5 in upper limbs. Absent reflexes throughout. Decreased sensation to light touch in glove-and-stocking distribution. No cranial nerve involvement yet.',
            investigations: 'Vital capacity 2.8L (predicted 3.5L). CSF: protein 2.1 g/L (normal 0.15-0.45), WCC 2 (normal <5), glucose normal.',
            questions: [
                'What is your diagnosis?',
                'What is the pathophysiology?',
                'What monitoring is essential?',
                'What specific treatments are available?'
            ]
        }
    ],
    hematological: [
        {
            id: 'hem-1',
            difficulty: 'easy',
            presentation: 'A 22-year-old woman presents with 3-month history of fatigue and dyspnea on exertion. She reports heavy menstrual periods and is vegetarian.',
            examFindings: 'Pale conjunctivae, tachycardia (HR 105), soft systolic murmur. No organomegaly. Angular stomatitis present.',
            investigations: 'Hb 78 g/L, MCV 68 fL, ferritin 8 μg/L, TIBC elevated.',
            questions: [
                'What is your diagnosis?',
                'What are the causes in this patient?',
                'What treatment would you prescribe?',
                'What dietary advice would you give?'
            ]
        },
        {
            id: 'hem-2',
            difficulty: 'hard',
            presentation: 'A 65-year-old man presents with fatigue, recurrent infections, and easy bruising. He reports drenching night sweats and 8kg weight loss over 2 months.',
            examFindings: 'Fever 38.2°C, petechiae on lower limbs, splenomegaly 4cm below costal margin, cervical lymphadenopathy.',
            investigations: 'WBC 45 x 10⁹/L with 60% blasts, Hb 85 g/L, platelets 40 x 10⁹/L. Blood film shows Auer rods.',
            questions: [
                'What is your diagnosis?',
                'What immediate complications need management?',
                'What further investigations are needed?',
                'Outline the treatment approach'
            ]
        }
    ],
    endocrine: [
        {
            id: 'endo-1',
            difficulty: 'medium',
            presentation: 'A 35-year-old woman presents with palpitations, weight loss despite increased appetite, and heat intolerance. She mentions her eyes seem more prominent recently.',
            examFindings: 'BMI 19, tremor, warm moist skin, tachycardia (HR 120 regular), diffuse goiter, lid lag, exophthalmos.',
            investigations: 'TSH <0.01 mU/L, free T4 45 pmol/L (normal 10-25), TSH receptor antibodies positive.',
            questions: [
                'What is your diagnosis?',
                'What is the pathophysiology?',
                'What treatment options are available?',
                'What are the risks if left untreated?'
            ]
        },
        {
            id: 'endo-2',
            difficulty: 'easy',
            presentation: 'A 55-year-old man with type 2 diabetes presents confused and sweaty. His wife says he took his medications but didn\'t eat breakfast. He is on metformin and gliclazide.',
            examFindings: 'Confused, sweaty, tremulous. BP 140/85, HR 95. No focal neurological signs.',
            investigations: 'Bedside glucose 2.1 mmol/L.',
            questions: [
                'What is your immediate management?',
                'What would you do if IV access cannot be obtained?',
                'What education is needed before discharge?',
                'Should his medications be adjusted?'
            ]
        }
    ],
    gastrointestinal: [
        {
            id: 'gi-1',
            difficulty: 'medium',
            presentation: 'A 45-year-old man presents with severe epigastric pain radiating to the back, nausea, and vomiting for 12 hours. He admits to heavy alcohol use. This is his third similar presentation.',
            examFindings: 'Epigastric tenderness with guarding, reduced bowel sounds, temperature 37.8°C. Grey Turner\'s sign absent.',
            investigations: 'Lipase 850 U/L (normal <60), calcium 2.1 mmol/L, glucose 12 mmol/L, WBC 16 x 10⁹/L.',
            questions: [
                'What is your diagnosis?',
                'Calculate the severity score',
                'What is your management plan?',
                'What complications may develop?'
            ]
        },
        {
            id: 'gi-2',
            difficulty: 'hard',
            presentation: 'A 28-year-old woman presents with 6-week history of bloody diarrhea (6-8 times/day), crampy abdominal pain, and weight loss. She reports urgency and tenesmus.',
            examFindings: 'Tender left iliac fossa, no masses palpable. Perianal examination normal. Temperature 37.5°C.',
            investigations: 'Hb 95 g/L, albumin 28 g/L, CRP 45 mg/L, stool cultures negative.',
            questions: [
                'What is your differential diagnosis?',
                'What investigation would confirm diagnosis?',
                'How would you assess disease severity?',
                'Outline your treatment approach'
            ]
        }
    ],
    renal: [
        {
            id: 'renal-1',
            difficulty: 'medium',
            presentation: 'A 10-year-old boy presents with facial puffiness and tea-colored urine 2 weeks after recovering from a sore throat. His mother reports decreased urine output.',
            examFindings: 'BP 130/85 (>95th percentile for age), periorbital edema, mild pedal edema. No rash or joint swelling.',
            investigations: 'Urinalysis: blood +++, protein ++, RBC casts seen. Creatinine 120 μmol/L (baseline 50). C3 low, ASOT elevated.',
            questions: [
                'What is your diagnosis?',
                'What is the pathophysiology?',
                'What complications should you monitor for?',
                'What is the prognosis?'
            ]
        },
        {
            id: 'renal-2',
            difficulty: 'hard',
            presentation: 'A 65-year-old man with diabetes and hypertension presents with progressive ankle swelling and frothy urine. He reports fatigue and poor appetite.',
            examFindings: 'BP 165/95, bilateral pitting edema to mid-shin, bibasal crackles. Fundoscopy shows diabetic retinopathy.',
            investigations: 'Creatinine 250 μmol/L, eGFR 22 mL/min, albumin 25 g/L, urine ACR 500 mg/mmol, Hb 92 g/L.',
            questions: [
                'What stage of kidney disease is this?',
                'What is likely on renal biopsy?',
                'How would you manage this patient?',
                'When would you refer for dialysis planning?'
            ]
        }
    ]
};

export const MCQ_QUESTIONS = {
    cardiovascular: [
        {
            id: 'mcq-cv-1',
            question: 'A 65-year-old man presents with central chest pain. His ECG shows ST depression and T wave inversion in leads V4-V6. Troponin is elevated. What is the most appropriate immediate treatment?',
            options: [
                'A. Aspirin 300mg, clopidogrel 300mg, fondaparinux',
                'B. Aspirin 300mg, ticagrelor 180mg, unfractionated heparin',
                'C. Aspirin 75mg, clopidogrel 75mg, enoxaparin',
                'D. Thrombolysis with alteplase'
            ],
            correct: 'B',
            explanation: 'This patient has NSTEMI. Dual antiplatelet therapy with aspirin 300mg and ticagrelor 180mg (or clopidogrel 300mg) plus anticoagulation is indicated. Ticagrelor is preferred over clopidogrel in ACS. Fondaparinux is an alternative to heparin.'
        }
    ],
    respiratory: [
        {
            id: 'mcq-resp-1',
            question: 'Which of the following is NOT a feature of life-threatening asthma?',
            options: [
                'A. Peak flow <33% of best',
                'B. Silent chest',
                'C. PaCO2 4.6-6.0 kPa',
                'D. Inability to complete sentences'
            ],
            correct: 'D',
            explanation: 'Inability to complete sentences is a feature of severe asthma, not life-threatening asthma. Life-threatening features include: silent chest, cyanosis, poor respiratory effort, arrhythmia, hypotension, exhaustion, altered consciousness, PaO2 <8 kPa, normal PaCO2 (4.6-6.0 kPa), or peak flow <33% best.'
        }
    ]
};

export const VISUAL_CASES = {
    radiology: [
        {
            id: 'vis-rad-1',
            type: 'chest-xray',
            description: 'PA chest radiograph of a 70-year-old smoker with weight loss',
            findings: 'Right upper lobe mass with irregular borders, right hilar lymphadenopathy',
            diagnosis: 'Likely primary lung carcinoma',
            teachingPoints: [
                'Look for mass lesions systematically in all lung zones',
                'Assess for hilar enlargement (compare both sides)',
                'Check for bony metastases (ribs, vertebrae)',
                'Consider CT for staging if malignancy suspected'
            ]
        }
    ],
    ecg: [
        {
            id: 'vis-ecg-1',
            type: 'ecg-12lead',
            description: '12-lead ECG from a 55-year-old man with chest pain',
            findings: 'ST elevation in leads II, III, aVF with reciprocal changes in I, aVL',
            diagnosis: 'Inferior STEMI',
            teachingPoints: [
                'Inferior STEMI affects RCA or LCx territory',
                'Look for reciprocal changes in lateral leads',
                'Check V4R for RV involvement',
                'Time is muscle - door to balloon time critical'
            ]
        }
    ]
}; 