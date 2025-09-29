import { useCallback, useRef, useState, useEffect } from 'react';
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
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
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
      if (pcRef.current) return; // already connected

      updateStatus('CONNECTING');

      try {
        const ephemeralKey = await getEphemeralKey();
        
        // Create peer connection
        const pc = new RTCPeerConnection();
        pcRef.current = pc;

        // Set up audio element for playback
        if (audioElement) {
          pc.ontrack = (event) => {
            audioElement.srcObject = event.streams[0];
          };
        }

        // Add microphone audio
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              channelCount: 1,
              sampleRate: 24000,
            } 
          });
          stream.getTracks().forEach(track => {
            pc.addTrack(track, stream);
          });
        } catch (err) {
          console.warn('Could not get microphone:', err);
        }

        // Create data channel for events
        const dc = pc.createDataChannel('oai-events');
        dcRef.current = dc;

        dc.onopen = () => {
          console.log('Data channel opened');
          updateStatus('CONNECTED');
          
          // Send session configuration
          const sessionConfig = {
            type: 'session.update',
            session: {
              modalities: ['text', 'audio'],
              instructions: `You are a helpful customer service agent for Jay's Frames custom framing. Always greet customers with "Hi, you've reached Jay's Frames, how can I help you?" You can help with order status, framing information, and scheduling appointments.`,
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
                silence_duration_ms: 500
              },
              tools: [
                {
                  type: 'function',
                  name: 'getOrderStatus',
                  description: 'Get order status for a customer',
                  parameters: {
                    type: 'object',
                    properties: {
                      customer_name: {
                        type: 'string',
                        description: 'Customer name to search for'
                      },
                      order_number: {
                        type: 'string', 
                        description: 'Order number to search for'
                      }
                    }
                  }
                },
                {
                  type: 'function',
                  name: 'scheduleAppointment',
                  description: 'Help customer schedule an appointment',
                  parameters: {
                    type: 'object',
                    properties: {
                      customer_info: {
                        type: 'string',
                        description: 'Customer contact information'
                      }
                    },
                    required: ['customer_info']
                  }
                }
              ]
            }
          };
          
          dc.send(JSON.stringify(sessionConfig));
          
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
            dc.send(JSON.stringify(greetingMessage));
            
            const responseCreate = {
              type: 'response.create'
            };
            dc.send(JSON.stringify(responseCreate));
          }, 1000);
        };

        dc.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            logServerEvent(data);
            
            // Handle different event types
            switch (data.type) {
              case 'conversation.item.created':
                if (data.item?.role === 'assistant') {
                  historyHandlers.handleHistoryAdded(data.item);
                }
                break;
              case 'response.audio_transcript.delta':
                historyHandlers.handleTranscriptionDelta(data);
                break;
              case 'response.audio_transcript.done':
                historyHandlers.handleTranscriptionCompleted(data);
                break;
              case 'response.function_call_arguments.done':
                // Handle function calls
                if (data.name === 'getOrderStatus') {
                  const args = JSON.parse(data.arguments || '{}');
                  const mockResult = {
                    order_found: true,
                    customer_name: args.customer_name || 'Sample Customer',
                    order_number: 'JF-2024-001',
                    status: 'In Production - Finishing Stage',
                    estimated_completion: 'Friday, January 5th',
                    notes: 'Custom frame for family portrait'
                  };
                  
                  const functionResult = {
                    type: 'conversation.item.create',
                    item: {
                      type: 'function_call_output',
                      call_id: data.call_id,
                      output: JSON.stringify(mockResult)
                    }
                  };
                  dc.send(JSON.stringify(functionResult));
                  
                  const responseCreate = { type: 'response.create' };
                  dc.send(JSON.stringify(responseCreate));
                }
                break;
            }
          } catch (err) {
            console.error('Error parsing server message:', err);
          }
        };

        dc.onerror = (error) => {
          console.error('Data channel error:', error);
        };

        // Create offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // Send offer to OpenAI
        const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ephemeralKey}`,
            'Content-Type': 'application/sdp'
          },
          body: offer.sdp
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        const answerSdp = await response.text();
        await pc.setRemoteDescription({
          type: 'answer',
          sdp: answerSdp
        });

      } catch (err) {
        console.error('Connection error:', err);
        updateStatus('DISCONNECTED');
        if (pcRef.current) {
          pcRef.current.close();
          pcRef.current = null;
        }
      }
    },
    [updateStatus, historyHandlers, logServerEvent],
  );

  const disconnect = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (dcRef.current) {
      dcRef.current = null;
    }
    updateStatus('DISCONNECTED');
  }, [updateStatus]);

  const sendUserText = useCallback((text: string) => {
    if (!dcRef.current) return;
    
    const message = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }]
      }
    };
    dcRef.current.send(JSON.stringify(message));
    
    const responseCreate = { type: 'response.create' };
    dcRef.current.send(JSON.stringify(responseCreate));
  }, []);

  const sendEvent = useCallback((ev: any) => {
    if (!dcRef.current) return;
    dcRef.current.send(JSON.stringify(ev));
  }, []);

  const mute = useCallback((m: boolean) => {
    // Implementation for muting
    console.log('Mute:', m);
  }, []);

  const interrupt = useCallback(() => {
    if (!dcRef.current) return;
    const interruptEvent = { type: 'response.cancel' };
    dcRef.current.send(JSON.stringify(interruptEvent));
  }, []);

  const pushToTalkStart = useCallback(() => {
    if (!dcRef.current) return;
    dcRef.current.send(JSON.stringify({ type: 'input_audio_buffer.clear' }));
  }, []);

  const pushToTalkStop = useCallback(() => {
    if (!dcRef.current) return;
    dcRef.current.send(JSON.stringify({ type: 'input_audio_buffer.commit' }));
    dcRef.current.send(JSON.stringify({ type: 'response.create' }));
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