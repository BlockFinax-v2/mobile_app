/**
 * Updated Send Payment Screen using Universal Payment Hook
 *
 * This demonstrates how to replace the existing SendPaymentScreen
 * with the new universal payment system.
 */

import { UniversalPayment } from "@/components/ui/UniversalPayment";
import { PaymentParams } from "@/hooks/usePayment";
import { WalletStackParamList } from "@/navigation/types";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import React, { useMemo } from "react";
import { Alert } from "react-native";

type NavigationProp = StackNavigationProp<WalletStackParamList, "SendPayment">;
type RouteProps = RouteProp<WalletStackParamList, "SendPayment">;

export const SendPaymentScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();

  // Convert route params to payment params - memoized to prevent infinite re-renders
  const paymentParams: PaymentParams = useMemo(
    () => ({
      // title: "Send Payment",
      // description: "Send crypto to any wallet address",
      recipientAddress: route.params?.prefilledRecipient,
      amount: route.params?.prefilledAmount,
      tokenSymbol: route.params?.prefilledToken,
      networkId: route.params?.prefilledNetwork as any,
      message: route.params?.prefilledMessage,
      allowNetworkSwitch: true,
      allowTokenSwitch: true,
      returnTo: route.params?.returnTo,
      returnParams: route.params?.returnParams,
    }),
    [
      route.params?.prefilledRecipient,
      route.params?.prefilledAmount,
      route.params?.prefilledToken,
      route.params?.prefilledNetwork,
      route.params?.prefilledMessage,
      route.params?.returnTo,
      route.params?.returnParams,
    ],
  );

  const handlePaymentSuccess = (transactionHash: string) => {
    // Handle different return flows
    if (route.params?.returnTo === "MarketplaceFlow") {
      // Return to marketplace with transaction hash
      navigation.navigate("Marketplace" as any, {
        screen: "PaymentComplete",
        params: {
          transactionHash,
          ...route.params?.returnParams,
        },
      });
    } else if (route.params?.returnTo) {
      // Generic return flow
      navigation.navigate(route.params.returnTo as any, {
        transactionHash,
        ...route.params?.returnParams,
      });
    } else {
      // Default success flow
      Alert.alert(
        "Payment Sent Successfully! 🎉",
        `Your payment has been sent and is now processing on the blockchain.\n\nTransaction Hash:\n${transactionHash}`,
        [
          {
            text: "View Transaction",
            onPress: () =>
              navigation.navigate("TransactionDetails", {
                id: transactionHash,
              }),
          },
          {
            text: "Done",
            style: "cancel",
            onPress: () => navigation.goBack(),
          },
        ],
      );
    }
  };

  const handlePaymentCancel = () => {
    if (route.params?.returnTo) {
      // Return to the calling screen
      navigation.navigate(
        route.params.returnTo as any,
        route.params?.returnParams,
      );
    } else {
      navigation.goBack();
    }
  };

  const handlePaymentError = (error: string) => {
    Alert.alert(
      "Payment Failed",
      `Your payment could not be processed:\n\n${error}\n\nPlease check your balance and network connection, then try again.`,
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

  return (
    <UniversalPayment
      paymentParams={paymentParams}
      onPaymentSuccess={handlePaymentSuccess}
      onPaymentCancel={handlePaymentCancel}
      onPaymentError={handlePaymentError}
    />
  );
};
