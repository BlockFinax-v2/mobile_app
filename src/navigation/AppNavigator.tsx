import { DocumentCenterScreen } from "@/screens/contracts/DocumentCenterScreen";
import DashboardHomeScreen from "@/screens/dashboard/DashboardHomeScreen";
import { TransactionDetailsScreen } from "@/screens/dashboard/TransactionDetailsScreen";
import { CreateInvoiceScreen } from "@/screens/invoices";
import { ChatScreen } from "@/screens/messages/ChatScreen";
import { MessagesHomeScreen } from "@/screens/messages/MessagesHomeScreen";
import { DialerScreen } from "@/screens/messages/DialerScreen";
import { ContactSelector } from "@/screens/messages/ContactSelector";
import IncomingCallScreen from "@/screens/IncomingCallScreen";
import ActiveCallScreen from "@/screens/ActiveCallScreen";
import { DebugScreen } from "@/screens/profile/DebugScreen";
import { NetworkConfigScreen } from "@/screens/profile/NetworkConfigScreen";
import { ProfileHomeScreen } from "@/screens/profile/ProfileHomeScreen";
import { SettingsScreen } from "@/screens/profile/SettingsScreen";
import { RewardsHomeScreen } from "@/screens/rewards/RewardsHomeScreen";
import { TradeFinanceScreen } from "@/screens/trade/TradeFinanceScreen";
import { TreasuryPortalScreen } from "@/screens/treasury/TreasuryPortalScreen";
import { ReceivePaymentScreen } from "@/screens/wallet/ReceivePaymentScreen";
import { SendPaymentReviewScreen } from "@/screens/wallet/SendPaymentReviewScreen";
import { SendPaymentScreen } from "@/screens/wallet/SendPaymentScreenNew";
// Trade Finance Payment Components
import { TradeFinancePayment } from "@/screens/trade/TradeFinancePayment";
import { TreasuryPayment } from "@/screens/treasury/TreasuryPayment";
import { palette } from "@/theme/colors";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import {
  createStackNavigator,
  StackNavigationOptions,
} from "@react-navigation/stack";
import React from "react";
import { StyleSheet, View } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import {
  AppTabParamList,
  MessagesStackParamList,
  TradeStackParamList,
  WalletStackParamList,
} from "./types";

const stackScreenOptions: StackNavigationOptions = {
  headerShown: false, // Remove all headers to make everything scroll together
  presentation: "card",
};

const WalletStack = createStackNavigator<WalletStackParamList>();
const MessagesStack = createStackNavigator<MessagesStackParamList>();
const TradeStack = createStackNavigator<TradeStackParamList>();
const Tab = createBottomTabNavigator<AppTabParamList>();

