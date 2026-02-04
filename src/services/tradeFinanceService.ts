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

    "function createPGA(string pgaId, address seller, string companyName, string registrationNumber, string tradeDescription, uint256 tradeValue, uint256 guaranteeAmount, uint256 collateralAmount, uint256 issuanceFee, uint256 duration, string beneficiaryName, address beneficiaryWallet, string metadataURI, string[] documentURIs) external",
    "function voteOnPGA(string pgaId, bool support) external",
    "function sellerVoteOnPGA(string pgaId, bool approve) external",
    "function payCollateral(string pgaId, address tokenAddress) external",
    "function payIssuanceFee(string pgaId, address tokenAddress) external",
    "function confirmGoodsShipped(string pgaId) external",
    "function takeUpPGA(string pgaId) external",
    "function confirmGoodsDelivered(string pgaId) external",
    "function payBalancePayment(string pgaId, address tokenAddress) external",
    "function issueCertificate(string pgaId) external",
    "function createDeliveryAgreement(string agreementId, string pgaId, uint256 agreementDeadline, string deliveryNotes, string deliveryProofURI) external",
    "function buyerConsentToDelivery(string agreementId, bool consent) external",
    "function releasePaymentToSeller(string pgaId) external",
    "function refundCollateral(string pgaId) external",
    "function cancelPGA(string pgaId) external",
    "function getPGA(string pgaId) external view returns (string _pgaId, address buyer, address seller, uint256 tradeValue, uint256 guaranteeAmount, uint256 collateralAmount, uint256 issuanceFee, uint256 duration, uint256 votesFor, uint256 votesAgainst, uint256 createdAt, uint256 votingDeadline, uint8 status, bool collateralPaid, bool issuanceFeePaid, bool balancePaymentPaid, bool goodsShipped, string logisticPartner, address logisticsPartner, uint256 certificateIssuedAt, string deliveryAgreementId, string metadataURI, string companyName, string registrationNumber, string tradeDescription, string beneficiaryName, address beneficiaryWallet, string[] uploadedDocuments)",
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

// ERC-20 ABI for token operations
const ERC20_ABI = [
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)",
    "function balanceOf(address account) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)"
];

export enum PGAStatus {
    None,
    Created,
    GuaranteeApproved,
    SellerApproved,
    CollateralPaid,
    LogisticsNotified,
    LogisticsTakeup,
    GoodsShipped,
    GoodsDelivered,
    BalancePaymentPaid,
    CertificateIssued,
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
    issuanceFee: string;
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
    logisticsPartner: string;
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

