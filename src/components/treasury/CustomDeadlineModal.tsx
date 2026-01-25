/**
 * Custom Deadline Component for Treasury Portal
 *
 * Allows users to extend their stake lock period
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Modal,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { stakingService } from "@/services/stakingService";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

interface CustomDeadlineModalProps {
  visible: boolean;
  currentDeadline: number;
  isFinancier: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CustomDeadlineModal({
  visible,
  currentDeadline,
  isFinancier,
  onClose,
  onSuccess,
}: CustomDeadlineModalProps) {
  const [days, setDays] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const minDays = isFinancier ? 180 : 30;
  const currentRemainingDays = Math.max(
    0,
    Math.ceil((currentDeadline - Date.now() / 1000) / 86400),
  );

  const handleSetDeadline = useCallback(async () => {
    const daysNum = parseInt(days);

    if (isNaN(daysNum) || daysNum < minDays) {
      Alert.alert(
        "Invalid Days",
        `Minimum lock period is ${minDays} days for ${isFinancier ? "financiers" : "normal stakers"}.`,
      );
      return;
    }

    const newDeadline = stakingService.calculateDeadlineFromDays(daysNum);
    const newDeadlineDate = new Date(newDeadline * 1000);

    Alert.alert(
      "Set Custom Deadline",
      `This will extend your lock period to:\n\n${newDeadlineDate.toLocaleDateString()} (${daysNum} days)\n\nYou cannot reduce your lock period. Continue?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            setIsProcessing(true);
            try {
              await stakingService.setCustomDeadline(
                newDeadline,
                (stage, message) => {
                  console.log(`Custom Deadline - ${stage}: ${message}`);
                },
              );

              Alert.alert(
                "Deadline Updated",
                `Your new unlock date is ${newDeadlineDate.toLocaleDateString()}`,
              );

              setDays("");
              if (onSuccess) onSuccess();
              onClose();
            } catch (error: any) {
              console.error("Set deadline failed:", error);
              Alert.alert("Update Failed", error.message);
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ],
    );
  }, [days, minDays, isFinancier, onClose, onSuccess]);

  const quickSelectDays = (numDays: number) => {
    setDays(numDays.toString());
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Set Custom Lock Period</Text>
            <TouchableOpacity onPress={onClose} disabled={isProcessing}>
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.currentInfo}>
            <Text style={styles.infoLabel}>Current Lock Period</Text>
            <Text style={styles.infoValue}>
              {currentRemainingDays} days remaining
            </Text>
            <Text style={styles.infoSubtext}>
              Unlocks on {new Date(currentDeadline * 1000).toLocaleDateString()}
            </Text>
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>
              New Lock Period (minimum {minDays} days)
            </Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                value={days}
                onChangeText={setDays}
                placeholder={`Enter days (min ${minDays})`}
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
                editable={!isProcessing}
              />
              <Text style={styles.inputSuffix}>days</Text>
            </View>

            {days && parseInt(days) >= minDays && (
              <Text style={styles.previewText}>
                New unlock date:{" "}
                {new Date(
                  stakingService.calculateDeadlineFromDays(parseInt(days)) *
                    1000,
                ).toLocaleDateString()}
              </Text>
            )}
          </View>

          {/* Quick select buttons */}
          <View style={styles.quickSelectSection}>
            <Text style={styles.quickSelectLabel}>Quick Select:</Text>
            <View style={styles.quickSelectButtons}>
              {[30, 60, 90, 180, 365].map((numDays) => (
                <TouchableOpacity
                  key={numDays}
                  style={[
                    styles.quickSelectButton,
                    days === numDays.toString() &&
                      styles.quickSelectButtonActive,
                  ]}
                  onPress={() => quickSelectDays(numDays)}
                  disabled={isProcessing}
                >
                  <Text
                    style={[
                      styles.quickSelectButtonText,
                      days === numDays.toString() &&
                        styles.quickSelectButtonTextActive,
                    ]}
                  >
                    {numDays}d
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.warningBox}>
            <MaterialCommunityIcons
              name="information"
              size={20}
              color={colors.warning}
            />
            <Text style={styles.warningText}>
              You can only increase your lock period, not reduce it. Choose
              carefully.
            </Text>
          </View>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={onClose}
              disabled={isProcessing}
            >
              <Text style={[styles.buttonText, styles.buttonTextSecondary]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.buttonPrimary,
                (!days || parseInt(days) < minDays || isProcessing) &&
                  styles.buttonDisabled,
              ]}
              onPress={handleSetDeadline}
              disabled={!days || parseInt(days) < minDays || isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <MaterialCommunityIcons
                    name="calendar-check"
                    size={20}
                    color="white"
                  />
                  <Text style={styles.buttonText}>Set Deadline</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.lg,
    width: "90%",
    maxWidth: 500,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  currentInfo: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  infoLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 4,
  },
  infoSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  inputSection: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  inputSuffix: {
    fontSize: 16,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
  previewText: {
    fontSize: 14,
    color: colors.primary,
    marginTop: spacing.sm,
    fontWeight: "500",
  },
  quickSelectSection: {
    marginBottom: spacing.md,
  },
  quickSelectLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  quickSelectButtons: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  quickSelectButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  quickSelectButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  quickSelectButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
  },
  quickSelectButtonTextActive: {
    color: "white",
  },
  warningBox: {
    flexDirection: "row",
    backgroundColor: `${colors.warning}15`,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: colors.warning,
    marginLeft: spacing.sm,
    lineHeight: 18,
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    borderRadius: 8,
    gap: spacing.sm,
  },
  buttonPrimary: {
    backgroundColor: colors.primary,
  },
  buttonSecondary: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  buttonTextSecondary: {
    color: colors.text,
  },
});