// Merged Wallet (Dashboard + Wallet combined)
const WalletNavigator = () => (
  <WalletStack.Navigator screenOptions={stackScreenOptions}>
    <WalletStack.Screen
      name="WalletHome"
      component={DashboardHomeScreen}
      options={{ headerShown: false }}
    />
    <WalletStack.Screen
      name="SendPayment"
      component={SendPaymentScreen}
      options={{
        headerShown: true,
        title: "Send Payment",
        headerStyle: { backgroundColor: palette.primaryBlue },
        headerTintColor: palette.white,
        headerTitleStyle: { fontSize: 18, fontWeight: "600" },
      }}
    />
    <WalletStack.Screen
      name="SendPaymentReview"
      component={SendPaymentReviewScreen}
      options={{
        headerShown: true,
        title: "Review & Confirm",
        headerStyle: { backgroundColor: palette.primaryBlue },
        headerTintColor: palette.white,
        headerTitleStyle: { fontSize: 18, fontWeight: "600" },
      }}
    />
    <WalletStack.Screen
      name="ReceivePayment"
      component={ReceivePaymentScreen}
      options={{
        headerShown: true,
        title: "Receive Payment",
        headerStyle: { backgroundColor: palette.primaryBlue },
        headerTintColor: palette.white,
        headerTitleStyle: { fontSize: 18, fontWeight: "600" },
      }}
    />
    <WalletStack.Screen
      name="TransactionDetails"
      component={TransactionDetailsScreen}
      options={{
        headerShown: true,
        title: "Transaction Details",
        headerStyle: { backgroundColor: palette.primaryBlue },
        headerTintColor: palette.white,
        headerTitleStyle: { fontSize: 18, fontWeight: "600" },
      }}
    />
    <WalletStack.Screen
      name="CreateInvoice"
      component={CreateInvoiceScreen}
      options={{
        headerShown: true,
        title: "Create Invoice",
        headerStyle: { backgroundColor: palette.primaryBlue },
        headerTintColor: palette.white,
        headerTitleStyle: { fontSize: 18, fontWeight: "600" },
      }}
    />

    <WalletStack.Screen
      name="DocumentCenter"
      component={DocumentCenterScreen}
      options={{
        headerShown: true,
        title: "Document Center",
        headerStyle: { backgroundColor: palette.primaryBlue },
        headerTintColor: palette.white,
        headerTitleStyle: { fontSize: 18, fontWeight: "600" },
      }}
    />
    <WalletStack.Screen
      name="TreasuryPortal"
      component={TreasuryPortalScreen}
      options={{
        headerShown: true,
        title: "Treasury Portal",
        headerStyle: { backgroundColor: palette.primaryBlue },
        headerTintColor: palette.white,
        headerTitleStyle: { fontSize: 18, fontWeight: "600" },
      }}
    />
    <WalletStack.Screen
      name="Rewards"
      component={RewardsHomeScreen}
      options={{
        headerShown: true,
        title: "Rewards & Referrals",
        headerStyle: { backgroundColor: palette.primaryBlue },
        headerTintColor: palette.white,
        headerTitleStyle: { fontSize: 18, fontWeight: "600" },
      }}
    />
    <WalletStack.Screen
      name="ProfileHome"
      component={ProfileHomeScreen}
      options={{
        headerShown: true,
        title: "Profile",
        headerStyle: { backgroundColor: palette.primaryBlue },
        headerTintColor: palette.white,
        headerTitleStyle: { fontSize: 18, fontWeight: "600" },
      }}
    />
    <WalletStack.Screen
      name="Settings"
      component={SettingsScreen}
      options={{
        headerShown: true,
        title: "Settings",
        headerStyle: { backgroundColor: palette.primaryBlue },
        headerTintColor: palette.white,
        headerTitleStyle: { fontSize: 18, fontWeight: "600" },
      }}
    />
    <WalletStack.Screen
      name="NetworkConfig"
      component={NetworkConfigScreen}
      options={{
        headerShown: true,
        title: "Network Configuration",
        headerStyle: { backgroundColor: palette.primaryBlue },
        headerTintColor: palette.white,
        headerTitleStyle: { fontSize: 18, fontWeight: "600" },
      }}
    />
    <WalletStack.Screen
      name="Debug"
      component={DebugScreen}
      options={{
        headerShown: true,
        title: "Debug Tools",
        headerStyle: { backgroundColor: palette.primaryBlue },
        headerTintColor: palette.white,
        headerTitleStyle: { fontSize: 18, fontWeight: "600" },
      }}
    />
    <WalletStack.Screen
      name="TreasuryPayment"
      component={TreasuryPayment}
      options={{
        headerShown: true,
        title: "Treasury Payment",
        headerStyle: { backgroundColor: palette.primaryBlue },
        headerTintColor: palette.white,
        headerTitleStyle: { fontSize: 18, fontWeight: "600" },
      }}
    />
  </WalletStack.Navigator>
);

