import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { useWallet } from "@/contexts/WalletContext";
import { ProfileStackParamList } from "@/navigation/types";
import { palette } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  View,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

type SettingsScreenNavigationProp = StackNavigationProp<
  ProfileStackParamList,
  "Settings"
>;

export const SettingsScreen: React.FC = () => {
  const {
    settings,
    updateSettings,
    lockWallet,
    lastUnlockTime,
    enableBiometricAuth,
    disableBiometricAuth,
    isBiometricAvailable,
    resetWalletData,
  } = useWallet();
  const navigation = useNavigation<SettingsScreenNavigationProp>();
  const [pendingUpdate, setPendingUpdate] = useState<
    "enableBiometrics" | "notificationsEnabled" | "resetWallet" | null
  >(null);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [biometricPassword, setBiometricPassword] = useState("");
  const [biometricError, setBiometricError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const handleToggle = async (
    key: "enableBiometrics" | "notificationsEnabled",
    value: boolean
  ) => {
    try {
      setPendingUpdate(key);
      await updateSettings({ [key]: value });
    } catch {
      Alert.alert(
        "Update Failed",
        "Unable to update your preference. Try again."
      );
    } finally {
      setPendingUpdate(null);
    }
  };

  const handleBiometricToggle = (value: boolean) => {
    if (value) {
      if (!isBiometricAvailable) {
        Alert.alert(
          "Biometrics Unavailable",
          "Your device does not support fingerprint or Face ID authentication."
        );
        return;
      }
      setBiometricError(null);
      setBiometricPassword("");
      setShowBiometricPrompt(true);
      return;
    }

    Alert.alert(
      "Disable Biometrics",
      "You'll need to enter your password each time you unlock your wallet.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disable",
          style: "destructive",
          onPress: async () => {
            try {
              setPendingUpdate("enableBiometrics");
              await disableBiometricAuth();
            } catch (error) {
              Alert.alert(
                "Unable to Disable",
                "Something went wrong while disabling biometric login."
              );
            } finally {
              setPendingUpdate(null);
            }
          },
        },
      ]
    );
  };

  const confirmEnableBiometrics = async () => {
    if (!biometricPassword.trim()) {
      setBiometricError("Password is required to enable biometrics.");
      return;
    }

    setPendingUpdate("enableBiometrics");
    try {
      await enableBiometricAuth(biometricPassword.trim());
      setShowBiometricPrompt(false);
      setBiometricPassword("");
      setBiometricError(null);
    } catch (error) {
      console.error("Biometric enable failed", error);
      setBiometricError("Password validation failed. Double-check and retry.");
    } finally {
      setPendingUpdate(null);
    }
  };

  const handleResetWallet = () => {
    Alert.alert(
      "Reset Wallet Data",
      "This clears wallet secrets and settings on this device. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            setIsResetting(true);
            setPendingUpdate("resetWallet");
            try {
              await resetWalletData();
              Alert.alert(
                "Wallet Reset",
                "Local wallet data cleared. You'll need to import or create a new wallet."
              );
            } catch (error) {
              Alert.alert(
                "Reset Failed",
                "We couldn't clear the wallet data. Try again."
              );
            } finally {
              setIsResetting(false);
              setPendingUpdate(null);
            }
          },
        },
      ]
    );
  };

  return (
    <Screen>
      <View style={styles.card}>
        <Text variant="subtitle" color={palette.primaryBlue}>
          Blockchain Networks
        </Text>
        <Pressable
          style={styles.networkRow}
          onPress={() => navigation.navigate("NetworkConfig")}
        >
          <View style={styles.networkRowLeft}>
            <MaterialCommunityIcons
              name="earth"
              size={24}
              color={palette.primaryBlue}
            />
            <View>
              <Text style={styles.networkRowTitle}>Network Configuration</Text>
              <Text variant="small" color={palette.neutralMid}>
                Manage blockchain networks and RPC endpoints
              </Text>
            </View>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
            color={palette.neutralMid}
          />
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text variant="subtitle" color={palette.primaryBlue}>
          Security
        </Text>
        <View style={styles.row}>
          <Text>Enable Biometrics</Text>
          <Switch
            value={settings.enableBiometrics}
            onValueChange={handleBiometricToggle}
            disabled={
              pendingUpdate === "enableBiometrics" || !isBiometricAvailable
            }
          />
        </View>
        <Text variant="small" color={palette.neutralMid}>
          Use Face ID or fingerprint to unlock your wallet on this device.
        </Text>
        {!isBiometricAvailable ? (
          <Text variant="small" color={palette.errorRed}>
            Biometrics aren't available on this device or no fingerprint is
            enrolled.
          </Text>
        ) : null}
        <Button
          label="Lock Wallet"
          variant="outline"
          onPress={lockWallet}
          style={styles.button}
        />
      </View>

      <View style={styles.card}>
        <Text variant="subtitle" color={palette.primaryBlue}>
          Notifications
        </Text>
        <View style={styles.row}>
          <Text>Payment Reminders</Text>
          <Switch
            value={settings.notificationsEnabled}
            onValueChange={(value) =>
              handleToggle("notificationsEnabled", value)
            }
            disabled={pendingUpdate === "notificationsEnabled"}
          />
        </View>
        <Button
          label="Notification Preferences"
          variant="outline"
          style={styles.button}
        />
      </View>

      <View style={styles.card}>
        <Text variant="subtitle" color={palette.primaryBlue}>
          Session
        </Text>
        <Text>
          Last unlock:{" "}
          {lastUnlockTime
            ? lastUnlockTime.toLocaleString()
            : "Not unlocked yet"}
        </Text>
        <Text variant="small" color={palette.neutralMid}>
          Wallet auto-locks after 15 minutes of inactivity or when the app moves
          to the background.
        </Text>
        <Button
          label="Reset Wallet Data"
          onPress={handleResetWallet}
          loading={isResetting}
          style={[styles.button, styles.resetButton]}
          disabled={pendingUpdate === "resetWallet"}
        />
      </View>

      <Modal
        visible={showBiometricPrompt}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (pendingUpdate !== "enableBiometrics") {
            setBiometricPassword("");
            setBiometricError(null);
            setShowBiometricPrompt(false);
          }
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text variant="subtitle" style={styles.modalTitle}>
              Confirm Password
            </Text>
            <Text variant="small" color={palette.neutralMid}>
              Enter your wallet password to enable biometric unlock on this
              device.
            </Text>
            <Input
              label="Wallet Password"
              value={biometricPassword}
              onChangeText={(text) => {
                setBiometricPassword(text);
                if (biometricError) {
                  setBiometricError(null);
                }
              }}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            {biometricError ? (
              <Text variant="small" color={palette.errorRed}>
                {biometricError}
              </Text>
            ) : null}
            <View style={styles.modalActions}>
              <Button
                label="Cancel"
                variant="outline"
                onPress={() => {
                  if (pendingUpdate !== "enableBiometrics") {
                    setBiometricPassword("");
                    setBiometricError(null);
                    setShowBiometricPrompt(false);
                  }
                }}
              />
              <Button
                label="Enable"
                onPress={confirmEnableBiometrics}
                loading={pendingUpdate === "enableBiometrics"}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.white,
    borderRadius: 24,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  button: {
    width: 220,
  },
  resetButton: {
    backgroundColor: palette.errorRed,
  },
  networkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  networkRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
  },
  networkRowTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.neutralDark,
    marginBottom: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalCard: {
    width: "100%",
    borderRadius: 24,
    backgroundColor: palette.white,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalTitle: {
    color: palette.primaryBlue,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
  },
});
