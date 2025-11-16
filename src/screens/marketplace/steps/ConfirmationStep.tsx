import React from "react";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { View, StyleSheet } from "react-native";
import { spacing } from "@/theme/spacing";
import { useNavigation } from "@react-navigation/native";

interface MarketplaceData {
  action: "buy" | "sell";
  [key: string]: any;
}

interface Props {
  data: MarketplaceData;
  updateData: (newData: Partial<MarketplaceData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const ConfirmationStep: React.FC<Props> = ({
  data,
  updateData,
  onNext,
  onBack,
}) => {
  const navigation = useNavigation();

  const handleComplete = () => {
    // Complete the marketplace transaction
    navigation.goBack(); // Return to dashboard
  };

  return (
    <Screen>
      <View style={styles.container}>
        <Text variant="title">Transaction Complete</Text>
        <Text>
          Your {data.action === "buy" ? "purchase" : "sale"} has been confirmed
          and completed successfully.
        </Text>
        <View style={styles.actions}>
          <Button label="Back" variant="outline" onPress={onBack} />
          <Button label="Complete" onPress={handleComplete} />
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: "center",
    gap: spacing.lg,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.xl,
  },
});
