import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Modal,
  Vibration,
  Dimensions,
  Alert,
} from "react-native";
import { Screen } from "@/components/ui/Screen";
import { useCommunication } from "@/contexts/CommunicationContext";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";
import {
  CameraView,
  Camera,
  useCameraPermissions,
  BarcodeScanningResult,
} from "expo-camera";
import * as Clipboard from "expo-clipboard";
import {
  isValidWalletAddress,
  toChecksumAddress,
  formatWalletAddress,
  looksLikeWalletAddress,
} from "@/utils/walletValidation";

const { width } = Dimensions.get("window");
const BUTTON_SIZE = (width - spacing.xl * 2 - spacing.lg * 2) / 3;

const DIALPAD_LAYOUT = {
  numbers: [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["0x", "0", "⌫"],
  ],
  lowercase: [
    ["a", "b", "c", "d", "e"],
    ["f", "g", "h", "i", "j"],
    ["k", "l", "m", "n", "o"],
    ["p", "q", "r", "s", "t"],
    ["u", "v", "w", "x", "y"],
    ["z", "↑", "␣", "⌫", "✓"],
  ],
  uppercase: [
    ["A", "B", "C", "D", "E"],
    ["F", "G", "H", "I", "J"],
    ["K", "L", "M", "N", "O"],
    ["P", "Q", "R", "S", "T"],
    ["U", "V", "W", "X", "Y"],
    ["Z", "↓", "␣", "⌫", "✓"],
  ],
};

