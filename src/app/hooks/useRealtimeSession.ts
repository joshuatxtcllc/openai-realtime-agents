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
      if (pcRef.current) {
        console.log('Already connected or connecting');
        return;
      }

      updateStatus('CONNECTING');

      try {
        const ephemeralKey = await getEphemeralKey();
        console.log('Got ephemeral key, creating peer connection...');
        
        // Create peer connection with STUN servers
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        pcRef.current = pc;

        // Set up audio element for playback
        if (audioElement) {
          pc.ontrack = (event) => {
            console.log('Received remote audio track');
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
          console.log('Got microphone stream');
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
          console.log('Data channel opened, sending session config...');
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
              tools: []
            }
          };
          
          dc.send(JSON.stringify(sessionConfig));
          
          // Send initial greeting trigger after a short delay
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
            }
          } catch (err) {
            console.error('Error parsing server message:', err);
          }
        };

        dc.onerror = (error) => {
          console.error('Data channel error:', error);
          updateStatus('DISCONNECTED');
        };

        dc.onclose = () => {
          console.log('Data channel closed');
          updateStatus('DISCONNECTED');
        };

        // Handle connection state changes
        pc.onconnectionstatechange = () => {
          console.log('Connection state:', pc.connectionState);
          if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
            updateStatus('DISCONNECTED');
          }
        };

        // Create offer
        console.log('Creating offer...');
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // Send offer to OpenAI
        console.log('Sending offer to OpenAI...');
        const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ephemeralKey}`,
            'Content-Type': 'application/sdp'
          },
          body: offer.sdp
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('OpenAI API error:', response.status, errorText);
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const answerSdp = await response.text();
        console.log('Got answer from OpenAI, setting remote description...');
        
        await pc.setRemoteDescription({
          type: 'answer',
          sdp: answerSdp
        });

        console.log('WebRTC connection established successfully');

      } catch (err) {
        console.error('Connection error:', err);
        updateStatus('DISCONNECTED');
        if (pcRef.current) {
          pcRef.current.close();
          pcRef.current = null;
        }
        if (dcRef.current) {
          dcRef.current = null;
        }
      }
    },
    [updateStatus, historyHandlers, logServerEvent],
  );

  const disconnect = useCallback(() => {
    console.log('Disconnecting...');
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
    if (!dcRef.current || dcRef.current.readyState !== 'open') {
      console.warn('Data channel not ready');
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
    dcRef.current.send(JSON.stringify(message));
    
    const responseCreate = { type: 'response.create' };
    dcRef.current.send(JSON.stringify(responseCreate));
  }, []);

  const sendEvent = useCallback((ev: any) => {
    if (!dcRef.current || dcRef.current.readyState !== 'open') {
      console.warn('Data channel not ready for event:', ev.type);
      return;
    }
    dcRef.current.send(JSON.stringify(ev));
  }, []);

  const mute = useCallback((m: boolean) => {
    console.log('Mute:', m);
  }, []);

  const interrupt = useCallback(() => {
    if (!dcRef.current || dcRef.current.readyState !== 'open') return;
    const interruptEvent = { type: 'response.cancel' };
    dcRef.current.send(JSON.stringify(interruptEvent));
  }, []);

  const pushToTalkStart = useCallback(() => {
    if (!dcRef.current || dcRef.current.readyState !== 'open') return;
    dcRef.current.send(JSON.stringify({ type: 'input_audio_buffer.clear' }));
  }, []);

  const pushToTalkStop = useCallback(() => {
    if (!dcRef.current || dcRef.current.readyState !== 'open') return;
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