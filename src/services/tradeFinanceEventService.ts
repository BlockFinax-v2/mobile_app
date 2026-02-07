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
     * 🚀 BUNDLED LOGS: Fetches all event types in a single RPC call using topic arrays
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

        try {
            const events: PGAEvent[] = [];
            const currentBlock = typeof toBlock === "string" ? await this.provider.getBlockNumber() : toBlock;

            let startBlock = fromBlock === "earliest" ? 0 : fromBlock;

            const totalBlocksRequested = currentBlock - startBlock;
            if (totalBlocksRequested > maxBlockRange) {
                startBlock = currentBlock - maxBlockRange;
            }

            // High performance batching: Alchemy free tier allows 10 block range
            const BATCH_SIZE = 10;
            const totalBatches = Math.ceil((currentBlock - startBlock + 1) / BATCH_SIZE);

            // Generate topic list for all tracked events
            const eventNames = [
                "PGACreated", "PGAVoteCast", "PGAStatusChanged", "GuaranteeApproved",
                "SellerApprovalReceived", "CollateralPaid", "GoodsShipped", "BalancePaymentReceived",
                "CertificateIssued", "DeliveryAgreementCreated", "BuyerConsentGiven", "PGACompleted"
            ];

            const topics = [
                eventNames.map(name => this.contract!.interface.getEventTopic(name))
            ];

            for (let currentStart = startBlock; currentStart <= currentBlock; currentStart += BATCH_SIZE) {
                const currentEnd = Math.min(currentStart + BATCH_SIZE - 1, currentBlock);

                let retries = 0;
                while (retries < 3) {
                    try {
                        // ⚡ BUNDLED FETCH: Single call for all event types in this block range
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

            console.log(`[TradeFinanceEventService] ✅ Bundled fetch: ${events.length} events in ${(performance.now() - startTime).toFixed(0)}ms`);
            return events;
        } catch (error) {
            console.error("[TradeFinanceEventService] Error fetching past events:", error);
            throw error;
        }
    }

    /**
     * Optimized parsing from Log and ParsedLog
     */
    private async parseEventLogFromLog(log: ethers.providers.Log, parsedLog: ethers.utils.LogDescription): Promise<PGAEvent | null> {
        try {
            // Cache block timestamps? For now just fetch
            const block = await this.provider!.getBlock(log.blockNumber);

            return {
                eventType: parsedLog.name as PGAEvent["eventType"],
                pgaId: parsedLog.args.pgaId,
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
     * Check if event is related to the user (as buyer, seller, financier, or participant)
     * 
     * CRITICAL: Financiers should see ALL PGAs for voting!
     * This is temporarily returning true for all events until we can check financier status
     * The context layer will handle proper filtering based on user role
     */
    private isUserRelatedEvent(event: PGAEvent, userAddress: string): boolean {
        const normalizedUser = userAddress.toLowerCase();
        const data = event.data;

        // Check if user is directly involved
        if (data.buyer?.toLowerCase() === normalizedUser) return true;
        if (data.seller?.toLowerCase() === normalizedUser) return true;
        if (data.voter?.toLowerCase() === normalizedUser) return true;
        if (data.logisticPartner?.toLowerCase() === normalizedUser) return true;
        if (data.deliveryPerson?.toLowerCase() === normalizedUser) return true;

        // CRITICAL FIX: For PGACreated, GuaranteeApproved, and PGAVoteCast events,
        // ALL users should receive them because:
        // 1. Financiers need to see PGAs for voting (not included in buyer/seller)
        // 2. Context layer will filter based on actual user role
        // 3. This ensures cards appear for ALL relevant parties
        const eventsForAllUsers = [
            "PGACreated",
            "GuaranteeApproved", 
            "PGAVoteCast",
            "PGAStatusChanged"
        ];
        
        if (eventsForAllUsers.includes(event.eventType)) {
            console.log(`[TradeFinanceEventService] 🔔 Broadcasting ${event.eventType} to all users (PGA: ${event.pgaId})`);
            return true;
        }

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
     * ⚡ OPTIMIZED: Uses a single listener for all events to reduce RPC overhead
     */
    public startListening(userAddress: string, callback: EventCallback): void {
        if (!this.contract || !this.provider) {
            throw new Error("Service not initialized. Call setNetwork first.");
        }

        if (this.isListening) {
            return;
        }

        console.log("[TradeFinanceEventService] 🎧 Starting bundled real-time listener");
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
                    console.log(`[TradeFinanceEventService] 🔔 Real-time ${parsedLog.name}:`, parsedEvent.pgaId);
                    const currentCallbacks = this.eventCallbacks.get(userAddress) || [];
                    currentCallbacks.forEach(cb => cb(parsedEvent));
                }
            } catch (error) {
                // Silently ignore logs that don't belong to this interface
            }
        });

        console.log("[TradeFinanceEventService] ✅ Bundled listener activated");
    }

    /**
     * Stop listening for real-time events
     */
    public stopListening(): void {
        if (!this.isListening || !this.provider) {
            return;
        }

        console.log("[TradeFinanceEventService] 🛑 Stopping event listeners");
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

export const tradeFinanceEventService = TradeFinanceEventService.getInstance();
