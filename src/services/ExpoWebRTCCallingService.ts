import { Platform } from 'react-native';
import io from 'socket.io-client';

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
  onRemoteStream: (stream: any) => void;
  onLocalStream: (stream: any) => void;
}

// Mock stream for Expo compatibility
class MockMediaStream {
  public id: string;
  public active: boolean;
  
  constructor() {
    this.id = Math.random().toString(36).substr(2, 9);
    this.active = true;
  }

  getTracks() {
    return [new MockMediaStreamTrack()];
  }

  getAudioTracks() {
    return [new MockMediaStreamTrack('audio')];
  }

  getVideoTracks() {
    return [new MockMediaStreamTrack('video')];
  }

  toURL() {
    return `mock://stream/${this.id}`;
  }

  stop() {
    this.active = false;
    this.getTracks().forEach(track => track.stop());
  }
}

class MockMediaStreamTrack {
  public enabled: boolean;
  public kind: string;
  public id: string;

  constructor(kind: string = 'audio') {
    this.enabled = true;
    this.kind = kind;
    this.id = Math.random().toString(36).substr(2, 9);
  }

  stop() {
    this.enabled = false;
  }
}

// WebRTC Configuration for web platform
const getRTCPeerConnection = () => {
  if (Platform.OS === 'web') {
    return window.RTCPeerConnection || 
           (window as any).webkitRTCPeerConnection || 
           (window as any).mozRTCPeerConnection;
  }
  return null;
};

const getUserMedia = () => {
  if (Platform.OS === 'web') {
    return navigator.mediaDevices?.getUserMedia ||
           (navigator as any).getUserMedia ||
           (navigator as any).webkitGetUserMedia ||
           (navigator as any).mozGetUserMedia;
  }
  return null;
};

class ExpoWebRTCCallingService {
  private socket: any = null;
  private peerConnection: any = null;
  private localStream: any = null;
  private remoteStream: any = null;
  private currentCall: CallData | null = null;
  private userAddress: string = '';
  private userName: string = '';
  private isConnected: boolean = false;
  private isAudioMuted: boolean = false;
  private isVideoEnabled: boolean = false;

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

      console.log(`📞 Initiating ${callType} call to ${toAddress}`);

      // Get local media stream
      await this.setupLocalStream(callType);

