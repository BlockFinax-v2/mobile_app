/**
 * Trade Finance Payment Screen
 *
 * Specialized payment screen for Trade Finance operations:
 * - Collateral payments
 * - Issuance fee payments (1% of guarantee amount)
 * - Balance payments
 *
 * Architecture follows Treasury Portal's multi-token pattern:
 * - Token selection UI (USDC, USDT, DAI, etc.)
 * - Multi-network support
 * - Account Abstraction compatibility
 * - Uses UniversalPayment component for consistency
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
  "TradeFinancePayment"
>;
type RouteProps = RouteProp<WalletStackParamList, "TradeFinancePayment">;

interface TradeFinancePaymentParams {
  // Old invoice/fee/settlement flow
  paymentType?:
    | "invoice"
    | "fee"
    | "settlement"
    | "collateral"
    | "issuanceFee"
    | "balancePayment";
  invoiceAmount?: number;
  supplierAddress?: string;
  invoiceId?: string;
  feeAmount?: number;
  feeRecipient?: string;
  applicationId?: string;
  settlementAmount?: number;
  settlementAddress?: string;

  // New PGA payment flow
  pgaId?: string;
  amount?: number;
  collateralAmount?: number;
  guaranteeAmount?: number;
  tradeValue?: number;
  diamondAddress?: string;
  buyerName?: string;
  sellerName?: string;
  description?: string;
  productCategory?: string;

  // Common
  preferredToken?: string;
  preferredNetwork?: string;
}

export const TradeFinancePayment: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();

  const params = route.params as TradeFinancePaymentParams;

  // Configure payment based on type - memoized to prevent infinite re-renders
  const paymentConfig = useMemo((): PaymentParams => {
    const baseConfig = {
      allowNetworkSwitch: true,
      allowTokenSwitch: true,
      restrictToStablecoins: true, // Trade Finance requires stablecoins for price stability
      allowedTokens: ["USDC"], // Multi-token support - matches Treasury pattern
      preferredToken: params.preferredToken || "USDC",
      networkId: params.preferredNetwork as any,
      returnTo: params.pgaId
        ? ("TradeFinanceDetails" as any)
        : ("TradeFinance" as any),
      returnParams: params.pgaId ? { pgaId: params.pgaId } : undefined,
    };

    // New PGA payment flow
    if (params.paymentType === "collateral") {
      return {
        ...baseConfig,
        title: "Pay Collateral",
        description: `Collateral payment for PGA #${params.pgaId}`,
        recipientAddress: params.diamondAddress,
        amount: params.collateralAmount?.toString(),
        tokenSymbol: params.preferredToken || "USDC",
        message: `Collateral for PGA: ${params.description || params.pgaId}`,
        requireMessage: false,
        minAmount: 1, // Minimum $1 collateral
      };
    }

    if (params.paymentType === "issuanceFee") {
      // Issuance fee is 1% of guarantee amount
      const feeAmount = params.guaranteeAmount
        ? params.guaranteeAmount / 100
        : params.amount;
      return {
        ...baseConfig,
        title: "Pay Issuance Fee",
        description: `1% issuance fee for PGA #${params.pgaId}`,
        recipientAddress: params.diamondAddress,
        amount: feeAmount?.toString(),
        tokenSymbol: params.preferredToken || "USDC",
        message: `Issuance fee (1%) for PGA: ${
          params.description || params.pgaId
        }`,
        requireMessage: false,
        minAmount: 0.01, // Very small minimum for fees
      };
    }

    if (params.paymentType === "balancePayment") {
      // Balance payment = trade value - collateral amount
      const balanceAmount =
        params.tradeValue && params.collateralAmount
          ? params.tradeValue - params.collateralAmount
          : params.amount;
      return {
        ...baseConfig,
        title: "Pay Balance",
        description: `Balance payment for PGA #${params.pgaId}`,
        recipientAddress: params.diamondAddress,
        amount: balanceAmount?.toString(),
        tokenSymbol: params.preferredToken || "USDC",
        message: `Balance payment for PGA: ${
          params.description || params.pgaId
        }`,
        requireMessage: false,
        minAmount: 1,
      };
    }

    // Old invoice/fee/settlement flow (backward compatibility)
    switch (params.paymentType) {
      case "invoice":
        return {
          ...baseConfig,
          title: "Pay Invoice",
          description: `Invoice payment #${params.invoiceId}`,
          recipientAddress: params.supplierAddress,
          amount: params.invoiceAmount?.toString(),
          tokenSymbol: params.preferredToken || "USDC",
          message: `Invoice payment: ${params.invoiceId}`,
          requireMessage: false,
          minAmount: 1,
        };

      case "fee":
        return {
          ...baseConfig,
          title: "Pay Fee",
          description: "Application fee payment",
          recipientAddress: params.feeRecipient,
          amount: params.feeAmount?.toString(),
          tokenSymbol: params.preferredToken || "USDC",
          message: "Application fee",
          requireMessage: false,
          minAmount: 0.01,
        };

      case "settlement":
        return {
          ...baseConfig,
          title: "Settlement Payment",
          description: "Final settlement",
          recipientAddress: params.settlementAddress,
          amount: params.settlementAmount?.toString(),
          tokenSymbol: params.preferredToken || "USDC",
          message: "Settlement payment",
          requireMessage: false,
          minAmount: 1,
        };

      default:
        return {
          ...baseConfig,
          title: "Trade Finance Payment",
          description: "Payment for trade finance operation",
        };
    }
  }, [
    params.paymentType,
    params.preferredToken,
    params.preferredNetwork,
    params.collateralAmount,
    params.guaranteeAmount,
    params.tradeValue,
    params.amount,
    params.diamondAddress,
    params.pgaId,
    params.description,
  ]);

  const handlePaymentSuccess = (transactionHash: string) => {
    const paymentType = params.paymentType || "collateral"; // Default to collateral
    const pgaId = params.pgaId || "N/A";

    const successMessages: Record<string, string> = {
      collateral: `Successfully paid collateral for PGA #${pgaId}!`,
      issuanceFee: `Successfully paid issuance fee for PGA #${pgaId}!`,
      balancePayment: `Successfully paid balance for PGA #${pgaId}!`,
      invoice: `Successfully paid invoice!`,
      fee: `Successfully paid application fee!`,
      settlement: `Successfully completed settlement!`,
    };

    const successDetails: Record<string, string> = {
      collateral: `Your collateral of ${params.collateralAmount} ${
        params.preferredToken || "USDC"
      } has been locked in the Treasury Pool. The PGA is now active and awaiting seller approval.`,
      issuanceFee: `The 1% issuance fee has been paid to BlockFinax Treasury. ${
        params.buyerName || "Buyer"
      } can now proceed with goods shipment confirmation.`,
      balancePayment: `The balance payment has been completed. The seller ${
        params.sellerName || ""
      } will receive funds upon certificate issuance.`,
      invoice: `Your invoice payment has been processed successfully.`,
      fee: `The application fee has been paid and your request is being processed.`,
      settlement: `The settlement has been completed successfully.`,
    };

    Alert.alert(
      "Payment Successful! 🎉",
      `${successMessages[paymentType]}\n\n${
        successDetails[paymentType]
      }\n\nTransaction Hash:\n${transactionHash}`,
      [
        {
          text: params.pgaId ? "View PGA Details" : "Done",
          onPress: () => {
            if (params.pgaId) {
              navigation.navigate("TradeFinanceDetails" as any, {
                pgaId: params.pgaId,
                paymentResult: {
                  success: true,
                  transactionHash,
                  paymentType: params.paymentType,
                },
              });
            } else {
              navigation.navigate("TradeFinance" as any);
            }
          },
        },
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            if (params.pgaId) {
              navigation.navigate("TradeFinanceDetails" as any, {
                pgaId: params.pgaId,
              });
            } else {
              navigation.navigate("TradeFinance" as any);
            }
          },
        },
      ],
    );
  };

  const handlePaymentCancel = () => {
    if (params.pgaId) {
      navigation.navigate("TradeFinanceDetails" as any, {
        pgaId: params.pgaId,
      });
    } else {
      navigation.navigate("TradeFinance" as any);
    }
  };

  const handlePaymentError = (error: string) => {
    const paymentType = params.paymentType || "collateral";
    const errorContext: Record<string, string> = {
      collateral: "collateral payment",
      issuanceFee: "issuance fee payment",
      balancePayment: "balance payment",
      invoice: "invoice payment",
      fee: "fee payment",
      settlement: "settlement payment",
    };

    Alert.alert(
      "Payment Failed",
      `Your ${
        errorContext[paymentType]
      } could not be processed:\n\n${error}\n\nPlease check:\n- Your ${
        params.preferredToken || "USDC"
      } balance\n- Token approval for Diamond contract\n- Network connection\n- PGA status`,
      [
        { text: "Try Again", style: "default" },
        {
          text: "Cancel",
          style: "cancel",
          onPress: handlePaymentCancel,
        },
      ],
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
        params.paymentType === "collateral"
          ? `${params.collateralAmount} ${
              params.preferredToken || "USDC"
            } • PGA #${params.pgaId}`
          : params.paymentType === "issuanceFee"
            ? `1% fee • ${
                params.guaranteeAmount ? params.guaranteeAmount / 100 : "N/A"
              } ${params.preferredToken || "USDC"}`
            : `Balance • ${
                params.tradeValue && params.collateralAmount
                  ? params.tradeValue - params.collateralAmount
                  : "N/A"
              } ${params.preferredToken || "USDC"}`
      }
    />
  );
};
