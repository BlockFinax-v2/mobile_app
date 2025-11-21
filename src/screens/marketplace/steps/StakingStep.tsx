import React, { useEffect } from "react";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { AppTabParamList } from "@/navigation/types";
import { useNavigation } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { View, StyleSheet, Alert } from "react-native";
import { spacing } from "@/theme/spacing";

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

type NavigationProp = BottomTabNavigationProp<AppTabParamList>;

export const StakingStep: React.FC<Props> = () => {
  const navigation = useNavigation<NavigationProp>();

  useEffect(() => {
    // Automatically redirect to Trade Finance
    Alert.alert(
      "Feature Moved",
      "Staking functionality has been integrated into Trade Finance Portal with better pool guarantee system.",
      [
        {
          text: "Go to Trade Finance",
          onPress: () =>
            navigation.navigate("WalletTab", { screen: "TradeFinance" }),
        },
      ]
    );
  }, [navigation]);

  return (
    <Screen>
      <View style={styles.container}>
        <Text variant="title">Redirecting...</Text>
        <Text>This feature has moved to Trade Finance Portal</Text>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
});
