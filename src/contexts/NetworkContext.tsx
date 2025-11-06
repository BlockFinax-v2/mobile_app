import { Network } from "@/types/network";
import React, { createContext, ReactNode, useContext, useState } from "react";

interface NetworkContextType {
  selectedNetwork: Network;
  setSelectedNetwork: (network: Network) => void;
}

const defaultNetwork: Network = {
  id: "sepolia",
  name: "Ethereum Sepolia",
  icon: "test-tube",
  color: "#FBB040",
  type: "testnet",
  chainId: "11155111",
  rpcUrl: "https://sepolia.infura.io/v3/",
};

const NetworkContext = createContext<NetworkContextType>({
  selectedNetwork: defaultNetwork,
  setSelectedNetwork: () => {},
});

interface NetworkProviderProps {
  children: ReactNode;
}

export const NetworkProvider: React.FC<NetworkProviderProps> = ({
  children,
}) => {
  const [selectedNetwork, setSelectedNetwork] =
    useState<Network>(defaultNetwork);

  return (
    <NetworkContext.Provider
      value={{
        selectedNetwork,
        setSelectedNetwork,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error("useNetwork must be used within a NetworkProvider");
  }
  return context;
};
