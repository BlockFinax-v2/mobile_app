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
    "event PGACompleted(string indexed pgaId, address indexed buyer, address indexed seller, uint256 completedAt)",

    "function createPGA(string pgaId, address seller, string companyName, string registrationNumber, string tradeDescription, uint256 tradeValue, uint256 guaranteeAmount, uint256 collateralAmount, uint256 duration, string beneficiaryName, address beneficiaryWallet, string metadataURI, string[] documentURIs) external",
    "function voteOnPGA(string pgaId, bool support) external",
    "function sellerVoteOnPGA(string pgaId, bool approve) external",
    "function payCollateral(string pgaId) external",
    "function confirmGoodsShipped(string pgaId, string logisticPartnerName) external",
    "function payBalancePayment(string pgaId) external",
    "function issueCertificate(string pgaId) external",
    "function createDeliveryAgreement(string agreementId, string pgaId, uint256 agreementDeadline, string deliveryNotes, string deliveryProofURI) external",
    "function buyerConsentToDelivery(string agreementId, bool consent) external",
    "function releasePaymentToSeller(string pgaId) external",
    "function refundCollateral(string pgaId) external",
    "function cancelPGA(string pgaId) external",

    "function getPGA(string pgaId) external view returns (address buyer, address seller, uint256 tradeValue, uint256 guaranteeAmount, uint256 collateralAmount, uint256 duration, uint256 votesFor, uint256 votesAgainst, uint256 createdAt, uint256 votingDeadline, uint8 status, bool collateralPaid, bool balancePaymentPaid, bool goodsShipped, string logisticPartner, uint256 certificateIssuedAt, string deliveryAgreementId, string metadataURI)",
    "function getPGAMetadata(string pgaId) external view returns (string companyName, string registrationNumber, string tradeDescription, string beneficiaryName, address beneficiaryWallet, string[] documents)",
    "function getPGADocuments(string pgaId) external view returns (string[] memory)",
    "function getAllPGAs() external view returns (string[] memory)",
    "function getActivePGAs() external view returns (string[] memory)",
    "function getPGAsByBuyer(address buyer) external view returns (string[] memory)",
    "function getPGAsBySeller(address seller) external view returns (string[] memory)",
    "function getDeliveryAgreement(string agreementId) external view returns (string pgaId, address deliveryPerson, address buyer, uint256 createdAt, uint256 deadline, bool buyerConsent, uint256 buyerSignedAt, string deliveryNotes, string deliveryProofURI)",
    "function getVoteStatusOnPGA(string pgaId, address voter) external view returns (bool hasVoted, bool support)",
    "function isAuthorizedLogisticsPartner(address partner) external view returns (bool)",
    "function isAuthorizedDeliveryPerson(address deliveryPerson) external view returns (bool)",
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
    balancePaymentPaid: boolean;
    goodsShipped: boolean;
    logisticPartner: string;
    certificateIssuedAt: number;
    deliveryAgreementId: string;
    metadataURI: string;
    tradeDescription: string;
    companyName?: string;
    registrationNumber?: string;
    beneficiaryName?: string;
    beneficiaryWallet?: string;
    documents?: string[];
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
        console.log(`[TradeFinanceService] Network switched to chainId: ${chainId}`);
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

    public async getPGA(pgaId: string): Promise<PGAInfo> {
        const contract = await this.getContract();
        const data = await contract.getPGA(pgaId);
        const decimals = await this.getPrimaryTokenDecimals();

        const pgaInfo: PGAInfo = {
            pgaId,
            buyer: data.buyer,
            seller: data.seller,
            tradeValue: ethers.utils.formatUnits(data.tradeValue, decimals),
            guaranteeAmount: ethers.utils.formatUnits(data.guaranteeAmount, decimals),
            collateralAmount: ethers.utils.formatUnits(data.collateralAmount, decimals),
            duration: data.duration.toNumber(),
            votesFor: ethers.utils.formatUnits(data.votesFor, decimals),
            votesAgainst: ethers.utils.formatUnits(data.votesAgainst, decimals),
            createdAt: data.createdAt.toNumber(),
            votingDeadline: data.votingDeadline.toNumber(),
            status: data.status as PGAStatus,
            collateralPaid: data.collateralPaid,
            balancePaymentPaid: data.balancePaymentPaid,
            goodsShipped: data.goodsShipped,
            logisticPartner: data.logisticPartner,
            certificateIssuedAt: data.certificateIssuedAt.toNumber(),
            deliveryAgreementId: data.deliveryAgreementId,
            metadataURI: data.metadataURI,
            tradeDescription: data.tradeDescription,
        };

        // Fetch detailed metadata from chain
        try {
            const metadata = await this.getPGAMetadata(pgaId);
            if (!metadata) return pgaInfo;
            return {
                ...pgaInfo,
                companyName: metadata.companyName,
                registrationNumber: metadata.registrationNumber,
                beneficiaryName: metadata.beneficiaryName,
                beneficiaryWallet: metadata.beneficiaryWallet,
                documents: metadata.documents,
            };
        } catch (error) {
            console.warn(`Failed to fetch metadata for PGA ${pgaId}:`, error);
            return pgaInfo;
        }
    }

    public async getPGAMetadata(pgaId: string): Promise<{
        companyName: string;
        registrationNumber: string;
        tradeDescription: string;
        beneficiaryName: string;
        beneficiaryWallet: string;
        documents: string[];
    } | null> {
        if (this.metadataUnsupportedChains.has(this.currentChainId)) {
            return null;
        }
        const contract = await this.getContract();
        try {
            const data = await contract.getPGAMetadata(pgaId);
            return {
                companyName: data.companyName,
                registrationNumber: data.registrationNumber,
                tradeDescription: data.tradeDescription,
                beneficiaryName: data.beneficiaryName,
                beneficiaryWallet: data.beneficiaryWallet,
                documents: data.documents,
            };
        } catch (error: any) {
            const reason = error?.reason || error?.error?.reason || error?.message;
            if (typeof reason === "string" && reason.includes("Function does not exist")) {
                this.metadataUnsupportedChains.add(this.currentChainId);
                return null;
            }
            throw error;
        }
    }

    public async getAllPGAsByBuyer(buyer: string): Promise<PGAInfo[]> {
        const contract = await this.getContract();
        const ids = await contract.getPGAsByBuyer(buyer);
        return Promise.all(ids.map((id: string) => this.getPGA(id)));
    }

    public async getAllPGAsBySeller(seller: string): Promise<PGAInfo[]> {
        const contract = await this.getContract();
        const ids = await contract.getPGAsBySeller(seller);
        return Promise.all(ids.map((id: string) => this.getPGA(id)));
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
}

export const tradeFinanceService = TradeFinanceService.getInstance();
