import { CommunicationProvider } from "@/contexts/CommunicationContext";
import { NetworkProvider } from "@/contexts/NetworkContext";
import { WalletProvider } from "@/contexts/WalletContext";
import { TradeFinanceProvider } from "@/contexts/TradeFinanceContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { useMemo } from "react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    },
  },
});

const AppProviders: React.FC<React.PropsWithChildren> = ({ children }) => {
  const client = useMemo(() => queryClient, []);

  return (
    <QueryClientProvider client={client}>
      <NetworkProvider>
        <WalletProvider>
          <TradeFinanceProvider>
            <CommunicationProvider>{children}</CommunicationProvider>
          </TradeFinanceProvider>
        </WalletProvider>
      </NetworkProvider>
    </QueryClientProvider>
  );
};

export default AppProviders;
