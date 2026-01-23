import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";
import { useCommunication } from "../../contexts/CommunicationContext";

// RTCView replacement for Expo compatibility
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


interface CallingScreenProps {
  contactAddress: string;
  callType: "voice" | "video";
  isIncoming: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onEndCall: () => void;
}

const { width, height } = Dimensions.get("window");

export const CallingScreen: React.FC<CallingScreenProps> = ({
  contactAddress,
  callType,
  isIncoming,
  onAccept,
  onDecline,
  onEndCall,
}) => {
  const { contacts, currentCall, localStream,
    // remoteStream
  } = useCommunication();

  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(callType === "video");
  const contact = contacts.find((c) => c.address === contactAddress);
  const contactName = contact?.name || `User ${contactAddress.slice(-4)}`;

  useEffect(() => {
    if (currentCall?.status === "connected") {
      const timer = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [currentCall?.status]);

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  const getCallStatus = () => {
    if (isIncoming) return "Incoming call...";
    if (currentCall?.status === "connecting") return "Connecting...";
    if (currentCall?.status === "ringing") return "Ringing...";
    if (currentCall?.status === "connected")
      return formatDuration(callDuration);
    return "Calling...";
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    // Here you would integrate with WebRTC to actually mute/unmute
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
    // Here you would integrate with WebRTC to toggle speaker
  };

  const toggleVideo = () => {
    setIsVideoOn(!isVideoOn);
    // Here you would integrate with WebRTC to toggle video
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="rgba(0,0,0,0.8)" />

      {/* Video Views */}
      {callType === "video" && isVideoOn && (
        <>
          {/* Remote Video (Full Screen) */}
          <View style={styles.remoteVideoContainer}>
            {currentCall?.remoteStream && (
              <RTCView
                style={styles.remoteVideo}
                streamURL={currentCall.remoteStream.toURL()}
                objectFit="cover"
              />
            )}
            {(!currentCall?.remoteStream || !isVideoOn) && (
              <View style={styles.avatarContainer}>
                <View style={styles.contactAvatar}>
                  <Text style={styles.avatarText}>
                    {contactAddress.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Local Video (Picture-in-Picture) */}
          <View style={styles.localVideoContainer}>
            {currentCall?.localStream && (
              <RTCView
                style={{ width: "100%", height: "100%" }}
                streamURL={localStream?.toURL()}
                objectFit="cover"
              />
            )}
          </View>
        </>
      )}

      {/* Voice Call or Video Disabled View */}
      {(callType === "voice" || !isVideoOn) && (
        <View style={styles.voiceCallContainer}>
          <View style={styles.contactInfo}>
            <View style={styles.contactAvatar}>
              <Text style={styles.avatarText}>
                {contactAddress.slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.contactName}>{contactName}</Text>
            <Text style={styles.contactAddress} numberOfLines={1}>
              {contactAddress}
            </Text>
          </View>
        </View>
      )}

      {/* Call Info Overlay */}
      <View style={styles.overlay}>
        <View style={styles.callInfo}>
          <Text style={styles.callStatus}>{getCallStatus()}</Text>
          {callType === "video" && (
            <Text style={styles.callType}>Video Call</Text>
          )}
        </View>

        {/* Call Controls */}
        <View style={styles.controlsContainer}>
          {/* Incoming Call Controls */}
          {isIncoming && currentCall?.status !== "connected" && (
            <View style={styles.incomingControls}>
              <TouchableOpacity
                style={styles.declineButton}
                onPress={onDecline}
              >
                <MaterialCommunityIcons
                  name="phone-hangup"
                  size={32}
                  color="white"
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.acceptButton} onPress={onAccept}>
                <MaterialCommunityIcons name="phone" size={32} color="white" />
              </TouchableOpacity>
            </View>
          )}

          {/* Active Call Controls */}
          {currentCall?.status === "connected" && (
            <View style={styles.activeControls}>
              <View style={styles.controlsRow}>
                <TouchableOpacity
                  style={[
                    styles.controlButton,
                    isMuted && styles.controlButtonActive,
                  ]}
                  onPress={toggleMute}
                >
                  <MaterialCommunityIcons
                    name={isMuted ? "microphone-off" : "microphone"}
                    size={24}
                    color="white"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.controlButton,
                    isSpeakerOn && styles.controlButtonActive,
                  ]}
                  onPress={toggleSpeaker}
                >
                  <MaterialCommunityIcons
                    name={isSpeakerOn ? "volume-high" : "volume-medium"}
                    size={24}
                    color="white"
                  />
                </TouchableOpacity>

                {callType === "video" && (
                  <TouchableOpacity
                    style={[
                      styles.controlButton,
                      !isVideoOn && styles.controlButtonActive,
                    ]}
                    onPress={toggleVideo}
                  >
                    <MaterialCommunityIcons
                      name={isVideoOn ? "video" : "video-off"}
                      size={24}
                      color="white"
                    />
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={styles.endCallButton}
                onPress={onEndCall}
              >
                <MaterialCommunityIcons
                  name="phone-hangup"
                  size={32}
                  color="white"
                />
              </TouchableOpacity>
            </View>
          )}

          {/* Outgoing Call Controls */}
          {!isIncoming && currentCall?.status !== "connected" && (
            <View style={styles.outgoingControls}>
              <TouchableOpacity
                style={styles.endCallButton}
                onPress={onEndCall}
              >
                <MaterialCommunityIcons
                  name="phone-hangup"
                  size={32}
                  color="white"
                />
              </TouchableOpacity>
            </View>
          )}
        </View>
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
    width: width,
    height: height,
  },
  remoteVideo: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  localVideoContainer: {
    position: "absolute",
    top: 60,
    right: 16,
    width: 120,
    height: 160,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "white",
  },
  localVideo: {
    width: "100%",
    height: "100%",
  },
  voiceCallContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  contactInfo: {
    alignItems: "center",
  },
  contactAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  avatarText: {
    fontSize: 48,
    fontWeight: "bold",
    color: "white",
  },
  contactName: {
    fontSize: 28,
    fontWeight: "600",
    color: "white",
    marginBottom: spacing.sm,
  },
  contactAddress: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    fontFamily: "monospace",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "space-between",
    paddingTop: 60,
    paddingBottom: 60,
  },
  callInfo: {
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  callStatus: {
    fontSize: 18,
    color: "white",
    marginBottom: spacing.xs,
  },
  callType: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
  },
  controlsContainer: {
    alignItems: "center",
    paddingHorizontal: spacing.xl,
  },
  incomingControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: spacing.xl,
  },
  acceptButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#4CAF50",
    alignItems: "center",
    justifyContent: "center",
  },
  declineButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F44336",
    alignItems: "center",
    justifyContent: "center",
  },
  activeControls: {
    alignItems: "center",
    width: "100%",
  },
  controlsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: spacing.xl,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  controlButtonActive: {
    backgroundColor: colors.primary,
  },
  endCallButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#F44336",
    alignItems: "center",
    justifyContent: "center",
  },
  outgoingControls: {
    alignItems: "center",
  },
});
