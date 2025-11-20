/**
 * Trade Finance Payment Screen
 *
 * Specialized payment screen for Trade Finance operations like:
 * - Invoice payments
 * - Fee payments
 * - Settlement payments
 */

import { UniversalPayment } from "@/components/ui/UniversalPayment";
import { PaymentParams } from "@/hooks/usePayment";
import { TradeStackParamList } from "@/navigation/types";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import React, { useMemo } from "react";
import { Alert } from "react-native";

type NavigationProp = StackNavigationProp<
  TradeStackParamList,
  "TradeFinancePayment"
>;
type RouteProps = RouteProp<TradeStackParamList, "TradeFinancePayment">;

interface TradeFinancePaymentParams {
  // Invoice payments
  invoiceAmount?: number;
  supplierAddress?: string;
  invoiceId?: string;

  // Fee payments
  feeAmount?: number;
  feeRecipient?: string;
  applicationId?: string;

  // Settlement payments
  settlementAmount?: number;
  settlementAddress?: string;

  // Payment type
  paymentType: "invoice" | "fee" | "settlement";

  // Optional customization
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
      restrictToStablecoins: true, // Trade Finance only allows stablecoins
      allowedTokens: ["USDC"], // Restrict to USDC only for now
      preferredToken: params.preferredToken || "USDC",
      networkId: params.preferredNetwork as any,
      returnTo: "TradeFinance",
      returnParams: route.params,
    };

    switch (params.paymentType) {
      case "invoice":
        return {
          ...baseConfig,
          title: "Pay Invoice",
          description: `Payment for Invoice #${params.invoiceId}`,
          recipientAddress: params.supplierAddress,
          amount: params.invoiceAmount?.toString(),
          tokenSymbol: params.preferredToken || "USDC",
          message: `Payment for Invoice #${params.invoiceId}`,
          requireMessage: false,
          minAmount: 1, // Minimum $1 for invoices
        };

      case "fee":
        return {
          ...baseConfig,
          title: "Pay Application Fee",
          description: `Fee payment for Application #${params.applicationId}`,
          recipientAddress: params.feeRecipient,
          amount: params.feeAmount?.toString(),
          tokenSymbol: params.preferredToken || "USDC",
          message: `Application fee for #${params.applicationId}`,
          requireMessage: false,
          allowTokenSwitch: false, // Fees usually have specific token requirements
          minAmount: 0.01,
        };

      case "settlement":
        return {
          ...baseConfig,
          title: "Settlement Payment",
          description: `Final settlement payment`,
          recipientAddress: params.settlementAddress,
          amount: params.settlementAmount?.toString(),
          tokenSymbol: params.preferredToken || "USDC",
          message: "Final settlement payment for trade finance transaction",
          requireMessage: true, // Settlement requires documentation
          minAmount: 10, // Higher minimum for settlements
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
    params.invoiceAmount,
    params.supplierAddress,
    params.invoiceId,
    params.feeAmount,
    params.feeRecipient,
    params.applicationId,
    params.settlementAmount,
    params.settlementAddress,
    route.params,
  ]);
  const handlePaymentSuccess = (transactionHash: string) => {
    const successMessages = {
      invoice: `Invoice #${params.invoiceId} has been successfully paid!`,
      fee: `Application fee for #${params.applicationId} has been paid!`,
      settlement: `Settlement payment completed successfully!`,
    };

    Alert.alert(
      "Payment Successful! 🎉",
      `${
        successMessages[params.paymentType]
      }\n\nTransaction Hash:\n${transactionHash}\n\nYou can track this transaction in your wallet.`,
      [
        {
          text: "View in Trade Finance",
          onPress: () =>
            navigation.navigate("TradeFinance", {
              paymentResult: {
                success: true,
                transactionHash,
                paymentType: params.paymentType,
                applicationId: params.applicationId,
                invoiceId: params.invoiceId,
              },
            } as any),
        },
        {
          text: "Done",
          style: "cancel",
          onPress: () => navigation.navigate("TradeFinance"),
        },
      ]
    );
  };

  const handlePaymentCancel = () => {
    navigation.navigate("TradeFinance");
  };

  const handlePaymentError = (error: string) => {
    Alert.alert(
      "Payment Failed",
      `Your ${params.paymentType} payment could not be processed:\n\n${error}\n\nPlease check your balance and try again.`,
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
        params.paymentType === "invoice"
          ? `Invoice #${params.invoiceId} • ${params.invoiceAmount} ${
              params.preferredToken || "USDC"
            }`
          : params.paymentType === "fee"
          ? `Application #${params.applicationId} • ${params.feeAmount} ${
              params.preferredToken || "USDC"
            }`
          : `Settlement • ${params.settlementAmount} ${
              params.preferredToken || "USDC"
            }`
      }
    />
  );
};
