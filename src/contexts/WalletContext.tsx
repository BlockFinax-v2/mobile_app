import { secureStorage } from "@/utils/secureStorage";
import { getAllTokenBalances } from "@/utils/tokenUtils";
import { priceService } from "@/services/priceService";
import { biometricService } from "@/services/biometricService";
import {
  realTransactionService,
  RealTransaction,
} from "@/services/realTransactionService";
import {
  timeAsyncOperation,
  startPerformanceTimer,
  endPerformanceTimer,
} from "@/utils/performance";
import { performanceMonitor } from "@/utils/performanceMonitor";
import { ethers } from "ethers";
import { getRandomBytes } from "expo-crypto";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Alert, AppState, AppStateStatus, Platform } from "react-native";
import { dataPreloader } from "@/utils/dataPreloader";

const MNEMONIC_KEY = "blockfinax.mnemonic";
const PRIVATE_KEY = "blockfinax.privateKey";
const PASSWORD_KEY = "blockfinax.password";
const SETTINGS_KEY = "blockfinax.settings";
const TRANSACTIONS_KEY = "blockfinax.transactions";

const AUTO_LOCK_INTERVAL = 15 * 60 * 1000; // 15 minutes

export type SupportedNetworkId =
  // Mainnets
  | "ethereum-mainnet"
  | "base-mainnet"
  | "lisk-mainnet"
  // Testnets
  | "ethereum-sepolia"
  | "base-sepolia"
  | "lisk-sepolia";

export interface WalletNetwork {
  id: SupportedNetworkId;
  name: string;
  chainId: number;
  rpcUrl: string;
  rpcFallbacks?: string[]; // Alternative RPC endpoints for reliability
  explorerUrl?: string;
  primaryCurrency: string;
  isTestnet: boolean;
  stablecoins?: Array<{
    symbol: string;
    name: string;
    address: string;
    decimals: number;
  }>;
}

const NETWORKS: Record<SupportedNetworkId, WalletNetwork> = {
  // ========== MAINNETS ==========
  "ethereum-mainnet": {
    id: "ethereum-mainnet",
    name: "Ethereum Mainnet",
    chainId: 1,
    rpcUrl: "https://eth.llamarpc.com", // Free public RPC
    rpcFallbacks: [
      "https://rpc.ankr.com/eth",
      "https://ethereum-rpc.publicnode.com",
      "https://eth-mainnet.public.blastapi.io",
    ],
    explorerUrl: "https://etherscan.io",
    primaryCurrency: "ETH",
    isTestnet: false,
    stablecoins: [
      {
        symbol: "USDC",
        name: "USD Coin",
        address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        decimals: 6,
      },
      {
        symbol: "USDT",
        name: "Tether USD",
        address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        decimals: 6,
      },
    ],
  },
  "base-mainnet": {
    id: "base-mainnet",
    name: "Base",
    chainId: 8453,
    // Use Alchemy RPC for AA support; public RPC causes getCounterFactualAddress to fail
    rpcUrl: `https://base-mainnet.g.alchemy.com/v2/${process.env.EXPO_PUBLIC_ALCHEMY_API_KEY}`,
    explorerUrl: "https://basescan.org",
    primaryCurrency: "ETH",
    isTestnet: false,
    stablecoins: [
      {
        symbol: "USDC",
        name: "USD Coin",
        address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        decimals: 6,
      },
      {
        symbol: "USDT",
        name: "Tether USD",
        address: "0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2",
        decimals: 6,
      },
    ],
  },
  "lisk-mainnet": {
    id: "lisk-mainnet",
    name: "Lisk",
    chainId: 1135,
    rpcUrl: "https://rpc.api.lisk.com",
    explorerUrl: "https://blockscout.lisk.com",
    primaryCurrency: "ETH",
    isTestnet: false,
    stablecoins: [
      {
        symbol: "USDC",
        name: "USD Coin",
        address: "0x176211869cA2b568f2A7D4EE941E073a821EE1ff",
        decimals: 6,
      },
      {
        symbol: "USDT",
        name: "Tether USD",
        address: "0x05D032ac25d322df992303dCa074EE7392C117b9",
        decimals: 6,
      },
    ],
  },

  // ========== TESTNETS ==========
  "ethereum-sepolia": {
    id: "ethereum-sepolia",
    name: "Ethereum Sepolia",
    chainId: 11155111,
    rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
    explorerUrl: "https://sepolia.etherscan.io",
    primaryCurrency: "ETH",
    isTestnet: true,
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
        address: "0x523C8591Fbe215B5aF0bEad65e65dF783A37BCBC",
        decimals: 6,
      },
    ],
  },
  "base-sepolia": {
    id: "base-sepolia",
    name: "Base Sepolia",
    chainId: 84532,
    rpcUrl: "https://sepolia.base.org",
    explorerUrl: "https://sepolia.basescan.org",
    primaryCurrency: "ETH",
    isTestnet: true,
    stablecoins: [
      {
        symbol: "USDC",
        name: "USD Coin",
        address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        decimals: 6,
      },
      // USDT removed - contract not working on Base Sepolia
    ],
  },
  "lisk-sepolia": {
    id: "lisk-sepolia",
    name: "Lisk Sepolia",
    chainId: 4202,
    rpcUrl: "https://rpc.sepolia-api.lisk.com",
    explorerUrl: "https://sepolia-blockscout.lisk.com",
    primaryCurrency: "ETH",
    isTestnet: true,
    stablecoins: [
      {
        symbol: "USDC",
        name: "USD Coin (Bridged)",
        address: "0x0E82fDDAd51cc3ac12b69761C45bBCB9A2Bf3C83",
        decimals: 6,
      },
      {
        symbol: "USDT",
        name: "Tether USD",
        address: "0xa3f3aA5B62237961AF222B211477e572149EBFAe",
        decimals: 6,
      },
    ],
  },
};

