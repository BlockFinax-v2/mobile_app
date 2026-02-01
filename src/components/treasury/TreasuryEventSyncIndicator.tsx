import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { useEventSyncStatus } from "@/hooks/useTreasuryEvents";

export const TreasuryEventSyncIndicator: React.FC = () => {
  const { status, timeSinceSync, isSyncing, isSynced, hasError } =
    useEventSyncStatus();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isSyncing) {
      // Create pulsing animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isSyncing, pulseAnim]);

  const getStatusColor = () => {
    if (hasError) return "#EF4444";
    if (isSyncing) return "#F59E0B";
    if (isSynced) return "#10B981";
    return "#6B7280";
  };

  const getStatusText = () => {
    if (hasError) return "Sync Error";
    if (isSyncing) return "Syncing Events...";
    if (isSynced && timeSinceSync !== null) {
      if (timeSinceSync < 60) return `Synced ${timeSinceSync}s ago`;
      const minutes = Math.floor(timeSinceSync / 60);
      return `Synced ${minutes}m ago`;
    }
    return "Not Synced";
  };

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.indicator,
          {
            backgroundColor: getStatusColor(),
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />
      <Text style={[styles.text, { color: getStatusColor() }]}>
        {getStatusText()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    borderRadius: 16,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  text: {
    fontSize: 12,
    fontWeight: "500",
  },
});
