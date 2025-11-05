import { CreateWalletFlowScreen } from "@/screens/auth/CreateWalletFlowScreen";
import { ImportWalletScreen } from "@/screens/auth/ImportWalletScreen";
import { UnlockWalletScreen } from "@/screens/auth/UnlockWalletScreen";
import { WelcomeScreen } from "@/screens/auth/WelcomeScreen";
import { palette } from "@/theme/colors";
import {
  createStackNavigator,
  StackScreenProps,
} from "@react-navigation/stack";
import React from "react";
import { AuthStackParamList } from "./types";

const Stack = createStackNavigator<AuthStackParamList>();

export const AuthNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        headerShown: false,
        presentation: "card",
        cardStyle: { backgroundColor: palette.surface },
      }}
    >
      <Stack.Screen
        name="Welcome"
        component={WelcomeScreenWrapper}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateWallet"
        component={CreateWalletFlowScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ImportWallet"
        component={ImportWalletScreen}
        options={{ headerTitle: "Import Wallet" }}
      />
      <Stack.Screen
        name="UnlockWallet"
        component={UnlockWalletScreen}
        options={{ headerTitle: "Unlock Wallet" }}
      />
    </Stack.Navigator>
  );
};

type WelcomeProps = StackScreenProps<AuthStackParamList, "Welcome">;

const WelcomeScreenWrapper: React.FC<WelcomeProps> = ({ navigation }) => {
  return (
    <WelcomeScreen
      onCreateWallet={() => navigation.navigate("CreateWallet")}
      onImportWallet={() => navigation.navigate("ImportWallet")}
      onUnlockWallet={() => navigation.navigate("UnlockWallet")}
    />
  );
};
