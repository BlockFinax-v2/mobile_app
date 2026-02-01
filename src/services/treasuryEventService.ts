import { ethers } from "ethers";
import { WalletNetwork } from "@/contexts/WalletContext";
import { DIAMOND_ADDRESSES } from "@/services/stakingService";

// Treasury/Staking/Governance Event ABI
const TREASURY_EVENT_ABI = [
    "event Staked(address indexed staker, uint256 amount, uint256 votingPower, uint256 currentApr, uint256 deadline, bool isFinancier)",
    "event Unstaked(address indexed staker, uint256 amount, uint256 rewards)",
    "event RewardsClaimed(address indexed staker, uint256 amount)",
    "event RewardsDistributed(address indexed staker, uint256 amount)",
    "event FinancierStatusChanged(address indexed staker, bool isFinancier)",
    "event CustomDeadlineSet(address indexed staker, uint256 deadline)",
    "event EmergencyWithdrawn(address indexed staker, uint256 amount, uint256 penalty)",
    "event RewardRateUpdated(uint256 oldRate, uint256 newRate, uint256 totalStaked)",
    "event StakingConfigUpdated(string parameter, uint256 oldValue, uint256 newValue)",
    "event ProposalCreated(string indexed proposalId, string indexed category, string indexed title, address proposer, uint256 votingDeadline)",
    "event ProposalVoteCast(string indexed proposalId, address indexed voter, bool support, uint256 votingPower)",
    "event ProposalStatusChanged(string indexed proposalId, uint8 newStatus)",
    "event ProposalExecuted(string indexed proposalId, address executor)",
    "event FinancierRevocationRequested(address indexed financier, uint256 requestTime)",
    "event FinancierRevocationCancelled(address indexed financier, uint256 requestTime)",
    "event FinancierRevocationCompleted(address indexed financier, uint256 completionTime)",
    "event Paused(address account)",
    "event Unpaused(address account)"
];

export interface TreasuryEvent {
    eventType: 
        | "Staked"
        | "Unstaked"
        | "RewardsClaimed"
        | "RewardsDistributed"
        | "FinancierStatusChanged"
        | "CustomDeadlineSet"
        | "EmergencyWithdrawn"
        | "RewardRateUpdated"
        | "StakingConfigUpdated"
        | "ProposalCreated"
        | "ProposalVoteCast"
        | "ProposalStatusChanged"
        | "ProposalExecuted"
        | "FinancierRevocationRequested"
        | "FinancierRevocationCancelled"
        | "FinancierRevocationCompleted"
        | "Paused"
        | "Unpaused";
    blockNumber: number;
    transactionHash: string;
    timestamp: number;
    data: any;
}

type EventCallback = (event: TreasuryEvent) => void;

class TreasuryEventService {
    private static instance: TreasuryEventService;
    private currentChainId: number = 4202;
    private currentNetworkConfig: WalletNetwork | null = null;
    private provider: ethers.providers.JsonRpcProvider | null = null;
    private contract: ethers.Contract | null = null;
    private eventCallbacks: Map<string, EventCallback[]> = new Map();
    private lastProcessedBlock: number = 0;
    private isListening: boolean = false;

    public static getInstance(): TreasuryEventService {
        if (!TreasuryEventService.instance) {
            TreasuryEventService.instance = new TreasuryEventService();
        }
        return TreasuryEventService.instance;
    }

    public setNetwork(chainId: number, networkConfig: WalletNetwork): void {
        this.stopListening();
        this.currentChainId = chainId;
        this.currentNetworkConfig = networkConfig;
        this.provider = new ethers.providers.JsonRpcProvider(networkConfig.rpcUrl);
        this.contract = new ethers.Contract(
            this.getDiamondAddress(),
            TREASURY_EVENT_ABI,
            this.provider
        );
        this.lastProcessedBlock = 0;
        console.log(`[TreasuryEventService] Network switched to chainId: ${chainId}`);
    }

