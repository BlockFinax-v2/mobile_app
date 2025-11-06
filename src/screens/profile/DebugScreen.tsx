import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { useWallet } from "@/contexts/WalletContext";
import { secureStorage } from "@/utils/secureStorage";
import { palette } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  View,
  RefreshControl,
  Share,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

interface WalletDebugInfo {
  hasWallet: boolean;
  isUnlocked: boolean;
  address?: string;
  selectedNetwork: string;
  lastUnlockTime?: string;
  biometricEnabled: boolean;
  isBiometricAvailable: boolean;
  walletPersistent: boolean;
  settings: any;
  balances: any;
  secureDataKeys: string[];
  asyncDataKeys: string[];
}

export const DebugScreen: React.FC = () => {
  const {
    hasWallet,
    isUnlocked,
    address,
    selectedNetwork,
    lastUnlockTime,
    settings,
    balances,
    isBiometricAvailable,
    resetWalletData,
    lockWallet,
  } = useWallet();

  const [debugInfo, setDebugInfo] = useState<WalletDebugInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const loadDebugInfo = useCallback(async () => {
    setIsLoading(true);
    try {
      // Check secure storage keys
      const secureKeys = [
        "blockfinax.mnemonic",
        "blockfinax.privateKey",
        "blockfinax.password",
        "blockfinax.biometric_hash",
      ];

      // Check async storage keys
      const asyncKeys = [
        "blockfinax.settings",
        "blockfinax.network",
        "blockfinax.lastUnlock",
        "blockfinax.wallet_persistent",
        "blockfinax.biometric_enabled",
      ];

      const secureDataKeys: string[] = [];
      for (const key of secureKeys) {
        try {
          const value = await secureStorage.getSecureItem(key);
          if (value !== null) {
            secureDataKeys.push(key);
          }
        } catch (error) {
          // Key doesn't exist or error reading
        }
      }

      const asyncDataKeys: string[] = [];
      for (const key of asyncKeys) {
        try {
          const value = await secureStorage.getItem(key);
          if (value !== null) {
            asyncDataKeys.push(key);
          }
        } catch (error) {
          // Key doesn't exist or error reading
        }
      }

      // Get additional settings
      const biometricEnabled = await secureStorage.getItem(
        "blockfinax.biometric_enabled"
      );
      const walletPersistent = await secureStorage.getItem(
        "blockfinax.wallet_persistent"
      );

      const info: WalletDebugInfo = {
        hasWallet,
        isUnlocked,
        address,
        selectedNetwork: selectedNetwork.name,
        lastUnlockTime: lastUnlockTime?.toISOString(),
        biometricEnabled: biometricEnabled === "true",
        isBiometricAvailable,
        walletPersistent: walletPersistent === "true",
        settings,
        balances,
        secureDataKeys,
        asyncDataKeys,
      };

      setDebugInfo(info);
    } catch (error) {
      console.error("Failed to load debug info:", error);
      Alert.alert("Error", "Failed to load debug information");
    } finally {
      setIsLoading(false);
    }
  }, [
    hasWallet,
    isUnlocked,
    address,
    selectedNetwork,
    lastUnlockTime,
    settings,
    balances,
    isBiometricAvailable,
  ]);

  useEffect(() => {
    loadDebugInfo();
  }, [loadDebugInfo]);

  const handleClearWalletData = () => {
    Alert.alert(
      "⚠️ Clear Wallet Data",
      "This will completely remove all wallet data from this device. You will need to create or import a wallet again.\n\nThis action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear All Data",
          style: "destructive",
          onPress: confirmClearWalletData,
        },
      ]
    );
  };

  const confirmClearWalletData = async () => {
    setIsResetting(true);
    try {
      await resetWalletData();
      Alert.alert(
        "✅ Wallet Data Cleared",
        "All wallet data has been removed from this device. You can now test the authentication flow again.",
        [
          {
            text: "OK",
            onPress: () => {
              // Refresh debug info to show cleared state
              loadDebugInfo();
            },
          },
        ]
      );
    } catch (error) {
      console.error("Failed to clear wallet data:", error);
      Alert.alert(
        "❌ Clear Failed",
        "Failed to clear wallet data. Please try again."
      );
    } finally {
      setIsResetting(false);
    }
  };

  const handleLockWallet = async () => {
    try {
      await lockWallet();
      Alert.alert("🔒 Wallet Locked", "Wallet has been locked successfully.");
      loadDebugInfo();
    } catch (error) {
      Alert.alert("Error", "Failed to lock wallet");
    }
  };

  const handleExportDebugInfo = async () => {
    if (!debugInfo) return;

    const debugReport = `
BlockFinax Wallet Debug Report
Generated: ${new Date().toISOString()}

=== WALLET STATE ===
Has Wallet: ${debugInfo.hasWallet}
Is Unlocked: ${debugInfo.isUnlocked}
Address: ${debugInfo.address || "Not available"}
Selected Network: ${debugInfo.selectedNetwork}
Last Unlock: ${debugInfo.lastUnlockTime || "Never"}

=== SECURITY ===
Biometric Available: ${debugInfo.isBiometricAvailable}
Biometric Enabled: ${debugInfo.biometricEnabled}
Wallet Persistent: ${debugInfo.walletPersistent}

=== STORAGE ===
Secure Storage Keys: ${debugInfo.secureDataKeys.length}
${debugInfo.secureDataKeys.map((key) => `  - ${key}`).join("\n")}

Async Storage Keys: ${debugInfo.asyncDataKeys.length}
${debugInfo.asyncDataKeys.map((key) => `  - ${key}`).join("\n")}

=== SETTINGS ===
${JSON.stringify(debugInfo.settings, null, 2)}

=== BALANCES ===
Primary: ${debugInfo.balances.primary}
USD: ${debugInfo.balances.usd}
Tokens: ${debugInfo.balances.tokens.length}
`;

    try {
      await Share.share({
        message: debugReport,
        title: "BlockFinax Debug Report",
      });
    } catch (error) {
      Alert.alert("Error", "Failed to export debug info");
    }
  };

  const InfoCard: React.FC<{
    title: string;
    icon: string;
    children: React.ReactNode;
  }> = ({ title, icon, children }) => (
    <View style={styles.infoCard}>
      <View style={styles.cardHeader}>
        <MaterialCommunityIcons
          name={icon as any}
          size={20}
          color={palette.primaryBlue}
        />
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );

  if (isLoading || !debugInfo) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <MaterialCommunityIcons
            name="loading"
            size={32}
            color={palette.primaryBlue}
          />
          <Text>Loading debug information...</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadDebugInfo} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <MaterialCommunityIcons
            name="bug"
            size={32}
            color={palette.primaryBlue}
          />
          <View style={styles.headerText}>
            <Text variant="title" color={palette.primaryBlue}>
              Debug Tools
            </Text>
            <Text color={palette.neutralMid} style={styles.subtitle}>
              Wallet information and development tools
            </Text>
          </View>
        </View>

        {/* Warning Notice */}
        <View style={styles.warningCard}>
          <MaterialCommunityIcons
            name="alert-circle"
            size={20}
            color={palette.warningYellow}
          />
          <View style={styles.warningContent}>
            <Text style={styles.warningTitle}>Development Tool</Text>
            <Text style={styles.warningText}>
              This screen is for development and testing purposes. Use with
              caution in production.
            </Text>
          </View>
        </View>

        {/* Wallet State */}
        <InfoCard title="Wallet State" icon="wallet">
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Has Wallet:</Text>
            <Text
              style={[
                styles.infoValue,
                {
                  color: debugInfo.hasWallet
                    ? palette.accentGreen
                    : palette.errorRed,
                },
              ]}
            >
              {debugInfo.hasWallet ? "✅ Yes" : "❌ No"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Is Unlocked:</Text>
            <Text
              style={[
                styles.infoValue,
                {
                  color: debugInfo.isUnlocked
                    ? palette.accentGreen
                    : palette.errorRed,
                },
              ]}
            >
              {debugInfo.isUnlocked ? "🔓 Unlocked" : "🔒 Locked"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Address:</Text>
            <Text style={styles.infoValue}>
              {debugInfo.address
                ? `${debugInfo.address.slice(0, 8)}...${debugInfo.address.slice(
                    -6
                  )}`
                : "None"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Network:</Text>
            <Text style={styles.infoValue}>{debugInfo.selectedNetwork}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Unlock:</Text>
            <Text style={styles.infoValue}>
              {debugInfo.lastUnlockTime
                ? new Date(debugInfo.lastUnlockTime).toLocaleString()
                : "Never"}
            </Text>
          </View>
        </InfoCard>

        {/* Security Info */}
        <InfoCard title="Security Settings" icon="shield-check">
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Biometric Available:</Text>
            <Text
              style={[
                styles.infoValue,
                {
                  color: debugInfo.isBiometricAvailable
                    ? palette.accentGreen
                    : palette.errorRed,
                },
              ]}
            >
              {debugInfo.isBiometricAvailable ? "✅ Yes" : "❌ No"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Biometric Enabled:</Text>
            <Text
              style={[
                styles.infoValue,
                {
                  color: debugInfo.biometricEnabled
                    ? palette.accentGreen
                    : palette.neutralMid,
                },
              ]}
            >
              {debugInfo.biometricEnabled ? "🔐 Enabled" : "🔓 Disabled"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Wallet Persistent:</Text>
            <Text
              style={[
                styles.infoValue,
                {
                  color: debugInfo.walletPersistent
                    ? palette.accentGreen
                    : palette.neutralMid,
                },
              ]}
            >
              {debugInfo.walletPersistent ? "💾 Yes" : "🔄 No"}
            </Text>
          </View>
        </InfoCard>

        {/* Storage Info */}
        <InfoCard title="Storage Information" icon="database">
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Secure Storage Keys:</Text>
            <Text style={styles.infoValue}>
              {debugInfo.secureDataKeys.length}
            </Text>
          </View>
          {debugInfo.secureDataKeys.map((key) => (
            <Text key={key} style={styles.storageKey}>
              🔐 {key}
            </Text>
          ))}

          <View style={[styles.infoRow, { marginTop: spacing.md }]}>
            <Text style={styles.infoLabel}>Async Storage Keys:</Text>
            <Text style={styles.infoValue}>
              {debugInfo.asyncDataKeys.length}
            </Text>
          </View>
          {debugInfo.asyncDataKeys.map((key) => (
            <Text key={key} style={styles.storageKey}>
              💾 {key}
            </Text>
          ))}
        </InfoCard>

        {/* Balance Info */}
        <InfoCard title="Balance Information" icon="currency-usd">
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Primary Balance:</Text>
            <Text style={styles.infoValue}>
              {debugInfo.balances.primary.toFixed(6)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>USD Value:</Text>
            <Text style={styles.infoValue}>
              ${debugInfo.balances.usd.toFixed(2)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Token Count:</Text>
            <Text style={styles.infoValue}>
              {debugInfo.balances.tokens.length}
            </Text>
          </View>
        </InfoCard>

        {/* Action Buttons */}
        <View style={styles.actionsCard}>
          <Text style={styles.actionsTitle}>Debug Actions</Text>

          <Button
            label="🔄 Refresh Debug Info"
            variant="outline"
            onPress={loadDebugInfo}
            loading={isLoading}
            style={styles.actionButton}
          />

          <Button
            label="📤 Export Debug Report"
            variant="outline"
            onPress={handleExportDebugInfo}
            style={styles.actionButton}
          />

          {debugInfo.isUnlocked && (
            <Button
              label="🔒 Lock Wallet"
              variant="outline"
              onPress={handleLockWallet}
              style={styles.actionButton}
            />
          )}

          <Button
            label="🗑️ Clear All Wallet Data"
            onPress={handleClearWalletData}
            loading={isResetting}
            style={[styles.actionButton, styles.dangerButton]}
            disabled={isResetting}
          />
        </View>

        {/* Footer Info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Use "Clear All Wallet Data" to test the authentication flow again.
            This will remove all wallet information from this device.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  headerText: {
    flex: 1,
  },
  subtitle: {
    fontSize: 14,
    marginTop: spacing.xs,
  },
  warningCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: palette.warningYellow + "15",
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.warningYellow + "30",
    marginBottom: spacing.lg,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.warningYellow,
    marginBottom: spacing.xs,
  },
  warningText: {
    fontSize: 12,
    color: palette.neutralDark,
  },
  infoCard: {
    backgroundColor: palette.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: palette.neutralLighter,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.neutralDark,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  infoLabel: {
    fontSize: 14,
    color: palette.neutralMid,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
    color: palette.neutralDark,
    textAlign: "right",
    flex: 1,
  },
  storageKey: {
    fontSize: 12,
    color: palette.neutralMid,
    marginLeft: spacing.md,
    marginBottom: spacing.xs,
    fontFamily: "monospace",
  },
  actionsCard: {
    backgroundColor: palette.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: palette.neutralLighter,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.neutralDark,
    marginBottom: spacing.md,
  },
  actionButton: {
    marginBottom: spacing.sm,
  },
  dangerButton: {
    backgroundColor: palette.errorRed,
  },
  footer: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  footerText: {
    fontSize: 12,
    color: palette.neutralMid,
    textAlign: "center",
    lineHeight: 18,
  },
});
