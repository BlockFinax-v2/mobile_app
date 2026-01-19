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
import { type Hex, encodeFunctionData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import {
  getAlchemyChain,
  isAlchemyNetworkSupported,
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
    if (!isAlchemyNetworkSupported(network)) {
      throw new Error(`Network ${network} is not supported by Alchemy Account Kit`);
    }
    this.network = network;
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
      console.log('[AlchemyAccountService] Initializing smart account...');
      console.log('[AlchemyAccountService] Network:', this.network);

      // Remove 0x prefix if present
      const cleanPrivateKey = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
      
      // Create viem account from private key
      const account = privateKeyToAccount(cleanPrivateKey as Hex);
      console.log('[AlchemyAccountService] EOA Address:', account.address);
      
      // Create signer
      const signer = new LocalAccountSigner(account);

      // Get API configuration
      const apiKey = getAlchemyApiKey();
      const gasPolicyId = options?.gasPolicyId ?? getAlchemyGasPolicyId();
      const chain = getAlchemyChain(this.network);

      console.log('[AlchemyAccountService] 🔍 API Configuration:');
      console.log('[AlchemyAccountService]   - API Key:', apiKey.substring(0, 10) + '...');
      console.log('[AlchemyAccountService]   - Gas Policy ID:', gasPolicyId || 'NONE');
      console.log('[AlchemyAccountService]   - Network:', this.network);
      console.log('[AlchemyAccountService]   - Chain Name:', chain.name);
      console.log('[AlchemyAccountService]   - Chain ID:', chain.id);

      // Create transport
      console.log('[AlchemyAccountService] 🔧 Creating Alchemy transport...');
      const transport = alchemy({ apiKey });
      console.log('[AlchemyAccountService] ✅ Transport created successfully');

      // Create smart account client configuration
      console.log('[AlchemyAccountService] 🔧 Building client configuration...');
      const clientConfig: any = {
        apiKey,
        chain,
        signer,
        transport,
      };
      console.log('[AlchemyAccountService] ✅ Base config created with keys:', Object.keys(clientConfig));

      // Add optional salt
      if (options?.salt !== undefined) {
        clientConfig.salt = options.salt;
      }

      // Add gas manager config if policy ID is provided
      if (gasPolicyId) {
        console.log('[AlchemyAccountService] 💰 Gas sponsorship configuration:');
        console.log('[AlchemyAccountService]   - Policy ID:', gasPolicyId);
        console.log('[AlchemyAccountService]   - Format check:', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(gasPolicyId) ? 'VALID UUID' : 'INVALID FORMAT');
        
        clientConfig.gasManagerConfig = {
          policyId: gasPolicyId,
        };
        
        console.log('[AlchemyAccountService] ✅ Gas manager config added to client config');
        console.log('[AlchemyAccountService] 📋 Final config keys:', Object.keys(clientConfig));
        console.log('[AlchemyAccountService] 📋 Gas manager keys:', Object.keys(clientConfig.gasManagerConfig));
      } else {
        console.log('[AlchemyAccountService] ⚠️  WARNING: No gas policy configured!');
        console.log('[AlchemyAccountService] ⚠️  Transactions will NOT be sponsored!');
        console.log('[AlchemyAccountService] ⚠️  User will need ETH in smart account for gas');
      }

      // Create smart account client
      console.log('[AlchemyAccountService] 🚀 Creating modular account client...');
      console.log('[AlchemyAccountService] 🔍 Pre-flight checks:');
      console.log('[AlchemyAccountService]   - API Key type:', typeof apiKey, '| Length:', apiKey?.length);
      console.log('[AlchemyAccountService]   - Chain type:', typeof chain, '| Has id:', !!chain?.id);
      console.log('[AlchemyAccountService]   - Signer type:', typeof signer, '| Constructor:', signer?.constructor?.name);
      console.log('[AlchemyAccountService]   - Transport type:', typeof transport, '| Is function:', typeof transport === 'function');
      console.log('[AlchemyAccountService]   - Config has gasManagerConfig:', !!clientConfig.gasManagerConfig);
      
      try {
        console.log('[AlchemyAccountService] 📞 Calling createModularAccountAlchemyClient...');
        this.client = await createModularAccountAlchemyClient(clientConfig);
        console.log('[AlchemyAccountService] ✅ Client created successfully!');
      } catch (clientError: any) {
        console.error('[AlchemyAccountService] ❌ Client creation failed!');
        console.error('[AlchemyAccountService] Error name:', clientError?.name);
        console.error('[AlchemyAccountService] Error message:', clientError?.message);
        console.error('[AlchemyAccountService] Error stack:', clientError?.stack);
        throw clientError;
      }

      // Get and store account address
      console.log('[AlchemyAccountService] 🔍 Extracting account address...');
      console.log('[AlchemyAccountService]   - Client exists:', !!this.client);
      console.log('[AlchemyAccountService]   - Client.account exists:', !!this.client?.account);
      console.log('[AlchemyAccountService]   - Client.account.address exists:', !!this.client?.account?.address);
      
      this.accountAddress = this.client.account?.address ?? null;

      if (!this.accountAddress) {
        console.error('[AlchemyAccountService] ❌ Failed to get smart account address!');
        console.error('[AlchemyAccountService] Client keys:', Object.keys(this.client || {}));
        console.error('[AlchemyAccountService] Account keys:', Object.keys(this.client?.account || {}));
        throw new Error('Failed to get smart account address');
      }

      console.log('[AlchemyAccountService] ✅ Smart account initialized successfully!');
      console.log('[AlchemyAccountService] 📍 Smart Account Address:', this.accountAddress);
      console.log('[AlchemyAccountService] 📍 EOA Owner Address:', account.address);

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
      console.log('[AlchemyAccountService] 🚀 Sending user operation...');
      console.log('[AlchemyAccountService] 🔍 Transaction details:');
      console.log('[AlchemyAccountService]   - Target:', call.target);
      console.log('[AlchemyAccountService]   - Value:', call.value?.toString() || '0');
      console.log('[AlchemyAccountService]   - Data length:', call.data?.length || 0);
      console.log('[AlchemyAccountService]   - Client exists:', !!this.client);
      console.log('[AlchemyAccountService]   - Account exists:', !!this.client?.account);

      // Check if account is deployed
      console.log('[AlchemyAccountService] 🔍 Checking if smart account is deployed...');
      const isDeployed = await this.isAccountDeployed();
      console.log('[AlchemyAccountService] Deployment status:', isDeployed ? '✅ DEPLOYED' : '❌ NOT DEPLOYED');
      
      if (!isDeployed) {
        console.warn('[AlchemyAccountService] ⚠️  Smart account not yet deployed!');
        console.warn('[AlchemyAccountService] Account address:', this.accountAddress);
        console.warn('[AlchemyAccountService] This transaction will include deployment (initCode).');
        console.warn('[AlchemyAccountService] If gas policy fails to sponsor deployment:');
        console.warn('[AlchemyAccountService]   1. Check gas policy is active at dashboard.alchemy.com/gas-manager');
        console.warn('[AlchemyAccountService]   2. Ensure policy has funds and allows deployments');
        console.warn('[AlchemyAccountService]   3. OR manually send 0.01 ETH to:', this.accountAddress);
      }

      // Send user operation using the client
      // Gas sponsorship is handled automatically via gasManagerConfig set during client initialization
      console.log('[AlchemyAccountService] 📤 Preparing user operation...');
      const userOp = {
        uo: {
          target: call.target,
          data: call.data,
          value: call.value || 0n,
        },
        account: this.client.account!,
      };
      
      console.log('[AlchemyAccountService] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('[AlchemyAccountService] 🔍 FINAL USER OPERATION STRUCTURE');
      console.log('[AlchemyAccountService] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('[AlchemyAccountService]   ✅ Has uo wrapper:', !!userOp.uo);
      console.log('[AlchemyAccountService]   📍 uo.target (RECIPIENT or TOKEN):', userOp.uo.target);
      console.log('[AlchemyAccountService]   💰 uo.value (WEI):', userOp.uo.value.toString());
      console.log('[AlchemyAccountService]   📦 uo.data:', userOp.uo.data);
      console.log('[AlchemyAccountService]   🔧 uo.data length:', userOp.uo.data.length, 'bytes');
      console.log('[AlchemyAccountService]   ✅ Has account:', !!userOp.account);
      console.log('[AlchemyAccountService]   🏦 Account address (FROM):', userOp.account?.address);
      console.log('[AlchemyAccountService] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('[AlchemyAccountService] ⚠️  CRITICAL: Verify target matches recipient!');
      if (userOp.uo.data === '0x' || userOp.uo.data.length <= 2) {
        console.log('[AlchemyAccountService] 📍 NATIVE TRANSFER: target IS the recipient');
      } else {
        console.log('[AlchemyAccountService] 🪙 TOKEN TRANSFER: target is token contract');
        console.log('[AlchemyAccountService] Recipient is encoded in data field');
      }
      console.log('[AlchemyAccountService] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      console.log('[AlchemyAccountService] 📞 Calling client.sendUserOperation...');
      const result = await this.client.sendUserOperation(userOp);

      console.log('[AlchemyAccountService] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('[AlchemyAccountService] ✅ User operation sent successfully!');
      console.log('[AlchemyAccountService]   - UserOp Hash:', result.hash);
      console.log('[AlchemyAccountService] ⏳ Waiting for transaction to be mined...');
      console.log('[AlchemyAccountService] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Wait for the transaction to be mined
      const txHash = await this.client.waitForUserOperationTransaction({
        hash: result.hash,
      });

      console.log('[AlchemyAccountService] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('[AlchemyAccountService] ⛏️  TRANSACTION MINED!');
      console.log('[AlchemyAccountService] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('[AlchemyAccountService] 📋 Transaction Hash:', txHash);
      console.log('[AlchemyAccountService] 🔗 Check on Explorer:');
      console.log('[AlchemyAccountService]    https://sepolia.etherscan.io/tx/' + txHash);
      console.log('[AlchemyAccountService] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('[AlchemyAccountService] ⚠️  VERIFY: Check the TO field matches your intended recipient!');
      console.log('[AlchemyAccountService] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

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
      console.log('[AlchemyAccountService] Sending batch user operation...');
      console.log('[AlchemyAccountService] Batch size:', calls.length);

      // Send batch user operation
      const result = await this.client.sendUserOperation({
        uo: calls.map(call => ({
          target: call.target,
          data: call.data,
          value: call.value || 0n,
        })),
        account: this.client.account!,
      });

      console.log('[AlchemyAccountService] Batch user operation sent:', result.hash);

      // Wait for the transaction to be mined
      const txHash = await this.client.waitForUserOperationTransaction({
        hash: result.hash,
      });

      console.log('[AlchemyAccountService] Batch transaction mined:', txHash);

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
    console.log('[AlchemyAccountService] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[AlchemyAccountService] 💸 sendNativeToken called');
    console.log('[AlchemyAccountService] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[AlchemyAccountService] 📍 TO (Recipient):', to);
    console.log('[AlchemyAccountService] 💰 AMOUNT (Wei):', amount.toString());
    console.log('[AlchemyAccountService] 💰 AMOUNT (ETH):', (Number(amount) / 1e18).toFixed(6));
    console.log('[AlchemyAccountService] 📦 Data:', '0x (empty - native transfer)');
    console.log('[AlchemyAccountService] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const call: TransactionCall = {
      target: to,
      data: '0x' as Hex,
      value: amount,
    };

    console.log('[AlchemyAccountService] 🔧 TransactionCall constructed:');
    console.log('[AlchemyAccountService]   - target:', call.target);
    console.log('[AlchemyAccountService]   - data:', call.data);
    console.log('[AlchemyAccountService]   - value:', call.value?.toString() || '0');
    console.log('[AlchemyAccountService] 📤 Sending to sendUserOperation...');

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
    console.log('[AlchemyAccountService] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[AlchemyAccountService] 🪙 sendERC20Token called');
    console.log('[AlchemyAccountService] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('[AlchemyAccountService] 📍 Token Contract:', tokenAddress);
    console.log('[AlchemyAccountService] 📍 TO (Recipient):', to);
    console.log('[AlchemyAccountService] 💰 AMOUNT (Units):', amount.toString());
    console.log('[AlchemyAccountService] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
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

    console.log('[AlchemyAccountService] 🔧 ERC-20 transfer data encoded');
    console.log('[AlchemyAccountService]   - Function: transfer(address,uint256)');
    console.log('[AlchemyAccountService]   - Arg[0] to:', to);
    console.log('[AlchemyAccountService]   - Arg[1] amount:', amount.toString());
    console.log('[AlchemyAccountService]   - Encoded data:', data);

    const call: TransactionCall = {
      target: tokenAddress,
      data,
      value: 0n,
    };

    console.log('[AlchemyAccountService] 🔧 TransactionCall constructed:');
    console.log('[AlchemyAccountService]   - target (token contract):', call.target);
    console.log('[AlchemyAccountService]   - data (transfer call):', call.data);
    console.log('[AlchemyAccountService]   - value:', call.value?.toString() || '0');
    console.log('[AlchemyAccountService] 📤 Sending to sendUserOperation...');

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
    // Encode function call
    const data = encodeFunctionData({
      abi,
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
    console.log('[AlchemyAccountService] Disconnected');
  }
}

/**
 * Create a new Alchemy Account Service instance
 */
export function createAlchemyAccountService(network: string): AlchemyAccountService {
  return new AlchemyAccountService(network);
}
