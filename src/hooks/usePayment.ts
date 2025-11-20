/**
 * Universal Payment Hook
 * 
 * A comprehensive, reusable hook for handling payments across the entire app.
 * This hook provides a consistent payment interface whether you're in:
 * - Main Send Payment functionality
 * - Trade Finance payments
 * - Treasury Portal transactions
 * - Any other payment flow
 * 
 * Features:
 * - Pre-fill payment details from calling components
 * - Automatic wallet detection (no "Connect Wallet" needed)
 * - Gas estimation and balance validation
 * - Cross-network token support
 * - Transaction submission and tracking
 * - Standardized error handling
 */

import {
  getAllSupportedTokens,
  SupportedNetworkId,
  useWallet,
  WalletNetwork,
} from "@/contexts/WalletContext";
import { transactionService } from "@/services/transactionService";
import { formatBalanceForUI, isValidAddress } from "@/utils/tokenUtils";
import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useState, useMemo } from "react";
import { Alert, Vibration } from "react-native";

export interface PaymentToken {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  balance?: string;
  usdValue?: number;
}

export interface PaymentParams {
  // Pre-filled values (optional - can be set by calling component)
  recipientAddress?: string;
  amount?: string;
  tokenSymbol?: string;
  networkId?: SupportedNetworkId;
  message?: string;
  
  // Flow control
  returnTo?: string; // Where to navigate after payment completion
  returnParams?: any; // Parameters to pass back
  
  // UI customization
  title?: string; // Custom title for payment screen
  description?: string; // Custom description
  requireMessage?: boolean; // Whether message field is required
  
  // Restrictions
  allowNetworkSwitch?: boolean; // Whether user can change network
  allowTokenSwitch?: boolean; // Whether user can change token
  minAmount?: number; // Minimum amount allowed
  maxAmount?: number; // Maximum amount allowed
  allowedTokens?: string[]; // Restrict to specific token symbols (e.g., ["USDC", "USDT"])
  restrictToStablecoins?: boolean; // Restrict to stablecoins only
}

export interface PaymentState {
  // Form data
  recipientAddress: string;
  amount: string;
  message: string;
  
  // Selected options
  selectedNetwork: WalletNetwork;
  selectedToken: PaymentToken | null;
  availableTokens: PaymentToken[];
  
  // Gas and fees
  estimatedFee: string | null;
  isEstimatingGas: boolean;
  
  // UI state
  showNetworkSelector: boolean;
  showTokenSelector: boolean;
  
  // Validation
  isValid: boolean;
  validationErrors: {
    recipient?: string;
    amount?: string;
    balance?: string;
    gas?: string;
  };
  
  // Loading states
  isSubmitting: boolean;
  isRefreshingBalance: boolean;
}

export interface PaymentActions {
  // Form actions
  setRecipientAddress: (address: string) => void;
  setAmount: (amount: string) => void;
  setMessage: (message: string) => void;
  
  // Selection actions
  selectNetwork: (networkId: SupportedNetworkId) => Promise<void>;
  selectToken: (token: PaymentToken) => void;
  setMaxAmount: () => void;
  
  // UI actions
  toggleNetworkSelector: () => void;
  toggleTokenSelector: () => void;
  
  // Transaction actions
  estimateGas: () => Promise<void>;
  submitPayment: () => Promise<{ success: boolean; transactionHash?: string }>;
  
  // Utility actions
  validateForm: () => boolean;
  reset: () => void;
  refreshBalance: () => Promise<void>;
}

export interface UsePaymentReturn {
  state: PaymentState;
  actions: PaymentActions;
  
  // Quick access to commonly used values
  availableBalance: string;
  canSubmit: boolean;
  networkColor: string;
  networkIcon: string;
}