      // Create peer connection if on web
      if (Platform.OS === 'web') {
        this.createPeerConnection();
        
        // Add local stream to peer connection
        if (this.localStream && this.peerConnection) {
          const tracks = this.localStream.getTracks();
          tracks.forEach((track: any) => {
            this.peerConnection.addTrack(track, this.localStream);
          });
        }
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

      console.log(`✅ Accepting ${this.currentCall.callType} call: ${callId}`);

      // Get local media stream
      await this.setupLocalStream(this.currentCall.callType);

      // Create peer connection if on web
      if (Platform.OS === 'web') {
        this.createPeerConnection();

        // Add local stream to peer connection
        if (this.localStream && this.peerConnection) {
          const tracks = this.localStream.getTracks();
          tracks.forEach((track: any) => {
            this.peerConnection.addTrack(track, this.localStream);
          });
        }
      }

      // Accept call through socket
      this.socket.emit('call_response', { callId, response: 'accept' });

    } catch (error) {
      console.error('Error accepting call:', error);
      this.eventHandlers.onCallError(`Failed to accept call: ${error}`);
    }
  }

  public declineCall(callId: string): void {
    console.log(`❌ Declining call: ${callId}`);
    this.socket.emit('call_response', { callId, response: 'decline' });
    this.cleanup();
  }

  public endCall(): void {
    if (this.currentCall) {
      console.log(`📞 Ending call: ${this.currentCall.callId}`);
      this.socket.emit('end_call', { callId: this.currentCall.callId });
    }
    this.cleanup();
  }

  public toggleAudio(): boolean {
    this.isAudioMuted = !this.isAudioMuted;
    
    if (this.localStream) {
      const audioTracks = this.localStream.getAudioTracks();
      audioTracks.forEach((track: any) => {
        track.enabled = !this.isAudioMuted;
      });
    }

    console.log(`🎤 Audio ${this.isAudioMuted ? 'muted' : 'unmuted'}`);
    return !this.isAudioMuted;
  }

  public toggleVideo(): boolean {
    this.isVideoEnabled = !this.isVideoEnabled;
    
    if (this.localStream) {
      const videoTracks = this.localStream.getVideoTracks();
      videoTracks.forEach((track: any) => {
        track.enabled = this.isVideoEnabled;
      });
    }

    console.log(`📹 Video ${this.isVideoEnabled ? 'enabled' : 'disabled'}`);
    return this.isVideoEnabled;
  }

  public isAudioEnabled(): boolean {
    return !this.isAudioMuted;
  }

  public isVideoEnabledMethod(): boolean {
    return this.isVideoEnabled;
  }

  public getLocalStream(): any {
    return this.localStream;
  }

  public getRemoteStream(): any {
    return this.remoteStream;
  }

  public getCurrentCall(): CallData | null {
    return this.currentCall;
  }

  private async setupLocalStream(callType: 'voice' | 'video'): Promise<void> {
    try {
      console.log(`🎥 Setting up ${callType} stream...`);

      if (Platform.OS === 'web') {
        const getUserMediaFunc = getUserMedia();
        if (!getUserMediaFunc) {
          throw new Error('getUserMedia not supported');
        }

        const constraints = {
          audio: true,
          video: callType === 'video' ? {
            width: { min: 320, ideal: 640, max: 1280 },
            height: { min: 240, ideal: 480, max: 720 },
            frameRate: { min: 15, ideal: 30 }
          } : false,
        };

        this.localStream = await getUserMediaFunc.call(navigator.mediaDevices, constraints);
        this.isVideoEnabled = callType === 'video';
      } else {
        // For native platforms (iOS/Android), create mock stream
        console.log('📱 Creating mock media stream for native platform');
        this.localStream = new MockMediaStream();
        this.isVideoEnabled = callType === 'video';
        
        // Simulate stream setup delay
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      this.eventHandlers.onLocalStream(this.localStream);
      console.log('✅ Local stream obtained successfully');
      
    } catch (error) {
      console.error('Error getting local stream:', error);
      throw new Error('Failed to access camera/microphone');
    }
  }

  private createPeerConnection(): void {
    if (Platform.OS !== 'web') return;

    const RTCPeerConnectionClass = getRTCPeerConnection();
    if (!RTCPeerConnectionClass) {
      throw new Error('WebRTC not supported');
    }

    this.peerConnection = new RTCPeerConnectionClass(this.rtcConfig);

    this.peerConnection.onicecandidate = (event: any) => {
      if (event.candidate && this.currentCall) {
        this.socket.emit('webrtc_ice_candidate', {
          callId: this.currentCall.callId,
          candidate: event.candidate,
        });
      }
    };

    this.peerConnection.ontrack = (event: any) => {
      console.log('📺 Received remote stream');
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
        this.eventHandlers.onRemoteStream(this.remoteStream);
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      console.log('🔗 Connection state:', this.peerConnection?.connectionState);
      if (this.peerConnection?.connectionState === 'connected' && this.currentCall) {
        this.currentCall.status = 'connected';
      }
    };
  }

  // Event handlers
  private handleIncomingCall(data: any): void {
    console.log('📞 Incoming call received:', data);
    
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
    console.log('📞 Call initiated:', data);
    
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
    console.log('✅ Call accepted:', data);
    
    if (this.currentCall) {
      this.currentCall.status = 'connecting';
      this.eventHandlers.onCallAccepted(data.callId);

      // Create and send offer if we're the caller and on web
      if (!this.currentCall.isIncoming && Platform.OS === 'web' && this.peerConnection) {
        try {
          const offer = await this.peerConnection.createOffer();
          await this.peerConnection.setLocalDescription(offer);
          
          this.socket.emit('webrtc_offer', {
            callId: data.callId,
            offer: offer,
          });
        } catch (error) {
          console.error('Error creating offer:', error);
          this.eventHandlers.onCallError('Failed to create call offer');
        }
      } else if (Platform.OS !== 'web') {
        // For native platforms, simulate connection
        setTimeout(() => {
          this.remoteStream = new MockMediaStream();
          this.eventHandlers.onRemoteStream(this.remoteStream);
          if (this.currentCall) {
            this.currentCall.status = 'connected';
          }
        }, 1000);
      }
    }
  }

  private handleCallDeclined(data: any): void {
    console.log('❌ Call declined:', data);
    this.eventHandlers.onCallDeclined(data.callId, data.reason);
    this.cleanup();
  }

  private handleCallEnded(data: any): void {
    console.log('📞 Call ended:', data);
    this.eventHandlers.onCallEnded(data.callId, data.reason);
    this.cleanup();
  }

  private handleCallError(data: any): void {
    console.error('☎️ Call error:', data);
    this.eventHandlers.onCallError(data.message);
    this.cleanup();
  }

  private async handleWebRTCOffer(data: any): Promise<void> {
    if (Platform.OS !== 'web' || !this.peerConnection) return;

    console.log('📨 Received WebRTC offer');
    
    try {
      await this.peerConnection.setRemoteDescription(data.offer);
      
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
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
    if (Platform.OS !== 'web' || !this.peerConnection) return;

    console.log('📨 Received WebRTC answer');
    
    try {
      await this.peerConnection.setRemoteDescription(data.answer);
    } catch (error) {
      console.error('Error handling WebRTC answer:', error);
      this.eventHandlers.onCallError('Failed to handle call answer');
    }
  }

  private async handleICECandidate(data: any): Promise<void> {
    if (Platform.OS !== 'web' || !this.peerConnection) return;

    console.log('🧊 Received ICE candidate');
    
    try {
      await this.peerConnection.addIceCandidate(data.candidate);
    } catch (error) {
      console.error('Error adding ICE candidate:', error);
    }
  }

  private cleanup(): void {
    console.log('🧹 Cleaning up call resources');
    
    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Release local stream
    if (this.localStream) {
      if (this.localStream.getTracks) {
        this.localStream.getTracks().forEach((track: any) => track.stop());
      } else if (this.localStream.stop) {
        this.localStream.stop();
      }
      this.localStream = null;
    }

    // Clear remote stream
    this.remoteStream = null;

    // Clear current call
    this.currentCall = null;

    // Reset states
    this.isAudioMuted = false;
    this.isVideoEnabled = false;
  }

  public disconnect(): void {
    this.cleanup();
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}

export default ExpoWebRTCCallingService;