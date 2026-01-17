# Alchemy AA Quick Start Guide

## For Developers: Getting Started with Alchemy Account Abstraction

This is a quick reference for developers who want to start using the new Alchemy AA integration.

---

## Setup (One-Time)

### 1. Get Your API Key

1. Go to https://dashboard.alchemy.com/
2. Sign up or log in
3. Click "Create App"
4. Select "Smart Wallets" under features
5. Choose a network (e.g., Base Sepolia for testing)
6. Copy your API key

### 2. Configure Environment

Create/update your `.env` file:

```bash
# Alchemy Account Abstraction
EXPO_PUBLIC_ALCHEMY_API_KEY=your_api_key_here

# Optional: Gas Manager (for sponsored transactions)
# EXPO_PUBLIC_ALCHEMY_GAS_POLICY_ID=your_policy_id
```

---

## Basic Usage

### Import the Hook

```typescript
import { useAlchemySmartAccount } from '@/contexts/AlchemySmartAccountContext';
```

### Initialize Account

```typescript
function MyComponent() {
  const {
    alchemyAccountAddress,
    isAlchemyInitialized,
    initializeAlchemyAccount,
    isInitializing,
    error
  } = useAlchemySmartAccount();

  useEffect(() => {
    if (!isAlchemyInitialized) {
      initializeAlchemyAccount();
    }
  }, []);

  if (isInitializing) return <Text>Initializing Alchemy account...</Text>;
  if (error) return <Text>Error: {error}</Text>;
  if (!isAlchemyInitialized) return null;

  return <Text>Account: {alchemyAccountAddress}</Text>;
}
```

---

## Common Operations

### Send Native Token (ETH, MATIC, etc.)

```typescript
const { sendAlchemyNativeToken, isSendingTransaction } = useAlchemySmartAccount();

async function sendETH() {
  try {
    const result = await sendAlchemyNativeToken(
      '0xRecipientAddress' as Hex,
      parseEther('0.01') // 0.01 ETH
    );
    console.log('Transaction hash:', result.hash);
  } catch (error) {
    console.error('Failed:', error);
  }
}
```

### Send ERC-20 Token

```typescript
const { sendAlchemyERC20Token } = useAlchemySmartAccount();

async function sendUSDC() {
  const USDC_ADDRESS = '0x...'; // Token contract address
  const amount = 1000000n; // 1 USDC (6 decimals)

  const result = await sendAlchemyERC20Token(
    USDC_ADDRESS as Hex,
    '0xRecipientAddress' as Hex,
    amount
  );
}
```

### Execute Contract Function

```typescript
const { executeAlchemyContractFunction } = useAlchemySmartAccount();

async function stakeTokens() {
  const STAKING_CONTRACT = '0x...';
  const STAKING_ABI = [...]; // Your contract ABI
  
  const result = await executeAlchemyContractFunction(
    STAKING_CONTRACT as Hex,
    STAKING_ABI,
    'stake', // function name
    [parseEther('10')], // function args
    0n // ETH value (optional)
  );
}
```

### Batch Transactions

```typescript
const { sendAlchemyBatchTransactions } = useAlchemySmartAccount();

async function batchOperations() {
  const calls = [
    {
      target: '0xToken1' as Hex,
      data: encodeFunctionData({ ... }),
      value: 0n
    },
    {
      target: '0xToken2' as Hex,
      data: encodeFunctionData({ ... }),
      value: 0n
    }
  ];

  const result = await sendAlchemyBatchTransactions(calls);
}
```

---

## Complete Example: Token Transfer Screen

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button } from 'react-native';
import { useAlchemySmartAccount } from '@/contexts/AlchemySmartAccountContext';
import { parseEther, type Hex } from 'viem';

export function AlchemyTransferScreen() {
  const {
    alchemyAccountAddress,
    isAlchemyInitialized,
    initializeAlchemyAccount,
    sendAlchemyNativeToken,
    isInitializing,
    isSendingTransaction,
    error
  } = useAlchemySmartAccount();

  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState<string | null>(null);

  useEffect(() => {
    if (!isAlchemyInitialized) {
      initializeAlchemyAccount();
    }
  }, []);

  async function handleSend() {
    if (!recipient || !amount) return;

    try {
      const result = await sendAlchemyNativeToken(
        recipient as Hex,
        parseEther(amount)
      );
      setTxHash(result.hash);
      alert('Transaction sent!');
    } catch (err) {
      alert('Failed: ' + err.message);
    }
  }

  if (isInitializing) {
    return <Text>Initializing Alchemy account...</Text>;
  }

  if (error) {
    return <Text>Error: {error}</Text>;
  }

  return (
    <View>
      <Text>Smart Account: {alchemyAccountAddress}</Text>
      
      <TextInput
        placeholder="Recipient address"
        value={recipient}
        onChangeText={setRecipient}
      />
      
      <TextInput
        placeholder="Amount (ETH)"
        value={amount}
        onChangeText={setAmount}
        keyboardType="numeric"
      />
      
      <Button
        title={isSendingTransaction ? "Sending..." : "Send"}
        onPress={handleSend}
        disabled={isSendingTransaction}
      />
      
      {txHash && <Text>TX: {txHash}</Text>}
    </View>
  );
}
```

---

## Supported Networks

Current Alchemy integration supports:

- ✅ `ethereum_sepolia` - Ethereum Sepolia Testnet
- ✅ `base` - Base Mainnet
- ✅ `base_sepolia` - Base Sepolia Testnet
- ✅ `polygon` - Polygon Mainnet
- ✅ `polygon_amoy` - Polygon Amoy Testnet

Check network ID in WalletContext:
```typescript
const { selectedNetwork } = useWallet();
console.log(selectedNetwork.id); // e.g., "base_sepolia"
```

---

## Error Handling

### Common Errors

**"Alchemy account not initialized"**
- Call `initializeAlchemyAccount()` first
- Check `isAlchemyInitialized` before operations

**"Network not supported"**
- Verify network ID is in supported list
- See [alchemyAccount.ts](src/config/alchemyAccount.ts)

**"No private key found"**
- Wallet must be unlocked
- Check `isUnlocked` from WalletContext

**"Failed to send transaction"**
- Check gas limits and balances
- Verify contract addresses and ABIs
- Review Alchemy Dashboard for errors

### Error Handling Pattern

```typescript
const { error, sendAlchemyTransaction } = useAlchemySmartAccount();

