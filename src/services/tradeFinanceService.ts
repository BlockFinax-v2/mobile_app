import { WalletNetwork } from "@/contexts/WalletContext";
import { secureStorage } from "@/utils/secureStorage";
import { ethers } from "ethers";
import { FEATURE_FLAGS } from "@/config/featureFlags";
import { isAlchemyNetworkSupported, isConfiguredInAlchemyDashboard } from "@/config/alchemyAccount";
import { AlchemyAccountService } from "@/services/alchemyAccountService";
import { smartContractTransactionService } from "@/services/smartContractTransactionService";
import { DIAMOND_ADDRESSES } from "@/services/stakingService";

// TradeFinanceFacet ABI
const TRADE_FINANCE_FACET_ABI = [
    "error ContractPaused()",
    "error NotAuthorized()",
    "error NotFinancier()",
    "error InvalidPGAId()",
    "error InvalidAddress()",
    "error InvalidAmount()",
    "error InvalidDuration()",
    "error InvalidString()",
    "error PGAAlreadyExists()",
    "error PGANotFound()",
    "error PGANotActive()",
    "error PGANotApproved()",
    "error PGAExpired()",
    "error VotingPeriodEnded()",
    "error VotingPeriodNotEnded()",
    "error AlreadyVoted()",
    "error OnlySellerAllowed()",
    "error OnlyBuyerAllowed()",
    "error OnlyLogisticsPartner()",
    "error CollateralAlreadyPaid()",
    "error CollateralNotPaid()",
    "error BalanceAlreadyPaid()",
    "error GoodsNotShipped()",
    "error CertificateAlreadyIssued()",
    "error InvalidPGAStatus()",
    "error InsufficientBalance()",
    "error InsufficientAllowance()",
    "error TransferFailed()",
    "error DeliveryAgreementExists()",
    "error DeliveryAgreementNotFound()",
    "error BuyerConsentAlreadyGiven()",
    "error ZeroAddress()",
    "error InvalidVotingPower()",
    "error ExcessiveAmount()",
    "error IssuanceFeeAlreadyPaid()",
    "error IssuanceFeeNotPaid()",
    "error BlockFinaxAddressNotSet()",

    "event PGACreated(string indexed pgaId, address indexed buyer, address indexed seller, uint256 tradeValue, uint256 guaranteeAmount, uint256 collateralAmount, uint256 duration, string metadataURI, uint256 votingDeadline, uint256 createdAt)",
    "event PGAVoteCast(string indexed pgaId, address indexed voter, bool support, uint256 votingPower, uint256 timestamp)",
    "event PGAStatusChanged(string indexed pgaId, uint8 oldStatus, uint8 newStatus, uint256 timestamp)",
    "event GuaranteeApproved(string indexed pgaId, address indexed buyer, address indexed seller, string companyName, string registrationNumber, string tradeDescription, uint256 tradeValue, uint256 guaranteeAmount, uint256 duration, string beneficiaryName, address beneficiaryWallet, uint256 timestamp)",
    "event SellerApprovalReceived(string indexed pgaId, address indexed seller, uint256 timestamp)",
    "event CollateralPaid(string indexed pgaId, address indexed buyer, uint256 collateralAmount, uint256 timestamp)",
    "event GoodsShipped(string indexed pgaId, address indexed logisticPartner, string logisticPartnerName, uint256 timestamp)",
    "event BalancePaymentReceived(string indexed pgaId, address indexed buyer, uint256 balanceAmount, uint256 timestamp)",
    "event CertificateIssued(string indexed pgaId, string certificateNumber, uint256 issueDate, address indexed buyer, address indexed seller, uint256 tradeValue, uint256 guaranteeAmount, uint256 validityDays, string blockchainNetwork, address smartContract)",
    "event IssuanceFeePaid(string indexed pgaId, address indexed buyer, address indexed blockfinaxAddress, uint256 feeAmount, uint256 timestamp)",
    "event DeliveryAgreementCreated(string indexed agreementId, string indexed pgaId, address indexed deliveryPerson, address buyer, uint256 createdAt, uint256 deadline, string deliveryNotes)",
    "event BuyerConsentGiven(string indexed agreementId, string indexed pgaId, address indexed buyer, uint256 timestamp)",
    "event PGACompleted(string indexed pgaId, address indexed buyer, address indexed seller, uint256 completedAt)",

    "function createPGA(string pgaId, address seller, string companyName, string registrationNumber, string tradeDescription, uint256 tradeValue, uint256 guaranteeAmount, uint256 collateralAmount, uint256 duration, string beneficiaryName, address beneficiaryWallet, string metadataURI, string[] documentURIs) external",
    "function voteOnPGA(string pgaId, bool support) external",
    "function sellerVoteOnPGA(string pgaId, bool approve) external",
    "function payCollateral(string pgaId) external",
    "function payIssuanceFee(string pgaId) external",
    "function confirmGoodsShipped(string pgaId, string logisticPartnerName) external",
    "function payBalancePayment(string pgaId) external",
    "function issueCertificate(string pgaId) external",
    "function createDeliveryAgreement(string agreementId, string pgaId, uint256 agreementDeadline, string deliveryNotes, string deliveryProofURI) external",
    "function buyerConsentToDelivery(string agreementId, bool consent) external",
    "function releasePaymentToSeller(string pgaId) external",
    "function refundCollateral(string pgaId) external",
    "function cancelPGA(string pgaId) external",
    "function getPGA(string pgaId) external view returns (string _pgaId, address buyer, address seller, uint256 tradeValue, uint256 guaranteeAmount, uint256 collateralAmount, uint256 duration, uint256 votesFor, uint256 votesAgainst, uint256 createdAt, uint256 votingDeadline, uint8 status, bool collateralPaid, bool issuanceFeePaid, bool balancePaymentPaid, bool goodsShipped, string logisticPartner, uint256 certificateIssuedAt, string deliveryAgreementId, string metadataURI, string companyName, string registrationNumber, string tradeDescription, string beneficiaryName, address beneficiaryWallet, string[] uploadedDocuments)",
    "function getPGADocuments(string pgaId) external view returns (string[] memory)",
    "function getAllPGAs() external view returns (string[] memory)",
    "function getActivePGAs() external view returns (string[] memory)",
    "function getPGAsByBuyer(address buyer) external view returns (string[] memory)",
    "function getPGAsBySeller(address seller) external view returns (string[] memory)",
    "function getDeliveryAgreement(string agreementId) external view returns (string pgaId, address deliveryPerson, address buyer, uint256 createdAt, uint256 deadline, bool buyerConsent, uint256 buyerSignedAt, string deliveryNotes, string deliveryProofURI)",
    "function getVoteStatusOnPGA(string pgaId, address voter) external view returns (bool hasVoted, bool support)",
    "function isAuthorizedLogisticsPartner(address partner) external view returns (bool)",
    "function isAuthorizedDeliveryPerson(address deliveryPerson) external view returns (bool)",
    "function getAllLogisticsPartners() external view returns (address[] memory)",
    "function getAllDeliveryPersons() external view returns (address[] memory)",
    "function hasSellerVoted(string pgaId) external view returns (bool)",
    "function getPGAStats() external view returns (uint256 totalPGAs, uint256 activePGAs, uint256 completedPGAs, uint256 rejectedPGAs)"
];

