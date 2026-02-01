/**
 * Alchemy Account Service
 * 
 * This service handles all Alchemy Account Abstraction (ERC-4337) operations
 * using the Alchemy Account Kit SDK. It provides smart account creation,
 * transaction execution, and gas sponsorship management.
 */

import { createModularAccountAlchemyClient } from '@account-kit/smart-contracts';
import { type AlchemySmartAccountClient, alchemy } from '@account-kit/infra';
import { LocalAccountSigner } from '@aa-sdk/core';
import { type Hex, encodeFunctionData, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
  getAlchemyChain,
  isAlchemyNetworkSupported,
  isOfficiallySupported,
  getAlchemyApiKey,
  getAlchemyGasPolicyId,
  type SupportedAlchemyNetwork,
} from '../config/alchemyAccount';

/**
 * Transaction Call
 */
export interface TransactionCall {
  target: Hex;
  data: Hex;
  value?: bigint;
}

/**
 * User Operation Result
 */
export interface UserOperationResult {
  hash: Hex;
  request?: any;
}

/**
 * Alchemy Account Service
 * 
 * Main service class for interacting with Alchemy Account Abstraction
 */
export class AlchemyAccountService {
  private client: AlchemySmartAccountClient | null = null;
  private network: SupportedAlchemyNetwork;
  private accountAddress: Hex | null = null;

  constructor(network: string) {
    console.log('[AlchemyAccountService] Constructor received network ID:', network);
    if (!isAlchemyNetworkSupported(network)) {
      throw new Error(`Network ${network} is not supported by Alchemy Account Kit`);
    }
    
    // Warn about unofficial networks
    if (!isOfficiallySupported(network)) {
      console.warn(`[AlchemyAccountService] ⚠️ Network ${network} is not officially supported by Alchemy AA`);
      console.warn('[AlchemyAccountService] Account Abstraction may not work. Will fallback to EOA if it fails.');
    }
    
    this.network = network;
    console.log('[AlchemyAccountService] Network validated successfully:', this.network);
  }

  /**
   * Initialize smart account with EOA signer
   * 
   * @param privateKey - The private key of the EOA that will own the smart account
   * @param options - Optional configuration
   */
  async initializeSmartAccount(
    privateKey: string,
    options?: {
      salt?: bigint;
      gasPolicyId?: string;
    }
  ): Promise<Hex> {
    try {
      // Remove 0x prefix if present
      const cleanPrivateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
      
      // Create viem account from private key
      const account = privateKeyToAccount(cleanPrivateKey as Hex);
      
      // Create signer
      const signer = new LocalAccountSigner(account);

      // Get API configuration
      const apiKey = getAlchemyApiKey();
      const gasPolicyId = options?.gasPolicyId ?? getAlchemyGasPolicyId();
      const chain = getAlchemyChain(this.network);

      console.log('[AlchemyAccountService] Initializing with config:', {
        networkId: this.network,
        chainId: chain.id,
        chainName: chain.name,
        hasRpcUrls: !!chain.rpcUrls,
        defaultRpc: chain.rpcUrls?.default?.http?.[0],
        publicRpc: chain.rpcUrls?.public?.http?.[0],
        hasGasPolicy: !!gasPolicyId
      });

      // Create transport with explicit configuration
      const transport = alchemy({ 
        apiKey,
        // Ensure we're using the correct network
      });

      // Create smart account client configuration
      const clientConfig: any = {
        apiKey,
        chain,
        signer,
        transport,
      };

      // Add optional salt
      if (options?.salt !== undefined) {
        clientConfig.salt = options.salt;
      }

      // Add gas manager config if policy ID is provided
      if (gasPolicyId) {
        clientConfig.gasManagerConfig = {
          policyId: gasPolicyId,
        };
      }

      console.log('[AlchemyAccountService] Creating client with config:', {
        hasApiKey: !!clientConfig.apiKey,
        hasChain: !!clientConfig.chain,
        hasSigner: !!clientConfig.signer,
        hasTransport: !!clientConfig.transport,
        hasGasManager: !!clientConfig.gasManagerConfig,
        chainId: clientConfig.chain?.id,
      });

      // Create smart account client
      try {
        this.client = await createModularAccountAlchemyClient(clientConfig);
      } catch (clientError: any) {
        console.error('[AlchemyAccountService] ❌ Client creation failed:', clientError?.message);
        console.error('[AlchemyAccountService] Error name:', clientError?.name);
        console.error('[AlchemyAccountService] Error cause:', clientError?.cause);
        
        // Provide detailed troubleshooting info
        if (clientError?.message?.includes('getCounterFactualAddress')) {
          console.error('[AlchemyAccountService] 🔍 DIAGNOSIS: getCounterFactualAddress failed');
          console.error('[AlchemyAccountService] This usually means:');
          console.error('[AlchemyAccountService]   1. RPC endpoint is not responding correctly');
          console.error('[AlchemyAccountService]   2. Network configuration is incomplete or wrong');
          console.error('[AlchemyAccountService]   3. Alchemy API key doesn\'t have access to this network');
          console.error('[AlchemyAccountService]   4. EntryPoint contract not deployed on this network');
          console.error('[AlchemyAccountService] 💡 Solution: Check network support at https://accountkit.alchemy.com/');
        }
        
        throw clientError;
      }

      // Get and store account address
      this.accountAddress = this.client.account?.address ?? null;

      if (!this.accountAddress) {
        throw new Error('Failed to get smart account address');
      }

      console.log('[AlchemyAccountService] ✅ Smart account initialized:', this.accountAddress);

      return this.accountAddress;
    } catch (error) {
      console.error('[AlchemyAccountService] Failed to initialize smart account:', error);
      if (error instanceof Error) {
        console.error('[AlchemyAccountService] Error details:', {
          message: error.message,
          stack: error.stack,
        });
      }
      throw error;
    }
  }

