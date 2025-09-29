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
    async ({ getEphemeralKey }: ConnectOptions) => {
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
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
        
        // Create WebSocket connection to OpenAI Realtime API
        const wsUrl = 'wss://api.openai.com/v1/realtime?model=gpt-4o-mini-realtime';
        
        console.log('Creating WebSocket connection to:', wsUrl);
        console.log('With ephemeral key authentication');
        
        const ws = new WebSocket(
          wsUrl,
          [`openai-insecure-api-key.${ephemeralKey}`]
        );
        
        wsRef.current = ws;
        
        // Add timeout for connection
        const connectionTimeout = setTimeout(() => {
          if (ws.readyState === WebSocket.CONNECTING) {
            console.error('Connection timeout');
            ws.close();
            updateStatus('DISCONNECTED');
          }
        }, 10000);

        ws.onopen = () => {
          clearTimeout(connectionTimeout);
          console.log('WebSocket connected, sending session config...');
          updateStatus('CONNECTED');
          
          // Send session configuration
          const sessionConfig = {
            type: 'session.update',
            session: {
              modalities: ['text', 'audio'],
              instructions: `You are a helpful customer service agent for Jay's Frames custom framing. Always greet customers with "Hi, you've reached Jay's Frames, how can I help you?" You can help with order status, framing information, and scheduling appointments. Be friendly and professional.`,
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
              tools: []
            }
          };
          
          console.log('Sending session config:', sessionConfig);
          ws.send(JSON.stringify(sessionConfig));
          
          // Send initial greeting trigger after a short delay
          setTimeout(() => {
            const greetingMessage = {
              type: 'conversation.item.create',
              item: {
                id: `msg_${Date.now()}`,
                type: 'message',
                role: 'user',
                content: [{ type: 'input_text', text: 'hi' }]
              }
            };
            console.log('Sending greeting message:', greetingMessage);
            ws.send(JSON.stringify(greetingMessage));
            
            const responseCreate = {
              type: 'response.create'
            };
            console.log('Requesting response');
            ws.send(JSON.stringify(responseCreate));
          }, 500);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('Received message:', data.type, data);
            logServerEvent(data);
            
            // Handle different event types
            switch (data.type) {
              case 'session.created':
                console.log('Session created successfully');
                break;
              case 'session.updated':
                console.log('Session updated successfully');
                break;
              case 'conversation.item.created':
                if (data.item?.role === 'assistant') {
                  historyHandlers.handleHistoryAdded(data.item);
                }
                break;
              case 'response.created':
                console.log('Response created');
                break;
              case 'response.done':
                console.log('Response completed');
                break;
              case 'response.audio_transcript.delta':
                historyHandlers.handleTranscriptionDelta(data);
                break;
              case 'response.audio_transcript.done':
                historyHandlers.handleTranscriptionCompleted(data);
                break;
              case 'error':
                console.error('Realtime API error:', data);
                break;
              default:
                console.log('Unhandled message type:', data.type);
            }
          } catch (err) {
            console.error('Error parsing server message:', err);
          }
        };

        ws.onerror = (error) => {
          clearTimeout(connectionTimeout);
          console.error('WebSocket error:', error);
          updateStatus('DISCONNECTED');
        };

        ws.onclose = (event) => {
          clearTimeout(connectionTimeout);
          console.log('WebSocket closed:', event.code, event.reason);
          if (event.code !== 1000) {
            console.error('WebSocket closed with error code:', event.code, event.reason);
          }
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
    
    const responseCreate = { type: 'response.create' };
    wsRef.current.send(JSON.stringify(responseCreate));
  }, []);

  const sendEvent = useCallback((ev: any) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not ready for event:', ev.type);
      return;
    }
    wsRef.current.send(JSON.stringify(ev));
  }, []);

  const mute = useCallback((m: boolean) => {
    console.log('Mute:', m);
  }, []);

  const interrupt = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const interruptEvent = { type: 'response.cancel' };
    wsRef.current.send(JSON.stringify(interruptEvent));
  }, []);

  const pushToTalkStart = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'input_audio_buffer.clear' }));
  }, []);

  const pushToTalkStop = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
    wsRef.current.send(JSON.stringify({ type: 'response.create' }));
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