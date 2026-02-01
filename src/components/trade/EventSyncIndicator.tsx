import React from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEventSyncStatus } from "@/hooks/usePGAEvents";
import { colors } from "@/theme/colors";

interface EventSyncIndicatorProps {
  showBlockNumber?: boolean;
  compact?: boolean;
}

/**
 * Visual indicator showing real-time blockchain sync status
 *
 * @example
 * ```tsx
 * // Full version with block number
 * <EventSyncIndicator showBlockNumber />
 *
 * // Compact version (just icon)
 * <EventSyncIndicator compact />
 * ```
 */
export const EventSyncIndicator: React.FC<EventSyncIndicatorProps> = ({
  showBlockNumber = false,
  compact = false,
}) => {
  const { lastSyncedBlock, isListening } = useEventSyncStatus();
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  // Pulse animation when listening
  React.useEffect(() => {
    if (isListening) {
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
  }, [isListening, pulseAnim]);

  if (compact) {
    return (
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <MaterialCommunityIcons
          name={isListening ? "access-point" : "access-point-off"}
          size={20}
          color={isListening ? colors.success : colors.textSecondary}
        />
      </Animated.View>
    );
  }

  return (
    <View style={styles.container}>
      <Animated.View
        style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}
      >
        <MaterialCommunityIcons
          name={isListening ? "access-point" : "access-point-off"}
          size={16}
          color={isListening ? colors.success : colors.textSecondary}
        />
      </Animated.View>

      <View style={styles.textContainer}>
        <Text
          style={[styles.statusText, isListening && styles.statusTextActive]}
        >
          {isListening ? "Live" : "Offline"}
        </Text>

        {showBlockNumber && lastSyncedBlock > 0 && (
          <Text style={styles.blockText}>
            Block {lastSyncedBlock.toLocaleString()}
          </Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconContainer: {
    marginRight: 6,
  },
  textContainer: {
    flexDirection: "column",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  statusTextActive: {
    color: colors.success,
  },
  blockText: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
