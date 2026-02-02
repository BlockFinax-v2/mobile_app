import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { DebugTool } from "@/components/ui/DebugTool";
import { useWallet } from "@/contexts/WalletContext";
import { RootStackParamList } from "@/navigation/types";
import { palette } from "@/theme/colors";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import React, { useRef, useState, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Alert,
  Animated,
  StyleSheet,
  View,
  Pressable,
  ActivityIndicator,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { backgroundDataLoader } from "@/services/backgroundDataLoader";

type UnlockForm = {
  password: string;
};

type NavigationProp = StackNavigationProp<RootStackParamList>;

export const UnlockWalletScreen: React.FC = () => {
  const eyeScale = useRef(new Animated.Value(1)).current;

  const animateEye = () => {
    Animated.sequence([
      Animated.timing(eyeScale, {
        toValue: 0.85,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(eyeScale, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const {
    unlockWallet,
    unlockWithBiometrics,
    // settings,
    isBiometricAvailable,
    isBiometricEnabled,
    address,
    selectedNetwork,
  } = useWallet();
  const navigation = useNavigation<NavigationProp>();
  const [isLoading, setIsLoading] = useState(false);
  const [secureText, setSecureText] = useState(true);
  const [isPreloading, setIsPreloading] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const { control, handleSubmit, reset } = useForm<UnlockForm>({
    defaultValues: { password: "" },
  });

  // ⚡ PERFORMANCE: Start background preloading when screen appears
  useEffect(() => {
    let isActive = true;

    const startBackgroundPreload = async () => {
      if (!address || !selectedNetwork) {
        console.log("[UnlockScreen] ⏭️ Skipping preload - no address/network");
        return;
      }

      console.log("[UnlockScreen] 🚀 Starting background preload...");
      setIsPreloading(true);

      try {
        await backgroundDataLoader.startPreloading(
          address,
          selectedNetwork.chainId,
        );

        if (isActive) {
          console.log("[UnlockScreen] ✅ Background preload complete");
          setIsPreloading(false);
        }
      } catch (error) {
        console.error("[UnlockScreen] ⚠️ Preload error:", error);
        if (isActive) {
          setIsPreloading(false);
        }
      }
    };

    startBackgroundPreload();

    return () => {
      isActive = false;
    };
  }, [address, selectedNetwork]);

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

  const handleBiometricUnlock = async () => {
    setIsLoading(true);
    try {
      await unlockWithBiometrics();
      navigation.reset({ index: 0, routes: [{ name: "App" }] });
      reset();
    } catch (error) {
      console.error("Biometric unlock failed:", error);
      triggerShake();
      Alert.alert(
        "Biometric Authentication Failed",
        "Please use your password to unlock the wallet.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.container}>
        <Text variant="title" color={palette.primaryBlue}>
          Unlock Wallet
        </Text>
        <Text color={palette.neutralMid}>
          Enter your password to access the BlockFinaX dashboard.
        </Text>

        {/* Background preloading indicator */}
        {isPreloading && (
          <View style={styles.preloadIndicator}>
            <ActivityIndicator size="small" color={palette.primaryBlue} />
            <Text
              variant="caption"
              color={palette.neutralMid}
              style={{ marginLeft: 8 }}
            >
              Loading your data in background...
            </Text>
          </View>
        )}

        {isBiometricAvailable && isBiometricEnabled ? (
          <Button
            label="Use Biometric Authentication"
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
                position="right"
                label="Password"
                value={value}
                onChangeText={onChange}
                secureTextEntry={secureText}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="Enter wallet password"
                error={fieldState.error ? "Password is required" : undefined}
                icon={
                  <Pressable
                    onPress={() => {
                      animateEye();
                      setSecureText((prev) => !prev);
                    }}
                  >
                    <Animated.View style={{ transform: [{ scale: eyeScale }] }}>
                      <MaterialCommunityIcons
                        name={secureText ? "eye-off-outline" : "eye-outline"}
                        size={22}
                        color={palette.neutralMid}
                      />
                    </Animated.View>
                  </Pressable>
                }
              />
            )}
          />
        </Animated.View>

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
    marginTop: 4,
  },
  biometricButton: {
    marginTop: 12,
  },
  preloadIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: palette.backgroundLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.neutralLight,
  },
});
