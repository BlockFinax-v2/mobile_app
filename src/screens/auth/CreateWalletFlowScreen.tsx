import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { useWallet } from "@/contexts/WalletContext";
import { RootStackParamList } from "@/navigation/types";
import { palette } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { ethers } from "ethers";
import * as Clipboard from "expo-clipboard";
import * as Crypto from "expo-crypto";
import React, { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Alert,
  LayoutAnimation,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

type CreateWalletForm = {
  password: string;
  confirmations: Record<string, string>;
};

const strengthColors = [
  palette.errorRed,
  "#FF8A00",
  "#FFCA28",
  palette.accentGreen,
];

const getPasswordStrength = (password: string) => {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  return score;
};

// More robust mnemonic generation with fallback strategies
const generateSecureMnemonic = async (): Promise<string> => {
  try {
    // First attempt: Use ethers with proper crypto setup
    console.log("Attempting to generate mnemonic with ethers...");
    const wallet = ethers.Wallet.createRandom();
    if (wallet.mnemonic?.phrase) {
      console.log("Successfully generated mnemonic with ethers");
      return wallet.mnemonic.phrase;
    }
    throw new Error("Ethers mnemonic generation failed");
  } catch (ethersError) {
    console.warn("Ethers mnemonic generation failed:", ethersError);

    try {
      // Second attempt: Use expo-crypto for entropy + ethers utilities
      console.log("Attempting to generate mnemonic with expo-crypto...");
      const randomBytes = await Crypto.getRandomBytesAsync(16); // 128 bits for 12 words
      const entropy = Array.from(randomBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      const mnemonic = ethers.utils.entropyToMnemonic("0x" + entropy);
      console.log("Successfully generated mnemonic with expo-crypto");
      return mnemonic;
    } catch (expoCryptoError) {
      console.warn("Expo-crypto mnemonic generation failed:", expoCryptoError);

      // Third attempt: Fallback to manual entropy generation
      console.log("Using fallback manual entropy generation...");
      const fallbackEntropy = Array.from({ length: 32 }, () =>
        Math.floor(Math.random() * 256)
          .toString(16)
          .padStart(2, "0")
      ).join("");
      return ethers.utils.entropyToMnemonic("0x" + fallbackEntropy);
    }
  }
};

type NavigationProp = StackNavigationProp<RootStackParamList>;

export const CreateWalletFlowScreen: React.FC = () => {
  const { importWallet } = useWallet();
  const navigation = useNavigation<NavigationProp>();
  const [step, setStep] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mnemonic, setMnemonic] = useState<string>("");
  const [mnemonicError, setMnemonicError] = useState<string | null>(null);

  // Generate mnemonic on component mount
  useEffect(() => {
    const initializeMnemonic = async () => {
      try {
        setMnemonicError(null);
        console.log("Initializing mnemonic generation...");
        const generatedMnemonic = await generateSecureMnemonic();
        setMnemonic(generatedMnemonic);
        console.log("Mnemonic successfully generated");
      } catch (error) {
        console.error("Failed to generate mnemonic:", error);
        setMnemonicError("Failed to generate secure wallet. Please try again.");
      }
    };

    initializeMnemonic();
  }, []);

  const seedWords = useMemo(() => mnemonic.split(" "), [mnemonic]);
  const confirmationIndexes = useMemo(() => {
    if (seedWords.length < 12) return []; // Safety check
    const indices = new Set<number>();
    while (indices.size < 3) {
      indices.add(Math.floor(Math.random() * seedWords.length));
    }
    return Array.from(indices);
  }, [seedWords.length]);

  const { control, handleSubmit, watch } = useForm<CreateWalletForm>({
    defaultValues: {
      password: "",
      confirmations: confirmationIndexes.reduce(
        (acc, idx) => ({ ...acc, [idx]: "" }),
        {} as Record<number, string>
      ),
    },
    mode: "onChange",
  });

  const passwordValue = watch("password");
  const strength = getPasswordStrength(passwordValue);

  const goNext = () => {
    // Don't allow progression if there's a mnemonic error or no mnemonic
    if (step === 1 && (mnemonicError || !mnemonic)) {
      Alert.alert(
        "Error",
        "Cannot proceed without a valid seed phrase. Please retry generation."
      );
      return;
    }

    LayoutAnimation.easeInEaseOut();
    setStep((prev) => Math.min(prev + 1, 5));
  };

  const goBack = () => {
    LayoutAnimation.easeInEaseOut();
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleCopy = async () => {
    if (!mnemonic) {
      Alert.alert("Error", "No seed phrase available to copy");
      return;
    }
    await Clipboard.setStringAsync(mnemonic);
    Alert.alert(
      "Phrase Copied",
      "Store your seed phrase securely and never share it."
    );
  };

  const handleRetryMnemonic = async () => {
    setIsProcessing(true);
    try {
      setMnemonicError(null);
      const generatedMnemonic = await generateSecureMnemonic();
      setMnemonic(generatedMnemonic);
    } catch (error) {
      console.error("Retry mnemonic generation failed:", error);
      setMnemonicError(
        "Failed to generate secure wallet. Please check your internet connection and try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const onConfirmWords = (values: CreateWalletForm) => {
    const mismatches = confirmationIndexes.filter(
      (index) =>
        values.confirmations[index].trim().toLowerCase() !== seedWords[index]
    );
    if (mismatches.length > 0) {
      Alert.alert(
        "Verification Failed",
        "One or more words do not match. Please double-check."
      );
      return;
    }
    goNext();
  };

  const onCreate = async (values: CreateWalletForm) => {
    if (strength < 4) {
      Alert.alert(
        "Weak Password",
        "Please choose a strong password that meets all requirements."
      );
      return;
    }

    if (!mnemonic) {
      Alert.alert(
        "Error",
        "No seed phrase available. Please go back and generate a new one."
      );
      return;
    }

    setIsProcessing(true);
    try {
      console.log("Starting wallet import with generated mnemonic");
      await importWallet({ mnemonic, password: values.password });
      console.log("Wallet import successful");
      goNext();
    } catch (error) {
      console.error("Failed to finalize wallet", error);
      Alert.alert(
        "Wallet Creation Failed",
        error instanceof Error
          ? error.message
          : "Unable to create wallet. Please try again or contact support if the problem persists."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.progressBar}>
          {[1, 2, 3, 4, 5].map((item) => (
            <View
              key={item}
              style={[
                styles.progressStep,
                item <= step && styles.progressStepActive,
              ]}
            />
          ))}
        </View>

        {step === 1 && (
          <View style={styles.card}>
            <Text variant="title" color={palette.primaryBlue}>
              Security Notice
            </Text>
            <Text style={styles.bodyCopy}>
              You are about to create a non-custodial wallet. BlockFinaX never
              stores your private keys or seed phrase. Back up your recovery
              phrase securely. Losing it means losing access to your assets
              permanently.
            </Text>

            {mnemonicError && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{mnemonicError}</Text>
                <Button
                  label="Retry Generation"
                  variant="outline"
                  onPress={handleRetryMnemonic}
                  loading={isProcessing}
                />
              </View>
            )}

            {!mnemonic && !mnemonicError && (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>
                  Generating secure wallet...
                </Text>
              </View>
            )}

            <Button
              label="I Understand"
              onPress={goNext}
              disabled={!mnemonic || !!mnemonicError}
            />
          </View>
        )}

        {step === 2 && (
          <View style={styles.card}>
            <Text variant="title" color={palette.primaryBlue}>
              Your Seed Phrase
            </Text>
            <Text style={styles.bodyCopy}>
              Write these 12 words in order and store them offline. Anyone with
              this phrase can access your funds.
            </Text>

            {mnemonic && seedWords.length === 12 ? (
              <>
                <View style={styles.seedGrid}>
                  {seedWords.map((word, index) => (
                    <View key={word + index} style={styles.seedCell}>
                      <Text color={palette.neutralMid}>{index + 1}.</Text>
                      <Text style={styles.seedWord}>{word}</Text>
                    </View>
                  ))}
                </View>
                <Button
                  label="Copy Seed Phrase"
                  variant="outline"
                  onPress={handleCopy}
                />
                <Button
                  label="Continue"
                  style={styles.spacingTop}
                  onPress={goNext}
                />
              </>
            ) : (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>
                  Seed phrase generation failed. Please go back and retry.
                </Text>
                <Button label="Back" variant="outline" onPress={goBack} />
              </View>
            )}
          </View>
        )}

        {step === 3 && (
          <View style={styles.card}>
            <Text variant="title" color={palette.primaryBlue}>
              Confirm Your Seed Phrase
            </Text>
            <Text style={styles.bodyCopy}>
              Enter the requested words to verify you backed up your phrase
              correctly.
            </Text>

            {confirmationIndexes.length === 3 ? (
              <>
                {confirmationIndexes.map((index) => (
                  <Controller
                    key={index}
                    control={control}
                    name={`confirmations.${index}` as const}
                    rules={{ required: true }}
                    render={({ field: { onChange, value } }) => (
                      <Input
                        label={`Word #${index + 1}`}
                        value={value as string}
                        autoCapitalize="none"
                        autoCorrect={false}
                        onChangeText={onChange}
                        placeholder="Enter the seed word"
                      />
                    )}
                  />
                ))}
                <Button label="Verify" onPress={handleSubmit(onConfirmWords)} />
                <Button
                  label="Back"
                  variant="outline"
                  onPress={goBack}
                  style={styles.spacingTop}
                />
              </>
            ) : (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>
                  Unable to generate verification words. Please go back and
                  retry.
                </Text>
                <Button label="Back" variant="outline" onPress={goBack} />
              </View>
            )}
          </View>
        )}

        {step === 4 && (
          <View style={styles.card}>
            <Text variant="title" color={palette.primaryBlue}>
              Set Your Password
            </Text>
            <Text style={styles.bodyCopy}>
              Use at least 8 characters including uppercase, lowercase, number,
              and special character.
            </Text>
            <Controller
              control={control}
              name="password"
              rules={{
                required: true,
                validate: (value) =>
                  value.length >= 8 &&
                  /[A-Z]/.test(value) &&
                  /[a-z]/.test(value) &&
                  /[0-9]/.test(value) &&
                  /[^A-Za-z0-9]/.test(value),
              }}
              render={({ field: { onChange, value }, fieldState }) => (
                <Input
                  label="Wallet Password"
                  value={value}
                  onChangeText={onChange}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  helperText="This password unlocks your wallet on this device."
                  error={
                    fieldState.error
                      ? "Password does not meet the requirements."
                      : undefined
                  }
                />
              )}
            />
            <View style={styles.strengthBar}>
              {[0, 1, 2, 3].map((level) => (
                <View
                  key={level}
                  style={[
                    styles.strengthSegment,
                    {
                      backgroundColor:
                        level < strength
                          ? strengthColors[strength - 1]
                          : palette.neutralLighter,
                    },
                  ]}
                />
              ))}
            </View>
            <Button
              label="Create Wallet"
              onPress={handleSubmit(onCreate)}
              loading={isProcessing}
            />
            <Button
              label="Back"
              variant="outline"
              onPress={goBack}
              style={styles.spacingTop}
            />
          </View>
        )}

        {step === 5 && (
          <View style={styles.card}>
            <Text variant="title" color={palette.accentGreen}>
              Wallet Ready!
            </Text>
            <Text style={styles.bodyCopy}>
              Your BlockFinaX wallet is created and secured. You can now explore
              the dashboard and start managing your cross-border trades.
            </Text>
            <Button
              label="Go to Dashboard"
              onPress={() =>
                navigation.reset({
                  index: 0,
                  routes: [{ name: "App" }],
                })
              }
            />
          </View>
        )}
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  progressBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  progressStep: {
    flex: 1,
    height: 6,
    marginHorizontal: 4,
    borderRadius: 3,
    backgroundColor: palette.neutralLighter,
  },
  progressStepActive: {
    backgroundColor: palette.primaryBlue,
  },
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
  },
  bodyCopy: {
    color: palette.neutralMid,
    lineHeight: 20,
  },
  seedGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  seedCell: {
    width: "30%",
    backgroundColor: palette.surface,
    borderRadius: 12,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    alignItems: "flex-start",
    gap: spacing.xs,
  },
  seedWord: {
    fontWeight: "600",
  },
  spacingTop: {
    marginTop: spacing.sm,
  },
  strengthBar: {
    flexDirection: "row",
    gap: 6,
  },
  strengthSegment: {
    flex: 1,
    height: 8,
    borderRadius: 4,
  },
  errorContainer: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "#FECACA",
    gap: spacing.sm,
  },
  errorText: {
    color: palette.errorRed,
    fontWeight: "500",
    textAlign: "center",
  },
  loadingContainer: {
    backgroundColor: "#F0F9FF",
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  loadingText: {
    color: palette.primaryBlue,
    fontWeight: "500",
    textAlign: "center",
  },
});
