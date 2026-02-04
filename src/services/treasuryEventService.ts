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
        const diamondAddress = this.getDiamondAddress();
        if (!diamondAddress) {
            this.contract = null;
            this.lastProcessedBlock = 0;
            console.log(`[TreasuryEventService] No Diamond for chainId ${chainId}. Events disabled.`);
            return;
        }
        this.contract = new ethers.Contract(
            diamondAddress,
            TREASURY_EVENT_ABI,
            this.provider
        );
        this.lastProcessedBlock = 0;
        console.log(`[TreasuryEventService] Network switched to chainId: ${chainId}`);
    }

    private getDiamondAddress(): string | null {
        if (this.currentNetworkConfig?.diamondAddress) {
            return this.currentNetworkConfig.diamondAddress;
        }
        const address = DIAMOND_ADDRESSES[this.currentChainId];
        return address || null;
    }

    /**
     * Fetch historical events from the blockchain with optimized block range management
     * ⚡ SMART BATCHING: Automatically manages block ranges to avoid RPC limits
     * 🚀 BUNDLED LOGS: Fetches all event types in a single RPC call using topic arrays
     */
    public async fetchPastEvents(
        userAddress: string,
        fromBlock: number | "earliest" = 0,
        toBlock: number | "latest" = "latest",
        maxBlockRange: number = 1000
    ): Promise<TreasuryEvent[]> {
        if (!this.contract || !this.provider) {
            return [];
        }

        const startTime = performance.now();

        try {
            const events: TreasuryEvent[] = [];
            const currentBlock = typeof toBlock === "string" ? await this.provider.getBlockNumber() : toBlock;
            let startBlock = fromBlock === "earliest" ? 0 : fromBlock;

            const totalBlocksRequested = currentBlock - startBlock;
            if (totalBlocksRequested > maxBlockRange) {
                startBlock = currentBlock - maxBlockRange;
            }

            // High performance batching: Alchemy free tier allows 10-100 blocks
            const BATCH_SIZE = 100;

            // Generate topic list for all tracked events
            const eventNames = [
                "Staked", "Unstaked", "RewardsClaimed", "RewardsDistributed",
                "FinancierStatusChanged", "CustomDeadlineSet", "EmergencyWithdrawn",
                "RewardRateUpdated", "StakingConfigUpdated", "ProposalCreated",
                "ProposalVoteCast", "ProposalStatusChanged", "ProposalExecuted",
                "FinancierRevocationRequested", "FinancierRevocationCancelled",
                "FinancierRevocationCompleted"
            ];

            const topics = [
                eventNames.map(name => this.contract!.interface.getEventTopic(name))
            ];

            for (let currentStart = startBlock; currentStart <= currentBlock; currentStart += BATCH_SIZE) {
                const currentEnd = Math.min(currentStart + BATCH_SIZE - 1, currentBlock);

                let retries = 0;
                while (retries < 3) {
                    try {
                        // ⚡ BUNDLED FETCH: Single call for all treasury event types
                        const logs = await this.provider.getLogs({
                            address: this.contract.address,
                            fromBlock: currentStart,
                            toBlock: currentEnd,
                            topics: topics
                        });

                        for (const log of logs) {
                            const parsedLog = this.contract.interface.parseLog(log);
                            const parsedEvent = await this.parseEventLogFromLog(log, parsedLog);

                            if (parsedEvent && this.isUserRelatedEvent(parsedEvent, userAddress)) {
                                events.push(parsedEvent);
                            }
                        }
                        break;
                    } catch (error: any) {
                        retries++;
                        if (retries === 3) throw error;
                        await new Promise(r => setTimeout(r, 1000 * retries));
                    }
                }
            }

            events.sort((a, b) => a.blockNumber - b.blockNumber || a.transactionHash.localeCompare(b.transactionHash));
            this.lastProcessedBlock = currentBlock;

            console.log(`[TreasuryEventService] ✅ Bundled fetch: ${events.length} events in ${(performance.now() - startTime).toFixed(0)}ms`);
            return events;
        } catch (error) {
            console.error("[TreasuryEventService] Error fetching past events:", error);
            throw error;
        }
    }

    /**
     * Optimized parsing from Log and ParsedLog
     */
    private async parseEventLogFromLog(log: ethers.providers.Log, parsedLog: ethers.utils.LogDescription): Promise<TreasuryEvent | null> {
        try {
            const block = await this.provider!.getBlock(log.blockNumber);

            return {
                eventType: parsedLog.name as TreasuryEvent["eventType"],
                blockNumber: log.blockNumber,
                transactionHash: log.transactionHash,
                timestamp: block.timestamp,
                data: parsedLog.args,
            };
        } catch (error) {
            return null;
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
     * ⚡ OPTIMIZED: Uses a single listener for all events to reduce RPC overhead
     */
    public startListening(userAddress: string, callback: EventCallback): void {
        if (!this.contract || !this.provider) {
            throw new Error("Service not initialized. Call setNetwork first.");
        }

        if (this.isListening) {
            return;
        }

        console.log("[TreasuryEventService] 🎧 Starting bundled real-time listener");
        this.isListening = true;

        // Store callback
        const callbacks = this.eventCallbacks.get(userAddress) || [];
        callbacks.push(callback);
        this.eventCallbacks.set(userAddress, callbacks);

        // Setup SINGLE listener for all events from this contract
        const filter = {
            address: this.contract.address,
        };

        this.provider.on(filter, async (log: ethers.providers.Log) => {
            try {
                const parsedLog = this.contract!.interface.parseLog(log);
                const parsedEvent = await this.parseEventLogFromLog(log, parsedLog);

                if (parsedEvent && this.isUserRelatedEvent(parsedEvent, userAddress)) {
                    console.log(`[TreasuryEventService] 🔔 Real-time ${parsedLog.name}`);
                    const currentCallbacks = this.eventCallbacks.get(userAddress) || [];
                    currentCallbacks.forEach(cb => cb(parsedEvent));
                }
            } catch (error) {
                // Silently ignore logs that don't belong to this interface
            }
        });

        console.log("[TreasuryEventService] ✅ Bundled listener activated");
    }

    /**
     * Stop listening for real-time events
     */
    public stopListening(): void {
        if (!this.isListening || !this.provider) {
            return;
        }

        console.log("[TreasuryEventService] 🛑 Stopping event listeners");
        if (this.contract) {
            const filter = {
                address: this.contract.address,
            };
            this.provider.removeAllListeners(filter);
        }
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
