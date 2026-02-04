import { useEffect, useState, useCallback } from "react";
import { tradeFinanceEventService, PGAEvent } from "@/services/tradeFinanceEventService";
import { useWallet } from "@/contexts/WalletContext";
import { useQuery } from "@tanstack/react-query";

/**
 * Hook to monitor specific PGA events in real-time
 * 
 * @example
 * ```tsx
 * const { events, isListening } = usePGAEvents('PGA-123', ['CertificateIssued', 'GoodsShipped']);
 * 
 * useEffect(() => {
 *   if (events.length > 0) {
 *     console.log('New event received:', events[events.length - 1]);
 *   }
 * }, [events]);
 * ```
 */
export function usePGAEvents(
  pgaId?: string,
  eventTypes?: PGAEvent["eventType"][]
) {
  const [events, setEvents] = useState<PGAEvent[]>([]);
  const [isListening, setIsListening] = useState(false);
  const { address, selectedNetwork } = useWallet();

  const handleEvent = useCallback(
    (event: PGAEvent) => {
      // Filter by PGA ID if specified
      if (pgaId && event.pgaId !== pgaId) {
        return;
      }

      // Filter by event types if specified
      if (eventTypes && !eventTypes.includes(event.eventType)) {
        return;
      }

      setEvents((prev) => [...prev, event]);
    },
    [pgaId, eventTypes]
  );

  useEffect(() => {
    if (!address || !selectedNetwork) {
      setIsListening(false);
      return;
    }

    // Start listening
    tradeFinanceEventService.startListening(address, handleEvent);
    setIsListening(true);

    // Cleanup
    return () => {
      tradeFinanceEventService.stopListening();
      setIsListening(false);
    };
  }, [address, selectedNetwork, handleEvent]);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return {
    events,
    isListening,
    clearEvents,
    latestEvent: events.length > 0 ? events[events.length - 1] : null,
  };
}

/**
 * Hook to fetch historical events for a specific PGA
 * 
 * @example
 * ```tsx
 * const { events, loading, error, refetch } = usePGAHistory('PGA-123');
 * 
 * if (loading) return <Spinner />;
 * if (error) return <ErrorMessage error={error} />;
 * 
 * return <EventTimeline events={events} />;
 * ```
 */
export function usePGAHistory(pgaId: string, fromBlock: number = 0) {
  const { address, selectedNetwork } = useWallet();

  const { data: events = [], isLoading, error, refetch } = useQuery({
    queryKey: ["pga-history", pgaId, address, selectedNetwork.id],
    queryFn: async () => {
      if (!address) return [];

      // Limit to 200 blocks for individual PGA history (faster on free tier)
      const allEvents = await tradeFinanceEventService.fetchPastEvents(
        address,
        fromBlock,
        "latest",
        200
      );

      // Filter events for this specific PGA
      return allEvents.filter((event) => event.pgaId === pgaId);
    },
    enabled: !!address && !!selectedNetwork,
    staleTime: 30000, // 30 seconds
  });

  return {
    events,
    loading: isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to monitor the sync status of the event service
 * 
 * @example
 * ```tsx
 * const { lastSyncedBlock, isListening } = useEventSyncStatus();
 * 
 * return (
 *   <View>
 *     <Text>Last Synced: Block {lastSyncedBlock}</Text>
 *     <Text>Status: {isListening ? 'Live' : 'Offline'}</Text>
 *   </View>
 * );
 * ```
 */
export function useEventSyncStatus() {
  const [lastSyncedBlock, setLastSyncedBlock] = useState(0);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    // Update status every second
    const interval = setInterval(() => {
      const block = tradeFinanceEventService.getLastProcessedBlock();
      const listening = tradeFinanceEventService.getIsListening();

      setLastSyncedBlock(block);
      setIsListening(listening);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    lastSyncedBlock,
    isListening,
  };
}

/**
 * Hook to get a real-time count of events by type
 * 
 * @example
 * ```tsx
 * const eventCounts = useEventCounts();
 * 
 * return (
 *   <View>
 *     <Text>PGAs Created: {eventCounts.PGACreated}</Text>
 *     <Text>Certificates Issued: {eventCounts.CertificateIssued}</Text>
 *   </View>
 * );
 * ```
 */
export function useEventCounts() {
  const { events } = usePGAEvents();
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const newCounts: Record<string, number> = {};

    events.forEach((event) => {
      newCounts[event.eventType] = (newCounts[event.eventType] || 0) + 1;
    });

    setCounts(newCounts);
  }, [events]);

  return counts;
}
