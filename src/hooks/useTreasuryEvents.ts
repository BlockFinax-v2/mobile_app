import { useState, useEffect } from "react";
import { useTreasury } from "@/contexts/TreasuryContext";
import { TreasuryEvent } from "@/services/treasuryEventService";

/**
 * Hook to get recent treasury events with optional filtering
 */
export const useTreasuryEvents = (
    filter?: {
        eventTypes?: TreasuryEvent["eventType"][];
        limit?: number;
    }
) => {
    const { recentEvents } = useTreasury();
    const [filteredEvents, setFilteredEvents] = useState<TreasuryEvent[]>([]);

    useEffect(() => {
        let events = recentEvents;

        // Filter by event types if specified
        if (filter?.eventTypes && filter.eventTypes.length > 0) {
            events = events.filter(e => filter.eventTypes!.includes(e.eventType));
        }

        // Limit results if specified
        if (filter?.limit) {
            events = events.slice(0, filter.limit);
        }

        setFilteredEvents(events);
    }, [recentEvents, filter]);

    return filteredEvents;
};

/**
 * Hook to get staking-specific events
 */
export const useStakingEvents = (limit: number = 10) => {
    return useTreasuryEvents({
        eventTypes: [
            "Staked",
            "Unstaked",
            "RewardsClaimed",
            "RewardsDistributed",
            "EmergencyWithdrawn",
            "CustomDeadlineSet",
        ],
        limit,
    });
};

/**
 * Hook to get governance proposal events
 */
export const useProposalEvents = (proposalId?: string, limit: number = 10) => {
    const allEvents = useTreasuryEvents({
        eventTypes: [
            "ProposalCreated",
            "ProposalVoteCast",
            "ProposalStatusChanged",
            "ProposalExecuted",
        ],
        limit: 100, // Get more to filter by proposalId
    });

    if (!proposalId) {
        return allEvents.slice(0, limit);
    }

    // Filter by specific proposal
    return allEvents
        .filter(event => {
            const data = event.data;
            return data.proposalId === proposalId;
        })
        .slice(0, limit);
};

/**
 * Hook to get financier status change events
 */
export const useFinancierEvents = (limit: number = 10) => {
    return useTreasuryEvents({
        eventTypes: [
            "FinancierStatusChanged",
            "FinancierRevocationRequested",
            "FinancierRevocationCompleted",
            "FinancierRevocationCancelled",
        ],
        limit,
    });
};

/**
 * Hook to monitor event sync status
 */
export const useEventSyncStatus = () => {
    const { eventSyncStatus, lastSyncTime } = useTreasury();
    
    const [timeSinceSync, setTimeSinceSync] = useState<number | null>(null);

    useEffect(() => {
        if (!lastSyncTime) {
            setTimeSinceSync(null);
            return;
        }

        const updateTimeSinceSync = () => {
            const now = Date.now();
            const diff = Math.floor((now - lastSyncTime) / 1000); // seconds
            setTimeSinceSync(diff);
        };

        updateTimeSinceSync();
        const interval = setInterval(updateTimeSinceSync, 1000);

        return () => clearInterval(interval);
    }, [lastSyncTime]);

    return {
        status: eventSyncStatus,
        lastSyncTime,
        timeSinceSync,
        isSyncing: eventSyncStatus === "syncing",
        isSynced: eventSyncStatus === "synced",
        hasError: eventSyncStatus === "error",
    };
};

/**
 * Hook to get event statistics
 */
export const useEventCounts = () => {
    const { recentEvents } = useTreasury();
    const [counts, setCounts] = useState<Record<string, number>>({});

    useEffect(() => {
        const eventCounts: Record<string, number> = {};
        
        recentEvents.forEach(event => {
            eventCounts[event.eventType] = (eventCounts[event.eventType] || 0) + 1;
        });

        setCounts(eventCounts);
    }, [recentEvents]);

    return {
        total: recentEvents.length,
        byType: counts,
        stakingEvents: (counts.Staked || 0) + (counts.Unstaked || 0) + (counts.RewardsClaimed || 0),
        governanceEvents: (counts.ProposalCreated || 0) + (counts.ProposalVoteCast || 0),
        financierEvents: (counts.FinancierStatusChanged || 0) + (counts.FinancierRevocationRequested || 0),
    };
};

/**
 * Hook to get latest event of a specific type
 */
export const useLatestEvent = (eventType: TreasuryEvent["eventType"]) => {
    const { recentEvents } = useTreasury();
    const [latestEvent, setLatestEvent] = useState<TreasuryEvent | null>(null);

    useEffect(() => {
        const event = recentEvents.find(e => e.eventType === eventType);
        setLatestEvent(event || null);
    }, [recentEvents, eventType]);

    return latestEvent;
};

/**
 * Hook to track rewards claimed over time
 */
export const useRewardsHistory = () => {
    const rewardEvents = useTreasuryEvents({
        eventTypes: ["RewardsClaimed", "RewardsDistributed"],
    });

    const totalRewards = rewardEvents.reduce((sum, event) => {
        const amount = event.data.amount;
        if (amount) {
            try {
                return sum + parseFloat(amount.toString());
            } catch {
                return sum;
            }
        }
        return sum;
    }, 0);

    return {
        events: rewardEvents,
        totalRewards,
        count: rewardEvents.length,
    };
};

/**
 * Hook to monitor staking activity
 */
export const useStakingActivity = () => {
    const stakingEvents = useStakingEvents(50);

    const stats = stakingEvents.reduce(
        (acc, event) => {
            switch (event.eventType) {
                case "Staked":
                    acc.stakes += 1;
                    break;
                case "Unstaked":
                    acc.unstakes += 1;
                    break;
                case "RewardsClaimed":
                    acc.claims += 1;
                    break;
                case "EmergencyWithdrawn":
                    acc.emergencyWithdrawals += 1;
                    break;
            }
            return acc;
        },
        { stakes: 0, unstakes: 0, claims: 0, emergencyWithdrawals: 0 }
    );

    return {
        events: stakingEvents,
        stats,
        hasActivity: stakingEvents.length > 0,
    };
};

/**
 * Hook to monitor governance participation
 */
export const useGovernanceParticipation = () => {
    const proposalEvents = useProposalEvents(undefined, 100);

    const stats = proposalEvents.reduce(
        (acc, event) => {
            switch (event.eventType) {
                case "ProposalCreated":
                    acc.proposalsCreated += 1;
                    break;
                case "ProposalVoteCast":
                    acc.votesCast += 1;
                    if (event.data.support) {
                        acc.votesFor += 1;
                    } else {
                        acc.votesAgainst += 1;
                    }
                    break;
                case "ProposalExecuted":
                    acc.proposalsExecuted += 1;
                    break;
            }
            return acc;
        },
        {
            proposalsCreated: 0,
            votesCast: 0,
            votesFor: 0,
            votesAgainst: 0,
            proposalsExecuted: 0,
        }
    );

    return {
        events: proposalEvents,
        stats,
        participationRate: stats.votesCast > 0 ? (stats.votesCast / Math.max(stats.proposalsCreated, 1)) : 0,
    };
};
