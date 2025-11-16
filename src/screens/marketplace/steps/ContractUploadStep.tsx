import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { Input } from "@/components/ui/Input";
import { NetworkSelector } from "@/components/ui/NetworkSelector";
import { TokenInfo } from "@/components/ui/TokenSelector";
import { palette } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import {
  getAllSupportedTokens,
  SupportedNetworkId,
  useWallet,
} from "@/contexts/WalletContext";
import { currencyConverter } from "@/utils/currencyConverter";
import { priceService } from "@/services/priceService";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  Pressable,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import * as DocumentPicker from "expo-document-picker";

interface MarketplaceData {
  action: "buy" | "sell";
  contractFile?: any;
  selectedNetwork?: SupportedNetworkId;
  selectedToken?: TokenInfo;
  [key: string]: any;
}

interface Props {
  data: MarketplaceData;
  updateData: (newData: Partial<MarketplaceData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const ContractUploadStep: React.FC<Props> = ({
  data,
  updateData,
  onNext,
  onBack,
}) => {
  const { selectedNetwork, switchNetwork } = useWallet();
  const [uploading, setUploading] = useState(false);
  const [showNetworkSelector, setShowNetworkSelector] = useState(false);

  const [currentNetworkId, setCurrentNetworkId] = useState<SupportedNetworkId>(
    data.selectedNetwork || selectedNetwork.id
  );
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(
    data.selectedToken || null
  );
  const [contractDetails, setContractDetails] = useState({
    buyerName: "",
    sellerName: "",
    productDescription: "",
    agreedAmount: "",
    deliveryTerms: "",
  });
  const [convertedAmounts, setConvertedAmounts] = useState({
    usdValue: 0,
    nativeTokenAmount: 0,
    stablecoinAmount: 0,
    conversionRate: 0,
    isConverting: false,
  });
  const [showConversionDetails, setShowConversionDetails] = useState(false);

  // Initialize available tokens and default selection
  const availableTokens = useMemo(() => {
    return getAllSupportedTokens(currentNetworkId);
  }, [currentNetworkId]);

  // Set default token when network changes
  useEffect(() => {
    if (availableTokens.length > 0 && !selectedToken) {
      // Always use native token for transactions
      const nativeSymbol = getNativeTokenSymbol(currentNetworkId);
      const nativeToken =
        availableTokens.find((t) => t.symbol === nativeSymbol) ||
        availableTokens[0];

      setSelectedToken(nativeToken);
      updateData({
        selectedNetwork: currentNetworkId,
        selectedToken: nativeToken,
      });
    }
  }, [availableTokens, selectedToken, currentNetworkId, updateData]);

  // Handle network selection
  const handleNetworkSelect = async (networkId: SupportedNetworkId) => {
    setCurrentNetworkId(networkId);
    setSelectedToken(null); // Reset token when network changes
    updateData({ selectedNetwork: networkId, selectedToken: undefined });

    if (networkId !== selectedNetwork.id) {
      try {
        await switchNetwork(networkId);
      } catch (error) {
        console.error("Failed to switch network:", error);
        Alert.alert("Network Switch Failed", "Please try again");
      }
    }
  };

  // Handle token selection - only native token is used
  const handleTokenSelect = (token: TokenInfo) => {
    const nativeSymbol = getNativeTokenSymbol(currentNetworkId);
    if (token.symbol !== nativeSymbol) {
      // Only allow native token selection for transactions
      return;
    }

    setSelectedToken(token);
    updateData({ selectedToken: token });
    // Trigger conversion when token changes
    if (contractDetails.agreedAmount) {
      handleAmountConversion(contractDetails.agreedAmount);
    }
  };

  // Handle amount conversion - amount is always in native token
  const handleAmountConversion = async (amount: string) => {
    if (!amount || parseFloat(amount) <= 0) {
      setConvertedAmounts({
        usdValue: 0,
        nativeTokenAmount: 0,
        stablecoinAmount: 0,
        conversionRate: 0,
        isConverting: false,
      });
      return;
    }

    setConvertedAmounts((prev) => ({ ...prev, isConverting: true }));

    try {
      const numericAmount = parseFloat(amount);
      const nativeSymbol = getNativeTokenSymbol(currentNetworkId);

      // Convert native token amount to USD using priceService directly
      const usdValue = await priceService.calculateUSDValue(
        nativeSymbol,
        numericAmount
      );

      setConvertedAmounts({
        usdValue,
        nativeTokenAmount: numericAmount,
        stablecoinAmount: 0, // Not needed for native token approach
        conversionRate: usdValue / numericAmount,
        isConverting: false,
      });
    } catch (error) {
      console.warn("Currency conversion failed:", error);
      setConvertedAmounts((prev) => ({ ...prev, isConverting: false }));
    }
  };

  // Get network icon and color helpers
  const getNetworkIcon = () => {
    if (currentNetworkId.includes("ethereum")) return "ethereum";
    if (currentNetworkId.includes("base")) return "alpha-b-circle-outline";
    if (currentNetworkId.includes("lisk")) return "alpha-l-circle";
    if (currentNetworkId.includes("polygon")) return "triangle";
    if (currentNetworkId.includes("bsc")) return "alpha-b-circle";
    return "earth";
  };

  const getNetworkColor = () => {
    if (currentNetworkId.includes("ethereum")) return "#627EEA";
    if (currentNetworkId.includes("base")) return "#0052FF";
    if (currentNetworkId.includes("lisk")) return "#4070F4";
    if (currentNetworkId.includes("polygon")) return "#8247E5";
    if (currentNetworkId.includes("bsc")) return "#F3BA2F";
    return palette.primaryBlue;
  };

  const getTokenIcon = (symbol: string) => {
    switch (symbol.toUpperCase()) {
      case "ETH":
        return "ethereum";
      case "WETH":
        return "ethereum";
      case "BTC":
        return "bitcoin";
      case "USDC":
      case "USDT":
        return "cash-multiple";
      case "BNB":
        return "alpha-b-circle";
      default:
        return "coin";
    }
  };

  const getTokenColor = (symbol: string) => {
    switch (symbol.toUpperCase()) {
      case "ETH":
      case "WETH":
        return "#627EEA";
      case "BTC":
        return "#F7931A";
      case "BNB":
        return "#F3BA2F";
      case "USDC":
        return "#2775CA";
      case "USDT":
        return "#26A17B";
      case "DAI":
        return "#F5AC37";
      default:
        return palette.neutralMid;
    }
  };

  // Helper functions for currency conversion
  const getNativeTokenSymbol = (networkId: SupportedNetworkId): string => {
    if (networkId.includes("ethereum")) return "ETH";
    if (networkId.includes("polygon")) return "MATIC";
    if (networkId.includes("bsc")) return "BNB";
    if (networkId.includes("base")) return "ETH";
    if (networkId.includes("lisk")) return "ETH";
    return "ETH";
  };

  const getPreferredStablecoin = (networkId: SupportedNetworkId): string => {
    const stablecoins = getAllSupportedTokens(networkId).filter(
      (token) => token.address !== "0x0000000000000000000000000000000000000000"
    );
    return (
      stablecoins.find((coin) => coin.symbol === "USDC")?.symbol ||
      stablecoins[0]?.symbol ||
      "USDC"
    );
  };

  const isStablecoinSymbol = (symbol: string): boolean => {
    const stablecoins = ["USDC", "USDT", "DAI", "USDB", "USDBC"];
    return stablecoins.includes(symbol.toUpperCase());
  };

  const handleDocumentPick = async () => {
    try {
      setUploading(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        updateData({
          contractFile: {
            name: file.name,
            uri: file.uri,
            size: file.size,
            type: file.mimeType,
          },
        });
        Alert.alert("Success", "Contract file uploaded successfully!");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to upload contract file");
    } finally {
      setUploading(false);
    }
  };

  const handleNext = () => {
    if (!data.contractFile && !contractDetails.buyerName) {
      Alert.alert(
        "Required",
        "Please upload a contract or enter contract details"
      );
      return;
    }

    if (!contractDetails.agreedAmount) {
      Alert.alert("Required", "Please enter the agreed amount");
      return;
    }

    if (!selectedToken) {
      Alert.alert("Required", "Please select a currency/token");
      return;
    }

    updateData({
      ...contractDetails,
      agreedAmount: contractDetails.agreedAmount,
      currency: selectedToken.symbol,
      selectedNetwork: currentNetworkId,
      selectedToken: selectedToken,
    });
    onNext();
  };

  return (
    <Screen>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={palette.primaryBlue}
            />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text variant="title">Contract Upload</Text>
            <Text color={palette.neutralMid} style={styles.subtitle}>
              Upload or enter the contract details between{" "}
              {data.action === "buy"
                ? "you and the seller"
                : "you and the buyer"}
            </Text>
          </View>
        </View>

        {/* Progress */}
        <View style={styles.progressContainer}>
          <Text style={styles.stepText}>Step 1 of 6</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: "16.67%" }]} />
          </View>
        </View>

        {/* Upload Section */}
        <View style={styles.section}>
          <Text variant="subtitle" style={styles.sectionTitle}>
            Contract Document
          </Text>

          <TouchableOpacity
            style={styles.uploadArea}
            onPress={handleDocumentPick}
            disabled={uploading}
          >
            <MaterialCommunityIcons
              name="file-document-plus-outline"
              size={48}
              color={
                data.contractFile ? palette.accentGreen : palette.neutralMid
              }
            />
            <Text style={styles.uploadText}>
              {uploading
                ? "Uploading..."
                : data.contractFile
                ? data.contractFile.name
                : "Tap to upload contract (PDF, DOC, DOCX)"}
            </Text>
            {data.contractFile && (
              <View style={styles.fileInfo}>
                <Text style={styles.fileSize}>
                  {(data.contractFile.size / 1024 / 1024).toFixed(2)} MB
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Contract Details */}
        <View style={styles.section}>
          <Text variant="subtitle" style={styles.sectionTitle}>
            Contract Details
          </Text>

          <View style={styles.formGroup}>
            <Input
              label={
                data.action === "buy"
                  ? "Your Name (Buyer)"
                  : "Your Name (Seller)"
              }
              value={contractDetails.buyerName}
              onChangeText={(value) =>
                setContractDetails((prev) => ({ ...prev, buyerName: value }))
              }
              placeholder="Enter your full name"
            />

            <Input
              label={data.action === "buy" ? "Seller Name" : "Buyer Name"}
              value={contractDetails.sellerName}
              onChangeText={(value) =>
                setContractDetails((prev) => ({ ...prev, sellerName: value }))
              }
              placeholder="Enter the other party's name"
            />

            <Input
              label="Product Description"
              value={contractDetails.productDescription}
              onChangeText={(value) =>
                setContractDetails((prev) => ({
                  ...prev,
                  productDescription: value,
                }))
              }
              placeholder="Describe the product/service being traded"
              multiline
              numberOfLines={3}
            />

            <View style={styles.amountContainer}>
              <Input
                label={`Agreed Amount (${getNativeTokenSymbol(
                  currentNetworkId
                )})`}
                value={contractDetails.agreedAmount}
                onChangeText={(value) => {
                  setContractDetails((prev) => ({
                    ...prev,
                    agreedAmount: value,
                  }));
                  // Trigger conversion when amount changes
                  handleAmountConversion(value);
                }}
                placeholder="0.00"
                keyboardType="numeric"
                style={styles.amountInput}
              />

              {/* USD Equivalent Display */}
              {contractDetails.agreedAmount &&
                parseFloat(contractDetails.agreedAmount) > 0 && (
                  <View style={styles.conversionDisplay}>
                    {convertedAmounts.isConverting ? (
                      <View style={styles.conversionLoading}>
                        <MaterialCommunityIcons
                          name="loading"
                          size={16}
                          color={palette.neutralMid}
                        />
                        <Text style={styles.conversionText}>Converting...</Text>
                      </View>
                    ) : (
                      <View style={styles.conversionRow}>
                        <Text style={styles.conversionLabel}>
                          USD Equivalent:
                        </Text>
                        <Text style={styles.conversionValue}>
                          ≈{" "}
                          {currencyConverter.formatUSD(
                            convertedAmounts.usdValue
                          )}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
            </View>

            {/* Network & Token Selection */}
            <View style={styles.networkTokenSelection}>
              <Text style={styles.selectionLabel}>Network & Currency</Text>

              {/* Network Selector */}
              <Pressable
                style={styles.selectorButton}
                onPress={() => setShowNetworkSelector(true)}
              >
                <View style={styles.selectorLeft}>
                  <View
                    style={[
                      styles.networkIcon,
                      { backgroundColor: getNetworkColor() },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={getNetworkIcon() as any}
                      size={20}
                      color={palette.white}
                    />
                  </View>
                  <View>
                    <Text style={styles.selectorTitle}>
                      {selectedNetwork.name}
                    </Text>
                    <Text style={styles.selectorSubtitle}>
                      Chain ID: {selectedNetwork.chainId}
                    </Text>
                  </View>
                </View>
                <MaterialCommunityIcons
                  name="chevron-down"
                  size={20}
                  color={palette.neutralMid}
                />
              </Pressable>

              {/* Native Token Display */}
              <View style={styles.selectorButton}>
                <View style={styles.selectorLeft}>
                  <View
                    style={[
                      styles.tokenIcon,
                      {
                        backgroundColor: getTokenColor(
                          getNativeTokenSymbol(currentNetworkId)
                        ),
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={
                        getTokenIcon(
                          getNativeTokenSymbol(currentNetworkId)
                        ) as any
                      }
                      size={20}
                      color={palette.white}
                    />
                  </View>
                  <View>
                    <Text style={styles.selectorTitle}>
                      {getNativeTokenSymbol(currentNetworkId)}
                    </Text>
                    <Text style={styles.selectorSubtitle}>
                      Native token for transactions
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <Input
              label="Delivery Terms"
              value={contractDetails.deliveryTerms}
              onChangeText={(value) =>
                setContractDetails((prev) => ({
                  ...prev,
                  deliveryTerms: value,
                }))
              }
              placeholder="e.g., FOB, CIF, delivery location, timeline"
              multiline
              numberOfLines={2}
            />
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            label="Back"
            variant="outline"
            onPress={onBack}
            style={styles.backButtonAction}
          />
          <Button
            label="Continue"
            onPress={handleNext}
            style={styles.continueButton}
          />
        </View>
      </ScrollView>

      {/* Network Selector Modal */}
      <NetworkSelector
        visible={showNetworkSelector}
        onClose={() => setShowNetworkSelector(false)}
        onSelectNetwork={handleNetworkSelect}
        selectedNetworkId={currentNetworkId}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  backButton: {
    padding: spacing.sm,
    marginTop: -spacing.sm,
  },
  headerContent: {
    flex: 1,
    gap: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  progressContainer: {
    marginBottom: spacing.lg,
  },
  stepText: {
    fontSize: 14,
    color: palette.neutralMid,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  progressBar: {
    height: 4,
    backgroundColor: palette.neutralLight,
    borderRadius: 2,
  },
  progressFill: {
    height: "100%",
    backgroundColor: palette.primaryBlue,
    borderRadius: 2,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: palette.neutralLight,
    borderStyle: "dashed",
    borderRadius: 12,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
  },
  uploadText: {
    fontSize: 16,
    color: palette.neutralMid,
    textAlign: "center",
  },
  fileInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  fileSize: {
    fontSize: 12,
    color: palette.neutralMid,
  },
  formGroup: {
    gap: spacing.md,
  },
  row: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-end",
  },
  amountInput: {
    flex: 1,
  },
  networkTokenSelection: {
    backgroundColor: palette.white,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: palette.neutralLight,
    gap: spacing.md,
  },
  selectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.neutralDark,
  },
  selectorButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: palette.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: palette.neutralLighter,
  },
  selectorLeft: {
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
  tokenIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  selectorTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.neutralDark,
  },
  selectorSubtitle: {
    fontSize: 12,
    color: palette.neutralMid,
    marginTop: 2,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.xxl,
  },
  backButtonAction: {
    flex: 1,
  },
  continueButton: {
    flex: 2,
  },
  amountContainer: {
    flex: 1,
    gap: spacing.sm,
  },
  conversionDisplay: {
    backgroundColor: palette.surface,
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: palette.neutralLighter,
  },
  conversionLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    justifyContent: "center",
    paddingVertical: spacing.sm,
  },
  conversionText: {
    fontSize: 14,
    color: palette.neutralMid,
  },
  conversionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  conversionLabel: {
    fontSize: 14,
    color: palette.neutralMid,
  },
  conversionValue: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.neutralDark,
  },
  conversionToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: palette.neutralLighter,
  },
  conversionToggleText: {
    fontSize: 12,
    color: palette.primaryBlue,
    fontWeight: "500",
  },
  conversionDetails: {
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: palette.neutralLighter,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  conversionDetailsTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: palette.neutralDark,
    marginBottom: spacing.xs,
  },
  conversionRate: {
    fontSize: 14,
    fontWeight: "500",
    color: palette.neutralDark,
  },
  conversionNote: {
    fontSize: 11,
    color: palette.neutralMid,
    fontStyle: "italic",
    marginTop: spacing.xs,
  },
});
