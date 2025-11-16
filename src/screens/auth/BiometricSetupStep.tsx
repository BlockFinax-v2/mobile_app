/**
 * Biometric Setup Step
 *
 * Component used within the wallet creation flow to setup biometric authentication
 */

import { Button } from "@/components/ui/Button";
import { Text } from "@/components/ui/Text";
import { useWallet } from "@/contexts/WalletContext";
import { palette } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import React, { useEffect, useState } from "react";
import { Alert, Platform, StyleSheet, View } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

interface BiometricSetupStepProps {
  walletPassword?: string;
  onComplete: () => void;
}

export const BiometricSetupStep: React.FC<BiometricSetupStepProps> = ({
  walletPassword,
  onComplete,
}) => {
  const { isBiometricAvailable, enableBiometricAuth } = useWallet();
  const [isEnabling, setIsEnabling] = useState(false);

  // If biometrics not available, skip to completion
  useEffect(() => {
    if (!isBiometricAvailable) {
      onComplete();
    }
  }, [isBiometricAvailable, onComplete]);

  const handleEnableBiometrics = async () => {
    if (!walletPassword) {
      Alert.alert(
        "Setup Error",
        "Wallet password is required to enable biometric authentication."
      );
      return;
    }

    setIsEnabling(true);
    try {
      await enableBiometricAuth(walletPassword);

      Alert.alert(
        "Success!",
        `${getBiometricTypeName()} has been enabled for your wallet.`,
        [{ text: "Continue", onPress: onComplete }]
      );
    } catch (error) {
      console.error("Failed to enable biometric authentication:", error);
      Alert.alert(
        "Setup Failed",
        "Unable to enable biometric authentication. You can enable it later in settings.",
        [{ text: "Continue", onPress: onComplete }]
      );
    } finally {
      setIsEnabling(false);
    }
  };

  const handleSkipBiometrics = () => {
    onComplete();
  };

  const getBiometricTypeName = () => {
    if (Platform.OS === "ios") {
      return "Face ID / Touch ID";
    }
    return "Fingerprint Authentication";
  };

  const getBiometricIcon = () => {
    if (Platform.OS === "ios") {
      return "face-recognition";
    }
    return "fingerprint";
  };

  // Don't render if biometrics not available
  if (!isBiometricAvailable) {
    return (
      <View style={styles.card}>
        <Text variant="title" color={palette.accentGreen}>
          Wallet Ready!
        </Text>
        <Text style={styles.bodyCopy}>
          Your BlockFinaX wallet is created and secured. You can now explore the
          dashboard and start managing your cross-border trades.
        </Text>
        <Button label="Go to Dashboard" onPress={onComplete} />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.iconContainer}>
        <MaterialCommunityIcons
          name={getBiometricIcon()}
          size={40}
          color={palette.primaryBlue}
        />
      </View>

      <Text variant="title" color={palette.primaryBlue}>
        Secure Your Wallet
      </Text>

      <Text style={styles.bodyCopy}>
        Enable {getBiometricTypeName()} for quick and secure access to your
        wallet. Your biometric data never leaves your device.
      </Text>

      <View style={styles.benefitsList}>
        <View style={styles.benefitItem}>
          <MaterialCommunityIcons
            name="flash"
            size={16}
            color={palette.accentGreen}
          />
          <Text style={styles.benefitText}>Quick wallet access</Text>
        </View>

        <View style={styles.benefitItem}>
          <MaterialCommunityIcons
            name="shield-check"
            size={16}
            color={palette.accentGreen}
          />
          <Text style={styles.benefitText}>Enhanced security</Text>
        </View>
      </View>

      <Button
        label={`Enable ${getBiometricTypeName()}`}
        onPress={handleEnableBiometrics}
        loading={isEnabling}
      />

      <Button
        label="Skip for Now"
        variant="outline"
        onPress={handleSkipBiometrics}
        disabled={isEnabling}
        style={styles.skipButton}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.white,
    borderRadius: 24,
    padding: spacing.lg,
    shadowColor: "#000000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 3,
    gap: spacing.md,
    alignItems: "center",
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: palette.primaryBlue + "15",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  bodyCopy: {
    color: palette.neutralMid,
    lineHeight: 20,
    textAlign: "center",
  },
  benefitsList: {
    gap: spacing.sm,
    alignSelf: "stretch",
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  benefitText: {
    fontSize: 14,
    color: palette.neutralDark,
  },
  skipButton: {
    marginTop: spacing.xs,
  },
});