    private getDiamondAddress(): string {
        if (this.currentNetworkConfig?.diamondAddress) {
            return this.currentNetworkConfig.diamondAddress;
        }
        const address = DIAMOND_ADDRESSES[this.currentChainId];
        if (!address) throw new Error(`No Diamond contract for network ${this.currentChainId}`);
        return address;
    }

    /**
     * Fetch historical events from the blockchain
     * @param maxBlockRange - Maximum blocks to fetch (default 1000 for free tier)
     */
    public async fetchPastEvents(
        userAddress: string,
        fromBlock: number | "earliest" = 0,
        toBlock: number | "latest" = "latest",
        maxBlockRange: number = 1000
    ): Promise<TreasuryEvent[]> {
        if (!this.contract || !this.provider) {
            throw new Error("Service not initialized. Call setNetwork first.");
        }

        console.log(`[TreasuryEventService] Fetching past events from block ${fromBlock} to ${toBlock}`);

        try {
            const events: TreasuryEvent[] = [];
            const currentBlock = typeof toBlock === "string" ? await this.provider.getBlockNumber() : toBlock;
            let startBlock = fromBlock === "earliest" ? 0 : fromBlock;
            
            // Limit block range to avoid excessive API calls on free tier
            if (currentBlock - startBlock > maxBlockRange) {
                console.log(`[TreasuryEventService] ⚠️ Block range too large (${currentBlock - startBlock} blocks). Limiting to last ${maxBlockRange} blocks.`);
                startBlock = currentBlock - maxBlockRange;
            }

            // Define all event filters - fetch all events and filter in code
            const eventFilters = [
                { name: "Staked", filter: this.contract.filters.Staked() },
                { name: "Unstaked", filter: this.contract.filters.Unstaked() },
                { name: "RewardsClaimed", filter: this.contract.filters.RewardsClaimed() },
                { name: "RewardsDistributed", filter: this.contract.filters.RewardsDistributed() },
                { name: "FinancierStatusChanged", filter: this.contract.filters.FinancierStatusChanged() },
                { name: "CustomDeadlineSet", filter: this.contract.filters.CustomDeadlineSet() },
                { name: "EmergencyWithdrawn", filter: this.contract.filters.EmergencyWithdrawn() },
                { name: "RewardRateUpdated", filter: this.contract.filters.RewardRateUpdated() },
                { name: "StakingConfigUpdated", filter: this.contract.filters.StakingConfigUpdated() },
                { name: "ProposalCreated", filter: this.contract.filters.ProposalCreated() },
                { name: "ProposalVoteCast", filter: this.contract.filters.ProposalVoteCast() },
                { name: "ProposalStatusChanged", filter: this.contract.filters.ProposalStatusChanged() },
                { name: "ProposalExecuted", filter: this.contract.filters.ProposalExecuted() },
                { name: "FinancierRevocationRequested", filter: this.contract.filters.FinancierRevocationRequested() },
                { name: "FinancierRevocationCancelled", filter: this.contract.filters.FinancierRevocationCancelled() },
                { name: "FinancierRevocationCompleted", filter: this.contract.filters.FinancierRevocationCompleted() },
            ];

            // Fetch events in batches
            // Alchemy free tier: 10 block range max for eth_getLogs
            const BATCH_SIZE = 10;
            const totalBatches = Math.ceil((currentBlock - startBlock + 1) / BATCH_SIZE);
            let batchCount = 0;
            
            for (let currentStart = startBlock; currentStart <= currentBlock; currentStart += BATCH_SIZE) {
                const currentEnd = Math.min(currentStart + BATCH_SIZE - 1, currentBlock);
                batchCount++;
                
                // Log progress every 10 batches to avoid spam
                if (batchCount % 10 === 0 || batchCount === totalBatches) {
                    console.log(`[TreasuryEventService] Progress: ${batchCount}/${totalBatches} batches (${Math.round(batchCount/totalBatches*100)}%)`);
                }

                for (const eventFilter of eventFilters) {
                    try {
                        const logs = await this.contract.queryFilter(
                            eventFilter.filter,
                            currentStart,
                            currentEnd
                        );

                        for (const log of logs) {
                            const parsedEvent = await this.parseEventLog(log, eventFilter.name);
                            if (parsedEvent && this.isUserRelatedEvent(parsedEvent, userAddress)) {
                                const isDuplicate = events.some(
                                    e => e.transactionHash === parsedEvent.transactionHash && 
                                         e.eventType === parsedEvent.eventType
                                );
                                if (!isDuplicate) {
                                    events.push(parsedEvent);
                                }
                            }
                        }
                    } catch (error) {
                        console.error(`[TreasuryEventService] Error fetching ${eventFilter.name}:`, error);
                    }
                }
            }

            events.sort((a, b) => a.blockNumber - b.blockNumber);
            this.lastProcessedBlock = currentBlock;

            console.log(`[TreasuryEventService] Fetched ${events.length} past events`);
            return events;
        } catch (error) {
            console.error("[TreasuryEventService] Error fetching past events:", error);
            throw error;
        }
    }

