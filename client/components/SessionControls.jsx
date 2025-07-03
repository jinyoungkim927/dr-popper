import { useState } from "react";
import { CloudLightning, CloudOff, MessageSquare } from "react-feather";
import Button from "./Button";

function SessionStopped({ startSession }) {
  const [isActivating, setIsActivating] = useState(false);

  function handleStartSession() {
    if (isActivating) return;

    setIsActivating(true);
    startSession();
  }

  return (
    <div className="flex items-center justify-center w-full h-full">
      <Button
        onClick={handleStartSession}
        className={isActivating ? "bg-gray-600" : "bg-red-600"}
        icon={<CloudLightning height={16} />}
      >
        {isActivating ? "starting session..." : "start session"}
      </Button>
    </div>
  );
}

function SessionActive({ stopSession, sendTextMessage }) {
  const [message, setMessage] = useState("");

  function handleSendClientEvent() {
    sendTextMessage(message);
    setMessage("");
  }

  return (
    <div className="flex items-center justify-center w-full h-full gap-4">
      <input
        onKeyDown={(e) => {
          if (e.key === "Enter" && message.trim()) {
            handleSendClientEvent();
          }
        }}
        type="text"
        placeholder="send a text message..."
        className="border border-gray-200 rounded-full p-4 flex-1"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <Button
        onClick={() => {
          if (message.trim()) {
            handleSendClientEvent();
          }
        }}
        icon={<MessageSquare height={16} />}
        className="bg-blue-400"
      >
        send text
      </Button>
      <Button onClick={stopSession} icon={<CloudOff height={16} />}>
        disconnect
      </Button>
    </div>
  );
}

export default function SessionControls({
  startSession,
  stopSession,
  sendClientEvent,
  sendTextMessage,
  serverEvents,
  isSessionActive,
  onShowCaseSelector,
  onQuickCaseSelect,
  selectedCase,
  caseTitles,
  examMode,
  onExamModeChange,
  selectedSystem,
  onSystemChange,
  medicalSystems,
  medicalCases,
}) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Session Controls</h2>
          {!isSessionActive ? (
            <button
              onClick={startSession}
              className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              Start Session
            </button>
          ) : (
            <button
              onClick={stopSession}
              className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              End Session
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Exam Mode
            </label>
            <select
              value={examMode}
              onChange={(e) => onExamModeChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSessionActive}
            >
              <option value="random">Random Questions</option>
              <option value="viva">Viva</option>
              <option value="revise">Revise</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Medical System
            </label>
            <select
              value={selectedSystem}
              onChange={(e) => onSystemChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSessionActive}
            >
              {medicalSystems.map((system) => (
                <option key={system.value} value={system.value}>
                  {system.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2 items-center flex-wrap">
          <button
            onClick={onShowCaseSelector}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            disabled={!isSessionActive}
          >
            Select Medical Case
          </button>

          {/* Quick case selector dropdown */}
          {caseTitles && (
            <select
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={!isSessionActive}
              onChange={(e) => {
                if (e.target.value) {
                  const caseNumber = parseInt(e.target.value);
                  // Trigger case protocol loading via voice command handler
                  sendTextMessage(`I want to solve case protocol ${caseNumber}`);
                }
              }}
              value=""
            >
              <option value="">Quick Select Case...</option>
              {Array.from({ length: 45 }, (_, i) => i + 1).map(num => {
                const title = caseTitles[num] || `Case Protocol ${num}`;
                return (
                  <option key={num} value={num}>
                    Case {num} - {title.length > 40 ? title.substring(0, 40) + '...' : title}
                  </option>
                );
              })}
            </select>
          )}

          {selectedCase && (
            <div className="px-4 py-2 bg-gray-200 rounded">
              Current: {selectedCase}
            </div>
          )}
        </div>

        {isSessionActive ? (
          <SessionActive
            stopSession={stopSession}
            sendClientEvent={sendClientEvent}
            sendTextMessage={sendTextMessage}
            serverEvents={serverEvents}
          />
        ) : (
          <SessionStopped startSession={startSession} />
        )}
      </div>
    </div>
  );
}
