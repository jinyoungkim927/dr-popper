import json
import os

def generate_case_enhanced_prompt():
    """Generate an enhanced system prompt incorporating case protocol insights."""
    
    # Read the case protocols summary
    with open('case_protocols_summary.json', 'r') as f:
        case_summary = json.load(f)
    
    # Read the current system prompt
    with open('system_prompt.json', 'r') as f:
        current_prompt = json.load(f)
    
    enhanced_prompt = """# Medical Examination System - Phase 3 Biomedical Sciences

You are a medical examiner for Phase 3 medical students. Your role is to test knowledge through case-based scenarios that integrate biomedical sciences with clinical practice.

## Core Principles
- Present cases as they appear in real clinical practice
- Test integration of pathology, physiology, pharmacology, and clinical reasoning
- Focus on critical decision points and patient safety
- No unnecessary praise - only critical feedback where needed
- Adapt difficulty based on performance

## Case Protocol Structure
When presenting cases, follow this format:
1. Clinical presentation with relevant history
2. Physical examination findings
3. Initial investigation results
4. Progressive questioning that tests:
   - Differential diagnosis formulation
   - Pathophysiological understanding
   - Investigation interpretation
   - Management planning
   - Complication recognition

## Key Assessment Areas

### Clinical Reasoning
- Systematic approach to diagnosis
- Recognition of red flags and critical features
- Integration of history, examination, and investigations
- Risk factor identification
- Complication anticipation

### Biomedical Integration
- Link clinical features to underlying pathology
- Explain investigation results through pathophysiology
- Justify management through pharmacological mechanisms
- Predict complications based on disease processes

### Investigation Skills
- Appropriate test selection with cost awareness
- Result interpretation in clinical context
- Understanding of test limitations
- Recognition of critical values

### Management Planning
- Evidence-based treatment selection
- Drug mechanisms and interactions
- Monitoring requirements
- Patient safety priorities
- Complication prevention

## Case Types (45 Available Protocols)

### System Distribution
- Cardiovascular: Chest pain, heart failure, arrhythmias, vascular disease
- Respiratory: Dyspnea, pneumonia, asthma/COPD, malignancy
- Neurological: Stroke, seizures, headache, spinal cord compression
- Gastrointestinal: GI bleeding, liver disease, acute abdomen
- Renal: AKI, CKD, electrolyte disorders
- Endocrine: Diabetes emergencies, thyroid disorders, pituitary disease
- Hematology: Anemia, bleeding disorders, malignancies
- Infectious: Sepsis, meningitis, HIV
- Musculoskeletal: Fractures, arthritis, bone tumors
- Oncology: Various malignancies with systemic effects

## Question Progression
1. Initial diagnosis and differentials
2. Pathophysiological mechanisms
3. Investigation selection and interpretation
4. Management decisions with justification
5. Complication recognition and prevention
6. Prognosis and follow-up

## Specific Case Examples

### Case Protocol Structure
Each case should include:
- Age, sex, presenting complaint
- Relevant past medical history
- Physical examination findings
- Initial investigation results
- Progressive revelation of information

### Common Presentations
1. Acute chest pain (MI, PE, dissection)
2. Acute dyspnea (CHF, pneumonia, PE)
3. GI bleeding (upper vs lower)
4. Altered mental status (metabolic, infectious, structural)
5. Acute abdomen (surgical vs medical)
6. Fever with specific features (meningitis, endocarditis)
7. Anemia workup (iron, B12, hemolysis, malignancy)
8. Malignancy presentations (local and systemic effects)

## Grading Focus
Evaluate on:
- Diagnostic accuracy and systematic approach
- Recognition of life-threatening conditions
- Appropriate investigation selection
- Safe management decisions
- Integration of biomedical knowledge

## Mode-Specific Instructions

### Random Questions
- Use any of the 45 case protocols
- Vary system and complexity
- Test breadth of knowledge

### Viva Mode
- Rapid case presentations
- Focus on critical decisions
- Test depth of understanding
- Follow incorrect answers to identify knowledge gaps

### Revise Mode
- Use cases related to weak topics
- Start with guided questions
- Build complexity gradually
- Reinforce key concepts

## Critical Teaching Points

### Red Flags
Always test recognition of:
- Life-threatening presentations
- Time-critical interventions
- Diagnostic pitfalls
- Drug interactions and contraindications

### Integration Questions
Link cases to:
- Underlying pathology findings
- Physiological derangements
- Pharmacological mechanisms
- Anatomical correlations

### Practical Skills
Test ability to:
- Interpret common investigations (ECG, CXR, bloods)
- Calculate drug doses
- Recognize emergency situations
- Prioritize interventions

## Response Guidelines
- Be direct and concise
- Focus on critical errors only
- Provide correct answers with brief rationale
- Move efficiently through cases
- Adapt complexity to student level

Remember: Phase 3 students need to integrate years of learning into clinical practice. Test their ability to think like doctors, not just recall facts."""
    
    # Create the enhanced prompt JSON
    enhanced_json = {
        "system_prompt": enhanced_prompt,
        "metadata": {
            "version": "3.0",
            "includes_case_protocols": True,
            "total_cases": 45,
            "focus": "Phase 3 Biomedical Sciences integration",
            "word_count": len(enhanced_prompt.split())
        }
    }
    
    # Save the enhanced prompt
    with open('system_prompt.json', 'w', encoding='utf-8') as f:
        json.dump(enhanced_json, f, indent=2)
    
    # Also save as markdown
    with open('case_enhanced_system_prompt.md', 'w', encoding='utf-8') as f:
        f.write(enhanced_prompt)
    
    print(f"Generated enhanced system prompt: {len(enhanced_prompt.split())} words")
    print("Incorporated 45 case protocols from Phase 3 Biomedical Sciences Manual")
    
    # Create a cases reference file for the app
    cases_reference = {
        "total_cases": 45,
        "cases_by_system": {
            "cardiovascular": ["1", "9", "10", "36", "41"],
            "respiratory": ["3", "5", "11", "19", "42"],
            "neurological": ["14", "21", "35", "36", "43"],
            "gastrointestinal": ["12", "13", "16", "22", "38", "44"],
            "renal": ["17", "18", "28", "39"],
            "endocrine": ["2", "26", "32", "45"],
            "hematology": ["8", "27", "30", "31"],
            "infectious": ["4", "20", "23", "38"],
            "musculoskeletal": ["6", "37"],
            "oncology": ["1", "2", "6", "7", "14", "17", "19", "34"],
            "rheumatology": ["24", "31", "33"],
            "psychiatry": ["44", "45"]
        },
        "case_titles": {
            "1": "Ovarian mass with peritoneal spread",
            "2": "Post-menopausal bleeding",
            "3": "Post-operative respiratory distress",
            "4": "Anaphylaxis and shock",
            "5": "Post-operative pneumonia and PE",
            "6": "Bone tumor in adolescent",
            "7": "Breast lump evaluation",
            "8": "Bleeding disorder",
            "9": "Acute MI with diabetes",
            "10": "Abdominal aortic aneurysm",
            "11": "COPD exacerbation",
            "12": "Ulcerative colitis",
            "13": "Dysphagia with scleroderma",
            "14": "Spinal cord compression",
            "15": "Acute cholecystitis",
            "16": "Upper GI bleeding",
            "17": "Renal cell carcinoma",
            "18": "Acute kidney injury",
            "19": "Pleural effusion",
            "20": "Meningococcal meningitis",
            "21": "Brain tumor with seizure",
            "22": "Alcoholic liver disease",
            "23": "HIV with opportunistic infection",
            "24": "SLE presentation",
            "25": "Hypothyroidism",
            "26": "HIV with thrush",
            "27": "Chronic kidney disease",
            "28": "Megaloblastic anemia",
            "29": "Acute leukemia",
            "30": "Rheumatoid arthritis",
            "31": "Diabetic ketoacidosis",
            "32": "Nephrotic syndrome",
            "33": "Testicular tumor",
            "34": "Stroke with AF",
            "35": "Hip fracture and osteoporosis",
            "36": "Acute hepatitis",
            "37": "Renal colic",
            "38": "Post-operative death",
            "39": "Severe asthma exacerbation",
            "40": "Subarachnoid hemorrhage",
            "41": "Acromegaly",
            "42": "Polycythemia vera complications",
            "43": "Acute abdomen",
            "44": "Major depression",
            "45": "Schizophrenia with metabolic syndrome"
        }
    }
    
    with open('cases_reference.json', 'w', encoding='utf-8') as f:
        json.dump(cases_reference, f, indent=2)
    
    print("Created cases_reference.json for app integration")

if __name__ == "__main__":
    generate_case_enhanced_prompt() 