// ERC-20 ABI for USDC approval
const ERC20_ABI = [
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function balanceOf(address account) view returns (uint256)",
    "function decimals() view returns (uint8)"
];

export enum PGAStatus {
    None,
    Created,
    GuaranteeApproved,
    SellerApproved,
    CollateralPaid,
    GoodsShipped,
    BalancePaymentPaid,
    CertificateIssued,
    DeliveryAwaitingConsent,
    Completed,
    Rejected,
    Expired,
    Disputed
}

export interface PGAInfo {
    pgaId: string;
    buyer: string;
    seller: string;
    tradeValue: string;
    guaranteeAmount: string;
    collateralAmount: string;
    duration: number;
    votesFor: string;
    votesAgainst: string;
    createdAt: number;
    votingDeadline: number;
    status: PGAStatus;
    collateralPaid: boolean;
    issuanceFeePaid: boolean;
    balancePaymentPaid: boolean;
    goodsShipped: boolean;
    logisticPartner: string;
    certificateIssuedAt: number;
    deliveryAgreementId: string;
    metadataURI: string;
    tradeDescription: string;
    companyName: string;
    registrationNumber: string;
    beneficiaryName: string;
    beneficiaryWallet: string;
    documents: string[];
}

const MNEMONIC_KEY = "blockfinax.mnemonic";
const PASSWORD_KEY = "blockfinax.password";

class TradeFinanceService {
    private static instance: TradeFinanceService;
    private currentChainId: number = 4202; // Default to Lisk Sepolia
    private currentNetworkConfig: WalletNetwork | null = null;
    private currentSigner: ethers.Wallet | null = null;
    private tokenDecimalsCache: Map<string, number> = new Map();
    private metadataUnsupportedChains: Set<number> = new Set();
    
