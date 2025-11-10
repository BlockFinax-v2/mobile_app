import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface RTCViewProps {
  streamURL?: string;
  style?: any;
  objectFit?: "cover" | "contain";
}

export const RTCView: React.FC<RTCViewProps> = ({
  streamURL,
  style,
  objectFit,
}) => {
  return (
    <View style={[styles.rtcView, style]}>
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>
          {streamURL?.includes("mock://") ? "📹 Video Stream" : "📺 Loading..."}
        </Text>
        <Text style={styles.streamInfo}>
          {streamURL ? `Stream: ${streamURL.split("/").pop()}` : "No stream"}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  rtcView: {
    backgroundColor: "#1a1a1a",
    borderRadius: 8,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  placeholder: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  placeholderText: {
    color: "#ffffff",
    fontSize: 24,
    marginBottom: 8,
  },
  streamInfo: {
    color: "#cccccc",
    fontSize: 12,
    fontFamily: "monospace",
  },
});

export default RTCView;
