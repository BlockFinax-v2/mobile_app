import { useWallet } from "@/contexts/WalletContext";
import { BiometricSetupScreen } from "@/screens/auth/BiometricSetupScreen";
import { SplashScreen as IntroSplashScreen } from "@/screens/auth/SplashScreen";
import { UnlockWalletScreen } from "@/screens/auth/UnlockWalletScreen";
import { SocialAuthScreen } from "@/screens/auth/SocialAuthScreen";
import { StackActions } from "@react-navigation/native";
import {
  createStackNavigator,
  StackNavigationProp,
} from "@react-navigation/stack";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AppNavigator } from "./AppNavigator";
import { AuthStackParamList, RootStackParamList } from "./types";
const RootStack = createStackNavigator<RootStackParamList>();
const AuthStack = createStackNavigator<AuthStackParamList>();

type SplashGateProps = {
  navigation: StackNavigationProp<RootStackParamList, "Splash">;
};

const SplashGate: React.FC<SplashGateProps> = ({ navigation }) => {
  const { isLoading, hasWallet, isUnlocked } = useWallet();
  const [animationDone, setAnimationDone] = useState(false);

  const handleCompletion = useCallback(() => {
    setAnimationDone(true);
  }, []);

  useEffect(() => {
    if (isLoading || !animationDone) {
      console.log('[SplashGate] Waiting...', { isLoading, animationDone });
      return;
    }

    console.log('[SplashGate] Navigation check:', { hasWallet, isUnlocked });

    if (!hasWallet) {
      console.log('[SplashGate] → Navigating to SocialAuth (no wallet)');
      navigation.dispatch(
        StackActions.replace("Auth", {
          screen: "SocialAuth",
        } as never)
      );
      return;
    }

    if (!isUnlocked) {
      console.log('[SplashGate] → Navigating to UnlockWallet (wallet exists, needs unlock)');
      navigation.dispatch(
        StackActions.replace("Auth", {
          screen: "UnlockWallet",
        } as never)
      );
      return;
    }

    console.log('[SplashGate] → Navigating to App (wallet unlocked)');
    navigation.dispatch(StackActions.replace("App"));
  }, [animationDone, hasWallet, isLoading, isUnlocked, navigation]);

  return <IntroSplashScreen onReady={handleCompletion} />;
};

const AuthNavigator: React.FC = () => {
  const { hasWallet } = useWallet();
  const navigatorKey = useMemo(
    () => (hasWallet ? "has-wallet" : "no-wallet"),
    [hasWallet]
  );

  return (
    <AuthStack.Navigator
      key={navigatorKey}
      screenOptions={{
        headerStyle: { backgroundColor: "#0000FF" },
        headerTintColor: "#FFFFFF",
        headerTitleStyle: { fontSize: 18, fontWeight: "600" },
      }}
      initialRouteName={hasWallet ? "UnlockWallet" : "SocialAuth"}
    >
      <AuthStack.Screen 
        name="SocialAuth" 
        component={SocialAuthScreen}
        options={{ headerShown: false }}
      />
      <AuthStack.Screen
        name="UnlockWallet"
        component={UnlockWalletScreen}
        options={{ title: "Unlock Wallet" }}
      />
    </AuthStack.Navigator>
  );
};

export const RootNavigator: React.FC = () => (
  <RootStack.Navigator screenOptions={{ headerShown: false }}>
    <RootStack.Screen name="Splash" component={SplashGate} />
    <RootStack.Screen name="Auth" component={AuthNavigator} />
    <RootStack.Screen name="App" component={AppNavigator} />
    <RootStack.Screen
      name="BiometricSetup"
      component={BiometricSetupScreen}
      options={{ title: "Setup Biometric Authentication" }}
    />
  </RootStack.Navigator>
);

export default RootNavigator;
