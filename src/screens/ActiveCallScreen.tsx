import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
// Mock RTCView for Expo compatibility
const RTCView: React.FC<{
  streamURL?: string;
  style?: any;
  objectFit?: string;
}> = ({ streamURL, style, objectFit }) => (
  <View
    style={[
      style,
      {
        backgroundColor: "#000",
        justifyContent: "center",
        alignItems: "center",
      },
    ]}
  >
    <Text style={{ color: "white", fontSize: 16 }}>
      {streamURL ? "Video Stream" : "No Stream"}
    </Text>
  </View>
);
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import { MessagesStackParamList } from "@/navigation/types";
import { useCommunication } from "@/contexts/CommunicationContext";
import { CallData } from "@/services/WebRTCCallingService";

const { width, height } = Dimensions.get("window");

type ActiveCallScreenRouteProp = RouteProp<
  MessagesStackParamList,
  "ActiveCallScreen"
>;

const ActiveCallScreen: React.FC = () => {
  const route = useRoute<ActiveCallScreenRouteProp>();
  const navigation = useNavigation();
  const {
    endCall,
    toggleMute: contextToggleMute,
    toggleVideo: contextToggleVideo,
    isAudioEnabled,
    isVideoEnabled,
    currentCallData,
    localStream,
    remoteStream,
  } = useCommunication();

  const callData = currentCallData || route.params?.callData;
  const [muted, setMuted] = useState(!isAudioEnabled());
  const [cameraOn, setCameraOn] = useState(isVideoEnabled());

  useEffect(() => {
    setCameraOn(isVideoEnabled());
    setMuted(!isAudioEnabled());
  }, [localStream, isAudioEnabled, isVideoEnabled]);

  const toggleMute = () => {
    const newMuteState = contextToggleMute();
    setMuted(!newMuteState);
  };

  const toggleVideo = () => {
    const newVideoState = contextToggleVideo();
    setCameraOn(newVideoState);
  };

  const handleEndCall = () => {
    if (callData?.callId) {
      endCall(callData.callId);
    }
    if (navigation) {
      navigation.goBack();
    }
  };

  if (!callData) {
    if (navigation) {
      navigation.goBack();
    }
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.remoteVideoContainer}>
        {remoteStream ? (
          <RTCView
            streamURL={
              remoteStream.toURL ? remoteStream.toURL() : "mock://remote-stream"
            }
            style={styles.remoteVideo}
            objectFit="cover"
          />
        ) : (
          <View style={styles.remotePlaceholder}>
            <Text style={styles.placeholderText}>
              Waiting for participant...
            </Text>
          </View>
        )}
      </View>

      {cameraOn && localStream && (
        <View style={styles.localVideoContainer}>
          <RTCView
            streamURL={
              localStream.toURL ? localStream.toURL() : "mock://local-stream"
            }
            style={styles.localVideo}
            objectFit="cover"
          />
        </View>
      )}

      <View style={styles.controlsContainer}>
        <TouchableOpacity style={styles.controlButton} onPress={toggleMute}>
          <Ionicons name={muted ? "mic-off" : "mic"} size={26} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, styles.endCallButton]}
          onPress={handleEndCall}
        >
          <Ionicons name="call" size={26} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton} onPress={toggleVideo}>
          <Ionicons
            name={cameraOn ? "videocam" : "videocam-off"}
            size={26}
            color="#fff"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.callInfo}>
        <Text style={styles.callerName}>
          {callData.participantName || "Unknown"}
        </Text>
        <Text style={styles.callState}>{callData.status || "Connecting"}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  remoteVideoContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  remoteVideo: {
    width: "100%",
    height: "100%",
  },
  remotePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    color: "#fff",
  },
  localVideoContainer: {
    position: "absolute",
    right: 16,
    top: 40,
    width: 140,
    height: 200,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#222",
  },
  localVideo: {
    width: "100%",
    height: "100%",
  },
  controlsContainer: {
    position: "absolute",
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  controlButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  endCallButton: {
    backgroundColor: "#ff4757",
  },
  callInfo: {
    position: "absolute",
    top: 40,
    left: 20,
  },
  callerName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  callState: {
    color: "#ccc",
    fontSize: 14,
    marginTop: 4,
  },
});

export default ActiveCallScreen;
