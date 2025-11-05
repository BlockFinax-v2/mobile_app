import { palette } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import React, { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

export interface Network {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: "popular" | "custom" | "testnet";
  chainId?: string;
  rpcUrl?: string;
}

const POPULAR_NETWORKS: Network[] = [
  {
    id: "ethereum",
    name: "Ethereum",
    icon: "ethereum",
    color: "#627EEA",
    type: "popular",
    chainId: "1",
    rpcUrl: "https://mainnet.infura.io/v3/",
  },
  {
    id: "linea",
    name: "Linea",
    icon: "link-variant",
    color: "#61DFFF",
    type: "popular",
    chainId: "59144",
    rpcUrl: "https://rpc.linea.build",
  },
  {
    id: "bnb",
    name: "BNB Chain",
    icon: "alpha-b-circle",
    color: "#F3BA2F",
    type: "popular",
    chainId: "56",
    rpcUrl: "https://bsc-dataseed.binance.org/",
  },
  {
    id: "base",
    name: "Base",
    icon: "alpha-b-circle-outline",
    color: "#0052FF",
    type: "popular",
    chainId: "8453",
    rpcUrl: "https://mainnet.base.org",
  },
  {
    id: "cchain",
    name: "C-Chain",
    icon: "mountain",
    color: "#E84142",
    type: "popular",
    chainId: "43114",
    rpcUrl: "https://api.avax.network/ext/bc/C/rpc",
  },
];

const CUSTOM_NETWORKS: Network[] = [
  {
    id: "hedera",
    name: "Hedera Mainnet",
    icon: "hexagon-outline",
    color: "#22295A",
    type: "custom",
    chainId: "295",
    rpcUrl: "https://mainnet.hashio.io/api",
  },
  {
    id: "somnia",
    name: "Somnia Testnet",
    icon: "sleep",
    color: "#9D4EDD",
    type: "custom",
    chainId: "50311",
    rpcUrl: "https://testnet.somnia.network",
  },
];

const TESTNETS: Network[] = [
  {
    id: "sepolia",
    name: "Ethereum Sepolia",
    icon: "test-tube",
    color: "#FBB040",
    type: "testnet",
    chainId: "11155111",
    rpcUrl: "https://sepolia.infura.io/v3/",
  },
  {
    id: "linea-sepolia",
    name: "Linea Sepolia",
    icon: "test-tube",
    color: "#61DFFF",
    type: "testnet",
    chainId: "59141",
    rpcUrl: "https://rpc.sepolia.linea.build",
  },
  {
    id: "mega",
    name: "Mega Testnet",
    icon: "flash",
    color: "#FF6B35",
    type: "testnet",
    chainId: "888888888",
    rpcUrl: "https://mega-rpc.arcology.network/api",
  },
  {
    id: "monad",
    name: "Monad Testnet",
    icon: "diamond-stone",
    color: "#8B5CF6",
    type: "testnet",
    chainId: "41144114",
    rpcUrl: "https://testnet-rpc.monad.xyz",
  },
];

// Export all network arrays for use in other components
export { CUSTOM_NETWORKS, POPULAR_NETWORKS, TESTNETS };

// Helper function to get all networks
export const getAllNetworks = (): Network[] => [
  ...POPULAR_NETWORKS,
  ...CUSTOM_NETWORKS,
  ...TESTNETS,
];

interface NetworkSelectorProps {
  selectedNetwork?: Network;
  onNetworkSelect: (network: Network) => void;
  style?: any;
}

export const NetworkSelector: React.FC<NetworkSelectorProps> = ({
  selectedNetwork = TESTNETS[0], // Default to Ethereum Sepolia
  onNetworkSelect,
  style,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<"popular" | "custom">("popular");

  const handleNetworkSelect = (network: Network) => {
    onNetworkSelect(network);
    setModalVisible(false);
  };

  const renderNetworkItem = ({ item }: { item: Network }) => (
    <Pressable
      style={({ pressed }) => [
        styles.networkItem,
        pressed && styles.networkItemPressed,
        selectedNetwork?.id === item.id && styles.selectedNetworkItem,
      ]}
      onPress={() => handleNetworkSelect(item)}
    >
      <View style={styles.networkItemLeft}>
        <View style={[styles.networkIcon, { backgroundColor: item.color }]}>
          <MaterialCommunityIcons
            name={item.icon as any}
            size={24}
            color={palette.white}
          />
        </View>
        <Text style={styles.networkName}>{item.name}</Text>
      </View>
      <Pressable style={styles.networkOptions}>
        <MaterialCommunityIcons
          name="dots-vertical"
          size={20}
          color={palette.neutralMid}
        />
      </Pressable>
    </Pressable>
  );

  const getNetworksForTab = () => {
    if (activeTab === "popular") {
      return [
        {
          id: "all-popular",
          name: "All popular networks",
          icon: "earth",
          color: palette.primaryBlue,
          type: "popular" as const,
        },
        ...POPULAR_NETWORKS,
      ];
    } else {
      return [
        ...CUSTOM_NETWORKS,
        {
          id: "testnets-header",
          name: "Testnets",
          icon: "",
          color: "",
          type: "testnet" as const,
          isHeader: true,
        },
        ...TESTNETS,
      ];
    }
  };

  const renderNetworkSection = ({
    item,
  }: {
    item: Network & { isHeader?: boolean };
  }) => {
    if (item.isHeader) {
      return (
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>{item.name}</Text>
        </View>
      );
    }
    return renderNetworkItem({ item });
  };

  return (
    <>
      <Pressable
        style={[styles.selector, style]}
        onPress={() => setModalVisible(true)}
      >
        <View style={styles.selectedNetworkContainer}>
          <View
            style={[
              styles.selectedNetworkIcon,
              { backgroundColor: selectedNetwork.color },
            ]}
          >
            <MaterialCommunityIcons
              name={selectedNetwork.icon as any}
              size={18}
              color={palette.white}
            />
          </View>
          <View style={styles.selectedNetworkInfo}>
            <Text style={styles.selectedNetworkText}>
              {selectedNetwork.name}
            </Text>
            {selectedNetwork.chainId && (
              <Text style={styles.selectedNetworkChain}>
                Chain {selectedNetwork.chainId}
              </Text>
            )}
          </View>
        </View>
        <MaterialCommunityIcons
          name="chevron-down"
          size={20}
          color={palette.neutralMid}
        />
      </Pressable>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select network</Text>
              <Pressable
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color={palette.neutralMid}
                />
              </Pressable>
            </View>

            <View style={styles.tabContainer}>
              <Pressable
                style={[
                  styles.tab,
                  activeTab === "popular" && styles.activeTab,
                ]}
                onPress={() => setActiveTab("popular")}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "popular" && styles.activeTabText,
                  ]}
                >
                  Popular
                </Text>
              </Pressable>
              <Pressable
                style={[styles.tab, activeTab === "custom" && styles.activeTab]}
                onPress={() => setActiveTab("custom")}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "custom" && styles.activeTabText,
                  ]}
                >
                  Custom
                </Text>
              </Pressable>
            </View>

            <FlatList
              data={getNetworksForTab()}
              renderItem={renderNetworkSection}
              keyExtractor={(item) => item.id}
              style={styles.networkList}
              showsVerticalScrollIndicator={false}
            />

            {activeTab === "custom" && (
              <Pressable style={styles.addCustomNetwork}>
                <MaterialCommunityIcons
                  name="plus"
                  size={20}
                  color={palette.primaryBlue}
                />
                <Text style={styles.addCustomNetworkText}>
                  Add custom network
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  selector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: palette.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.neutralLighter,
    minHeight: 44,
  },
  selectedNetworkContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  selectedNetworkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedNetworkText: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.neutralDark,
  },
  selectedNetworkInfo: {
    flex: 1,
  },
  selectedNetworkChain: {
    fontSize: 12,
    color: palette.neutralMid,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: palette.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
    paddingBottom: spacing.xl,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: palette.neutralLighter,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: palette.neutralDark,
  },
  closeButton: {
    padding: spacing.xs,
  },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  tab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginRight: spacing.md,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: palette.primaryBlue,
  },
  tabText: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.neutralMid,
  },
  activeTabText: {
    color: palette.primaryBlue,
  },
  networkList: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  networkItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: 12,
    marginBottom: spacing.xs,
  },
  networkItemPressed: {
    backgroundColor: palette.surface,
  },
  selectedNetworkItem: {
    backgroundColor: palette.primaryBlueLight + "20",
  },
  networkItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    flex: 1,
  },
  networkIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  networkName: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.neutralDark,
  },
  networkOptions: {
    padding: spacing.xs,
  },
  sectionHeader: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.neutralMid,
    textTransform: "uppercase",
  },
  addCustomNetwork: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.primaryBlue,
    borderStyle: "dashed",
  },
  addCustomNetworkText: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.primaryBlue,
  },
});
