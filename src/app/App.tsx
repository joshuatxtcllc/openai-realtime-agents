"use client";
import React, { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import Image from "next/image";

// UI components
import Transcript from "./components/Transcript";
import Events from "./components/Events";
import BottomToolbar from "./components/BottomToolbar";

// Types
import { SessionStatus } from "@/app/types";

// Context providers & hooks
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { useEvent } from "@/app/contexts/EventContext";
import { useRealtimeSession } from "./hooks/useRealtimeSession";
import useAudioDownload from "./hooks/useAudioDownload";

// Agent configurations
import { allAgentSets, defaultAgentSetKey } from "./agentConfigs";
import { createModerationGuardrail } from "./agentConfigs/guardrails";
import { chatSupervisorCompanyName } from "./agentConfigs/chatSupervisor";
import { customerServiceRetailCompanyName } from "./agentConfigs/customerServiceRetail";

function App() {
  const searchParams = useSearchParams()!;
  const agentConfigParam = searchParams.get("agentConfig") || defaultAgentSetKey;

  const { addTranscriptBreadcrumb } = useTranscript();
  const { logClientEvent } = useEvent();

  // Agent configuration state
  const [selectedAgentSetKey, setSelectedAgentSetKey] = useState<string>(agentConfigParam);
  const [selectedAgentName, setSelectedAgentName] = useState<string>("");
  
  // Get current agent set
  const currentAgentSet = allAgentSets[selectedAgentSetKey] || allAgentSets[defaultAgentSetKey];
  
  // Set up guardrails based on agent set
  useEffect(() => {
    if (currentAgentSet && currentAgentSet.length > 0) {
      const companyName = selectedAgentSetKey === 'chatSupervisor' 
        ? chatSupervisorCompanyName 
        : selectedAgentSetKey === 'customerServiceRetail'
        ? customerServiceRetailCompanyName
        : 'Default Company';
        
      const guardrail = createModerationGuardrail(companyName);
      
      // Add guardrail to all agents in the set
      currentAgentSet.forEach(agent => {
        if (agent.guardrails && !agent.guardrails.some(g => g.name === guardrail.name)) {
          agent.guardrails.push(guardrail);
        }
      });
      
      // Set initial agent name
      if (!selectedAgentName && currentAgentSet[0]) {
        setSelectedAgentName(currentAgentSet[0].name);
      }
    }
  }, [selectedAgentSetKey, currentAgentSet, selectedAgentName]);

  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const sdkAudioElement = React.useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    const el = document.createElement('audio');
    el.autoplay = true;
    el.style.display = 'none';
    document.body.appendChild(el);
    return el;
  }, []);

  // Attach SDK audio element once it exists (after first render in browser)
  useEffect(() => {
    if (sdkAudioElement && !audioElementRef.current) {
      audioElementRef.current = sdkAudioElement;
    }
  }, [sdkAudioElement]);

  const {
    status,
    currentAgentName,
    connect,
    disconnect,
    sendUserText,
    sendEvent,
    interrupt,
    mute,
    switchAgent,
  } = useRealtimeSession({
    onConnectionChange: (s) => {
      console.log('Session status changed to:', s);
    },
    onAgentHandoff: (agentName: string) => {
      setSelectedAgentName(agentName);
    },
  });

  const [isEventsPaneExpanded, setIsEventsPaneExpanded] = useState<boolean>(true);
  const [userText, setUserText] = useState<string>("");
  const [isPTTActive, setIsPTTActive] = useState<boolean>(false);
  const [isPTTUserSpeaking, setIsPTTUserSpeaking] = useState<boolean>(false);
  const [isAudioPlaybackEnabled, setIsAudioPlaybackEnabled] = useState<boolean>(
    () => {
      if (typeof window === 'undefined') return true;
      const stored = localStorage.getItem('audioPlaybackEnabled');
      return stored ? stored === 'true' : true;
    },
  );

  // Initialize the recording hook.
  const { startRecording, stopRecording, downloadRecording } = useAudioDownload();

  const sendClientEvent = (eventObj: any, eventNameSuffix = "") => {
    try {
      sendEvent(eventObj);
      logClientEvent(eventObj, eventNameSuffix);
    } catch (err) {
      console.error('Failed to send via SDK', err);
    }
  };

  const fetchEphemeralKey = async (): Promise<string | null> => {
    logClientEvent({ url: "/session" }, "fetch_session_token_request");
    console.log('Fetching ephemeral key...');
    
    try {
      const tokenResponse = await fetch("/api/session");
      const data = await tokenResponse.json();

      if (!tokenResponse.ok) {
        console.error("Server error:", data.error);
        alert(`Connection failed: ${data.error}\n\nDetails: ${data.details || 'Unknown error'}`);
        return null;
      }

      if (!data.client_secret?.value) {
        console.error("No ephemeral key provided by the server");
        alert("No ephemeral key received from server. Please check your OpenAI API key configuration.");
        return null;
      }

      console.log('Got ephemeral key successfully');
      return data.client_secret.value;
    } catch (error: any) {
      console.error("Network error fetching ephemeral key:", error);
      alert(`Network error: ${error.message}\n\nPlease check your internet connection and try again.`);
      return null;
    }
  };

  const connectToRealtime = async () => {
    if (status !== "DISCONNECTED") return;

    console.log('Starting connection to realtime...');
    try {
      await connect({
        getEphemeralKey: fetchEphemeralKey,
        audioElement: sdkAudioElement,
        agents: currentAgentSet,
        initialAgentName: selectedAgentName || currentAgentSet[0]?.name,
      });
    } catch (err) {
      console.error("Error connecting:", err);
    }
  };

  const disconnectFromRealtime = () => {
    console.log('Disconnecting from realtime...');
    disconnect();
    setIsPTTUserSpeaking(false);
  };

  const handleSendTextMessage = () => {
    if (!userText.trim()) return;
    interrupt();

    try {
      sendUserText(userText.trim());
    } catch (err) {
      console.error('Failed to send via SDK', err);
    }

    setUserText("");
  };

  const handleTalkButtonDown = () => {
    if (status !== 'CONNECTED') return;
    interrupt();

    setIsPTTUserSpeaking(true);
    sendClientEvent({ type: 'input_audio_buffer.clear' }, 'clear PTT buffer');
  };

  const handleTalkButtonUp = () => {
    if (status !== 'CONNECTED' || !isPTTUserSpeaking) return;

    setIsPTTUserSpeaking(false);
    sendClientEvent({ type: 'input_audio_buffer.commit' }, 'commit PTT');
    sendClientEvent({ type: 'response.create' }, 'trigger response PTT');
  };

  const onToggleConnection = () => {
    if (status === "CONNECTED" || status === "CONNECTING") {
      disconnectFromRealtime();
    } else {
      connectToRealtime();
    }
  };

  const handleAgentSetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newAgentSetKey = e.target.value;
    setSelectedAgentSetKey(newAgentSetKey);
    
    // Update URL
    const url = new URL(window.location.href);
    url.searchParams.set('agentConfig', newAgentSetKey);
    window.history.pushState({}, '', url.toString());
    
    // Disconnect if connected
    if (status === 'CONNECTED') {
      disconnectFromRealtime();
    }
    
    // Reset selected agent
    const newAgentSet = allAgentSets[newAgentSetKey];
    if (newAgentSet && newAgentSet.length > 0) {
      setSelectedAgentName(newAgentSet[0].name);
    }
    
    addTranscriptBreadcrumb(`Switched to agent set: ${newAgentSetKey}`);
  };

  const handleSelectedAgentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newAgentName = e.target.value;
    setSelectedAgentName(newAgentName);
    
    if (status === 'CONNECTED') {
      switchAgent(newAgentName);
    }
  };

  // Get available agents for the current set
  const availableAgents = currentAgentSet || [];
  const currentAgent = availableAgents.find(a => a.name === (currentAgentName || selectedAgentName));

  useEffect(() => {
    const storedPushToTalkUI = localStorage.getItem("pushToTalkUI");
    if (storedPushToTalkUI) {
      setIsPTTActive(storedPushToTalkUI === "true");
    }
    const storedLogsExpanded = localStorage.getItem("logsExpanded");
    if (storedLogsExpanded) {
      setIsEventsPaneExpanded(storedLogsExpanded === "true");
    }
    const storedAudioPlaybackEnabled = localStorage.getItem("audioPlaybackEnabled");
    if (storedAudioPlaybackEnabled) {
      setIsAudioPlaybackEnabled(storedAudioPlaybackEnabled === "true");
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("pushToTalkUI", isPTTActive.toString());
  }, [isPTTActive]);

  useEffect(() => {
    localStorage.setItem("logsExpanded", isEventsPaneExpanded.toString());
  }, [isEventsPaneExpanded]);

  useEffect(() => {
    localStorage.setItem("audioPlaybackEnabled", isAudioPlaybackEnabled.toString());
  }, [isAudioPlaybackEnabled]);

  useEffect(() => {
    if (audioElementRef.current) {
      if (isAudioPlaybackEnabled) {
        audioElementRef.current.muted = false;
        audioElementRef.current.play().catch((err) => {
          console.warn("Autoplay may be blocked by browser:", err);
        });
      } else {
        audioElementRef.current.muted = true;
        audioElementRef.current.pause();
      }
    }

    try {
      mute(!isAudioPlaybackEnabled);
    } catch (err) {
      console.warn('Failed to toggle SDK mute', err);
    }
  }, [isAudioPlaybackEnabled, mute]);

  useEffect(() => {
    if (status === 'CONNECTED') {
      try {
        mute(!isAudioPlaybackEnabled);
      } catch (err) {
        console.warn('mute sync after connect failed', err);
      }
    }
  }, [status, isAudioPlaybackEnabled, mute]);

  useEffect(() => {
    if (status === "CONNECTED" && audioElementRef.current?.srcObject) {
      const remoteStream = audioElementRef.current.srcObject as MediaStream;
      startRecording(remoteStream);
    }

    return () => {
      stopRecording();
    };
  }, [status, startRecording, stopRecording]);

  return (
    <div className="text-base flex flex-col h-screen bg-gray-100 text-gray-800 relative">
      <div className="p-5 text-lg font-semibold flex justify-between items-center">
        <div
          className="flex items-center cursor-pointer"
          onClick={() => window.location.reload()}
        >
          <div>
            <Image
              src="/openai-logomark.svg"
              alt="OpenAI Logo"
              width={20}
              height={20}
              className="mr-2"
            />
          </div>
          <div>
            Jay's Frames <span className="text-gray-500">Custom Framing</span>
          </div>
        </div>
        <div className="flex items-center">
          <label className="flex items-center text-base gap-1 mr-2 font-medium">
            Scenario
          </label>
          <div className="relative inline-block">
            <select
              value={selectedAgentSetKey}
              onChange={handleAgentSetChange}
              className="appearance-none border border-gray-300 rounded-lg text-base px-2 py-1 pr-8 cursor-pointer font-normal focus:outline-none"
            >
              {Object.keys(allAgentSets).map(key => (
                <option key={key} value={key}>
                  {key === 'chatSupervisor' ? 'Chat Supervisor' :
                   key === 'customerServiceRetail' ? 'Customer Service' :
                   key === 'simpleHandoff' ? 'Simple Handoff' : key}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-600">
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M5.23 7.21a.75.75 0 011.06.02L10 10.44l3.71-3.21a.75.75 0 111.04 1.08l-4.25 3.65a.75.75 0 01-1.04 0L5.21 8.27a.75.75 0 01.02-1.06z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>

          <div className="flex items-center ml-6">
            <label className="flex items-center text-base gap-1 mr-2 font-medium">
              Agent
            </label>
            <div className="relative inline-block">
              <select
                value={currentAgentName || selectedAgentName}
                onChange={handleSelectedAgentChange}
                className="appearance-none border border-gray-300 rounded-lg text-base px-2 py-1 pr-8 cursor-pointer font-normal focus:outline-none"
                disabled={availableAgents.length <= 1}
              >
                {availableAgents.map(agent => (
                  <option key={agent.name} value={agent.name}>
                    {agent.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-600">
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 10.44l3.71-3.21a.75.75 0 111.04 1.08l-4.25 3.65a.75.75 0 01-1.04 0L5.21 8.27a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 gap-2 px-2 overflow-hidden relative">
        <Transcript
          userText={userText}
          setUserText={setUserText}
          onSendMessage={handleSendTextMessage}
          downloadRecording={downloadRecording}
          canSend={status === "CONNECTED"}
        />

        <Events isExpanded={isEventsPaneExpanded} />
      </div>

      <BottomToolbar
        sessionStatus={status}
        onToggleConnection={onToggleConnection}
        isPTTActive={isPTTActive}
        setIsPTTActive={setIsPTTActive}
        isPTTUserSpeaking={isPTTUserSpeaking}
        handleTalkButtonDown={handleTalkButtonDown}
        handleTalkButtonUp={handleTalkButtonUp}
        isEventsPaneExpanded={isEventsPaneExpanded}
        setIsEventsPaneExpanded={setIsEventsPaneExpanded}
        isAudioPlaybackEnabled={isAudioPlaybackEnabled}
        setIsAudioPlaybackEnabled={setIsAudioPlaybackEnabled}
        codec="pcm16"
        onCodecChange={() => {}}
      />
      
      {/* Status indicator */}
      {currentAgent && (
        <div className="absolute top-20 right-5 bg-white px-3 py-1 rounded-full shadow-sm text-sm">
          <span className="text-gray-600">Active:</span> <span className="font-medium">{currentAgent.name}</span>
          {currentAgent.handoffDescription && (
            <div className="text-xs text-gray-500 mt-1">{currentAgent.handoffDescription}</div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;