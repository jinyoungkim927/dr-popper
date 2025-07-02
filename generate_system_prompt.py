import os
import re
from pathlib import Path
from typing import List, Dict, Tuple
import json

class MedicalNotesProcessor:
    def __init__(self, notes_path: str):
        self.notes_path = Path(notes_path)
        self.content_hierarchy = {}
        self.summaries = {}
        
    def read_markdown_file(self, file_path: Path) -> str:
        """Read a markdown file and return its content."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
            return ""
    
    def extract_sections(self, content: str) -> Dict[str, str]:
        """Extract major sections from markdown content."""
        sections = {}
        current_section = "Introduction"
        current_content = []
        
        lines = content.split('\n')
        for line in lines:
            if line.startswith('# ') or line.startswith('## '):
                if current_content:
                    sections[current_section] = '\n'.join(current_content)
                current_section = line.strip('#').strip()
                current_content = []
            else:
                current_content.append(line)
        
        if current_content:
            sections[current_section] = '\n'.join(current_content)
        
        return sections
    
    def summarize_section(self, section_name: str, content: str, max_words: int = 200) -> str:
        """Create a focused summary of a section."""
        # Extract key learning objectives
        objectives = []
        if "Learning objectives" in content or "Learning Objectives" in content:
            obj_pattern = r'\d+\.\s+([^.]+\.)'
            objectives = re.findall(obj_pattern, content)[:5]  # Top 5 objectives
        
        # Extract trial exam questions
        exam_questions = []
        if "Trial exam questions" in content:
            q_pattern = r'\d+\.\s+([^.]+\?)'
            exam_questions = re.findall(q_pattern, content)[:3]  # Top 3 questions
        
        # Extract key terms and definitions
        key_terms = []
        term_pattern = r'(?:Define|Describe|Outline|List|Explain)\s+(?:the\s+)?(?:term\s+)?"?([^"]+)"?'
        key_terms = re.findall(term_pattern, content, re.IGNORECASE)[:5]
        
        # Build summary
        summary_parts = [f"**{section_name}**"]
        
        if objectives:
            summary_parts.append("\nKey Learning Objectives:")
            for obj in objectives[:3]:
                summary_parts.append(f"- {obj.strip()}")
        
        if exam_questions:
            summary_parts.append("\nCommon Exam Questions:")
            for q in exam_questions:
                summary_parts.append(f"- {q.strip()}")
        
        if key_terms:
            summary_parts.append("\nImportant Concepts:")
            for term in key_terms[:3]:
                summary_parts.append(f"- {term.strip()}")
        
        return '\n'.join(summary_parts)
    
    def process_station_files(self) -> Dict[str, Dict[str, str]]:
        """Process all station files and extract content."""
        stations = {}
        
        # Find all station directories
        station_dirs = [
            "Station A Anatomy",
            "Station B Diagnostics", 
            "Station C Pathology",
            "Station D Pharmacology"
        ]
        
        for station_dir in station_dirs:
            station_path = self.notes_path / "J D Notes 1300acf2446a80578199fb02432116ff" / f"{station_dir} 1300acf2446a81ec8383e74d45a26b2f"
            if station_path.exists():
                stations[station_dir] = self.process_station_directory(station_path)
        
        return stations
    
    def process_station_directory(self, station_path: Path) -> Dict[str, str]:
        """Process all markdown files in a station directory."""
        station_content = {}
        
        for md_file in station_path.glob("*.md"):
            content = self.read_markdown_file(md_file)
            if content:
                sections = self.extract_sections(content)
                summary = self.summarize_section(md_file.stem, content)
                station_content[md_file.stem] = {
                    'summary': summary,
                    'sections': sections
                }
        
        return station_content
    
    def process_main_notes(self) -> Dict[str, str]:
        """Process the main notes file."""
        main_file = self.notes_path / "J D Notes 1300acf2446a80578199fb02432116ff.md"
        content = self.read_markdown_file(main_file)
        
        # Extract all topic sections
        topics = {}
        current_topic = None
        current_content = []
        
        for line in content.split('\n'):
            if line.startswith('- ***') and line.endswith('***'):
                if current_topic and current_content:
                    topics[current_topic] = '\n'.join(current_content)
                current_topic = line.strip('- *')
                current_content = []
            elif current_topic:
                current_content.append(line)
        
        if current_topic and current_content:
            topics[current_topic] = '\n'.join(current_content)
        
        return topics
    
    def generate_comprehensive_summary(self) -> str:
        """Generate a comprehensive summary of all content."""
        # Process main topics
        main_topics = self.process_main_notes()
        
        # Process station files
        stations = self.process_station_files()
        
        # Build comprehensive summary
        summary_parts = []
        
        # Introduction
        summary_parts.append("""# Comprehensive Medical Examination System Prompt

