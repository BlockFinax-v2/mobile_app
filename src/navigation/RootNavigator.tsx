import { useWallet } from "@/contexts/WalletContext";
import { BiometricSetupScreen } from "@/screens/auth/BiometricSetupScreen";
import { CreateWalletFlowScreen } from "@/screens/auth/CreateWalletFlowScreen";
import { ImportWalletScreen } from "@/screens/auth/ImportWalletScreen";
import { SplashScreen as IntroSplashScreen } from "@/screens/auth/SplashScreen";
import { UnlockWalletScreen } from "@/screens/auth/UnlockWalletScreen";
import { WelcomeScreen } from "@/screens/auth/WelcomeScreen";
import { StackActions } from "@react-navigation/native";
import {
  createStackNavigator,
  StackNavigationProp,
  StackScreenProps,
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
      return;
    }

    if (!hasWallet) {
      navigation.dispatch(
        StackActions.replace("Auth", {
          screen: "Welcome",
        } as never)
      );
      return;
    }

    if (!isUnlocked) {
      navigation.dispatch(
        StackActions.replace("Auth", {
          screen: "UnlockWallet",
        } as never)
      );
      return;
    }

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

  type WelcomeProps = StackScreenProps<AuthStackParamList, "Welcome">;

  return (
    <AuthStack.Navigator
      key={navigatorKey}
      screenOptions={{
        headerStyle: { backgroundColor: "#0000FF" },
        headerTintColor: "#FFFFFF",
        headerTitleStyle: { fontSize: 18, fontWeight: "600" },
      }}
      initialRouteName={hasWallet ? "UnlockWallet" : "Welcome"}
    >
      <AuthStack.Screen name="Welcome" options={{ headerShown: false }}>
        {(props: WelcomeProps) => (
          <WelcomeScreen
            onCreateWallet={() => props.navigation.navigate("CreateWallet")}
            onImportWallet={() => props.navigation.navigate("ImportWallet")}
            onUnlockWallet={() => props.navigation.navigate("UnlockWallet")}
          />
        )}
      </AuthStack.Screen>
      <AuthStack.Screen
        name="CreateWallet"
        component={CreateWalletFlowScreen}
        options={{ title: "Create Wallet" }}
      />
      <AuthStack.Screen
        name="ImportWallet"
        component={ImportWalletScreen}
        options={{ title: "Import Wallet" }}
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
