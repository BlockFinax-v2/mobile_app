import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import {
  getNetworks,
  SupportedNetworkId,
  useWallet,
} from "@/contexts/WalletContext";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";

const tabs = ["Main Wallet", "Escrow Wallets", "History"] as const;

export const WalletOverviewScreen: React.FC = () => {
  const { address, balances, selectedNetwork, switchNetwork } = useWallet();
  const [activeTab, setActiveTab] =
    useState<(typeof tabs)[number]>("Main Wallet");
  const [headerHeight, setHeaderHeight] = useState(0);

  return (
    <Screen padded={false}>
      <View style={styles.container}>
        {/* Static Header */}
        <View
          style={styles.staticHeader}
          onLayout={(event) => {
            const { height } = event.nativeEvent.layout;
            if (height !== headerHeight) {
              setHeaderHeight(height);
            }
          }}
        >
          <View style={styles.welcomeSection}>
            <View style={styles.welcomeText}>
              <Text style={styles.welcomeTitle}>Welcome back!</Text>
              <Text style={styles.welcomeSubtitle}>
                Manage your digital assets and trade finance
              </Text>
            </View>
            <View style={styles.headerIcons}>
              <TouchableOpacity style={styles.iconButton}>
                <MaterialCommunityIcons
                  name="bell-outline"
                  size={24}
                  color={colors.text}
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton}>
                <MaterialCommunityIcons
                  name="qrcode-scan"
                  size={24}
                  color={colors.text}
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton}>
                <MaterialCommunityIcons
                  name="cog-outline"
                  size={24}
                  color={colors.text}
                />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Scrollable Content */}
        <ScrollView
          style={[
            styles.scrollableContent,
            {
              marginTop: headerHeight > 0 ? headerHeight : spacing.xl,
            },
          ]}
          contentContainerStyle={[
            styles.scrollContentContainer,
            { paddingTop: spacing.lg },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Total Balance</Text>
            <Text style={styles.balanceAmount}>
              {balances.primary.toFixed(2)} {selectedNetwork.primaryCurrency}
            </Text>
            <Text style={styles.balanceUsd}>{balances.usd.toFixed(2)} USD</Text>
            <View style={styles.networkPill}>
              <MaterialCommunityIcons
                name="lan"
                size={16}
                color={colors.primary}
              />
              <Text style={styles.networkPillText}>{selectedNetwork.name}</Text>
            </View>
          </View>

          <View style={styles.tabsRow}>
            {tabs.map((tab) => (
              <Button
                key={tab}
                label={tab}
                variant={activeTab === tab ? "primary" : "outline"}
                onPress={() => setActiveTab(tab)}
                style={styles.tabButton}
              />
            ))}
          </View>

          {activeTab === "Main Wallet" && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Wallet Address</Text>
              <Text style={styles.address}>{address}</Text>
              <Button
                label="Copy Address"
                variant="outline"
                style={styles.copyBtn}
              />

              <View style={styles.qrWrapper}>
                {address ? <QRCode value={address} size={150} /> : null}
              </View>
              <Button label="Share Address" variant="secondary" />
            </View>
          )}

          {activeTab === "Escrow Wallets" && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Active Escrows</Text>
              <View style={styles.escrowItem}>
                <View>
                  <Text style={styles.escrowTitle}>Contract #CT-1209</Text>
                  <Text style={styles.escrowSubtitle}>
                    Release on delivery confirmation
                  </Text>
                </View>
                <Text style={styles.escrowAmount}>15,000 USDC</Text>
              </View>
              <Button label="View All Escrows" variant="outline" />
            </View>
          )}

          {activeTab === "History" && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Transaction History</Text>
              <Text style={styles.historyPlaceholder}>
                Recent transactions will appear here.
              </Text>
              <Button label="View Transactions" variant="outline" />
            </View>
          )}

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Networks</Text>
            {getNetworks().map((network) => (
              <View key={network.id} style={styles.networkItem}>
                <View>
                  <Text style={styles.networkName}>{network.name}</Text>
                  <Text style={styles.networkChainId}>
                    Chain ID: {network.chainId}
                  </Text>
                </View>
                <Button
                  label={
                    selectedNetwork.id === network.id ? "Active" : "Switch"
                  }
                  variant={
                    selectedNetwork.id === network.id ? "secondary" : "outline"
                  }
                  style={styles.smallBtn}
                  disabled={selectedNetwork.id === network.id}
                  onPress={() =>
                    switchNetwork(network.id as SupportedNetworkId)
                  }
                />
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  staticHeader: {
    backgroundColor: "white",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  welcomeSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  welcomeText: {
    flex: 1,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  headerIcons: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  scrollableContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  balanceCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: 24,
    padding: spacing.lg,
    gap: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255,255,255,0.8)",
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: "700",
    color: "white",
    marginVertical: spacing.xs,
  },
  balanceUsd: {
    fontSize: 16,
    color: "rgba(255,255,255,0.9)",
  },
  networkPill: {
    marginTop: spacing.sm,
    alignSelf: "flex-start",
    backgroundColor: "white",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  networkPillText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  tabsRow: {
    flexDirection: "row",
    marginHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  tabButton: {
    flex: 1,
  },
  card: {
    marginHorizontal: spacing.lg,
    backgroundColor: "white",
    borderRadius: 24,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  address: {
    fontFamily:
      Platform.select({
        ios: "Menlo",
        android: "monospace",
      }) ?? undefined,
    color: colors.text,
    fontSize: 14,
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  copyBtn: {
    alignSelf: "flex-start",
  },
  qrWrapper: {
    alignItems: "center",
    marginVertical: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.background,
    borderRadius: 12,
  },
  escrowItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  escrowTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  escrowSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  escrowAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.primary,
  },
  historyPlaceholder: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    padding: spacing.lg,
    fontStyle: "italic",
  },
  networkItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  networkName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
  },
  networkChainId: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  smallBtn: {
    width: 90,
  },
});