const MessagesNavigator = () => (
  <MessagesStack.Navigator screenOptions={stackScreenOptions}>
    <MessagesStack.Screen
      name="MessagesHome"
      component={MessagesHomeScreen}
      options={{ title: "BlockFinaX Chat" }}
    />
    <MessagesStack.Screen
      name="Chat"
      component={ChatScreen}
      options={{ title: "Chat" }}
    />
    <MessagesStack.Screen
      name="Dialer"
      component={DialerScreen}
      options={{
        headerShown: true,
        title: "Dialer",
        headerStyle: { backgroundColor: palette.primaryBlue },
        headerTintColor: palette.white,
        headerTitleStyle: { fontSize: 18, fontWeight: "600" },
      }}
    />
    <MessagesStack.Screen
      name="ContactSelector"
      component={ContactSelector}
      options={{
        headerShown: true,
        title: "Select Contact",
        headerStyle: { backgroundColor: palette.primaryBlue },
        headerTintColor: palette.white,
        headerTitleStyle: { fontSize: 18, fontWeight: "600" },
      }}
    />
    <MessagesStack.Screen
      name="IncomingCallScreen"
      component={IncomingCallScreen}
      options={{
        headerShown: false,
        presentation: "modal",
        gestureEnabled: false,
      }}
    />
    <MessagesStack.Screen
      name="ActiveCallScreen"
      component={ActiveCallScreen}
      options={{
        headerShown: false,
        presentation: "modal",
        gestureEnabled: false,
      }}
    />
  </MessagesStack.Navigator>
);

const TradeNavigator = () => (
  <TradeStack.Navigator screenOptions={stackScreenOptions}>
    <TradeStack.Screen
      name="TradeHome"
      component={TradeFinanceScreen}
      options={{ title: "Trade Finance Portal" }}
    />
    <TradeStack.Screen
      name="TradeFinance"
      component={TradeFinanceScreen}
      options={{
        headerShown: true,
        title: "Trade Finance",
        headerStyle: { backgroundColor: palette.primaryBlue },
        headerTintColor: palette.white,
        headerTitleStyle: { fontSize: 18, fontWeight: "600" },
      }}
    />
    <TradeStack.Screen
      name="TradeFinancePayment"
      component={TradeFinancePayment}
      options={{
        headerShown: true,
        title: "Trade Finance Payment",
        headerStyle: { backgroundColor: palette.primaryBlue },
        headerTintColor: palette.white,
        headerTitleStyle: { fontSize: 18, fontWeight: "600" },
      }}
    />
  </TradeStack.Navigator>
);

const TabBarIcon: React.FC<{
  name: string;
  color: string;
  focused: boolean;
}> = ({ name, color, focused }) => (
  <View style={styles.iconWrapper}>
    <MaterialCommunityIcons name={name} color={color} size={26} />
  </View>
);

export const AppNavigator = () => (
  <Tab.Navigator
    initialRouteName="WalletTab"
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: palette.primaryBlue,
      tabBarInactiveTintColor: palette.neutralLight,
      tabBarStyle: styles.tabBar,
      tabBarLabelStyle: styles.tabLabel,
      tabBarIcon: ({ color, focused }) => {
        const iconMap: Record<keyof AppTabParamList, string> = {
          WalletTab: "wallet",
          ChatTab: "chat",
          TradeTab: "trending-up",
        };
        return (
          <TabBarIcon
            name={iconMap[route.name as keyof AppTabParamList]}
            color={color}
            focused={focused}
          />
        );
      },
    })}
  >
    <Tab.Screen
      name="WalletTab"
      component={WalletNavigator}
      options={{ title: "Wallet" }}
    />
    <Tab.Screen
      name="ChatTab"
      component={MessagesNavigator}
      options={{ title: "Chat" }}
    />
    <Tab.Screen
      name="TradeTab"
      component={TradeNavigator}
      options={{ title: "Trade Finance" }}
    />
  </Tab.Navigator>
);

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: palette.white,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    height: 60,
    paddingBottom: 5,
    paddingTop: 5,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: -5,
  },
  iconWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  // Removed underline indicator — active tab is indicated by icon color only
});
