import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import {
  getMainnetNetworks,
  getTestnetNetworks,
  SupportedNetworkId,
  useWallet,
  WalletNetwork,
} from "@/contexts/WalletContext";
import { palette } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import React, { useMemo } from "react";
import {
  FlatList,
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
  if (networkId.includes("lisk")) return "flash-circle";
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

export const NetworkConfigScreen: React.FC = () => {
  const { selectedNetwork, switchNetwork } = useWallet();

  // Get organized networks
  const mainnetNetworks = useMemo(() => getMainnetNetworks(), []);
  const testnetNetworks = useMemo(() => getTestnetNetworks(), []);

  const handleNetworkSelect = async (networkId: SupportedNetworkId) => {
    try {
      await switchNetwork(networkId);
    } catch (error) {
      console.error("Failed to switch network:", error);
    }
  };

  const renderNetworkItem = (network: WalletNetwork) => {
    const isActive = selectedNetwork.id === network.id;
    const icon = getNetworkIcon(network.id);
    const color = getNetworkColor(network.id);

    return (
      <Pressable
        key={network.id}
        style={[styles.networkCard, isActive && styles.activeNetworkCard]}
        onPress={() => handleNetworkSelect(network.id)}
      >
        <View style={styles.networkCardContent}>
          <View style={styles.networkInfo}>
            <View style={[styles.networkIcon, { backgroundColor: color }]}>
              <MaterialCommunityIcons
                name={icon as any}
                size={24}
                color={palette.white}
              />
            </View>
            <View style={styles.networkDetails}>
              <Text style={styles.networkName}>{network.name}</Text>
              <Text style={styles.networkMeta}>
                Chain ID: {network.chainId}
              </Text>
              <Text style={styles.networkMeta} numberOfLines={1}>
                {network.primaryCurrency}
              </Text>
              {network.stablecoins && network.stablecoins.length > 0 && (
                <Text style={styles.tokenCount}>
                  {network.stablecoins.length} stablecoin
                  {network.stablecoins.length !== 1 ? "s" : ""} supported
                </Text>
              )}
            </View>
          </View>
          <View style={styles.networkActions}>
            {isActive ? (
              <View style={styles.activeIndicator}>
                <MaterialCommunityIcons
                  name="check-circle"
                  size={24}
                  color={palette.accentGreen}
                />
                <Text style={styles.activeText}>Active</Text>
              </View>
            ) : (
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color={palette.neutralMid}
              />
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <Screen>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <MaterialCommunityIcons
            name="lan"
            size={32}
            color={palette.primaryBlue}
          />
          <Text
            variant="title"
            color={palette.primaryBlue}
            style={styles.title}
          >
            Network Configuration
          </Text>
          <Text color={palette.neutralMid} style={styles.subtitle}>
            Select your preferred blockchain network
          </Text>
        </View>

        {/* Mainnet Networks Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderContainer}>
            <MaterialCommunityIcons
              name="shield-check"
              size={20}
              color={palette.primaryBlue}
            />
            <Text style={styles.sectionTitle}>Mainnet Networks</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Production networks with real assets
          </Text>
          {mainnetNetworks.map((network) => renderNetworkItem(network))}
        </View>

        {/* Testnet Networks Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderContainer}>
            <MaterialCommunityIcons
              name="test-tube"
              size={20}
              color={palette.warningYellow}
            />
            <Text style={styles.sectionTitle}>Testnet Networks</Text>
          </View>
          <Text style={styles.sectionDescription}>
            Testing networks with test tokens (no real value)
          </Text>
          {testnetNetworks.map((network) => renderNetworkItem(network))}
        </View>

        {/* Info Card */}
        <View style={styles.infoCard}>
          <MaterialCommunityIcons
            name="information"
            size={20}
            color={palette.primaryBlue}
          />
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Network Information</Text>
            <Text style={styles.infoText}>
              • Mainnets handle real transactions with actual value{"\n"}•
              Testnets are for development and testing only{"\n"}• You can
              switch networks anytime from the wallet
            </Text>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xl,
    paddingVertical: spacing.lg,
  },
  title: {
    marginTop: spacing.md,
  },
  subtitle: {
    marginTop: spacing.xs,
    textAlign: "center",
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeaderContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: palette.neutralDark,
  },
  sectionDescription: {
    fontSize: 14,
    color: palette.neutralMid,
    marginBottom: spacing.md,
  },
  networkCard: {
    backgroundColor: palette.white,
    borderRadius: 16,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: palette.neutralLighter,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  activeNetworkCard: {
    borderColor: palette.accentGreen,
    borderWidth: 2,
  },
  networkCardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
  },
  networkInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: spacing.md,
  },
  networkIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  networkDetails: {
    flex: 1,
  },
  networkName: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.neutralDark,
    marginBottom: spacing.xs,
  },
  networkMeta: {
    fontSize: 12,
    color: palette.neutralMid,
    marginBottom: 2,
  },
  tokenCount: {
    fontSize: 11,
    color: palette.primaryBlue,
    marginTop: spacing.xs,
    fontWeight: "500",
  },
  networkActions: {
    marginLeft: spacing.sm,
  },
  activeIndicator: {
    alignItems: "center",
    gap: spacing.xs,
  },
  activeText: {
    fontSize: 11,
    fontWeight: "600",
    color: palette.accentGreen,
  },
  infoCard: {
    backgroundColor: "#EEF2FF",
    borderRadius: 16,
    padding: spacing.lg,
    flexDirection: "row",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: palette.primaryBlueLight,
    marginBottom: spacing.xl,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.primaryBlue,
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: 13,
    color: palette.neutralDark,
    lineHeight: 20,
  },
});
