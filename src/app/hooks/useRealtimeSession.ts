import { useCallback, useRef, useState } from 'react';
import { SessionStatus } from '../types';
import { useEvent } from '../contexts/EventContext';
import { useHandleSessionHistory } from './useHandleSessionHistory';

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
  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
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
      if (wsRef.current) {
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

        // Create WebSocket connection
        const ws = new WebSocket(
          `wss://api.openai.com/v1/realtime?model=gpt-4o-mini-realtime`,
          ['realtime', `openai-insecure-api-key.${ephemeralKey}`]
        );

        wsRef.current = ws;

        ws.onopen = () => {
          console.log('WebSocket connected');
          
          // Send session configuration
          const sessionConfig = {
            type: 'session.update',
            session: {
              modalities: ['text', 'audio'],
              instructions: 'You are a helpful customer service agent for Jay\'s Frames custom framing. Always greet customers with "Hi, you\'ve reached Jay\'s Frames, how can I help you?" You can help with order status, framing information, and scheduling appointments. Be friendly and professional.',
              voice: 'sage',
              input_audio_format: 'pcm16',
              output_audio_format: 'pcm16',
              input_audio_transcription: {
                model: 'whisper-1'
              },
              turn_detection: {
                type: 'server_vad',
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 500,
                create_response: true
              },
              tools: [],
              tool_choice: 'auto',
              temperature: 0.8,
              max_response_output_tokens: 4096
            }
          };

          ws.send(JSON.stringify(sessionConfig));
          logClientEvent(sessionConfig);

          updateStatus('CONNECTED');
          
          // Send initial greeting trigger
          setTimeout(() => {
            const greetingMessage = {
              type: 'conversation.item.create',
              item: {
                type: 'message',
                role: 'user',
                content: [{ type: 'input_text', text: 'hi' }]
              }
            };
            ws.send(JSON.stringify(greetingMessage));
            ws.send(JSON.stringify({ type: 'response.create' }));
            logClientEvent(greetingMessage);
          }, 500);
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log('Received message:', message);
            logServerEvent(message);
            
            // Handle different message types
            if (message.type === 'conversation.item.created' && message.item?.role === 'assistant') {
              historyHandlers.handleHistoryAdded(message.item);
            } else if (message.type === 'response.audio_transcript.delta') {
              historyHandlers.handleTranscriptionDelta(message);
            } else if (message.type === 'response.audio_transcript.done') {
              historyHandlers.handleTranscriptionCompleted(message);
            } else if (message.type === 'response.audio.delta' && message.delta && audioElement) {
              // Handle audio playback
              try {
                const audioData = atob(message.delta);
                const audioArray = new Uint8Array(audioData.length);
                for (let i = 0; i < audioData.length; i++) {
                  audioArray[i] = audioData.charCodeAt(i);
                }
                // Note: This is a simplified audio handling - in production you'd want proper audio streaming
              } catch (err) {
                console.warn('Audio processing error:', err);
              }
            }
          } catch (err) {
            console.error('Error parsing WebSocket message:', err);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          logServerEvent({ type: 'error', error });
          updateStatus('DISCONNECTED');
          wsRef.current = null;
        };

        ws.onclose = () => {
          console.log('WebSocket disconnected');
          updateStatus('DISCONNECTED');
          wsRef.current = null;
        };

      } catch (err) {
        console.error('Connection error:', err);
        updateStatus('DISCONNECTED');
        if (wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
        }
      }
    },
    [updateStatus, historyHandlers, logServerEvent],
  );

  const disconnect = useCallback(() => {
    console.log('Disconnecting...');
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    updateStatus('DISCONNECTED');
  }, [updateStatus]);

  const sendUserText = useCallback((text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not ready');
      return;
    }
    
    const message = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }]
      }
    };
    
    wsRef.current.send(JSON.stringify(message));
    wsRef.current.send(JSON.stringify({ type: 'response.create' }));
    logClientEvent(message);
  }, [logClientEvent]);

  const sendEvent = useCallback((ev: any) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not ready for event:', ev.type);
      return;
    }
    wsRef.current.send(JSON.stringify(ev));
    logClientEvent(ev);
  }, [logClientEvent]);

  const mute = useCallback((m: boolean) => {
    console.log('Mute:', m);
    // Implement muting logic if needed
  }, []);

  const interrupt = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const interruptEvent = { type: 'response.cancel' };
      wsRef.current.send(JSON.stringify(interruptEvent));
      logClientEvent(interruptEvent);
    }
  }, [logClientEvent]);

  const pushToTalkStart = useCallback(() => {
    console.log('Push to talk start');
    // Implement PTT start logic
  }, []);

  const pushToTalkStop = useCallback(() => {
    console.log('Push to talk stop');
    // Implement PTT stop logic
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