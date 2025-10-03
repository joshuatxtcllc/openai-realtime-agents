import { useCallback, useRef, useState } from 'react';
import { SessionStatus } from '../types';
import { useEvent } from '../contexts/EventContext';
import { useTranscript } from '../contexts/TranscriptContext';
import { RealtimeAgent } from '@openai/agents/realtime';
import { useHandleSessionHistory } from './useHandleSessionHistory';

export interface RealtimeSessionCallbacks {
  onConnectionChange?: (status: SessionStatus) => void;
  onAgentHandoff?: (agentName: string) => void;
}

export interface ConnectOptions {
  getEphemeralKey: () => Promise<string>;
  audioElement?: HTMLAudioElement;
  agents: RealtimeAgent[];
  initialAgentName?: string;
  extraContext?: Record<string, any>;
}

export function useRealtimeSession(callbacks: RealtimeSessionCallbacks = {}) {
  const agentManagerRef = useRef<any>(null);
  const [status, setStatus] = useState<SessionStatus>('DISCONNECTED');
  const [currentAgentName, setCurrentAgentName] = useState<string>('');
  
  const { logClientEvent, logServerEvent } = useEvent();
  const { addTranscriptMessage, updateTranscriptMessage, updateTranscriptItem, addTranscriptBreadcrumb } = useTranscript();
  
  const handlersRef = useHandleSessionHistory();

  const updateStatus = useCallback(
    (s: SessionStatus) => {
      setStatus(s);
      callbacks.onConnectionChange?.(s);
      logClientEvent({ type: 'status_change', status: s });
    },
    [callbacks, logClientEvent],
  );

  const connect = useCallback(
    async ({ getEphemeralKey, audioElement, agents, initialAgentName }: ConnectOptions) => {
      if (agentManagerRef.current) {
        console.log('Already connected or connecting');
        return;
      }

      updateStatus('CONNECTING');
      console.log('Starting connection process...');

      try {
        const ephemeralKey = await getEphemeralKey();
        console.log('Got ephemeral key:', ephemeralKey ? 'SUCCESS' : 'FAILED');
        
        if (!ephemeralKey) {
          throw new Error('No ephemeral key received');
        }

        // Import AgentManager dynamically to avoid SSR issues
        const { AgentManager } = await import('@openai/agents/realtime');
        
        // Create AgentManager with the provided agents
        const agentManager = new AgentManager({
          agents,
          apiKey: ephemeralKey,
          dangerouslyAllowAPIKeyInBrowser: true,
        });

        agentManagerRef.current = agentManager;

        // Set up event handlers
        agentManager.on('connect', () => {
          console.log('AgentManager connected');
          updateStatus('CONNECTED');
        });

        agentManager.on('disconnect', () => {
          console.log('AgentManager disconnected');
          updateStatus('DISCONNECTED');
          agentManagerRef.current = null;
        });

        agentManager.on('error', (error: any) => {
          console.error('AgentManager error:', error);
          logServerEvent({ type: 'error', error: error.toString() });
          updateStatus('DISCONNECTED');
          agentManagerRef.current = null;
        });

        // Set up session history handlers
        const handlers = handlersRef.current;
        
        agentManager.on('agent.tool.start', handlers.handleAgentToolStart);
        agentManager.on('agent.tool.end', handlers.handleAgentToolEnd);
        agentManager.on('history.added', handlers.handleHistoryAdded);
        agentManager.on('history.updated', handlers.handleHistoryUpdated);
        agentManager.on('transcription.delta', handlers.handleTranscriptionDelta);
        agentManager.on('transcription.completed', handlers.handleTranscriptionCompleted);
        agentManager.on('guardrail.tripped', handlers.handleGuardrailTripped);

        // Handle agent handoffs
        agentManager.on('agent.handoff', (agentName: string) => {
          console.log('Agent handoff to:', agentName);
          setCurrentAgentName(agentName);
          callbacks.onAgentHandoff?.(agentName);
          addTranscriptBreadcrumb(`Agent handoff to: ${agentName}`);
        });

        // Connect with initial agent
        const initialAgent = initialAgentName 
          ? agents.find(a => a.name === initialAgentName) || agents[0]
          : agents[0];
          
        if (initialAgent) {
          setCurrentAgentName(initialAgent.name);
          await agentManager.connect(initialAgent.name);
        } else {
          throw new Error('No agents provided');
        }

      } catch (err) {
        console.error('Connection error:', err);
        updateStatus('DISCONNECTED');
        if (agentManagerRef.current) {
          agentManagerRef.current.disconnect();
          agentManagerRef.current = null;
        }
      }
    },
    [updateStatus, logServerEvent, logClientEvent, addTranscriptBreadcrumb, callbacks, handlersRef],
  );

  const disconnect = useCallback(() => {
    console.log('Disconnecting...');
    if (agentManagerRef.current) {
      agentManagerRef.current.disconnect();
      agentManagerRef.current = null;
    }
    updateStatus('DISCONNECTED');
    setCurrentAgentName('');
  }, [updateStatus]);

  const sendUserText = useCallback((text: string) => {
    if (!agentManagerRef.current || status !== 'CONNECTED') {
      console.warn('AgentManager not ready');
      return;
    }
    
    const itemId = 'user_' + Date.now();
    
    // Add user message to transcript
    addTranscriptMessage(itemId, 'user', text, false);
    
    try {
      agentManagerRef.current.currentAgent?.conversation?.item?.create({
        id: itemId,
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }]
      });
      
      agentManagerRef.current.currentAgent?.response?.create();
      
      logClientEvent({ type: 'user_message_sent', text, itemId });
    } catch (err) {
      console.error('Failed to send user text:', err);
    }
  }, [status, logClientEvent, addTranscriptMessage]);

  const sendEvent = useCallback((ev: any) => {
    if (!agentManagerRef.current || status !== 'CONNECTED') {
      console.warn('AgentManager not ready for event:', ev.type);
      return;
    }
    
    try {
      agentManagerRef.current.currentAgent?.send(ev);
      logClientEvent(ev);
    } catch (err) {
      console.error('Failed to send event:', err);
    }
  }, [status, logClientEvent]);

  const mute = useCallback((m: boolean) => {
    console.log('Mute:', m);
    if (agentManagerRef.current) {
      try {
        agentManagerRef.current.currentAgent?.mute(m);
      } catch (err) {
        console.warn('Failed to mute:', err);
      }
    }
  }, []);

  const interrupt = useCallback(() => {
    if (agentManagerRef.current && status === 'CONNECTED') {
      try {
        agentManagerRef.current.currentAgent?.response?.cancel();
        logClientEvent({ type: 'response_interrupted' });
      } catch (err) {
        console.warn('Failed to interrupt:', err);
      }
    }
  }, [status, logClientEvent]);

  const switchAgent = useCallback((agentName: string) => {
    if (!agentManagerRef.current || status !== 'CONNECTED') {
      console.warn('Cannot switch agent - not connected');
      return;
    }
    
    try {
      agentManagerRef.current.switchAgent(agentName);
      setCurrentAgentName(agentName);
      addTranscriptBreadcrumb(`Switched to agent: ${agentName}`);
      callbacks.onAgentHandoff?.(agentName);
    } catch (err) {
      console.error('Failed to switch agent:', err);
    }
  }, [status, addTranscriptBreadcrumb, callbacks]);

  return {
    status,
    currentAgentName,
    connect,
    disconnect,
    sendUserText,
    sendEvent,
    mute,
    interrupt,
    switchAgent,
  } as const;
}