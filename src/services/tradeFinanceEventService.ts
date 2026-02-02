import { ethers } from "ethers";
import { WalletNetwork } from "@/contexts/WalletContext";
import { DIAMOND_ADDRESSES } from "@/services/stakingService";

// TradeFinanceFacet Event ABI
const TRADE_FINANCE_EVENT_ABI = [
    "event PGACreated(string indexed pgaId, address indexed buyer, address indexed seller, uint256 tradeValue, uint256 guaranteeAmount, uint256 collateralAmount, uint256 duration, string metadataURI, uint256 votingDeadline, uint256 createdAt)",
    "event PGAVoteCast(string indexed pgaId, address indexed voter, bool support, uint256 votingPower, uint256 timestamp)",
    "event PGAStatusChanged(string indexed pgaId, uint8 oldStatus, uint8 newStatus, uint256 timestamp)",
    "event GuaranteeApproved(string indexed pgaId, address indexed buyer, address indexed seller, string companyName, string registrationNumber, string tradeDescription, uint256 tradeValue, uint256 guaranteeAmount, uint256 duration, string beneficiaryName, address beneficiaryWallet, uint256 timestamp)",
    "event SellerApprovalReceived(string indexed pgaId, address indexed seller, uint256 timestamp)",
    "event CollateralPaid(string indexed pgaId, address indexed buyer, uint256 collateralAmount, uint256 timestamp)",
    "event GoodsShipped(string indexed pgaId, address indexed logisticPartner, string logisticPartnerName, uint256 timestamp)",
    "event BalancePaymentReceived(string indexed pgaId, address indexed buyer, uint256 balanceAmount, uint256 timestamp)",
    "event CertificateIssued(string indexed pgaId, string certificateNumber, uint256 issueDate, address indexed buyer, address indexed seller, uint256 tradeValue, uint256 guaranteeAmount, uint256 validityDays, string blockchainNetwork, address smartContract)",
    "event DeliveryAgreementCreated(string indexed agreementId, string indexed pgaId, address indexed deliveryPerson, address buyer, uint256 createdAt, uint256 deadline, string deliveryNotes)",
    "event BuyerConsentGiven(string indexed agreementId, string indexed pgaId, address indexed buyer, uint256 timestamp)",
    "event PGACompleted(string indexed pgaId, address indexed buyer, address indexed seller, uint256 completedAt)"
];

export interface PGAEvent {
    eventType: 
        | "PGACreated"
        | "PGAVoteCast"
        | "PGAStatusChanged"
        | "GuaranteeApproved"
        | "SellerApprovalReceived"
        | "CollateralPaid"
        | "GoodsShipped"
        | "BalancePaymentReceived"
        | "CertificateIssued"
        | "DeliveryAgreementCreated"
        | "BuyerConsentGiven"
        | "PGACompleted";
    pgaId: string;
    blockNumber: number;
    transactionHash: string;
    timestamp: number;
    data: any;
}

type EventCallback = (event: PGAEvent) => void;

class TradeFinanceEventService {
    private static instance: TradeFinanceEventService;
    private currentChainId: number = 4202;
    private currentNetworkConfig: WalletNetwork | null = null;
    private provider: ethers.providers.JsonRpcProvider | null = null;
    private contract: ethers.Contract | null = null;
    private eventListeners: Map<string, ethers.Contract> = new Map();
    private eventCallbacks: Map<string, EventCallback[]> = new Map();
    private lastProcessedBlock: number = 0;
    private isListening: boolean = false;