## Overview
This system is designed to help medical students prepare for comprehensive medical examinations covering multiple disciplines. The exam format includes:
- Case-based scenarios requiring diagnosis, investigation, and management
- Pathophysiology explanations
- Pharmacological knowledge
- Clinical reasoning and integration

## Examination Structure
The examination is organized into four main stations:
1. **Station A: Anatomy** - Clinical anatomy cases with imaging interpretation
2. **Station B: Diagnostics** - Laboratory results, imaging studies, and diagnostic reasoning
3. **Station C: Pathology** - Disease mechanisms, histopathology, and clinical correlations
4. **Station D: Pharmacology** - Drug mechanisms, interactions, and therapeutic applications

## Key Topics by System
""")
        
        # Organize topics by system
        systems = {
            "Respiratory": ["Acute dyspnoea & haemoptysis", "Chronic cough & dyspnoea"],
            "Cardiovascular": ["Chest pain & vascular disease", "Cerebrovascular disease"],
            "Neurological": ["CNS tumours, infections, epilepsy", "Cerebrovascular disease"],
            "Hematological": ["Anaemia", "Bleeding disorders", "Leukemia and myeloproliferative disorders", "Lymphoma"],
            "Endocrine": ["Diabetes Mellitus - Complications", "Endocrine disease"],
            "Gastrointestinal": ["Dysphagia & Haematemesis", "Gallbladder & Pancreatic disease", "Inflammatory Bowel disease", "Hepatitis and chronic liver disease"],
            "Renal": ["Glomerulonephritis & renal failure", "Haematuria"],
            "Musculoskeletal": ["Back pain and bone tumours", "Multisystem disease, polyarthritis & vasculitides"],
            "Oncology": ["Breast lumps", "Gynaecological malignancies & infections"],
            "Immunology": ["Allergy & Anaphylaxis", "Opportunistic infections & HIV"]
        }
        
        for system, topics in systems.items():
            summary_parts.append(f"\n### {system} System")
            for topic in topics:
                if topic in main_topics:
                    summary = self.summarize_section(topic, main_topics[topic], max_words=150)
                    summary_parts.append(summary)
        
        # Add case-based learning approach
        summary_parts.append("""
## Case-Based Learning Approach

### Clinical Case Structure
Each case should follow this format:
1. **Presentation**: Patient demographics, chief complaint, history
2. **Physical Examination**: Relevant findings, vital signs
3. **Investigations**: Laboratory results, imaging findings
4. **Differential Diagnosis**: Ranked by likelihood with justification
5. **Management**: Immediate, short-term, and long-term plans
6. **Follow-up**: Monitoring parameters and prognosis

### Key Examination Skills

#### History Taking
- Systematic approach: PC, HPC, PMH, DH, FH, SH
- Red flags identification
- Risk factor assessment
- Psychosocial considerations

#### Physical Examination
- Inspection, palpation, percussion, auscultation
- System-specific examination techniques
- Clinical sign interpretation
- Correlation with pathophysiology

#### Investigation Interpretation
- Laboratory values and normal ranges
- Imaging modality selection
- ECG and other specialized tests
- Cost-effectiveness considerations

#### Clinical Reasoning
- Pattern recognition
- Probabilistic thinking
- Evidence-based decision making
- Risk-benefit analysis

## High-Yield Topics (Frequently Examined)

### Emergency Presentations
1. **Acute Chest Pain**
   - Cardiac: MI, unstable angina, pericarditis
   - Pulmonary: PE, pneumothorax, pneumonia
   - Other: aortic dissection, esophageal causes
   
2. **Acute Dyspnea**
   - Cardiac: heart failure, cardiac tamponade
   - Pulmonary: asthma, COPD exacerbation, ARDS
   - Other: anaphylaxis, metabolic acidosis