    // ⚡ PERFORMANCE: In-memory cache for PGA data
    private pgaCache: Map<string, { data: PGAInfo; timestamp: number }> = new Map();
    private readonly CACHE_TTL_MS = 30000; // 30 seconds cache

    public static getInstance(): TradeFinanceService {
        if (!TradeFinanceService.instance) {
            TradeFinanceService.instance = new TradeFinanceService();
        }
        return TradeFinanceService.instance;
    }

    public setNetwork(chainId: number, networkConfig: WalletNetwork): void {
        this.currentChainId = chainId;
        this.currentNetworkConfig = networkConfig;
        this.currentSigner = null;
        this.pgaCache.clear(); // Clear cache on network switch
        console.log(`[TradeFinanceService] Network switched to chainId: ${chainId}`);
    }

    /**
     * Clear PGA cache (useful for forcing refresh)
     */
    public clearCache(): void {
        this.pgaCache.clear();
        console.log('[TradeFinanceService] Cache cleared');
    }

    /**
     * Invalidate specific PGA cache entry
     */
    public invalidatePGACache(pgaId: string): void {
        this.pgaCache.delete(pgaId);
    }

    private async getSigner(): Promise<ethers.Wallet> {
        if (this.currentSigner) return this.currentSigner;

        try {
            const provider = new ethers.providers.JsonRpcProvider(this.currentNetworkConfig?.rpcUrl);

            // 1. Try mnemonic first
            const mnemonic = await secureStorage.getSecureItem(MNEMONIC_KEY);
            if (mnemonic) {
                const wallet = ethers.Wallet.fromMnemonic(mnemonic);
                this.currentSigner = wallet.connect(provider);
                return this.currentSigner;
            }

            // 2. Fallback to encrypted private key if mnemonic is not available
            const password = await secureStorage.getSecureItem(PASSWORD_KEY);
            if (password) {
                const privateKey = await secureStorage.getDecryptedPrivateKey(password);
                if (privateKey) {
                    const wallet = new ethers.Wallet(privateKey);
                    this.currentSigner = wallet.connect(provider);
                    return this.currentSigner;
                }
            }

            throw new Error("No wallet credentials found. Please ensure your wallet is unlocked.");
        } catch (error) {
            console.error("Error getting signer:", error);
            throw error;
        }
    }

    private getDiamondAddress(): string {
        if (this.currentNetworkConfig?.diamondAddress) {
            return this.currentNetworkConfig.diamondAddress;
        }
        const address = DIAMOND_ADDRESSES[this.currentChainId];
        if (!address) throw new Error(`No Diamond contract for network ${this.currentChainId}`);
        return address;
    }

    private async getContract(): Promise<ethers.Contract> {
        const signer = await this.getSigner();
        return new ethers.Contract(this.getDiamondAddress(), TRADE_FINANCE_FACET_ABI, signer);
    }

    private async getUSDCContract(): Promise<ethers.Contract> {
        const signer = await this.getSigner();
        // Use the native stablecoin for the current network as the primary token
        const usdcAddress = this.currentNetworkConfig?.stablecoins?.[0]?.address;
        if (!usdcAddress) throw new Error(`Primary payment token not found for network ${this.currentNetworkConfig?.name}`);
        return new ethers.Contract(usdcAddress, ERC20_ABI, signer);
    }

    private async getTokenDecimals(tokenAddress: string): Promise<number> {
        if (!tokenAddress || tokenAddress === ethers.constants.AddressZero) return 18;
        const key = tokenAddress.toLowerCase();
        if (this.tokenDecimalsCache.has(key)) return this.tokenDecimalsCache.get(key)!;

        try {
            const signer = await this.getSigner();
            const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
            const decimals = await tokenContract.decimals();
            this.tokenDecimalsCache.set(key, decimals);
            return decimals;
        } catch (error) {
            return 18;
        }
    }

    private async getPrimaryTokenDecimals(): Promise<number> {
        const usdcAddress = this.currentNetworkConfig?.stablecoins?.[0]?.address;
        if (!usdcAddress) return 18;
        return this.getTokenDecimals(usdcAddress);
    }

    public async getPGA(pgaId: string, skipCache: boolean = false): Promise<PGAInfo> {
        // ⚡ Check cache first (unless explicitly skipped)
        if (!skipCache) {
            const cached = this.pgaCache.get(pgaId);
            if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
                return cached.data;
            }
        }

