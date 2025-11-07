import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from "react-native";
import { Screen } from "@/components/ui/Screen";
import { Button } from "@/components/ui/Button";
import { useWallet } from "@/contexts/WalletContext";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

export const BalanceDebugScreen: React.FC = () => {
  const { address, balances, selectedNetwork, refreshBalance, isLoading } =
    useWallet();
  const [refreshing, setRefreshing] = useState(false);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    // Capture debug info whenever balances update
    setDebugInfo({
      timestamp: new Date().toLocaleString(),
      address,
      network: selectedNetwork,
      balances,
      isLoading,
    });
  }, [address, balances, selectedNetwork, isLoading]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshBalance();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Screen>
      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <Text style={styles.title}>🔍 Real Balance Debug</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Wallet Status</Text>
          <Text style={styles.item}>Address: {address || "Not connected"}</Text>
          <Text style={styles.item}>Network: {selectedNetwork.name}</Text>
          <Text style={styles.item}>Chain ID: {selectedNetwork.chainId}</Text>
          <Text style={styles.item}>RPC URL: {selectedNetwork.rpcUrl}</Text>
          <Text style={styles.item}>
            Is Loading: {isLoading ? "Yes" : "No"}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Native Token Balance</Text>
          <Text style={styles.item}>
            Symbol: {selectedNetwork.primaryCurrency}
          </Text>
          <Text style={styles.item}>
            Balance: {balances.primary} {selectedNetwork.primaryCurrency}
          </Text>
          <Text style={styles.item}>USD Value: ${balances.usd}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Token Balances ({balances.tokens.length})
          </Text>
          {balances.tokens.length === 0 ? (
            <Text style={styles.item}>No tokens found or still loading...</Text>
          ) : (
            balances.tokens.map((token, index) => (
              <View key={index} style={styles.tokenItem}>
                <Text style={styles.tokenSymbol}>{token.symbol}</Text>
                <Text style={styles.tokenBalance}>{token.balance}</Text>
                <Text style={styles.tokenAddress}>
                  Contract: {token.address.slice(0, 10)}...
                  {token.address.slice(-6)}
                </Text>
                {token.usdValue && (
                  <Text style={styles.tokenUsd}>USD: ${token.usdValue}</Text>
                )}
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Available Stablecoins on Network
          </Text>
          {selectedNetwork.stablecoins ? (
            selectedNetwork.stablecoins.map((coin, index) => (
              <View key={index} style={styles.stablecoinItem}>
                <Text style={styles.item}>
                  {coin.symbol} ({coin.name})
                </Text>
                <Text style={styles.stablecoinAddress}>
                  {coin.address.slice(0, 10)}...{coin.address.slice(-6)}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.item}>No stablecoins configured</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Last Update</Text>
          <Text style={styles.item}>
            {debugInfo?.timestamp || "Never updated"}
          </Text>
        </View>

        <Button
          label="🔄 Refresh Balances"
          onPress={handleRefresh}
          style={styles.refreshButton}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔍 Raw Debug Data</Text>
          <View style={styles.debugBox}>
            <Text style={styles.debugText}>
              {JSON.stringify(debugInfo, null, 2)}
            </Text>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.primary,
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  section: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  item: {
    fontSize: 14,
    color: colors.text,
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
  tokenItem: {
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.xs,
  },
  tokenSymbol: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
  },
  tokenBalance: {
    fontSize: 14,
    color: colors.text,
    fontFamily: "monospace",
  },
  tokenAddress: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: "monospace",
  },
  tokenUsd: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "500",
  },
  stablecoinItem: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.xs,
    marginBottom: spacing.xs,
  },
  stablecoinAddress: {
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: "monospace",
  },
  refreshButton: {
    marginVertical: spacing.lg,
  },
  debugBox: {
    backgroundColor: "#f5f5f5",
    padding: spacing.sm,
    borderRadius: 8,
    maxHeight: 300,
  },
  debugText: {
    fontSize: 10,
    fontFamily: "monospace",
    color: "#333",
  },
});
