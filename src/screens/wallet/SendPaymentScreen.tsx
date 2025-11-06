import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import {
  getAllSupportedTokens,
  useWallet,
  SupportedNetworkId,
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
  StyleSheet,
  View,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

type SupportedCurrency = "USDC" | "USDT" | "BUSD" | "ETH" | "MATIC" | "BNB";
type NavigationProp = StackNavigationProp<WalletStackParamList, "SendPayment">;

type FormValues = {
  recipient: string;
  amount: string;
  currency: SupportedCurrency;
  network: string;
  message: string;
};

export const SendPaymentScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { selectedNetwork, balances, switchNetwork } = useWallet();
  const [isEstimatingGas, setIsEstimatingGas] = useState(false);
  const [estimatedFee, setEstimatedFee] = useState<string | null>(null);

  // Get available tokens for the selected network
  const availableTokens = React.useMemo(() => {
    return getAllSupportedTokens(selectedNetwork.id);
  }, [selectedNetwork]);

  const availableCurrencies = React.useMemo(() => {
    return availableTokens.map((token) => token.symbol as SupportedCurrency);
  }, [availableTokens]);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      recipient: "",
      amount: "",
      currency: availableCurrencies[0] || "USDC",
      network: selectedNetwork.name,
      message: "",
    },
  });

  const recipientValue = watch("recipient");
  const amountValue = watch("amount");
  const selectedCurrency = watch("currency");

  // Get token details for selected currency
  const selectedToken = React.useMemo(() => {
    return availableTokens.find((token) => token.symbol === selectedCurrency);
  }, [selectedCurrency, availableTokens]);

  // Get balance for selected token
  const availableBalance = React.useMemo(() => {
    if (!selectedToken) return "0";

    if (
      selectedToken.address === "0x0000000000000000000000000000000000000000"
    ) {
      // Native token
      return balances.primary.toFixed(6);
    } else {
      // ERC-20 token
      const tokenBalance = balances.tokens.find(
        (t) => t.address.toLowerCase() === selectedToken.address.toLowerCase()
      );
      return tokenBalance?.balance || "0";
    }
  }, [selectedToken, balances]);

  // Estimate gas when amount or recipient changes
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
      Alert.alert("Gas Estimation Failed", error.message);
    } finally {
      setIsEstimatingGas(false);
    }
  }, [recipientValue, amountValue, selectedToken, selectedNetwork]);

  // Debounce gas estimation
  useEffect(() => {
    const timer = setTimeout(() => {
      estimateGas();
    }, 500);

    return () => clearTimeout(timer);
  }, [estimateGas]);

  const fee = estimatedFee ? parseFloat(estimatedFee) : 0;
  const total = parseFloat(amountValue || "0") + fee;

  const onSubmit = (values: FormValues) => {
    if (!selectedToken) {
      Alert.alert("Error", "Invalid token selected");
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

    if (amount > parseFloat(availableBalance)) {
      Alert.alert(
        "Insufficient Balance",
        `You don't have enough ${selectedCurrency} to complete this transaction`
      );
      return;
    }

    if (!estimatedFee) {
      Alert.alert(
        "Gas Estimation Required",
        "Please wait for gas estimation to complete"
      );
      return;
    }

    navigation.navigate("SendPaymentReview", {
      recipient: values.recipient,
      amount: values.amount,
      currency: values.currency,
      network: values.network,
      fee,
      message: values.message || undefined,
      tokenAddress: selectedToken.address,
      tokenDecimals: selectedToken.decimals,
    });
  };

  return (
    <Screen preset="scroll">
      <View style={styles.container}>
        <View style={styles.header}>
          <MaterialCommunityIcons
            name="send"
            size={24}
            color={palette.primaryBlue}
          />
          <View style={styles.headerText}>
            <Text variant="title">Send Payment</Text>
            <Text color={palette.neutralMid} style={styles.subtitle}>
              Fill in the recipient details to proceed
            </Text>
          </View>
        </View>

        {/* Network Display */}
        <View style={styles.networkSelectorCard}>
          <Text style={styles.networkLabel}>Network</Text>
          <View style={styles.networkDisplay}>
            <View style={styles.networkInfo}>
              <MaterialCommunityIcons
                name={
                  selectedNetwork.id.includes("ethereum")
                    ? "ethereum"
                    : selectedNetwork.id.includes("base")
                    ? "alpha-b-circle-outline"
                    : selectedNetwork.id.includes("lisk")
                    ? "flash-circle"
                    : selectedNetwork.id.includes("polygon")
                    ? "triangle"
                    : selectedNetwork.id.includes("bsc")
                    ? "alpha-b-circle"
                    : "earth"
                }
                size={24}
                color={
                  selectedNetwork.id.includes("ethereum")
                    ? "#627EEA"
                    : selectedNetwork.id.includes("base")
                    ? "#0052FF"
                    : selectedNetwork.id.includes("lisk")
                    ? "#4070F4"
                    : selectedNetwork.id.includes("polygon")
                    ? "#8247E5"
                    : selectedNetwork.id.includes("bsc")
                    ? "#F3BA2F"
                    : palette.primaryBlue
                }
              />
              <View style={styles.networkDetails}>
                <Text style={styles.networkName}>{selectedNetwork.name}</Text>
                <Text style={styles.networkMeta}>
                  Chain ID: {selectedNetwork.chainId}
                </Text>
              </View>
            </View>
          </View>
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

        <View style={styles.card}>
          <Controller
            control={control}
            name="recipient"
            rules={{
              required: "Recipient address is required",
              validate: (value) =>
                isValidAddress(value) || "Invalid Ethereum address",
            }}
            render={({ field: { onChange, value }, fieldState }) => (
              <Input
                label="Recipient Address *"
                value={value}
                onChangeText={onChange}
                placeholder="0x..."
                autoCapitalize="none"
                autoCorrect={false}
                error={fieldState.error?.message}
              />
            )}
          />
          <Input label="Recipient Name (Optional)" placeholder="John Doe" />
        </View>

        <View style={styles.card}>
          <Controller
            control={control}
            name="amount"
            rules={{
              required: "Amount required",
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
                label="Amount *"
                value={value}
                onChangeText={onChange}
                keyboardType="numeric"
                placeholder="0.00"
                error={fieldState.error?.message}
                helperText={`Available: ${availableBalance} ${selectedCurrency}`}
              />
            )}
          />
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text color={palette.neutralMid}>Amount</Text>
            <Text style={styles.summaryValue}>
              {amountValue || "0.00"} {selectedCurrency}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text color={palette.neutralMid}>Network Fee</Text>
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
            <Text variant="subtitle">Total</Text>
            <Text variant="subtitle" color={palette.primaryBlue}>
              {amountValue || "0.00"} {selectedCurrency}
              {estimatedFee && (
                <Text style={styles.feeNote}>
                  {" "}
                  + {parseFloat(estimatedFee).toFixed(6)}{" "}
                  {selectedNetwork.primaryCurrency}
                </Text>
              )}
            </Text>
          </View>
          {!isEstimatingGas &&
            !estimatedFee &&
            recipientValue &&
            amountValue && (
              <Text color={palette.warningYellow} style={styles.gasWarning}>
                Gas estimation failed. Fee will be calculated before sending.
              </Text>
            )}
        </View>

        <View style={styles.card}>
          <Controller
            control={control}
            name="message"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Message (Optional)"
                value={value}
                onChangeText={onChange}
                multiline
                numberOfLines={3}
                maxLength={100}
                placeholder="Add a note..."
                helperText={`${value.length}/100`}
              />
            )}
          />
        </View>

        <View style={styles.actions}>
          <Button label="Review & Send" onPress={handleSubmit(onSubmit)} />
          <Button
            label="Cancel"
            variant="outline"
            onPress={() => navigation.goBack()}
          />
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: { gap: spacing.lg, paddingBottom: spacing.xxl },
  header: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  headerText: { flex: 1, gap: spacing.xs },
  subtitle: { fontSize: 14 },
  networkSelectorCard: {
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
  },
  networkLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.neutralDark,
  },
  networkDisplay: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: palette.neutralLighter,
  },
  networkInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  networkDetails: {
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
  },
  summaryCard: {
    backgroundColor: "#EEF2FF",
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryValue: { fontSize: 16, fontWeight: "600", color: palette.neutralDark },
  divider: {
    height: 1,
    backgroundColor: "#D1D5DB",
    marginVertical: spacing.xs,
  },
  feeContainer: {
    minWidth: 60,
    alignItems: "flex-end",
  },
  feeNote: {
    fontSize: 12,
    color: palette.neutralMid,
    fontWeight: "400",
  },
  gasWarning: {
    fontSize: 11,
    marginTop: spacing.xs,
    fontStyle: "italic",
  },
  actions: { gap: spacing.md },
});
