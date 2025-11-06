// Network types for UI components
export interface Network {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: "mainnet" | "testnet";
  chainId: string;
  rpcUrl: string;
}

export interface NetworkToken {
  symbol: string;
  name: string;
  icon: string;
  decimals: number;
  contractAddress?: string; // undefined for native tokens
}

export interface NetworkTokenSelection {
  network: Network;
  token: NetworkToken;
}