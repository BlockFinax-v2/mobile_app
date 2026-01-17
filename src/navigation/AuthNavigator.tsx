import { UnlockWalletScreen } from "@/screens/auth/UnlockWalletScreen";
import { SocialAuthScreen } from "@/screens/auth/SocialAuthScreen";
import { palette } from "@/theme/colors";
import { createStackNavigator } from "@react-navigation/stack";
import React from "react";
import { AuthStackParamList } from "./types";

const Stack = createStackNavigator<AuthStackParamList>();

export const AuthNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="SocialAuth"
      screenOptions={{
        headerShown: false,
        presentation: "card",
        cardStyle: { backgroundColor: palette.surface },
      }}
    >
      <Stack.Screen
        name="SocialAuth"
        component={SocialAuthScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="UnlockWallet"
        component={UnlockWalletScreen}
        options={{ headerTitle: "Unlock Wallet" }}
      />
    </Stack.Navigator>
  );
};