    /**
     * Check if event is related to the user
     */
    private isUserRelatedEvent(event: TreasuryEvent, userAddress: string): boolean {
        const normalizedUser = userAddress.toLowerCase();
        const data = event.data;

        // Check common address fields
        if (data.staker?.toLowerCase() === normalizedUser) return true;
        if (data.voter?.toLowerCase() === normalizedUser) return true;
        if (data.proposer?.toLowerCase() === normalizedUser) return true;
        if (data.financier?.toLowerCase() === normalizedUser) return true;
        if (data.executor?.toLowerCase() === normalizedUser) return true;

        return false;
    }

    /**
     * Parse event log into TreasuryEvent structure
     */
    private async parseEventLog(log: ethers.Event, eventName: string): Promise<TreasuryEvent | null> {
        try {
            const block = await this.provider!.getBlock(log.blockNumber);
            
            let eventData: any = {};
            
            switch (eventName) {
                case "Staked":
                    eventData = {
                        staker: log.args?.staker,
                        amount: log.args?.amount,
                        votingPower: log.args?.votingPower,
                        currentApr: log.args?.currentApr,
                        deadline: log.args?.deadline,
                        isFinancier: log.args?.isFinancier,
                    };
                    break;

                case "Unstaked":
                    eventData = {
                        staker: log.args?.staker,
                        amount: log.args?.amount,
                        rewards: log.args?.rewards,
                    };
                    break;

                case "RewardsClaimed":
                case "RewardsDistributed":
                    eventData = {
                        staker: log.args?.staker,
                        amount: log.args?.amount,
                    };
                    break;

                case "FinancierStatusChanged":
                    eventData = {
                        staker: log.args?.staker,
                        isFinancier: log.args?.isFinancier,
                    };
                    break;

                case "CustomDeadlineSet":
                    eventData = {
                        staker: log.args?.staker,
                        deadline: log.args?.deadline,
                    };
                    break;

                case "EmergencyWithdrawn":
                    eventData = {
                        staker: log.args?.staker,
                        amount: log.args?.amount,
                        penalty: log.args?.penalty,
                    };
                    break;

                case "RewardRateUpdated":
                    eventData = {
                        oldRate: log.args?.oldRate,
                        newRate: log.args?.newRate,
                        totalStaked: log.args?.totalStaked,
                    };
                    break;

                case "StakingConfigUpdated":
                    eventData = {
                        parameter: log.args?.parameter,
                        oldValue: log.args?.oldValue,
                        newValue: log.args?.newValue,
                    };
                    break;

                case "ProposalCreated":
                    eventData = {
                        proposalId: log.args?.proposalId,
                        category: log.args?.category,
                        title: log.args?.title,
                        proposer: log.args?.proposer,
                        votingDeadline: log.args?.votingDeadline,
                    };
                    break;

                case "ProposalVoteCast":
                    eventData = {
                        proposalId: log.args?.proposalId,
                        voter: log.args?.voter,
                        support: log.args?.support,
                        votingPower: log.args?.votingPower,
                    };
                    break;

                case "ProposalStatusChanged":
                    eventData = {
                        proposalId: log.args?.proposalId,
                        newStatus: log.args?.newStatus,
                    };
                    break;

                case "ProposalExecuted":
                    eventData = {
                        proposalId: log.args?.proposalId,
                        executor: log.args?.executor,
                    };
                    break;

                case "FinancierRevocationRequested":
                case "FinancierRevocationCancelled":
                case "FinancierRevocationCompleted":
                    eventData = {
                        financier: log.args?.financier,
                        requestTime: log.args?.requestTime,
                        completionTime: log.args?.completionTime,
                    };
                    break;

                default:
                    console.warn(`Unknown event type: ${eventName}`);
                    return null;
            }

            return {
                eventType: eventName as TreasuryEvent["eventType"],
                blockNumber: log.blockNumber,
                transactionHash: log.transactionHash,
                timestamp: block.timestamp,
                data: eventData,
            };
        } catch (error) {
            console.error(`[TreasuryEventService] Error parsing ${eventName}:`, error);
            return null;
        }
    }