    private async getProvider(): Promise<ethers.providers.Provider> {
        if (!this.currentNetworkConfig?.rpcUrl) {
            throw new Error('No RPC URL configured for current network');
        }
        return new ethers.providers.JsonRpcProvider(this.currentNetworkConfig.rpcUrl);
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

        // ✅ FIX: Unified return with 28 fields
        // [0] _pgaId, [1] buyer, [2] seller, [3] tradeValue, [4] guaranteeAmount, 
        // [5] collateralAmount, [6] issuanceFee, [7] duration, [8] votesFor, [9] votesAgainst, 
        // [10] createdAt, [11] votingDeadline, [12] status, [13] collateralPaid, 
        // [14] issuanceFeePaid, [15] balancePaymentPaid, [16] goodsShipped, 
        // [17] logisticPartner (string), [18] logisticsPartner (address), [19] certificateIssuedAt, 
        // [20] deliveryAgreementId, [21] metadataURI, [22] companyName, [23] registrationNumber, 
        // [24] tradeDescription, [25] beneficiaryName, [26] beneficiaryWallet, [27] uploadedDocuments
        const pgaInfo: PGAInfo = {
            pgaId: data[0],
            buyer: data[1],
            seller: data[2],
            tradeValue: ethers.utils.formatUnits(data[3], decimals),
            guaranteeAmount: ethers.utils.formatUnits(data[4], decimals),
            collateralAmount: ethers.utils.formatUnits(data[5], decimals),
            issuanceFee: ethers.utils.formatUnits(data[6], decimals),
            duration: data[7].toNumber(),
            votesFor: ethers.utils.formatUnits(data[8], decimals),
            votesAgainst: ethers.utils.formatUnits(data[9], decimals),
            createdAt: data[10].toNumber(),
            votingDeadline: data[11].toNumber(),
            status: data[12] as PGAStatus,
            collateralPaid: data[13],
            issuanceFeePaid: data[14],
            balancePaymentPaid: data[15],
            goodsShipped: data[16],
            logisticPartner: data[17],
            logisticsPartner: data[18],
            certificateIssuedAt: data[19].toNumber(),
            deliveryAgreementId: data[20],
            metadataURI: data[21],
            companyName: data[22],
            registrationNumber: data[23],
            tradeDescription: data[24],
            beneficiaryName: data[25],
            beneficiaryWallet: data[26],
            documents: data[27]
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

    /**
     * Pay collateral with multi-token support
     * @param pgaId Pool Guarantee Application ID
     * @param tokenAddress ERC20 token address (e.g., USDC, USDT, DAI)
     * @param onProgress Optional progress callback
     * 
     * Architecture follows Treasury Portal pattern:
     * - Accepts any supported ERC20 token
     * - Auto-approves if needed
     * - Account Abstraction compatible (uses resolvedBuyer)
     * - Amount is determined from PGA data on-chain
     */
    public async payCollateral(
        pgaId: string,
        tokenAddress: string,
        onProgress?: (stage: 'checking' | 'approving' | 'paying', message: string) => void
    ) {
        try {
            onProgress?.('checking', 'Checking payment requirements...');

            const contract = await this.getContract();
            const diamond = this.getDiamondAddress();

            // Get PGA data to determine collateral amount
            const pgaData = await contract.getPGA(pgaId);
            const collateralAmount = pgaData.collateralAmount;

            // Get token contract and decimals
            const provider = await this.getProvider();
            const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
            const decimals = await token.decimals();

            // Check balance
            const signer = await this.getSigner();
            const address = await signer.getAddress();
            const balance = await token.balanceOf(address);

            if (balance.lt(collateralAmount)) {
                throw new Error(`Insufficient ${await token.symbol()} balance`);
            }

            // Check and handle approval
            const allowance = await token.allowance(address, diamond);
            if (allowance.lt(collateralAmount)) {
                onProgress?.('approving', `Approving ${await token.symbol()} spend...`);
                const tokenWithSigner = token.connect(signer);
                const approveTx = await tokenWithSigner.approve(diamond, collateralAmount);
                await approveTx.wait();
            }

            onProgress?.('paying', 'Paying collateral...');

            // Multi-token signature: payCollateral(pgaId, tokenAddress)
            const tx = await contract.payCollateral(pgaId, tokenAddress);
            return tx.wait();
        } catch (error: any) {
            console.error('[TradeFinanceService] payCollateral error:', error);
            throw error;
        }
    }

    /**
     * Pay issuance fee (1% of guarantee amount) with multi-token support
     * @param pgaId Pool Guarantee Application ID
     * @param tokenAddress ERC20 token address (e.g., USDC, USDT, DAI)
     * @param onProgress Optional progress callback
     * 
     * Architecture follows Treasury Portal pattern:
     * - Accepts any supported ERC20 token
     * - Auto-approves if needed
     * - Account Abstraction compatible (uses resolvedBuyer)
     * - Fee amount (1% of guarantee) is calculated on-chain
     */
    public async payIssuanceFee(
        pgaId: string,
        tokenAddress: string,
        onProgress?: (stage: 'checking' | 'approving' | 'paying', message: string) => void
    ) {
        try {
            onProgress?.('checking', 'Checking fee payment requirements...');

            const contract = await this.getContract();
            const diamond = this.getDiamondAddress();

            // Get PGA data to calculate fee (1% of guarantee amount)
            const pgaData = await contract.getPGA(pgaId);
            const feeAmount = pgaData.guaranteeAmount.div(100); // 1% of guarantee

            // Get token contract and decimals
            const provider = await this.getProvider();
            const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

            // Check balance
            const signer = await this.getSigner();
            const address = await signer.getAddress();
            const balance = await token.balanceOf(address);

            if (balance.lt(feeAmount)) {
                throw new Error(`Insufficient ${await token.symbol()} balance`);
            }

            // Check and handle approval
            const allowance = await token.allowance(address, diamond);
            if (allowance.lt(feeAmount)) {
                onProgress?.('approving', `Approving ${await token.symbol()} spend...`);
                const tokenWithSigner = token.connect(signer);
                const approveTx = await tokenWithSigner.approve(diamond, feeAmount);
                await approveTx.wait();
            }

            onProgress?.('paying', 'Paying issuance fee...');

            // Multi-token signature: payIssuanceFee(pgaId, tokenAddress)
            const tx = await contract.payIssuanceFee(pgaId, tokenAddress);
            return tx.wait();
        } catch (error: any) {
            console.error('[TradeFinanceService] payIssuanceFee error:', error);
            throw error;
        }
    }

    public async confirmGoodsShipped(pgaId: string) {
        const contract = await this.getContract();
        const tx = await contract.confirmGoodsShipped(pgaId);
        return await tx.wait();
    }

    public async confirmGoodsDelivered(pgaId: string) {
        const contract = await this.getContract();
        const tx = await contract.confirmGoodsDelivered(pgaId);
        return await tx.wait();
    }

    public async takeUpPGA(pgaId: string) {
        const contract = await this.getContract();
        const tx = await contract.takeUpPGA(pgaId);
        return await tx.wait();
    }

    /**
     * Pay balance payment with multi-token support
     * @param pgaId Pool Guarantee Application ID
     * @param tokenAddress ERC20 token address (e.g., USDC, USDT, DAI)
     * @param onProgress Optional progress callback
     * 
     * Architecture follows Treasury Portal pattern:
     * - Accepts any supported ERC20 token
     * - Auto-approves if needed
     * - Account Abstraction compatible (uses resolvedBuyer)
     * - Balance amount (tradeValue - collateral) is calculated on-chain
     */
    public async payBalancePayment(
        pgaId: string,
        tokenAddress: string,
        onProgress?: (stage: 'checking' | 'approving' | 'paying', message: string) => void
    ) {
        try {
            onProgress?.('checking', 'Checking balance payment requirements...');

            const contract = await this.getContract();
            const diamond = this.getDiamondAddress();

            // Get PGA data to calculate balance (tradeValue - collateral)
            const pgaData = await contract.getPGA(pgaId);
            const balanceAmount = pgaData.tradeValue.sub(pgaData.collateralAmount);

            // Get token contract
            const provider = await this.getProvider();
            const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

            // Check balance
            const signer = await this.getSigner();
            const address = await signer.getAddress();
            const balance = await token.balanceOf(address);

            if (balance.lt(balanceAmount)) {
                throw new Error(`Insufficient ${await token.symbol()} balance`);
            }

            // Check and handle approval
            const allowance = await token.allowance(address, diamond);
            if (allowance.lt(balanceAmount)) {
                onProgress?.('approving', `Approving ${await token.symbol()} spend...`);
                const tokenWithSigner = token.connect(signer);
                const approveTx = await tokenWithSigner.approve(diamond, balanceAmount);
                await approveTx.wait();
            }

            onProgress?.('paying', 'Paying balance amount...');

            // Multi-token signature: payBalancePayment(pgaId, tokenAddress)
            const tx = await contract.payBalancePayment(pgaId, tokenAddress);
            return tx.wait();
        } catch (error: any) {
            console.error('[TradeFinanceService] payBalancePayment error:', error);
            throw error;
        }
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
        try {
            const contract = await this.getContract();
            return await contract.getAllLogisticsPartners();
        } catch (error) {
            console.warn("[TradeFinanceService] getAllLogisticsPartners failed (potentially missing facet):", error);
            return [];
        }
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
        try {
            const contract = await this.getContract();
            return await contract.getAllDeliveryPersons();
        } catch (error) {
            console.warn("[TradeFinanceService] getAllDeliveryPersons failed (potentially missing facet):", error);
            return [];
        }
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

    /**
     * Get default token address for payments
     * @returns The primary stablecoin address for the current network
     */
    public getDefaultTokenAddress(): string {
        const tokenAddress = this.currentNetworkConfig?.stablecoins?.[0]?.address;
        if (!tokenAddress) {
            throw new Error(`Primary payment token not found for network ${this.currentNetworkConfig?.name}`);
        }
        return tokenAddress;
    }
}

export const tradeFinanceService = TradeFinanceService.getInstance();
