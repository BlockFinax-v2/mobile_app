import React, { useEffect } from "react";
import { Alert } from "react-native";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { AppTabParamList } from "@/navigation/types";
import { useNavigation } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { View, StyleSheet } from "react-native";
import { spacing } from "@/theme/spacing";

type NavigationProp = BottomTabNavigationProp<AppTabParamList>;

export const MarketplaceFlowScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  useEffect(() => {
    // Automatically redirect to Trade Finance
    Alert.alert(
      "Feature Moved",
      "Buy & Sell functionality has been integrated into Trade Finance Portal for better security and guarantees.",
      [
        {
          text: "Go to Trade Finance",
          onPress: () =>
            navigation.navigate("TradeTab", { screen: "TradeFinance" }),
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
