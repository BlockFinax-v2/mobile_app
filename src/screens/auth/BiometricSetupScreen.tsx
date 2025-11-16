/**
 * Biometric Setup Screen
 *
 * Shown during wallet creation/import to allow users to enable biometric authentication
 * before going to the dashboard
 */

import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { useWallet } from "@/contexts/WalletContext";
import { RootStackParamList } from "@/navigation/types";
import { palette } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import React, { useEffect, useState } from "react";
import { Alert, Platform, StyleSheet, View } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

type NavigationProp = StackNavigationProp<RootStackParamList>;

import { StackScreenProps } from "@react-navigation/stack";

type BiometricSetupScreenProps = StackScreenProps<
  RootStackParamList,
  "BiometricSetup"
>;

export const BiometricSetupScreen: React.FC<BiometricSetupScreenProps> = ({
  route,
  navigation,
}) => {
  const { walletPassword, returnTo } = route.params;
  const { isBiometricAvailable, enableBiometricAuth } = useWallet();
  const [isEnabling, setIsEnabling] = useState(false);

  const handleComplete = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: returnTo }],
    });
  };

  // Check biometric availability on mount
  useEffect(() => {
    if (!isBiometricAvailable) {
      // If biometrics not available, skip setup
      handleComplete();
    }
  }, [isBiometricAvailable]);

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
        `${getBiometricTypeName()} has been enabled for your wallet. You can now unlock your wallet with biometric authentication.`,
        [{ text: "Continue", onPress: handleComplete }]
      );
    } catch (error) {
      console.error("Failed to enable biometric authentication:", error);
      Alert.alert(
        "Setup Failed",
        "Unable to enable biometric authentication. You can enable it later in settings.",
        [{ text: "Continue", onPress: handleComplete }]
      );
    } finally {
      setIsEnabling(false);
    }
  };

  const handleSkipBiometrics = () => {
    Alert.alert(
      "Skip Biometric Setup?",
      "You can enable biometric authentication later in your wallet settings.",
      [
        { text: "Go Back", style: "cancel" },
        { text: "Skip", onPress: handleComplete },
      ]
    );
  };

  const getBiometricTypeName = () => {
    if (Platform.OS === "ios") {
      return "Face ID / Touch ID";
    }
    return "Fingerprint / Face Recognition";
  };

  const getBiometricIcon = () => {
    if (Platform.OS === "ios") {
      return "face-recognition";
    }
    return "fingerprint";
  };

  // Don't render if biometrics not available
  if (!isBiometricAvailable) {
    return null;
  }

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.iconContainer}>
          <View style={styles.iconBackground}>
            <MaterialCommunityIcons
              name={getBiometricIcon()}
              size={48}
              color={palette.primaryBlue}
            />
          </View>
        </View>

        <View style={styles.content}>
          <Text
            variant="title"
            color={palette.primaryBlue}
            style={styles.title}
          >
            Secure Your Wallet
          </Text>

          <Text style={styles.description}>
            Enable {getBiometricTypeName()} to unlock your wallet quickly and
            securely. Your biometric data stays on your device and is never
            shared.
          </Text>

          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <MaterialCommunityIcons
                name="flash"
                size={20}
                color={palette.accentGreen}
              />
              <Text style={styles.benefitText}>
                Quick access to your wallet
              </Text>
            </View>

            <View style={styles.benefitItem}>
              <MaterialCommunityIcons
                name="shield-check"
                size={20}
                color={palette.accentGreen}
              />
              <Text style={styles.benefitText}>Enhanced security</Text>
            </View>

            <View style={styles.benefitItem}>
              <MaterialCommunityIcons
                name="cellphone-lock"
                size={20}
                color={palette.accentGreen}
              />
              <Text style={styles.benefitText}>Device-only authentication</Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <Button
            label={`Enable ${getBiometricTypeName()}`}
            onPress={handleEnableBiometrics}
            loading={isEnabling}
            style={styles.primaryButton}
          />

          <Button
            label="Skip for Now"
            variant="outline"
            onPress={handleSkipBiometrics}
            disabled={isEnabling}
            style={styles.secondaryButton}
          />
        </View>

        <Text style={styles.footerNote}>
          You can change this setting anytime in your wallet preferences.
        </Text>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
    gap: spacing.xl,
  },
  iconContainer: {
    alignItems: "center",
  },
  iconBackground: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: palette.primaryBlue + "15",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    gap: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    color: palette.neutralMid,
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 320,
  },
  benefitsList: {
    gap: spacing.md,
    alignSelf: "stretch",
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  benefitText: {
    fontSize: 16,
    color: palette.neutralDark,
    flex: 1,
  },
  actions: {
    gap: spacing.md,
    alignSelf: "stretch",
  },
  primaryButton: {
    backgroundColor: palette.primaryBlue,
  },
  secondaryButton: {
    borderColor: palette.neutralLighter,
  },
  footerNote: {
    fontSize: 12,
    color: palette.neutralMid,
    textAlign: "center",
    fontStyle: "italic",
  },
});
