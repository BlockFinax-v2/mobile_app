// CRITICAL: Import polyfills FIRST before any other imports
import "./src/polyfills";
import "react-native-gesture-handler";

import RootNavigator from "@/navigation/RootNavigator";
import { linking } from "@/navigation/linking";
import AppProviders from "@/providers/AppProviders";
import { AppStartupGate } from "@/components/app/AppStartupGate";
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const App: React.FC = () => {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProviders>
        <NavigationContainer linking={linking}>
          <StatusBar style="light" />
          <AppStartupGate>
            <RootNavigator />
          </AppStartupGate>
        </NavigationContainer>
      </AppProviders>
    </GestureHandlerRootView>
  );
};

export default App;