  /**
   * Get the smart account address
   */
  getAccountAddress(): Hex | null {
    return this.accountAddress;
  }

  /**
   * Get the smart account client
   */
  getClient(): AlchemySmartAccountClient | null {
    return this.client;
  }

  /**
   * Check if account is initialized
   */
  isInitialized(): boolean {
    return this.client !== null && this.accountAddress !== null;
  }

  /**
   * Send a single user operation
   * 
   * @param call - The transaction call to execute
   * @param options - Optional configuration
   */
  async sendUserOperation(
    call: TransactionCall,
    options?: {
      gasSponsored?: boolean;
    }
  ): Promise<UserOperationResult> {
    if (!this.client) {
      throw new Error('Smart account not initialized. Call initializeSmartAccount first.');
    }

    try {
      // Prepare user operation
      const userOp = {
        uo: {
          target: call.target,
          data: call.data,
          value: call.value || 0n,
        },
        account: this.client.account!,
      };
      
      // Send user operation
      const result = await this.client.sendUserOperation(userOp);

      // Wait for the transaction to be mined
      const txHash = await this.client.waitForUserOperationTransaction({
        hash: result.hash,
      });

      console.log('[AlchemyAccountService] ✅ Transaction mined:', txHash);

      return {
        hash: txHash,
        request: result.request,
      };
    } catch (error: any) {
      console.error('[AlchemyAccountService] Failed to send user operation:', error);
      
      // Check if error is related to deployment
      if (error.message?.includes('execution reverted') || error.message?.includes('estimateUserOperationGas')) {
        const isDeployed = await this.isAccountDeployed();
        if (!isDeployed) {
          console.error('[AlchemyAccountService] ❌ Smart account deployment failed!');
          console.error('[AlchemyAccountService] 📍 Smart account address:', this.accountAddress);
          console.error('[AlchemyAccountService] � CRITICAL: Check if paymasterAndData is empty in error above');
          console.error('[AlchemyAccountService] 💡 If paymasterAndData is "0x", the gas policy is NOT sponsoring!');
          console.error('[AlchemyAccountService] 💡 Solutions:');
          console.error('[AlchemyAccountService]   1. MOST LIKELY: API key and gas policy are from DIFFERENT Alchemy apps!');
          console.error('[AlchemyAccountService]      → Verify at: https://dashboard.alchemy.com/apps');
          console.error('[AlchemyAccountService]      → And: https://dashboard.alchemy.com/gas-manager');
          console.error('[AlchemyAccountService]      → Both must show the SAME app name');
          console.error('[AlchemyAccountService]   2. OR create new gas policy for your current app');
          console.error('[AlchemyAccountService]   3. OR send 0.01 ETH to:', this.accountAddress);
          console.error('[AlchemyAccountService]   4. See VERIFY_ALCHEMY_CONFIG.md for detailed steps');
          
          throw new Error(
            `Smart account deployment failed. The gas policy may not be configured to sponsor deployments. ` +
            `Please fund the smart account (${this.accountAddress}) with ~0.01 ETH or configure your gas policy at dashboard.alchemy.com/gas-manager`
          );
        }
      }
      
      throw error;
    }
  }

