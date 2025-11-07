import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { DebugTool } from "@/components/ui/DebugTool";
import { useWallet } from "@/contexts/WalletContext";
import { RootStackParamList } from "@/navigation/types";
import { palette } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import React, { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, ScrollView, StyleSheet, View } from "react-native";

type ImportWalletForm = {
  mnemonic: string;
  privateKey: string;
  password: string;
};

type NavigationProp = StackNavigationProp<RootStackParamList>;

export const ImportWalletScreen: React.FC = () => {
  const { importWallet } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation<NavigationProp>();

  const { control, handleSubmit, watch, setValue } = useForm<ImportWalletForm>({
    defaultValues: { mnemonic: "", privateKey: "", password: "" },
  });

  const mnemonic = watch("mnemonic");
  const privateKey = watch("privateKey");

  const onSubmit = async (values: ImportWalletForm) => {
    if (!values.mnemonic && !values.privateKey) {
      Alert.alert(
        "Missing Information",
        "Provide either a 12-word recovery phrase or a private key."
      );
      return;
    }

    setIsLoading(true);
    try {
      await importWallet({
        mnemonic: values.mnemonic || undefined,
        privateKey: values.privateKey || undefined,
        password: values.password,
      });
      navigation.reset({ index: 0, routes: [{ name: "App" }] });
    } catch (error) {
      console.error("Import wallet failed", error);
      Alert.alert(
        "Import Failed",
        "Please verify the credentials and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanQr = () => {
    Alert.alert(
      "Coming Soon",
      "QR code scanning will be available in a future update."
    );
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.alertBox}>
          <Text variant="subtitle" color={palette.errorRed}>
            Security Reminder
          </Text>
          <Text>
            Only paste your seed phrase or private key in trusted environments.
            BlockFinaX never stores this information.
          </Text>
        </View>

        <Controller
          control={control}
          name="mnemonic"
          render={({ field: { onChange, value } }) => (
            <Input
              label="12-word Recovery Phrase"
              value={value}
              onChangeText={(text) => {
                onChange(text);
                if (text.trim().length > 0) {
                  setValue("privateKey", "");
                }
              }}
              multiline
              numberOfLines={4}
              placeholder="word1 word2 ... word12"
            />
          )}
        />
        <Text color={palette.neutralMid} style={styles.helperText}>
          {`${mnemonic.trim().split(/\s+/).filter(Boolean).length}/12 words`}
        </Text>

        <Controller
          control={control}
          name="privateKey"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Private Key (Hex)"
              value={value}
              onChangeText={(text) => {
                onChange(text);
                if (text.trim().length > 0) {
                  setValue("mnemonic", "");
                }
              }}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="0x..."
            />
          )}
        />
        <Text color={palette.neutralMid} style={styles.helperText}>
          {privateKey.trim().length} characters
        </Text>

        <Controller
          control={control}
          name="password"
          rules={{ required: true, minLength: 8 }}
          render={({ field: { onChange, value }, fieldState }) => (
            <Input
              label="Set Wallet Password"
              value={value}
              onChangeText={onChange}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Enter a strong password"
              error={
                fieldState.error
                  ? "Password must be at least 8 characters."
                  : undefined
              }
            />
          )}
        />

        <Button label="Scan QR Code" variant="outline" onPress={handleScanQr} />
        <Button
          label="Import Wallet"
          onPress={handleSubmit(onSubmit)}
          loading={isLoading}
          style={styles.submitButton}
        />
      </ScrollView>
      <DebugTool />
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  alertBox: {
    backgroundColor: "#FFF3F3",
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: "#FFD6D6",
  },
  helperText: {
    marginTop: -spacing.sm,
  },
  submitButton: {
    marginTop: spacing.lg,
  },
});