    public static getInstance(): TradeFinanceEventService {
        if (!TradeFinanceEventService.instance) {
            TradeFinanceEventService.instance = new TradeFinanceEventService();
        }
        return TradeFinanceEventService.instance;
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
            console.log(`[TradeFinanceEventService] No Diamond for chainId ${chainId}. Events disabled.`);
            return;
        }
        this.contract = new ethers.Contract(
            diamondAddress,
            TRADE_FINANCE_EVENT_ABI,
            this.provider
        );
        this.lastProcessedBlock = 0;
        console.log(`[TradeFinanceEventService] Network switched to chainId: ${chainId}`);
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
     * 📊 PROGRESS TRACKING: Reports sync progress for better UX
     * 
     * @param userAddress - The wallet address to filter events for
     * @param fromBlock - Starting block number (0 for genesis, or specific block)
     * @param toBlock - Ending block number ("latest" for current)
     * @param maxBlockRange - Maximum blocks to fetch in total (default 1000 for free tier)
     */
    public async fetchPastEvents(
        userAddress: string,
        fromBlock: number | "earliest" = 0,
        toBlock: number | "latest" = "latest",
        maxBlockRange: number = 1000
    ): Promise<PGAEvent[]> {
        if (!this.contract || !this.provider) {
            console.log("[TradeFinanceEventService] ⚠️ No contract/provider - skipping event fetch");
            return [];
        }

        const startTime = performance.now();
        console.log(`[TradeFinanceEventService] 🔄 Fetching events: blocks ${fromBlock} → ${toBlock}`);

        try {
            const events: PGAEvent[] = [];
            const currentBlock = typeof toBlock === "string" ? await this.provider.getBlockNumber() : toBlock;
            
            // Determine the starting block
            let startBlock = fromBlock === "earliest" ? 0 : fromBlock;
            
            // SMART LIMIT: Cap total block range to avoid excessive API calls
            const totalBlocksRequested = currentBlock - startBlock;
            if (totalBlocksRequested > maxBlockRange) {
                console.log(
                    `[TradeFinanceEventService] 📊 Limiting scan: ${totalBlocksRequested} blocks → ${maxBlockRange} blocks (most recent)`,
                );
                startBlock = currentBlock - maxBlockRange;
            }

            // ⚡ OPTIMIZED BATCH SIZE: Modern RPC providers can handle 2000-5000 blocks per query
            // Alchemy/Infura free tier: 2000 blocks is safe and 200x faster than 10 blocks
            const BATCH_SIZE = 2000;
            const totalBatches = Math.ceil((currentBlock - startBlock + 1) / BATCH_SIZE);
            
            console.log(
                `[TradeFinanceEventService] 📊 Optimized batch plan: ${totalBatches} batches × ${BATCH_SIZE} blocks = ${currentBlock - startBlock + 1} blocks`,
            );

            
            // Define all event filters - Only use indexed parameters
            // For simplicity and to avoid filter errors, we fetch all events and filter in code
            const eventFilters = [
                {
                    name: "PGACreated",
                    filter: this.contract.filters.PGACreated(),
                },
                {
                    name: "GuaranteeApproved",
                    filter: this.contract.filters.GuaranteeApproved(),
                },
                {
                    name: "PGAStatusChanged",
                    filter: this.contract.filters.PGAStatusChanged(),
                },
                {
                    name: "SellerApprovalReceived",
                    filter: this.contract.filters.SellerApprovalReceived(),
                },
                {
                    name: "CollateralPaid",
                    filter: this.contract.filters.CollateralPaid(),
                },
                {
                    name: "GoodsShipped",
                    filter: this.contract.filters.GoodsShipped(),
                },
                {
                    name: "BalancePaymentReceived",
                    filter: this.contract.filters.BalancePaymentReceived(),
                },
                {
                    name: "CertificateIssued",
                    filter: this.contract.filters.CertificateIssued(),
                },
                {
                    name: "DeliveryAgreementCreated",
                    filter: this.contract.filters.DeliveryAgreementCreated(),
                },
                {
                    name: "BuyerConsentGiven",
                    filter: this.contract.filters.BuyerConsentGiven(),
                },
                {
                    name: "PGACompleted",
                    filter: this.contract.filters.PGACompleted(),
                },
                {
                    name: "PGAVoteCast",
                    filter: this.contract.filters.PGAVoteCast(),
                },
            ];

            // SYSTEMATIC BATCHING: Process blocks in small chunks to avoid RPC limits
            let batchCount = 0;
            let eventCount = 0;
            
            for (let currentStart = startBlock; currentStart <= currentBlock; currentStart += BATCH_SIZE) {
                const currentEnd = Math.min(currentStart + BATCH_SIZE - 1, currentBlock);
                batchCount++;
                
                // PROGRESS REPORTING: Log every 5 batches or at completion (since batches are larger now)
                const shouldLog = batchCount % 5 === 0 || batchCount === totalBatches;
                if (shouldLog) {
                    const progress = Math.round((batchCount / totalBatches) * 100);
                    console.log(
                        `[TradeFinanceEventService] ⏳ Progress: ${batchCount}/${totalBatches} (${progress}%) - ${eventCount} events found`,
                    );
                }

                for (const eventFilter of eventFilters) {
                    try {
                        // Fetch all events (no user filtering at query level)
                        const logs = await this.contract.queryFilter(
                            eventFilter.filter,
                            currentStart,
                            currentEnd
                        );

                        // Process events and filter for user
                        for (const log of logs) {
                            const parsedEvent = await this.parseEventLog(log, eventFilter.name);
                            if (parsedEvent && this.isUserRelatedEvent(parsedEvent, userAddress)) {
                                // Check for duplicates before adding
                                const isDuplicate = events.some(
                                    e => e.transactionHash === parsedEvent.transactionHash && 
                                         e.eventType === parsedEvent.eventType
                                );
                                if (!isDuplicate) {
                                    events.push(parsedEvent);
                                    eventCount++; // Track progress
                                }
                            }
                        }
                    } catch (error) {
                        console.error(`[TradeFinanceEventService] ⚠️ Error fetching ${eventFilter.name}:`, error);
                    }
                }
            }

            // Sort events by block number and transaction index
            events.sort((a, b) => a.blockNumber - b.blockNumber);

            // Update last processed block
            this.lastProcessedBlock = currentBlock;

            const fetchTime = performance.now() - startTime;
            console.log(
                `[TradeFinanceEventService] ✅ Fetched ${events.length} events in ${fetchTime.toFixed(0)}ms (${totalBatches} batches)`,
            );
            return events;
        } catch (error) {
            console.error("[TradeFinanceEventService] Error fetching past events:", error);
            throw error;
        }
    }

