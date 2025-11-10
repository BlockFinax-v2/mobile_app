import io from 'socket.io-client';
import { Audio } from 'expo-av';
import { Camera } from 'expo-camera';

// Mock WebRTC types for Expo compatibility
interface MockMediaStream {
  id: string;
  active: boolean;
  getTracks(): MockMediaStreamTrack[];
  getAudioTracks(): MockMediaStreamTrack[];
  getVideoTracks(): MockMediaStreamTrack[];
  toURL(): string;
}

interface MockMediaStreamTrack {
  id: string;
  kind: 'audio' | 'video';
  enabled: boolean;
  stop(): void;
}

interface MockRTCPeerConnection {
  connectionState: string;
  addStream(stream: MockMediaStream): void;
  close(): void;
  createOffer(): Promise<any>;
  createAnswer(): Promise<any>;
  setLocalDescription(desc: any): Promise<void>;
  setRemoteDescription(desc: any): Promise<void>;
  addIceCandidate(candidate: any): Promise<void>;
}

export interface CallData {
  callId: string;
  participantAddress: string;
  participantName: string;
  callType: 'voice' | 'video';
  isIncoming: boolean;
  status: 'ringing' | 'connecting' | 'connected' | 'ended' | 'declined';
  startTime?: string;
  endTime?: string;
}

export interface CallEvents {
  onIncomingCall: (callData: CallData) => void;
  onCallAccepted: (callId: string) => void;
  onCallDeclined: (callId: string, reason?: string) => void;
  onCallEnded: (callId: string, reason?: string) => void;
  onCallError: (error: string) => void;
  onRemoteStream: (stream: MediaStream) => void;
  onLocalStream: (stream: MediaStream) => void;
}

class WebRTCCallingService {
  private socket: any = null;
  private peerConnection: MockRTCPeerConnection | null = null;
  private localStream: MockMediaStream | null = null;
  private remoteStream: MockMediaStream | null = null;
  private currentCall: CallData | null = null;
  private userAddress: string = '';
  private userName: string = '';
  private isConnected: boolean = false;
  private audioRecording: Audio.Recording | null = null;

  // Event handlers
  private eventHandlers: CallEvents = {
    onIncomingCall: () => {},
    onCallAccepted: () => {},
    onCallDeclined: () => {},
    onCallEnded: () => {},
    onCallError: () => {},
    onRemoteStream: () => {},
    onLocalStream: () => {},
  };

