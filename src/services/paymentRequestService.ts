import { secureStorage } from "@/utils/secureStorage";
import { SupportedNetworkId } from "@/contexts/WalletContext";

export interface PaymentRequest {
  id: string;
  amount: string;
  token: string;
  network: string;
  networkId: SupportedNetworkId;
  address: string;
  status: "pending" | "completed" | "expired" | "cancelled";
  createdAt: Date;
  expiresAt: Date;
  message?: string;
  qrData: string;
  completedTxHash?: string;
  completedAt?: Date;
}

export interface CreatePaymentRequestParams {
  amount: string;
  token: string;
  networkId: SupportedNetworkId;
  network: string;
  address: string;
  message?: string;
  expiresInHours?: number;
}

class PaymentRequestService {
  private static instance: PaymentRequestService;
  private readonly STORAGE_KEY = "blockfinax.paymentRequests";

  public static getInstance(): PaymentRequestService {
    if (!PaymentRequestService.instance) {
      PaymentRequestService.instance = new PaymentRequestService();
    }
    return PaymentRequestService.instance;
  }

  /**
   * Create a new payment request
   */
  async createPaymentRequest(params: CreatePaymentRequestParams): Promise<PaymentRequest> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (params.expiresInHours || 24) * 60 * 60 * 1000); // Default 24 hours
    
    // Generate unique ID
    const id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Generate QR data (EIP-681 standard)
    let qrData = params.address;
    
    if (params.amount && params.token) {
      const urlParams = new URLSearchParams();
      urlParams.append('value', params.amount);
      if (params.message) {
        urlParams.append('message', params.message);
      }
      
      // For now, use basic ethereum: format
      qrData = `ethereum:${params.address}?${urlParams.toString()}`;
    }

    const paymentRequest: PaymentRequest = {
      id,
      amount: params.amount,
      token: params.token,
      network: params.network,
      networkId: params.networkId,
      address: params.address,
      status: "pending",
      createdAt: now,
      expiresAt,
      message: params.message,
      qrData,
    };

    // Save to storage
    await this.savePaymentRequest(paymentRequest);

    return paymentRequest;
  }

  /**
   * Get all payment requests for current user
   */
  async getPaymentRequests(): Promise<PaymentRequest[]> {
    try {
      const stored = await secureStorage.getSecureItem(this.STORAGE_KEY);
      if (!stored) return [];

      const requests: PaymentRequest[] = JSON.parse(stored);
      
      // Convert date strings back to Date objects
      return requests.map(req => ({
        ...req,
        createdAt: new Date(req.createdAt),
        expiresAt: new Date(req.expiresAt),
        completedAt: req.completedAt ? new Date(req.completedAt) : undefined,
      }));
    } catch (error) {
      console.error("Failed to load payment requests:", error);
      return [];
    }
  }

  /**
   * Update payment request status
   */
  async updatePaymentRequestStatus(
    id: string, 
    status: PaymentRequest["status"], 
    txHash?: string
  ): Promise<void> {
    try {
      const requests = await this.getPaymentRequests();
      const requestIndex = requests.findIndex(r => r.id === id);
      
      if (requestIndex === -1) {
        throw new Error("Payment request not found");
      }

      requests[requestIndex].status = status;
      
      if (status === "completed" && txHash) {
        requests[requestIndex].completedTxHash = txHash;
        requests[requestIndex].completedAt = new Date();
      }

      await this.saveAllPaymentRequests(requests);
    } catch (error) {
      console.error("Failed to update payment request status:", error);
      throw error;
    }
  }

  /**
   * Delete a payment request
   */
  async deletePaymentRequest(id: string): Promise<void> {
    try {
      const requests = await this.getPaymentRequests();
      const filtered = requests.filter(r => r.id !== id);
      await this.saveAllPaymentRequests(filtered);
    } catch (error) {
      console.error("Failed to delete payment request:", error);
      throw error;
    }
  }

  /**
   * Mark expired requests as expired
   */
  async updateExpiredRequests(): Promise<void> {
    try {
      const requests = await this.getPaymentRequests();
      const now = new Date();
      let updated = false;

      requests.forEach(request => {
        if (request.status === "pending" && request.expiresAt < now) {
          request.status = "expired";
          updated = true;
        }
      });

      if (updated) {
        await this.saveAllPaymentRequests(requests);
      }
    } catch (error) {
      console.error("Failed to update expired requests:", error);
    }
  }

  /**
   * Get payment request by ID
   */
  async getPaymentRequestById(id: string): Promise<PaymentRequest | null> {
    try {
      const requests = await this.getPaymentRequests();
      return requests.find(r => r.id === id) || null;
    } catch (error) {
      console.error("Failed to get payment request by ID:", error);
      return null;
    }
  }

  /**
   * Check if a transaction fulfills any pending payment requests
   */
  async checkForMatchingPaymentRequest(
    fromAddress: string,
    toAddress: string,
    amount: string,
    token: string,
    txHash: string
  ): Promise<PaymentRequest | null> {
    try {
      const requests = await this.getPaymentRequests();
      
      const matchingRequest = requests.find(request => 
        request.status === "pending" &&
        request.address.toLowerCase() === toAddress.toLowerCase() &&
        request.token.toLowerCase() === token.toLowerCase() &&
        parseFloat(request.amount) <= parseFloat(amount) // Allow overpayment
      );

      if (matchingRequest) {
        await this.updatePaymentRequestStatus(matchingRequest.id, "completed", txHash);
        return matchingRequest;
      }

      return null;
    } catch (error) {
      console.error("Failed to check for matching payment request:", error);
      return null;
    }
  }

  /**
   * Clean up old expired requests (keep last 50)
   */
  async cleanupOldRequests(): Promise<void> {
    try {
      const requests = await this.getPaymentRequests();
      
      // Sort by creation date (newest first)
      requests.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      // Keep only the most recent 50 requests
      const recentRequests = requests.slice(0, 50);
      
      await this.saveAllPaymentRequests(recentRequests);
    } catch (error) {
      console.error("Failed to cleanup old requests:", error);
    }
  }

  /**
   * Save single payment request
   */
  private async savePaymentRequest(paymentRequest: PaymentRequest): Promise<void> {
    try {
      const existing = await this.getPaymentRequests();
      existing.push(paymentRequest);
      await this.saveAllPaymentRequests(existing);
    } catch (error) {
      console.error("Failed to save payment request:", error);
      throw error;
    }
  }

  /**
   * Save all payment requests
   */
  private async saveAllPaymentRequests(requests: PaymentRequest[]): Promise<void> {
    try {
      await secureStorage.setSecureItem(this.STORAGE_KEY, JSON.stringify(requests));
    } catch (error) {
      console.error("Failed to save payment requests:", error);
      throw error;
    }
  }
}

export const paymentRequestService = PaymentRequestService.getInstance();