    /**
     * Check if event is related to the user (as buyer, seller, or participant)
     */
    private isUserRelatedEvent(event: PGAEvent, userAddress: string): boolean {
        const normalizedUser = userAddress.toLowerCase();
        const data = event.data;

        // Check common address fields
        if (data.buyer?.toLowerCase() === normalizedUser) return true;
        if (data.seller?.toLowerCase() === normalizedUser) return true;
        if (data.voter?.toLowerCase() === normalizedUser) return true;
        if (data.logisticPartner?.toLowerCase() === normalizedUser) return true;
        if (data.deliveryPerson?.toLowerCase() === normalizedUser) return true;

        return false;
    }

    /**
     * Parse event log into PGAEvent structure
     */
    private async parseEventLog(log: ethers.Event, eventName: string): Promise<PGAEvent | null> {
        try {
            const block = await this.provider!.getBlock(log.blockNumber);
            
            let eventData: any = {};
            
            switch (eventName) {
                case "PGACreated":
                    eventData = {
                        pgaId: log.args?.pgaId,
                        buyer: log.args?.buyer,
                        seller: log.args?.seller,
                        tradeValue: log.args?.tradeValue,
                        guaranteeAmount: log.args?.guaranteeAmount,
                        collateralAmount: log.args?.collateralAmount,
                        duration: log.args?.duration,
                        metadataURI: log.args?.metadataURI,
                        votingDeadline: log.args?.votingDeadline,
                        createdAt: log.args?.createdAt,
                    };
                    break;

                case "PGAVoteCast":
                    eventData = {
                        pgaId: log.args?.pgaId,
                        voter: log.args?.voter,
                        support: log.args?.support,
                        votingPower: log.args?.votingPower,
                    };
                    break;

                case "PGAStatusChanged":
                    eventData = {
                        pgaId: log.args?.pgaId,
                        oldStatus: log.args?.oldStatus,
                        newStatus: log.args?.newStatus,
                    };
                    break;

                case "GuaranteeApproved":
                    eventData = {
                        pgaId: log.args?.pgaId,
                        buyer: log.args?.buyer,
                        seller: log.args?.seller,
                        companyName: log.args?.companyName,
                        registrationNumber: log.args?.registrationNumber,
                        tradeDescription: log.args?.tradeDescription,
                        tradeValue: log.args?.tradeValue,
                        guaranteeAmount: log.args?.guaranteeAmount,
                        duration: log.args?.duration,
                        beneficiaryName: log.args?.beneficiaryName,
                        beneficiaryWallet: log.args?.beneficiaryWallet,
                    };
                    break;

                case "SellerApprovalReceived":
                    eventData = {
                        pgaId: log.args?.pgaId,
                        seller: log.args?.seller,
                    };
                    break;

                case "CollateralPaid":
                    eventData = {
                        pgaId: log.args?.pgaId,
                        buyer: log.args?.buyer,
                        collateralAmount: log.args?.collateralAmount,
                    };
                    break;

                case "GoodsShipped":
                    eventData = {
                        pgaId: log.args?.pgaId,
                        logisticPartner: log.args?.logisticPartner,
                        logisticPartnerName: log.args?.logisticPartnerName,
                    };
                    break;

                case "BalancePaymentReceived":
                    eventData = {
                        pgaId: log.args?.pgaId,
                        buyer: log.args?.buyer,
                        balanceAmount: log.args?.balanceAmount,
                    };
                    break;

                case "CertificateIssued":
                    eventData = {
                        pgaId: log.args?.pgaId,
                        certificateNumber: log.args?.certificateNumber,
                        issueDate: log.args?.issueDate,
                        buyer: log.args?.buyer,
                        seller: log.args?.seller,
                        tradeValue: log.args?.tradeValue,
                        guaranteeAmount: log.args?.guaranteeAmount,
                        validityDays: log.args?.validityDays,
                        blockchainNetwork: log.args?.blockchainNetwork,
                        smartContract: log.args?.smartContract,
                    };
                    break;

                case "DeliveryAgreementCreated":
                    eventData = {
                        agreementId: log.args?.agreementId,
                        pgaId: log.args?.pgaId,
                        deliveryPerson: log.args?.deliveryPerson,
                        buyer: log.args?.buyer,
                        createdAt: log.args?.createdAt,
                        deadline: log.args?.deadline,
                        deliveryNotes: log.args?.deliveryNotes,
                    };
                    break;

                case "BuyerConsentGiven":
                    eventData = {
                        agreementId: log.args?.agreementId,
                        pgaId: log.args?.pgaId,
                        buyer: log.args?.buyer,
                    };
                    break;

                case "PGACompleted":
                    eventData = {
                        pgaId: log.args?.pgaId,
                        buyer: log.args?.buyer,
                        seller: log.args?.seller,
                        completedAt: log.args?.completedAt,
                    };
                    break;

                default:
                    console.warn(`Unknown event type: ${eventName}`);
                    return null;
            }

            return {
                eventType: eventName as PGAEvent["eventType"],
                pgaId: log.args?.pgaId || eventData.pgaId,
                blockNumber: log.blockNumber,
                transactionHash: log.transactionHash,
                timestamp: block.timestamp,
                data: eventData,
            };
        } catch (error) {
            console.error(`[TradeFinanceEventService] Error parsing ${eventName}:`, error);
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
            console.log("[TradeFinanceEventService] Already listening for events");
            return;
        }

        console.log("[TradeFinanceEventService] Starting real-time event listeners");
        this.isListening = true;

        // Store callback
        const callbacks = this.eventCallbacks.get(userAddress) || [];
        callbacks.push(callback);
        this.eventCallbacks.set(userAddress, callbacks);

        // Setup listeners for all event types
        const eventNames: PGAEvent["eventType"][] = [
            "PGACreated",
            "PGAVoteCast",
            "PGAStatusChanged",
            "GuaranteeApproved",
            "SellerApprovalReceived",
            "CollateralPaid",
            "GoodsShipped",
            "BalancePaymentReceived",
            "CertificateIssued",
            "DeliveryAgreementCreated",
            "BuyerConsentGiven",
            "PGACompleted",
        ];

        for (const eventName of eventNames) {
            this.contract.on(eventName, async (...args) => {
                try {
                    const event = args[args.length - 1]; // Last arg is always the event object
                    const parsedEvent = await this.parseEventLog(event, eventName);
                    
                    if (parsedEvent && this.isUserRelatedEvent(parsedEvent, userAddress)) {
                        console.log(`[TradeFinanceEventService] New ${eventName} event:`, parsedEvent.pgaId);
                        
                        // Notify all callbacks
                        const callbacks = this.eventCallbacks.get(userAddress) || [];
                        callbacks.forEach(cb => cb(parsedEvent));
                    }
                } catch (error) {
                    console.error(`[TradeFinanceEventService] Error processing ${eventName}:`, error);
                }
            });
        }

        console.log("[TradeFinanceEventService] Real-time listeners activated");
    }

    /**
     * Stop listening for real-time events
     */
    public stopListening(): void {
        if (!this.isListening || !this.contract) {
            return;
        }

        console.log("[TradeFinanceEventService] Stopping event listeners");
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

export const tradeFinanceEventService = TradeFinanceEventService.getInstance();
