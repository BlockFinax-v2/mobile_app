import { Text } from "@/components/ui/Text";
import {
  getMainnetNetworks,
  getTestnetNetworks,
  SupportedNetworkId,
  useWallet,
  WalletNetwork,
} from "@/contexts/WalletContext";
import { formatBalanceForUI } from "@/utils/tokenUtils";
import { palette } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

// Network icon mapping
const getNetworkIcon = (networkId: SupportedNetworkId): string => {
  if (networkId.includes("ethereum")) return "ethereum";
  if (networkId.includes("base")) return "alpha-b-circle-outline";
  if (networkId.includes("lisk")) return "alpha-l-circle";
  if (networkId.includes("polygon")) return "triangle";
  if (networkId.includes("bsc") || networkId.includes("bnb"))
    return "alpha-b-circle";
  return "earth";
};

// Network color mapping
const getNetworkColor = (networkId: SupportedNetworkId): string => {
  if (networkId.includes("ethereum")) return "#627EEA";
  if (networkId.includes("base")) return "#0052FF";
  if (networkId.includes("lisk")) return "#4070F4";
  if (networkId.includes("polygon")) return "#8247E5";
  if (networkId.includes("bsc") || networkId.includes("bnb")) return "#F3BA2F";
  return palette.primaryBlue;
};

interface NetworkSelectorProps {
  visible: boolean;
  onClose: () => void;
  onSelectNetwork: (networkId: SupportedNetworkId) => void;
  selectedNetworkId?: SupportedNetworkId;
  showTestnets?: boolean;
}

export const NetworkSelector: React.FC<NetworkSelectorProps> = ({
  visible,
  onClose,
  onSelectNetwork,
  selectedNetworkId,
  showTestnets = true,
}) => {
  const { selectedNetwork, balances, switchNetwork } = useWallet();
  const [switching, setSwitching] = React.useState<SupportedNetworkId | null>(
    null
  );

  const mainnetNetworks = React.useMemo(() => getMainnetNetworks(), []);
  const testnetNetworks = React.useMemo(() => getTestnetNetworks(), []);

  const handleNetworkSelect = async (networkId: SupportedNetworkId) => {
    setSwitching(networkId);
    try {
      await switchNetwork(networkId);
      onSelectNetwork(networkId);
      onClose();
    } catch (error) {
      console.error("Failed to switch network:", error);
    } finally {
      setSwitching(null);
    }
  };

  const renderNetworkItem = (network: WalletNetwork) => {
    const isActive = (selectedNetworkId || selectedNetwork.id) === network.id;
    const isLoading = switching === network.id;
    const icon = getNetworkIcon(network.id);
    const color = getNetworkColor(network.id);

    // Get balance for this network (simplified for display)
    const balance = isActive ? formatBalanceForUI(balances.primary) : "--";

    return (
      <Pressable
        key={network.id}
        style={[styles.networkItem, isActive && styles.activeNetworkItem]}
        onPress={() => handleNetworkSelect(network.id)}
        disabled={isLoading}
      >
        <View style={styles.networkContent}>
          <View style={styles.networkLeft}>
            <View style={[styles.networkIcon, { backgroundColor: color }]}>
              <MaterialCommunityIcons
                name={icon as any}
                size={20}
                color={palette.white}
              />
            </View>
            <View style={styles.networkInfo}>
              <Text style={styles.networkName}>{network.name}</Text>
              <Text style={styles.networkMeta}>
                Chain ID: {network.chainId}
              </Text>
            </View>
          </View>

          <View style={styles.networkRight}>
            <View style={styles.balanceContainer}>
              <Text style={styles.balanceValue}>
                {balance} {network.primaryCurrency}
              </Text>
              {network.isTestnet && (
                <View style={styles.testnetBadge}>
                  <Text style={styles.testnetText}>TEST</Text>
                </View>
              )}
            </View>

            {isLoading ? (
              <ActivityIndicator size="small" color={palette.primaryBlue} />
            ) : isActive ? (
              <MaterialCommunityIcons
                name="check-circle"
                size={20}
                color={palette.successGreen}
              />
            ) : (
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color={palette.neutralMid}
              />
            )}
          </View>
        </View>

        {network.isTestnet && (
          <View style={styles.testnetWarning}>
            <MaterialCommunityIcons
              name="alert-circle"
              size={14}
              color={palette.warningYellow}
            />
            <Text style={styles.testnetWarningText}>
              Test Network - Tokens have no real value
            </Text>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <MaterialCommunityIcons
              name="earth"
              size={24}
              color={palette.primaryBlue}
            />
            <Text variant="title">Select Network</Text>
          </View>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <MaterialCommunityIcons
              name="close"
              size={24}
              color={palette.neutralDark}
            />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          {/* Mainnet Networks */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons
                name="shield-check"
                size={18}
                color={palette.successGreen}
              />
              <Text style={styles.sectionTitle}>Mainnet Networks</Text>
            </View>
            {mainnetNetworks.map(renderNetworkItem)}
          </View>

          {/* Testnet Networks */}
          {showTestnets && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons
                  name="test-tube"
                  size={18}
                  color={palette.warningYellow}
                />
                <Text style={styles.sectionTitle}>Testnet Networks</Text>
              </View>
              {testnetNetworks.map(renderNetworkItem)}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.surface,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    backgroundColor: palette.white,
    borderBottomWidth: 1,
    borderBottomColor: palette.neutralLighter,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  closeButton: {
    padding: spacing.xs,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.neutralDark,
  },
  networkItem: {
    backgroundColor: palette.white,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: palette.neutralLighter,
    gap: spacing.sm,
  },
  activeNetworkItem: {
    borderColor: palette.primaryBlue,
    backgroundColor: palette.primaryBlue + "08",
  },
  networkContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  networkLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  networkIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  networkInfo: {
    flex: 1,
  },
  networkName: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.neutralDark,
  },
  networkMeta: {
    fontSize: 12,
    color: palette.neutralMid,
    marginTop: 2,
  },
  networkRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  balanceContainer: {
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  balanceValue: {
    fontSize: 12,
    fontWeight: "500",
    color: palette.neutralDark,
  },
  testnetBadge: {
    backgroundColor: palette.warningYellow + "20",
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
  },
  testnetText: {
    fontSize: 8,
    fontWeight: "700",
    color: palette.warningYellow,
  },
  testnetWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: palette.warningYellow + "10",
    padding: spacing.xs,
    borderRadius: 6,
  },
  testnetWarningText: {
    fontSize: 11,
    color: palette.warningYellow,
    fontWeight: "500",
    flex: 1,
  },
});
