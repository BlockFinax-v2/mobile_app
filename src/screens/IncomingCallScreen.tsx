import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  Vibration,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useRoute, useNavigation } from "@react-navigation/native";
import { MessagesStackParamList } from "@/navigation/types";
import { useCommunication } from "@/contexts/CommunicationContext";
import { CallData } from "@/services/WebRTCCallingService";

const { width, height } = Dimensions.get("window");

type IncomingCallScreenRouteProp = RouteProp<
  MessagesStackParamList,
  "IncomingCallScreen"
>;

const IncomingCallScreen: React.FC = () => {
  const route = useRoute<IncomingCallScreenRouteProp>();
  const navigation = useNavigation();
  const { acceptCall, rejectCall, currentCallData } = useCommunication();
  const [isVibrating, setIsVibrating] = useState(false);

  const callData = route.params?.callData || currentCallData;

  useEffect(() => {
    // Start vibration pattern for incoming call
    const vibrationPattern = [0, 1000, 1000];
    Vibration.vibrate(vibrationPattern, true);
    setIsVibrating(true);

    return () => {
      Vibration.cancel();
      setIsVibrating(false);
    };
  }, []);

  const handleAccept = () => {
    Vibration.cancel();
    if (callData?.callId) {
      acceptCall(callData.callId);
    }
  };

  const handleDecline = () => {
    Vibration.cancel();
    if (callData?.callId) {
      rejectCall(callData.callId);
    }
    if (navigation) {
      navigation.goBack();
    }
  };

  const getCallTypeIcon = () => {
    return callData?.callType === "video" ? "videocam" : "call";
  };

  const getCallTypeText = () => {
    return callData?.callType === "video" ? "Video Call" : "Voice Call";
  };

  if (!callData) {
    if (navigation) {
      navigation.goBack();
    }
    return null;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />

      {/* Background overlay */}
      <View style={styles.overlay} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.callTypeText}>{getCallTypeText()}</Text>
        <Text style={styles.incomingText}>Incoming call</Text>
      </View>

      {/* Caller info */}
      <View style={styles.callerInfo}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, isVibrating && styles.avatarPulse]}>
            <Text style={styles.avatarText}>
              {(callData?.participantName || "U").charAt(0).toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Caller details */}
        <Text style={styles.callerName}>
          {callData?.participantName || "Unknown Caller"}
        </Text>
        <Text
          style={styles.callerAddress}
          numberOfLines={1}
          ellipsizeMode="middle"
        >
          {callData?.participantAddress || "No Address"}
        </Text>

        {/* Call type icon */}
        <View style={styles.callTypeContainer}>
          <Ionicons
            name={getCallTypeIcon()}
            size={24}
            color="#ffffff"
            style={styles.callTypeIcon}
          />
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actionContainer}>
        <View style={styles.buttonsContainer}>
          {/* Decline button */}
          <TouchableOpacity
            style={[styles.actionButton, styles.declineButton]}
            onPress={handleDecline}
            activeOpacity={0.8}
          >
            <Ionicons name="call" size={32} color="#ffffff" />
          </TouchableOpacity>

          {/* Accept button */}
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={handleAccept}
            activeOpacity={0.8}
          >
            <Ionicons name="call" size={32} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Action labels */}
        <View style={styles.labelsContainer}>
          <Text style={styles.actionLabel}>Decline</Text>
          <Text style={styles.actionLabel}>Accept</Text>
        </View>
      </View>

      {/* Additional options */}
      <View style={styles.optionsContainer}>
        <TouchableOpacity style={styles.optionButton}>
          <Ionicons name="chatbubble" size={24} color="#ffffff" />
          <Text style={styles.optionText}>Message</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.optionButton}>
          <Ionicons name="person-add" size={24} color="#ffffff" />
          <Text style={styles.optionText}>Remind Me</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    justifyContent: "space-between",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  callTypeText: {
    fontSize: 16,
    color: "#ffffff",
    fontWeight: "500",
    marginBottom: 4,
  },
  incomingText: {
    fontSize: 14,
    color: "#cccccc",
  },
  callerInfo: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  avatarContainer: {
    marginBottom: 30,
  },
  avatar: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#4a9eff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#ffffff",
  },
  avatarPulse: {
    shadowColor: "#4a9eff",
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 20,
  },
  avatarText: {
    fontSize: 48,
    color: "#ffffff",
    fontWeight: "bold",
  },
  callerName: {
    fontSize: 28,
    color: "#ffffff",
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  callerAddress: {
    fontSize: 16,
    color: "#cccccc",
    textAlign: "center",
    marginBottom: 20,
  },
  callTypeContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  callTypeIcon: {
    marginRight: 8,
  },
  actionContainer: {
    paddingBottom: 80,
    paddingHorizontal: 60,
  },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  actionButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  declineButton: {
    backgroundColor: "#ff4757",
    transform: [{ rotate: "135deg" }],
  },
  acceptButton: {
    backgroundColor: "#2ed573",
  },
  labelsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 5,
  },
  actionLabel: {
    fontSize: 14,
    color: "#cccccc",
    textAlign: "center",
  },
  optionsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingBottom: 40,
    paddingHorizontal: 40,
  },
  optionButton: {
    alignItems: "center",
    padding: 15,
  },
  optionText: {
    fontSize: 12,
    color: "#cccccc",
    marginTop: 8,
  },
});

export default IncomingCallScreen;
