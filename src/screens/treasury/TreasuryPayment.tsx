/**
 * Treasury Payment Screen
 *
 * Specialized payment screen for Treasury Portal operations like:
 * - Staking payments
 * - Treasury deposits
 * - Governance payments
 */

import { UniversalPayment } from "@/components/ui/UniversalPayment";
import { PaymentParams } from "@/hooks/usePayment";
import { WalletStackParamList } from "@/navigation/types";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import React, { useMemo } from "react";
import { Alert } from "react-native";

type NavigationProp = StackNavigationProp<
  WalletStackParamList,
  "TreasuryPayment"
>;
type RouteProps = RouteProp<WalletStackParamList, "TreasuryPayment">;

interface TreasuryPaymentParams {
  // Staking operations
  stakeAmount?: number;
  stakingContract?: string;
  stakingPeriod?: string;

  // Treasury deposits
  depositAmount?: number;
  depositContract?: string;

  // Governance payments
  governanceAmount?: number;
  proposalId?: string;

  // Payment type
  paymentType: "stake" | "deposit" | "governance";

  // Optional customization
  preferredToken?: string;
  preferredNetwork?: string;

  // Staking specific
  apy?: number;
  lockPeriod?: number;
}

export const TreasuryPayment: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();

  const params = route.params as TreasuryPaymentParams;

  // Configure payment based on type - memoized to prevent infinite re-renders
  const paymentConfig = useMemo((): PaymentParams => {
    const baseConfig = {
      allowNetworkSwitch: true,
      allowTokenSwitch: true,
      restrictToStablecoins: true, // Treasury only allows stablecoins
      allowedTokens: ["USDC"], // Restrict to USDC only for now
      preferredToken: params.preferredToken || "USDC",
      networkId: params.preferredNetwork as any,
      returnTo: "TreasuryPortal",
      returnParams: route.params,
    };

    switch (params.paymentType) {
      case "stake":
        return {
          ...baseConfig,
          title: "Stake Tokens",
          description: `Stake ${params.preferredToken || "USDC"} for ${
            params.stakingPeriod || "flexible"
          } period`,
          recipientAddress: params.stakingContract,
          amount: params.stakeAmount?.toString(),
          tokenSymbol: params.preferredToken || "USDC",
          message: `Staking for ${params.stakingPeriod} - APY: ${params.apy}%`,
          requireMessage: false,
          allowTokenSwitch: false, // Staking contracts usually require specific tokens
          minAmount: 10, // Minimum $10 for staking
        };

      case "deposit":
        return {
          ...baseConfig,
          title: "Treasury Deposit",
          description: "Deposit funds into Treasury Pool",
          recipientAddress: params.depositContract,
          amount: params.depositAmount?.toString(),
          tokenSymbol: params.preferredToken || "USDC",
          message: "Treasury pool deposit",
          requireMessage: false,
          minAmount: 100, // Higher minimum for treasury deposits
        };

      case "governance":
        return {
          ...baseConfig,
          title: "Governance Payment",
          description: `Payment for Proposal #${params.proposalId}`,
          amount: params.governanceAmount?.toString(),
          tokenSymbol: params.preferredToken || "USDC",
          message: `Governance payment for proposal #${params.proposalId}`,
          requireMessage: true, // Governance requires documentation
          minAmount: 1,
        };

      default:
        return {
          ...baseConfig,
          title: "Treasury Payment",
          description: "Payment for treasury operation",
        };
    }
  }, [
    params.paymentType,
    params.preferredToken,
    params.preferredNetwork,
    params.stakeAmount,
    params.stakingContract,
    params.stakingPeriod,
    params.depositAmount,
    params.depositContract,
    params.governanceAmount,
    params.proposalId,
    params.apy,
    params.lockPeriod,
    route.params,
  ]);

  const handlePaymentSuccess = (transactionHash: string) => {
    const successMessages = {
      stake: `Successfully staked ${params.stakeAmount} ${
        params.preferredToken || "USDC"
      }!`,
      deposit: `Successfully deposited ${params.depositAmount} ${
        params.preferredToken || "USDC"
      } to Treasury!`,
      governance: `Governance payment for Proposal #${params.proposalId} completed!`,
    };

    const successDetails = {
      stake: params.apy
        ? `Your tokens are now earning ${params.apy}% APY. ${
            params.lockPeriod
              ? `Lock period: ${params.lockPeriod} days`
              : "Flexible staking"
          }`
        : "Your tokens are now staked and earning rewards.",
      deposit:
        "Your funds have been added to the Treasury pool and will start earning yield.",
      governance: "Your payment has been recorded for the governance proposal.",
    };

    Alert.alert(
      "Payment Successful! 🎉",
      `${successMessages[params.paymentType]}\n\n${
        successDetails[params.paymentType]
      }\n\nTransaction Hash:\n${transactionHash}`,
      [
        {
          text: "View Treasury",
          onPress: () =>
            navigation.navigate("TreasuryPortal", {
              paymentResult: {
                success: true,
                transactionHash,
                paymentType: params.paymentType,
                stakeAmount: params.stakeAmount,
              },
            } as any),
        },
        {
          text: "Done",
          style: "cancel",
          onPress: () => navigation.navigate("TreasuryPortal"),
        },
      ]
    );
  };

  const handlePaymentCancel = () => {
    navigation.navigate("TreasuryPortal");
  };

  const handlePaymentError = (error: string) => {
    const errorContext = {
      stake: "staking",
      deposit: "treasury deposit",
      governance: "governance payment",
    };

    Alert.alert(
      "Payment Failed",
      `Your ${
        errorContext[params.paymentType]
      } could not be processed:\n\n${error}\n\nPlease check your balance and network connection.`,
      [
        { text: "Try Again", style: "default" },
        {
          text: "Cancel",
          style: "cancel",
          onPress: handlePaymentCancel,
        },
      ]
    );
  };

  const paymentParams = paymentConfig;

  return (
    <UniversalPayment
      paymentParams={paymentParams}
      onPaymentSuccess={handlePaymentSuccess}
      onPaymentCancel={handlePaymentCancel}
      onPaymentError={handlePaymentError}
      headerTitle={paymentParams.title}
      headerSubtitle={
        params.paymentType === "stake"
          ? `${params.stakeAmount} ${params.preferredToken || "USDC"} • ${
              params.apy
            }% APY • ${params.stakingPeriod}`
          : params.paymentType === "deposit"
          ? `${params.depositAmount} ${
              params.preferredToken || "USDC"
            } • Treasury Pool`
          : `Proposal #${params.proposalId} • ${params.governanceAmount} ${
              params.preferredToken || "USDC"
            }`
      }
    />
  );
};
