import { secureStorage } from "@/utils/secureStorage";
import { getAllTokenBalances } from "@/utils/tokenUtils";
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
import { Alert, AppState, AppStateStatus } from "react-native";

const MNEMONIC_KEY = "blockfinax.mnemonic";
const PRIVATE_KEY = "blockfinax.privateKey";
const PASSWORD_KEY = "blockfinax.password";
const LAST_UNLOCK_KEY = "blockfinax.lastUnlock";
const SETTINGS_KEY = "blockfinax.settings";
const WALLET_PERSISTENT_KEY = "blockfinax.wallet_persistent";
const BIOMETRIC_ENABLED_KEY = "blockfinax.biometric_enabled";
const BIOMETRIC_HASH_KEY = "blockfinax.biometric_hash";

const AUTO_LOCK_INTERVAL = 15 * 60 * 1000; // 15 minutes

export type SupportedNetworkId =
  | "polygon-mumbai"
  | "ethereum-sepolia"
  | "bsc-testnet"
  | "base-sepolia"
  | "lisk-sepolia";

export interface WalletNetwork {
  id: SupportedNetworkId;
  name: string;
  chainId: number;
  rpcUrl: string;
  explorerUrl?: string;
  primaryCurrency: string;
  stablecoins?: Array<{
    symbol: string;
    name: string;
    address: string;
    decimals: number;
  }>;
}

