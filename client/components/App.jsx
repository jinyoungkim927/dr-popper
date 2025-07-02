import { useCallback, useEffect, useRef, useState } from "react";
import casesReference from "../../cases_reference.json";
import systemPromptData from "../../system_prompt.json";
import EventLog from "./EventLog";
import Profile from "./Profile";
import SessionControls from "./SessionControls";
import logo from "/assets/openai-logomark.svg";

// Medical exam types - simplified to 3 modes
const EXAM_MODES = {
  RANDOM: 'random-questions',
  VIVA: 'viva',
  REVISE: 'revise'
};

const MEDICAL_SYSTEMS = [
  { value: 'all', label: 'All Systems' },
  { value: 'cardiovascular', label: 'Cardiovascular' },
  { value: 'respiratory', label: 'Respiratory' },
  { value: 'neurological', label: 'Neurological' },
  { value: 'hematological', label: 'Hematological' },
  { value: 'endocrine', label: 'Endocrine' },
  { value: 'gastrointestinal', label: 'Gastrointestinal' },
  { value: 'renal', label: 'Renal' },
  { value: 'musculoskeletal', label: 'Musculoskeletal' },
  { value: 'oncology', label: 'Oncology' },
  { value: 'immunology', label: 'Immunology' }
];

// Initialize subtopics for tracking
const SUBTOPICS = {
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
  // ... (other systems would be added similarly)
};

