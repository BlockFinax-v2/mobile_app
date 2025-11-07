import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { DebugTool } from "@/components/ui/DebugTool";
import { useWallet } from "@/contexts/WalletContext";
import { RootStackParamList } from "@/navigation/types";
import { palette } from "@/theme/colors";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import React, { useCallback, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, Animated, StyleSheet, View } from "react-native";

type UnlockForm = {
  password: string;
};

type NavigationProp = StackNavigationProp<RootStackParamList>;

export const UnlockWalletScreen: React.FC = () => {
  const { unlockWallet, unlockWithBiometrics, settings, isBiometricAvailable } =
    useWallet();
  const navigation = useNavigation<NavigationProp>();
  const [isLoading, setIsLoading] = useState(false);
  const [secureText, setSecureText] = useState(true);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const autoAttemptedRef = useRef(false);

  const { control, handleSubmit, reset } = useForm<UnlockForm>({
    defaultValues: { password: "" },
  });

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 6,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const onSubmit = async ({ password }: UnlockForm) => {
    setIsLoading(true);
    try {
      await unlockWallet(password);
      navigation.reset({ index: 0, routes: [{ name: "App" }] });
      reset();
    } catch {
      triggerShake();
      Alert.alert("Invalid Password", "The password you entered is incorrect.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBiometricUnlock = useCallback(async () => {
    try {
      setIsLoading(true);
      await unlockWithBiometrics();
      navigation.reset({ index: 0, routes: [{ name: "App" }] });
    } catch (error) {
      Alert.alert(
        "Authentication Failed",
        "Unable to authenticate with biometrics. Please try again or use your password."
      );
    } finally {
      setIsLoading(false);
    }
  }, [navigation, unlockWithBiometrics]);

  useFocusEffect(
    useCallback(() => {
      if (
        isBiometricAvailable &&
        settings.enableBiometrics &&
        !autoAttemptedRef.current
      ) {
        autoAttemptedRef.current = true;
        handleBiometricUnlock();
      }

      return () => {
        autoAttemptedRef.current = false;
      };
    }, [handleBiometricUnlock, isBiometricAvailable, settings.enableBiometrics])
  );

  return (
    <Screen>
      <View style={styles.container}>
        <Text variant="title" color={palette.primaryBlue}>
          Unlock Wallet
        </Text>
        <Text color={palette.neutralMid}>
          Enter your password to access the BlockFinaX dashboard.
        </Text>

        {isBiometricAvailable && settings.enableBiometrics ? (
          <Button
            label="Use Fingerprint / Face ID"
            variant="secondary"
            onPress={handleBiometricUnlock}
            loading={isLoading}
            style={styles.biometricButton}
            disabled={isLoading}
          />
        ) : null}

        <Animated.View
          style={{ width: "100%", transform: [{ translateX: shakeAnim }] }}
        >
          <Controller
            control={control}
            name="password"
            rules={{ required: true }}
            render={({ field: { onChange, value }, fieldState }) => (
              <Input
                label="Password"
                value={value}
                onChangeText={onChange}
                secureTextEntry={secureText}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="Enter wallet password"
                error={fieldState.error ? "Password is required" : undefined}
              />
            )}
          />
        </Animated.View>

        <Button
          label={secureText ? "Show Password" : "Hide Password"}
          variant="outline"
          onPress={() => setSecureText((prev) => !prev)}
        />

        <Button
          label="Unlock Wallet"
          onPress={handleSubmit(onSubmit)}
          loading={isLoading}
          style={styles.unlockButton}
        />
      </View>
      <DebugTool />
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    gap: 16,
  },
  unlockButton: {
    marginTop: 24,
  },
  biometricButton: {
    marginTop: 12,
  },
});