        const contract = await this.getContract();
        const data = await contract.getPGA(pgaId);
        const decimals = await this.getPrimaryTokenDecimals();

        // ✅ FIX: Unified return with 26 fields
        // [0] _pgaId, [1] buyer, [2] seller, [3] tradeValue, [4] guaranteeAmount, 
        // [5] collateralAmount, [6] duration, [7] votesFor, [8] votesAgainst, 
        // [9] createdAt, [10] votingDeadline, [11] status, [12] collateralPaid, 
        // [13] issuanceFeePaid, [14] balancePaymentPaid, [15] goodsShipped, 
        // [16] logisticPartner, [17] certificateIssuedAt, [18] deliveryAgreementId, [19] metadataURI,
        // [20] companyName, [21] registrationNumber, [22] tradeDescription,
        // [23] beneficiaryName, [24] beneficiaryWallet, [25] uploadedDocuments
        const pgaInfo: PGAInfo = {
            pgaId: data[0],                                                    // string pgaId
            buyer: data[1],                                                    // address buyer
            seller: data[2],                                                   // address seller
            tradeValue: ethers.utils.formatUnits(data[3], decimals),           // uint256 tradeValue
            guaranteeAmount: ethers.utils.formatUnits(data[4], decimals),      // uint256 guaranteeAmount
            collateralAmount: ethers.utils.formatUnits(data[5], decimals),     // uint256 collateralAmount
            duration: data[6].toNumber(),                                      // uint256 duration
            votesFor: ethers.utils.formatUnits(data[7], decimals),             // uint256 votesFor
            votesAgainst: ethers.utils.formatUnits(data[8], decimals),         // uint256 votesAgainst
            createdAt: data[9].toNumber(),                                     // uint256 createdAt
            votingDeadline: data[10].toNumber(),                               // uint256 votingDeadline
            status: data[11] as PGAStatus,                                     // PGAStatus status
            collateralPaid: data[12],                                          // bool collateralPaid
            issuanceFeePaid: data[13],                                         // bool issuanceFeePaid
            balancePaymentPaid: data[14],                                      // bool balancePaymentPaid
            goodsShipped: data[15],                                            // bool goodsShipped
            logisticPartner: data[16],                                         // string logisticPartner
            certificateIssuedAt: data[17].toNumber(),                          // uint256 certificateIssuedAt
            deliveryAgreementId: data[18],                                     // string deliveryAgreementId
            metadataURI: data[19],                                             // string metadataURI
            companyName: data[20],                                             // string companyName
            registrationNumber: data[21],                                      // string registrationNumber
            tradeDescription: data[22],                                        // string tradeDescription
            beneficiaryName: data[23],                                         // string beneficiaryName
            beneficiaryWallet: data[24],                                       // address beneficiaryWallet
            documents: data[25]                                                // string[] uploadedDocuments
        };

        // ⚡ Cache the result
        this.pgaCache.set(pgaId, { data: pgaInfo, timestamp: Date.now() });
        