export default function App() {
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [events, setEvents] = useState([]);
  const [dataChannel, setDataChannel] = useState(null);
  const [examMode, setExamMode] = useState(EXAM_MODES.RANDOM);
  const [selectedSystem, setSelectedSystem] = useState('all');
  const [currentCase, setCurrentCase] = useState(null);
  const [sessionConfigured, setSessionConfigured] = useState(false);
  const [additionalContext, setAdditionalContext] = useState('');
  const [showContextDialog, setShowContextDialog] = useState(false);
  const [uploadedImages, setUploadedImages] = useState([]);

  // New state for scoring and tracking
  const [currentScore, setCurrentScore] = useState(null);
  const [sessionScores, setSessionScores] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [weakTopics, setWeakTopics] = useState([]);
  const [caseCompleted, setCaseCompleted] = useState(false);

  // Additional state for enhanced features
  const [currentCaseData, setCurrentCaseData] = useState(null);
  const [caseSubsectionScores, setCaseSubsectionScores] = useState({});
  const [userResponses, setUserResponses] = useState([]);
  const [questionsAnswered, setQuestionsAnswered] = useState([]);
  const [caseStartTime, setCaseStartTime] = useState(null);
  const [isValidatingCompletion, setIsValidatingCompletion] = useState(false);
  const [completionFeedback, setCompletionFeedback] = useState(null);
  const [completedCases, setCompletedCases] = useState([]);
  const [showCaseDropdown, setShowCaseDropdown] = useState(false);

  const peerConnection = useRef(null);
  const audioElement = useRef(null);
  const fileInputRef = useRef(null);

  const [selectedCase, setSelectedCase] = useState(null);
  const [showCaseSelector, setShowCaseSelector] = useState(false);

  // Load user profile from localStorage
  useEffect(() => {
    try {
      const savedProfile = localStorage.getItem('medExamProfile');
      if (savedProfile) {
        setUserProfile(JSON.parse(savedProfile));
      }

      // Load weak topics for revision
      const savedScores = localStorage.getItem('topicScores');
      if (savedScores) {
        const scores = JSON.parse(savedScores);
        const weak = Object.entries(scores)
          .filter(([topic, score]) => score < 70)
          .map(([topic]) => topic);
        setWeakTopics(weak);
      }
    } catch (error) {
      console.error('Error loading saved data:', error);
    }
  }, []);

  async function startSession() {
    // Get a session token for OpenAI Realtime API
    const tokenResponse = await fetch("/token");
    const data = await tokenResponse.json();
    const EPHEMERAL_KEY = data.client_secret.value;

    // Create a peer connection
    const pc = new RTCPeerConnection();

    // Set up to play remote audio from the model
    audioElement.current = document.createElement("audio");
    audioElement.current.autoplay = true;
    pc.ontrack = (e) => (audioElement.current.srcObject = e.streams[0]);

    // Add local audio track for microphone input in the browser
    const ms = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    pc.addTrack(ms.getTracks()[0]);

    // Set up data channel for sending and receiving events
    const dc = pc.createDataChannel("oai-events");
    setDataChannel(dc);

    // Start the session using the Session Description Protocol (SDP)
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const baseUrl = "https://api.openai.com/v1/realtime";
    const model = "gpt-4o-realtime-preview-2024-12-17";
    const sdpResponse = await fetch(`${baseUrl}?model=${model}`, {
      method: "POST",
      body: offer.sdp,
      headers: {
        Authorization: `Bearer ${EPHEMERAL_KEY}`,
        "Content-Type": "application/sdp",
      },
    });

    const answer = {
      type: "answer",
      sdp: await sdpResponse.text(),
    };
    await pc.setRemoteDescription(answer);

    peerConnection.current = pc;
  }

  // Configure session with medical exam instructions
  function configureSession() {
    if (dataChannel && isSessionActive && !sessionConfigured) {
      // Include additional context in the instructions
      const contextSection = additionalContext ? `

ADDITIONAL CONTEXT PROVIDED:
${additionalContext}

${uploadedImages.length > 0 ? `User provided ${uploadedImages.length} image(s).` : ''}
` : '';

      // Add mode-specific instructions
      let modeInstructions = '';
      if (examMode === EXAM_MODES.REVISE) {
        modeInstructions = `
REVISION MODE ACTIVE:
Focus on these weak topics: ${weakTopics.join(', ')}
Start with easier questions to build confidence.`;
      }

      const medicalInstructions = `${systemPromptData.system_prompt}

Current Mode: ${examMode}
Selected System: ${selectedSystem}

${contextSection}
${modeInstructions}

Begin immediately with a relevant case or question. No introductions needed.`;

      const sessionUpdate = {
        type: "session.update",
        session: {
          instructions: medicalInstructions,
          voice: "alloy",
          input_audio_transcription: {
            model: "whisper-1"
          },
          turn_detection: {
            type: "server_vad",
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500
          },
          temperature: 0.6,
          max_response_output_tokens: 4096
        }
      };

      sendClientEvent(sessionUpdate);
      setSessionConfigured(true);

      // Start immediately with a case
      setTimeout(() => {
        if (examMode === EXAM_MODES.RANDOM) {
          sendTextMessage("Start with a random case.");
        } else if (examMode === EXAM_MODES.VIVA) {
          sendTextMessage("Begin viva examination.");
        } else if (examMode === EXAM_MODES.REVISE) {
          sendTextMessage(`Begin revision focusing on weak areas.`);
        }
      }, 1000);
    }
  }

  // Grade the response using GPT-4
  async function gradeResponse(userResponse, correctContext) {
    try {
      const response = await fetch('/api/grade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userResponse,
          context: correctContext,
          criteria: {
            accuracy: 0.4,
            clinicalReasoning: 0.3,
            criticalFeatures: 0.2,
            safety: 0.1
          }
        })
      });

      const data = await response.json();
      setCurrentScore(data.score);

      // Update session scores
      setSessionScores(prev => [...prev, {
        timestamp: new Date(),
        score: data.score,
        topic: currentCase?.system || 'general'
      }]);

      // Save to localStorage for tracking
      updateTopicScore(currentCase?.system || 'general', data.score);

      return data.score;
    } catch (error) {
      console.error('Grading error:', error);
      return null;
    }
  }

  // Update topic scores in localStorage
  function updateTopicScore(topic, score) {
    const savedScores = localStorage.getItem('topicScores') || '{}';
    const scores = JSON.parse(savedScores);

    // Running average
    if (scores[topic]) {
      scores[topic] = (scores[topic] + score) / 2;
    } else {
      scores[topic] = score;
    }

    localStorage.setItem('topicScores', JSON.stringify(scores));
  }

  // Calculate session summary
  function calculateSessionSummary() {
    if (sessionScores.length === 0) return null;

    const average = sessionScores.reduce((sum, s) => sum + s.score, 0) / sessionScores.length;
    const grade = average >= 90 ? 'A' :
      average >= 80 ? 'B' :
        average >= 70 ? 'C' :
          average >= 60 ? 'D' : 'F';

    return {
      casesCompleted: sessionScores.length,
      averageScore: average.toFixed(1),
      grade,
      weakAreas: sessionScores.filter(s => s.score < 70).map(s => s.topic)
    };
  }

  // Handle context submission
  function submitAdditionalContext() {
    if (dataChannel && isSessionActive) {
      let contextMessage = `Additional context: ${additionalContext}`;
      if (uploadedImages.length > 0) {
        contextMessage += ` ${uploadedImages.length} image(s) provided.`;
      }
      sendTextMessage(contextMessage);
    }
    setShowContextDialog(false);
  }

  // Handle image upload
  function handleImageUpload(event) {
    const files = Array.from(event.target.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImages(prev => [...prev, {
          name: file.name,
          url: e.target.result,
          type: file.type
        }]);
      };
      reader.readAsDataURL(file);
    });
  }

  // Stop current session, clean up peer connection and data channel
  async function stopSession() {
    // Generate PDF report before closing
    if (completedCases.length > 0) {
      const shouldGenerateReport = confirm('Would you like to download a PDF report of your session?');
      if (shouldGenerateReport) {
        await generateAndDownloadReport();
      }
    }

    // Calculate and show session summary
    const summary = calculateSessionSummary();
    if (summary) {
      alert(`Session Summary:
Cases: ${summary.casesCompleted}
Average: ${summary.averageScore}%
Grade: ${summary.grade}
${summary.weakAreas.length > 0 ? `Weak areas: ${summary.weakAreas.join(', ')}` : ''}`);
    }

    if (dataChannel) {
      dataChannel.close();
    }

    peerConnection.current.getSenders().forEach((sender) => {
      if (sender.track) {
        sender.track.stop();
      }
    });

    if (peerConnection.current) {
      peerConnection.current.close();
    }

    setIsSessionActive(false);
    setDataChannel(null);
    setSessionConfigured(false);
    setSessionScores([]);
    setCompletedCases([]);
    setCurrentCaseData(null);
    setCaseSubsectionScores({});
    peerConnection.current = null;
  }

  // Send a message to the model
  function sendClientEvent(message) {
    if (dataChannel) {
      const timestamp = new Date().toLocaleTimeString();
      message.event_id = message.event_id || crypto.randomUUID();

      // send event before setting timestamp since the backend peer doesn't expect this field
      dataChannel.send(JSON.stringify(message));

      // if guard just in case the timestamp exists by miracle
      if (!message.timestamp) {
        message.timestamp = timestamp;
      }
      setEvents((prev) => [message, ...prev]);
    } else {
      console.error(
        "Failed to send message - no data channel available",
        message,
      );
    }
  }

  // Send a text message to the model
  function sendTextMessage(message) {
    const event = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text: message,
          },
        ],
      },
    };

    sendClientEvent(event);
    sendClientEvent({ type: "response.create" });
  }

  // Mark case as completed and trigger grading
  async function completeCase() {
    // Prevent spam clicking and double completion
    if (isValidatingCompletion || caseCompleted || !currentCaseData) {
      return;
    }

    setIsValidatingCompletion(true);

    try {
      // Validate case completion
      const validationResponse = await fetch('/api/validate-case-completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caseId: currentCaseData?.id || selectedCase,
          userResponses: userResponses,
          questionsAnswered: questionsAnswered
        })
      });

      const validation = await validationResponse.json();

      if (!validation.canComplete) {
        // Show feedback to user
        setCompletionFeedback({
          type: 'warning',
          message: validation.reason,
          percentage: validation.completionPercentage
        });

        // Clear feedback after 5 seconds
        setTimeout(() => setCompletionFeedback(null), 5000);
        return;
      }

      // Case can be completed
      setCaseCompleted(true);

      // Calculate case duration
      const caseDuration = caseStartTime
        ? `${Math.round((Date.now() - caseStartTime) / 60000)}m`
        : 'N/A';

      // Store completed case data
      const completedCase = {
        id: currentCaseData?.id || selectedCase,
        title: currentCaseData?.title || `Case ${selectedCase}`,
        score: currentScore || 0,
        subsections: Object.entries(caseSubsectionScores).map(([key, data]) => ({
          name: key,
          score: data.score,
          feedback: data.feedback
        })),
        duration: caseDuration,
        feedback: validation.reason || 'Case completed successfully'
      };

      setCompletedCases(prev => [...prev, completedCase]);

      // Update activity tracking
      const today = new Date().toISOString().split('T')[0];
      const savedActivity = localStorage.getItem('medExamActivity') || '{}';
      const activity = JSON.parse(savedActivity);
      activity[today] = (activity[today] || 0) + 1;
      localStorage.setItem('medExamActivity', JSON.stringify(activity));

      // Auto-generate PDF if it's the last case or user stops
      if (completedCases.length >= 2) {
        await generateAndDownloadReport();
      }

      sendTextMessage("Case completed. Next case.");

      // Reset for next case
      setTimeout(() => {
        setCaseCompleted(false);
        setCurrentCaseData(null);
        setCaseSubsectionScores({});
        setUserResponses([]);
        setQuestionsAnswered([]);
        setCaseStartTime(Date.now());
      }, 2000);

    } catch (error) {
      console.error('Error validating case completion:', error);
      setCompletionFeedback({
        type: 'error',
        message: 'Failed to validate completion. Please try again.'
      });
    } finally {
      setIsValidatingCompletion(false);
    }
  }

  // Generate and download PDF report
  async function generateAndDownloadReport() {
    try {
      const sessionData = formatSessionDataForReport(
        sessionScores,
        completedCases,
        userProfile
      );

      const response = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionData,
          studentName: userProfile?.name || 'Student',
          sessionDate: new Date().toISOString()
        })
      });

      const { reportData } = await response.json();

      // Generate PDF
      const report = await generateSessionReport(reportData);

      // Auto-download
      report.download();

      return report;
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert('Failed to generate PDF report. Please try again.');
    }
  }

  // Handle subsection completion from LiveScoreTracker
  function handleSubsectionComplete(subsectionKey, result) {
    setCaseSubsectionScores(prev => ({
      ...prev,
      [subsectionKey]: result
    }));

    // Update questions answered if relevant
    if (result.isComplete) {
      setQuestionsAnswered(prev => [...prev, subsectionKey]);
    }
  }

  // Attach event listeners to the data channel when a new one is created
  useEffect(() => {
    if (dataChannel) {
      // Append new server events to the list
      dataChannel.addEventListener("message", (e) => {
        const event = JSON.parse(e.data);
        if (!event.timestamp) {
          event.timestamp = new Date().toLocaleTimeString();
        }

        setEvents((prev) => [event, ...prev]);

        // Track user responses
        if (event.type === 'conversation.item.created' && event.item?.role === 'user') {
          const userText = event.item?.content?.[0]?.text || '';
          if (userText) {
            setUserResponses(prev => [...prev, userText]);
          }
        }

        // Check for completion triggers
        if (event.type === 'conversation.item.created' &&
          event.item?.content?.[0]?.text?.toLowerCase().includes('next case')) {
          setCaseCompleted(true);
        }
      });

      // Set session active when the data channel is opened
      dataChannel.addEventListener("open", () => {
        setIsSessionActive(true);
        setEvents([]);
        setCaseStartTime(Date.now());
      });
    }
  }, [dataChannel]);

  // Configure session when it becomes active
  useEffect(() => {
    if (isSessionActive && dataChannel && !sessionConfigured) {
      configureSession();
    }
  }, [isSessionActive, dataChannel, examMode, selectedSystem]);

  // Function to start a session with a specific case
  const startCaseSession = useCallback((caseId, caseData) => {
    if (!dataChannel || !isSessionActive) return;

    // Set current case data
    setCurrentCaseData(caseData);
    setCaseStartTime(Date.now());
    setCaseCompleted(false);
    setCaseSubsectionScores({});
    setUserResponses([]);
    setQuestionsAnswered([]);

    // Format case information for the AI
    const caseInfo = `
Clinical Case: ${caseData.id}
Difficulty: ${caseData.difficulty}

PRESENTATION:
${caseData.presentation}

EXAMINATION FINDINGS:
${caseData.examFindings}

INVESTIGATIONS:
${caseData.investigations}

QUESTIONS TO ASK:
${caseData.questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

Begin by presenting the clinical scenario and then ask the first question.`;

    const caseInstruction = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{
          type: "text",
          text: `You are now examining the student on a ${caseData.difficulty} difficulty case. ${caseInfo}`
        }]
      }
    };

    if (dataChannel && dataChannel.readyState === 'open') {
      dataChannel.send(JSON.stringify(caseInstruction));
      dataChannel.send(JSON.stringify({ type: "response.create" }));
    }

    setSelectedCase(caseId);
    setShowCaseSelector(false);
  }, [dataChannel, isSessionActive]);

  return (
    <>
      <nav className="absolute top-0 left-0 right-0 h-16 flex items-center bg-white shadow-sm">
        <div className="flex items-center gap-4 w-full m-4 pb-2 border-0 border-b border-solid border-gray-200">
          <img style={{ width: "24px" }} src={logo} />
          <h1 className="text-xl font-semibold">Medical Exam Preparation</h1>
          <div className="ml-auto">
            <button
              className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200"
              onClick={() => setShowProfile(!showProfile)}
            >
              Profile
            </button>
          </div>
        </div>
      </nav>
      <main className="absolute top-16 left-0 right-0 bottom-0">
        <section className="absolute top-0 left-0 right-[380px] bottom-0 flex">
          <section className="absolute top-0 left-0 right-0 bottom-32 px-4 overflow-y-auto">
            {!isSessionActive ? (
              <div className="mt-8 p-6 bg-blue-50 rounded-lg">
                <h2 className="text-2xl font-bold mb-4">Medical Exam Practice</h2>
                <p className="mb-4">Select your practice mode and begin.</p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 border rounded">
                    <h3 className="font-bold">Random Questions</h3>
                    <p className="text-sm">Mixed topics and difficulty</p>
                  </div>
                  <div className="p-4 border rounded">
                    <h3 className="font-bold">Viva</h3>
                    <p className="text-sm">Rapid-fire oral examination</p>
                  </div>
                  <div className="p-4 border rounded">
                    <h3 className="font-bold">Revise</h3>
                    <p className="text-sm">Focus on weak areas</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="mt-4 mb-4 p-4 bg-gray-50 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-semibold">Mode: {examMode}</p>
                    <p className="text-sm">System: {selectedSystem}</p>
                  </div>
                  {currentScore !== null && (
                    <div className="text-right">
                      <p className="text-2xl font-bold">{currentScore}/10</p>
                      <p className="text-sm">Last Score</p>
                    </div>
                  )}
                  <button
                    className={`px-4 py-2 rounded transition-colors ${isValidatingCompletion || caseCompleted
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    onClick={completeCase}
                    disabled={isValidatingCompletion || caseCompleted}
                  >
                    {isValidatingCompletion ? 'Validating...' :
                      caseCompleted ? 'Case Completed' : 'Complete Case'}
                  </button>
                </div>

                {/* Completion feedback */}
                {completionFeedback && (
                  <div className={`mb-4 p-4 rounded-lg ${completionFeedback.type === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                    }`}>
                    <p className="font-semibold">{completionFeedback.message}</p>
                    {completionFeedback.percentage && (
                      <p className="text-sm mt-1">
                        Current completion: {completionFeedback.percentage}%
                      </p>
                    )}
                  </div>
                )}

                {/* Live Score Tracker */}
                <LiveScoreTracker
                  currentCase={currentCaseData}
                  events={events}
                  isActive={isSessionActive}
                  onSubsectionComplete={handleSubsectionComplete}
                />

                  <EventLog events={events} />
              </>
            )}
          </section>
          <section className="absolute h-32 left-0 right-0 bottom-0 p-4 border-t border-gray-200">
            <SessionControls
              startSession={startSession}
              stopSession={stopSession}
              sendClientEvent={sendClientEvent}
              sendTextMessage={sendTextMessage}
              serverEvents={events}
              isSessionActive={isSessionActive}
              onShowCaseSelector={() => setShowCaseSelector(true)}
              onQuickCaseSelect={startCaseSession}
              selectedCase={selectedCase}
              caseTitles={casesReference.case_titles}
              examMode={examMode}
              onExamModeChange={setExamMode}
              selectedSystem={selectedSystem}
              onSystemChange={setSelectedSystem}
              medicalSystems={MEDICAL_SYSTEMS}
              medicalCases={MEDICAL_CASES}
            />
          </section>
        </section>
        <section className="absolute top-0 w-[380px] right-0 bottom-0 p-4 pt-0 overflow-y-auto border-l border-gray-200">
          <div className="mb-4">
            <h3 className="font-semibold mb-2">Practice Mode</h3>
            <select
              className="w-full p-2 border rounded"
              value={examMode}
              onChange={(e) => setExamMode(e.target.value)}
              disabled={isSessionActive}
            >
              <option value={EXAM_MODES.RANDOM}>Random Questions</option>
              <option value={EXAM_MODES.VIVA}>Viva</option>
              <option value={EXAM_MODES.REVISE}>Revise Weak Areas</option>
            </select>
          </div>

          <div className="mb-4">
            <h3 className="font-semibold mb-2">System Focus</h3>
            <select
              className="w-full p-2 border rounded"
              value={selectedSystem}
              onChange={(e) => setSelectedSystem(e.target.value)}
              disabled={isSessionActive}
            >
              {MEDICAL_SYSTEMS.map((system) => (
                <option key={system.value} value={system.value}>
                  {system.label}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4 space-y-2">
            <button
              className="w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              onClick={() => setShowContextDialog(true)}
              disabled={!isSessionActive}
            >
              Add Context
            </button>

            {completedCases.length > 0 && (
              <button
                className="w-full p-2 bg-green-600 text-white rounded hover:bg-green-700"
                onClick={generateAndDownloadReport}
              >
                Download PDF Report ({completedCases.length} cases)
              </button>
            )}
          </div>

          {sessionScores.length > 0 && (
            <div className="mb-4 p-4 bg-gray-50 rounded">
              <h4 className="font-semibold mb-2">Session Progress</h4>
              <p>Cases completed: {sessionScores.length}</p>
              <p>Average score: {(sessionScores.reduce((sum, s) => sum + s.score, 0) / sessionScores.length).toFixed(1)}%</p>
            </div>
          )}

          {examMode === EXAM_MODES.REVISE && weakTopics.length > 0 && (
            <div className="p-4 bg-yellow-50 rounded">
              <h4 className="font-semibold mb-2">Focus Areas</h4>
              <ul className="text-sm">
                {weakTopics.slice(0, 5).map(topic => (
                  <li key={topic}>• {topic}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </main>

      {/* Additional Context Dialog */}
      {showContextDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Add Additional Context</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Text Context:</label>
              <textarea
                className="w-full h-40 p-3 border rounded-lg"
                placeholder="Paste your notes or specific topics..."
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Upload Images:</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="mb-2"
              />
              {uploadedImages.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-gray-600 mb-2">Uploaded images:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {uploadedImages.map((img, idx) => (
                      <div key={idx} className="relative">
                        <img
                          src={img.url}
                          alt={img.name}
                          className="w-full h-24 object-cover rounded border"
                        />
                        <button
                          className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                          onClick={() => setUploadedImages(prev => prev.filter((_, i) => i !== idx))}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <button
                className="px-4 py-2 border rounded hover:bg-gray-50"
                onClick={() => {
                  setShowContextDialog(false);
                  setAdditionalContext('');
                  setUploadedImages([]);
                }}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={submitAdditionalContext}
              >
                Add Context
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile View */}
      {showProfile && (
        <Profile onClose={() => setShowProfile(false)} />
      )}

      {showCaseSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-4">Select a Medical Case</h3>
            <div className="grid gap-4">
              {Object.entries(MEDICAL_CASES).map(([system, cases]) => (
                <div key={system} className="border rounded p-4">
                  <h4 className="text-lg font-semibold mb-2 capitalize">{system}</h4>
                  <div className="grid grid-cols-1 gap-3">
                    {cases.map(caseData => (
                      <button
                        key={caseData.id}
                        className="text-left p-3 hover:bg-gray-100 rounded border transition-colors"
                        onClick={() => startCaseSession(caseData.id, caseData)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <span className="font-medium">Case {caseData.id}</span>
                            <span className={`ml-2 px-2 py-1 text-xs rounded ${caseData.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                              caseData.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                              {caseData.difficulty}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {caseData.presentation.substring(0, 100)}...
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button
              className="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              onClick={() => setShowCaseSelector(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
