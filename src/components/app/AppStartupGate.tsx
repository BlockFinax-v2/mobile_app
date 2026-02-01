import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useWallet } from "@/contexts/WalletContext";
import { useTradeFinance } from "@/contexts/TradeFinanceContext";
import { palette } from "@/theme/colors";
import { preloadTreasuryPortalData } from "@/services/treasuryPortalPreload";
import { Text } from "@/components/ui/Text";

interface AppStartupGateProps {
  children: React.ReactNode;
}

export const AppStartupGate: React.FC<AppStartupGateProps> = ({ children }) => {
  const {
    isUnlocked,
    address,
    selectedNetwork,
    balances,
    displayBalances,
    getNetworkById,
  } = useWallet();
  const { preload } = useTradeFinance();
  const [isReady, setIsReady] = useState(false);
  const hasStarted = useRef(false);

  useEffect(() => {
    if (isReady || hasStarted.current) return;

    if (!isUnlocked || !address || !selectedNetwork) {
      setIsReady(true);
      return;
    }

    hasStarted.current = true;

    const runPreload = async () => {
      await Promise.allSettled([
        preload?.(),
        preloadTreasuryPortalData({
          address,
          selectedNetwork,
          getNetworkById,
          balances,
          displayBalances,
        }),
      ]);
    };

    const timeout = new Promise((resolve) => setTimeout(resolve, 8000));

    Promise.race([runPreload(), timeout]).finally(() => {
      setIsReady(true);
    });
  }, [
    isReady,
    isUnlocked,
    address,
    selectedNetwork,
    balances,
    displayBalances,
    getNetworkById,
    preload,
  ]);

  if (isReady) return <>{children}</>;

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={palette.primaryBlue} />
      <Text style={styles.text}>Preparing your dashboard...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.surface,
    gap: 12,
  },
  text: {
    color: palette.neutralDark,
    fontSize: 14,
  },
});