        return pgaInfo;
    }

    public async getAllPGAsByBuyer(buyer: string, skipCache: boolean = false): Promise<PGAInfo[]> {
        const startTime = performance.now();
        const contract = await this.getContract();
        const ids = await contract.getPGAsByBuyer(buyer);
        
        console.log(`[TradeFinanceService] 📊 Fetching ${ids.length} PGAs for buyer`);
        
        // ⚡ OPTIMIZATION: Batch process in parallel (10 at a time to avoid overwhelming RPC)
        const BATCH_SIZE = 10;
        const results: PGAInfo[] = [];
        
        for (let i = 0; i < ids.length; i += BATCH_SIZE) {
            const batch = ids.slice(i, i + BATCH_SIZE);
            const batchResults = await Promise.all(
                batch.map((id: string) => this.getPGA(id, skipCache))
            );
            results.push(...batchResults);
            
            // Progress logging for large datasets
            if (ids.length > BATCH_SIZE) {
                const progress = Math.min(100, Math.round(((i + BATCH_SIZE) / ids.length) * 100));
                console.log(`[TradeFinanceService] ⏳ Progress: ${progress}% (${i + BATCH_SIZE}/${ids.length})`);
            }
        }
        
        const fetchTime = performance.now() - startTime;
        console.log(`[TradeFinanceService] ✅ Fetched ${results.length} PGAs in ${fetchTime.toFixed(0)}ms`);
        
        return results;
    }

    public async getAllPGAsBySeller(seller: string, skipCache: boolean = false): Promise<PGAInfo[]> {
        const startTime = performance.now();
        const contract = await this.getContract();
        const ids = await contract.getPGAsBySeller(seller);
        
        console.log(`[TradeFinanceService] 📊 Fetching ${ids.length} PGAs for seller`);
        
        // ⚡ OPTIMIZATION: Batch process in parallel (10 at a time)
        const BATCH_SIZE = 10;
        const results: PGAInfo[] = [];
        
        for (let i = 0; i < ids.length; i += BATCH_SIZE) {
            const batch = ids.slice(i, i + BATCH_SIZE);
            const batchResults = await Promise.all(
                batch.map((id: string) => this.getPGA(id, skipCache))
            );
            results.push(...batchResults);
            
            if (ids.length > BATCH_SIZE) {
                const progress = Math.min(100, Math.round(((i + BATCH_SIZE) / ids.length) * 100));
                console.log(`[TradeFinanceService] ⏳ Progress: ${progress}% (${i + BATCH_SIZE}/${ids.length})`);
            }
        }
        
        const fetchTime = performance.now() - startTime;
        console.log(`[TradeFinanceService] ✅ Fetched ${results.length} PGAs in ${fetchTime.toFixed(0)}ms`);
        
        return results;
    }

    public async createPGA(params: {
        pgaId: string;
        seller: string;
        companyName: string;
        registrationNumber: string;
        tradeDescription: string;
        tradeValue: string;
        guaranteeAmount: string;
        collateralAmount: string;
        duration: number;
        beneficiaryName: string;
        beneficiaryWallet: string;
        metadataURI: string;
        documentURIs: string[];
    }) {
        const decimals = await this.getPrimaryTokenDecimals();
        const signer = await this.getSigner();
        const password = await secureStorage.getSecureItem(PASSWORD_KEY);
        const privateKey = (await secureStorage.getDecryptedPrivateKey(password!))!;

        return smartContractTransactionService.executeTransaction({
            contractAddress: this.getDiamondAddress(),
            abi: TRADE_FINANCE_FACET_ABI,
            functionName: "createPGA",
            args: [
                params.pgaId,
                params.seller,
                params.companyName,
                params.registrationNumber,
                params.tradeDescription,
                ethers.utils.parseUnits(params.tradeValue, decimals),
                ethers.utils.parseUnits(params.guaranteeAmount, decimals),
                ethers.utils.parseUnits(params.collateralAmount, decimals),
                params.duration,
                params.beneficiaryName,
                params.beneficiaryWallet,
                params.metadataURI,
                params.documentURIs
            ],
            network: this.currentNetworkConfig!,
            privateKey
        });
    }

    public async voteOnPGA(pgaId: string, support: boolean) {
        const password = await secureStorage.getSecureItem(PASSWORD_KEY);
        const privateKey = (await secureStorage.getDecryptedPrivateKey(password!))!;

        return smartContractTransactionService.executeTransaction({
            contractAddress: this.getDiamondAddress(),
            abi: TRADE_FINANCE_FACET_ABI,
            functionName: "voteOnPGA",
            args: [pgaId, support],
            network: this.currentNetworkConfig!,
            privateKey
        });
    }

    public async sellerVoteOnPGA(pgaId: string, approve: boolean) {
        const password = await secureStorage.getSecureItem(PASSWORD_KEY);
        const privateKey = (await secureStorage.getDecryptedPrivateKey(password!))!;

        return smartContractTransactionService.executeTransaction({
            contractAddress: this.getDiamondAddress(),
            abi: TRADE_FINANCE_FACET_ABI,
            functionName: "sellerVoteOnPGA",
            args: [pgaId, approve],
            network: this.currentNetworkConfig!,
            privateKey
        });
    }

    public async payCollateral(pgaId: string, amount: string) {
        const contract = await this.getContract();
        const usdc = await this.getUSDCContract();
        const diamond = this.getDiamondAddress();
        const decimals = await this.getPrimaryTokenDecimals();
        const amountRaw = ethers.utils.parseUnits(amount, decimals);

        // Initial check for allowance
        const signer = await this.getSigner();
        const address = await signer.getAddress();
        const allowance = await usdc.allowance(address, diamond);

        if (allowance.lt(amountRaw)) {
            const approveTx = await usdc.approve(diamond, amountRaw);
            await approveTx.wait();
        }

        const tx = await contract.payCollateral(pgaId);
        return tx.wait();
    }

    public async payIssuanceFee(pgaId: string, amount: string) {
        const contract = await this.getContract();
        const usdc = await this.getUSDCContract();
        const diamond = this.getDiamondAddress();
        const decimals = await this.getPrimaryTokenDecimals();
        const amountRaw = ethers.utils.parseUnits(amount, decimals);

        // Initial check for allowance
        const signer = await this.getSigner();
        const address = await signer.getAddress();
        const allowance = await usdc.allowance(address, diamond);

        if (allowance.lt(amountRaw)) {
            const approveTx = await usdc.approve(diamond, amountRaw);
            await approveTx.wait();
        }

        const tx = await contract.payIssuanceFee(pgaId);
        return tx.wait();
    }

    public async confirmGoodsShipped(pgaId: string, logisticPartnerName: string) {
        const contract = await this.getContract();
        const tx = await contract.confirmGoodsShipped(pgaId, logisticPartnerName);
        return tx.wait();
    }

    public async payBalancePayment(pgaId: string, amount: string) {
        const contract = await this.getContract();
        const usdc = await this.getUSDCContract();
        const diamond = this.getDiamondAddress();
        const decimals = await this.getPrimaryTokenDecimals();
        const amountRaw = ethers.utils.parseUnits(amount, decimals);

        const signer = await this.getSigner();
        const address = await signer.getAddress();
        const allowance = await usdc.allowance(address, diamond);

        if (allowance.lt(amountRaw)) {
            const approveTx = await usdc.approve(diamond, amountRaw);
            await approveTx.wait();
        }

        const tx = await contract.payBalancePayment(pgaId);
        return tx.wait();
    }

    public async issueCertificate(pgaId: string) {
        const contract = await this.getContract();
        const tx = await contract.issueCertificate(pgaId);
        return tx.wait();
    }

    public async createDeliveryAgreement(params: {
        agreementId: string;
        pgaId: string;
        agreementDeadline: number;
        deliveryNotes: string;
        deliveryProofURI: string;
    }) {
        const contract = await this.getContract();
        const tx = await contract.createDeliveryAgreement(
            params.agreementId,
            params.pgaId,
            params.agreementDeadline,
            params.deliveryNotes,
            params.deliveryProofURI
        );
        return tx.wait();
    }

    public async buyerConsentToDelivery(agreementId: string, consent: boolean) {
        const contract = await this.getContract();
        const tx = await contract.buyerConsentToDelivery(agreementId, consent);
        return tx.wait();
    }

    public async releasePaymentToSeller(pgaId: string) {
        const contract = await this.getContract();
        const tx = await contract.releasePaymentToSeller(pgaId);
        return tx.wait();
    }

    /**
     * Get all logistics partners (authorized and deauthorized)
     * @returns Array of logistics partner addresses
     */
    public async getAllLogisticsPartners(): Promise<string[]> {
        const contract = await this.getContract();
        return await contract.getAllLogisticsPartners();
    }

    /**
     * Get only currently authorized logistics partners
     * @returns Array of authorized logistics partner addresses
     */
    public async getAuthorizedLogisticsPartners(): Promise<string[]> {
        const contract = await this.getContract();
        const allPartners = await contract.getAllLogisticsPartners();
        
        // Filter to get only authorized partners
        const authorized: string[] = [];
        for (const partner of allPartners) {
            const isAuthorized = await contract.isAuthorizedLogisticsPartner(partner);
            if (isAuthorized) {
                authorized.push(partner);
            }
        }
        return authorized;
    }

    /**
     * Get all delivery persons (authorized and deauthorized)
     * @returns Array of delivery person addresses
     */
    public async getAllDeliveryPersons(): Promise<string[]> {
        const contract = await this.getContract();
        return await contract.getAllDeliveryPersons();
    }

    /**
     * Check if address is authorized logistics partner
     * @param partner Address to check
     * @returns True if authorized
     */
    public async isAuthorizedLogisticsPartner(partner: string): Promise<boolean> {
        const contract = await this.getContract();
        return await contract.isAuthorizedLogisticsPartner(partner);
    }

    /**
     * Check if address is authorized delivery person
     * @param deliveryPerson Address to check
     * @returns True if authorized
     */
    public async isAuthorizedDeliveryPerson(deliveryPerson: string): Promise<boolean> {
        const contract = await this.getContract();
        return await contract.isAuthorizedDeliveryPerson(deliveryPerson);
    }
}

export const tradeFinanceService = TradeFinanceService.getInstance();