export interface WalletSettings {
  notificationsEnabled: boolean;
  preferredCurrency: string;
  displayName?: string; // User's chosen display name
  enableBiometrics: boolean; // Biometric authentication setting
}

export interface WalletBalances {
  primary: number;
  primaryUsd: number; // USD value of native token only
  usd: number; // Total USD value of all tokens
  tokens: Array<{
    symbol: string;
    balance: string;
    address: string;
    usdValue?: number;
  }>;
}

interface WalletContextValue {
  isLoading: boolean;
  isRefreshingBalance: boolean;
  isRefreshingTransactions: boolean;
  isUnlocked: boolean;
  hasWallet: boolean;
  address?: string;
  balances: WalletBalances;
  lastBalanceUpdate?: Date;
  transactions: RealTransaction[];
  isLoadingTransactions: boolean;
  lastTransactionUpdate?: Date;
  selectedNetwork: WalletNetwork;
  mainnetNetworks: WalletNetwork[];
  testnetNetworks: WalletNetwork[];
  getNetworkById: (networkId: SupportedNetworkId) => WalletNetwork;
  lastUnlockTime?: Date;
  settings: WalletSettings;
  // Biometric authentication properties
  isBiometricAvailable: boolean;
  isBiometricEnabled: boolean;
  // Smart Account (AA) properties
  smartAccountAddress?: string;
  isSmartAccountEnabled: boolean;
  isSmartAccountDeployed: boolean;
  isInitializingSmartAccount: boolean;
  createWallet: () => Promise<void>;
  importWallet: (options: {
    mnemonic?: string;
    privateKey?: string;
    password: string;
  }) => Promise<void>;
  unlockWallet: (password: string) => Promise<void>;
  unlockWithBiometrics: () => Promise<void>;
  lockWallet: () => Promise<void>;
  enableBiometricAuth: (password: string) => Promise<void>;
  disableBiometricAuth: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  forceRefreshBalance: () => Promise<void>;
  refreshBalanceInstant: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  refreshTransactionsInstant: () => Promise<void>;
  addPendingTransaction: (tx: Partial<RealTransaction>) => Promise<void>;
  switchNetwork: (networkId: SupportedNetworkId) => Promise<void>;
  switchToken: (tokenAddress?: string) => Promise<void>;
  updateSettings: (nextSettings: Partial<WalletSettings>) => Promise<void>;
  resetWalletData: () => Promise<void>;
  // Smart Account methods
  initializeSmartAccount: () => Promise<void>;
  setSmartAccountInfo: (address: string, isDeployed: boolean) => void;
  clearSmartAccountInfo: () => void;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

const defaultSettings: WalletSettings = {
  notificationsEnabled: true,
  preferredCurrency: "USD",
  displayName: undefined, // No display name by default
  enableBiometrics: false, // Biometrics disabled by default
};

export const WalletProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingBalance, setIsRefreshingBalance] = useState(false);
  const [isRefreshingTransactions, setIsRefreshingTransactions] =
    useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [hasWallet, setHasWallet] = useState(false);
  const [address, setAddress] = useState<string | undefined>();
  const [balances, setBalances] = useState<WalletBalances>({
    primary: 0,
    primaryUsd: 0,
    usd: 0,
    tokens: [],
  });
  const [lastBalanceUpdate, setLastBalanceUpdate] = useState<
    Date | undefined
  >();
  const [selectedNetwork, setSelectedNetwork] = useState<WalletNetwork>(
    NETWORKS["base-sepolia"],
  );
  const [transactions, setTransactions] = useState<RealTransaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [lastTransactionUpdate, setLastTransactionUpdate] = useState<
    Date | undefined
  >();
  const [settings, setSettings] = useState<WalletSettings>(defaultSettings);

  // Biometric authentication state
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);

  // Smart Account (AA) state
  const [smartAccountAddress, setSmartAccountAddress] = useState<
    string | undefined
  >();
  const [isSmartAccountEnabled, setIsSmartAccountEnabled] = useState(true); // Enabled by default
  const [isSmartAccountDeployed, setIsSmartAccountDeployed] = useState(false);
  const [isInitializingSmartAccount, setIsInitializingSmartAccount] =
    useState(false);

  const mainnetNetworks = useMemo(() => getMainnetNetworks(), []);
  const testnetNetworks = useMemo(() => getTestnetNetworks(), []);
  const getNetworkById = useCallback(
    (networkId: SupportedNetworkId) => NETWORKS[networkId],
    [],
  );

  const balanceRefreshRef = useRef<boolean>(false);

  const lockWallet = useCallback(async () => {
    setIsUnlocked(false);
    setAddress(undefined);
    setBalances({ primary: 0, primaryUsd: 0, usd: 0, tokens: [] });
    // Clear smart account info on lock
    setSmartAccountAddress(undefined);
    setIsSmartAccountDeployed(false);
    setIsInitializingSmartAccount(false);
  }, []);

  const persistSettings = useCallback(
    async (nextSettings: WalletSettings) => {
      setSettings(nextSettings);
      await secureStorage.setItem(SETTINGS_KEY, JSON.stringify(nextSettings));
    },
    [setSettings],
  );

  const updateSettings = useCallback(
    async (nextSettings: Partial<WalletSettings>) => {
      const merged = { ...defaultSettings, ...settings, ...nextSettings };
      await persistSettings(merged);
    },
    [persistSettings, settings],
  );

  // Helper function to fetch balance with RPC fallbacks
  const fetchBalanceWithFallbacks = useCallback(
    async (forceRefresh = false) => {
      if (!address) return null;

      const rpcEndpoints = [
        selectedNetwork.rpcUrl,
        ...(selectedNetwork.rpcFallbacks || []),
      ];
      let lastError: any = null;

      for (let i = 0; i < rpcEndpoints.length; i++) {
        try {
          const rpcUrl = rpcEndpoints[i];
          console.log(
            `💰 ${forceRefresh ? "Force" : ""} fetching balance via RPC ${
              i + 1
            }/${rpcEndpoints.length}: ${rpcUrl}`,
          );

          const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
          const balance = await provider.getBalance(address);
          const formattedString = ethers.utils.formatEther(balance);
          const formatted = parseFloat(formattedString);

          // Get token balances
          const tokens = await getAllTokenBalances(
            address,
            selectedNetwork,
            provider,
          );

          // Calculate real USD values using price service
          const primaryUsdValue = await priceService.calculateUSDValue(
            selectedNetwork.primaryCurrency,
            formatted,
            selectedNetwork,
          );

          // Calculate USD values for tokens (excluding native token to avoid double counting)
          // Native token USD value is already calculated in primaryUsdValue
          const nonNativeTokens = tokens.filter(
            (token) =>
              token.address !== "0x0000000000000000000000000000000000000000",
          );

          const tokensWithUSD = await Promise.all(
            nonNativeTokens.map(async (token) => {
              const usdValue = await priceService.calculateUSDValue(
                token.symbol,
                token.balance,
                selectedNetwork,
              );
              return {
                ...token,
                usdValue,
              };
            }),
          );

          // Calculate total USD value from stablecoins only
          const totalTokenUsdValue = tokensWithUSD.reduce(
            (sum, token) => sum + (token.usdValue || 0),
            0,
          );
          const totalUsdValue = primaryUsdValue + totalTokenUsdValue;

          console.log(`✅ ${forceRefresh ? "Force" : ""} Balance Update:`, {
            network: selectedNetwork.name,
            rpcUsed: rpcUrl,
            primary: `${formatted} ${selectedNetwork.primaryCurrency}`,
            primaryUSD: `$${primaryUsdValue.toFixed(2)}`,
            tokenCount: tokensWithUSD.length,
            totalUSD: `$${totalUsdValue.toFixed(2)}`,
          });

          return {
            primary: formatted,
            primaryUsd: primaryUsdValue,
            usd: totalUsdValue,
            tokens: tokensWithUSD,
          };
        } catch (error) {
          lastError = error;
          console.warn(`RPC ${rpcEndpoints[i]} failed:`, error);

          // If this was the last RPC to try, don't wait
          if (i < rpcEndpoints.length - 1) {
            // Wait 500ms before trying next RPC
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }
      }

      // If all RPCs failed, throw the last error
      throw new Error(
        `All RPC endpoints failed. Last error: ${lastError?.message}`,
      );
    },
    [address, selectedNetwork],
  );

  const refreshBalance = useCallback(async () => {
    const opId = performanceMonitor.startOperation("refresh_balance");

    try {
      if (!address) {
        // Only reset if no address - this is a legitimate state change
        setBalances({ primary: 0, primaryUsd: 0, usd: 0, tokens: [] });
        performanceMonitor.endOperation(opId, true);
        return;
      }

      // Check if we recently updated to avoid excessive polling
      // But allow manual refreshes and important updates
      const now = new Date();
      const timeSinceLastUpdate = lastBalanceUpdate
        ? now.getTime() - lastBalanceUpdate.getTime()
        : Infinity;

      // Adaptive throttling based on device performance
      const avgRefreshTime =
        performanceMonitor.getAverageOperationTime("refresh_balance");
      const baseThrottle = 5000; // Base 5 seconds
      const adaptiveThrottle = avgRefreshTime > 3000 ? 8000 : baseThrottle; // 8s if device is slow

      if (lastBalanceUpdate && timeSinceLastUpdate < adaptiveThrottle) {
        console.log(
          `⏰ Balance updated recently (${timeSinceLastUpdate}ms < ${adaptiveThrottle}ms), skipping refresh`,
        );
        performanceMonitor.endOperation(opId, true);
        return;
      }

      // Prevent concurrent balance refresh calls
      if (balanceRefreshRef.current) {
        console.log("🔄 Balance refresh already in progress, skipping");
        performanceMonitor.endOperation(opId, true);
        return;
      }

      // Set refreshing state WITHOUT clearing existing data
      setIsRefreshingBalance(true);
      balanceRefreshRef.current = true;

      const newBalances = await fetchBalanceWithFallbacks(false);
      if (newBalances) {
        setBalances(newBalances);
        setLastBalanceUpdate(now);
      }

      performanceMonitor.endOperation(opId, true);
    } catch (error) {
      console.warn("Failed to refresh balance", error);
      performanceMonitor.endOperation(
        opId,
        false,
        error instanceof Error ? error.message : String(error),
      );
      // Don't reset balances to zero on error, keep existing data
      // This prevents the flickering issue that creates bad UX
    } finally {
      setIsRefreshingBalance(false);
      balanceRefreshRef.current = false;
    }
  }, [address, selectedNetwork, lastBalanceUpdate, fetchBalanceWithFallbacks]);

  // Non-blocking refresh that provides instant UI feedback
  const refreshBalanceInstant = useCallback(async () => {
    console.log("⚡ Starting instant balance refresh...");

    // Immediate UI feedback - show refreshing state instantly
    setIsRefreshingBalance(true);

    // Defer heavy refresh operation
    setTimeout(async () => {
      try {
        await refreshBalance();
      } catch (error) {
        console.warn("Deferred balance refresh failed:", error);
      }
    }, 50); // Very short delay for instant UI feedback
  }, [refreshBalance]);

  // Force refresh that bypasses throttling for user actions or critical updates

  // Force refresh that bypasses throttling for user actions or critical updates
  const forceRefreshBalance = useCallback(async () => {
    if (!address) {
      setBalances({ primary: 0, primaryUsd: 0, usd: 0, tokens: [] });
      return;
    }

    // Prevent concurrent refresh calls
    if (balanceRefreshRef.current) {
      console.log("🔄 Balance refresh already in progress, skipping");
      return;
    }

    console.log("🚀 Force refreshing balance (bypassing throttle)");
    setIsRefreshingBalance(true);
    balanceRefreshRef.current = true;

    try {
      const newBalances = await fetchBalanceWithFallbacks(true);
      if (newBalances) {
        setBalances(newBalances);
        setLastBalanceUpdate(new Date());
      }
    } catch (error) {
      console.warn("Failed to force refresh balance", error);
      // Don't reset balances to zero on error - keep existing data
    } finally {
      setIsRefreshingBalance(false);
      balanceRefreshRef.current = false;
    }
  }, [address, selectedNetwork, fetchBalanceWithFallbacks]);

  const refreshTransactions = useCallback(async () => {
    if (!address) {
      // Only reset if no address - this is a legitimate state change
      setTransactions([]);
      return;
    }

    // Check if we recently updated to avoid excessive polling
    const now = new Date();
    // Increase transaction throttle for better performance
    const throttleTime = 15000; // Increased from 10000ms to 15000ms
    if (
      lastTransactionUpdate &&
      now.getTime() - lastTransactionUpdate.getTime() < throttleTime
    ) {
      console.log("⏰ Transactions updated recently, skipping refresh");
      return;
    }

    // Don't use the heavy loading state - use separate refresh state
    setIsRefreshingTransactions(true);
    try {
      console.log("🔄 Fetching REAL transaction history...");

      // Fetch transactions for both EOA and smart account addresses
      const addresses = [address];
      if (smartAccountAddress && smartAccountAddress !== address) {
        addresses.push(smartAccountAddress);
        console.log(
          `🔍 Fetching transactions for EOA (${address}) and Smart Account (${smartAccountAddress})`,
        );
      }

      // Fetch transactions for all addresses
      const allTransactions: RealTransaction[] = [];
      for (const addr of addresses) {
        const txs = await realTransactionService.getTransactionHistory(
          addr,
          selectedNetwork,
          { limit: 20 }, // Get last 20 transactions per address
        );
        allTransactions.push(...txs);
      }

      // Remove duplicates and sort by timestamp
      const uniqueTransactions = allTransactions.filter(
        (tx, index, self) =>
          index === self.findIndex((t) => t.hash === tx.hash),
      );
      uniqueTransactions.sort(
        (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
      );

      // Limit to 20 total transactions
      const limitedTransactions = uniqueTransactions.slice(0, 20);

      console.log(
        `✅ Real transactions loaded: ${limitedTransactions.length} (from ${addresses.length} address${addresses.length > 1 ? "es" : ""})`,
      );

      // Merge with existing transactions in state (which includes pending/local transactions)
      setTransactions((prevTxs) => {
        // Keep pending transactions and local transactions that aren't in the new list
        const pendingTxs = prevTxs.filter(
          (tx) =>
            tx.status === "pending" ||
            !limitedTransactions.some((newTx) => newTx.hash === tx.hash),
        );

        // Combine and remove duplicates
        const combined = [...pendingTxs, ...limitedTransactions];
        const unique = combined.filter(
          (tx, index, self) =>
            index ===
            self.findIndex((t) => t.hash === tx.hash || t.id === tx.id),
        );

        // Sort by timestamp (most recent first)
        unique.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        // Persist merged transactions to storage
        secureStorage
          .setItem(TRANSACTIONS_KEY, JSON.stringify(unique))
          .catch((error) => {
            console.error("❌ Failed to persist transactions:", error);
          });

        return unique;
      });

      setLastTransactionUpdate(now);
    } catch (error) {
      console.error("Failed to refresh transactions", error);
      // Don't clear existing transactions on error - keep what we have
      // This provides a better UX as users can still see their last known transactions
    } finally {
      setIsRefreshingTransactions(false);
    }
  }, [address, smartAccountAddress, selectedNetwork, lastTransactionUpdate]);

  // Ensure secure RNG is available before any operation that depends on it
  const ensureCryptoRNG = useCallback(() => {
    const g: any = globalThis as any;
    const crypto = g.crypto ?? {};
    if (typeof crypto.getRandomValues !== "function") {
      crypto.getRandomValues = (array: Uint8Array) => {
        if (!(array instanceof Uint8Array)) {
          throw new TypeError("Expected Uint8Array");
        }
        const bytes = getRandomBytes(array.length);
        array.set(bytes);
        return array;
      };
      g.crypto = crypto;
    }
  }, []);

  const hydrateWallet = useCallback(async () => {
    try {
      // Try to load from mnemonic first
      const mnemonic = await secureStorage.getSecureItem(MNEMONIC_KEY);

      if (mnemonic) {
        const wallet = ethers.Wallet.fromMnemonic(mnemonic);
        setAddress(wallet.address);
        setIsUnlocked(true);
        console.log(`Wallet hydrated from mnemonic: ${wallet.address}`);
        await refreshBalance();
        return true;
      }

      // If no mnemonic, try encrypted private key (for social auth/instant wallets)
      const password = await secureStorage.getSecureItem("blockfinax.password");
      if (password) {
        const privateKey = await secureStorage.getDecryptedPrivateKey(password);

        if (privateKey) {
          const wallet = new ethers.Wallet(privateKey);
          setAddress(wallet.address);
          setIsUnlocked(true);
          console.log(`Wallet hydrated from private key: ${wallet.address}`);
          await refreshBalance();
          return true;
        }
      }

      // No wallet found
      console.log(
        "No mnemonic or private key found, wallet cannot be hydrated",
      );
      setIsUnlocked(false);
      return false;
    } catch (error) {
      console.warn("Unable to hydrate wallet", error);
      setIsUnlocked(false);
      return false;
    }
  }, [refreshBalance]);

  // Non-blocking transaction refresh
  const refreshTransactionsInstant = useCallback(async () => {
    console.log("⚡ Starting instant transaction refresh...");

    // Immediate UI feedback
    setIsRefreshingTransactions(true);

    // Defer heavy refresh operation
    setTimeout(async () => {
      try {
        await refreshTransactions();
      } catch (error) {
        console.warn("Deferred transaction refresh failed:", error);
      }
    }, 50);
  }, [refreshTransactions]);

  // Add pending transaction immediately to UI (optimistic update)
  const addPendingTransaction = useCallback(
    async (tx: Partial<RealTransaction>) => {
      console.log("═══════════════════════════════════════════════");
      console.log("💫 addPendingTransaction CALLED");
      console.log("═══════════════════════════════════════════════");
      console.log("📥 Input transaction:", JSON.stringify(tx, null, 2));
      console.log("Current transactions count:", transactions.length);

      const newTransaction: RealTransaction = {
        id: tx.id || tx.hash || `pending-${Date.now()}`,
        hash: tx.hash || "",
        from: tx.from || address || "",
        to: tx.to || "",
        value: tx.value || "0",
        tokenSymbol: tx.tokenSymbol || selectedNetwork.primaryCurrency,
        tokenAddress: tx.tokenAddress,
        type: tx.type || "send",
        status: tx.status || "pending",
        timestamp: tx.timestamp || new Date(),
        blockNumber: tx.blockNumber,
        gasUsed: tx.gasUsed,
        gasPrice: tx.gasPrice,
        description:
          tx.description ||
          `${tx.type === "send" ? "Sent" : "Received"} ${tx.tokenSymbol || selectedNetwork.primaryCurrency}`,
        amount:
          tx.amount ||
          `${tx.type === "send" ? "-" : "+"}${tx.value} ${tx.tokenSymbol || selectedNetwork.primaryCurrency}`,
      };

      console.log(
        "🔧 Constructed transaction:",
        JSON.stringify(newTransaction, null, 2),
      );

      // Add to the beginning of transactions array (most recent first)
      setTransactions((prevTxs) => {
        console.log("📊 Previous transactions count:", prevTxs.length);

        // Check if transaction already exists
        const exists = prevTxs.some(
          (t) => t.hash === newTransaction.hash || t.id === newTransaction.id,
        );
        if (exists) {
          console.log("⚠️ Transaction already exists in list, skipping add");
          return prevTxs;
        }

        const newTxs = [newTransaction, ...prevTxs];
        console.log("✅ Added pending transaction to list!");
        console.log("📊 New transactions count:", newTxs.length);

        // Persist to storage
        secureStorage
          .setItem(TRANSACTIONS_KEY, JSON.stringify(newTxs))
          .then(() => {
            console.log("💾 Transactions persisted to storage");
          })
          .catch((error) => {
            console.error("❌ Failed to persist transactions:", error);
          });

        console.log("═══════════════════════════════════════════════");
        return newTxs;
      });
    },
    [address, selectedNetwork, transactions.length],
  );

  // Simple initialization function for app startup
  const initializeWalletData = useCallback(async () => {
    console.log("🚀 Initializing wallet data...");

    try {
      // Load saved network
      const savedNetworkId = await secureStorage.getItem("blockfinax.network");
      if (savedNetworkId && NETWORKS[savedNetworkId as SupportedNetworkId]) {
        setSelectedNetwork(NETWORKS[savedNetworkId as SupportedNetworkId]);
      }

      // Load saved transactions
      const savedTransactions = await secureStorage.getItem(TRANSACTIONS_KEY);
      if (savedTransactions) {
        try {
          const parsedTransactions = JSON.parse(
            savedTransactions,
          ) as RealTransaction[];
          // Convert timestamp strings back to Date objects
          const transactionsWithDates = parsedTransactions.map((tx) => ({
            ...tx,
            timestamp: new Date(tx.timestamp),
          }));
          setTransactions(transactionsWithDates);
          console.log(
            `📥 Loaded ${transactionsWithDates.length} transactions from storage`,
          );
        } catch (error) {
          console.error("❌ Failed to parse saved transactions:", error);
        }
      }

      // Check if we have a wallet (either mnemonic or encrypted private key)
      const existingMnemonic = await secureStorage.getSecureItem(MNEMONIC_KEY);
      const existingPrivateKey = await secureStorage.getSecureItem(
        "blockfinax.privateKey.encrypted",
      );

      console.log("🔍 Checking wallet existence:", {
        hasMnemonic: !!existingMnemonic,
        hasEncryptedKey: !!existingPrivateKey,
        hasWallet: Boolean(existingMnemonic || existingPrivateKey),
      });

      setHasWallet(Boolean(existingMnemonic || existingPrivateKey));

      // Initialize biometric capability and settings
      const biometricAvailable = await biometricService.isBiometricAvailable();
      setIsBiometricAvailable(biometricAvailable);

      const biometricEnabled = await biometricService.isBiometricEnabled();
      setIsBiometricEnabled(biometricEnabled);

      // Load settings and update biometric setting
      const savedSettings = await secureStorage.getItem(SETTINGS_KEY);
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings) as WalletSettings;
        // Sync biometric setting with actual biometric status
        parsedSettings.enableBiometrics = biometricEnabled;
        setSettings({ ...defaultSettings, ...parsedSettings });
      } else {
        // Set default settings with current biometric status
        const newSettings = {
          ...defaultSettings,
          enableBiometrics: biometricEnabled,
        };
        setSettings(newSettings);
        await secureStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
      }
    } catch (error) {
      console.error("❌ Failed to initialize wallet:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createWallet = useCallback(async () => {
    setIsLoading(true);
    try {
      // Make sure secure RNG exists before ethers tries to use it
      ensureCryptoRNG();
      const wallet = ethers.Wallet.createRandom();
      if (!wallet.mnemonic) {
        throw new Error("Failed to generate wallet mnemonic.");
      }

      // Prompt for password
      const password = await new Promise<string>((resolve, reject) => {
        Alert.prompt(
          "Secure Your Wallet",
          "Create a password to encrypt your wallet",
          [
            {
              text: "Cancel",
              onPress: () => reject(new Error("User cancelled")),
              style: "cancel",
            },
            {
              text: "Create",
              onPress: (pwd?: string) => {
                if (pwd && pwd.length >= 8) {
                  resolve(pwd);
                } else {
                  Alert.alert(
                    "Error",
                    "Password must be at least 8 characters",
                  );
                  reject(new Error("Password too short"));
                }
              },
            },
          ],
          "secure-text",
        );
      });

      // Store encrypted private key and mnemonic
      await secureStorage.setSecureItem(MNEMONIC_KEY, wallet.mnemonic.phrase);
      await secureStorage.setEncryptedPrivateKey(wallet.privateKey, password);
      await secureStorage.setSecureItem(PASSWORD_KEY, password);

      setHasWallet(true);
      setAddress(wallet.address);
      setIsUnlocked(true);
      await refreshBalance();

      // Prompt to enable biometrics
      if (isBiometricAvailable) {
        Alert.alert(
          "Enable Biometric Authentication?",
          `Use ${Platform.OS === "ios" ? "Face ID/Touch ID" : "fingerprint"} to unlock your wallet and sign transactions securely.`,
          [
            { text: "Skip", style: "cancel" },
            {
              text: "Enable",
              onPress: async () => {
                try {
                  await biometricService.enableBiometricAuth(password);
                  setIsBiometricEnabled(true);
                  const newSettings = { ...settings, enableBiometrics: true };
                  setSettings(newSettings);
                  await secureStorage.setItem(
                    SETTINGS_KEY,
                    JSON.stringify(newSettings),
                  );
                  Alert.alert("Success", "Biometric authentication enabled!");
                } catch (error) {
                  console.error("Failed to enable biometrics:", error);
                  Alert.alert(
                    "Error",
                    "Failed to enable biometric authentication",
                  );
                }
              },
            },
          ],
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [refreshBalance, ensureCryptoRNG, isBiometricAvailable, settings]);

  const importWallet = useCallback(
    async ({
      mnemonic,
      privateKey,
      password,
    }: {
      mnemonic?: string;
      privateKey?: string;
      password: string;
    }) => {
      if (!mnemonic && !privateKey) {
        throw new Error("Provide a mnemonic phrase or private key to import.");
      }

      setIsLoading(true);
      try {
        let wallet: ethers.Wallet;
        if (mnemonic) {
          const hdWallet = ethers.Wallet.fromMnemonic(mnemonic.trim());
          wallet = new ethers.Wallet(hdWallet.privateKey);
          if (!hdWallet.mnemonic) {
            throw new Error("Unable to read mnemonic from wallet.");
          }
          await secureStorage.setSecureItem(
            MNEMONIC_KEY,
            hdWallet.mnemonic.phrase,
          );
        } else if (privateKey) {
          wallet = new ethers.Wallet(privateKey.trim());
        } else {
          throw new Error("Invalid wallet import payload.");
        }

        // Store encrypted private key
        await secureStorage.setEncryptedPrivateKey(wallet.privateKey, password);
        await secureStorage.setSecureItem(PASSWORD_KEY, password);

        setHasWallet(true);
        setAddress(wallet.address);
        setIsUnlocked(true);
        await refreshBalance();

        // Prompt to enable biometrics
        if (isBiometricAvailable) {
          Alert.alert(
            "Enable Biometric Authentication?",
            `Use ${Platform.OS === "ios" ? "Face ID/Touch ID" : "fingerprint"} to unlock your wallet and sign transactions securely.`,
            [
              { text: "Skip", style: "cancel" },
              {
                text: "Enable",
                onPress: async () => {
                  try {
                    await biometricService.enableBiometricAuth(password);
                    setIsBiometricEnabled(true);
                    const newSettings = { ...settings, enableBiometrics: true };
                    setSettings(newSettings);
                    await secureStorage.setItem(
                      SETTINGS_KEY,
                      JSON.stringify(newSettings),
                    );
                    Alert.alert("Success", "Biometric authentication enabled!");
                  } catch (error) {
                    console.error("Failed to enable biometrics:", error);
                    Alert.alert(
                      "Error",
                      "Failed to enable biometric authentication",
                    );
                  }
                },
              },
            ],
          );
        }
      } finally {
        setIsLoading(false);
      }
    },
    [refreshBalance, isBiometricAvailable, settings],
  );

  const unlockWallet = useCallback(
    async (password: string) => {
      console.log("[WalletContext] 🔓 Unlock wallet attempt");

      const savedPassword = await secureStorage.getSecureItem(PASSWORD_KEY);

      console.log("[WalletContext] Password check:", {
        hasSavedPassword: !!savedPassword,
        passwordsMatch: savedPassword === password,
      });

      if (savedPassword && savedPassword !== password) {
        console.error("[WalletContext] ❌ Password mismatch");
        throw new Error("Invalid password provided.");
      }

      console.log("[WalletContext] 💧 Hydrating wallet...");
      await hydrateWallet();

      console.log("[WalletContext] ✅ Wallet unlocked, loading data...");
      // Load data after unlock
      forceRefreshBalance();
      refreshTransactions();

      // 🚀 Preload all app data immediately after unlock
      if (address && selectedNetwork.chainId) {
        console.log("[WalletContext] Triggering data preload after unlock");
        dataPreloader
          .preloadAll(address, selectedNetwork.chainId)
          .catch((error) => {
            console.error("[WalletContext] Preload failed:", error);
          });
      }
    },
    [
      hydrateWallet,
      forceRefreshBalance,
      refreshTransactions,
      address,
      selectedNetwork.chainId,
    ],
  );

  const unlockWithBiometrics = useCallback(async () => {
    try {
      const password = await biometricService.unlockWithBiometrics();
      await unlockWallet(password);
    } catch (error) {
      console.error("Biometric unlock failed:", error);
      throw error;
    }
  }, [unlockWallet]);

  const enableBiometricAuth = useCallback(
    async (password: string) => {
      try {
        await biometricService.enableBiometricAuth(password);
        setIsBiometricEnabled(true);

        // Update settings
        const newSettings = { ...settings, enableBiometrics: true };
        setSettings(newSettings);
        await secureStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
      } catch (error) {
        console.error("Failed to enable biometric authentication:", error);
        throw error;
      }
    },
    [settings],
  );

  const disableBiometricAuth = useCallback(async () => {
    try {
      await biometricService.disableBiometricAuth();
      setIsBiometricEnabled(false);

      // Update settings
      const newSettings = { ...settings, enableBiometrics: false };
      setSettings(newSettings);
      await secureStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
    } catch (error) {
      console.error("Failed to disable biometric authentication:", error);
      throw error;
    }
  }, [settings]);

  const switchNetwork = useCallback(
    async (networkId: SupportedNetworkId) => {
      return timeAsyncOperation(
        "switchNetwork",
        async () => {
          console.log("🔄 Switching network to:", networkId);

          const next = NETWORKS[networkId];

          // INSTANT UI updates first - no async operations
          setSelectedNetwork(next);
          setIsRefreshingBalance(true);
          setIsRefreshingTransactions(true);

          console.log("✅ Network UI updated instantly:", next.name);

          // Defer heavy operations for better responsiveness
          setTimeout(async () => {
            try {
              // Save network preference in background
              await secureStorage.setItem("blockfinax.network", networkId);

              // If wallet is unlocked, refresh data in background
              if (isUnlocked) {
                await Promise.all([
                  forceRefreshBalance(),
                  refreshTransactions(),
                ]);

                console.log("✅ Network data refreshed:", next.name);
              }
            } catch (error) {
              console.error("❌ Background network switch failed:", error);
            } finally {
              setIsRefreshingBalance(false);
              setIsRefreshingTransactions(false);
            }
          }, 100); // Short delay for instant UI feedback
        },
        3000,
      );
    },
    [isUnlocked, forceRefreshBalance, refreshTransactions],
  );

  const switchToken = useCallback(
    async (tokenAddress?: string) => {
      console.log("🪙 Switching token to:", tokenAddress || "Native");

      if (!isUnlocked) {
        console.warn("Wallet not unlocked, cannot switch token");
        return;
      }

      try {
        setIsRefreshingBalance(true);

        // TODO: Add selectedTokenAddress state if needed
        // setSelectedTokenAddress(tokenAddress);

        // Force immediate balance refresh for new token
        await forceRefreshBalance();

        console.log("✅ Token switched and balance refreshed");
      } catch (error) {
        console.error("❌ Failed to switch token:", error);
        throw error;
      } finally {
        setIsRefreshingBalance(false);
      }
    },
    [isUnlocked, forceRefreshBalance],
  );

  const resetWalletData = useCallback(async () => {
    setIsLoading(true);
    try {
      await secureStorage.clearWalletData();
      // Clear biometric data
      await biometricService.clearBiometricData();

      setIsUnlocked(false);
      setHasWallet(false);
      setAddress(undefined);
      setBalances({ primary: 0, primaryUsd: 0, usd: 0, tokens: [] });
      setSelectedNetwork(NETWORKS["base-sepolia"]);
      setSettings({ ...defaultSettings });
      setIsBiometricEnabled(false);
      // Clear smart account info
      setSmartAccountAddress(undefined);
      setIsSmartAccountDeployed(false);
      setIsInitializingSmartAccount(false);
    } catch (error) {
      console.error("Failed to reset wallet data", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Initialize smart account for the current EOA
   * This is called automatically after wallet unlock
   */
  const initializeSmartAccount = useCallback(async () => {
    // This will be called by AlchemySmartAccountContext
    // We just expose this method for manual initialization if needed
    console.log("[WalletContext] Smart account initialization requested");
    setIsInitializingSmartAccount(true);
    // The actual initialization happens in AlchemySmartAccountContext
    // which will call setSmartAccountInfo when ready
  }, []);

  /**
   * Set smart account information from AlchemySmartAccountContext
   */
  const setSmartAccountInfo = useCallback(
    (address: string, isDeployed: boolean) => {
      console.log("[WalletContext] Setting smart account info:", {
        address,
        isDeployed,
      });
      setSmartAccountAddress(address);
      setIsSmartAccountDeployed(isDeployed);
      setIsInitializingSmartAccount(false);
    },
    [],
  );

  /**
   * Clear smart account information
   */
  const clearSmartAccountInfo = useCallback(() => {
    console.log("[WalletContext] Clearing smart account info");
    setSmartAccountAddress(undefined);
    setIsSmartAccountDeployed(false);
    setIsInitializingSmartAccount(false);
  }, []);

  // Initialize wallet data on app start
  useEffect(() => {
    initializeWalletData();
  }, [initializeWalletData]);

  // Memoize stable network helpers separately for better performance
  const networkHelpers = useMemo(
    () => ({
      mainnetNetworks,
      testnetNetworks,
      getNetworkById,
    }),
    [mainnetNetworks, testnetNetworks, getNetworkById],
  );

  // Memoize functions separately to avoid unnecessary re-renders
  const walletActions = useMemo(
    () => ({
      createWallet,
      importWallet,
      unlockWallet,
      unlockWithBiometrics,
      lockWallet,
      enableBiometricAuth,
      disableBiometricAuth,
      refreshBalance,
      forceRefreshBalance,
      refreshBalanceInstant,
      refreshTransactions,
      refreshTransactionsInstant,
      addPendingTransaction,
      switchNetwork,
      switchToken,
      updateSettings,
      resetWalletData,
      initializeSmartAccount,
      setSmartAccountInfo,
      clearSmartAccountInfo,
    }),
    [
      createWallet,
      importWallet,
      unlockWallet,
      unlockWithBiometrics,
      lockWallet,
      enableBiometricAuth,
      disableBiometricAuth,
      refreshBalance,
      forceRefreshBalance,
      refreshBalanceInstant,
      refreshTransactions,
      refreshTransactionsInstant,
      addPendingTransaction,
      switchNetwork,
      switchToken,
      updateSettings,
      resetWalletData,
      initializeSmartAccount,
      setSmartAccountInfo,
      clearSmartAccountInfo,
    ],
  );

  const value = useMemo<WalletContextValue>(
    () => ({
      isLoading,
      isRefreshingBalance,
      isRefreshingTransactions,
      isUnlocked,
      hasWallet,
      address,
      balances,
      lastBalanceUpdate,
      transactions,
      isLoadingTransactions,
      lastTransactionUpdate,
      selectedNetwork,
      settings,
      isBiometricAvailable,
      isBiometricEnabled,
      // Smart Account fields
      smartAccountAddress,
      isSmartAccountEnabled,
      isSmartAccountDeployed,
      isInitializingSmartAccount,
      // Spread optimized objects
      ...networkHelpers,
      ...walletActions,
    }),
    [
      // Only frequently changing state
      isLoading,
      isRefreshingBalance,
      isRefreshingTransactions,
      isUnlocked,
      hasWallet,
      address,
      balances,
      lastBalanceUpdate,
      transactions,
      isLoadingTransactions,
      lastTransactionUpdate,
      selectedNetwork,
      settings,
      isBiometricAvailable,
      isBiometricEnabled,
      smartAccountAddress,
      isSmartAccountEnabled,
      isSmartAccountDeployed,
      isInitializingSmartAccount,
      // Pre-memoized stable objects
      networkHelpers,
      walletActions,
    ],
  );

  // Log performance summary on unmount for debugging
  useEffect(() => {
    return () => {
      performanceMonitor.logPerformanceSummary();
    };
  }, []);

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
};

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWallet must be used within WalletProvider");
  }
  return ctx;
}

export function getNetworks() {
  return Object.values(NETWORKS);
}

export function getMainnetNetworks() {
  return Object.values(NETWORKS).filter((network) => !network.isTestnet);
}

export function getTestnetNetworks() {
  return Object.values(NETWORKS).filter((network) => network.isTestnet);
}

export function getStablecoinsForNetwork(networkId: SupportedNetworkId) {
  return NETWORKS[networkId]?.stablecoins || [];
}

export function getStablecoinBySymbol(
  networkId: SupportedNetworkId,
  symbol: string,
) {
  const network = NETWORKS[networkId];
  return network?.stablecoins?.find((coin) => coin.symbol === symbol);
}

export function getAllSupportedTokens(networkId: SupportedNetworkId) {
  const network = NETWORKS[networkId];

  // Return empty array if network not found
  if (!network) {
    return [];
  }

  const tokens = [
    {
      symbol: network.primaryCurrency,
      name: network.primaryCurrency,
      address: "0x0000000000000000000000000000000000000000", // Native token
      decimals: 18,
    },
  ];

  if (network.stablecoins) {
    tokens.push(...network.stablecoins);
  }

  return tokens;
}
