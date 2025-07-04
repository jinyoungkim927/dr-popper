import { useCallback, useEffect, useRef, useState } from "react";
import casesReference from "../../cases_reference.json";
import systemPromptData from "../../system_prompt.json";
import { formatSessionDataForReport, generateSessionReport } from "../utils/pdfGenerator.js";
import AuthWrapper from "./AuthWrapper";
import LiveScoreTracker from "./LiveScoreTracker";
import Profile from "./Profile";

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
  // Core session state
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [events, setEvents] = useState([]);
  const [dataChannel, setDataChannel] = useState(null);
  const [sessionConfigured, setSessionConfigured] = useState(false);

  // Exam configuration
  const [examMode, setExamMode] = useState(EXAM_MODES.RANDOM);
  const [selectedSystem, setSelectedSystem] = useState('all');
  const [additionalContext, setAdditionalContext] = useState('');
  const [showContextDialog, setShowContextDialog] = useState(false);
  const [uploadedImages, setUploadedImages] = useState([]);

  // Case management - CONSOLIDATED
  const [currentCase, setCurrentCase] = useState(null);
  const [preSelectedCase, setPreSelectedCase] = useState(null);
  const [selectedCase, setSelectedCase] = useState(null);
  const [currentCaseData, setCurrentCaseData] = useState(null);
  const [caseStartTime, setCaseStartTime] = useState(null);
  const [completedCases, setCompletedCases] = useState([]);
  const [isLoadingCase, setIsLoadingCase] = useState(false);
  const [caseCompleted, setCaseCompleted] = useState(false);

  // Scoring and progress
  const [currentScore, setCurrentScore] = useState(null);
  const [sessionScores, setSessionScores] = useState([]);
  const [caseSubsectionScores, setCaseSubsectionScores] = useState({});
  const [userResponses, setUserResponses] = useState([]);
  const [questionsAnswered, setQuestionsAnswered] = useState([]);

  // UI state
  const [userProfile, setUserProfile] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [weakTopics, setWeakTopics] = useState([]);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [showCaseDropdown, setShowCaseDropdown] = useState(false);
  const [showCaseSelector, setShowCaseSelector] = useState(false);

  // Refs
  const peerConnection = useRef(null);
  const audioElement = useRef(null);
  const fileInputRef = useRef(null);

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
      // Check if we have a pre-selected case and need to load it
      if (preSelectedCase && preSelectedCase.caseNumber && !preSelectedCase.content) {
        // Load the case content first before configuring
        fetch(`/api/case-protocol/${preSelectedCase.caseNumber}`)
          .then(response => response.json())
          .then(data => {
            if (!data.error) {
              preSelectedCase.content = data.content;
              configureSessionWithCase();
            } else {
              // If loading fails, configure without case
              configureSessionWithCase();
            }
          })
          .catch(() => {
            // If loading fails, configure without case
            configureSessionWithCase();
          });
        return;
      }

      // If no case to load or case already loaded, configure immediately
      configureSessionWithCase();
    }
  }

  function configureSessionWithCase() {
    if (!dataChannel || !isSessionActive || sessionConfigured) return;

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

    // Add case-specific instructions if a case is pre-selected
    let caseInstructions = '';
    if (preSelectedCase && preSelectedCase.content) {
      caseInstructions = `

SPECIFIC CASE SELECTED:
Case Protocol ${preSelectedCase.caseNumber}: ${preSelectedCase.title} (${preSelectedCase.category})

${preSelectedCase.content}

Begin by presenting this specific clinical scenario and guide the student through this case.`;
    }

      const medicalInstructions = `${systemPromptData.system_prompt}

Current Mode: ${examMode}
Selected System: ${selectedSystem}

CRITICAL EXAMINER BEHAVIOR:
1. You are the EXAMINER. Stay in this role at all times.
2. Only provide case questions, assessments, and feedback related to the medical examination.
3. DO NOT engage in casual conversation or off-topic discussions.
4. If the student asks non-medical questions or tries to change topics, briefly redirect them:
   "Let's focus on the medical case at hand."
5. Only deviate from examiner role if EXPLICITLY asked "Can I ask you a question about..." or similar clear requests for help.

IMPORTANT EDUCATIONAL TECHNIQUE:
When the student asks for the answer directly, you should FIRST respond with:
"Are you sure you want the answer? It would be more beneficial to work through this step by step."

Only provide the answer if they confirm they want it after your pushback. This encourages active learning and critical thinking.

${contextSection}
${modeInstructions}
${caseInstructions}

${preSelectedCase ? 'Start with the pre-selected case above.' : 'Begin immediately with a relevant case or question. No introductions needed.'}`;

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

    // If we have a pre-selected case, set it as current
    if (preSelectedCase) {
      setCurrentCaseData(preSelectedCase);
      setSelectedCase(preSelectedCase.id);
      setCaseStartTime(Date.now());
      setCaseCompleted(false);
      setCaseSubsectionScores({});
      setUserResponses([]);
      setQuestionsAnswered([]);

      // Let the AI know to start with this case
      setTimeout(() => {
        sendClientEvent({ type: "response.create" });
      }, 500);
    } else {
    // Start immediately with a case based on mode
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
          'Authorization': `Bearer ${localStorage.getItem('token')}`
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
    // If session is active, send the context immediately
    if (dataChannel && isSessionActive) {
      let contextMessage = `Additional context: ${additionalContext}`;
      if (uploadedImages.length > 0) {
        contextMessage += ` ${uploadedImages.length} image(s) provided.`;
      }
      sendTextMessage(contextMessage);
    }
    // If session is not active, just save the context for later use
    // The context will be included when the session starts via configureSession()
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
    setIsGeneratingReport(true);

    // Auto-generate PDF report if there are completed cases or sufficient session data
    if (completedCases.length > 0 || events.length > 20) {
      await generateAndDownloadReport();
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
    setPreSelectedCase(null); // Reset pre-selected case
    peerConnection.current = null;
    setIsGeneratingReport(false);
  }

  // Send a message to the model
  function sendClientEvent(message) {
    if (dataChannel) {
      // Intercept user messages to check for case requests
      if (message.type === "conversation.item.create" &&
        message.item?.role === "user") {
        const userText = message.item?.content?.[0]?.text ||
          message.item?.content?.[0]?.transcript || '';
        if (userText && detectCaseRequest(userText)) {
          console.log('Intercepted case request:', userText);
          return; // Don't send to AI, case request handled
        }
      }

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
  function sendTextMessage(message, skipCaseDetection = false) {
    // Check if message is requesting a specific case
    if (!skipCaseDetection && detectCaseRequest(message)) {
      return; // Case request handled, don't send as regular message
    }

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

  // Generate and download PDF report
  async function generateAndDownloadReport() {
    setIsGeneratingReport(true);
    try {
      // If no completed cases but session is active, create session summary
      const casesForReport = completedCases.length > 0 ? completedCases :
        currentCaseData ? [{
          id: currentCaseData.id || 'current-case',
          title: currentCaseData.title || 'Current Case',
          score: currentScore || 0,
          subsections: Object.entries(caseSubsectionScores).map(([key, data]) => ({
            name: key,
            score: data.score,
            feedback: data.feedback
          })),
          duration: caseStartTime ? `${Math.round((Date.now() - caseStartTime) / 60000)}m` : 'N/A',
          feedback: 'Session in progress'
        }] : [];

      // Include current session transcript
      const transcript = events
        .filter(e => {
          // Include conversation items
          if (e.type === 'conversation.item.created' &&
            (e.item?.role === 'user' || e.item?.role === 'assistant')) {
            return true;
          }
          // Include transcription events
          if (e.type === 'conversation.item.input_audio_transcription.completed' && e.transcript) {
            return true;
          }
          // Include response events with transcripts
          if (e.type === 'response.done' && e.response?.output?.[0]?.content) {
            return true;
          }
          return false;
        })
        .map(e => {
          // Extract text from conversation items
          if (e.type === 'conversation.item.created') {
            const content = e.item?.content?.[0];
            const text = content?.text || content?.transcript || '';
            const role = e.item?.role || 'unknown';
            return text ? `${role}: ${text}` : '';
          }
          // Extract from transcription events
          if (e.type === 'conversation.item.input_audio_transcription.completed' && e.transcript) {
            return `user: ${e.transcript}`;
          }
          // Extract from response events
          if (e.type === 'response.done' && e.response?.output?.[0]?.content) {
            const content = e.response.output[0].content;
            const text = content.text || content.transcript || '';
            return text ? `assistant: ${text}` : '';
          }
          return '';
        })
        .filter(Boolean)
        .reverse()  // Since events are newest-first, reverse to get chronological order
        .join('\n\n');

      const sessionData = formatSessionDataForReport(
        sessionScores.length > 0 ? sessionScores : [{ score: currentScore || 0, topic: selectedSystem }],
        casesForReport,
        userProfile
      );

      // Add transcript to sessionData
      sessionData.transcript = transcript;

      const response = await fetch('/api/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          sessionData,
          studentName: userProfile?.name || 'Student',
          sessionDate: new Date().toISOString(),
          transcript: transcript.substring(0, 10000) // Limit transcript length
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
    } finally {
      setIsGeneratingReport(false);
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

  // Detect and handle case requests in messages
  function detectCaseRequest(message) {
    // Pattern to match various ways of requesting a case
    const patterns = [
      /(?:i\s*want\s*to\s*)?(?:solve|do|start|work\s*on)?\s*case\s*(?:protocol\s*)?(?:number\s*)?(\d+)/i,
      /(?:the\s*)?(\d+)(?:st|nd|rd|th)?\s*case\s*(?:from\s*the\s*book)?/i,
      /case\s*(\d+)/i,
      /protocol\s*(\d+)/i
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        const caseNumber = parseInt(match[1]);

        // Validate case number
        if (caseNumber < 1 || caseNumber > 45) {
          if (dataChannel && isSessionActive) {
            sendTextMessage(`Case protocol ${caseNumber} is not available. Please choose a case between 1 and 45.`, true);
          }
          return true;
        }

        // Load the case protocol
        setIsLoadingCase(true);
        fetch(`/api/case-protocol/${caseNumber}`)
          .then(response => response.json())
          .then(data => {
            if (data.error) {
              throw new Error(data.error);
            }

            const caseData = {
              id: `case-protocol-${caseNumber}`,
              caseNumber: caseNumber,
              title: data.title,
              category: data.category,
              content: data.content,
              parsedQuestions: data.parsedQuestions || [],
              difficulty: 'standard' // Since case protocols don't specify difficulty
            };

            // If session is active, start the case immediately
            if (dataChannel && isSessionActive) {
              startCaseProtocolSession(caseNumber, caseData);
            } else {
              // If session not active, pre-select the case
              setPreSelectedCase(caseData);
              alert(`Case Protocol ${caseNumber} selected. Start the session to begin.`);
            }
          })
          .catch(error => {
            console.error('Error loading case protocol:', error);
            if (dataChannel && isSessionActive) {
              sendTextMessage(`Sorry, I couldn't load case protocol ${caseNumber}. Please try another case.`, true);
            }
          })
          .finally(() => {
            setIsLoadingCase(false);
          });

        return true;
      }
    }

    return false;
  }

  // New function to start a case protocol session
  const startCaseProtocolSession = useCallback((caseNumber, caseData) => {
    if (!dataChannel || !isSessionActive) return;

    // Set current case data
    setCurrentCaseData(caseData);
    setCaseStartTime(Date.now());
    setCaseCompleted(false);
    setCaseSubsectionScores({});
    setUserResponses([]);
    setQuestionsAnswered([]);

    // Send the case content to the AI
    const caseInstruction = {
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{
          type: "text",
          text: `You are now examining the student on Case Protocol ${caseNumber}: ${caseData.title} (${caseData.category}). Here is the case:\n\n${caseData.content}\n\nBegin by presenting the clinical scenario and guide the student through this case.`
        }]
      }
    };

    sendClientEvent(caseInstruction);
    sendClientEvent({ type: "response.create" });

    setSelectedCase(`case-protocol-${caseNumber}`);
    setShowCaseSelector(false);
  }, [dataChannel, isSessionActive]);

  // Attach event listeners to the data channel when a new one is created
  useEffect(() => {
    if (dataChannel) {
      // Append new server events to the list
      dataChannel.addEventListener("message", (e) => {
        const event = JSON.parse(e.data);
        if (!event.timestamp) {
          event.timestamp = new Date().toLocaleTimeString();
        }

        // Intercept voice transcripts BEFORE they become conversation items
        if (event.type === 'input_audio_buffer.speech_started' ||
          event.type === 'input_audio_buffer.speech_stopped' ||
          event.type === 'conversation.item.input_audio_transcription.completed') {

          // Get the transcript from various event types
          let transcript = '';
          if (event.transcript) {
            transcript = event.transcript;
          } else if (event.item?.content?.[0]?.transcript) {
            transcript = event.item.content[0].transcript;
          }

          if (transcript && detectCaseRequest(transcript)) {
            console.log('Voice case request detected:', transcript);
            // Don't cancel the response - let the AI finish speaking
            // The case will be loaded after the AI finishes
            return; // Don't process this event further
          }
        }

        setEvents((prev) => [event, ...prev]);

        // Track user responses from multiple event types
        let userText = '';

        // Check conversation.item.created events
        if (event.type === 'conversation.item.created' && event.item?.role === 'user') {
          userText = event.item?.content?.[0]?.text || event.item?.content?.[0]?.transcript || '';
        }

        // Check input audio transcription events
        if (event.type === 'conversation.item.input_audio_transcription.completed' && event.transcript) {
          userText = event.transcript;
        }

        // Check for other transcript events
        if (event.type === 'input_audio_buffer.speech_stopped' && event.transcript) {
          userText = event.transcript;
        }

        // Add any captured user text to responses
        if (userText && userText.trim()) {
          setUserResponses(prev => [...prev, userText]);
          console.log('User response captured:', userText.substring(0, 50) + '...');
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

    sendClientEvent(caseInstruction);
    sendClientEvent({ type: "response.create" });

    setSelectedCase(caseId);
    setShowCaseSelector(false);
  }, [dataChannel, isSessionActive]);

  return (
    <AuthWrapper>
      <div className="flex h-screen bg-gray-100">
        {/* Main content area */}
        <main className="flex-1 flex flex-col">
          {/* Audio element for playing AI responses */}
          <audio ref={audioElement} autoPlay />

          {/* Event log */}
          <section className="flex-1 overflow-y-auto p-4">
            {/* Live Score Tracker */}
            {isSessionActive && (
              <LiveScoreTracker
                currentCase={currentCaseData}
                events={events}
                isActive={isSessionActive}
                onSubsectionComplete={handleSubsectionComplete}
              />
            )}

            {/* Connection status */}
            <div className="mb-4">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${isSessionActive
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
                }`}>
                <div className={`w-2 h-2 rounded-full mr-2 ${isSessionActive ? 'bg-green-600' : 'bg-red-600'
                  }`} />
                {isSessionActive ? 'Connected' : 'Disconnected'}
              </div>
            </div>

            {/* Events display */}
            <div className="space-y-4">
              {events.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  <p>No conversation yet. Start a session to begin.</p>
                </div>
              )}

              {events.map((event, index) => (
                <EventDisplay key={`${event.event_id}-${index}`} event={event} />
              ))}
            </div>
          </section>
        </main>

        {/* Right sidebar */}
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

          {/* Case Pre-selection */}
          {!isSessionActive && (
            <div className="mb-4">
              <h3 className="font-semibold mb-2">Select Case (Optional)</h3>
              <select
                className="w-full p-2 border rounded"
                value={preSelectedCase?.caseNumber || ''}
                onChange={(e) => {
                  if (e.target.value) {
                    const caseNumber = parseInt(e.target.value);
                    // Load case protocol data
                    fetch(`/api/case-protocol/${caseNumber}`)
                      .then(response => response.json())
                      .then(data => {
                        if (!data.error) {
                          setPreSelectedCase({
                            id: `case-protocol-${caseNumber}`,
                            caseNumber: caseNumber,
                            title: data.title,
                            category: data.category,
                            content: data.content,
                            parsedQuestions: data.parsedQuestions || [],
                            difficulty: 'standard'
                          });
                        }
                      })
                      .catch(error => {
                        console.error('Error loading case protocol:', error);
                      });
                  } else {
                    setPreSelectedCase(null);
                  }
                }}
              >
                <option value="">No specific case (use mode selection)</option>
                {Array.from({ length: 45 }, (_, i) => i + 1).map(num => {
                  const title = casesReference.case_titles[num] || `Case Protocol ${num}`;
                  // Find category
                  let category = '';
                  for (const [system, cases] of Object.entries(casesReference.cases_by_system)) {
                    if (cases.includes(String(num))) {
                      category = system.charAt(0).toUpperCase() + system.slice(1);
                      break;
                    }
                  }

                  return (
                    <option key={num} value={num}>
                      {num} - {category} {title.length > 40 ? title.substring(0, 40) + '...' : title}
                    </option>
                  );
                })}
              </select>
              {preSelectedCase && (
                <p className="text-sm text-gray-600 mt-2">
                  Will start with: Case Protocol {preSelectedCase.caseNumber} ({preSelectedCase.category})
                </p>
              )}
            </div>
          )}

          <div className="mb-4 space-y-2">
            {!isSessionActive && (
              <button
                className="w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={startSession}
              >
                Start Session
              </button>
            )}

            {isSessionActive && (
              <button
                className="w-full p-2 bg-red-600 text-white rounded hover:bg-red-700"
                onClick={stopSession}
              >
                End Session
              </button>
            )}

            <button
              className="w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              onClick={() => setShowContextDialog(true)}
              disabled={isSessionActive}
            >
              Add Context
            </button>

            {isSessionActive && (
              <button
                className="w-full p-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                onClick={() => setShowCaseSelector(true)}
              >
                Select Case
              </button>
            )}

            {(completedCases.length > 0 || (isSessionActive && events.length > 10)) && (
              <button
                className="w-full p-2 bg-green-600 text-white rounded hover:bg-green-700"
                onClick={generateAndDownloadReport}
              >
                Download PDF Report {completedCases.length > 0 ? `(${completedCases.length} cases)` : '(Current Session)'}
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

        {/* Additional Context Dialog */}
        {showContextDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">
                {isSessionActive ? 'View Context (Read-only)' : 'Add Additional Context'}
              </h2>
              {!isSessionActive && (
                <p className="text-sm text-gray-600 mb-4">
                  Add context before starting the session. It will be included in the AI's instructions.
                </p>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Text Context:
                  {isSessionActive && <span className="text-xs text-gray-500 ml-2">(Read-only during session)</span>}
                </label>
                <textarea
                  className={`w-full h-40 p-3 border rounded-lg ${isSessionActive ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  placeholder="Paste your notes or specific topics..."
                  value={additionalContext}
                  onChange={(e) => !isSessionActive && setAdditionalContext(e.target.value)}
                  disabled={isSessionActive}
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Upload Images:
                  {isSessionActive && <span className="text-xs text-gray-500 ml-2">(Disabled during session)</span>}
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className={`mb-2 ${isSessionActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={isSessionActive}
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
                          {!isSessionActive && (
                            <button
                              className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                              onClick={() => setUploadedImages(prev => prev.filter((_, i) => i !== idx))}
                            >
                              ×
                            </button>
                          )}
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {Array.from({ length: 45 }, (_, i) => i + 1).map(num => {
                  const title = casesReference.case_titles[num] || `Case Protocol ${num}`;
                  let category = 'Unknown';
                  for (const [system, cases] of Object.entries(casesReference.cases_by_system)) {
                    if (cases.includes(String(num))) {
                      category = system.charAt(0).toUpperCase() + system.slice(1);
                      break;
                    }
                  }

                  return (
                    <button
                      key={num}
                      className="text-left p-3 hover:bg-gray-100 rounded border transition-colors"
                      onClick={() => {
                        setIsLoadingCase(true);
                        // Load and start the case protocol
                        fetch(`/api/case-protocol/${num}`)
                          .then(response => response.json())
                          .then(data => {
                            if (!data.error) {
                              const caseData = {
                                id: `case-protocol-${num}`,
                                caseNumber: num,
                                title: data.title,
                                category: data.category,
                                content: data.content,
                                difficulty: 'standard'
                              };
                              startCaseProtocolSession(num, caseData);
                            }
                          })
                          .catch(error => {
                            console.error('Error loading case protocol:', error);
                            alert(`Failed to load case protocol ${num}`);
                          })
                          .finally(() => {
                            setIsLoadingCase(false);
                          });
                      }}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">Case {num}</span>
                        <span className="text-xs text-gray-500">{category}</span>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {title}
                        </p>
                      </div>
                    </button>
                  );
                })}
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

        {/* Loading Case Indicator */}
        {isLoadingCase && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-lg font-semibold">Loading Case Protocol...</p>
              <p className="text-sm text-gray-600 mt-2">Please wait while we prepare the case</p>
            </div>
          </div>
        )}

        {/* Report Generation Loading */}
        {isGeneratingReport && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-lg font-semibold">Grading Responses...</p>
              <p className="text-sm text-gray-600 mt-2">Generating your performance report</p>
            </div>
          </div>
        )}
      </div>
    </AuthWrapper>
  );
}
