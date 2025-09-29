import { useCallback, useRef, useState } from 'react';
import { SessionStatus } from '../types';
import { useEvent } from '../contexts/EventContext';
import { useHandleSessionHistory } from './useHandleSessionHistory';
import { RealtimeSession } from '@openai/agents/realtime';

export interface RealtimeSessionCallbacks {
  onConnectionChange?: (status: SessionStatus) => void;
  onAgentHandoff?: (agentName: string) => void;
}

export interface ConnectOptions {
  getEphemeralKey: () => Promise<string>;
  audioElement?: HTMLAudioElement;
  extraContext?: Record<string, any>;
}

export function useRealtimeSession(callbacks: RealtimeSessionCallbacks = {}) {
  const sessionRef = useRef<RealtimeSession | null>(null);
  const [status, setStatus] = useState<SessionStatus>('DISCONNECTED');
  const { logClientEvent, logServerEvent } = useEvent();

  const updateStatus = useCallback(
    (s: SessionStatus) => {
      setStatus(s);
      callbacks.onConnectionChange?.(s);
      logClientEvent({}, s);
    },
    [callbacks, logClientEvent],
  );

  const historyHandlers = useHandleSessionHistory().current;

  const connect = useCallback(
    async ({ getEphemeralKey, audioElement }: ConnectOptions) => {
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

        // Create RealtimeSession using the SDK
        const session = new RealtimeSession({
          apiKey: ephemeralKey,
          model: 'gpt-4o-mini-realtime',
          voice: 'sage',
          instructions: `You are a helpful customer service agent for Jay's Frames custom framing. Always greet customers with "Hi, you've reached Jay's Frames, how can I help you?" You can help with order status, framing information, and scheduling appointments. Be friendly and professional.`,
          audioElement: audioElement,
          turnDetection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500,
            create_response: true
          }
        });

        sessionRef.current = session;

        // Set up event listeners
        session.on('connected', () => {
          console.log('Session connected successfully');
          updateStatus('CONNECTED');
          
          // Send initial greeting trigger
          setTimeout(() => {
            session.sendUserMessage('hi');
          }, 500);
        });

        session.on('disconnected', () => {
          console.log('Session disconnected');
          updateStatus('DISCONNECTED');
          sessionRef.current = null;
        });

        session.on('error', (error: any) => {
          console.error('Session error:', error);
          logServerEvent({ type: 'error', error });
          updateStatus('DISCONNECTED');
          sessionRef.current = null;
        });

        session.on('message', (message: any) => {
          console.log('Received message:', message);
          logServerEvent(message);
          
          // Handle different message types
          if (message.type === 'conversation.item.created' && message.item?.role === 'assistant') {
            historyHandlers.handleHistoryAdded(message.item);
          } else if (message.type === 'response.audio_transcript.delta') {
            historyHandlers.handleTranscriptionDelta(message);
          } else if (message.type === 'response.audio_transcript.done') {
            historyHandlers.handleTranscriptionCompleted(message);
          }
        });

        // Connect the session
        await session.connect();

      } catch (err) {
        console.error('Connection error:', err);
        updateStatus('DISCONNECTED');
        if (sessionRef.current) {
          sessionRef.current.disconnect();
          sessionRef.current = null;
        }
      }
    },
    [updateStatus, historyHandlers, logServerEvent],
  );

  const disconnect = useCallback(() => {
    console.log('Disconnecting...');
    if (sessionRef.current) {
      sessionRef.current.disconnect();
      sessionRef.current = null;
    }
    updateStatus('DISCONNECTED');
  }, [updateStatus]);

  const sendUserText = useCallback((text: string) => {
    if (!sessionRef.current) {
      console.warn('Session not ready');
      return;
    }
    
    sessionRef.current.sendUserMessage(text);
  }, []);

  const sendEvent = useCallback((ev: any) => {
    if (!sessionRef.current) {
      console.warn('Session not ready for event:', ev.type);
      return;
    }
    sessionRef.current.sendEvent(ev);
  }, []);

  const mute = useCallback((m: boolean) => {
    if (sessionRef.current) {
      sessionRef.current.mute(m);
    }
  }, []);

  const interrupt = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.interrupt();
    }
  }, []);

  const pushToTalkStart = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.startPushToTalk();
    }
  }, []);

  const pushToTalkStop = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.stopPushToTalk();
    }
  }, []);

  return {
    status,
    connect,
    disconnect,
    sendUserText,
    sendEvent,
    mute,
    pushToTalkStart,
    pushToTalkStop,
    interrupt,
  } as const;
}