async function safeSend() {
  try {
    const result = await sendAlchemyTransaction(call);
    // Success handling
  } catch (err) {
    // Error is also available in context.error
    console.error('Transaction failed:', err);
    console.error('Context error:', error);
  }
}
```

---

## Testing

### Test on Sepolia First

Always test on testnets before mainnet:

```typescript
import { useWallet } from '@/contexts/WalletContext';

function TestComponent() {
  const { selectedNetwork, switchNetwork } = useWallet();
  
  useEffect(() => {
    // Switch to testnet for testing
    if (selectedNetwork.id !== 'base_sepolia') {
      switchNetwork('base_sepolia');
    }
  }, []);
  
  // Your test logic here
}
```

### Get Test Funds

- **Ethereum Sepolia:** https://sepoliafaucet.com/
- **Base Sepolia:** https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet
- **Polygon Amoy:** https://faucet.polygon.technology/

---

## Gas Sponsorship (Optional)

If you have a Gas Manager policy configured:

### Setup

1. Create policy in Alchemy Dashboard
2. Set spending limits
3. Add policy ID to `.env`:
   ```
   EXPO_PUBLIC_ALCHEMY_GAS_POLICY_ID=your_policy_id
   ```

### Usage

Transactions will automatically use gas sponsorship when:
- Policy ID is configured
- Policy has available balance
- Transaction meets policy rules

No code changes needed!

---

## Comparing with Pimlico

### Old Way (Pimlico)

```typescript
const { smartAccountAddress, sendTransaction } = useSmartAccount();

await sendTransaction({
  to: '0x...',
  value: parseEther('0.1'),
  data: '0x'
});
```

### New Way (Alchemy)

```typescript
const { alchemyAccountAddress, sendAlchemyNativeToken } = useAlchemySmartAccount();

await sendAlchemyNativeToken(
  '0x...' as Hex,
  parseEther('0.1')
);
```

Key differences:
- Prefixed with "alchemy"
- Stronger type safety (Hex type)
- Separate methods for different operations
- Built-in gas management

---

## Performance Tips

### 1. Initialize Once

```typescript
// ✅ Good: Initialize in app startup
useEffect(() => {
  initializeAlchemyAccount();
}, []);

// ❌ Bad: Initialize on every render
function Component() {
  initializeAlchemyAccount(); // Don't do this!
}
```

### 2. Check Initialization State

```typescript
// ✅ Good: Check before operations
if (isAlchemyInitialized) {
  await sendAlchemyTransaction(call);
}

// ❌ Bad: Assume initialized
await sendAlchemyTransaction(call); // May fail!
```

### 3. Handle Loading States

```typescript
// ✅ Good: Show loading UI
if (isInitializing) return <LoadingSpinner />;
if (isSendingTransaction) return <SendingIndicator />;

// ❌ Bad: No feedback
// User doesn't know what's happening
```

---

## Debugging

### Enable Verbose Logging

The Alchemy service logs to console:

```
[AlchemyAccountService] Initializing smart account...
[AlchemyAccountService] Smart account initialized: 0x...
[AlchemyAccountService] Sending user operation...
[AlchemyAccountService] User operation sent: 0x...
[AlchemyAccountService] Transaction mined: 0x...
```

### Check Account Status

```typescript
const {
  isAlchemyInitialized,
  isAlchemyDeployed,
  alchemyAccountAddress
} = useAlchemySmartAccount();

console.log('Status:', {
  initialized: isAlchemyInitialized,
  deployed: isAlchemyDeployed,
  address: alchemyAccountAddress
});
```

### Monitor in Alchemy Dashboard

1. Go to https://dashboard.alchemy.com/
2. Select your app
3. View "Smart Wallets" section
4. See all transactions and user operations

---

## Migration from Pimlico

If migrating existing code:

### 1. Import New Hook

```typescript
// Before
import { useSmartAccount } from '@/contexts/SmartAccountContext';

// After
import { useAlchemySmartAccount } from '@/contexts/AlchemySmartAccountContext';
```

### 2. Update State References

```typescript
// Before
const { smartAccountAddress, isInitialized } = useSmartAccount();

// After
const { alchemyAccountAddress, isAlchemyInitialized } = useAlchemySmartAccount();
```

### 3. Update Method Calls

```typescript
// Before
await sendTransaction(call);

// After
await sendAlchemyTransaction(call);
```

See [ALCHEMY_MIGRATION_GUIDE.md](ALCHEMY_MIGRATION_GUIDE.md) for complete migration plan.

---

## Need Help?

- **Documentation:** [ALCHEMY_MIGRATION_GUIDE.md](ALCHEMY_MIGRATION_GUIDE.md)
- **Configuration:** [src/config/alchemyAccount.ts](src/config/alchemyAccount.ts)
- **Service Code:** [src/services/alchemyAccountService.ts](src/services/alchemyAccountService.ts)
- **Context Code:** [src/contexts/AlchemySmartAccountContext.tsx](src/contexts/AlchemySmartAccountContext.tsx)
- **Alchemy Docs:** https://accountkit.alchemy.com/

---

**Happy Building! 🚀**
