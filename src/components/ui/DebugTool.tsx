import React, { useState } from "react";
import { Alert, StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "./Text";
import { useWallet } from "@/contexts/WalletContext";
import { palette } from "@/theme/colors";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

interface DebugToolProps {
  onComplete?: () => void;
}

export const DebugTool: React.FC<DebugToolProps> = ({ onComplete }) => {
  const { resetWalletData } = useWallet();
  const [pressCount, setPressCount] = useState(0);
  const [lastPressTime, setLastPressTime] = useState(0);

  const handlePress = () => {
    const currentTime = Date.now();
    const timeDiff = currentTime - lastPressTime;

    // Reset counter if more than 2 seconds have passed
    if (timeDiff > 2000) {
      setPressCount(1);
    } else {
      setPressCount((prev) => prev + 1);
    }

    setLastPressTime(currentTime);

    // Show debug options after 5 consecutive taps within 2 seconds each
    if (pressCount >= 4) {
      setPressCount(0);
      showDebugOptions();
    }
  };

  const showDebugOptions = () => {
    Alert.alert("🔧 Debug Tools", "Choose a debug action:", [
      {
        text: "🗑️ Clear All Wallet Data",
        style: "destructive",
        onPress: () => confirmClearWalletData(),
      },
      {
        text: "Cancel",
        style: "cancel",
      },
    ]);
  };

  const confirmClearWalletData = () => {
    Alert.alert(
      "⚠️ Clear Wallet Data",
      "This will permanently delete ALL wallet data including:\n\n• Saved wallet/private keys\n• Passwords\n• Settings\n• Transaction history\n• Biometric settings\n\nThis action cannot be undone. Are you sure?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Yes, Clear Everything",
          style: "destructive",
          onPress: handleClearWalletData,
        },
      ]
    );
  };

  const handleClearWalletData = async () => {
    try {
      await resetWalletData();
      Alert.alert(
        "✅ Wallet Data Cleared",
        "All wallet data has been successfully cleared. You can now create or import a new wallet.",
        [
          {
            text: "OK",
            onPress: onComplete,
          },
        ]
      );
    } catch (error) {
      console.error("Failed to clear wallet data:", error);
      Alert.alert(
        "❌ Error",
        "Failed to clear wallet data. Please try again or restart the app.",
        [{ text: "OK" }]
      );
    }
  };

  return (
    <TouchableOpacity
      style={styles.debugButton}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.debugContent}>
        <MaterialCommunityIcons
          name="bug"
          size={12}
          color={palette.neutralMid}
        />
        <Text style={styles.debugText}>Debug ({pressCount}/5)</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  debugButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: palette.neutralLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.neutralMid + "30",
    opacity: 0.7,
  },
  debugContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  debugText: {
    fontSize: 11,
    color: palette.neutralMid,
    fontWeight: "500",
  },
});
