# Medical Exam Preparation System

A direct, high-standards medical examination preparation application with real-time scoring and progress tracking. Built on OpenAI's Realtime API.

## Features

### Core Functionality

- **3 Practice Modes**:
  - **Random Questions**: Mixed topics and difficulty levels
  - **Viva**: Rapid-fire oral examination simulation
  - **Revise**: Automatically focuses on your weak areas (<70% score)
  
- **Real-time Scoring**: Each response graded 0-10 by GPT-4 based on:
  - Accuracy (40%)
  - Clinical reasoning (30%)
  - Critical feature recognition (20%)
  - Patient safety awareness (10%)

- **Progress Tracking**:
  - GitHub-style activity heatmap (365-day view)
  - Topic coverage map across 150 subtopics
  - Automatic weak area identification
  - Session summaries with letter grades

### Medical Coverage

- **10 Systems**: Cardiovascular, Respiratory, Neurological, Gastrointestinal, Renal, Endocrine, Hematology/Oncology, Infectious Diseases, Emergency/Critical Care, Rheumatology/Immunology
- **150 Subtopics**: Comprehensive coverage of medical knowledge
- **Direct Feedback**: Critical errors highlighted, no unnecessary praise

### Key Features

- **Voice Interaction**: Natural conversation with interruption handling
- **Context Support**: Add notes or images for personalized sessions
- **Profile Dashboard**: Track progress, identify weak areas, monitor streaks
- **Session Reports**: Concise quantitative feedback after each session

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- OpenAI API key with Realtime API access

### Installation

1. Navigate to the app directory:

```bash
cd /Users/jinyoungkim/Desktop/Projects/dr-popper/med-exam-app
```

2. Install dependencies:

```bash
npm install
```

3. API key is already configured in `.env`

4. Start the server:

```bash
npm run dev
```

5. Open browser at `http://localhost:3000`

## Usage Guide

### Starting Practice

1. Click "Start Session"
2. Allow microphone access
3. Choose your mode:
   - **Random**: For general practice
   - **Viva**: For exam-style rapid questioning
   - **Revise**: To focus on weak topics

### During Sessions

- Speak naturally - the AI will stop when you interrupt
- Complete cases by clicking "Complete Case" button
- Your score (0-10) appears after each case
- Session average tracked in real-time

### Profile & Progress

- Click "Profile" to view:
  - 365-day activity heatmap
  - Topic coverage by system
  - Overall statistics
  - Weak areas for revision

### Scoring System

- **A**: 90-100% (Excellent)
- **B**: 80-89% (Good)
- **C**: 70-79% (Satisfactory)
- **D**: 60-69% (Needs improvement)
- **F**: <60% (Significant gaps)

Topics scoring <70% automatically added to revision queue.

## Technical Details

### System Prompt

- Direct, no-nonsense medical examiner
- High standards with critical feedback only
- Focuses on dangerous errors and fundamental gaps
- No unnecessary compliments or encouragement

### Architecture

- Frontend: React with real-time voice
- Backend: Express with GPT-4 grading endpoint
- Storage: LocalStorage (future: database)
- Voice: OpenAI Realtime API

### Data Tracking

- Daily activity counts
- Topic-wise scoring (running average)
- Weak area identification
- Streak calculation

## Subtopic Organization (150 Total)

### Cardiovascular (20)

STEMI, NSTEMI, Heart failure (acute/chronic), Arrhythmias, Hypertensive emergency, etc.

### Respiratory (15)

Asthma, COPD, Pneumonia, PE, ARDS, Mechanical ventilation, etc.

### Neurological (18)

Stroke, Seizures, Meningitis, Movement disorders, Neuropathies, etc.

### Gastrointestinal (16)

GI bleeding, Liver disease, Pancreatitis, IBD, Acute abdomen, etc.

### Renal (14)

AKI, CKD, Electrolytes, Acid-base, Dialysis, etc.

### Endocrine (15)

Diabetes emergencies, Thyroid, Adrenal, Pituitary, etc.

### Hematology/Oncology (12)

Anemia, Bleeding disorders, Malignancies, Transfusion medicine, etc.

### Infectious Diseases (15)

Sepsis, Meningitis, Endocarditis, HIV, Antimicrobial resistance, etc.

### Emergency/Critical Care (15)

Resuscitation, Shock, Trauma, Toxicology, Environmental emergencies, etc.

### Rheumatology/Immunology (10)

RA, SLE, Vasculitis, Crystal arthropathies, Immunodeficiencies, etc.

## Tips for Success

1. **Consistency**: Daily practice builds streaks and knowledge
2. **Focus on Weak Areas**: Use Revise mode regularly
3. **Aim for 70%+**: This indicates mastery of a topic
4. **Review Feedback**: Learn from critical errors
5. **Complete Sessions**: Even one case counts as progress

---

Built for medical students who demand excellence. No excuses, just results.
