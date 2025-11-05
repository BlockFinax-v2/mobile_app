import { Button } from "@/components/ui/Button";
import { Network, getAllNetworks } from "@/components/ui/NetworkSelector";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { useNetwork } from "@/contexts/NetworkContext";
import { palette } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

interface AddNetworkModalProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (network: Network) => void;
}

const AddNetworkModal: React.FC<AddNetworkModalProps> = ({
  visible,
  onClose,
  onAdd,
}) => {
  const [networkName, setNetworkName] = useState("");
  const [rpcUrl, setRpcUrl] = useState("");
  const [chainId, setChainId] = useState("");
  const [symbol, setSymbol] = useState("");
  const [blockExplorer, setBlockExplorer] = useState("");

  const handleAddNetwork = () => {
    if (!networkName || !rpcUrl || !chainId) {
      Alert.alert("Error", "Please fill in all required fields");
      return;
    }

    const newNetwork: Network = {
      id: `custom-${Date.now()}`,
      name: networkName,
      icon: "earth",
      color: palette.primaryBlue,
      type: "custom",
      chainId,
      rpcUrl,
    };

    onAdd(newNetwork);
    onClose();

    // Reset form
    setNetworkName("");
    setRpcUrl("");
    setChainId("");
    setSymbol("");
    setBlockExplorer("");
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.addNetworkModal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Custom Network</Text>
            <Pressable onPress={onClose}>
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={palette.neutralMid}
              />
            </Pressable>
          </View>

          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Network Name *</Text>
              <TextInput
                style={styles.textInput}
                value={networkName}
                onChangeText={setNetworkName}
                placeholder="e.g., My Custom Network"
                placeholderTextColor={palette.neutralMid}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>RPC URL *</Text>
              <TextInput
                style={styles.textInput}
                value={rpcUrl}
                onChangeText={setRpcUrl}
                placeholder="https://..."
                placeholderTextColor={palette.neutralMid}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Chain ID *</Text>
              <TextInput
                style={styles.textInput}
                value={chainId}
                onChangeText={setChainId}
                placeholder="e.g., 1"
                placeholderTextColor={palette.neutralMid}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Currency Symbol</Text>
              <TextInput
                style={styles.textInput}
                value={symbol}
                onChangeText={setSymbol}
                placeholder="e.g., ETH"
                placeholderTextColor={palette.neutralMid}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Block Explorer URL</Text>
              <TextInput
                style={styles.textInput}
                value={blockExplorer}
                onChangeText={setBlockExplorer}
                placeholder="https://..."
                placeholderTextColor={palette.neutralMid}
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.modalActions}>
            <Button
              label="Cancel"
              variant="outline"
              style={styles.modalButton}
              onPress={onClose}
            />
            <Button
              label="Add Network"
              style={styles.modalButton}
              onPress={handleAddNetwork}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

export const NetworkConfigScreen: React.FC = () => {
  const { selectedNetwork, setSelectedNetwork } = useNetwork();
  const [networks, setNetworks] = useState<Network[]>(getAllNetworks());
  const [addModalVisible, setAddModalVisible] = useState(false);

  const handleNetworkSelect = (network: Network) => {
    setSelectedNetwork(network);
  };

  const handleDeleteNetwork = (networkId: string) => {
    Alert.alert(
      "Delete Network",
      "Are you sure you want to delete this network?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setNetworks(networks.filter((n) => n.id !== networkId));
          },
        },
      ]
    );
  };

  const handleAddCustomNetwork = (network: Network) => {
    setNetworks([...networks, network]);
  };

  const renderNetworkItem = ({ item }: { item: Network }) => (
    <View style={styles.networkCard}>
      <Pressable
        style={styles.networkCardContent}
        onPress={() => handleNetworkSelect(item)}
      >
        <View style={styles.networkInfo}>
          <View style={[styles.networkIcon, { backgroundColor: item.color }]}>
            <MaterialCommunityIcons
              name={item.icon as any}
              size={24}
              color={palette.white}
            />
          </View>
          <View style={styles.networkDetails}>
            <Text style={styles.networkName}>{item.name}</Text>
            <Text style={styles.networkMeta}>Chain ID: {item.chainId}</Text>
            {item.rpcUrl && (
              <Text style={styles.networkMeta} numberOfLines={1}>
                RPC: {item.rpcUrl}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.networkActions}>
          {selectedNetwork?.id === item.id && (
            <View style={styles.activeIndicator}>
              <MaterialCommunityIcons
                name="check-circle"
                size={20}
                color={palette.accentGreen}
              />
            </View>
          )}
          {item.type === "custom" && (
            <Pressable
              style={styles.deleteButton}
              onPress={() => handleDeleteNetwork(item.id)}
            >
              <MaterialCommunityIcons
                name="delete-outline"
                size={20}
                color={palette.errorRed}
              />
            </Pressable>
          )}
        </View>
      </Pressable>
    </View>
  );

  const groupedNetworks = networks.reduce((acc, network) => {
    if (!acc[network.type]) {
      acc[network.type] = [];
    }
    acc[network.type].push(network);
    return acc;
  }, {} as Record<string, Network[]>);

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text variant="title" color={palette.primaryBlue}>
            Network Configuration
          </Text>
          <Text color={palette.neutralMid} style={styles.subtitle}>
            Manage your blockchain networks and connections
          </Text>
        </View>

        <FlatList
          data={[
            { type: "popular", title: "Popular Networks" },
            { type: "custom", title: "Custom Networks" },
            { type: "testnet", title: "Test Networks" },
          ]}
          keyExtractor={(item) => item.type}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{item.title}</Text>
                {item.type === "custom" && (
                  <Pressable
                    style={styles.addButton}
                    onPress={() => setAddModalVisible(true)}
                  >
                    <MaterialCommunityIcons
                      name="plus"
                      size={20}
                      color={palette.primaryBlue}
                    />
                    <Text style={styles.addButtonText}>Add Network</Text>
                  </Pressable>
                )}
              </View>
              {groupedNetworks[item.type]?.map((network) => (
                <View key={network.id}>
                  {renderNetworkItem({ item: network })}
                </View>
              ))}
            </View>
          )}
        />

        <AddNetworkModal
          visible={addModalVisible}
          onClose={() => setAddModalVisible(false)}
          onAdd={handleAddCustomNetwork}
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: spacing.xl,
  },
  subtitle: {
    marginTop: spacing.xs,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: palette.neutralDark,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.primaryBlue,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.primaryBlue,
  },
  networkCard: {
    backgroundColor: palette.white,
    borderRadius: 16,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: palette.neutralLighter,
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
  networkActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  activeIndicator: {
    padding: spacing.xs,
  },
  deleteButton: {
    padding: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  addNetworkModal: {
    backgroundColor: palette.white,
    borderRadius: 24,
    width: "90%",
    maxWidth: 400,
    maxHeight: "80%",
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
  formContainer: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  inputGroup: {
    gap: spacing.sm,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.neutralDark,
  },
  textInput: {
    borderWidth: 1,
    borderColor: palette.neutralLighter,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: palette.neutralDark,
    backgroundColor: palette.surface,
  },
  modalActions: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: palette.neutralLighter,
  },
  modalButton: {
    flex: 1,
  },
});