3. **Acute Abdominal Pain**
   - Surgical: appendicitis, cholecystitis, perforation
   - Medical: pancreatitis, IBD, gastroenteritis
   - Vascular: mesenteric ischemia, AAA

### Diagnostic Approach Templates

#### For Chest Pain:
1. Immediate: ECG, troponins, CXR
2. Risk stratification: HEART score, TIMI score
3. Further testing: stress test, CT angiography, cardiac catheterization

#### For Dyspnea:
1. Immediate: ABG, CXR, ECG
2. Specific tests: D-dimer, BNP, CT pulmonary angiography
3. Functional assessment: PFTs, echo

### Pharmacology Essentials

#### Cardiovascular Drugs
- ACE inhibitors/ARBs: mechanism, indications, contraindications
- Beta-blockers: selectivity, clinical uses
- Diuretics: types, electrolyte effects
- Antiplatelets/anticoagulants: mechanisms, monitoring

#### Antimicrobials
- Empirical therapy by syndrome
- Resistance patterns
- Drug interactions
- Special populations (pregnancy, renal failure)

#### Emergency Medications
- Resuscitation drugs
- Anaphylaxis management
- Status epilepticus protocol
- Acute coronary syndrome pathway

## Interactive Case Components

### Visual Interpretation
When presented with images:
1. Systematic approach to interpretation
2. Identify normal anatomy first
3. Describe abnormalities
4. Correlate with clinical context
5. Suggest further imaging if needed

### Laboratory Result Analysis
- Recognize patterns (e.g., liver function, renal function)
- Identify critical values
- Understand pre-analytical factors
- Calculate derived values (e.g., anion gap, FENa)

### Clinical Decision Making
- Use clinical decision rules appropriately
- Apply evidence-based guidelines
- Consider local protocols
- Document reasoning clearly

## Examination Techniques

### Multiple Choice Questions (MCQs)
- Read all options before answering
- Eliminate obviously incorrect options
- Look for qualifiers (always, never, most)
- Consider the most likely scenario

### Short Answer Questions (SAQs)
- Structure answers with headings
- Be concise but complete
- Use medical terminology correctly
- Include relevant differentials

### Objective Structured Clinical Examinations (OSCEs)
- Time management is crucial
- Follow systematic approaches
- Verbalize thought processes
- Maintain professional demeanor

### Case-Based Discussions
- Present information logically
- Justify clinical decisions
- Discuss alternatives
- Address patient safety

## Summary of Key Learning Points

1. **Pattern Recognition**: Common presentations of common diseases
2. **Safety First**: Identify and manage life-threatening conditions
3. **Evidence-Based**: Apply current guidelines and best practices
4. **Patient-Centered**: Consider psychosocial factors and patient preferences
5. **Systematic Approach**: Use structured methods for consistency
6. **Integration**: Connect basic science with clinical application
7. **Communication**: Clear documentation and handover
8. **Professionalism**: Ethical considerations and team collaboration

This comprehensive system should help in preparing for medical examinations by providing structured approaches to clinical scenarios, emphasizing high-yield topics, and integrating knowledge across disciplines.""")
        
        return '\n'.join(summary_parts)

def main():
    # Path to medical notes
    notes_path = "/Users/jinyoungkim/Desktop/Projects/dr-popper/med-materials"
    
    # Process notes
    processor = MedicalNotesProcessor(notes_path)
    comprehensive_summary = processor.generate_comprehensive_summary()
    
    # Save the comprehensive summary
    with open('system_prompt.md', 'w', encoding='utf-8') as f:
        f.write(comprehensive_summary)
    
    print(f"Generated comprehensive system prompt: {len(comprehensive_summary.split())} words")
    print("Saved to system_prompt.md")
    
    # Also save as JSON for the app
    system_prompt_json = {
        "system_prompt": comprehensive_summary,
        "metadata": {
            "version": "1.0",
            "word_count": len(comprehensive_summary.split()),
            "topics_covered": 25,
            "stations": 4
        }
    }
    
    with open('system_prompt.json', 'w', encoding='utf-8') as f:
        json.dump(system_prompt_json, f, indent=2)
    
    print("Also saved as system_prompt.json for the app")

if __name__ == "__main__":
    main() 
