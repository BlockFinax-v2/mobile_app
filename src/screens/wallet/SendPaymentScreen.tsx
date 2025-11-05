import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { useWallet } from "@/contexts/WalletContext";
import { WalletStackParamList } from "@/navigation/types";
import { palette } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import React from "react";
import { Controller, useForm } from "react-hook-form";
import { StyleSheet, View } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

type SupportedCurrency = "USDC" | "USDT" | "BUSD" | "ETH" | "MATIC" | "BNB";
type NavigationProp = StackNavigationProp<WalletStackParamList, "SendPayment">;

type FormValues = {
  recipient: string;
  amount: string;
  currency: SupportedCurrency;
  network: string;
  message: string;
};

export const SendPaymentScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { selectedNetwork } = useWallet();

  const availableCurrencies = React.useMemo(() => {
    const currencies: SupportedCurrency[] = [
      selectedNetwork.primaryCurrency as SupportedCurrency,
    ];
    if (selectedNetwork.stablecoins) {
      selectedNetwork.stablecoins.forEach((coin) => {
        currencies.push(coin.symbol as SupportedCurrency);
      });
    }
    return currencies;
  }, [selectedNetwork]);

  const { control, handleSubmit, watch } = useForm<FormValues>({
    defaultValues: {
      recipient: "",
      amount: "",
      currency: availableCurrencies[0] || "USDC",
      network: selectedNetwork.name,
      message: "",
    },
  });

  const amountValue = watch("amount");
  const selectedCurrency = watch("currency");
  const fee = amountValue ? parseFloat(amountValue || "0") * 0.005 : 0;
  const total = parseFloat(amountValue || "0") + fee;

  const onSubmit = (values: FormValues) => {
    navigation.navigate("SendPaymentReview", {
      recipient: values.recipient,
      amount: values.amount,
      currency: values.currency,
      network: values.network,
      fee,
      message: values.message || undefined,
    });
  };

  return (
    <Screen preset="scroll">
      <View style={styles.container}>
        <View style={styles.header}>
          <MaterialCommunityIcons
            name="send"
            size={24}
            color={palette.primaryBlue}
          />
          <View style={styles.headerText}>
            <Text variant="title">Send Payment</Text>
            <Text color={palette.neutralMid} style={styles.subtitle}>
              Fill in the recipient details to proceed
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Controller
            control={control}
            name="recipient"
            rules={{ required: "Recipient address is required" }}
            render={({ field: { onChange, value }, fieldState }) => (
              <Input
                label="Recipient Address *"
                value={value}
                onChangeText={onChange}
                placeholder="0x..."
                autoCapitalize="none"
                autoCorrect={false}
                error={fieldState.error?.message}
              />
            )}
          />
          <Input label="Recipient Name (Optional)" placeholder="John Doe" />
        </View>

        <View style={styles.card}>
          <Controller
            control={control}
            name="amount"
            rules={{ required: "Amount required" }}
            render={({ field: { onChange, value }, fieldState }) => (
              <Input
                label="Amount *"
                value={value}
                onChangeText={onChange}
                keyboardType="numeric"
                placeholder="0.00"
                error={fieldState.error?.message}
                helperText={`Available: 24,500 ${selectedCurrency}`}
              />
            )}
          />
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text color={palette.neutralMid}>Amount</Text>
            <Text style={styles.summaryValue}>
              {amountValue || "0.00"} {selectedCurrency}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text color={palette.neutralMid}>Fee</Text>
            <Text style={styles.summaryValue}>
              {fee.toFixed(4)} {selectedCurrency}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text variant="subtitle">Total</Text>
            <Text variant="subtitle" color={palette.primaryBlue}>
              {total.toFixed(4)} {selectedCurrency}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Controller
            control={control}
            name="message"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Message (Optional)"
                value={value}
                onChangeText={onChange}
                multiline
                numberOfLines={3}
                maxLength={100}
                placeholder="Add a note..."
                helperText={`${value.length}/100`}
              />
            )}
          />
        </View>

        <View style={styles.actions}>
          <Button label="Review & Send" onPress={handleSubmit(onSubmit)} />
          <Button
            label="Cancel"
            variant="outline"
            onPress={() => navigation.goBack()}
          />
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: { gap: spacing.lg, paddingBottom: spacing.xxl },
  header: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  headerText: { flex: 1, gap: spacing.xs },
  subtitle: { fontSize: 14 },
  card: {
    backgroundColor: palette.white,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: spacing.md,
  },
  summaryCard: {
    backgroundColor: "#EEF2FF",
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryValue: { fontSize: 16, fontWeight: "600", color: palette.neutralDark },
  divider: {
    height: 1,
    backgroundColor: "#D1D5DB",
    marginVertical: spacing.xs,
  },
  actions: { gap: spacing.md },
});
