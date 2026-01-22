import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { useWallet } from "@/contexts/WalletContext";
import { socialAuthService } from "@/services/socialAuthService";
import { RootStackParamList } from "@/navigation/types";
import { gradients, palette } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { LinearGradient } from "expo-linear-gradient";
import { ethers } from "ethers";
import * as Crypto from "expo-crypto";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Modal, Pressable,
  Image
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

type RootNavigationProp = StackNavigationProp<RootStackParamList>;

export const SocialAuthScreen: React.FC = () => {
  const { importWallet } = useWallet();
  const Google_icon = require("../../../assets/images/google_icon.svg");
  const rootNavigation = useNavigation<RootNavigationProp>();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pendingPrivateKey, setPendingPrivateKey] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importMethod, setImportMethod] = useState<"private-key" | "seed-phrase">("private-key");
  const [privateKeyInput, setPrivateKeyInput] = useState("");
  const [seedPhraseInput, setSeedPhraseInput] = useState("");
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handleEmailSignIn = async () => {
    if (!email.trim()) {
      Alert.alert("Email Required", "Please enter your email address");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Invalid Email", "Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    setLoadingMessage("Signing in with email...");

    try {
      const result = await socialAuthService.signInWithEmail(email);

      if (result.success && result.privateKey) {
        setLoadingMessage("Account ready!");

        // Store private key and show password creation modal
        setPendingPrivateKey(result.privateKey);
        setShowPasswordModal(true);
        setIsLoading(false);
      } else {
        Alert.alert(
          "Sign In Failed",
          result.error || "Unable to sign in with email. Please try again."
        );
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error("Email sign in error:", error);
      Alert.alert(
        "Sign In Error",
        error.message || "An unexpected error occurred. Please try again."
      );
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setLoadingMessage("Opening Google sign in...");

    try {
      const result = await socialAuthService.signInWithGoogle();

      if (result.success && result.privateKey) {
        setLoadingMessage("Account ready!");

        // Store private key and show password creation modal
        setPendingPrivateKey(result.privateKey);
        setShowPasswordModal(true);
        setIsLoading(false);
      } else {
        if (result.error !== 'Google authentication was cancelled') {
          Alert.alert(
            "Sign In Failed",
            result.error || "Unable to sign in with Google. Please try again."
          );
        }
        setIsLoading(false);
      }
    } catch (error: any) {
      console.error("Google sign in error:", error);
      Alert.alert(
        "Sign In Error",
        error.message || "An unexpected error occurred. Please try again."
      );
      setIsLoading(false);
    }
  };

  const handleQuickCreate = async () => {
    setIsLoading(true);
    setLoadingMessage("Creating your wallet...");

    try {
      // Generate secure random bytes using expo-crypto (React Native compatible)
      const randomBytes = await Crypto.getRandomBytesAsync(32); // 256 bits
      const privateKey = "0x" + Array.from(randomBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      // Create wallet from the generated private key
      const wallet = new ethers.Wallet(privateKey);

      setLoadingMessage("Account ready!");

      // Store private key and show password creation modal
      setPendingPrivateKey(wallet.privateKey);
      setShowPasswordModal(true);
      setIsLoading(false);
    } catch (error: any) {
      console.error("Quick create wallet error:", error);
      Alert.alert(
        "Wallet Creation Error",
        error.message || "Unable to create wallet. Please try again."
      );
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!password.trim()) {
      Alert.alert("Password Required", "Please enter a password");
      return;
    }

    if (password.length < 8) {
      Alert.alert("Weak Password", "Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Passwords Don't Match", "Please make sure both passwords match");
      return;
    }

    if (!pendingPrivateKey) {
      Alert.alert("Error", "No account data found. Please try again.");
      return;
    }

    setIsLoading(true);
    setLoadingMessage("Securing your account...");
    setShowPasswordModal(false);

    try {
      // Import wallet with the private key and user's password
      await importWallet({ privateKey: pendingPrivateKey, password });

      setLoadingMessage("Welcome!");

      // Navigate to main app
      setTimeout(() => {
        rootNavigation.reset({
          index: 0,
          routes: [{ name: "App" }],
        });
      }, 500);
    } catch (error: any) {
      console.error("Wallet import error:", error);
      Alert.alert(
        "Setup Error",
        error.message || "Unable to complete setup. Please try again."
      );
      setShowPasswordModal(true);
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  const handleImportWallet = () => {
    setShowImportModal(true);
  };

  const showComingSoon = () => {
    Alert.alert("Coming Soon", "Social sign-in will be available soon.");
  };

  const handleImportSubmit = async () => {
    let privateKey: string;

    try {
      if (importMethod === "private-key") {
        if (!privateKeyInput.trim()) {
          Alert.alert("Private Key Required", "Please enter your private key");
          return;
        }

        // Validate and normalize private key
        let cleanKey = privateKeyInput.trim();
        if (!cleanKey.startsWith("0x")) {
          cleanKey = "0x" + cleanKey;
        }

        // Validate it's a valid private key (64 hex characters after 0x)
        if (!/^0x[0-9a-fA-F]{64}$/.test(cleanKey)) {
          Alert.alert("Invalid Private Key", "Please enter a valid private key (64 hex characters)");
          return;
        }

        privateKey = cleanKey;
      } else {
        // Seed phrase import
        if (!seedPhraseInput.trim()) {
          Alert.alert("Seed Phrase Required", "Please enter your seed phrase");
          return;
        }

        const seedPhrase = seedPhraseInput.trim().toLowerCase();
        const words = seedPhrase.split(/\s+/);

        // Validate word count (12, 15, 18, 21, or 24 words)
        if (![12, 15, 18, 21, 24].includes(words.length)) {
          Alert.alert(
            "Invalid Seed Phrase",
            `Seed phrases must be 12, 15, 18, 21, or 24 words. You entered ${words.length} words.`
          );
          return;
        }

        setIsLoading(true);
        setLoadingMessage("Validating seed phrase...");

        try {
          // Create wallet from mnemonic to get private key
          const wallet = ethers.Wallet.fromMnemonic(seedPhrase);
          privateKey = wallet.privateKey;
        } catch (error: any) {
          Alert.alert(
            "Invalid Seed Phrase",
            "The seed phrase you entered is invalid. Please check and try again."
          );
          setIsLoading(false);
          return;
        }
      }

      setLoadingMessage("Wallet validated!");
      setShowImportModal(false);

      // Store private key and show password creation modal
      setPendingPrivateKey(privateKey);
      setShowPasswordModal(true);
      setIsLoading(false);

      // Clear import inputs
      setPrivateKeyInput("");
      setSeedPhraseInput("");
    } catch (error: any) {
      console.error("Import wallet error:", error);
      Alert.alert(
        "Import Error",
        error.message || "Unable to import wallet. Please try again."
      );
      setIsLoading(false);
    }
  };

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={gradients.hero} style={styles.hero}>
          <Animated.View style={[styles.heroContent, { opacity: fadeAnim }]}>
            <View style={styles.logoContainer}>
              <MaterialCommunityIcons
                name="shield-star"
                size={60}
                color={palette.white}
              />
            </View>
            <Text
              variant="display"
              color={palette.white}
              style={styles.heroTitle}
            >
              Welcome to BlockFinaX
            </Text>
            <Text
              variant="subtitle"
              color={palette.white}
              style={styles.heroSubtitle}
            >
              Secure access to digital world of transparency
            </Text>
          </Animated.View>
        </LinearGradient>

        <View style={styles.authCard}>
          {/* <Text
            variant="title"
            color={palette.neutralDark}
            style={styles.authTitle}
          >
            {" "}
          </Text> */}

          {/* Email Sign In */}
          <View style={styles.emailSection}>
            <Text
              variant="body"
              color={palette.neutralMid}
              style={styles.sectionLabel}
            >
              Sign in with Email
            </Text>
            <Input
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              editable={!isLoading}
              icon={
                <MaterialCommunityIcons
                  name="email-outline"
                  size={20}
                  color={palette.neutralMid}
                />
              }
            />
            <Button
              label="Continue with Email"
              onPress={handleEmailSignIn}
              variant="primary"
              disabled={isLoading || email.trim().length < 1}
              style={{ marginTop: -3 }}
            />

            {/* <Pressable
              onPress={handleEmailSignIn}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              disabled={isLoading || email.trim().length < 1}
              style={{
                padding: spacing.md, display: "flex", flexDirection: "row", justifyContent: "center", alignItems: 'center',
                borderRadius: 15, backgroundColor: palette.primaryBlue, marginBlockEnd: 7, marginBlockStart: 20
              }}
            >
              <Text style={{ color: "#ffffff" }}>Continue with Email</Text>
            </Pressable> */}

          </View>

          <Pressable
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={handleQuickCreate}
            style={{ padding: spacing.md, borderWidth: 2, borderRadius: 15, borderColor: palette.primaryBlue, marginBlockEnd: 7, marginBlockStart: 20 }}>
            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 20 }}>
              <MaterialCommunityIcons
                name="lightning-bolt"
                size={20}
                color={palette.primaryBlue}
              />
              <Text style={{ color: palette.primaryBlue }}>Create wallet Instantly</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={handleImportWallet}
            style={{ padding: spacing.md, borderRadius: 15, backgroundColor: "#d1ebf8", marginBlock: 7 }}>
            <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 20 }}>
              <MaterialCommunityIcons
                name="import"
                size={20}
                color={palette.primaryBlue}
              />
              <Text style={{ color: palette.primaryBlue }}>Import Existing Wallet</Text>
            </View>
          </Pressable>

          {/* <Button
            label="Create Wallet Instantly"
            onPress={handleQuickCreate}
            variant="outline"
            disabled={isLoading}
            icon={
              <MaterialCommunityIcons
                name="lightning-bolt"
                size={20}
                color={palette.primaryBlue}
              />
            }
          /> */}

          {/* Import Wallet */}
          {/* <View style={styles.importSection}>
            <Button
              label="Import Existing Wallet"
              onPress={handleImportWallet}
              variant="secondary"
              disabled={isLoading}
              icon={
                <MaterialCommunityIcons
                  name="import"
                  size={20}
                  color={palette.neutralDark}
                />
              }
              style={styles.importButton}
            />
            <Text variant="body" color={palette.neutralMid} style={styles.importHint}>
              Use your existing private key or seed phrase
            </Text>
          </View> */}

          {/* Quick Create Option */}
          <View style={styles.quickCreateSection}>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text variant="body" color={palette.neutralMid} style={styles.dividerText}>
                OR
              </Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Sign In */}
            <View style={styles.socialSection}>
              <Text
                variant="body"
                color={palette.neutralMid}
                style={{
                  marginBottom: spacing.sm,
                  fontWeight: "600",
                  textAlign:'center',
                }}
              >
                Sign in with Social
              </Text>

              <View style={styles.socialRow}>

                {/* Google */}
                <Pressable
                  onPress={showComingSoon}
                  style={({ pressed }) => [
                    styles.socialIconButton,
                    pressed && { transform: [{ scale: 0.96 }] }
                  ]}
                >
                  <Image
                    source={Google_icon}
                    style={{ width: 26, height: 26, resizeMode: "contain" }}
                  />
                </Pressable>

                <Pressable
                  onPress={showComingSoon}
                  style={({ pressed }) => [
                    styles.socialIconButton,
                    pressed && { transform: [{ scale: 0.96 }] }
                  ]}
                >
                  <MaterialCommunityIcons
                    name="apple"
                    size={30}
                    color={palette.neutralDark}
                  />
                </Pressable>

              </View>
            </View>


            <Text variant="body" color={palette.neutralMid} style={styles.quickCreateHint}>
              No sign-up required  
            </Text>
             <Text variant="body" color={palette.neutralMid} style={styles.quickCreateHint}>
              Secured by Account Abstraction.
            </Text>
          </View>

          {/* Loading Indicator */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={palette.primaryBlue} />
              {loadingMessage && (
                <Text
                  variant="body"
                  color={palette.neutralMid}
                  style={styles.loadingText}
                >
                  {loadingMessage}
                </Text>
              )}
            </View>
          )}

        </View>
      </ScrollView>

      {/* Import Wallet Modal */}
      <Modal
        visible={showImportModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowImportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text variant="title" color={palette.neutralDark} style={styles.modalTitle}>
                Import Wallet
              </Text>
              <TouchableOpacity
                onPress={() => setShowImportModal(false)}
                style={styles.closeButton}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color={palette.neutralDark}
                />
              </TouchableOpacity>
            </View>

            <Text variant="body" color={palette.neutralMid} style={styles.modalSubtitle}>
              Import your existing wallet using a private key or seed phrase. Your wallet will work with Account Abstraction for gasless transactions.
            </Text>

            {/* Import Method Selector */}
            <View style={styles.methodSelector}>
              <TouchableOpacity
                style={[
                  styles.methodButton,
                  importMethod === "private-key" && styles.methodButtonActive,
                ]}
                onPress={() => setImportMethod("private-key")}
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

              <TouchableOpacity
                style={[
                  styles.methodButton,
                  importMethod === "seed-phrase" && styles.methodButtonActive,
                ]}
                onPress={() => setImportMethod("seed-phrase")}
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
            </View>

            {/* Import Inputs */}
            {importMethod === "private-key" ? (
              <Input
                label="Private Key"
                placeholder="Enter your private key (0x...)"
                value={privateKeyInput}
                onChangeText={setPrivateKeyInput}
                autoCapitalize="none"
                autoCorrect={false}
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
            ) : (
              <Input
                label="Seed Phrase"
                placeholder="Enter your 12 or 24 word seed phrase"
                value={seedPhraseInput}
                onChangeText={setSeedPhraseInput}
                autoCapitalize="none"
                autoCorrect={false}
                multiline
                numberOfLines={4}
                editable={!isLoading}
                icon={
                  <MaterialCommunityIcons
                    name="format-list-numbered"
                    size={20}
                    color={palette.neutralMid}
                  />
                }
              />
            )}

            <View style={styles.importWarning}>
              <MaterialCommunityIcons
                name="shield-check"
                size={20}
                color={palette.primaryBlue}
              />
              <Text variant="body" color={palette.neutralMid} style={styles.warningText}>
                Your wallet will be encrypted and stored securely on this device. You'll get a Smart Account address for gasless transactions, while keeping full access to your original wallet.
              </Text>
            </View>

            <Button
              label="Import Wallet"
              onPress={handleImportSubmit}
              disabled={isLoading}
              loading={isLoading}
              style={styles.modalButton}
            />

            <Button
              label="Cancel"
              onPress={() => setShowImportModal(false)}
              variant="secondary"
              disabled={isLoading}
            />
          </View>
        </View>
      </Modal>

      {/* Password Creation Modal */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="slide"
        onRequestClose={() => { }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text variant="title" color={palette.neutralDark} style={styles.modalTitle}>
              Secure Your Account
            </Text>
            <Text variant="body" color={palette.neutralMid} style={styles.modalSubtitle}>
              Create a password to protect your wallet. You'll use this password to access your account on this device.
            </Text>

            <Input
              label="Create Password"
              placeholder="Enter password (min. 8 characters)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!isLoading}
              icon={
                <MaterialCommunityIcons
                  name="lock-outline"
                  size={20}
                  color={palette.neutralMid}
                />
              }
            />

            <Input
              label="Confirm Password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              editable={!isLoading}
              icon={
                <MaterialCommunityIcons
                  name="lock-check-outline"
                  size={20}
                  color={palette.neutralMid}
                />
              }
            />

            <Button
              label="Secure Account"
              onPress={handlePasswordSubmit}
              disabled={isLoading}
              loading={isLoading}
              style={styles.modalButton}
            />

            <View style={styles.passwordHint}>
              <MaterialCommunityIcons
                name="information-outline"
                size={16}
                color={palette.primaryBlue}
              />
              <Text variant="body" color={palette.neutralMid} style={styles.hintText}>
                Your password is stored securely on your device only.
              </Text>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
  },
  hero: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    paddingHorizontal: spacing.xl,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroContent: {
    alignItems: "center",
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  heroTitle: {
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  heroSubtitle: {
    textAlign: "center",
    opacity: 0.9,
    paddingHorizontal: spacing.lg,
  },
  authCard: {
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
  },
  authTitle: {
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  emailSection: {
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    marginBottom: spacing.sm,
    fontWeight: "600",
  },
  emailButton: {
    marginTop: spacing.xs,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: palette.neutralLight,
  },
  dividerText: {
    marginHorizontal: spacing.md,
    fontWeight: "600",
  },
  socialSection: {
    marginBottom: spacing.md
    
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.neutralLight,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  disabledButton: {
    opacity: 0.5,
  },
  socialIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 10,
    backgroundColor: palette.surface,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,

  },
  socialTextContainer: {
    flex: 1,
  },
  socialArrow: {
    marginLeft: spacing.sm,
  },
  quickCreateSection: {
    marginBottom: spacing.md,
  },
  quickCreateHint: {
    textAlign: "center",
    marginTop: 2,
    fontSize: 12,
  },
  importSection: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  importButton: {
    marginBottom: spacing.xs,
  },
  importHint: {
    textAlign: "center",
    fontSize: 12,
    marginTop: spacing.xs,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: spacing.lg,
  },
  loadingText: {
    marginTop: spacing.md,
    textAlign: "center",
  },
  advancedSection: {
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: palette.neutralLight,
    alignItems: "center",
  },
  advancedLink: {
    textDecorationLine: "underline",
  },
  infoSection: {
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: palette.neutralLight,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  infoText: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.sm,
  },
  modalContent: {
    backgroundColor: palette.white,
    borderRadius: 24,
    padding: spacing.xl,
    width: "100%",
    maxWidth: 400,
    shadowColor: palette.neutralDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  modalTitle: {
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  modalSubtitle: {
    textAlign: "center",
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  modalButton: {
    marginTop: spacing.md,
  },
  passwordHint: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: palette.surface,
    borderRadius: 12,
  },
  hintText: {
    marginLeft: spacing.sm,
    flex: 1,
    fontSize: 12,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  closeButton: {
    padding: spacing.xs,
  },
  methodSelector: {
    flexDirection: "row",
    marginBottom: spacing.lg,
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
  },
  methodButtonActive: {
    borderColor: palette.primaryBlue,
    backgroundColor: `${palette.primaryBlue}10`,
  },
  methodText: {
    marginLeft: spacing.xs,
    fontWeight: "600",
  },
  importWarning: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: `${palette.primaryBlue}10`,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: palette.primaryBlue,
  },
  warningText: {
    marginLeft: spacing.sm,
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
  },
  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    gap: 20,
    marginTop: spacing.sm,
  },

  socialIconButton: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: palette.white,
    justifyContent: "center",
    alignItems: "center",

    // iOS shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 6,

    // Android shadow
    elevation: 6,
  },
});
