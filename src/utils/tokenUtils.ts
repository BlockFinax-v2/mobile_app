import { WalletNetwork } from "@/contexts/WalletContext";
import { ethers } from "ethers";

// Standard ERC-20 ABI for basic token operations
export const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  
  // Events
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "event Approval(address indexed owner, address indexed spender, uint256 value)"
];

/**
 * Get token balance for a specific address
 */
export async function getTokenBalance(
  tokenAddress: string,
  walletAddress: string,
  provider: ethers.providers.Provider,
  decimals: number = 18
): Promise<string> {
  try {
    if (tokenAddress === "0x0000000000000000000000000000000000000000") {
      // Native token (ETH, MATIC, BNB, etc.)
      const balance = await provider.getBalance(walletAddress);
      return ethers.utils.formatEther(balance);
    } else {
      // ERC-20 token
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      const balance = await contract.balanceOf(walletAddress);
      return ethers.utils.formatUnits(balance, decimals);
    }
  } catch (error) {
    console.warn("Failed to get token balance:", error);
    return "0";
  }
}

/**
 * Create a token transfer transaction
 */
export async function createTokenTransfer(
  tokenAddress: string,
  recipientAddress: string,
  amount: string,
  signer: ethers.Signer,
  decimals: number = 18
): Promise<ethers.providers.TransactionResponse> {
  if (tokenAddress === "0x0000000000000000000000000000000000000000") {
    // Native token transfer
    return signer.sendTransaction({
      to: recipientAddress,
      value: ethers.utils.parseEther(amount),
    });
  } else {
    // ERC-20 token transfer
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    const parsedAmount = ethers.utils.parseUnits(amount, decimals);
    return contract.transfer(recipientAddress, parsedAmount);
  }
}

/**
 * Estimate gas for token transfer
 */
export async function estimateTokenTransferGas(
  tokenAddress: string,
  recipientAddress: string,
  amount: string,
  signer: ethers.Signer,
  decimals: number = 18
): Promise<ethers.BigNumber> {
  try {
    if (tokenAddress === "0x0000000000000000000000000000000000000000") {
      // Native token transfer
      return signer.estimateGas({
        to: recipientAddress,
        value: ethers.utils.parseEther(amount),
      });
    } else {
      // ERC-20 token transfer
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
      const parsedAmount = ethers.utils.parseUnits(amount, decimals);
      return contract.estimateGas.transfer(recipientAddress, parsedAmount);
    }
  } catch (error) {
    console.warn("Failed to estimate gas:", error);
    return ethers.BigNumber.from("21000"); // Default gas limit
  }
}

/**
 * Format token amount for display
 */
export function formatTokenAmount(
  amount: string | ethers.BigNumber,
  decimals: number = 18,
  symbol: string = "",
  precision: number = 6
): string {
  try {
    const formatted = typeof amount === "string" 
      ? amount 
      : ethers.utils.formatUnits(amount, decimals);
    
    const num = parseFloat(formatted);
    const rounded = num.toFixed(precision).replace(/\.?0+$/, "");
    
    return symbol ? `${rounded} ${symbol}` : rounded;
  } catch (error) {
    console.warn("Failed to format token amount:", error);
    return symbol ? `0 ${symbol}` : "0";
  }
}

/**
 * Validate if an address is a valid Ethereum address
 */
export function isValidAddress(address: string): boolean {
  try {
    return ethers.utils.isAddress(address);
  } catch {
    return false;
  }
}

/**
 * Get all token balances for a wallet
 */
export async function getAllTokenBalances(
  walletAddress: string,
  network: WalletNetwork,
  provider: ethers.providers.Provider
): Promise<Array<{ symbol: string; balance: string; address: string }>> {
  const balances: Array<{ symbol: string; balance: string; address: string }> = [];
  
  try {
    // Get native token balance
    const nativeBalance = await getTokenBalance(
      "0x0000000000000000000000000000000000000000",
      walletAddress,
      provider,
      18
    );
    balances.push({
      symbol: network.primaryCurrency,
      balance: nativeBalance,
      address: "0x0000000000000000000000000000000000000000",
    });

    // Get stablecoin balances
    if (network.stablecoins) {
      for (const stablecoin of network.stablecoins) {
        const balance = await getTokenBalance(
          stablecoin.address,
          walletAddress,
          provider,
          stablecoin.decimals
        );
        balances.push({
          symbol: stablecoin.symbol,
          balance,
          address: stablecoin.address,
        });
      }
    }
  } catch (error) {
    console.warn("Failed to get all token balances:", error);
  }

  return balances;
}