  /**
   * Send a batch of user operations
   * 
   * @param calls - Array of transaction calls to execute
   * @param options - Optional configuration
   */
  async sendBatchUserOperation(
    calls: TransactionCall[],
    options?: {
      gasSponsored?: boolean;
    }
  ): Promise<UserOperationResult> {
    if (!this.client) {
      throw new Error('Smart account not initialized. Call initializeSmartAccount first.');
    }

    try {
      // Send batch user operation
      const result = await this.client.sendUserOperation({
        uo: calls.map(call => ({
          target: call.target,
          data: call.data,
          value: call.value || 0n,
        })),
        account: this.client.account!,
      });

      // Wait for the transaction to be mined
      const txHash = await this.client.waitForUserOperationTransaction({
        hash: result.hash,
      });

      console.log('[AlchemyAccountService] ✅ Batch transaction mined:', txHash);

      return {
        hash: txHash,
        request: result.request,
      };
    } catch (error) {
      console.error('[AlchemyAccountService] Failed to send batch user operation:', error);
      throw error;
    }
  }

  /**
   * Send native token (ETH, BNB, etc.)
   * 
   * @param to - Recipient address
   * @param amount - Amount in wei
   */
  async sendNativeToken(
    to: Hex,
    amount: bigint,
    options?: {
      gasSponsored?: boolean;
    }
  ): Promise<UserOperationResult> {
    const call: TransactionCall = {
      target: to,
      data: '0x' as Hex,
      value: amount,
    };

    return this.sendUserOperation(call, options);
  }

  /**
   * Send ERC-20 token
   * 
   * @param tokenAddress - ERC-20 token contract address
   * @param to - Recipient address
   * @param amount - Amount in token's smallest unit
   */
  async sendERC20Token(
    tokenAddress: Hex,
    to: Hex,
    amount: bigint,
    options?: {
      gasSponsored?: boolean;
    }
  ): Promise<UserOperationResult> {
    // Encode ERC-20 transfer function call
    const data = encodeFunctionData({
      abi: [
        {
          name: 'transfer',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' },
          ],
          outputs: [{ type: 'bool' }],
        },
      ],
      functionName: 'transfer',
      args: [to, amount],
    });

    const call: TransactionCall = {
      target: tokenAddress,
      data,
      value: 0n,
    };

    return this.sendUserOperation(call, options);
  }

  /**
   * Execute a smart contract function
   * 
   * @param contractAddress - Contract address
   * @param abi - Contract ABI
   * @param functionName - Function to call
   * @param args - Function arguments
   * @param value - Native token value to send (optional)
   */
  async executeContractFunction(
    contractAddress: Hex,
    abi: any[],
    functionName: string,
    args: any[],
    options?: {
      value?: bigint;
      gasSponsored?: boolean;
    }
  ): Promise<UserOperationResult> {
    const normalizedAbi =
      Array.isArray(abi) && typeof abi[0] === "string"
        ? parseAbi(abi as string[])
        : abi;
    // Encode function call
    const data = encodeFunctionData({
      abi: normalizedAbi,
      functionName,
      args,
    });

    const call: TransactionCall = {
      target: contractAddress,
      data,
      value: options?.value || 0n,
    };

    return this.sendUserOperation(call, options);
  }

  /**
   * Check if account is deployed
   */
  async isAccountDeployed(): Promise<boolean> {
    if (!this.accountAddress || !this.client) {
      return false;
    }

    try {
      // Check if account has code
      const code = await this.client.getBytecode({
        address: this.accountAddress,
      });

      return code !== undefined && code !== '0x' && code !== null;
    } catch (error) {
      console.error('[AlchemyAccountService] Failed to check deployment:', error);
      return false;
    }
  }

  /**
   * Disconnect and cleanup
   */
  disconnect(): void {
    this.client = null;
    this.accountAddress = null;
  }
}

/**
 * Create a new Alchemy Account Service instance
 */
export function createAlchemyAccountService(network: string): AlchemyAccountService {
  return new AlchemyAccountService(network);
}
