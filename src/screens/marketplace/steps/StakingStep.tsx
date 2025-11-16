import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { palette } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { WalletStackParamList } from "@/navigation/types";
import { StackNavigationProp } from "@react-navigation/stack";
import { useWallet } from "@/contexts/WalletContext";
import { currencyConverter } from "@/utils/currencyConversion";
import { priceService } from "@/services/priceService";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

interface MarketplaceData {
  action: "buy" | "sell";
  agreedAmount?: string;
  currency?: string;
  stakeAmount?: string;
  stakeTransactionHash?: string;
  [key: string]: any;
}

interface Props {
  data: MarketplaceData;
  updateData: (newData: Partial<MarketplaceData>) => void;
  onNext: () => void;
  onBack: () => void;
}

type NavigationProp = StackNavigationProp<
  WalletStackParamList,
  "MarketplaceFlow"
>;
type RouteProps = RouteProp<WalletStackParamList, "MarketplaceFlow">;

export const StakingStep: React.FC<Props> = ({
  data,
  updateData,
  onNext,
  onBack,
}) => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const { selectedNetwork } = useWallet();

  const [isConverting, setIsConverting] = useState(false);
  const [stakeAmountInNativeToken, setStakeAmountInNativeToken] =
    useState<number>(0);
  const [remainingAmountInNativeToken, setRemainingAmountInNativeToken] =
    useState<number>(0);
  const [stakeAmountUsd, setStakeAmountUsd] = useState<number>(0);
  const [remainingAmountUsd, setRemainingAmountUsd] = useState<number>(0);
  const [agreedAmountUsd, setAgreedAmountUsd] = useState<number>(0);

  // Check if we're returning from payment with transaction data
  useEffect(() => {
    if (route.params?.stakeTransactionData) {
      const txData = route.params.stakeTransactionData;
      updateData({
        stakeAmount: txData.amount,
        stakeTransactionHash: txData.hash,
        stakeNetwork: txData.network,
        stakeCurrency: txData.currency,
      });
    }
  }, [route.params?.stakeTransactionData, updateData]);

  // Calculate amounts directly in native token (agreedAmount is now in native token)
  const agreedAmountInNativeToken = parseFloat(data.agreedAmount || "0");

  // Use precise calculation with BigNumber-safe rounding
  // Round to 8 decimal places to prevent precision issues
  const stakeAmountInNativeTokenCalc =
    Math.round(agreedAmountInNativeToken * 0.2 * 1e8) / 1e8; // 20%
  const remainingAmountInNativeTokenCalc =
    Math.round(agreedAmountInNativeToken * 0.8 * 1e8) / 1e8; // 80%

  // Convert native token amounts to USD for display
  useEffect(() => {
    const convertAmountsToUsd = async () => {
      if (agreedAmountInNativeToken <= 0) {
        setStakeAmountInNativeToken(0);
        setRemainingAmountInNativeToken(0);
        setStakeAmountUsd(0);
        setRemainingAmountUsd(0);
        setAgreedAmountUsd(0);
        return;
      }

      setIsConverting(true);
      try {
        // Set the native token amounts directly
        setStakeAmountInNativeToken(stakeAmountInNativeTokenCalc);
        setRemainingAmountInNativeToken(remainingAmountInNativeTokenCalc);

        // Convert to USD for display
        const nativeSymbol = selectedNetwork.primaryCurrency || "ETH";

        const agreedUsd = await priceService.calculateUSDValue(
          nativeSymbol,
          agreedAmountInNativeToken
        );
        const stakeUsd = await priceService.calculateUSDValue(
          nativeSymbol,
          stakeAmountInNativeTokenCalc
        );
        const remainingUsd = await priceService.calculateUSDValue(
          nativeSymbol,
          remainingAmountInNativeTokenCalc
        );

        setAgreedAmountUsd(agreedUsd);
        setStakeAmountUsd(stakeUsd);
        setRemainingAmountUsd(remainingUsd);
      } catch (error) {
        console.error("Error converting amounts to USD:", error);
        // Set USD values to 0 if conversion fails, but keep native token amounts
        setAgreedAmountUsd(0);
        setStakeAmountUsd(0);
        setRemainingAmountUsd(0);
      } finally {
        setIsConverting(false);
      }
    };

    convertAmountsToUsd();
  }, [
    agreedAmountInNativeToken,
    selectedNetwork,
    stakeAmountInNativeTokenCalc,
    remainingAmountInNativeTokenCalc,
  ]);

  // Treasury contract address (this should be configured per network)
  const TREASURY_CONTRACT_ADDRESS =
    "0xf070f568c125b2740391136662fc600a2a29d2a6"; // Replace with actual treasury address

  const handleStakeWithSelectedToken = () => {
    if (isConverting || stakeAmountInNativeToken <= 0) {
      Alert.alert("Please Wait", "Converting amounts to native token...");
      return;
    }

    const stakeAmountFormatted = currencyConverter.formatAmountForTransaction(
      stakeAmountInNativeToken,
      selectedNetwork.primaryCurrency
    );

    Alert.alert(
      "Confirm Staking",
      `You will stake ${stakeAmountFormatted} ${
        selectedNetwork.primaryCurrency
      } on ${selectedNetwork.name} (equivalent to $${stakeAmountUsd.toFixed(
        2
      )} USD).`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue to Payment",
          onPress: () => {
            navigation.navigate("SendPayment", {
              prefilledRecipient: TREASURY_CONTRACT_ADDRESS,
              prefilledAmount: stakeAmountFormatted,
              prefilledMessage: `Marketplace stake for ${data.action} transaction - 20% collateral`,
              prefilledNetwork: selectedNetwork.id,
              prefilledToken: selectedNetwork.primaryCurrency,
              returnTo: "MarketplaceFlow",
              returnParams: {
                action: data.action,
                step: 3, // Return to current step to show success
              },
            });
          },
        },
      ]
    );
  };

  const handleNext = () => {
    if (!data.stakeTransactionHash) {
      Alert.alert(
        "Staking Required",
        "Please complete the staking process before continuing"
      );
      return;
    }
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
            <Text variant="title">Stake Collateral</Text>
            <Text color={palette.neutralMid} style={styles.subtitle}>
              {data.action === "buy"
                ? "As a buyer, stake 20% of the purchase amount as collateral"
                : "Seller staking is not required at this step"}
            </Text>
          </View>
        </View>

        {/* Progress */}
        <View style={styles.progressContainer}>
          <Text style={styles.stepText}>Step 3 of 6</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: "50%" }]} />
          </View>
        </View>

        {data.action === "buy" ? (
          <>
            {/* Amount Breakdown */}
            <View style={styles.section}>
              <Text variant="subtitle" style={styles.sectionTitle}>
                Amount Breakdown
              </Text>

              <View style={styles.amountCard}>
                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>Total Agreement</Text>
                  <Text style={styles.amountValue}>
                    {data.agreedAmount} {selectedNetwork.primaryCurrency}
                  </Text>
                  {agreedAmountUsd > 0 && (
                    <Text style={styles.usdEquivalent}>
                      ≈ ${agreedAmountUsd.toFixed(2)} USD
                    </Text>
                  )}
                </View>

                <View style={styles.divider} />

                <View style={styles.amountRow}>
                  <Text style={[styles.amountLabel, styles.stakeLabel]}>
                    Stake Amount (20%)
                  </Text>
                  <View style={styles.amountContainer}>
                    {isConverting ? (
                      <ActivityIndicator
                        size="small"
                        color={palette.primaryBlue}
                      />
                    ) : (
                      <>
                        <Text style={[styles.amountValue, styles.stakeValue]}>
                          {currencyConverter.formatAmount(
                            stakeAmountInNativeToken,
                            selectedNetwork.primaryCurrency
                          )}{" "}
                          {selectedNetwork.primaryCurrency}
                        </Text>
                        <Text style={styles.usdEquivalent}>
                          ≈ ${stakeAmountUsd.toFixed(2)} USD
                        </Text>
                      </>
                    )}
                  </View>
                </View>

                <View style={styles.amountRow}>
                  <Text style={styles.amountLabel}>Remaining to Pay Later</Text>
                  <View style={styles.amountContainer}>
                    {isConverting ? (
                      <ActivityIndicator
                        size="small"
                        color={palette.neutralMid}
                      />
                    ) : (
                      <>
                        <Text style={styles.amountValue}>
                          {currencyConverter.formatAmount(
                            remainingAmountInNativeToken,
                            selectedNetwork.primaryCurrency
                          )}{" "}
                          {selectedNetwork.primaryCurrency}
                        </Text>
                        <Text style={styles.usdEquivalent}>
                          ≈ ${remainingAmountUsd.toFixed(2)} USD
                        </Text>
                      </>
                    )}
                  </View>
                </View>
              </View>
            </View>

            {/* Payment Method Info */}
            <View style={styles.section}>
              <View style={styles.infoCard}>
                <MaterialCommunityIcons
                  name="credit-card-multiple-outline"
                  size={24}
                  color={palette.primaryBlue}
                />
                <View style={styles.infoContent}>
                  <Text variant="subtitle" style={styles.infoTitle}>
                    Flexible Payment
                  </Text>
                  <Text style={styles.infoText}>
                    • Payment will be made in {selectedNetwork.primaryCurrency}{" "}
                    on {selectedNetwork.name}
                    {"\n"}• Stake amount:{" "}
                    {isConverting
                      ? "Converting..."
                      : `${currencyConverter.formatAmount(
                          stakeAmountInNativeToken,
                          selectedNetwork.primaryCurrency
                        )} ${selectedNetwork.primaryCurrency}`}
                    {"\n"}• USD equivalent: ${stakeAmountUsd.toFixed(2)} USD
                    {"\n"}• All transactions use your selected network token
                  </Text>
                </View>
              </View>
            </View>

            {/* Staking Info */}
            <View style={styles.section}>
              <View style={styles.infoCard}>
                <MaterialCommunityIcons
                  name="information-outline"
                  size={24}
                  color={palette.primaryBlue}
                />
                <View style={styles.infoContent}>
                  <Text variant="subtitle" style={styles.infoTitle}>
                    About Staking
                  </Text>
                  <Text style={styles.infoText}>
                    • Your stake serves as collateral to ensure transaction
                    completion{"\n"}• The funds will be held in the treasury
                    smart contract{"\n"}• Upon successful delivery confirmation,
                    stakes are released{"\n"}• If disputes arise, stakes may be
                    used for resolution
                  </Text>
                </View>
              </View>
            </View>

            {/* Transaction Status */}
            {data.stakeTransactionHash && (
              <View style={styles.successCard}>
                <MaterialCommunityIcons
                  name="check-circle"
                  size={32}
                  color={palette.accentGreen}
                />
                <View style={styles.successContent}>
                  <Text style={styles.successTitle}>Stake Completed!</Text>
                  <Text style={styles.successMessage}>
                    {data.stakeAmount}{" "}
                    {data.stakeCurrency || selectedNetwork.primaryCurrency}{" "}
                    staked successfully on{" "}
                    {data.stakeNetwork || selectedNetwork.name}
                  </Text>
                  <Text style={styles.transactionHash}>
                    Tx: {data.stakeTransactionHash.slice(0, 10)}...
                    {data.stakeTransactionHash.slice(-8)}
                  </Text>
                </View>
              </View>
            )}
          </>
        ) : (
          // Seller view
          <View style={styles.sellerInfo}>
            <MaterialCommunityIcons
              name="information-outline"
              size={48}
              color={palette.primaryBlue}
            />
            <Text variant="subtitle" style={styles.sellerTitle}>
              No Action Required
            </Text>
            <Text style={styles.sellerText}>
              As a seller, you don't need to stake at this step. The buyer will
              handle the collateral staking. You can proceed to the next step.
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            label="Back"
            variant="outline"
            onPress={onBack}
            style={styles.backButtonAction}
          />

          {data.action === "buy" && !data.stakeTransactionHash ? (
            <Button
              label={
                isConverting
                  ? "Converting..."
                  : `Stake ${currencyConverter.formatAmount(
                      stakeAmountInNativeToken,
                      selectedNetwork.primaryCurrency
                    )} ${selectedNetwork.primaryCurrency}`
              }
              onPress={handleStakeWithSelectedToken}
              style={styles.stakeButton}
              disabled={isConverting || stakeAmountInNativeToken <= 0}
            />
          ) : (
            <Button
              label="Continue"
              onPress={handleNext}
              style={styles.continueButton}
            />
          )}
        </View>
      </ScrollView>
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
  amountCard: {
    backgroundColor: palette.white,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: palette.neutralLight,
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  amountLabel: {
    fontSize: 16,
    color: palette.neutralMid,
  },
  amountValue: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.neutralDark,
  },
  amountContainer: {
    alignItems: "flex-end",
  },
  usdEquivalent: {
    fontSize: 12,
    color: palette.neutralMid,
    marginTop: 2,
  },
  stakeLabel: {
    fontWeight: "600",
    color: palette.primaryBlue,
  },
  stakeValue: {
    color: palette.primaryBlue,
    fontSize: 18,
  },
  divider: {
    height: 1,
    backgroundColor: palette.neutralLight,
    marginVertical: spacing.sm,
  },
  infoCard: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: palette.neutralLight,
    borderRadius: 12,
    padding: spacing.lg,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    color: palette.neutralMid,
  },
  successCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: palette.accentGreen + "10",
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: palette.accentGreen + "30",
  },
  successContent: {
    flex: 1,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.accentGreen,
    marginBottom: spacing.xs,
  },
  successMessage: {
    fontSize: 14,
    color: palette.neutralDark,
    marginBottom: spacing.xs,
  },
  transactionHash: {
    fontSize: 12,
    color: palette.neutralMid,
    fontFamily: "monospace",
  },
  sellerInfo: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
    gap: spacing.lg,
  },
  sellerTitle: {
    textAlign: "center",
  },
  sellerText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    color: palette.neutralMid,
    paddingHorizontal: spacing.lg,
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
  stakeButton: {
    flex: 2,
  },
  continueButton: {
    flex: 2,
  },
});