  // WebRTC configuration
  private rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ],
  };

  constructor(serverUrl: string = 'http://localhost:3001') {
    this.initializeSocket(serverUrl);
  }

  private initializeSocket(serverUrl: string) {
    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
    });

    this.socket.on('connect', () => {
      console.log('Connected to server');
      this.isConnected = true;
      
      // Re-authenticate if we have user data
      if (this.userAddress && this.userName) {
        this.authenticate(this.userAddress, this.userName);
      }
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
      this.isConnected = false;
    });

    this.socket.on('authenticated', (data: any) => {
      console.log('Authenticated successfully:', data);
    });

    // Call event handlers
    this.socket.on('incoming_call', this.handleIncomingCall.bind(this));
    this.socket.on('call_initiated', this.handleCallInitiated.bind(this));
    this.socket.on('call_accepted', this.handleCallAccepted.bind(this));
    this.socket.on('call_declined', this.handleCallDeclined.bind(this));
    this.socket.on('call_ended', this.handleCallEnded.bind(this));
    this.socket.on('call_error', this.handleCallError.bind(this));

    // WebRTC signaling handlers
    this.socket.on('webrtc_offer', this.handleWebRTCOffer.bind(this));
    this.socket.on('webrtc_answer', this.handleWebRTCAnswer.bind(this));
    this.socket.on('webrtc_ice_candidate', this.handleICECandidate.bind(this));
  }

  public setEventHandlers(handlers: Partial<CallEvents>) {
    this.eventHandlers = { ...this.eventHandlers, ...handlers };
  }

  public authenticate(address: string, name: string) {
    this.userAddress = address;
    this.userName = name;
    
    if (this.socket && this.isConnected) {
      this.socket.emit('authenticate', { address, name });
    }
  }

  public async initiateCall(toAddress: string, callType: 'voice' | 'video'): Promise<void> {
    try {
      if (this.currentCall) {
        throw new Error('Already in a call');
      }

      // Get local media stream
      await this.setupLocalStream(callType);

      // Create peer connection
      this.createPeerConnection();

      // Add local stream to peer connection
      if (this.localStream && this.peerConnection) {
        (this.peerConnection as any).addStream(this.localStream);
      }

      // Initiate call through socket
      this.socket.emit('initiate_call', { toAddress, callType });

    } catch (error) {
      console.error('Error initiating call:', error);
      this.eventHandlers.onCallError(`Failed to initiate call: ${error}`);
    }
  }

  public async acceptCall(callId: string): Promise<void> {
    try {
      if (!this.currentCall || this.currentCall.callId !== callId) {
        throw new Error('No matching incoming call');
      }

      // Get local media stream
      await this.setupLocalStream(this.currentCall.callType);

      // Create peer connection
      this.createPeerConnection();

      // Add local stream to peer connection
      if (this.localStream && this.peerConnection) {
        (this.peerConnection as any).addStream(this.localStream);
      }

      // Accept call through socket
      this.socket.emit('call_response', { callId, response: 'accept' });

    } catch (error) {
      console.error('Error accepting call:', error);
      this.eventHandlers.onCallError(`Failed to accept call: ${error}`);
    }
  }

  public declineCall(callId: string): void {
    this.socket.emit('call_response', { callId, response: 'decline' });
    this.cleanup();
  }

  public endCall(): void {
    if (this.currentCall) {
      this.socket.emit('end_call', { callId: this.currentCall.callId });
    }
    this.cleanup();
  }

  public toggleAudio(): boolean {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        
        // Notify peer of status change
        if (this.currentCall) {
          this.socket.emit('call_status_update', {
            callId: this.currentCall.callId,
            status: { audio: audioTrack.enabled, video: this.isVideoEnabled() }
          });
        }
        
        return audioTrack.enabled;
      }
    }
    return false;
  }

  public toggleVideo(): boolean {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        
        // Notify peer of status change
        if (this.currentCall) {
          this.socket.emit('call_status_update', {
            callId: this.currentCall.callId,
            status: { audio: this.isAudioEnabled(), video: videoTrack.enabled }
          });
        }
        
        return videoTrack.enabled;
      }
    }
    return false;
  }

  public isAudioEnabled(): boolean {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      return audioTrack ? audioTrack.enabled : false;
    }
    return false;
  }

  public isVideoEnabled(): boolean {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      return videoTrack ? videoTrack.enabled : false;
    }
    return false;
  }

  public getLocalStream(): MockMediaStream | null {
    return this.localStream;
  }

  public getRemoteStream(): MockMediaStream | null {
    return this.remoteStream;
  }

  public getCurrentCall(): CallData | null {
    return this.currentCall;
  }

  private async setupLocalStream(callType: 'voice' | 'video'): Promise<void> {
    try {
      // Mock stream creation for Expo compatibility
      const mockTracks: MockMediaStreamTrack[] = [
        {
          id: 'audio-track-1',
          kind: 'audio',
          enabled: true,
          stop: () => console.log('Audio track stopped')
        }
      ];

      if (callType === 'video') {
        mockTracks.push({
          id: 'video-track-1',
          kind: 'video',
          enabled: true,
          stop: () => console.log('Video track stopped')
        });
      }

      this.localStream = {
        id: 'local-stream-' + Date.now(),
        active: true,
        getTracks: () => mockTracks,
        getAudioTracks: () => mockTracks.filter(t => t.kind === 'audio'),
        getVideoTracks: () => mockTracks.filter(t => t.kind === 'video'),
        toURL: () => 'mock://localstream'
      };

      this.eventHandlers.onLocalStream(this.localStream as any);
      
      console.log('Local stream obtained:', this.localStream.getTracks().length, 'tracks');
    } catch (error) {
      console.error('Error getting local stream:', error);
      throw new Error('Failed to access camera/microphone');
    }
  }

  private createPeerConnection(): void {
    // Create mock peer connection for Expo compatibility
    this.peerConnection = {
      connectionState: 'new',
      addStream: (stream: MockMediaStream) => {
        console.log('Stream added to peer connection:', stream.id);
      },
      close: () => {
        console.log('Peer connection closed');
        if (this.peerConnection) {
          this.peerConnection.connectionState = 'closed';
        }
      },
      createOffer: async () => {
        console.log('Creating offer');
        return { type: 'offer', sdp: 'mock-offer-sdp' };
      },
      createAnswer: async () => {
        console.log('Creating answer');
        return { type: 'answer', sdp: 'mock-answer-sdp' };
      },
      setLocalDescription: async (desc: any) => {
        console.log('Setting local description:', desc.type);
      },
      setRemoteDescription: async (desc: any) => {
        console.log('Setting remote description:', desc.type);
        // Simulate connection established
        setTimeout(() => {
          if (this.peerConnection) {
            this.peerConnection.connectionState = 'connected';
            
            // Create mock remote stream
            const mockRemoteStream: MockMediaStream = {
              id: 'remote-stream-' + Date.now(),
              active: true,
              getTracks: () => [
                {
                  id: 'remote-audio-track',
                  kind: 'audio',
                  enabled: true,
                  stop: () => console.log('Remote audio track stopped')
                },
                {
                  id: 'remote-video-track',
                  kind: 'video',
                  enabled: true,
                  stop: () => console.log('Remote video track stopped')
                }
              ],
              getAudioTracks: () => [{
                id: 'remote-audio-track',
                kind: 'audio',
                enabled: true,
                stop: () => console.log('Remote audio track stopped')
              }],
              getVideoTracks: () => [{
                id: 'remote-video-track',
                kind: 'video',
                enabled: true,
                stop: () => console.log('Remote video track stopped')
              }],
              toURL: () => 'mock://remotestream'
            };
            
            this.remoteStream = mockRemoteStream;
            this.eventHandlers.onRemoteStream(mockRemoteStream as any);
          }
        }, 1000);
      },
      addIceCandidate: async (candidate: any) => {
        console.log('Adding ICE candidate:', candidate);
      }
    };
  }

  // Event handlers
  private handleIncomingCall(data: any): void {
    console.log('Incoming call:', data);
    
    this.currentCall = {
      callId: data.callId,
      participantAddress: data.caller.address,
      participantName: data.caller.name,
      callType: data.callType,
      isIncoming: true,
      status: 'ringing',
      startTime: data.timestamp,
    };

    this.eventHandlers.onIncomingCall(this.currentCall);
  }

  private handleCallInitiated(data: any): void {
    console.log('Call initiated:', data);
    
    this.currentCall = {
      callId: data.callId,
      participantAddress: data.recipient.address,
      participantName: data.recipient.name,
      callType: data.callType,
      isIncoming: false,
      status: 'ringing',
    };
  }

  private async handleCallAccepted(data: any): Promise<void> {
    console.log('Call accepted:', data);
    
    if (this.currentCall) {
      this.currentCall.status = 'connecting';
      this.eventHandlers.onCallAccepted(data.callId);

      // Create and send offer if we're the caller
      if (!this.currentCall.isIncoming) {
        try {
          const offer = await this.peerConnection!.createOffer();
          await this.peerConnection!.setLocalDescription(offer);
          
          this.socket.emit('webrtc_offer', {
            callId: data.callId,
            offer: offer,
          });
        } catch (error) {
          console.error('Error creating offer:', error);
          this.eventHandlers.onCallError('Failed to create call offer');
        }
      }
    }
  }

  private handleCallDeclined(data: any): void {
    console.log('Call declined:', data);
    this.eventHandlers.onCallDeclined(data.callId, data.reason);
    this.cleanup();
  }

  private handleCallEnded(data: any): void {
    console.log('Call ended:', data);
    this.eventHandlers.onCallEnded(data.callId, data.reason);
    this.cleanup();
  }

  private handleCallError(data: any): void {
    console.error('Call error:', data);
    this.eventHandlers.onCallError(data.message);
    this.cleanup();
  }

  private async handleWebRTCOffer(data: any): Promise<void> {
    console.log('Received WebRTC offer');
    
    try {
      await this.peerConnection!.setRemoteDescription(data.offer);
      
      const answer = await this.peerConnection!.createAnswer();
      await this.peerConnection!.setLocalDescription(answer);
      
      this.socket.emit('webrtc_answer', {
        callId: data.callId,
        answer: answer,
      });
    } catch (error) {
      console.error('Error handling WebRTC offer:', error);
      this.eventHandlers.onCallError('Failed to handle call offer');
    }
  }

  private async handleWebRTCAnswer(data: any): Promise<void> {
    console.log('Received WebRTC answer');
    
    try {
      await this.peerConnection!.setRemoteDescription(data.answer);
    } catch (error) {
      console.error('Error handling WebRTC answer:', error);
      this.eventHandlers.onCallError('Failed to handle call answer');
    }
  }

  private async handleICECandidate(data: any): Promise<void> {
    console.log('Received ICE candidate');
    
    try {
      await this.peerConnection!.addIceCandidate(data.candidate);
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  }

  private cleanup(): void {
    console.log('Cleaning up call resources');
    
    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Release local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach((track: MockMediaStreamTrack) => track.stop());
      this.localStream = null;
    }

    // Clear remote stream
    this.remoteStream = null;

    // Clear current call
    this.currentCall = null;
  }

  public disconnect(): void {
    this.cleanup();
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

export default WebRTCCallingService;