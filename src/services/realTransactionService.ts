import { WalletNetwork } from '@/contexts/WalletContext';
import { ethers } from 'ethers';

export interface RealTransaction {
  id: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  tokenSymbol: string;
  tokenAddress?: string;
  type: 'send' | 'receive' | 'contract';
  status: 'confirmed' | 'pending' | 'failed';
  timestamp: Date;
  blockNumber?: number;
  gasUsed?: string;
  gasPrice?: string;
  description: string;
  amount: string; // Formatted amount with symbol
}

export interface TransactionFilters {
  limit?: number;
  offset?: number;
  tokenAddress?: string;
  type?: 'send' | 'receive' | 'contract';
  fromDate?: Date;
  toDate?: Date;
}

class RealTransactionService {
  /**
   * Get real transaction history for a wallet address
   */
  async getTransactionHistory(
    address: string,
    network: WalletNetwork,
    filters: TransactionFilters = {}
  ): Promise<RealTransaction[]> {
    try {
      console.log('📊 Fetching REAL transaction history for:', address);
      
      const provider = new ethers.providers.JsonRpcProvider(network.rpcUrl);
      const transactions: RealTransaction[] = [];
      
      // Get recent block for scanning range
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 10000); // Last ~10000 blocks
      
      console.log(`🔍 Scanning blocks ${fromBlock} to ${currentBlock} on ${network.name}`);

      // Method 1: Get native token transactions using provider
      const nativeTransactions = await this.getNativeTransactions(
        address, 
        provider, 
        fromBlock, 
        currentBlock,
        network
      );
      transactions.push(...nativeTransactions);

      // Method 2: Get ERC-20 token transactions
      if (network.stablecoins) {
        for (const stablecoin of network.stablecoins) {
          const tokenTransactions = await this.getTokenTransactions(
            address,
            stablecoin.address,
            stablecoin.symbol,
            provider,
            fromBlock,
            currentBlock,
            stablecoin.decimals
          );
          transactions.push(...tokenTransactions);
        }
      }

      // Sort by timestamp (newest first)
      transactions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Apply filters
      const filteredTransactions = this.applyFilters(transactions, filters);

      console.log(`✅ Found ${filteredTransactions.length} real transactions`);
      return filteredTransactions;

    } catch (error) {
      console.error('❌ Failed to fetch real transactions:', error);
      return [];
    }
  }

  /**
   * Get native token (ETH, MATIC, BNB) transactions
   */
  private async getNativeTransactions(
    address: string,
    provider: ethers.providers.JsonRpcProvider,
    fromBlock: number,
    toBlock: number,
    network: WalletNetwork
  ): Promise<RealTransaction[]> {
    const transactions: RealTransaction[] = [];
    
    try {
      // Get transaction history from provider
      // Note: This is limited as most free RPCs don't support full history scanning
      // For production, you'd use services like Alchemy, Moralis, or Etherscan API
      
      console.log(`🔍 Scanning native ${network.primaryCurrency} transactions...`);
      
      // Try to get recent transactions (this is a basic approach)
      // In production, you'd use proper indexing services
      const filter = {
        fromBlock,
        toBlock: 'latest' as any,
        address: address,
      };

      // Note: Most free RPCs have limitations on getLogs range
      // This is a simplified approach - production would use proper APIs
      
    } catch (error) {
      console.warn('Could not fetch native transactions with basic method:', error);
    }

    return transactions;
  }

  /**
   * Get ERC-20 token transactions using Transfer events
   */
  private async getTokenTransactions(
    address: string,
    tokenAddress: string,
    tokenSymbol: string,
    provider: ethers.providers.JsonRpcProvider,
    fromBlock: number,
    toBlock: number,
    decimals: number
  ): Promise<RealTransaction[]> {
    const transactions: RealTransaction[] = [];

    try {
      console.log(`🔍 Scanning ${tokenSymbol} transactions...`);

      const contract = new ethers.Contract(
        tokenAddress,
        [
          'event Transfer(address indexed from, address indexed to, uint256 value)'
        ],
        provider
      );

      // Get Transfer events where user is sender or receiver
      const sentFilter = contract.filters.Transfer(address, null);
      const receivedFilter = contract.filters.Transfer(null, address);

      // Query with limited block range to avoid RPC limits
      const blockRange = Math.min(1000, toBlock - fromBlock);
      const queryFromBlock = Math.max(fromBlock, toBlock - blockRange);

      const [sentEvents, receivedEvents] = await Promise.all([
        contract.queryFilter(sentFilter, queryFromBlock, 'latest').catch(() => []),
        contract.queryFilter(receivedFilter, queryFromBlock, 'latest').catch(() => []),
      ]);

      // Process sent transactions
      for (const event of sentEvents) {
        if (event.args) {
          const amount = ethers.utils.formatUnits(event.args.value, decimals);
          const block = await provider.getBlock(event.blockNumber);
          
          transactions.push({
            id: `${event.transactionHash}-${event.logIndex}`,
            hash: event.transactionHash,
            from: event.args.from,
            to: event.args.to,
            value: event.args.value.toString(),
            tokenSymbol,
            tokenAddress,
            type: 'send',
            status: 'confirmed',
            timestamp: new Date(block.timestamp * 1000),
            blockNumber: event.blockNumber,
            description: `Sent ${tokenSymbol}`,
            amount: `-${parseFloat(amount).toFixed(6)} ${tokenSymbol}`,
          });
        }
      }

      // Process received transactions
      for (const event of receivedEvents) {
        if (event.args && event.args.from !== address) { // Avoid duplicates
          const amount = ethers.utils.formatUnits(event.args.value, decimals);
          const block = await provider.getBlock(event.blockNumber);
          
          transactions.push({
            id: `${event.transactionHash}-${event.logIndex}`,
            hash: event.transactionHash,
            from: event.args.from,
            to: event.args.to,
            value: event.args.value.toString(),
            tokenSymbol,
            tokenAddress,
            type: 'receive',
            status: 'confirmed',
            timestamp: new Date(block.timestamp * 1000),
            blockNumber: event.blockNumber,
            description: `Received ${tokenSymbol}`,
            amount: `+${parseFloat(amount).toFixed(6)} ${tokenSymbol}`,
          });
        }
      }

      console.log(`✅ Found ${transactions.length} ${tokenSymbol} transactions`);

    } catch (error) {
      console.warn(`Failed to fetch ${tokenSymbol} transactions:`, error);
    }

    return transactions;
  }

  /**
   * Apply filters to transactions
   */
  private applyFilters(
    transactions: RealTransaction[],
    filters: TransactionFilters
  ): RealTransaction[] {
    let filtered = [...transactions];

    if (filters.type) {
      filtered = filtered.filter(tx => tx.type === filters.type);
    }

    if (filters.tokenAddress) {
      filtered = filtered.filter(tx => tx.tokenAddress === filters.tokenAddress);
    }

    if (filters.fromDate) {
      filtered = filtered.filter(tx => tx.timestamp >= filters.fromDate!);
    }

    if (filters.toDate) {
      filtered = filtered.filter(tx => tx.timestamp <= filters.toDate!);
    }

    if (filters.offset) {
      filtered = filtered.slice(filters.offset);
    }

    if (filters.limit) {
      filtered = filtered.slice(0, filters.limit);
    }

    return filtered;
  }

  /**
   * Get transaction by hash
   */
  async getTransactionByHash(
    hash: string,
    network: WalletNetwork
  ): Promise<RealTransaction | null> {
    try {
      const provider = new ethers.providers.JsonRpcProvider(network.rpcUrl);
      const tx = await provider.getTransaction(hash);
      const receipt = await provider.getTransactionReceipt(hash);
      
      if (!tx || !receipt) return null;

      const block = await provider.getBlock(tx.blockNumber!);
      const amount = ethers.utils.formatEther(tx.value);

      return {
        id: hash,
        hash,
        from: tx.from,
        to: tx.to || '',
        value: tx.value.toString(),
        tokenSymbol: network.primaryCurrency,
        type: 'send', // Could be determined by comparing with user address
        status: receipt.status === 1 ? 'confirmed' : 'failed',
        timestamp: new Date(block.timestamp * 1000),
        blockNumber: tx.blockNumber!,
        gasUsed: receipt.gasUsed.toString(),
        gasPrice: tx.gasPrice?.toString(),
        description: `${network.primaryCurrency} Transaction`,
        amount: `${amount} ${network.primaryCurrency}`,
      };
    } catch (error) {
      console.error('Failed to fetch transaction by hash:', error);
      return null;
    }
  }

  /**
   * Format transaction for display
   */
  formatTransactionForDisplay(transaction: RealTransaction): {
    title: string;
    subtitle: string;
    amount: string;
    date: string;
    icon: string;
    color: string;
  } {
    const date = transaction.timestamp.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    let title = '';
    let icon = '';
    let color = '';

    switch (transaction.type) {
      case 'send':
        title = `Sent ${transaction.tokenSymbol}`;
        icon = 'arrow-top-right';
        color = '#FF6B6B';
        break;
      case 'receive':
        title = `Received ${transaction.tokenSymbol}`;
        icon = 'arrow-bottom-left';
        color = '#51CF66';
        break;
      case 'contract':
        title = 'Contract Interaction';
        icon = 'file-document-outline';
        color = '#339AF0';
        break;
    }

    const fromAddress = transaction.from.slice(0, 6) + '...' + transaction.from.slice(-4);
    const toAddress = transaction.to.slice(0, 6) + '...' + transaction.to.slice(-4);
    
    const subtitle = transaction.type === 'send' 
      ? `To: ${toAddress}`
      : `From: ${fromAddress}`;

    return {
      title,
      subtitle,
      amount: transaction.amount,
      date,
      icon,
      color,
    };
  }
}

export const realTransactionService = new RealTransactionService();