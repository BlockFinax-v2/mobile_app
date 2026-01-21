import { CommunicationProvider } from "@/contexts/CommunicationContext";
import { NetworkProvider } from "@/contexts/NetworkContext";
import { WalletProvider } from "@/contexts/WalletContext";
import { SmartAccountProvider } from "@/contexts/SmartAccountContext";
import { AlchemySmartAccountProvider } from "@/contexts/AlchemySmartAccountContext";
import { TradeFinanceProvider } from "@/contexts/TradeFinanceContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { useMemo, useEffect } from "react";
import { logFeatureFlags } from "@/config/featureFlags";

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

  // Log feature flags on mount (dev only)
  useEffect(() => {
    logFeatureFlags();
  }, []);

  return (
    <QueryClientProvider client={client}>
      <NetworkProvider>
        <WalletProvider>
          {/* Pimlico Smart Account Provider (Legacy) */}
          <SmartAccountProvider>
            {/* Alchemy Smart Account Provider (New) */}
            <AlchemySmartAccountProvider>
              <TradeFinanceProvider>
                <CommunicationProvider>{children}</CommunicationProvider>
              </TradeFinanceProvider>
            </AlchemySmartAccountProvider>
          </SmartAccountProvider>
        </WalletProvider>
      </NetworkProvider>
    </QueryClientProvider>
  );
};

export default AppProviders;