    /**
     * Start listening for real-time events
     */
    public startListening(userAddress: string, callback: EventCallback): void {
        if (!this.contract) {
            throw new Error("Service not initialized. Call setNetwork first.");
        }

        if (this.isListening) {
            console.log("[TreasuryEventService] Already listening for events");
            return;
        }

        console.log("[TreasuryEventService] Starting real-time event listeners");
        this.isListening = true;

        // Store callback
        const callbacks = this.eventCallbacks.get(userAddress) || [];
        callbacks.push(callback);
        this.eventCallbacks.set(userAddress, callbacks);

        // Setup listeners for all event types
        const eventNames: TreasuryEvent["eventType"][] = [
            "Staked",
            "Unstaked",
            "RewardsClaimed",
            "RewardsDistributed",
            "FinancierStatusChanged",
            "CustomDeadlineSet",
            "EmergencyWithdrawn",
            "RewardRateUpdated",
            "StakingConfigUpdated",
            "ProposalCreated",
            "ProposalVoteCast",
            "ProposalStatusChanged",
            "ProposalExecuted",
            "FinancierRevocationRequested",
            "FinancierRevocationCancelled",
            "FinancierRevocationCompleted",
        ];

        for (const eventName of eventNames) {
            this.contract.on(eventName, async (...args) => {
                try {
                    const event = args[args.length - 1];
                    const parsedEvent = await this.parseEventLog(event, eventName);
                    
                    if (parsedEvent && this.isUserRelatedEvent(parsedEvent, userAddress)) {
                        console.log(`[TreasuryEventService] New ${eventName} event`);
                        
                        const callbacks = this.eventCallbacks.get(userAddress) || [];
                        callbacks.forEach(cb => cb(parsedEvent));
                    }
                } catch (error) {
                    console.error(`[TreasuryEventService] Error processing ${eventName}:`, error);
                }
            });
        }

        console.log("[TreasuryEventService] Real-time listeners activated");
    }

    /**
     * Stop listening for real-time events
     */
    public stopListening(): void {
        if (!this.isListening || !this.contract) {
            return;
        }

        console.log("[TreasuryEventService] Stopping event listeners");
        this.contract.removeAllListeners();
        this.eventCallbacks.clear();
        this.isListening = false;
    }

    /**
     * Get the last processed block number
     */
    public getLastProcessedBlock(): number {
        return this.lastProcessedBlock;
    }

    /**
     * Check if currently listening
     */
    public getIsListening(): boolean {
        return this.isListening;
    }
}

export const treasuryEventService = TreasuryEventService.getInstance();
