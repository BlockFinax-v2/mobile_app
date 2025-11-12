import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { NetworkSelector } from "@/components/ui/NetworkSelector";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { TokenInfo, TokenSelector } from "@/components/ui/TokenSelector";
import {
  getAllSupportedTokens,
  SupportedNetworkId,
  useWallet,
} from "@/contexts/WalletContext";
import { WalletStackParamList } from "@/navigation/types";
import { transactionService } from "@/services/transactionService";
import { palette } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { isValidAddress } from "@/utils/tokenUtils";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import React, { useCallback, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  Vibration,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

type NavigationProp = StackNavigationProp<WalletStackParamList, "SendPayment">;

type FormValues = {
  recipient: string;
  amount: string;
  message: string;
};

export const SendPaymentScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { selectedNetwork, balances, switchNetwork } = useWallet();

  // State management
  const [showNetworkSelector, setShowNetworkSelector] = useState(false);
  const [showTokenSelector, setShowTokenSelector] = useState(false);
  const [isEstimatingGas, setIsEstimatingGas] = useState(false);
  const [estimatedFee, setEstimatedFee] = useState<string | null>(null);
  const [currentNetworkId, setCurrentNetworkId] = useState<SupportedNetworkId>(
    selectedNetwork.id
  );
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);

  // Initialize available tokens and default selection
  const availableTokens = React.useMemo(() => {
    return getAllSupportedTokens(currentNetworkId);
  }, [currentNetworkId]);

  // Set default token when network changes
  useEffect(() => {
    if (availableTokens.length > 0) {
      // Prefer USDC, then first stablecoin, then native token
      const preferredToken =
        availableTokens.find((t) => t.symbol === "USDC") ||
        availableTokens.find(
          (t) => t.address !== "0x0000000000000000000000000000000000000000"
        ) ||
        availableTokens[0];

      setSelectedToken(preferredToken);
    }
  }, [availableTokens]);

  // Form setup
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    defaultValues: {
      recipient: "",
      amount: "",
      message: "",
    },
  });

  const recipientValue = watch("recipient");
  const amountValue = watch("amount");

  // Get balance for selected token
  const availableBalance = React.useMemo(() => {
    if (!selectedToken) return "0";

    if (
      selectedToken.address === "0x0000000000000000000000000000000000000000"
    ) {
      // Native token
      return balances.primary.toString();
    } else {
      // ERC-20 token
      const tokenBalance = balances.tokens.find(
        (t) => t.address.toLowerCase() === selectedToken.address.toLowerCase()
      );
      return tokenBalance?.balance || "0";
    }
  }, [selectedToken, balances]);

  // Estimate gas when inputs change
  const estimateGas = useCallback(async () => {
    if (!recipientValue || !amountValue || !selectedToken) {
      setEstimatedFee(null);
      return;
    }

    if (!isValidAddress(recipientValue)) {
      setEstimatedFee(null);
      return;
    }

    const amount = parseFloat(amountValue);
    if (isNaN(amount) || amount <= 0) {
      setEstimatedFee(null);
      return;
    }

    // Check if user has sufficient balance before estimating gas
    const tokenBalance = parseFloat(availableBalance);
    if (tokenBalance <= 0) {
      setEstimatedFee(null);
      return;
    }

    // For native token transfers, check if user has enough for both amount + gas
    if (
      selectedToken.address === "0x0000000000000000000000000000000000000000"
    ) {
      const nativeBalance = balances.primary;
      if (nativeBalance <= 0) {
        setEstimatedFee(null);
        return;
      }
    } else {
      // For token transfers, check if user has native tokens for gas
      const nativeBalance = balances.primary;
      if (nativeBalance <= 0) {
        setEstimatedFee(null);
        Alert.alert(
          "Insufficient Gas Funds",
          `You need ${selectedNetwork.primaryCurrency} to pay for transaction fees. Please add some ${selectedNetwork.primaryCurrency} to your wallet first.`
        );
        return;
      }
    }

    setIsEstimatingGas(true);
    try {
      const gasEstimate = await transactionService.estimateGas({
        recipientAddress: recipientValue,
        amount: amountValue,
        tokenAddress:
          selectedToken.address === "0x0000000000000000000000000000000000000000"
            ? undefined
            : selectedToken.address,
        tokenDecimals: selectedToken.decimals,
        network: selectedNetwork,
      });

      setEstimatedFee(gasEstimate.estimatedCost);
    } catch (error: any) {
      console.error("Gas estimation error:", error);
      setEstimatedFee(null);

      // Provide helpful error messages based on the error
      if (error.message?.includes("insufficient funds")) {
        Alert.alert(
          "Insufficient Funds",
          `You don't have enough ${selectedNetwork.primaryCurrency} to pay for gas fees. Please add funds to your wallet.`
        );
      } else if (error.code === "INVALID_ARGUMENT") {
        Alert.alert(
          "Invalid Transaction",
          "Please check your transaction details and try again."
        );
      } else {
        // Only show generic error for unexpected errors
        console.warn("Gas estimation failed:", error.message);
      }
    } finally {
      setIsEstimatingGas(false);
    }
  }, [
    recipientValue,
    amountValue,
    selectedToken,
    selectedNetwork,
    availableBalance,
    balances.primary,
  ]);

  // Debounce gas estimation
  useEffect(() => {
    const timer = setTimeout(() => {
      estimateGas();
    }, 800);

    return () => clearTimeout(timer);
  }, [estimateGas]);

  // Handle network selection
  const handleNetworkSelect = async (networkId: SupportedNetworkId) => {
    setCurrentNetworkId(networkId);
    if (networkId !== selectedNetwork.id) {
      try {
        await switchNetwork(networkId);
      } catch (error) {
        console.error("Failed to switch network:", error);
        Alert.alert("Network Switch Failed", "Please try again");
      }
    }
  };

  // Handle token selection
  const handleTokenSelect = (token: TokenInfo) => {
    setSelectedToken(token);
    // Clear amount when switching tokens to avoid confusion
    setValue("amount", "");
    setEstimatedFee(null);
  };

  // Handle max amount
  const handleMaxAmount = () => {
    if (!selectedToken || !availableBalance) return;

    const balance = parseFloat(availableBalance);
    if (balance <= 0) {
      Alert.alert("No Balance", "You don't have any balance for this token");
      return;
    }

    // For native tokens, leave some for gas fees
    if (
      selectedToken.address === "0x0000000000000000000000000000000000000000"
    ) {
      const gasReserve = estimatedFee ? parseFloat(estimatedFee) * 1.1 : 0.01; // 10% buffer or fallback
      const maxAmount = Math.max(0, balance - gasReserve);

      if (maxAmount <= 0) {
        Alert.alert(
          "Insufficient Balance",
          `You need to keep some ${
            selectedNetwork.primaryCurrency
          } for gas fees.\n\nBalance: ${balance.toFixed(
            6
          )}\nGas needed: ~${gasReserve.toFixed(6)}`
        );
        return;
      }
      setValue("amount", maxAmount.toString());
    } else {
      setValue("amount", balance.toString());
    }

    Vibration.vibrate(50); // Haptic feedback
  };

  // Handle form submission
  const onSubmit = (values: FormValues) => {
    if (!selectedToken) {
      Alert.alert("Error", "Please select a token first");
      return;
    }

    if (!isValidAddress(values.recipient)) {
      Alert.alert("Invalid Address", "Please enter a valid recipient address");
      return;
    }

    const amount = parseFloat(values.amount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid amount");
      return;
    }

    // Check token balance
    const tokenBalance = parseFloat(availableBalance);
    if (amount > tokenBalance) {
      Alert.alert(
        "Insufficient Token Balance",
        `You don't have enough ${selectedToken.symbol} to complete this transaction.\n\nRequired: ${amount} ${selectedToken.symbol}\nAvailable: ${tokenBalance} ${selectedToken.symbol}`
      );
      return;
    }

    // Check native token balance for gas (always required)
    const nativeBalance = balances.primary;
    const estimatedGasFee = estimatedFee ? parseFloat(estimatedFee) : 0;

    if (nativeBalance <= 0) {
      Alert.alert(
        "No Gas Funds",
        `You need ${selectedNetwork.primaryCurrency} to pay for transaction fees.\n\nPlease add some ${selectedNetwork.primaryCurrency} to your wallet first.`
      );
      return;
    }

    // For native token transfers, check total (amount + gas)
    if (
      selectedToken.address === "0x0000000000000000000000000000000000000000"
    ) {
      const totalNeeded = amount + estimatedGasFee;
      if (totalNeeded > nativeBalance) {
        Alert.alert(
          "Insufficient Funds",
          `You need more ${
            selectedToken.symbol
          } for this transaction.\n\nRequired: ${totalNeeded.toFixed(6)} ${
            selectedToken.symbol
          }\nAvailable: ${nativeBalance.toFixed(6)} ${
            selectedToken.symbol
          }\n\n(Includes ${estimatedGasFee.toFixed(6)} ${
            selectedNetwork.primaryCurrency
          } gas fee)`
        );
        return;
      }
    } else {
      // For token transfers, check gas separately
      if (estimatedGasFee > nativeBalance) {
        Alert.alert(
          "Insufficient Gas Funds",
          `You need more ${
            selectedNetwork.primaryCurrency
          } to pay for gas fees.\n\nRequired: ${estimatedGasFee.toFixed(6)} ${
            selectedNetwork.primaryCurrency
          }\nAvailable: ${nativeBalance.toFixed(6)} ${
            selectedNetwork.primaryCurrency
          }`
        );
        return;
      }
    }

    if (!estimatedFee) {
      Alert.alert(
        "Gas Estimation Required",
        "Please wait for gas estimation to complete or check your balance"
      );
      return;
    }

    // Navigate to review screen
    navigation.navigate("SendPaymentReview", {
      recipient: values.recipient,
      amount: values.amount,
      currency: selectedToken.symbol,
      network: selectedNetwork.name,
      fee: parseFloat(estimatedFee),
      message: values.message || undefined,
      tokenAddress: selectedToken.address,
      tokenDecimals: selectedToken.decimals,
    });
  };

  // Get network icon and color
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
    switch (symbol?.toUpperCase()) {
      case "ETH":
        return "ethereum";
      case "MATIC":
        return "triangle";
      case "BNB":
        return "alpha-b-circle";
      case "USDC":
        return "currency-usd-circle";
      case "USDT":
        return "currency-usd";
      case "DAI":
        return "alpha-d-circle";
      default:
        return "currency-usd-circle-outline";
    }
  };

  const getTokenColor = (symbol: string) => {
    switch (symbol?.toUpperCase()) {
      case "ETH":
        return "#627EEA";
      case "MATIC":
        return "#8247E5";
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

  const fee = estimatedFee ? parseFloat(estimatedFee) : 0;
  const totalAmount = parseFloat(amountValue || "0");

  return (
    <Screen preset="scroll">
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <MaterialCommunityIcons
            name="send"
            size={28}
            color={palette.primaryBlue}
          />
          <View style={styles.headerText}>
            <Text variant="title" style={styles.headerTitle}>
              Send Payment
            </Text>
            <Text color={palette.neutralMid} style={styles.subtitle}>
              Send crypto to any wallet address
            </Text>
          </View>
        </View>

        {/* Network & Token Selection */}
        <View style={styles.selectionCard}>
          <Text style={styles.selectionLabel}>Network & Token</Text>

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
                <Text style={styles.selectorTitle}>{selectedNetwork.name}</Text>
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

          {/* Token Selector */}
          <Pressable
            style={styles.selectorButton}
            onPress={() => setShowTokenSelector(true)}
          >
            <View style={styles.selectorLeft}>
              <View
                style={[
                  styles.tokenIcon,
                  {
                    backgroundColor: selectedToken
                      ? getTokenColor(selectedToken.symbol)
                      : palette.neutralMid,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={
                    selectedToken
                      ? (getTokenIcon(selectedToken.symbol) as any)
                      : "help"
                  }
                  size={20}
                  color={palette.white}
                />
              </View>
              <View>
                <Text style={styles.selectorTitle}>
                  {selectedToken ? selectedToken.symbol : "Select Token"}
                </Text>
                <Text style={styles.selectorSubtitle}>
                  {selectedToken && availableBalance
                    ? `Balance: ${parseFloat(availableBalance).toFixed(4)} ${
                        selectedToken.symbol
                      }`
                    : "Choose a token to send"}
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons
              name="chevron-down"
              size={20}
              color={palette.neutralMid}
            />
          </Pressable>

          {selectedNetwork.isTestnet && (
            <View style={styles.testnetWarning}>
              <MaterialCommunityIcons
                name="alert-circle"
                size={16}
                color={palette.warningYellow}
              />
              <Text style={styles.testnetWarningText}>
                Test Network - Tokens have no real value
              </Text>
            </View>
          )}
        </View>

        {/* Recipient Address */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recipient</Text>
          <Controller
            control={control}
            name="recipient"
            rules={{
              required: "Recipient address is required",
              validate: (value) =>
                isValidAddress(value) || "Invalid wallet address format",
            }}
            render={({ field: { onChange, value }, fieldState }) => (
              <View>
                <Input
                  label="Wallet Address"
                  value={value}
                  onChangeText={onChange}
                  placeholder="0x..."
                  autoCapitalize="none"
                  autoCorrect={false}
                  error={fieldState.error?.message}
                  multiline
                  numberOfLines={2}
                />
                {value && isValidAddress(value) && (
                  <View style={styles.validAddress}>
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={16}
                      color={palette.successGreen}
                    />
                    <Text style={styles.validAddressText}>Valid address</Text>
                  </View>
                )}
              </View>
            )}
          />
        </View>

        {/* Amount */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Amount</Text>
            {selectedToken && parseFloat(availableBalance) > 0 && (
              <Pressable style={styles.maxButton} onPress={handleMaxAmount}>
                <Text style={styles.maxButtonText}>MAX</Text>
              </Pressable>
            )}
          </View>

          <Controller
            control={control}
            name="amount"
            rules={{
              required: "Amount is required",
              validate: (value) => {
                const num = parseFloat(value);
                if (isNaN(num) || num <= 0) {
                  return "Amount must be greater than 0";
                }
                if (num > parseFloat(availableBalance)) {
                  return "Insufficient balance";
                }
                return true;
              },
            }}
            render={({ field: { onChange, value }, fieldState }) => (
              <Input
                label={`Amount (${selectedToken?.symbol || "Token"})`}
                value={value}
                onChangeText={onChange}
                keyboardType="numeric"
                placeholder="0.00"
                error={fieldState.error?.message}
                helperText={
                  selectedToken
                    ? `Available: ${parseFloat(availableBalance).toFixed(4)} ${
                        selectedToken.symbol
                      }`
                    : "Select a token first"
                }
              />
            )}
          />
        </View>

        {/* Transaction Summary */}
        {selectedToken && amountValue && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Transaction Summary</Text>

            <View style={styles.summaryRow}>
              <Text color={palette.neutralMid}>Amount</Text>
              <Text style={styles.summaryValue}>
                {amountValue} {selectedToken?.symbol || ""}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text color={palette.neutralMid}>Network Fee (Est.)</Text>
              <View style={styles.feeContainer}>
                {isEstimatingGas ? (
                  <ActivityIndicator size="small" color={palette.primaryBlue} />
                ) : (
                  <Text style={styles.summaryValue}>
                    {estimatedFee
                      ? `${parseFloat(estimatedFee).toFixed(6)} ${
                          selectedNetwork.primaryCurrency
                        }`
                      : "—"}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.summaryRow}>
              <Text variant="subtitle">You'll Send</Text>
              <Text variant="subtitle" color={palette.primaryBlue}>
                {amountValue} {selectedToken?.symbol || ""}
              </Text>
            </View>

            <View style={styles.summaryRow}>
              <Text variant="subtitle">Network Fee</Text>
              <Text variant="subtitle" color={palette.neutralDark}>
                {estimatedFee
                  ? `${parseFloat(estimatedFee).toFixed(6)} ${
                      selectedNetwork.primaryCurrency
                    }`
                  : "Calculating..."}
              </Text>
            </View>

            {!isEstimatingGas &&
              !estimatedFee &&
              recipientValue &&
              amountValue && (
                <View style={styles.gasWarning}>
                  <MaterialCommunityIcons
                    name="alert-circle-outline"
                    size={16}
                    color={palette.warningYellow}
                  />
                  <Text style={styles.gasWarningText}>
                    Gas estimation failed. Fee will be calculated before
                    sending.
                  </Text>
                </View>
              )}
          </View>
        )}

        {/* Message */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Message (Optional)</Text>
          <Controller
            control={control}
            name="message"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Add a note"
                value={value}
                onChangeText={onChange}
                multiline
                numberOfLines={3}
                maxLength={100}
                placeholder="What's this payment for?"
                helperText={`${value?.length || 0}/100`}
              />
            )}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            label="Review & Send"
            onPress={handleSubmit(onSubmit)}
            disabled={!selectedToken || isEstimatingGas}
          />
          <Button
            label="Cancel"
            variant="outline"
            onPress={() => navigation.goBack()}
          />
        </View>

        {/* Bottom spacing for scroll */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Network Selector Modal */}
      <NetworkSelector
        visible={showNetworkSelector}
        onClose={() => setShowNetworkSelector(false)}
        onSelectNetwork={handleNetworkSelect}
        selectedNetworkId={currentNetworkId}
      />

      {/* Token Selector Modal */}
      <TokenSelector
        visible={showTokenSelector}
        onClose={() => setShowTokenSelector(false)}
        onSelectToken={handleTokenSelect}
        selectedToken={selectedToken || undefined}
        networkId={currentNetworkId}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  headerTitle: {
    fontSize: 24,
  },
  subtitle: {
    fontSize: 16,
  },
  selectionCard: {
    backgroundColor: palette.white,
    padding: spacing.lg,
    borderRadius: 16,
    gap: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: spacing.lg,
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
  testnetWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: palette.warningYellow + "15",
    padding: spacing.sm,
    borderRadius: 8,
  },
  testnetWarningText: {
    fontSize: 12,
    color: palette.warningYellow,
    fontWeight: "500",
    flex: 1,
  },
  card: {
    backgroundColor: palette.white,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.neutralDark,
  },
  maxButton: {
    backgroundColor: palette.primaryBlue,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 6,
  },
  maxButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: palette.white,
  },
  validAddress: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  validAddressText: {
    fontSize: 12,
    color: palette.successGreen,
    fontWeight: "500",
  },
  summaryCard: {
    backgroundColor: "#EEF2FF",
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.neutralDark,
    marginBottom: spacing.xs,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.neutralDark,
  },
  divider: {
    height: 1,
    backgroundColor: "#D1D5DB",
    marginVertical: spacing.sm,
  },
  feeContainer: {
    minWidth: 60,
    alignItems: "flex-end",
  },
  gasWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: palette.warningYellow + "15",
    padding: spacing.sm,
    borderRadius: 8,
    marginTop: spacing.sm,
  },
  gasWarningText: {
    fontSize: 11,
    color: palette.warningYellow,
    fontWeight: "500",
    flex: 1,
  },
  actions: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  bottomSpacing: {
    height: spacing.xxl,
  },
});
