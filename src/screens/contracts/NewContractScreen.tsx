import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { palette } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { useNavigation } from "@react-navigation/native";
import React from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, ScrollView, StyleSheet, View } from "react-native";

interface ContractForm {
  counterparty: string;
  contractValue: string;
  currency: string;
  shipmentDate: string;
  incoterm: string;
  notes: string;
}

export const NewContractScreen: React.FC = () => {
  const navigation = useNavigation();
  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<ContractForm>({
    defaultValues: {
      counterparty: "",
      contractValue: "",
      currency: "USDC",
      shipmentDate: "",
      incoterm: "FOB",
      notes: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    Alert.alert(
      "Contract Drafted",
      `We have created a draft with ${values.counterparty}. You can track it under Contracts.`
    );
    reset();
    navigation.goBack();
  });

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heroCard}>
          <Text variant="title" color={palette.white}>
            Initiate Smart Contract
          </Text>
          <Text color={palette.white}>
            Define trade terms to generate a draft agreement for counterparties.
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text variant="subtitle" color={palette.primaryBlue}>
            Trade Details
          </Text>
          <Controller
            control={control}
            name="counterparty"
            rules={{ required: "Counterparty name is required" }}
            render={({ field: { onChange, value }, fieldState }) => (
              <Input
                label="Counterparty"
                value={value}
                onChangeText={onChange}
                placeholder="Company or business name"
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="contractValue"
            rules={{ required: "Value is required" }}
            render={({ field: { onChange, value }, fieldState }) => (
              <Input
                label="Contract Value"
                value={value}
                onChangeText={onChange}
                keyboardType="numeric"
                placeholder="e.g. 25000"
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="currency"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Currency"
                value={value}
                onChangeText={onChange}
                placeholder="USDC, EUR, NGN"
              />
            )}
          />
          <Controller
            control={control}
            name="shipmentDate"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Shipment Date"
                value={value}
                onChangeText={onChange}
                placeholder="YYYY-MM-DD"
              />
            )}
          />
          <Controller
            control={control}
            name="incoterm"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Incoterm"
                value={value}
                onChangeText={onChange}
                placeholder="FOB, CIF, DAP..."
              />
            )}
          />
          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Additional Notes"
                value={value}
                onChangeText={onChange}
                placeholder="Key compliance or logistics details"
                multiline
                numberOfLines={4}
                helperText="Counterparties will see this context"
              />
            )}
          />
        </View>

        <Button
          label="Generate Draft"
          onPress={onSubmit}
          loading={isSubmitting}
          style={styles.submitButton}
        />
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  heroCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    backgroundColor: palette.primaryBlue,
    borderRadius: 24,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  formCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: palette.white,
    borderRadius: 24,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  submitButton: {
    marginHorizontal: spacing.lg,
  },
});
