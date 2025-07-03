import { useEffect, useState } from "react";

// Generate dates for the past 365 days
function generateDateRange() {
    const dates = [];
    const today = new Date();
    for (let i = 364; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
    }
    return dates;
}

// Get color intensity based on activity count
function getActivityColor(count) {
    if (count === 0) return 'bg-gray-100';
    if (count <= 2) return 'bg-green-200';
    if (count <= 4) return 'bg-green-400';
    if (count <= 6) return 'bg-green-600';
    return 'bg-green-800';
}

export default function Profile({ onClose }) {
    const [activityData, setActivityData] = useState({});
    const [topicCoverage, setTopicCoverage] = useState({});
    const [overallStats, setOverallStats] = useState({
        totalCases: 0,
        averageScore: 0,
        streak: 0,
        topicsCompleted: 0
    });

    // All 150 subtopics organized by system
    const SUBTOPICS_BY_SYSTEM = {
        cardiovascular: [
            'STEMI management', 'NSTEMI/UA protocols', 'Acute heart failure', 'Chronic heart failure',
            'Atrial fibrillation', 'VT/VF management', 'Bradyarrhythmias', 'Hypertensive emergency',
            'Aortic dissection', 'Pericarditis/tamponade', 'Valvular emergencies', 'Cardiogenic shock',
            'Pulmonary embolism', 'DVT management', 'Peripheral arterial disease', 'Lipid management',
            'Post-MI care', 'Device management', 'Cardiac arrest', 'Preventive cardiology'
        ],
        respiratory: [
            'Asthma exacerbation', 'COPD exacerbation', 'Community pneumonia', 'Hospital pneumonia',
            'Tuberculosis', 'Pleural effusion', 'Pneumothorax', 'ARDS', 'Respiratory failure',
            'Mechanical ventilation', 'Lung cancer', 'Interstitial lung disease', 'Pulmonary hypertension',
            'Sleep apnea', 'Bronchiectasis'
        ],
        neurological: [
            'Ischemic stroke', 'Hemorrhagic stroke', 'TIA management', 'Status epilepticus',
            'Seizure disorders', 'Bacterial meningitis', 'Viral encephalitis', 'Guillain-Barré',
            'Myasthenia gravis', 'Multiple sclerosis', 'Parkinson\'s disease', 'Headache syndromes',
            'Peripheral neuropathy', 'Spinal cord compression', 'Brain tumors', 'Dementia',
            'Movement disorders', 'Neuromuscular disorders'
        ],
        gastrointestinal: [
            'Upper GI bleeding', 'Lower GI bleeding', 'Acute pancreatitis', 'Chronic pancreatitis',
            'Acute hepatitis', 'Cirrhosis', 'Hepatic encephalopathy', 'Ascites management',
            'IBD flare', 'Peptic ulcer disease', 'GERD complications', 'Biliary disease',
            'Acute abdomen', 'Bowel obstruction', 'GI malignancies', 'Malabsorption'
        ],
        renal: [
            'Prerenal AKI', 'Intrinsic AKI', 'Postrenal AKI', 'CKD management',
            'Dialysis principles', 'Hyperkalemia', 'Hyponatremia', 'Metabolic acidosis',
            'Metabolic alkalosis', 'Nephrotic syndrome', 'Nephritic syndrome', 'UTI/pyelonephritis',
            'Renal stones', 'Transplant basics'
        ],
        endocrine: [
            'DKA management', 'HHS management', 'Hypoglycemia', 'Type 1 diabetes',
            'Type 2 diabetes', 'Thyrotoxicosis', 'Hypothyroidism', 'Adrenal insufficiency',
            'Cushing\'s syndrome', 'Pheochromocytoma', 'Hypercalcemia', 'Hypocalcemia',
            'SIADH/DI', 'Pituitary disorders', 'Metabolic syndrome'
        ],
        hematology_oncology: [
            'Iron deficiency', 'B12/folate deficiency', 'Hemolytic anemia', 'Sickle cell crisis',
            'Bleeding disorders', 'Thrombophilia', 'Leukemia basics', 'Lymphoma basics',
            'Tumor lysis syndrome', 'Neutropenic fever', 'Transfusion medicine', 'Anticoagulation'
        ],
        infectious: [
            'Sepsis bundles', 'Meningitis protocols', 'Endocarditis', 'Pneumonia guidelines',
            'UTI management', 'Skin infections', 'Osteomyelitis', 'HIV basics',
            'Tuberculosis', 'Fungal infections', 'Viral hepatitis', 'STI management',
            'Travel medicine', 'Antimicrobial resistance', 'Healthcare infections'
        ],
        emergency_critical: [
            'Cardiac arrest', 'Shock types', 'Trauma basics', 'Burns management',
            'Poisoning/overdose', 'Anaphylaxis', 'Heat emergencies', 'Cold emergencies',
            'Drowning', 'Electrical injuries', 'Acid-base disorders', 'Fluid resuscitation',
            'Vasopressor selection', 'Sedation principles', 'End-of-life care'
        ],
        rheumatology_immunology: [
            'Rheumatoid arthritis', 'SLE management', 'Gout/pseudogout', 'Vasculitis types',
            'Spondyloarthropathies', 'Polymyalgia rheumatica', 'Scleroderma', 'Inflammatory myopathies',
            'Antiphospholipid syndrome', 'Immunodeficiencies'
        ]
    };

    useEffect(() => {
        // Load activity data from localStorage
        const savedActivity = localStorage.getItem('medExamActivity') || '{}';
        const activity = JSON.parse(savedActivity);
        setActivityData(activity);

        // Load topic scores
        const savedScores = localStorage.getItem('topicScores') || '{}';
        const scores = JSON.parse(savedScores);

        // Calculate topic coverage
        const coverage = {};
        let totalCompleted = 0;

        Object.entries(SUBTOPICS_BY_SYSTEM).forEach(([system, topics]) => {
            const systemScores = topics.map(topic => scores[topic] || 0);
            const completed = systemScores.filter(score => score >= 70).length;
            totalCompleted += completed;

            coverage[system] = {
                completed,
                total: topics.length,
                percentage: Math.round((completed / topics.length) * 100),
                averageScore: systemScores.reduce((a, b) => a + b, 0) / topics.length || 0
            };
        });

        setTopicCoverage(coverage);

        // Calculate overall stats
        const totalCases = Object.values(activity).reduce((sum, count) => sum + count, 0);
        const allScores = Object.values(scores);
        const averageScore = allScores.length > 0
            ? allScores.reduce((a, b) => a + b, 0) / allScores.length
            : 0;

        // Calculate streak
        let streak = 0;
        const today = new Date().toISOString().split('T')[0];
        let currentDate = new Date();

        while (activity[currentDate.toISOString().split('T')[0]] > 0) {
            streak++;
            currentDate.setDate(currentDate.getDate() - 1);
        }

        setOverallStats({
            totalCases,
            averageScore: averageScore.toFixed(1),
            streak,
            topicsCompleted: totalCompleted
        });
    }, []);

    const dates = generateDateRange();
    const weeks = [];
    let currentWeek = [];

    // Group dates into weeks
    dates.forEach((date, index) => {
        currentWeek.push(date);
        if (currentWeek.length === 7 || index === dates.length - 1) {
            weeks.push(currentWeek);
            currentWeek = [];
        }
    });

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-6xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Your Medical Exam Progress</h2>
                    <button
                        className="text-gray-500 hover:text-gray-700"
                        onClick={onClose}
                    >
                        ✕
                    </button>
                </div>

                {/* Overall Stats */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                    <div className="bg-blue-50 p-4 rounded">
                        <div className="text-3xl font-bold">{overallStats.totalCases}</div>
                        <div className="text-sm text-gray-600">Total Cases</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded">
                        <div className="text-3xl font-bold">{overallStats.averageScore}%</div>
                        <div className="text-sm text-gray-600">Average Score</div>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded">
                        <div className="text-3xl font-bold">{overallStats.streak}</div>
                        <div className="text-sm text-gray-600">Day Streak</div>
                    </div>
                    <div className="bg-purple-50 p-4 rounded">
                        <div className="text-3xl font-bold">{overallStats.topicsCompleted}/150</div>
                        <div className="text-sm text-gray-600">Topics Mastered</div>
                    </div>
                </div>

                {/* Activity Heatmap */}
                <div className="mb-8">
                    <h3 className="text-lg font-semibold mb-4">365-Day Activity</h3>
                    <div className="overflow-x-auto">
                        <div className="flex gap-1">
                            {weeks.map((week, weekIndex) => (
                                <div key={weekIndex} className="flex flex-col gap-1">
                                    {week.map((date) => (
                                        <div
                                            key={date}
                                            className={`w-3 h-3 rounded-sm ${getActivityColor(activityData[date] || 0)}`}
                                            title={`${date}: ${activityData[date] || 0} cases`}
                                        />
                                    ))}
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
                        <span>Less</span>
                        <div className="w-3 h-3 bg-gray-100 rounded-sm"></div>
                        <div className="w-3 h-3 bg-green-200 rounded-sm"></div>
                        <div className="w-3 h-3 bg-green-400 rounded-sm"></div>
                        <div className="w-3 h-3 bg-green-600 rounded-sm"></div>
                        <div className="w-3 h-3 bg-green-800 rounded-sm"></div>
                        <span>More</span>
                    </div>
                </div>

                {/* Topic Coverage */}
                <div>
                    <h3 className="text-lg font-semibold mb-4">Topic Coverage by System</h3>
                    <div className="space-y-3">
                        {Object.entries(topicCoverage).map(([system, data]) => (
                            <div key={system} className="border rounded p-3">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-medium capitalize">{system.replace('_', ' ')}</h4>
                                    <span className="text-sm text-gray-600">
                                        {data.completed}/{data.total} topics ({data.percentage}%)
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-blue-600 h-2 rounded-full transition-all"
                                        style={{ width: `${data.percentage}%` }}
                                    />
                                </div>
                                {data.averageScore > 0 && (
                                    <div className="text-xs text-gray-600 mt-1">
                                        Average score: {data.averageScore.toFixed(1)}%
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-6 text-center">
                    <button
                        className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                        onClick={onClose}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
} 
