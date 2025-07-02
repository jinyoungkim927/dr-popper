import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle, Clock } from 'react-feather';

export default function LiveScoreTracker({
    currentCase,
    events,
    isActive,
    onSubsectionComplete
}) {
    const [subsectionScores, setSubsectionScores] = useState({});
    const [currentSubsection, setCurrentSubsection] = useState(null);
    const [overallProgress, setOverallProgress] = useState(0);
    const [isGrading, setIsGrading] = useState(false);
    const [lastGradedIndex, setLastGradedIndex] = useState(-1);

    // Define subsections for each case type
    const CASE_SUBSECTIONS = {
        presentation: { name: 'Clinical Presentation', weight: 0.2 },
        examination: { name: 'Physical Examination', weight: 0.2 },
        investigations: { name: 'Investigations', weight: 0.2 },
        diagnosis: { name: 'Diagnosis & DDx', weight: 0.2 },
        management: { name: 'Management Plan', weight: 0.2 }
    };

    // Detect subsection transitions and trigger grading
    useEffect(() => {
        if (!isActive || !currentCase || events.length <= lastGradedIndex + 5) return;

        // Look for subsection transition indicators
        const recentEvents = events.slice(0, 10);
        const transcript = recentEvents
            .filter(e => e.type === 'conversation.item.created' && e.item?.role === 'user')
            .map(e => e.item?.content?.[0]?.text || '')
            .join(' ');

        // Simple heuristic: grade every 5-7 user responses or when topic changes
        const shouldGrade =
            (events.length - lastGradedIndex > 7) ||
            (transcript.toLowerCase().includes('next') ||
                transcript.toLowerCase().includes('move on') ||
                transcript.toLowerCase().includes('what about'));

        if (shouldGrade && !isGrading) {
            gradeCurrentSubsection(transcript);
        }
    }, [events, isActive, currentCase]);

    async function gradeCurrentSubsection(transcript) {
        if (!currentCase || !transcript) return;

        setIsGrading(true);

        try {
            // Determine which subsection we're in
            const subsection = detectCurrentSubsection(transcript);

            const response = await fetch('/api/grade-subsection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transcript,
                    subsection: subsection.name,
                    expectedPoints: getExpectedPoints(currentCase, subsection)
                })
            });

            const result = await response.json();

            setSubsectionScores(prev => ({
                ...prev,
                [subsection.key]: {
                    score: result.score,
                    isComplete: result.isComplete,
                    feedback: result.feedback,
                    timestamp: new Date()
                }
            }));

            setLastGradedIndex(events.length);

            // Notify parent component
            onSubsectionComplete?.(subsection.key, result);

            // Update overall progress
            updateOverallProgress();

        } catch (error) {
            console.error('Failed to grade subsection:', error);
        } finally {
            setIsGrading(false);
        }
    }

    function detectCurrentSubsection(transcript) {
        const lowerTranscript = transcript.toLowerCase();

        if (lowerTranscript.includes('examination') || lowerTranscript.includes('exam findings')) {
            return { key: 'examination', ...CASE_SUBSECTIONS.examination };
        } else if (lowerTranscript.includes('investigation') || lowerTranscript.includes('tests')) {
            return { key: 'investigations', ...CASE_SUBSECTIONS.investigations };
        } else if (lowerTranscript.includes('diagnosis') || lowerTranscript.includes('differential')) {
            return { key: 'diagnosis', ...CASE_SUBSECTIONS.diagnosis };
        } else if (lowerTranscript.includes('management') || lowerTranscript.includes('treatment')) {
            return { key: 'management', ...CASE_SUBSECTIONS.management };
        }

        return { key: 'presentation', ...CASE_SUBSECTIONS.presentation };
    }

    function getExpectedPoints(caseData, subsection) {
        // This would ideally come from the case data
        const defaults = {
            presentation: 'History taking, symptom analysis, risk factors',
            examination: 'Vital signs, relevant physical findings, red flags',
            investigations: 'Appropriate tests, interpretation, urgency',
            diagnosis: 'Primary diagnosis, differential diagnoses, reasoning',
            management: 'Immediate care, definitive treatment, follow-up'
        };

        return defaults[subsection.key] || 'Complete assessment';
    }

    function updateOverallProgress() {
        const scores = Object.values(subsectionScores);
        if (scores.length === 0) {
            setOverallProgress(0);
            return;
        }

        const totalWeight = scores.reduce((sum, s, i) => {
            const subsectionKey = Object.keys(subsectionScores)[i];
            return sum + (CASE_SUBSECTIONS[subsectionKey]?.weight || 0.2);
        }, 0);

        const weightedScore = scores.reduce((sum, s, i) => {
            const subsectionKey = Object.keys(subsectionScores)[i];
            const weight = CASE_SUBSECTIONS[subsectionKey]?.weight || 0.2;
            return sum + (s.score * weight);
        }, 0);

        setOverallProgress(Math.round(weightedScore / totalWeight));
    }

    function getScoreColor(score) {
        if (score >= 80) return 'text-green-600';
        if (score >= 60) return 'text-yellow-600';
        return 'text-red-600';
    }

    if (!isActive || !currentCase) return null;

    return (
        <div className="bg-white rounded-lg shadow-md p-4 mb-4">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg">Live Performance Tracking</h3>
                <div className="flex items-center gap-2">
                    {isGrading && (
                        <div className="flex items-center text-sm text-gray-500">
                            <Clock className="animate-spin mr-1" size={16} />
                            Grading...
                        </div>
                    )}
                    <div className={`text-2xl font-bold ${getScoreColor(overallProgress)}`}>
                        {overallProgress}%
                    </div>
                </div>
            </div>

            <div className="space-y-2">
                {Object.entries(CASE_SUBSECTIONS).map(([key, subsection]) => {
                    const score = subsectionScores[key];
                    const isComplete = score?.isComplete;
                    const scoreValue = score?.score || 0;

                    return (
                        <div key={key} className="flex items-center justify-between p-2 rounded bg-gray-50">
                            <div className="flex items-center gap-2">
                                {isComplete ? (
                                    <CheckCircle className="text-green-500" size={20} />
                                ) : score ? (
                                    <AlertCircle className="text-yellow-500" size={20} />
                                ) : (
                                    <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                                )}
                                <span className="font-medium">{subsection.name}</span>
                            </div>

                            {score && (
                                <div className="flex items-center gap-4">
                                    <span className={`font-semibold ${getScoreColor(scoreValue)}`}>
                                        {scoreValue}%
                                    </span>
                                    {score.feedback && (
                                        <div className="max-w-xs text-xs text-gray-600 italic">
                                            {score.feedback}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Overall Progress</span>
                    <span className="font-semibold">{Object.keys(subsectionScores).length} / 5 sections</span>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${(Object.keys(subsectionScores).length / 5) * 100}%` }}
                    />
                </div>
            </div>
        </div>
    );
} 