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
import React, { useMemo, useState } from "react";
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

type NavigationProp = StackNavigationProp<RootStackParamList>;

export const CreateWalletFlowScreen: React.FC = () => {
  const { importWallet } = useWallet();
  const navigation = useNavigation<NavigationProp>();
  const [step, setStep] = useState<number>(1);
  const [isProcessing, setIsProcessing] = useState(false);

  const mnemonic = useMemo(
    () => ethers.Wallet.createRandom().mnemonic?.phrase ?? "",
    []
  );
  const seedWords = useMemo(() => mnemonic.split(" "), [mnemonic]);
  const confirmationIndexes = useMemo(() => {
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
    LayoutAnimation.easeInEaseOut();
    setStep((prev) => Math.min(prev + 1, 5));
  };

  const goBack = () => {
    LayoutAnimation.easeInEaseOut();
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(mnemonic);
    Alert.alert(
      "Phrase Copied",
      "Store your seed phrase securely and never share it."
    );
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

    setIsProcessing(true);
    try {
      await importWallet({ mnemonic, password: values.password });
      goNext();
    } catch (error) {
      console.error("Failed to finalize wallet", error);
      Alert.alert(
        "Error",
        "Unable to finalize wallet creation. Please try again."
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
            <Button label="I Understand" onPress={goNext} />
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
});
