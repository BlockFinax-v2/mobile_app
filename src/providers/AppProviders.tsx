import { CommunicationProvider } from "@/contexts/CommunicationContext";
import { NetworkProvider } from "@/contexts/NetworkContext";
import { WalletProvider } from "@/contexts/WalletContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { useMemo } from "react";

// Optimized query client with better performance settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 300 * 1000, // 5 minutes instead of 1 minute
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      retry: 1, // Reduce retries from 3 to 1
      retryDelay: 1000, // Faster retry
    },
  },
});

const AppProviders: React.FC<React.PropsWithChildren> = ({ children }) => {
  const client = useMemo(() => queryClient, []);

  return (
    <QueryClientProvider client={client}>
      <NetworkProvider>
        <WalletProvider>
          <CommunicationProvider>{children}</CommunicationProvider>
        </WalletProvider>
      </NetworkProvider>
    </QueryClientProvider>
  );
};

export default AppProviders;
