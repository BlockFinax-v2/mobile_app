/**
 * Universal Payment Component
 *
 * A reusable payment interface component that works with the usePayment hook.
 * This provides a consistent payment UI across the entire app while allowing
 * customization through props and the hook's parameters.
 */

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { NetworkSelector } from "@/components/ui/NetworkSelector";
import { Text } from "@/components/ui/Text";
import { TokenSelector } from "@/components/ui/TokenSelector";
import { palette } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { PaymentParams, usePayment } from "@/hooks/usePayment";

interface UniversalPaymentProps {
  // Payment configuration
  paymentParams?: PaymentParams;

  // Event handlers
  onPaymentSuccess?: (transactionHash: string) => void;
  onPaymentCancel?: () => void;
  onPaymentError?: (error: string) => void;

  // UI customization
  style?: any;
  showHeader?: boolean;
  headerTitle?: string;
  headerSubtitle?: string;
}

export const UniversalPayment: React.FC<UniversalPaymentProps> = ({
  paymentParams,
  onPaymentSuccess,
  onPaymentCancel,
  onPaymentError,
  style,
  showHeader = true,
  headerTitle,
  headerSubtitle,
}) => {
  const {
    state,
    actions,
    availableBalance,
    canSubmit,
    networkColor,
    networkIcon,
  } = usePayment(paymentParams);

  // Handle payment submission
  const handleSubmit = async () => {
    const result = await actions.submitPayment();

    if (result.success && result.transactionHash) {
      onPaymentSuccess?.(result.transactionHash);
    } else if (!result.success) {
      onPaymentError?.("Payment failed. Please try again.");
    }
  };

  // Handle cancel
  const handleCancel = () => {
    Alert.alert(
      "Cancel Payment",
      "Are you sure you want to cancel this payment?",
      [
        { text: "Continue Payment", style: "cancel" },
        {
          text: "Cancel",
          style: "destructive",
          onPress: () => {
            actions.reset();
            onPaymentCancel?.();
          },
        },
      ],
    );
  };

  // Get token icon/color (simplified - you can enhance this)
  const getTokenIcon = (symbol: string) => {
    const iconMap: Record<string, string> = {
      ETH: "ethereum",
      BTC: "bitcoin",
      USDC: "currency-usd-circle",
      USDT: "currency-usd",
      MATIC: "triangle",
    };
    return iconMap[symbol] || "coins";
  };

  const getTokenColor = (symbol: string) => {
    const colorMap: Record<string, string> = {
      ETH: "#627EEA",
      BTC: "#F7931A",
      USDC: "#2775CA",
      USDT: "#26A17B",
      MATIC: "#8247E5",
    };
    return colorMap[symbol] || palette.primaryBlue;
  };

  return (
    <View style={[styles.container, style]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        {showHeader && (
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <MaterialCommunityIcons
                name="send-circle"
                size={32}
                color={palette.primaryBlue}
              />
              <Text style={styles.title}>
                {headerTitle || paymentParams?.title || "Send Payment"}
              </Text>
              <Text style={styles.subtitle}>
                {headerSubtitle ||
                  paymentParams?.description ||
                  "Send crypto to any wallet address"}
              </Text>
            </View>
          </View>
        )}

        {/* Network & Token Selection */}
        <View style={styles.selectionCard}>
          <Text style={styles.selectionLabel}>Network & Token</Text>

          {/* Network Selector */}
          <Pressable
            style={styles.selectorButton}
            onPress={actions.toggleNetworkSelector}
            disabled={paymentParams?.allowNetworkSwitch === false}
          >
            <View style={styles.selectorLeft}>
              <View
                style={[styles.networkIcon, { backgroundColor: networkColor }]}
              >
                <MaterialCommunityIcons
                  name={networkIcon as any}
                  size={20}
                  color={palette.white}
                />
              </View>
              <View>
                <Text style={styles.selectorTitle}>
                  {state.selectedNetwork.name}
                </Text>
                <Text style={styles.selectorSubtitle}>
                  Chain ID: {state.selectedNetwork.chainId}
                </Text>
              </View>
            </View>
            {paymentParams?.allowNetworkSwitch !== false && (
              <MaterialCommunityIcons
                name="chevron-down"
                size={20}
                color={palette.neutralMid}
              />
            )}
          </Pressable>

          {/* Token Selector */}
          <Pressable
            style={styles.selectorButton}
            onPress={actions.toggleTokenSelector}
            disabled={paymentParams?.allowTokenSwitch === false}
          >
            <View style={styles.selectorLeft}>
              <View
                style={[
                  styles.tokenIcon,
                  {
                    backgroundColor: state.selectedToken
                      ? getTokenColor(state.selectedToken.symbol)
                      : palette.neutralMid,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={
                    state.selectedToken
                      ? (getTokenIcon(state.selectedToken.symbol) as any)
                      : "help"
                  }
                  size={20}
                  color={palette.white}
                />
              </View>
              <View>
                <Text style={styles.selectorTitle}>
                  {state.selectedToken
                    ? state.selectedToken.symbol
                    : "Select Token"}
                </Text>
                <Text style={styles.selectorSubtitle}>
                  {state.isRefreshingBalance
                    ? "Loading balance..."
                    : state.selectedToken && availableBalance
                      ? `Balance: ${availableBalance} ${state.selectedToken.symbol}`
                      : "Choose a token to send"}
                </Text>
              </View>
            </View>
            {paymentParams?.allowTokenSwitch !== false && (
              <MaterialCommunityIcons
                name="chevron-down"
                size={20}
                color={palette.neutralMid}
              />
            )}
          </Pressable>

          {state.selectedNetwork.isTestnet && (
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
          <Input
            label="Wallet Address"
            value={state.recipientAddress}
            onChangeText={actions.setRecipientAddress}
            placeholder="0x..."
            autoCapitalize="none"
            autoCorrect={false}
            error={state.validationErrors.recipient}
            multiline
            numberOfLines={2}
          />
          {state.recipientAddress && !state.validationErrors.recipient && (
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

        {/* Amount */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Amount</Text>
            {state.selectedToken && parseFloat(availableBalance) > 0 && (
              <Pressable
                style={styles.maxButton}
                onPress={actions.setMaxAmount}
              >
                <Text style={styles.maxButtonText}>Max</Text>
              </Pressable>
            )}
          </View>
          <Input
            label={`Amount ${
              state.selectedToken ? `(${state.selectedToken.symbol})` : ""
            }`}
            value={state.amount}
            onChangeText={actions.setAmount}
            placeholder="0.00"
            keyboardType="numeric"
            error={
              state.validationErrors.amount || state.validationErrors.balance
            }
          />
          {state.selectedToken && (
            <Text style={styles.balanceText}>
              Available: {availableBalance} {state.selectedToken.symbol}
            </Text>
          )}
        </View>

        {/* Message (if not required, show as optional) */}
        {(paymentParams?.requireMessage || !paymentParams?.requireMessage) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Message {paymentParams?.requireMessage ? "*" : "(Optional)"}
            </Text>
            <Input
              label="Transaction Message"
              value={state.message}
              onChangeText={actions.setMessage}
              placeholder="Add a note for this payment..."
              multiline
              numberOfLines={3}
              maxLength={200}
            />
            <Text style={styles.characterCount}>
              {state.message.length}/200 characters
            </Text>
          </View>
        )}

        {/* Gas Fee Estimation */}
        {(state.estimatedFee || state.isEstimatingGas) && (
          <View style={styles.feeCard}>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Estimated Network Fee</Text>
              {state.isEstimatingGas ? (
                <ActivityIndicator size="small" color={palette.primaryBlue} />
              ) : (
                <Text style={styles.feeValue}>
                  {state.estimatedFee} {state.selectedNetwork.primaryCurrency}
                </Text>
              )}
            </View>
            {state.validationErrors.gas && (
              <Text style={styles.errorText}>{state.validationErrors.gas}</Text>
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <Button
            label="Cancel"
            variant="outline"
            onPress={handleCancel}
            style={styles.cancelButton}
          />
          <Button
            label={state.isSubmitting ? "Sending..." : "Send Payment"}
            onPress={handleSubmit}
            disabled={!canSubmit}
            loading={state.isSubmitting}
            style={styles.submitButton}
          />
        </View>
      </ScrollView>

      {/* Network Selector Modal */}
      <NetworkSelector
        visible={state.showNetworkSelector}
        onClose={() => actions.toggleNetworkSelector()}
        onSelectNetwork={actions.selectNetwork}
        selectedNetworkId={state.selectedNetwork.id}
      />

      {/* Token Selector Modal */}
      <TokenSelector
        visible={state.showTokenSelector}
        onClose={() => actions.toggleTokenSelector()}
        onSelectToken={actions.selectToken}
        selectedToken={state.selectedToken || undefined}
        networkId={state.selectedNetwork.id}
        showBalances={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xl,
  },
  headerContent: {
    alignItems: "center",
    gap: spacing.sm,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: palette.neutralDark,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: palette.neutralMid,
    textAlign: "center",
  },
  selectionCard: {
    backgroundColor: palette.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  selectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.neutralDark,
  },
  selectorButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: palette.surface,
    borderRadius: 12,
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
    alignItems: "center",
    justifyContent: "center",
  },
  tokenIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
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
    backgroundColor: palette.warningYellow + "10",
    padding: spacing.sm,
    borderRadius: 8,
  },
  testnetWarningText: {
    fontSize: 12,
    color: palette.warningYellow,
    fontWeight: "500",
  },
  card: {
    backgroundColor: palette.white,
    borderRadius: 16,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.neutralDark,
  },
  maxButton: {
    backgroundColor: palette.primaryBlue + "20",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  maxButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.primaryBlue,
  },
  validAddress: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  validAddressText: {
    fontSize: 12,
    color: palette.successGreen,
    fontWeight: "500",
  },
  balanceText: {
    fontSize: 12,
    color: palette.neutralMid,
    marginTop: spacing.xs,
  },
  characterCount: {
    fontSize: 12,
    color: palette.neutralMid,
    textAlign: "right",
    marginTop: spacing.xs,
  },
  feeCard: {
    backgroundColor: palette.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: palette.neutralLighter,
  },
  feeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  feeLabel: {
    fontSize: 14,
    color: palette.neutralMid,
  },
  feeValue: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.neutralDark,
  },
  errorText: {
    fontSize: 12,
    color: palette.errorRed,
    marginTop: spacing.xs,
  },
  actionContainer: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 2,
  },
});
