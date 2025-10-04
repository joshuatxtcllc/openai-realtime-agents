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
  getEphemeralKey: () => Promise<string | null>;
  audioElement?: HTMLAudioElement;
  agents: RealtimeAgent[];
  initialAgentName?: string;
  extraContext?: Record<string, any>;
}

export function useRealtimeSession(callbacks: RealtimeSessionCallbacks = {}) {
  const sessionRef = useRef<any>(null);
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
      if (sessionRef.current) {
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

        // Import RealtimeSession dynamically to avoid SSR issues
        const { RealtimeSession } = await import('@openai/agents/realtime');

        // Find initial agent
        const initialAgent = initialAgentName
          ? agents.find(a => a.name === initialAgentName) || agents[0]
          : agents[0];

        if (!initialAgent) {
          throw new Error('No agents provided');
        }

        // Create RealtimeSession with the initial agent
        const session = new RealtimeSession(initialAgent, {
          apiKey: ephemeralKey,
          transport: 'webrtc',
        });

        sessionRef.current = session;
        setCurrentAgentName(initialAgent.name);

        // Set up event handlers
        session.on('error', (error: any) => {
          console.error('RealtimeSession error:', error);
          logServerEvent({ type: 'error', error: error.error?.toString() || error.toString() });
          updateStatus('DISCONNECTED');
          sessionRef.current = null;
        });

        // Set up session history handlers
        const handlers = handlersRef.current;

        session.on('agent_tool_start', handlers.handleAgentToolStart as any);
        session.on('agent_tool_end', handlers.handleAgentToolEnd as any);
        session.on('history_added', handlers.handleHistoryAdded as any);
        session.on('history_updated', handlers.handleHistoryUpdated as any);
        session.on('guardrail_tripped', handlers.handleGuardrailTripped as any);

        // Handle agent handoffs
        session.on('agent_handoff', (context: any, fromAgent: any, toAgent: any) => {
          const agentName = toAgent.name;
          console.log('Agent handoff to:', agentName);
          setCurrentAgentName(agentName);
          callbacks.onAgentHandoff?.(agentName);
          addTranscriptBreadcrumb(`Agent handoff to: ${agentName}`);
        });

        // Connect the session
        await session.connect({ apiKey: ephemeralKey });

        // Update status after successful connection
        updateStatus('CONNECTED');
        console.log('RealtimeSession connected successfully');

      } catch (err) {
        console.error('Connection error:', err);
        updateStatus('DISCONNECTED');
        if (sessionRef.current) {
          sessionRef.current.disconnect();
          sessionRef.current = null;
        }
      }
    },
    [updateStatus, logServerEvent, logClientEvent, addTranscriptBreadcrumb, callbacks, handlersRef],
  );

  const disconnect = useCallback(() => {
    console.log('Disconnecting...');
    if (sessionRef.current) {
      sessionRef.current.disconnect();
      sessionRef.current = null;
    }
    updateStatus('DISCONNECTED');
    setCurrentAgentName('');
  }, [updateStatus]);

  const sendUserText = useCallback((text: string) => {
    if (!sessionRef.current || status !== 'CONNECTED') {
      console.warn('Session not ready');
      return;
    }

    const itemId = 'user_' + Date.now();

    // Add user message to transcript
    addTranscriptMessage(itemId, 'user', text, false);

    try {
      sessionRef.current.currentAgent?.conversation?.item?.create({
        id: itemId,
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }]
      });

      sessionRef.current.currentAgent?.response?.create();

      logClientEvent({ type: 'user_message_sent', text, itemId });
    } catch (err) {
      console.error('Failed to send user text:', err);
    }
  }, [status, logClientEvent, addTranscriptMessage]);

  const sendEvent = useCallback((ev: any) => {
    if (!sessionRef.current || status !== 'CONNECTED') {
      console.warn('Session not ready for event:', ev.type);
      return;
    }

    try {
      sessionRef.current.currentAgent?.send(ev);
      logClientEvent(ev);
    } catch (err) {
      console.error('Failed to send event:', err);
    }
  }, [status, logClientEvent]);

  const mute = useCallback((m: boolean) => {
    console.log('Mute:', m);
    if (sessionRef.current) {
      try {
        sessionRef.current.currentAgent?.mute(m);
      } catch (err) {
        console.warn('Failed to mute:', err);
      }
    }
  }, []);

  const interrupt = useCallback(() => {
    if (sessionRef.current && status === 'CONNECTED') {
      try {
        sessionRef.current.currentAgent?.response?.cancel();
        logClientEvent({ type: 'response_interrupted' });
      } catch (err) {
        console.warn('Failed to interrupt:', err);
      }
    }
  }, [status, logClientEvent]);

  const switchAgent = useCallback((agentName: string) => {
    if (!sessionRef.current || status !== 'CONNECTED') {
      console.warn('Cannot switch agent - not connected');
      return;
    }

    try {
      sessionRef.current.switchAgent(agentName);
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