const NETWORKS: Record<SupportedNetworkId, WalletNetwork> = {
  "polygon-mumbai": {
    id: "polygon-mumbai",
    name: "Polygon Mumbai Testnet",
    chainId: 80001,
    rpcUrl: "https://polygon-mumbai-bor.publicnode.com",
    explorerUrl: "https://mumbai.polygonscan.com",
    primaryCurrency: "MATIC",
    stablecoins: [
      {
        symbol: "USDC",
        name: "USD Coin",
        address: "0x0FA8781a83E46826621b3BC094Ea2A0212e71B23",
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
  "ethereum-sepolia": {
    id: "ethereum-sepolia",
    name: "Ethereum Sepolia",
    chainId: 11155111,
    rpcUrl: "https://sepolia.infura.io/v3/",
    explorerUrl: "https://sepolia.etherscan.io",
    primaryCurrency: "ETH",
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
  "bsc-testnet": {
    id: "bsc-testnet",
    name: "Binance Smart Chain Testnet",
    chainId: 97,
    rpcUrl: "https://rpc.ankr.com/bsc_testnet_chapel",
    explorerUrl: "https://testnet.bscscan.com",
    primaryCurrency: "BNB",
    stablecoins: [
      {
        symbol: "USDC",
        name: "USD Coin",
        address: "0x64544969ed7EBf5f083679233325356EbE738930",
        decimals: 18,
      },
      {
        symbol: "USDT",
        name: "Tether USD",
        address: "0x337610d27c682E347C9cD60BD4b3b107C9d34dDd",
        decimals: 18,
      },
      {
        symbol: "BUSD",
        name: "Binance USD",
        address: "0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee",
        decimals: 18,
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
        address: "0xf175520C52418dfE19C8098071a252da48Cd1C19",
        decimals: 6,
      },
    ],
  },
  "lisk-sepolia": {
    id: "lisk-sepolia",
    name: "Lisk Sepolia Testnet",
    chainId: 4202,
    rpcUrl: "https://rpc.sepolia-api.lisk.com",
    explorerUrl: "https://sepolia-blockscout.lisk.com",
    primaryCurrency: "ETH",
    stablecoins: [
      {
        symbol: "USDC",
        name: "USD Coin",
        address: "0x9fBE3EB2fE0E2E4DBa88de87Ebc7F1A0E75B8b33",
        decimals: 6,
      },
      {
        symbol: "USDT",
        name: "Tether USD",
        address: "0x2E8b7c5D36F4b44b20f9FBF4A7B7c4E6b8A3b7F2",
        decimals: 6,
      },
    ],
  },
};

export interface WalletSettings {
  enableBiometrics: boolean;
  notificationsEnabled: boolean;
  preferredCurrency: string;
  persistWallet: boolean;
}

export interface WalletBalances {
  primary: number;
  usd: number;
  tokens: Array<{
    symbol: string;
    balance: string;
    address: string;
    usdValue?: number;
  }>;
}

interface WalletContextValue {
  isLoading: boolean;
  isUnlocked: boolean;
  hasWallet: boolean;
  address?: string;
  balances: WalletBalances;
  selectedNetwork: WalletNetwork;
  lastUnlockTime?: Date;
  settings: WalletSettings;
  isBiometricAvailable: boolean;
  createWallet: () => Promise<void>;
  importWallet: (options: {
    mnemonic?: string;
    privateKey?: string;
    password: string;
  }) => Promise<void>;
  unlockWallet: (password: string) => Promise<void>;
  unlockWithBiometrics: () => Promise<void>;
  lockWallet: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  switchNetwork: (networkId: SupportedNetworkId) => Promise<void>;
  updateSettings: (nextSettings: Partial<WalletSettings>) => Promise<void>;
  enableBiometricAuth: (password: string) => Promise<void>;
  disableBiometricAuth: () => Promise<void>;
  resetWalletData: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

const defaultSettings: WalletSettings = {
  enableBiometrics: false,
  notificationsEnabled: true,
  preferredCurrency: "USD",
  persistWallet: false,
};

export const WalletProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [hasWallet, setHasWallet] = useState(false);
  const [address, setAddress] = useState<string | undefined>();
  const [balances, setBalances] = useState<WalletBalances>({
    primary: 0,
    usd: 0,
    tokens: [],
  });
  const [selectedNetwork, setSelectedNetwork] = useState<WalletNetwork>(
    NETWORKS["polygon-mumbai"]
  );
  const [lastUnlockTime, setLastUnlockTime] = useState<Date | undefined>();
  const [settings, setSettings] = useState<WalletSettings>(defaultSettings);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const clearAutoLockTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const lockWallet = useCallback(async () => {
    setIsUnlocked(false);
    setAddress(undefined);
    setBalances({ primary: 0, usd: 0, tokens: [] });
    clearAutoLockTimer();
  }, [clearAutoLockTimer]);

  const scheduleAutoLock = useCallback(() => {
    clearAutoLockTimer();
    timeoutRef.current = setTimeout(() => {
      lockWallet();
    }, AUTO_LOCK_INTERVAL);
  }, [clearAutoLockTimer, lockWallet]);

  const persistSettings = useCallback(
    async (nextSettings: WalletSettings) => {
      setSettings(nextSettings);
      await secureStorage.setItem(SETTINGS_KEY, JSON.stringify(nextSettings));
    },
    [setSettings]
  );

  const updateSettings = useCallback(
    async (nextSettings: Partial<WalletSettings>) => {
      const merged = { ...defaultSettings, ...settings, ...nextSettings };
      await persistSettings(merged);
    },
    [persistSettings, settings]
  );

  const refreshBalance = useCallback(async () => {
    if (!address) {
      setBalances({ primary: 0, usd: 0, tokens: [] });
      return;
    }

    try {
      const provider = new ethers.providers.JsonRpcProvider(
        selectedNetwork.rpcUrl
      );
      const balance = await provider.getBalance(address);
      const formatted = Number(ethers.utils.formatEther(balance));

      // Get token balances
      const tokens = await getAllTokenBalances(
        address,
        selectedNetwork,
        provider
      );

      // Placeholder conversion until real FX service is wired.
      setBalances({ primary: formatted, usd: formatted * 1, tokens });
    } catch (error) {
      console.warn("Failed to refresh balance", error);
      setBalances({ primary: 0, usd: 0, tokens: [] });
    }
  }, [address, selectedNetwork]);

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

  const loadPersistedWallet = useCallback(async () => {
    try {
      const mnemonic = await secureStorage.getSecureItem(MNEMONIC_KEY);
      const privKey = await secureStorage.getSecureItem(PRIVATE_KEY);
      const savedPassword = await secureStorage.getSecureItem(PASSWORD_KEY);
      const savedSettings = await secureStorage.getItem(SETTINGS_KEY);
      const savedNetwork = await secureStorage.getItem("blockfinax.network");
      const savedLastUnlock = await secureStorage.getItem(LAST_UNLOCK_KEY);
      const walletPersistent = await secureStorage.getItem(
        WALLET_PERSISTENT_KEY
      );

      if (savedSettings) {
        setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
      }

      if (savedNetwork && savedNetwork in NETWORKS) {
        setSelectedNetwork(NETWORKS[savedNetwork as SupportedNetworkId]);
      }

      if (savedLastUnlock) {
        setLastUnlockTime(new Date(savedLastUnlock));
      }

      if (mnemonic && privKey && savedPassword) {
        setHasWallet(true);

        // Auto-unlock if wallet persistence is enabled and biometrics are available
        if (walletPersistent === "true") {
          const biometricEnabled = await secureStorage.getItem(
            BIOMETRIC_ENABLED_KEY
          );
          if (
            biometricEnabled === "true" &&
            (await secureStorage.isBiometricAvailable())
          ) {
            try {
              // Auto-unlock logic will be handled in the effect
              console.log("Wallet is configured for biometric auto-unlock");
            } catch (error) {
              console.warn("Auto-unlock with biometrics failed:", error);
              // Fallback to password unlock screen
            }
          }
        }
      } else {
        setHasWallet(false);
      }
    } catch (error) {
      console.warn("Unable to load wallet state", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const hydrateWallet = useCallback(async () => {
    try {
      const mnemonic = await secureStorage.getSecureItem(MNEMONIC_KEY);
      if (!mnemonic) {
        setIsUnlocked(false);
        return;
      }
      const wallet = ethers.Wallet.fromMnemonic(mnemonic);
      setAddress(wallet.address);
      setIsUnlocked(true);
      await refreshBalance();
    } catch (error) {
      console.warn("Unable to hydrate wallet", error);
      setIsUnlocked(false);
    }
  }, [refreshBalance]);

  // Biometric authentication functions
  const enableBiometricAuth = useCallback(
    async (password: string) => {
      try {
        const isAvailable = await secureStorage.isBiometricAvailable();
        if (!isAvailable) {
          throw new Error(
            "Biometric authentication is not available on this device"
          );
        }

        // Verify the password first
        const savedPassword = await secureStorage.getSecureItem(PASSWORD_KEY);
        if (savedPassword && savedPassword !== password) {
          throw new Error("Invalid password provided");
        }

        // Create a hash of the password for biometric verification
        const biometricHash = btoa(password + Date.now().toString());
        await secureStorage.setSecureItem(BIOMETRIC_HASH_KEY, biometricHash);
        await secureStorage.setItem(BIOMETRIC_ENABLED_KEY, "true");

        // Update settings
        await updateSettings({ enableBiometrics: true, persistWallet: true });

        Alert.alert(
          "Biometric Authentication Enabled",
          "You can now use your fingerprint or Face ID to unlock your wallet."
        );
      } catch (error) {
        console.error("Error enabling biometric auth:", error);
        throw error;
      }
    },
    [updateSettings]
  );

  const disableBiometricAuth = useCallback(async () => {
    try {
      await secureStorage.deleteSecureItem(BIOMETRIC_HASH_KEY);
      await secureStorage.removeItem(BIOMETRIC_ENABLED_KEY);
      await updateSettings({ enableBiometrics: false });

      Alert.alert(
        "Biometric Authentication Disabled",
        "You will need to enter your password to unlock your wallet."
      );
    } catch (error) {
      console.error("Error disabling biometric auth:", error);
      throw error;
    }
  }, [updateSettings]);

  const unlockWithBiometrics = useCallback(async () => {
    try {
      const biometricEnabled = await secureStorage.getItem(
        BIOMETRIC_ENABLED_KEY
      );
      if (biometricEnabled !== "true") {
        throw new Error("Biometric authentication is not enabled");
      }

      const biometricHash = await secureStorage.getSecureItem(
        BIOMETRIC_HASH_KEY,
        {
          requireBiometric: true,
          biometricOptions: {
            promptMessage: "Unlock your BlockFinaX wallet",
            fallbackLabel: "Use Password",
          },
        }
      );

      if (!biometricHash) {
        throw new Error("Biometric verification failed");
      }

      // If biometric verification succeeded, unlock the wallet
      await hydrateWallet();
      const now = new Date();
      setLastUnlockTime(now);
      await secureStorage.setItem(LAST_UNLOCK_KEY, now.toISOString());
      scheduleAutoLock();
    } catch (error) {
      console.error("Error unlocking with biometrics:", error);
      throw error;
    }
  }, [hydrateWallet, scheduleAutoLock]);

  // Check biometric availability on startup
  const checkBiometricAvailability = useCallback(async () => {
    try {
      const isAvailable = await secureStorage.isBiometricAvailable();
      setIsBiometricAvailable(isAvailable);
    } catch (error) {
      console.warn("Error checking biometric availability:", error);
      setIsBiometricAvailable(false);
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
      await secureStorage.setSecureItem(MNEMONIC_KEY, wallet.mnemonic.phrase);
      await secureStorage.setSecureItem(PRIVATE_KEY, wallet.privateKey);

      // Enable wallet persistence by default
      await secureStorage.setItem(WALLET_PERSISTENT_KEY, "true");
      await updateSettings({ persistWallet: true });

      setHasWallet(true);
      setAddress(wallet.address);
      setIsUnlocked(true);
      const now = new Date();
      setLastUnlockTime(now);
      await secureStorage.setItem(LAST_UNLOCK_KEY, now.toISOString());
      await refreshBalance();
      scheduleAutoLock();
    } finally {
      setIsLoading(false);
    }
  }, [refreshBalance, scheduleAutoLock, ensureCryptoRNG]);

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
            hdWallet.mnemonic.phrase
          );
        } else if (privateKey) {
          wallet = new ethers.Wallet(privateKey.trim());
          await secureStorage.setSecureItem(PRIVATE_KEY, wallet.privateKey);
        } else {
          throw new Error("Invalid wallet import payload.");
        }

        await secureStorage.setSecureItem(PRIVATE_KEY, wallet.privateKey);
        await secureStorage.setSecureItem(PASSWORD_KEY, password);

        // Enable wallet persistence by default
        await secureStorage.setItem(WALLET_PERSISTENT_KEY, "true");
        await updateSettings({ persistWallet: true });

        setHasWallet(true);
        setAddress(wallet.address);
        setIsUnlocked(true);
        const now = new Date();
        setLastUnlockTime(now);
        await secureStorage.setItem(LAST_UNLOCK_KEY, now.toISOString());
        await refreshBalance();
        scheduleAutoLock();
      } finally {
        setIsLoading(false);
      }
    },
    [refreshBalance, scheduleAutoLock]
  );

  const unlockWallet = useCallback(
    async (password: string) => {
      const savedPassword = await secureStorage.getSecureItem(PASSWORD_KEY);
      if (savedPassword && savedPassword !== password) {
        throw new Error("Invalid password provided.");
      }

      await hydrateWallet();
      const now = new Date();
      setLastUnlockTime(now);
      await secureStorage.setItem(LAST_UNLOCK_KEY, now.toISOString());
      scheduleAutoLock();
    },
    [hydrateWallet, scheduleAutoLock]
  );

  const switchNetwork = useCallback(
    async (networkId: SupportedNetworkId) => {
      const next = NETWORKS[networkId];
      setSelectedNetwork(next);
      await secureStorage.setItem("blockfinax.network", networkId);
      await refreshBalance();
    },
    [refreshBalance]
  );

  const resetWalletData = useCallback(async () => {
    setIsLoading(true);
    try {
      clearAutoLockTimer();
      await secureStorage.clearWalletData();
      setIsUnlocked(false);
      setHasWallet(false);
      setAddress(undefined);
      setBalances({ primary: 0, usd: 0, tokens: [] });
      setSelectedNetwork(NETWORKS["polygon-mumbai"]);
      setLastUnlockTime(undefined);
      setSettings({ ...defaultSettings });
      await checkBiometricAvailability();
    } catch (error) {
      console.error("Failed to reset wallet data", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [checkBiometricAvailability, clearAutoLockTimer]);

  useEffect(() => {
    loadPersistedWallet();
    checkBiometricAvailability();
  }, [loadPersistedWallet, checkBiometricAvailability]);

  useEffect(() => {
    if (isUnlocked) {
      scheduleAutoLock();
    } else {
      clearAutoLockTimer();
    }
  }, [isUnlocked, scheduleAutoLock, clearAutoLockTimer]);

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;

      if (prevState === "active" && nextState.match(/inactive|background/)) {
        lockWallet();
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    return () => {
      subscription.remove();
    };
  }, [lockWallet]);

  const value = useMemo<WalletContextValue>(
    () => ({
      isLoading,
      isUnlocked,
      hasWallet,
      address,
      balances,
      selectedNetwork,
      lastUnlockTime,
      settings,
      isBiometricAvailable,
      createWallet,
      importWallet,
      unlockWallet,
      unlockWithBiometrics,
      lockWallet,
      refreshBalance,
      switchNetwork,
      updateSettings,
      enableBiometricAuth,
      disableBiometricAuth,
      resetWalletData,
    }),
    [
      address,
      balances,
      createWallet,
      hasWallet,
      importWallet,
      unlockWallet,
      unlockWithBiometrics,
      isLoading,
      isUnlocked,
      lastUnlockTime,
      selectedNetwork,
      settings,
      isBiometricAvailable,
      refreshBalance,
      switchNetwork,
      updateSettings,
      lockWallet,
      enableBiometricAuth,
      disableBiometricAuth,
      resetWalletData,
    ]
  );

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

export function getStablecoinsForNetwork(networkId: SupportedNetworkId) {
  return NETWORKS[networkId]?.stablecoins || [];
}

export function getStablecoinBySymbol(
  networkId: SupportedNetworkId,
  symbol: string
) {
  const network = NETWORKS[networkId];
  return network?.stablecoins?.find((coin) => coin.symbol === symbol);
}

export function getAllSupportedTokens(networkId: SupportedNetworkId) {
  const network = NETWORKS[networkId];
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
