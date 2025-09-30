import { useCallback, useRef, useState } from 'react';
import { SessionStatus } from '../types';
import { useEvent } from '../contexts/EventContext';
import { useTranscript } from '../contexts/TranscriptContext';

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
  const audioContextRef = useRef<AudioContext | null>(null);
  const [status, setStatus] = useState<SessionStatus>('DISCONNECTED');
  const { logClientEvent, logServerEvent } = useEvent();
  const { addTranscriptMessage, updateTranscriptMessage, updateTranscriptItem } = useTranscript();

  const updateStatus = useCallback(
    (s: SessionStatus) => {
      setStatus(s);
      callbacks.onConnectionChange?.(s);
      logClientEvent({ type: 'status_change', status: s });
    },
    [callbacks, logClientEvent],
  );

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
          `wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01`,
          ['realtime', `openai-insecure-api-key.${ephemeralKey}`]
        );

        wsRef.current = ws;

        ws.onopen = () => {
          console.log('WebSocket connected');
          updateStatus('CONNECTED');
          
          // Send session configuration
          const sessionConfig = {
            type: 'session.update',
            session: {
              modalities: ['text', 'audio'],
              instructions: `You are a helpful customer service agent for Jay's Frames custom framing. 
              Always greet customers with "Hi, you've reached Jay's Frames, how can I help you?" 
              You can help with order status, framing information, and scheduling appointments. 
              Be friendly, professional, and concise in your responses.`,
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

          // Send initial greeting trigger after a short delay
          setTimeout(() => {
            const greetingMessage = {
              type: 'conversation.item.create',
              item: {
                id: 'greeting_' + Date.now(),
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
            console.log('Received message:', message.type);
            logServerEvent(message);
            
            // Handle different message types
            switch (message.type) {
              case 'conversation.item.created':
                if (message.item?.role === 'assistant') {
                  addTranscriptMessage(
                    message.item.id,
                    'assistant',
                    '[Generating response...]',
                    false
                  );
                }
                break;

              case 'response.audio_transcript.delta':
                if (message.item_id && message.delta) {
                  updateTranscriptMessage(message.item_id, message.delta, true);
                }
                break;

              case 'response.audio_transcript.done':
                if (message.item_id) {
                  const finalText = message.transcript || '[Audio response completed]';
                  updateTranscriptMessage(message.item_id, finalText, false);
                  updateTranscriptItem(message.item_id, { status: 'DONE' });
                }
                break;

              case 'response.audio.delta':
                // Handle audio playback
                if (message.delta && audioElement) {
                  try {
                    // Simple audio handling - in production you'd want proper streaming
                    const audioData = atob(message.delta);
                    const audioArray = new Uint8Array(audioData.length);
                    for (let i = 0; i < audioData.length; i++) {
                      audioArray[i] = audioData.charCodeAt(i);
                    }
                    // Note: This is simplified - proper audio streaming would be more complex
                  } catch (err) {
                    console.warn('Audio processing error:', err);
                  }
                }
                break;

              case 'error':
                console.error('Realtime API error:', message.error);
                logServerEvent(message);
                break;

              default:
                // Log other message types for debugging
                console.log('Unhandled message type:', message.type);
            }
          } catch (err) {
            console.error('Error parsing WebSocket message:', err);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          logServerEvent({ type: 'websocket_error', error: error.toString() });
          updateStatus('DISCONNECTED');
          wsRef.current = null;
        };

        ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          logServerEvent({ type: 'websocket_close', code: event.code, reason: event.reason });
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
    [updateStatus, logServerEvent, logClientEvent, addTranscriptMessage, updateTranscriptMessage, updateTranscriptItem],
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
    
    const itemId = 'user_' + Date.now();
    
    // Add user message to transcript
    addTranscriptMessage(itemId, 'user', text, false);
    
    const message = {
      type: 'conversation.item.create',
      item: {
        id: itemId,
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }]
      }
    };
    
    wsRef.current.send(JSON.stringify(message));
    wsRef.current.send(JSON.stringify({ type: 'response.create' }));
    logClientEvent(message);
  }, [logClientEvent, addTranscriptMessage]);

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

  return {
    status,
    connect,
    disconnect,
    sendUserText,
    sendEvent,
    mute,
    interrupt,
  } as const;
}