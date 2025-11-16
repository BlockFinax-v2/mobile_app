import React from "react";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { View, StyleSheet } from "react-native";
import { spacing } from "@/theme/spacing";

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

export const PaymentStep: React.FC<Props> = ({
  data,
  updateData,
  onNext,
  onBack,
}) => {
  return (
    <Screen>
      <View style={styles.container}>
        <Text variant="title">Payment Step (80%)</Text>
        <Text>Send remaining 80% of agreed amount to treasury</Text>
        <View style={styles.actions}>
          <Button label="Back" variant="outline" onPress={onBack} />
          <Button label="Continue" onPress={onNext} />
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
