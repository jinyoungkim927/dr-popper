import { useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle, HelpCircle } from 'react-feather';

export default function LiveScoreTracker({
    currentCase,
    events,
    isActive,
    onSubsectionComplete
}) {
    const [questionScores, setQuestionScores] = useState({});
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [hoveredQuestion, setHoveredQuestion] = useState(null);
    const [detectedQuestions, setDetectedQuestions] = useState([]);
    const [userTranscriptByQuestion, setUserTranscriptByQuestion] = useState({});
    const [gradingQueue, setGradingQueue] = useState([]);
    const lastProcessedEvent = useRef(0);

    // Determine if this is a case protocol
    const isCaseProtocol = currentCase?.id?.includes('case-protocol');
    const caseNumber = currentCase?.caseNumber;

    // Default sections for non-case protocol mode
    const DEFAULT_SECTIONS = {
        presentation: { name: 'Clinical Presentation', weight: 0.2 },
        examination: { name: 'Physical Examination', weight: 0.2 },
        investigations: { name: 'Investigations', weight: 0.2 },
        diagnosis: { name: 'Diagnosis & DDx', weight: 0.2 },
        management: { name: 'Management Plan', weight: 0.2 }
    };

    // Clear state when case changes
    useEffect(() => {
        if (currentCase) {
            setQuestionScores({});
            setCurrentQuestion(null);
            setUserTranscriptByQuestion({});
            lastProcessedEvent.current = 0;
        }
    }, [currentCase?.id]);

    // Extract questions from parsed questions if available, otherwise from content
    useEffect(() => {
        if (isCaseProtocol && currentCase) {
            // First try to use parsed questions if available
            if (currentCase.parsedQuestions && currentCase.parsedQuestions.length > 0) {
                const questions = currentCase.parsedQuestions.map((q, index) => ({
                    number: String(index + 1),
                    text: q,
                    key: `q${index + 1}`
                }));
                setDetectedQuestions(questions);
            } else if (currentCase.content) {
                // Fallback to regex extraction
                const questions = extractQuestionsFromContent(currentCase.content);
                setDetectedQuestions(questions);
            }
        }
    }, [currentCase, isCaseProtocol]);

    function extractQuestionsFromContent(content) {
        const questions = [];
        // Match patterns like "1.", "2.", etc. followed by question text
        const questionPattern = /(\d+)\.\s+([^?]+\?[^0-9]*)/g;
        let match;

        while ((match = questionPattern.exec(content)) !== null) {
            const questionNum = match[1];
            const questionText = match[2].trim();
            questions.push({
                number: questionNum,
                text: questionText,
                key: `q${questionNum}`
            });
        }

        return questions;
    }

    // Monitor events for user input and question transitions
    useEffect(() => {
        if (!isActive || !currentCase || events.length <= lastProcessedEvent.current) return;

        const newEvents = events.slice(0, events.length - lastProcessedEvent.current);

        for (const event of newEvents) {
            // Collect user input for current question
            const userText = extractUserTextFromEvent(event);
            if (userText && currentQuestion) {
                setUserTranscriptByQuestion(prev => ({
                    ...prev,
                    [currentQuestion]: (prev[currentQuestion] || '') + ' ' + userText
                }));
            }

            // Check if AI is transitioning to a new question
            const aiText = extractAITextFromEvent(event);
            if (aiText) {
                const detectedQuestionNum = detectQuestionNumberFromAIText(aiText);

                if (detectedQuestionNum) {
                    const newQuestionKey = `q${detectedQuestionNum}`;

                    // If we're moving to a new question, grade the previous one
                    if (currentQuestion && newQuestionKey !== currentQuestion) {
                        // Add to grading queue immediately to show grading status
                        setGradingQueue(prev => [...prev, currentQuestion]);
                        gradeQuestion(currentQuestion);
                    }

                    // Set the new current question
                    if (newQuestionKey !== currentQuestion) {
                        setCurrentQuestion(newQuestionKey);
                        // Initialize transcript for new question
                        setUserTranscriptByQuestion(prev => ({
                            ...prev,
                            [newQuestionKey]: ''
                        }));
                    }
                } else if (!currentQuestion && detectedQuestions.length > 0) {
                    // If no current question set but we have questions, assume we're on question 1
                    setCurrentQuestion('q1');
                }
            }
        }

        lastProcessedEvent.current = events.length;
    }, [events, isActive, currentCase, currentQuestion, detectedQuestions]);

    function extractUserTextFromEvent(event) {
        // Check multiple event types for user input
        if (event.type === 'conversation.item.created' && event.item?.role === 'user') {
            return event.item?.content?.[0]?.text || event.item?.content?.[0]?.transcript || '';
        }
        if (event.type === 'conversation.item.input_audio_transcription.completed' && event.transcript) {
            return event.transcript;
        }
        if (event.type === 'input_audio_buffer.speech_stopped' && event.transcript) {
            return event.transcript;
        }
        return '';
    }

    function extractAITextFromEvent(event) {
        if (event.type === 'response.done' && event.response?.output?.[0]?.content) {
            const content = event.response.output[0].content;
            return content.text || content.transcript || '';
        }
        if (event.type === 'conversation.item.created' && event.item?.role === 'assistant') {
            return event.item?.content?.[0]?.text || event.item?.content?.[0]?.transcript || '';
        }
        return '';
    }

    function detectQuestionNumberFromAIText(text) {
        const lower = text.toLowerCase();

        // Look for explicit question mentions
        const patterns = [
            /question\s*(\d+)/i,
            /q\.?\s*(\d+)/i,
            /\b(\d+)\.\s+\w+/,  // "1. What..."
            /number\s*(\d+)/i,
            /let's\s+(?:move\s+on\s+to|discuss|talk\s+about)\s+question\s*(\d+)/i,
            /moving\s+(?:on\s+)?to\s+question\s*(\d+)/i,
            /next\s+question[^0-9]*(\d+)/i
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                return match[1];
            }
        }

        // Check if any detected question text appears in the AI response
        for (const question of detectedQuestions) {
            if (text.includes(question.text.substring(0, 30))) {
                return question.number;
            }
        }

        return null;
    }

    async function gradeQuestion(questionKey) {
        if (questionScores[questionKey]?.score) return;

        // Get the full transcript for this question
        const fullTranscript = userTranscriptByQuestion[questionKey] || '';

        // Require minimum content before grading
        if (fullTranscript.trim().length < 20) {
            // Remove from grading queue if not enough content
            setGradingQueue(prev => prev.filter(q => q !== questionKey));
            return;
        }

        try {
            const questionNum = questionKey.replace('q', '');
            const questionInfo = detectedQuestions.find(q => q.key === questionKey) || {
                text: `Question ${questionNum}`,
                number: questionNum
            };

            const response = await fetch('/api/grade-subsection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transcript: fullTranscript.trim(),
                    subsection: `Question ${questionNum}: ${questionInfo.text}`,
                    expectedPoints: getExpectedPointsForQuestion(questionInfo)
                })
            });

            const result = await response.json();
            setQuestionScores(prev => ({
                ...prev,
                [questionKey]: {
                    ...result,
                    timestamp: new Date(),
                    questionText: questionInfo.text,
                    transcriptLength: fullTranscript.length
                }
            }));

            onSubsectionComplete?.(questionKey, result);
        } catch (error) {
            console.error('Grading error:', error);
        } finally {
            // Remove from grading queue when done
            setGradingQueue(prev => prev.filter(q => q !== questionKey));
        }
    }

    function getExpectedPointsForQuestion(questionInfo) {
        // For case protocols, we can provide more specific expected points based on the question
        const questionLower = questionInfo.text.toLowerCase();

        if (questionLower.includes('diagnosis') || questionLower.includes('likely cause')) {
            return 'Correct diagnosis with reasoning, differential diagnoses';
        }
        if (questionLower.includes('investigation') || questionLower.includes('test')) {
            return 'Appropriate tests with rationale, interpretation';
        }
        if (questionLower.includes('management') || questionLower.includes('treatment')) {
            return 'Treatment plan, dosing, monitoring, safety';
        }
        if (questionLower.includes('mechanism') || questionLower.includes('pathophysiology')) {
            return 'Pathophysiology explanation, molecular mechanisms';
        }
        if (questionLower.includes('risk factor')) {
            return 'All relevant risk factors with explanations';
        }

        return 'Complete and accurate medical answer';
    }

    function calculateOverallScore() {
        const scores = Object.values(questionScores);
        if (scores.length === 0) return 0;

        const totalScore = scores.reduce((sum, score) => sum + score.score, 0);
        return Math.round(totalScore / scores.length);
    }

    function getScoreColor(score) {
        if (score >= 80) return 'text-green-600';
        if (score >= 60) return 'text-yellow-600';
        return 'text-red-600';
    }

    // Grade the final question when case is completed
    useEffect(() => {
        if (!isActive || !currentCase) return;

        // Check if all questions have been graded
        const allQuestionsGraded = detectedQuestions.length > 0 &&
            detectedQuestions.every(q => questionScores[q.key]?.score);

        // If we have a current question with transcript but no score, and all other questions are graded
        if (currentQuestion &&
            userTranscriptByQuestion[currentQuestion]?.trim().length > 20 &&
            !questionScores[currentQuestion]?.score &&
            Object.keys(questionScores).length === detectedQuestions.length - 1) {
            // This might be the last question, grade it
            gradeQuestion(currentQuestion);
        }
    }, [questionScores, currentQuestion, userTranscriptByQuestion, detectedQuestions, isActive, currentCase]);

    if (!isActive || !currentCase) return null;

    const overallScore = calculateOverallScore();
    const displayItems = isCaseProtocol ? detectedQuestions : Object.entries(DEFAULT_SECTIONS).map(([key, section]) => ({
        key,
        ...section,
        number: key
    }));

    return (
        <div className="bg-white rounded-lg shadow-lg p-4 mb-4 border-2 border-blue-500">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-xl">
                    {isCaseProtocol ? `Case Protocol ${caseNumber} Progress` : 'Live Performance Score'}
                </h3>
                <div className="text-right">
                    <div className={`text-2xl font-bold ${getScoreColor(overallScore)}`}>
                        {overallScore}%
                    </div>
                    <div className="text-xs text-gray-500">Overall Score</div>
                </div>
            </div>

            <div className="space-y-2">
                {displayItems.map((item) => {
                    const score = questionScores[item.key];
                    const isCurrent = currentQuestion === item.key;
                    const transcriptLength = userTranscriptByQuestion[item.key]?.length || 0;
                    const isBeingGraded = gradingQueue.includes(item.key);

                    return (
                        <div
                            key={item.key}
                            className={`relative flex items-center justify-between p-3 rounded-lg transition-all ${isCurrent ? 'bg-blue-50 border-2 border-blue-300' :
                                isBeingGraded ? 'bg-yellow-50 border-2 border-yellow-300' :
                                    'bg-gray-50'
                                }`}
                            onMouseEnter={() => setHoveredQuestion(item.key)}
                            onMouseLeave={() => setHoveredQuestion(null)}
                        >
                            <div className="flex items-center gap-3 flex-1">
                                {score ? (
                                    score.score >= 70 ? (
                                        <CheckCircle className="text-green-500 flex-shrink-0" size={24} />
                                    ) : (
                                        <AlertCircle className="text-yellow-500 flex-shrink-0" size={24} />
                                    )
                                ) : isBeingGraded ? (
                                    <div className="w-6 h-6 rounded-full border-2 border-yellow-500 border-t-transparent animate-spin flex-shrink-0" />
                                ) : (
                                    <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex-shrink-0" />
                                )}
                                <div className="flex-1">
                                    <span className={`font-medium ${isCurrent ? 'text-blue-700' :
                                        isBeingGraded ? 'text-yellow-700' : ''
                                        }`}>
                                        {isCaseProtocol ? `Question ${item.number}` : item.name}
                                        {isBeingGraded && <span className="text-xs ml-2">(Grading...)</span>}
                                    </span>
                                    {isCaseProtocol && item.text && (
                                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                            {item.text.substring(0, 100)}...
                                        </p>
                                    )}
                                    {isCurrent && transcriptLength > 0 && !score && !isBeingGraded && (
                                        <p className="text-xs text-blue-600 mt-1">
                                            {Math.floor(transcriptLength / 5)} words captured
                                        </p>
                                    )}
                                </div>
                            </div>

                            {score && (
                                <div className="flex items-center gap-4 ml-4">
                                    <div className={`text-2xl font-bold ${getScoreColor(score.score)}`}>
                                        {score.score}%
                                    </div>
                                    <HelpCircle className="text-gray-400 hover:text-gray-600 cursor-help" size={20} />
                                </div>
                            )}

                            {hoveredQuestion === item.key && score?.feedback && (
                                <div className="absolute z-10 right-0 top-full mt-2 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg max-w-xs">
                                    <div className="font-semibold mb-1">Feedback:</div>
                                    {score.feedback}
                                    <div className="absolute -top-2 right-8 w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-gray-900"></div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Progress</span>
                    <span className="font-semibold">
                        {Object.keys(questionScores).length} / {displayItems.length} {isCaseProtocol ? 'Questions' : 'Skills'}
                    </span>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-3">
                    <div 
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-700"
                        style={{ width: `${(Object.keys(questionScores).length / displayItems.length) * 100}%` }}
                    />
                </div>
            </div>

            <div className="mt-3 text-xs text-center text-gray-500">
                <span>Automatic grading when conversation moves to next question</span>
            </div>
        </div>
    );
} 