export const DialerScreen: React.FC = () => {
  const [walletInput, setWalletInput] = useState("");
  const [showManualInput, setShowManualInput] = useState(true); // Default to manual input
  const [keypadMode, setKeypadMode] = useState<
    "numbers" | "lowercase" | "uppercase"
  >("numbers");
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const { initiateCall, getContactByAddress, contacts } = useCommunication();
  const navigation = useNavigation();

  // Enhanced validation for Web3 identifiers
  const validationStatus = useMemo(() => {
    if (!walletInput.trim())
      return { isValid: false, message: "Enter address or ENS name" };

    const input = walletInput.trim();

    // Check for ENS names (ending with .eth)
    if (input.endsWith(".eth")) {
      return {
        isValid: true,
        message: `Call ${input}`,
        address: input,
      };
    }

    // Check for wallet addresses
    if (looksLikeWalletAddress(input)) {
      if (isValidWalletAddress(input)) {
        const checksumAddress = toChecksumAddress(input);
        const contact = getContactByAddress(checksumAddress);
        return {
          isValid: true,
          message: contact
            ? `Call ${contact.name}`
            : `Call ${formatWalletAddress(checksumAddress)}`,
          checksumAddress,
        };
      } else if (input.length < 42) {
        return { isValid: false, message: "Continue typing address..." };
      } else {
        return { isValid: false, message: "Invalid wallet address" };
      }
    }

    // Check for other Web3 identifiers or usernames
    if (input.length >= 3 && /^[a-zA-Z0-9._-]+$/.test(input)) {
      return {
        isValid: true,
        message: `Call @${input}`,
        address: input,
      };
    }

    return { isValid: false, message: "Enter valid Web3 identifier" };
  }, [walletInput, getContactByAddress]);

  const handleCharPress = (char: string) => {
    Vibration.vibrate(30);

    // Handle special characters
    if (char === "⌫") {
      handleBackspace();
      return;
    }

    if (char === "0x") {
      if (!walletInput.startsWith("0x")) {
        setWalletInput("0x");
      }
      return;
    }

    if (char === "↑") {
      setKeypadMode("uppercase");
      return;
    }

    if (char === "↓") {
      setKeypadMode("lowercase");
      return;
    }

    if (char === "␣") {
      // Add space (useful for ENS names or testing)
      if (walletInput.length < 100) {
        setWalletInput((prev) => prev + " ");
      }
      return;
    }

    if (char === "✓") {
      // Complete input - could trigger validation or action
      if (validationStatus.isValid) {
        handleCall("voice");
      }
      return;
    }

    // Handle regular characters
    if (walletInput.length < 100) {
      // Increased limit for flexibility
      if (!walletInput.startsWith("0x") && /[0-9a-fA-F]/.test(char)) {
        setWalletInput("0x" + char);
      } else {
        setWalletInput((prev) => prev + char);
      }
    }
  };

  const handleBackspace = () => {
    Vibration.vibrate(30);
    setWalletInput((prev) => prev.slice(0, -1));
  };

  const handleCall = (type: "voice" | "video") => {
    if (!validationStatus.isValid) {
      Alert.alert("Invalid Identifier", validationStatus.message);
      return;
    }

    const targetAddress =
      validationStatus.checksumAddress || validationStatus.address!;
    const contact = validationStatus.checksumAddress
      ? getContactByAddress(validationStatus.checksumAddress)
      : null;

    let displayName;
    if (contact) {
      displayName = contact.name;
    } else if (walletInput.endsWith(".eth")) {
      displayName = walletInput;
    } else if (validationStatus.checksumAddress) {
      displayName = formatWalletAddress(validationStatus.checksumAddress);
    } else {
      displayName = `@${walletInput}`;
    }

    Alert.alert(
      `${type === "voice" ? "Voice" : "Video"} Call`,
      `Call ${displayName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Call",
          onPress: () => {
            initiateCall(targetAddress, type);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleManualInput = (text: string) => {
    // Allow manual typing of full wallet address
    setWalletInput(text);
  };

  const [permission, requestPermission] = useCameraPermissions();

  const handleQRScan = async () => {
    if (!permission) {
      // Still loading permissions
      return;
    }

    if (!permission.granted) {
      const newPermission = await requestPermission();
      if (!newPermission.granted) {
        Alert.alert(
          "Camera Permission Required",
          "Please grant camera permission to scan QR codes.",
          [{ text: "OK" }]
        );
        return;
      }
    }

    setIsScanning(true);
  };

  const handleBarCodeScanned = ({ data }: BarcodeScanningResult) => {
    if (hasScanned) return; // Prevent multiple scans

    setHasScanned(true);
    setIsScanning(false);
    Vibration.vibrate(100); // Feedback for successful scan

    try {
      // Extract wallet address from scanned data
      let scannedAddress = data.trim();

      // Handle different QR code formats
      if (scannedAddress.startsWith("ethereum:")) {
        // EIP-681 format: ethereum:0x...
        scannedAddress = scannedAddress.replace("ethereum:", "");
      } else if (scannedAddress.includes("0x")) {
        // Extract address if embedded in other text
        const addressMatch = scannedAddress.match(/(0x[a-fA-F0-9]{40})/);
        if (addressMatch) {
          scannedAddress = addressMatch[1];
        }
      }

      // Validate the scanned address
      if (isValidWalletAddress(scannedAddress)) {
        const checksumAddress = toChecksumAddress(scannedAddress);
        setWalletInput(checksumAddress);

        Alert.alert(
          "QR Code Scanned Successfully",
          `Address: ${formatWalletAddress(checksumAddress)}`,
          [{ text: "OK" }]
        );
      } else {
        Alert.alert(
          "Invalid QR Code",
          "The scanned QR code does not contain a valid wallet address.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("QR scanning error:", error);
      Alert.alert(
        "Scanning Error",
        "Failed to process the QR code. Please try again.",
        [{ text: "OK" }]
      );
    }

    // Reset scan state after a delay
    setTimeout(() => setHasScanned(false), 2000);
  };

  const handlePasteFromClipboard = async () => {
    try {
      const clipboardText = await Clipboard.getStringAsync();
      if (clipboardText) {
        // Clean up the pasted text
        let pastedAddress = clipboardText.trim();

        // Handle different formats that might be in clipboard
        if (pastedAddress.startsWith("ethereum:")) {
          pastedAddress = pastedAddress.replace("ethereum:", "");
        } else if (pastedAddress.includes("0x")) {
          const addressMatch = pastedAddress.match(/(0x[a-fA-F0-9]{40})/);
          if (addressMatch) {
            pastedAddress = addressMatch[1];
          }
        }

        setWalletInput(pastedAddress);
        Vibration.vibrate(50); // Feedback for successful paste

        Alert.alert(
          "Pasted from Clipboard",
          `Content: ${
            pastedAddress.length > 50
              ? pastedAddress.substring(0, 50) + "..."
              : pastedAddress
          }`,
          [{ text: "OK" }]
        );
      } else {
        Alert.alert(
          "Clipboard Empty",
          "No content found in clipboard to paste.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      Alert.alert("Paste Error", "Failed to read from clipboard.", [
        { text: "OK" },
      ]);
    }
  };

  return (
    <Screen>
      <View style={styles.container}>
        {/* Web3 Identifier Display */}
        <View style={styles.displayContainer}>
          <View style={styles.addressContainer}>
            <Text style={styles.addressDisplay}>
              {walletInput || "Enter Web3 ID..."}
            </Text>
            <Text
              style={[
                styles.validationText,
                {
                  color: validationStatus.isValid
                    ? "#34C759"
                    : colors.textSecondary,
                },
              ]}
            >
              {validationStatus.message}
            </Text>

            {/* Input Type Indicator */}
            <View style={styles.inputTypeContainer}>
              {walletInput.startsWith("0x") && (
                <View style={styles.inputTypeTag}>
                  <Text style={styles.inputTypeText}>Wallet Address</Text>
                </View>
              )}
              {walletInput.endsWith(".eth") && (
                <View
                  style={[styles.inputTypeTag, { backgroundColor: "#6366F1" }]}
                >
                  <Text style={styles.inputTypeText}>ENS Name</Text>
                </View>
              )}
              {walletInput &&
                !walletInput.startsWith("0x") &&
                !walletInput.endsWith(".eth") && (
                  <View
                    style={[
                      styles.inputTypeTag,
                      { backgroundColor: "#10B981" },
                    ]}
                  >
                    <Text style={styles.inputTypeText}>Username</Text>
                  </View>
                )}
            </View>
          </View>

          {/* QR Code Scanner and Toggle Buttons */}
          <View style={styles.inputActionsContainer}>
            <TouchableOpacity
              style={styles.qrScanButton}
              onPress={handleQRScan}
            >
              <MaterialCommunityIcons
                name="qrcode-scan"
                size={20}
                color={colors.primary}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.inputToggleButton}
              onPress={() => setShowManualInput(!showManualInput)}
            >
              <MaterialCommunityIcons
                name={showManualInput ? "dialpad" : "keyboard"}
                size={20}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>

          {walletInput.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setWalletInput("")}
            >
              <MaterialCommunityIcons
                name="close-circle"
                size={24}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Input Method */}
        {showManualInput ? (
          <View style={styles.manualInputContainer}>
            <Text style={styles.inputLabel}>Enter Web3 Address</Text>
            <Text style={styles.inputSubLabel}>
              Wallet address, ENS name, or username
            </Text>

            <TextInput
              style={styles.manualInput}
              placeholder="0x1234... or alice.eth or @username"
              placeholderTextColor={colors.textSecondary}
              value={walletInput}
              onChangeText={handleManualInput}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="ascii-capable"
              maxLength={100}
              multiline={false}
              returnKeyType="done"
            />

            {/* Quick Action Buttons */}
            <View style={styles.quickInputActions}>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={handleQRScan}
              >
                <MaterialCommunityIcons
                  name="qrcode-scan"
                  size={18}
                  color={colors.primary}
                />
                <Text style={styles.quickActionText}>Scan QR</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={handlePasteFromClipboard}
              >
                <MaterialCommunityIcons
                  name="clipboard-outline"
                  size={18}
                  color={colors.primary}
                />
                <Text style={styles.quickActionText}>Paste</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => setWalletInput("")}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={18}
                  color={colors.textSecondary}
                />
                <Text style={styles.quickActionText}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.dialpadContainer}>
            {/* Keypad Mode Selector */}
            <View style={styles.modeSelector}>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  keypadMode === "numbers" && styles.activeModeButton,
                ]}
                onPress={() => setKeypadMode("numbers")}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    keypadMode === "numbers" && styles.activeModeButtonText,
                  ]}
                >
                  123
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  keypadMode === "lowercase" && styles.activeModeButton,
                ]}
                onPress={() => setKeypadMode("lowercase")}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    keypadMode === "lowercase" && styles.activeModeButtonText,
                  ]}
                >
                  abc
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modeButton,
                  keypadMode === "uppercase" && styles.activeModeButton,
                ]}
                onPress={() => setKeypadMode("uppercase")}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    keypadMode === "uppercase" && styles.activeModeButtonText,
                  ]}
                >
                  ABC
                </Text>
              </TouchableOpacity>
            </View>

            {/* Compact Keypad */}
            <View style={styles.compactDialpad}>
              {DIALPAD_LAYOUT[keypadMode].map((row, rowIndex) => (
                <View key={rowIndex} style={styles.compactRow}>
                  {row.map((char) => (
                    <TouchableOpacity
                      key={char}
                      style={[
                        styles.compactButton,
                        char === "⌫" && styles.backspaceButton,
                        char === "0x" && styles.prefixButton,
                        char === "↑" && styles.shiftButton,
                        char === "↓" && styles.shiftButton,
                        char === "␣" && styles.spaceButton,
                        char === "✓" && styles.confirmButton,
                      ]}
                      onPress={() => handleCharPress(char)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.compactButtonText,
                          char === "⌫" && styles.backspaceText,
                          char === "0x" && styles.prefixText,
                          char === "↑" && styles.shiftText,
                          char === "↓" && styles.shiftText,
                          char === "␣" && styles.spaceText,
                          char === "✓" && styles.confirmText,
                        ]}
                      >
                        {char === "␣" ? "space" : char}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Call Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[
              styles.videoCallButton,
              !validationStatus.isValid && styles.disabledButton,
            ]}
            onPress={() => handleCall("video")}
            disabled={!validationStatus.isValid}
          >
            <MaterialCommunityIcons
              name="video"
              size={28}
              color={validationStatus.isValid ? "white" : colors.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.voiceCallButton,
              !validationStatus.isValid && styles.disabledCallButton,
            ]}
            onPress={() => handleCall("voice")}
            disabled={!validationStatus.isValid}
          >
            <MaterialCommunityIcons name="phone" size={32} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.videoCallButton,
              !validationStatus.isValid && styles.disabledButton,
            ]}
            onPress={() => {
              if (
                validationStatus.isValid &&
                validationStatus.checksumAddress
              ) {
                Alert.alert("Add Contact", "Feature coming soon!");
              }
            }}
            disabled={!validationStatus.isValid}
          >
            <MaterialCommunityIcons
              name="account-plus"
              size={28}
              color={validationStatus.isValid ? "white" : colors.textSecondary}
            />
          </TouchableOpacity>
        </View>

        {/* Web3 Identifier Examples & Recent Contacts */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.quickActionsTitle}>Web3 Calling</Text>

          {contacts.length > 0 ? (
            <>
              <Text style={styles.sectionSubtitle}>Recent Contacts</Text>
              <View style={styles.recentContactsList}>
                {contacts.slice(0, 3).map((contact) => (
                  <TouchableOpacity
                    key={contact.address}
                    style={styles.recentContactItem}
                    onPress={() => {
                      setWalletInput(contact.address);
                    }}
                  >
                    <View
                      style={[
                        styles.recentContactAvatar,
                        { backgroundColor: getAvatarColor(contact.address) },
                      ]}
                    >
                      <Text style={styles.recentContactInitials}>
                        {contact.name.substring(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.recentContactName} numberOfLines={1}>
                      {contact.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          ) : (
            <>
              <Text style={styles.sectionSubtitle}>Quick Input Options</Text>
              <View style={styles.quickOptionsGrid}>
                <TouchableOpacity
                  style={styles.quickOptionCard}
                  onPress={handleQRScan}
                >
                  <MaterialCommunityIcons
                    name="qrcode-scan"
                    size={32}
                    color={colors.primary}
                  />
                  <Text style={styles.quickOptionTitle}>Scan QR Code</Text>
                  <Text style={styles.quickOptionDesc}>Camera scanner</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.quickOptionCard}
                  onPress={handlePasteFromClipboard}
                >
                  <MaterialCommunityIcons
                    name="clipboard-outline"
                    size={32}
                    color={colors.primary}
                  />
                  <Text style={styles.quickOptionTitle}>Paste Address</Text>
                  <Text style={styles.quickOptionDesc}>From clipboard</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.sectionSubtitle}>Supported Formats</Text>
              <View style={styles.examplesList}>
                <View style={styles.exampleItem}>
                  <Text style={styles.exampleType}>Wallet:</Text>
                  <Text style={styles.exampleValue}>0x742d...5c74</Text>
                </View>
                <View style={styles.exampleItem}>
                  <Text style={styles.exampleType}>ENS:</Text>
                  <Text style={styles.exampleValue}>alice.eth</Text>
                </View>
                <View style={styles.exampleItem}>
                  <Text style={styles.exampleType}>Username:</Text>
                  <Text style={styles.exampleValue}>@blockfinax</Text>
                </View>
              </View>
            </>
          )}
        </View>
      </View>

      {/* QR Code Scanner Modal */}
      <Modal
        visible={isScanning}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View style={styles.scannerContainer}>
          <View style={styles.scannerHeader}>
            <TouchableOpacity
              style={styles.closeScannerButton}
              onPress={() => {
                setIsScanning(false);
                setHasScanned(false);
              }}
            >
              <MaterialCommunityIcons name="close" size={28} color="white" />
            </TouchableOpacity>
            <Text style={styles.scannerTitle}>Scan QR Code</Text>
            <TouchableOpacity
              style={styles.manualQRButton}
              onPress={() => {
                setIsScanning(false);
                Alert.prompt(
                  "Enter QR Content",
                  "Paste the QR code content manually:",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "OK",
                      onPress: (text?: string) => {
                        if (text) {
                          // Handle manual QR code entry
                          const qrData = text.trim();
                          setWalletInput(qrData);
                          setShowManualInput(true);
                        }
                      },
                    },
                  ],
                  "plain-text"
                );
              }}
            >
              <MaterialCommunityIcons name="keyboard" size={20} color="white" />
            </TouchableOpacity>
          </View>

          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={
              isScanning && !hasScanned ? handleBarCodeScanned : undefined
            }
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
          >
            <View style={styles.scannerOverlay}>
              <View style={styles.scannerFrame}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>

              <Text style={styles.scannerInstructions}>
                Point your camera at a QR code containing a wallet address
              </Text>

              <TouchableOpacity
                style={styles.manualEntryButton}
                onPress={() => {
                  setIsScanning(false);
                  Alert.prompt(
                    "Manual QR Entry",
                    "Enter the QR code content:",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Process",
                        onPress: (text?: string) => {
                          if (text) {
                            setWalletInput(text.trim());
                          }
                        },
                      },
                    ],
                    "plain-text"
                  );
                }}
              >
                <Text style={styles.manualEntryText}>Manual Entry</Text>
              </TouchableOpacity>
            </View>
          </CameraView>
        </View>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
  },
  displayContainer: {
    alignItems: "center",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    minHeight: 120,
    justifyContent: "center",
    position: "relative",
    flexDirection: "row",
  },
  addressContainer: {
    flex: 1,
    alignItems: "center",
  },
  addressDisplay: {
    fontSize: 18,
    fontWeight: "500",
    color: colors.text,
    textAlign: "center",
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    fontFamily: "monospace",
  },
  validationText: {
    fontSize: 14,
    textAlign: "center",
    fontWeight: "500",
  },
  inputActionsContainer: {
    position: "absolute",
    left: spacing.md,
    top: "50%",
    marginTop: -25,
    gap: spacing.xs,
  },
  inputToggleButton: {
    padding: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qrScanButton: {
    padding: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  clearButton: {
    position: "absolute",
    right: spacing.md,
    top: "50%",
    marginTop: -12,
    padding: spacing.sm,
  },
  dialpadContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  modeSelector: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 25,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    marginHorizontal: spacing.xs,
  },
  activeModeButton: {
    backgroundColor: colors.primary,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  activeModeButtonText: {
    color: "white",
  },
  compactDialpad: {
    alignItems: "center",
  },
  compactRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  compactButton: {
    width: 50,
    height: 45,
    borderRadius: 8,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  compactButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  dialpadChar: {
    fontSize: 24,
    fontWeight: "600",
    color: colors.text,
  },
  backspaceText: {
    fontSize: 20,
    color: colors.text,
  },
  prefixText: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
  },
  dialpadLetters: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: -4,
    fontWeight: "500",
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  voiceCallButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#34C759",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  videoCallButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  disabledCallButton: {
    backgroundColor: colors.border,
  },
  disabledButton: {
    backgroundColor: colors.border,
  },
  backspaceButton: {
    backgroundColor: "#FF6B6B",
  },
  prefixButton: {
    backgroundColor: colors.primary,
  },
  shiftButton: {
    backgroundColor: "#4ECDC4",
  },
  spaceButton: {
    backgroundColor: colors.border,
    width: 80,
  },
  confirmButton: {
    backgroundColor: "#34C759",
  },
  shiftText: {
    color: "white",
    fontSize: 14,
  },
  spaceText: {
    color: colors.text,
    fontSize: 12,
  },
  confirmText: {
    color: "white",
    fontSize: 18,
  },
  quickActionsContainer: {
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  quickActionsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  quickActionsSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
  },
  manualInputContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  inputLabel: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: "center",
  },
  inputSubLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: "center",
  },
  manualInput: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 16,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    fontSize: 16,
    color: colors.text,
    fontFamily: "monospace",
    textAlign: "center",
    minHeight: 60,
  },
  quickInputActions: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  quickActionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.text,
  },
  recentContactsList: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  recentContactItem: {
    alignItems: "center",
    padding: spacing.sm,
    borderRadius: 12,
    backgroundColor: colors.surface,
    minWidth: 70,
  },
  recentContactAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  recentContactInitials: {
    fontSize: 16,
    fontWeight: "600",
    color: "white",
  },
  recentContactName: {
    fontSize: 12,
    color: colors.text,
    fontWeight: "500",
  },
  inputTypeContainer: {
    marginTop: spacing.xs,
    alignItems: "center",
  },
  inputTypeTag: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 10,
  },
  inputTypeText: {
    fontSize: 10,
    color: "white",
    fontWeight: "600",
    textTransform: "uppercase",
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  examplesList: {
    gap: spacing.xs,
  },
  exampleItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exampleType: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.primary,
  },
  exampleValue: {
    fontSize: 12,
    color: colors.text,
    fontFamily: "monospace",
  },
  quickOptionsGrid: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  quickOptionCard: {
    backgroundColor: colors.surface,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    minWidth: 120,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  quickOptionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.text,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  quickOptionDesc: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
    textAlign: "center",
  },
  // QR Scanner Styles
  scannerContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  scannerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 50,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  closeScannerButton: {
    padding: spacing.xs,
  },
  scannerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "white",
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  scannerFrame: {
    width: 250,
    height: 250,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 30,
    height: 30,
    borderColor: "white",
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scannerInstructions: {
    color: "white",
    fontSize: 16,
    textAlign: "center",
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  manualQRButton: {
    padding: spacing.xs,
  },
  manualEntryButton: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 25,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: "white",
  },
  manualEntryText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});

// Helper function to generate avatar colors
const getAvatarColor = (address: string): string => {
  const colors_list = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEAA7",
    "#DDA0DD",
    "#98D8C8",
    "#F7DC6F",
    "#BB8FCE",
    "#85C1E9",
  ];

  const hash = address
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors_list[hash % colors_list.length];
};
