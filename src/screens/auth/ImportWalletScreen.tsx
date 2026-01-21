import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { DebugTool } from "@/components/ui/DebugTool";
import { useWallet } from "@/contexts/WalletContext";
import { RootStackParamList } from "@/navigation/types";
import { gradients, palette } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, Animated, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

type ImportWalletForm = {
  mnemonic: string;
  privateKey: string;
  password: string;
};

type ImportMethod = "seed-phrase" | "private-key";

type NavigationProp = StackNavigationProp<RootStackParamList>;

export const ImportWalletScreen: React.FC = () => {
  const { importWallet } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [importMethod, setImportMethod] = useState<ImportMethod>("seed-phrase");
  const navigation = useNavigation<NavigationProp>();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  const { control, handleSubmit, watch, setValue } = useForm<ImportWalletForm>({
    defaultValues: { mnemonic: "", privateKey: "", password: "" },
  });

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const mnemonic = watch("mnemonic");
  const privateKey = watch("privateKey");

  const onSubmit = async (values: ImportWalletForm) => {
    if (!values.password) {
      Alert.alert("Password Required", "Please set a wallet password.");
      return;
    }

    if (values.password.length < 8) {
      Alert.alert("Weak Password", "Password must be at least 8 characters.");
      return;
    }

    if (importMethod === "seed-phrase") {
      if (!values.mnemonic.trim()) {
        Alert.alert("Seed Phrase Required", "Please enter your seed phrase.");
        return;
      }

      const words = values.mnemonic.trim().split(/\s+/).filter(Boolean);
      if (![12, 15, 18, 21, 24].includes(words.length)) {
        Alert.alert(
          "Invalid Seed Phrase",
          `Seed phrases must be 12, 15, 18, 21, or 24 words. You entered ${words.length} words.`
        );
        return;
      }
    } else {
      if (!values.privateKey.trim()) {
        Alert.alert("Private Key Required", "Please enter your private key.");
        return;
      }

      let cleanKey = values.privateKey.trim();
      if (!cleanKey.startsWith("0x")) {
        cleanKey = "0x" + cleanKey;
      }

      if (!/^0x[0-9a-fA-F]{64}$/.test(cleanKey)) {
        Alert.alert(
          "Invalid Private Key",
          "Please enter a valid private key (64 hex characters)."
        );
        return;
      }

      // Update the value with the cleaned key
      setValue("privateKey", cleanKey);
    }

    setIsLoading(true);
    try {
      await importWallet({
        mnemonic: importMethod === "seed-phrase" ? values.mnemonic : undefined,
        privateKey: importMethod === "private-key" ? values.privateKey : undefined,
        password: values.password,
      });

      // Navigate to biometric setup with the password
      navigation.navigate("BiometricSetup", {
        walletPassword: values.password,
        returnTo: "App",
      });
    } catch (error: any) {
      console.error("Import wallet failed", error);
      Alert.alert(
        "Import Failed",
        error.message || "Please verify the credentials and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleMethodChange = (method: ImportMethod) => {
    setImportMethod(method);
    // Clear the other field when switching methods
    if (method === "seed-phrase") {
      setValue("privateKey", "");
    } else {
      setValue("mnemonic", "");
    }
  };

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <LinearGradient colors={gradients.hero} style={styles.header}>
          <Animated.View style={[styles.headerContent, { opacity: fadeAnim }]}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons name="import" size={48} color={palette.white} />
            </View>
            <Text variant="title" color={palette.white} style={styles.headerTitle}>
              Import Wallet
            </Text>
            <Text variant="body" color={palette.white} style={styles.headerSubtitle}>
              Restore your existing wallet with seed phrase or private key
            </Text>
          </Animated.View>
        </LinearGradient>

        {/* Content Card */}
        <View style={styles.contentCard}>
          {/* Security Alert */}
          <View style={styles.alertBox}>
            <MaterialCommunityIcons
              name="shield-alert"
              size={24}
              color={palette.errorRed}
            />
            <View style={styles.alertContent}>
              <Text variant="subtitle" color={palette.errorRed} style={styles.alertTitle}>
                Security Reminder
              </Text>
              <Text variant="body" color={palette.neutralDark} style={styles.alertText}>
                Only enter your credentials in trusted environments. Your keys are encrypted and stored securely on this device only.
              </Text>
            </View>
          </View>

          {/* Import Method Selector */}
          <View style={styles.methodSelector}>
            <TouchableOpacity
              style={[
                styles.methodButton,
                importMethod === "seed-phrase" && styles.methodButtonActive,
              ]}
              onPress={() => handleMethodChange("seed-phrase")}
              disabled={isLoading}
            >
              <MaterialCommunityIcons
                name="format-list-numbered"
                size={20}
                color={importMethod === "seed-phrase" ? palette.primaryBlue : palette.neutralMid}
              />
              <Text
                variant="body"
                color={importMethod === "seed-phrase" ? palette.primaryBlue : palette.neutralMid}
                style={styles.methodText}
              >
                Seed Phrase
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.methodButton,
                importMethod === "private-key" && styles.methodButtonActive,
              ]}
              onPress={() => handleMethodChange("private-key")}
              disabled={isLoading}
            >
              <MaterialCommunityIcons
                name="key-variant"
                size={20}
                color={importMethod === "private-key" ? palette.primaryBlue : palette.neutralMid}
              />
              <Text
                variant="body"
                color={importMethod === "private-key" ? palette.primaryBlue : palette.neutralMid}
                style={styles.methodText}
              >
                Private Key
              </Text>
            </TouchableOpacity>
          </View>

          {/* Import Input */}
          {importMethod === "seed-phrase" ? (
            <Controller
              control={control}
              name="mnemonic"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputSection}>
                  <Input
                    label="Recovery Seed Phrase"
                    value={value}
                    onChangeText={onChange}
                    multiline
                    numberOfLines={4}
                    placeholder="Enter your 12 or 24 word seed phrase"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                    icon={
                      <MaterialCommunityIcons
                        name="format-list-numbered"
                        size={20}
                        color={palette.neutralMid}
                      />
                    }
                  />
                  <View style={styles.wordCount}>
                    <MaterialCommunityIcons
                      name="information-outline"
                      size={16}
                      color={palette.primaryBlue}
                    />
                    <Text variant="body" color={palette.neutralMid} style={styles.wordCountText}>
                      {mnemonic.trim().split(/\s+/).filter(Boolean).length} words entered
                    </Text>
                  </View>
                </View>
              )}
            />
          ) : (
            <Controller
              control={control}
              name="privateKey"
              render={({ field: { onChange, value } }) => (
                <View style={styles.inputSection}>
                  <Input
                    label="Private Key"
                    value={value}
                    onChangeText={onChange}
                    autoCapitalize="none"
                    autoCorrect={false}
                    placeholder="0x... (64 hex characters)"
                    multiline
                    numberOfLines={2}
                    editable={!isLoading}
                    icon={
                      <MaterialCommunityIcons
                        name="key-variant"
                        size={20}
                        color={palette.neutralMid}
                      />
                    }
                  />
                  <View style={styles.wordCount}>
                    <MaterialCommunityIcons
                      name="information-outline"
                      size={16}
                      color={palette.primaryBlue}
                    />
                    <Text variant="body" color={palette.neutralMid} style={styles.wordCountText}>
                      {privateKey.trim().length} characters
                    </Text>
                  </View>
                </View>
              )}
            />
          )}

          {/* Password Input */}
          <Controller
            control={control}
            name="password"
            rules={{ required: true, minLength: 8 }}
            render={({ field: { onChange, value }, fieldState }) => (
              <Input
                label="Set Wallet Password"
                value={value}
                onChangeText={onChange}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="Enter a strong password (min. 8 characters)"
                editable={!isLoading}
                error={
                  fieldState.error
                    ? "Password must be at least 8 characters."
                    : undefined
                }
                icon={
                  <MaterialCommunityIcons
                    name="lock-outline"
                    size={20}
                    color={palette.neutralMid}
                  />
                }
              />
            )}
          />

          {/* Info Box */}
          <View style={styles.infoBox}>
            <MaterialCommunityIcons
              name="shield-check"
              size={20}
              color={palette.primaryBlue}
            />
            <Text variant="body" color={palette.neutralMid} style={styles.infoText}>
              Your wallet will be encrypted with this password and stored securely on your device. You'll also get a Smart Account for gasless transactions.
            </Text>
          </View>

          {/* Import Button */}
          <Button
            label="Import Wallet"
            onPress={handleSubmit(onSubmit)}
            loading={isLoading}
            disabled={isLoading}
            style={styles.importButton}
            icon={
              <MaterialCommunityIcons
                name="download"
                size={20}
                color={palette.white}
              />
            }
          />

          {/* Back Button */}
          <Button
            label="Cancel"
            variant="secondary"
            onPress={() => navigation.goBack()}
            disabled={isLoading}
          />
        </View>
      </ScrollView>
      <DebugTool />
    </Screen>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.xl,
  },
  header: {
    paddingTop: spacing.xxl * 1.5,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xl,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerContent: {
    alignItems: "center",
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  headerTitle: {
    textAlign: "center",
    marginBottom: spacing.xs,
    fontSize: 28,
    fontWeight: "700",
  },
  headerSubtitle: {
    textAlign: "center",
    opacity: 0.9,
    paddingHorizontal: spacing.lg,
  },
  contentCard: {
    backgroundColor: palette.white,
    marginTop: -spacing.lg,
    marginHorizontal: spacing.lg,
    borderRadius: 24,
    padding: spacing.xl,
    shadowColor: palette.neutralDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    gap: spacing.lg,
  },
  alertBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFF3F3",
    borderRadius: 16,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: palette.errorRed,
    gap: spacing.md,
  },
  alertContent: {
    flex: 1,
    gap: spacing.xs,
  },
  alertTitle: {
    fontWeight: "600",
  },
  alertText: {
    fontSize: 13,
    lineHeight: 18,
  },
  methodSelector: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  methodButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: palette.neutralLight,
    backgroundColor: palette.white,
    gap: spacing.xs,
  },
  methodButtonActive: {
    borderColor: palette.primaryBlue,
    backgroundColor: `${palette.primaryBlue}10`,
  },
  methodText: {
    fontWeight: "600",
  },
  inputSection: {
    gap: spacing.xs,
  },
  wordCount: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  wordCountText: {
    fontSize: 12,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: spacing.md,
    backgroundColor: `${palette.primaryBlue}10`,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: palette.primaryBlue,
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  importButton: {
    marginTop: spacing.sm,
  },
});
