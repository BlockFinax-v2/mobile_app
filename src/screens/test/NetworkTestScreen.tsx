import { ethers } from "ethers";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useWallet } from "../../contexts/WalletContext";

export default function NetworkTestScreen() {
  const { selectedNetwork, switchNetwork, balances, refreshBalance } =
    useWallet();

  const [testResults, setTestResults] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState(false);

  const testNetworkConnectivity = async (networkId: string) => {
    try {
      setTesting(true);
      const networks = {
        polygonMumbai: {
          name: "Polygon Mumbai",
          rpcUrl: "https://rpc-mumbai.maticvigil.com",
          chainId: 80001,
          nativeCurrency: { name: "MATIC", symbol: "MATIC", decimals: 18 },
          blockExplorerUrl: "https://mumbai.polygonscan.com",
          stablecoins: [
            {
              symbol: "USDC",
              name: "USD Coin",
              address: "0x2058A9D7613eEE744279e3856Ef0eAda5FCbaA7e",
              decimals: 6,
            },
            {
              symbol: "USDT",
              name: "Tether USD",
              address: "0x3813e82e6f7098b9583FC0F33a962D02018B6803",
              decimals: 6,
            },
          ],
        },
        ethereumSepolia: {
          name: "Ethereum Sepolia",
          rpcUrl:
            "https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
          chainId: 11155111,
          nativeCurrency: { name: "Sepolia ETH", symbol: "SEP", decimals: 18 },
          blockExplorerUrl: "https://sepolia.etherscan.io",
          stablecoins: [
            {
              symbol: "USDC",
              name: "USD Coin",
              address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
              decimals: 6,
            },
            {
              symbol: "USDT",
              name: "Tether USD",
              address: "0x7169D38820dfd117C3FA1f22a697dBA58d90BA06",
              decimals: 6,
            },
          ],
        },
        bscTestnet: {
          name: "BSC Testnet",
          rpcUrl: "https://data-seed-prebsc-1-s1.binance.org:8545",
          chainId: 97,
          nativeCurrency: { name: "BNB", symbol: "tBNB", decimals: 18 },
          blockExplorerUrl: "https://testnet.bscscan.com",
          stablecoins: [
            {
              symbol: "USDC",
              name: "USD Coin",
              address: "0x64544969ed7EBf5f083679233325356EbE738930",
              decimals: 6,
            },
            {
              symbol: "USDT",
              name: "Tether USD",
              address: "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd",
              decimals: 6,
            },
            {
              symbol: "BUSD",
              name: "Binance USD",
              address: "0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee",
              decimals: 18,
            },
          ],
        },
        baseSepolia: {
          name: "Base Sepolia",
          rpcUrl: "https://sepolia.base.org",
          chainId: 84532,
          nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
          blockExplorerUrl: "https://sepolia.basescan.org",
          stablecoins: [
            {
              symbol: "USDC",
              name: "USD Coin",
              address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
              decimals: 6,
            },
          ],
        },
        liskSepolia: {
          name: "Lisk Sepolia",
          rpcUrl: "https://rpc.sepolia-api.lisk.com",
          chainId: 4202,
          nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
          blockExplorerUrl: "https://sepolia-blockscout.lisk.com",
          stablecoins: [
            {
              symbol: "USDC",
              name: "USD Coin",
              address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
              decimals: 6,
            },
            {
              symbol: "USDT",
              name: "Tether USD",
              address: "0xa4153e9fD98FfAeDC91266a8b493F3cE6B9A0ea8",
              decimals: 6,
            },
          ],
        },
      };

      const network = networks[networkId as keyof typeof networks];
      if (!network) {
        throw new Error("Network not found");
      }

      const provider = new ethers.providers.JsonRpcProvider(network.rpcUrl);

      // Test basic connectivity
      const blockNumber = await provider.getBlockNumber();

      // Test chain ID
      const networkInfo = await provider.getNetwork();

      const result = `✅ Connected to ${network.name}
📦 Latest block: ${blockNumber}
🔗 Chain ID: ${networkInfo.chainId}
🌐 RPC: ${network.rpcUrl}
💰 Stablecoins: ${network.stablecoins.map((s) => s.symbol).join(", ")}`;

      setTestResults((prev) => ({ ...prev, [networkId]: result }));
    } catch (error) {
      const errorResult = `❌ Failed to connect to ${networkId}: ${
        error instanceof Error ? error.message : "Unknown error"
      }`;
      setTestResults((prev) => ({ ...prev, [networkId]: errorResult }));
    } finally {
      setTesting(false);
    }
  };

  const testAllNetworks = async () => {
    setTesting(true);
    setTestResults({});

    const networks = [
      "polygonMumbai",
      "ethereumSepolia",
      "bscTestnet",
      "baseSepolia",
      "liskSepolia",
    ];

    for (const networkId of networks) {
      await testNetworkConnectivity(networkId);
      // Small delay between tests
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    setTesting(false);
    Alert.alert("Test Complete", "All network connectivity tests finished!");
  };

  const switchToLiskSepolia = async () => {
    try {
      await switchNetwork("lisk-sepolia");
      Alert.alert("Success", "Switched to Lisk Sepolia network!");
    } catch (error) {
      Alert.alert(
        "Error",
        `Failed to switch network: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Network Configuration Test</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Network</Text>
        <Text style={styles.networkInfo}>
          {selectedNetwork.name} (Chain ID: {selectedNetwork.chainId})
        </Text>
        <Text style={styles.networkInfo}>
          Stablecoins:{" "}
          {selectedNetwork.stablecoins?.map((s) => s.symbol).join(", ") ||
            "None"}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Balances</Text>
        <Text style={styles.balanceInfo}>
          Native: {balances.primary.toFixed(4)}{" "}
          {selectedNetwork.primaryCurrency}
        </Text>
        <Text style={styles.balanceInfo}>
          USD Value: ${balances.usd.toFixed(2)}
        </Text>
        <Text style={styles.balanceInfo}>
          Tokens: {balances.tokens.length} loaded
        </Text>
        {balances.tokens.map((token, index) => (
          <Text key={index} style={styles.tokenInfo}>
            {token.symbol}: {token.balance}
          </Text>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={switchToLiskSepolia}
        >
          <Text style={styles.buttonText}>Switch to Lisk Sepolia</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={refreshBalance}
        >
          <Text style={styles.buttonText}>Refresh Balances</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Network Connectivity Tests</Text>
        <TouchableOpacity
          style={[styles.button, styles.testButton]}
          onPress={testAllNetworks}
          disabled={testing}
        >
          <Text style={styles.buttonText}>
            {testing ? "Testing..." : "Test All Networks"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Results</Text>
        {Object.entries(testResults).map(([networkId, result]) => (
          <View key={networkId} style={styles.testResult}>
            <Text style={styles.testResultText}>{result}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  section: {
    backgroundColor: "white",
    padding: 15,
    marginBottom: 15,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  networkInfo: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
  balanceInfo: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
  tokenInfo: {
    fontSize: 12,
    color: "#888",
    marginLeft: 10,
    marginBottom: 2,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: "#007AFF",
  },
  secondaryButton: {
    backgroundColor: "#34C759",
  },
  testButton: {
    backgroundColor: "#FF9500",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  testResult: {
    padding: 10,
    marginBottom: 10,
    backgroundColor: "#f9f9f9",
    borderRadius: 5,
    borderLeftWidth: 3,
    borderLeftColor: "#007AFF",
  },
  testResultText: {
    fontSize: 12,
    fontFamily: "monospace",
    color: "#333",
  },
});
