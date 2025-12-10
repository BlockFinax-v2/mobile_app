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
  ScrollView,
  FlatList,
} from "react-native";
import { Screen } from "@/components/ui/Screen";
import { useCommunication } from "@/contexts/CommunicationContext";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useNavigation } from "@react-navigation/native";
import type { StackNavigationProp } from "@react-navigation/stack";
import type { MessagesStackParamList } from "@/navigation/types";
import { CameraView, Camera, useCameraPermissions } from "expo-camera";
import * as Clipboard from "expo-clipboard";
import {
  isValidWalletAddress,
  toChecksumAddress,
  formatWalletAddress,
  looksLikeWalletAddress,
} from "@/utils/walletValidation";

const { width, height } = Dimensions.get("window");
const BUTTON_SIZE = Math.min((width - spacing.xl * 3) / 5, 64); // Max 64px, responsive
const IS_SMALL_SCREEN = width < 380;

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
  const [showRecentContacts, setShowRecentContacts] = useState(false);
  const [contactSearchQuery, setContactSearchQuery] = useState("");
  const { initiateCall, getContactByAddress, contacts } = useCommunication();
  const navigation =
    useNavigation<StackNavigationProp<MessagesStackParamList>>();

  // Generate avatar color based on address
  const getAvatarColor = (address: string) => {
    const colors = [
      "#FF6B35",
      "#F7931E",
      "#FFD23F",
      "#06FFA5",
      "#118AB2",
      "#073B4C",
      "#8E44AD",
      "#E74C3C",
    ];
    const index = parseInt(address.slice(-2), 16) % colors.length;
    return colors[index];
  };

  // Filter recent contacts based on search query
  const filteredContacts = useMemo(() => {
    if (!contactSearchQuery.trim()) {
      return contacts.slice(0, 10); // Show recent 10 contacts
    }

    return contacts
      .filter(
        (contact) =>
          contact.name
            .toLowerCase()
            .includes(contactSearchQuery.toLowerCase()) ||
          contact.walletAddress
            .toLowerCase()
            .includes(contactSearchQuery.toLowerCase())
      )
      .slice(0, 10);
  }, [contacts, contactSearchQuery]);

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

  const handleCall = async (type: "voice" | "video") => {
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

    try {
      console.log("🔄 Starting call and navigation...");
      await initiateCall(targetAddress, type);

      console.log("✅ Call initiated, navigating to ActiveCallScreen");
      // Navigate to ActiveCallScreen directly
      navigation.navigate("ActiveCallScreen", {
        callData: {
          callId: "temp-" + Date.now(),
          participantAddress: targetAddress,
          participantName: displayName,
          callType: type,
          isIncoming: false,
          status: "connecting",
        },
        localStream: null,
        remoteStream: null,
      });
      console.log("🎯 Navigation called successfully");
    } catch (error) {
      console.error("❌ Failed to initiate call:", error);
      Alert.alert("Call Failed", `Failed to start call: ${error}`);
    }
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

  const handleBarCodeScanned = ({ data }: { data: string }) => {
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
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.innerContainer}>
          {/* Web3 Identifier Display */}
          <View style={styles.displayContainer}>
            <View style={styles.addressContainer}>
              {/* Input Type Indicator */}
              <View style={styles.inputTypeContainer}>
                {walletInput.startsWith("0x") && (
                  <View style={styles.inputTypeTag}>
                    <Text style={styles.inputTypeText}>Wallet Address</Text>
                  </View>
                )}
                {walletInput.endsWith(".eth") && (
                  <View
                    style={[
                      styles.inputTypeTag,
                      { backgroundColor: "#6366F1" },
                    ]}
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

            <View style={styles.rightActionsContainer}>
              <TouchableOpacity
                style={styles.recentContactsButton}
                onPress={() => setShowRecentContacts(true)}
              >
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={20}
                  color="white"
                />
              </TouchableOpacity>

              {walletInput.length > 0 && (
                <TouchableOpacity
                  style={styles.clearButton}
                  onPress={() => setWalletInput("")}
                >
                  <MaterialCommunityIcons
                    name="close-circle"
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              )}
            </View>
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
                color={
                  validationStatus.isValid ? "white" : colors.textSecondary
                }
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
                styles.contactsButton,
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
                size={26}
                color={
                  validationStatus.isValid ? "white" : colors.textSecondary
                }
              />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Recent Contacts Modal */}
      <Modal
        visible={showRecentContacts}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => {
          setShowRecentContacts(false);
          setContactSearchQuery("");
        }}
      >
        <View style={styles.recentContactsModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Recent Contacts</Text>
            <TouchableOpacity
              style={styles.closeModalButton}
              onPress={() => {
                setShowRecentContacts(false);
                setContactSearchQuery("");
              }}
            >
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <MaterialCommunityIcons
              name="magnify"
              size={20}
              color={colors.textSecondary}
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search contacts by name..."
              placeholderTextColor={colors.textSecondary}
              value={contactSearchQuery}
              onChangeText={setContactSearchQuery}
              autoFocus={false}
            />
            {contactSearchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.clearSearchButton}
                onPress={() => setContactSearchQuery("")}
              >
                <MaterialCommunityIcons
                  name="close-circle"
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={filteredContacts}
            keyExtractor={(item) => item.walletAddress}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contactsList}
            renderItem={({ item: contact }) => (
              <TouchableOpacity
                style={styles.contactItem}
                onPress={() => {
                  Alert.alert("Call Contact", `Call ${contact.name}?`, [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Voice Call",
                      onPress: async () => {
                        try {
                          await initiateCall(contact.walletAddress, "voice");
                          setShowRecentContacts(false);
                          setContactSearchQuery("");

                          navigation.navigate("ActiveCallScreen", {
                            callData: {
                              callId: "temp-" + Date.now(),
                              participantAddress: contact.walletAddress,
                              participantName: contact.name,
                              callType: "voice",
                              isIncoming: false,
                              status: "connecting",
                            },
                            localStream: null,
                            remoteStream: null,
                          });
                        } catch (error) {
                          console.error("Failed to initiate call:", error);
                        }
                      },
                    },
                    {
                      text: "Video Call",
                      onPress: async () => {
                        try {
                          await initiateCall(contact.walletAddress, "video");
                          setShowRecentContacts(false);
                          setContactSearchQuery("");

                          navigation.navigate("ActiveCallScreen", {
                            callData: {
                              callId: "temp-" + Date.now(),
                              participantAddress: contact.walletAddress,
                              participantName: contact.name,
                              callType: "video",
                              isIncoming: false,
                              status: "connecting",
                            },
                            localStream: null,
                            remoteStream: null,
                          });
                        } catch (error) {
                          console.error("Failed to initiate call:", error);
                        }
                      },
                    },
                  ]);
                }}
              >
                <View
                  style={[
                    styles.contactAvatar,
                    { backgroundColor: getAvatarColor(contact.walletAddress) },
                  ]}
                >
                  <Text style={styles.contactInitials}>
                    {contact.name.substring(0, 2).toUpperCase()}
                  </Text>
                </View>

                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{contact.name}</Text>
                  <Text style={styles.contactAddress} numberOfLines={1}>
                    {formatWalletAddress(contact.walletAddress)}
                  </Text>
                </View>

                <View style={styles.callActions}>
                  <TouchableOpacity
                    style={styles.callActionButton}
                    onPress={async () => {
                      try {
                        await initiateCall(contact.walletAddress, "voice");
                        setShowRecentContacts(false);
                        setContactSearchQuery("");

                        navigation.navigate("ActiveCallScreen", {
                          callData: {
                            callId: "temp-" + Date.now(),
                            participantAddress: contact.walletAddress,
                            participantName: contact.name,
                            callType: "voice",
                            isIncoming: false,
                            status: "connecting",
                          },
                          localStream: null,
                          remoteStream: null,
                        });
                      } catch (error) {
                        console.error("Failed to initiate call:", error);
                      }
                    }}
                  >
                    <MaterialCommunityIcons
                      name="phone"
                      size={20}
                      color={colors.primary}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.callActionButton}
                    onPress={async () => {
                      try {
                        await initiateCall(contact.walletAddress, "video");
                        setShowRecentContacts(false);
                        setContactSearchQuery("");

                        navigation.navigate("ActiveCallScreen", {
                          callData: {
                            callId: "temp-" + Date.now(),
                            participantAddress: contact.walletAddress,
                            participantName: contact.name,
                            callType: "video",
                            isIncoming: false,
                            status: "connecting",
                          },
                          localStream: null,
                          remoteStream: null,
                        });
                      } catch (error) {
                        console.error("Failed to initiate call:", error);
                      }
                    }}
                  >
                    <MaterialCommunityIcons
                      name="video"
                      size={20}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="account-search"
                  size={64}
                  color={colors.textSecondary}
                />
                <Text style={styles.emptyStateText}>
                  {contactSearchQuery.trim()
                    ? "No contacts found matching your search"
                    : "No recent contacts yet"}
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  {contactSearchQuery.trim()
                    ? "Try a different search term"
                    : "Start making calls to see contacts here"}
                </Text>
              </View>
            }
          />
        </View>
      </Modal>

      {/* QR Code Scanner Modal */}
      <Modal
        visible={isScanning}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => {
          setIsScanning(false);
          setHasScanned(false);
        }}
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
              <MaterialCommunityIcons name="close" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.scannerTitle}>Scan QR Code</Text>
            <TouchableOpacity
              style={styles.closeScannerButton}
              onPress={() => {
                Alert.prompt(
                  "Manual QR Entry",
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
              <TouchableOpacity
                style={styles.manualEntryButton}
                onPress={() => {
                  Alert.prompt(
                    "Manual QR Entry",
                    "Paste the QR code content manually:",
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
  },
  scrollContent: {
    flexGrow: 1,
  },
  innerContainer: {
    flex: 1,
  },
  displayContainer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    minHeight: 140,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  addressContainer: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  addressDisplay: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    textAlign: "center",
    letterSpacing: 0.3,
    marginBottom: spacing.sm,
    fontFamily: "monospace",
    lineHeight: 24,
    flexWrap: "wrap",
    maxWidth: "90%",
  },
  validationText: {
    fontSize: 13,
    textAlign: "center",
    fontWeight: "500",
    marginTop: spacing.xs,
  },
  inputActionsContainer: {
    position: "absolute",
    left: spacing.lg,
    top: "50%",
    transform: [{ translateY: -20 }],
    gap: spacing.sm,
  },
  inputToggleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  qrScanButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  rightActionsContainer: {
    position: "absolute",
    right: spacing.lg,
    top: "50%",
    transform: [{ translateY: -20 }],
    flexDirection: "row",
    gap: spacing.sm,
  },
  recentContactsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FF6B35",
    borderWidth: 1.5,
    borderColor: "#FF6B35",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#FF6B35",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  clearButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dialpadContainer: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  modeSelector: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 28,
    padding: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    marginHorizontal: spacing.xl,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  modeButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: 24,
    alignItems: "center",
    marginHorizontal: 2,
  },
  activeModeButton: {
    backgroundColor: colors.primary,
    elevation: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modeButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  activeModeButtonText: {
    color: "white",
  },
  compactDialpad: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  compactRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  compactButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE * 0.9,
    borderRadius: IS_SMALL_SCREEN ? 10 : 12,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: colors.border,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  compactButtonText: {
    fontSize: IS_SMALL_SCREEN ? 16 : 18,
    fontWeight: "700",
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
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  voiceCallButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#34C759",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#34C759",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  videoCallButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  contactsButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#8A2BE2",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#8A2BE2",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  disabledCallButton: {
    backgroundColor: colors.border,
  },
  disabledButton: {
    backgroundColor: colors.border,
    elevation: 0,
    shadowOpacity: 0,
  },
  backspaceButton: {
    backgroundColor: "#FF6B6B",
    borderColor: "#FF6B6B",
  },
  prefixButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  shiftButton: {
    backgroundColor: "#4ECDC4",
    borderColor: "#4ECDC4",
  },
  spaceButton: {
    backgroundColor: colors.border,
    width: 88,
  },
  confirmButton: {
    backgroundColor: "#34C759",
    borderColor: "#34C759",
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
    paddingVertical: spacing.xl,
    alignItems: "center",
    backgroundColor: colors.surface,
    marginTop: spacing.sm,
  },
  quickActionsTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  quickActionsSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
  manualInputContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  inputLabel: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  inputSubLabel: {
    fontSize: 15,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    textAlign: "center",
    lineHeight: 22,
  },
  manualInput: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    fontSize: 16,
    color: colors.text,
    fontFamily: "monospace",
    textAlign: "center",
    minHeight: 64,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  quickInputActions: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: spacing.xl,
    gap: spacing.lg,
  },
  quickActionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: spacing.sm,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    minWidth: 100,
    justifyContent: "center",
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  recentContactsList: {
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  recentContactItem: {
    alignItems: "center",
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: colors.surface,
    minWidth: 80,
    borderWidth: 1.5,
    borderColor: colors.border,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  recentContactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
    elevation: 1,
  },
  recentContactInitials: {
    fontSize: 17,
    fontWeight: "700",
    color: "white",
  },
  recentContactName: {
    fontSize: 11,
    color: colors.text,
    fontWeight: "600",
    textAlign: "center",
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

  // Recent Contacts Modal Styles
  recentContactsModal: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  closeModalButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.xl,
    marginVertical: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
  },
  clearSearchButton: {
    padding: spacing.xs,
  },
  contactsList: {
    paddingHorizontal: spacing.xl,
  },
  contactItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  contactAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.lg,
  },
  contactInitials: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: 2,
  },
  contactAddress: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: "monospace",
  },
  callActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  callActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl * 2,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.lg,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.sm,
  },
});