export function usePayment(params?: PaymentParams): UsePaymentReturn {
  const navigation = useNavigation();
  
  // Memoize params to prevent infinite re-renders from object recreation
  const stableParams = useMemo(() => params, [
    params?.recipientAddress,
    params?.amount,
    params?.tokenSymbol,
    params?.networkId,
    params?.message,
    params?.returnTo,
    params?.title,
    params?.description,
    params?.requireMessage,
    params?.allowNetworkSwitch,
    params?.allowTokenSwitch,
    params?.minAmount,
    params?.maxAmount,
    params?.restrictToStablecoins,
    JSON.stringify(params?.allowedTokens), // Stringify array for proper comparison
    JSON.stringify(params?.returnParams), // Stringify object for proper comparison
  ]);
  
  const {
    selectedNetwork,
    balances,
    switchNetwork,
    isRefreshingBalance,
    forceRefreshBalance,
  } = useWallet();

  // Initialize state
  const [state, setState] = useState<PaymentState>({
    recipientAddress: stableParams?.recipientAddress || "",
    amount: stableParams?.amount || "",
    message: stableParams?.message || "",
    selectedNetwork,
    selectedToken: null,
    availableTokens: [],
    estimatedFee: null,
    isEstimatingGas: false,
    showNetworkSelector: false,
    showTokenSelector: false,
    isValid: false,
    validationErrors: {},
    isSubmitting: false,
    isRefreshingBalance: false,
  });

  // Network color mapping
  const getNetworkColor = useCallback((networkId?: SupportedNetworkId) => {
    const id = networkId || state.selectedNetwork.id;
    if (id.includes("ethereum")) return "#627EEA";
    if (id.includes("base")) return "#0052FF";
    if (id.includes("lisk")) return "#4070F4";
    if (id.includes("polygon")) return "#8247E5";
    if (id.includes("bsc") || id.includes("bnb")) return "#F3BA2F";
    return "#007AFF";
  }, [state.selectedNetwork.id]);

  // Network icon mapping
  const getNetworkIcon = useCallback((networkId?: SupportedNetworkId) => {
    const id = networkId || state.selectedNetwork.id;
    if (id.includes("ethereum")) return "ethereum";
    if (id.includes("base")) return "alpha-b-circle-outline";
    if (id.includes("lisk")) return "alpha-l-circle";
    if (id.includes("polygon")) return "triangle";
    if (id.includes("bsc") || id.includes("bnb")) return "alpha-b-circle";
    return "earth";
  }, [state.selectedNetwork.id]);

  // Get available balance for selected token
  const availableBalance = useCallback(() => {
    if (!state.selectedToken) return "0";

    if (state.selectedToken.address === "0x0000000000000000000000000000000000000000") {
      // Native token
      return balances.primary.toString();
    } else {
      // ERC-20 token
      const tokenBalance = balances.tokens.find(
        (t) => t.address.toLowerCase() === state.selectedToken!.address.toLowerCase()
      );
      return tokenBalance?.balance || "0";
    }
  }, [state.selectedToken, balances]);

  // Initialize available tokens when network changes
  useEffect(() => {
    const allTokens = getAllSupportedTokens(state.selectedNetwork.id);
    
    // Apply token restrictions based on params
    let filteredTokens = allTokens;
    
    if (stableParams?.restrictToStablecoins) {
      // Only allow stablecoins (USDC, USDT, DAI)
      const stablecoinSymbols = ["USDC", "USDT", "DAI"];
      filteredTokens = allTokens.filter(token => stablecoinSymbols.includes(token.symbol));
    } else if (stableParams?.allowedTokens && stableParams.allowedTokens.length > 0) {
      // Only allow specific tokens
      filteredTokens = allTokens.filter(token => stableParams.allowedTokens!.includes(token.symbol));
    }
    
    const tokensWithBalance = filteredTokens.map((token) => ({
      ...token,
      balance: token.address === "0x0000000000000000000000000000000000000000"
        ? balances.primary.toString()
        : balances.tokens.find(t => t.address.toLowerCase() === token.address.toLowerCase())?.balance || "0",
      usdValue: token.address === "0x0000000000000000000000000000000000000000"
        ? balances.primaryUsd
        : balances.tokens.find(t => t.address.toLowerCase() === token.address.toLowerCase())?.usdValue || 0,
    }));

    setState(prev => ({ ...prev, availableTokens: tokensWithBalance }));

    // Auto-select token based on params or preference
    let preferredToken: PaymentToken | null = null;

    if (stableParams?.tokenSymbol) {
      preferredToken = tokensWithBalance.find(t => t.symbol === stableParams.tokenSymbol) || null;
    }

    if (!preferredToken) {
      // Default selection logic
      if (stableParams?.restrictToStablecoins || stableParams?.allowedTokens) {
        // For restricted flows (Trade Finance/Treasury), always prefer USDC first
        preferredToken = tokensWithBalance.find(t => t.symbol === "USDC") ||
                        tokensWithBalance.find(t => t.symbol === "USDT") ||
                        tokensWithBalance.find(t => t.symbol === "DAI") ||
                        tokensWithBalance[0] || null;
      } else if (stableParams?.returnTo?.includes("Marketplace") || stableParams?.returnTo?.includes("Trade")) {
        // For marketplace/trade flows, prefer native token
        preferredToken = tokensWithBalance.find(t => t.address === "0x0000000000000000000000000000000000000000") || null;
      } else {
        // For regular flows, prefer USDC, then other stablecoins, then native
        preferredToken = tokensWithBalance.find(t => t.symbol === "USDC") ||
                        tokensWithBalance.find(t => t.address !== "0x0000000000000000000000000000000000000000") ||
                        tokensWithBalance[0] || null;
      }
    }

    setState(prev => ({ ...prev, selectedToken: preferredToken }));
  }, [state.selectedNetwork.id, balances, stableParams?.tokenSymbol, stableParams?.returnTo, stableParams?.restrictToStablecoins, stableParams?.allowedTokens]);

  // Handle network switching from params
  useEffect(() => {
    if (stableParams?.networkId && stableParams.networkId !== selectedNetwork.id) {
      if (stableParams.allowNetworkSwitch !== false) {
        switchNetwork(stableParams.networkId).catch(error => {
          console.warn("Failed to switch to requested network:", error);
        });
      }
    }
  }, [stableParams?.networkId, selectedNetwork.id, switchNetwork, stableParams?.allowNetworkSwitch]);

  // Update selected network when wallet network changes
  useEffect(() => {
    setState(prev => ({ ...prev, selectedNetwork }));
  }, [selectedNetwork]);

  // Validation function
  const validateForm = useCallback(() => {
    const errors: PaymentState['validationErrors'] = {};

    // Validate recipient
    if (!state.recipientAddress) {
      errors.recipient = "Recipient address is required";
    } else if (!isValidAddress(state.recipientAddress)) {
      errors.recipient = "Invalid wallet address format";
    }

    // Validate amount
    if (!state.amount) {
      errors.amount = "Amount is required";
    } else {
      const amount = parseFloat(state.amount);
      if (isNaN(amount) || amount <= 0) {
        errors.amount = "Please enter a valid amount";
      } else if (stableParams?.minAmount && amount < stableParams.minAmount) {
        errors.amount = `Minimum amount is ${stableParams.minAmount}`;
      } else if (stableParams?.maxAmount && amount > stableParams.maxAmount) {
        errors.amount = `Maximum amount is ${stableParams.maxAmount}`;
      }
    }

    // Validate balance
    const balance = parseFloat(availableBalance());
    const amount = parseFloat(state.amount || "0");
    if (amount > balance) {
      errors.balance = `Insufficient ${state.selectedToken?.symbol} balance`;
    }

    // Validate gas for native token transfers
    if (state.selectedToken?.address === "0x0000000000000000000000000000000000000000") {
      const estimatedGas = parseFloat(state.estimatedFee || "0");
      if (amount + estimatedGas > balances.primary) {
        errors.gas = "Insufficient balance for amount + gas fees";
      }
    } else {
      // For token transfers, check native balance for gas
      const estimatedGas = parseFloat(state.estimatedFee || "0");
      if (estimatedGas > balances.primary) {
        errors.gas = `Insufficient ${state.selectedNetwork.primaryCurrency} for gas fees`;
      }
    }

    // Validate message if required
    if (stableParams?.requireMessage && !state.message.trim()) {
      errors.recipient = "Message is required for this payment";
    }

    const isValid = Object.keys(errors).length === 0 && !!state.selectedToken;

    setState(prev => ({
      ...prev,
      validationErrors: errors,
      isValid,
    }));

    return isValid;
  }, [
    state.recipientAddress,
    state.amount,
    state.selectedToken?.symbol,
    state.selectedNetwork.id,
    balances,
    availableBalance,
    stableParams?.minAmount,
    stableParams?.maxAmount,
    stableParams?.requireMessage,
    state.message,
  ]);

  // Gas estimation
  const estimateGas = useCallback(async () => {
    if (!state.recipientAddress || !state.amount || !state.selectedToken) return;
    if (!isValidAddress(state.recipientAddress)) return;

    const amount = parseFloat(state.amount);
    if (isNaN(amount) || amount <= 0) return;

    setState(prev => ({ ...prev, isEstimatingGas: true }));

    try {
      const gasEstimate = await transactionService.estimateGas({
        recipientAddress: state.recipientAddress,
        amount: state.amount,
        tokenAddress: state.selectedToken.address === "0x0000000000000000000000000000000000000000"
          ? undefined
          : state.selectedToken.address,
        tokenDecimals: state.selectedToken.decimals,
        network: state.selectedNetwork,
      });

      setState(prev => ({
        ...prev,
        estimatedFee: gasEstimate.estimatedCost,
        isEstimatingGas: false,
      }));
    } catch (error) {
      console.warn("Gas estimation failed:", error);
      setState(prev => ({
        ...prev,
        estimatedFee: null,
        isEstimatingGas: false,
      }));
    }
  }, [state.recipientAddress, state.amount, state.selectedToken?.address, state.selectedNetwork.id]);

  // Gas estimation removed from useEffect to prevent infinite loops
  // Call estimateGas manually when needed (e.g., on form submission)

  // Form validation removed from useEffect to prevent infinite loops
  // Validation is called in canSubmit computed property instead

  // Actions
  const actions: PaymentActions = {
    setRecipientAddress: (address: string) => {
      setState(prev => ({ ...prev, recipientAddress: address }));
      // Trigger gas estimation after a short delay to debounce
      setTimeout(() => estimateGas(), 500);
    },

    setAmount: (amount: string) => {
      setState(prev => ({ ...prev, amount }));
      // Trigger gas estimation after a short delay to debounce
      setTimeout(() => estimateGas(), 500);
    },

    setMessage: (message: string) => {
      setState(prev => ({ ...prev, message }));
    },

    selectNetwork: async (networkId: SupportedNetworkId) => {
      if (params?.allowNetworkSwitch === false) return;
      
      try {
        await switchNetwork(networkId);
        setState(prev => ({ ...prev, showNetworkSelector: false }));
      } catch (error) {
        console.error("Failed to switch network:", error);
        Alert.alert("Network Error", "Failed to switch network. Please try again.");
      }
    },

    selectToken: (token: PaymentToken) => {
      if (params?.allowTokenSwitch === false) return;
      
      setState(prev => ({
        ...prev,
        selectedToken: token,
        showTokenSelector: false,
        amount: "", // Reset amount when token changes
      }));
      Vibration.vibrate(50);
      // Trigger gas estimation when token changes
      setTimeout(() => estimateGas(), 500);
    },

    setMaxAmount: () => {
      const balance = availableBalance();
      let maxAmount = parseFloat(balance);

      // For native tokens, subtract estimated gas
      if (state.selectedToken?.address === "0x0000000000000000000000000000000000000000") {
        const gasReserve = parseFloat(state.estimatedFee || "0.001"); // Reserve for gas
        maxAmount = Math.max(0, maxAmount - gasReserve);
      }

      // Apply max amount restriction if set
      if (params?.maxAmount) {
        maxAmount = Math.min(maxAmount, params.maxAmount);
      }

      setState(prev => ({ ...prev, amount: maxAmount.toString() }));
      Vibration.vibrate(50);
    },

    toggleNetworkSelector: () => {
      if (params?.allowNetworkSwitch === false) return;
      setState(prev => ({ ...prev, showNetworkSelector: !prev.showNetworkSelector }));
    },

    toggleTokenSelector: () => {
      if (params?.allowTokenSwitch === false) return;
      setState(prev => ({ ...prev, showTokenSelector: !prev.showTokenSelector }));
    },

    estimateGas,

    submitPayment: async () => {
      if (!validateForm()) {
        return { success: false };
      }

      setState(prev => ({ ...prev, isSubmitting: true }));

      try {
        const result = await transactionService.sendTransaction({
          recipientAddress: state.recipientAddress,
          amount: state.amount,
          tokenAddress: state.selectedToken!.address === "0x0000000000000000000000000000000000000000"
            ? undefined
            : state.selectedToken!.address,
          tokenDecimals: state.selectedToken!.decimals,
          network: state.selectedNetwork,
        });

        setState(prev => ({ ...prev, isSubmitting: false }));

        // Success feedback
        Vibration.vibrate([100, 50, 100]);
        
        return { success: true, transactionHash: result.hash };
      } catch (error) {
        setState(prev => ({ ...prev, isSubmitting: false }));
        
        console.error("Transaction failed:", error);
        Alert.alert(
          "Transaction Failed",
          error instanceof Error ? error.message : "An unexpected error occurred"
        );
        
        return { success: false };
      }
    },

    validateForm,

    reset: () => {
      setState(prev => ({
        ...prev,
        recipientAddress: params?.recipientAddress || "",
        amount: params?.amount || "",
        message: params?.message || "",
        estimatedFee: null,
        validationErrors: {},
        isValid: false,
        showNetworkSelector: false,
        showTokenSelector: false,
      }));
    },

    refreshBalance: async () => {
      setState(prev => ({ ...prev, isRefreshingBalance: true }));
      try {
        await forceRefreshBalance();
      } finally {
        setState(prev => ({ ...prev, isRefreshingBalance: false }));
      }
    },
  };

  // Computed canSubmit that validates on-demand to prevent loops
  const canSubmit = useMemo(() => {
    const isFormValid = validateForm();
    return isFormValid && !state.isSubmitting && !state.isEstimatingGas;
  }, [
    validateForm,
    state.isSubmitting,
    state.isEstimatingGas,
  ]);

  return {
    state,
    actions,
    availableBalance: formatBalanceForUI(availableBalance()),
    canSubmit,
    networkColor: getNetworkColor(),
    networkIcon: getNetworkIcon(),
  };
}