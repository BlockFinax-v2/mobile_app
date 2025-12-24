# ERC-4337 Account Abstraction Implementation Guide

## ✅ What's Been Implemented

Your BlockFinaX mobile app now has a **complete ERC-4337 Account Abstraction system** with Pimlico integration. Here's what's ready:

### 🏗️ Core Services

1. **GasManager Service** (`src/services/gasManager.ts`)

   - Manages gas sponsorship policies
   - Tracks per-user daily gas usage
   - Automatically selects best gas payment method (sponsored/ERC-20/native)
   - Provides gas usage statistics

2. **UserAccountState Service** (`src/services/userAccountState.ts`)

   - Stores user account information (EOA + Smart Account addresses)
   - Tracks transaction history with gas payment details
   - Manages multi-chain smart account addresses
   - Records user preferences for gas payments

3. **SmartAccountService** (`src/services/smartAccountService.ts`)
   - Creates deterministic smart accounts from EOA
   - Sends transactions with intelligent gas payment
   - Supports batch transactions
   - Asset migration from EOA to Smart Account
   - Automatic smart account deployment

### 🎯 Key Features

✅ **Sponsored Gasless Transactions**

- Daily limit per user (default: $0.50 USD)
- Global daily limit (default: $50 USD)
- Automatic eligibility checking
- Transparent user communication

✅ **ERC-20 Gas Payment**

- Pay gas with USDC, USDT, or DAI
- Automatic fallback when sponsorship limit exceeded
- Uses Pimlico's ERC-20 Token Paymaster

✅ **Smart Account Architecture**

- EOA serves as signer/owner (no approval needed)
- Smart Account holds assets and executes transactions
- Deterministic addresses (same EOA = same Smart Account)
- No need to pre-fund with native tokens

✅ **Universal Integration**

- Works across entire app (send, stake, swap, trade finance)
- Backward compatible with existing EOA transactions
- Batch multiple operations in single transaction

---

## 🚀 Quick Start

### Step 1: Get Pimlico API Key

1. Go to [https://dashboard.pimlico.io/](https://dashboard.pimlico.io/)
2. Sign up and create a new project
3. Copy your API key

### Step 2: Configure Environment

1. Copy `.env.example` to `.env`:

   ```bash
   cp .env.example .env
   ```

2. Add your Pimlico API key:

   ```env
   EXPO_PUBLIC_PIMLICO_API_KEY=your_actual_api_key_here
   ```

3. (Optional) Customize gas limits:

   ```env
   # Per-user daily limit
   EXPO_PUBLIC_PER_USER_DAILY_LIMIT=0.50

   # Global daily limit
   EXPO_PUBLIC_GLOBAL_DAILY_LIMIT=50.0

   # Max sponsored transaction value
   EXPO_PUBLIC_MAX_SPONSORED_VALUE=100.0
   ```

### Step 3: Initialize Gas Manager

The gas manager is automatically initialized when the Smart Account Context loads, but you can customize the policy:

```typescript
// In your app initialization (optional)
import { gasManager } from "@/services/gasManager";

gasManager.initialize({
  perUserDailyLimitUSD: 0.5,
  globalDailyLimitUSD: 50.0,
  maxSponsoredValueUSD: 100.0,
  sponsoredOperations: ["transfer", "approve", "stake", "swap"],
});
```

### Step 4: Test It!

1. Start your Expo dev server:

   ```bash
   npm run start
   ```

2. Import or create a wallet in your app

3. Try sending a token transaction:
   - The system will automatically check sponsorship eligibility
   - If eligible, transaction will be gasless ✨
   - If not, gas will be paid with the token being sent

---

## 📊 How It Works

### Gas Payment Flow

```
User initiates transaction
         ↓
Estimate gas cost
         ↓
Check sponsorship eligibility
    ↙         ↘
 Eligible    Not Eligible
    ↓              ↓
Sponsored      Check ERC-20 payment
  Gas            ↙         ↘
    ↓       Available   Unavailable
Execute          ↓           ↓
  Tx        Pay with    Pay with
               Token      Native
```

### Sponsorship Eligibility Criteria

A transaction is eligible for sponsorship if **ALL** of these are true:

1. ✅ Operation is in sponsored list (transfer, stake, etc.)
2. ✅ Transaction value < max sponsored value ($100 default)
3. ✅ User hasn't exceeded daily limit ($0.50 default)
4. ✅ Global limit hasn't been reached ($50 default)

If any criterion fails, system automatically falls back to ERC-20 or native gas payment.

---

## 💻 Usage Examples

### Example 1: Send Token Transfer

```typescript
import { useSmartAccount } from "@/contexts/SmartAccountContext";

function MyComponent() {
  const smartAccount = useSmartAccount();

  const sendTokens = async () => {
    try {
      const txHash = await smartAccount.sendTokenTransfer({
        tokenAddress: "0x...", // USDC address
        recipientAddress: "0x...",
        amount: "10.50",
        decimals: 6,
        operation: "transfer", // For sponsorship tracking
      });

      console.log("Transaction sent:", txHash);
      // System automatically handled gas payment!
    } catch (error) {
      console.error("Transfer failed:", error);
    }
  };

  return <Button onPress={sendTokens}>Send Tokens</Button>;
}
```

### Example 2: Check Sponsorship Status

```typescript
import { useSmartAccount } from "@/contexts/SmartAccountContext";

function GasStatusDisplay() {
  const smartAccount = useSmartAccount();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    async function loadStats() {
      const gasStats = await smartAccount.getUserGasStats();
      setStats(gasStats);
    }
    loadStats();
  }, []);

  if (!stats) return null;

  return (
    <View>
      <Text>Free Transactions Left: {stats.estimatedFreeTransactionsLeft}</Text>
      <Text>Daily Limit: ${stats.dailyLimitUSD}</Text>
      <Text>Used Today: ${stats.dailyUsedUSD.toFixed(4)}</Text>
      <Text>Remaining: ${stats.remainingUSD.toFixed(4)}</Text>
    </View>
  );
}
```

### Example 3: Batch Transactions

```typescript
const sendBatch = async () => {
  const txHash = await smartAccount.sendBatchTransactions({
    transactions: [
      {
        to: "0x...",
        value: BigInt(0),
        data: "0x...", // Encoded function call
      },
      {
        to: "0x...",
        value: BigInt(0),
        data: "0x...", // Another encoded call
      },
    ],
    gasPaymentMethod: "sponsored", // or 'erc20', 'native'
  });
};
```

### Example 4: Migrate Assets to Smart Account

```typescript
// One-time migration of existing assets from EOA to Smart Account
const migrateAssets = async () => {
  const tokenAddresses = [
    "0x...", // USDC
    "0x...", // USDT
    "0x...", // DAI
  ];

  const txHashes = await smartAccount.migrateAssetsToSmartAccount(
    tokenAddresses
  );

  console.log("Migrated assets:", txHashes);
};
```

---

## 🎨 UI Integration

The `usePayment` hook has been updated to show sponsorship status:

```typescript
import { usePayment } from "@/hooks/usePayment";

function PaymentScreen() {
  const { state, actions } = usePayment();

  return (
    <View>
      {state.sponsorshipEligible && <Text>✨ This transaction is free!</Text>}

      {!state.sponsorshipEligible && (
        <Text>Gas will be paid with {state.selectedToken?.symbol}</Text>
      )}

      <Text>Free transactions remaining: {state.estimatedFreeTxsLeft}</Text>

      <Button onPress={() => actions.submitPayment()}>Send Payment</Button>
    </View>
  );
}
```

---

## 🔧 Advanced Configuration

### Custom Sponsorship Policy (Pimlico Dashboard)

For more advanced control, create a sponsorship policy in Pimlico dashboard:

1. Go to [Pimlico Dashboard](https://dashboard.pimlico.io/)
2. Navigate to "Sponsorship Policies"
3. Create new policy with your rules
4. Copy the policy ID
5. Add to `.env`:
   ```env
   EXPO_PUBLIC_PIMLICO_SPONSORSHIP_POLICY_ID=sp_your_policy_id
   ```

### Adjust Gas Limits Programmatically

```typescript
import { gasManager } from "@/services/gasManager";

// Update limits at runtime
gasManager.updatePolicy({
  perUserDailyLimitUSD: 1.0, // Increase to $1 per user
  globalDailyLimitUSD: 100.0, // Increase to $100 total
});
```

### Monitor Gas Usage

```typescript
import { gasManager } from "@/services/gasManager";

// Get global stats
const globalStats = await gasManager.getGlobalGasUsage();
console.log("Total gas used today:", globalStats.dailyGasUsedUSD);

// Get user stats
const userStats = await gasManager.getUserGasUsage("0x...");
console.log("User gas usage:", userStats);
```

---

## 🧪 Testing Checklist

- [ ] Import existing wallet → Smart account created automatically
- [ ] First transaction → Smart account deployed (sponsored)
- [ ] Small transfer (<$0.50 gas) → Uses sponsored gas ✨
- [ ] Large transfer (>$100 value) → Uses ERC-20 gas payment
- [ ] Multiple transactions → Daily limit tracking works
- [ ] Next day → Daily limit resets at midnight UTC
- [ ] Stake tokens → Works with smart account
- [ ] Swap tokens → Works with smart account
- [ ] Batch transactions → All execute in one UserOperation
- [ ] Transaction history → Shows gas payment method
- [ ] User can view remaining sponsored gas
- [ ] Error messages are clear when limits exceeded

---

## 📱 User Experience Flow

### New User Onboarding

1. User creates/imports wallet (EOA)
2. Smart Account automatically created (deterministic address)
3. First transaction deploys smart account (sponsored! 🎉)
4. User has 3-5 free transactions per day

### Daily Usage

1. User initiates transaction
2. App shows: "✨ Free transaction (3 remaining today)"
3. Transaction executes without gas payment
4. User can check remaining free transactions anytime

### Exceeded Limit

1. User exceeds daily sponsored limit
2. App shows: "Gas will be paid with 0.5 USDC"
3. Transaction still works, just uses token payment
4. Limit resets tomorrow

---

## 🐛 Troubleshooting

### "Smart account not initialized"

- Check Pimlico API key is set in `.env`
- Verify network is supported (Sepolia, Base, etc.)
- Check console logs for initialization errors

### "Transaction not eligible for sponsorship"

- Check if transaction value exceeds max sponsored value
- Verify user hasn't exceeded daily limit
- Check operation type is in sponsored list

### "Insufficient balance in smart account"

- First transaction? Assets are in EOA, not smart account yet
- Use "Migrate Assets" feature to move tokens to smart account
- Or manually send tokens to smart account address

### Gas estimation errors

- Ensure Pimlico service is available
- Check network connectivity
- Try fallback to regular EOA transaction

---

## 📈 Monitoring & Analytics

Track your sponsorship usage:

```typescript
// Get statistics
const stats = await gasManager.getUserStats(walletAddress);

console.log({
  totalTransactions: stats.totalTransactions,
  sponsoredTransactions: stats.sponsoredTransactions,
  paidTransactions: stats.paidTransactions,
  sponsorshipPercentage: stats.sponsorshipPercentage,
  accountAge: stats.accountAge, // days
});
```

Monitor in Pimlico Dashboard:

- Total gas sponsored
- Number of UserOperations
- Costs per day/week/month
- Top users by gas consumption

---

## 🎯 Next Steps

1. **Test on Testnet First**

   - Use Sepolia or Base Sepolia
   - Test all transaction types
   - Verify gas limits work as expected

2. **Monitor Initial Usage**

   - Watch Pimlico dashboard for first week
   - Adjust limits based on actual usage
   - Identify any abuse patterns

3. **Optimize Limits**

   - Increase limits for loyal users (future feature)
   - Add premium tiers with higher limits
   - Implement dynamic pricing based on network conditions

4. **Add UI Enhancements**

   - Show real-time sponsorship eligibility
   - Display gas savings over time
   - Add transaction history with gas details

5. **Multi-Chain Support**
   - Test on additional networks
   - Ensure same EOA works across chains
   - Document network-specific considerations

---

## 📚 Additional Resources

- [Pimlico Documentation](https://docs.pimlico.io/)
- [ERC-4337 Specification](https://eips.ethereum.org/EIPS/eip-4337)
- [Permissionless.js Docs](https://docs.pimlico.io/permissionless)
- [Viem Documentation](https://viem.sh/)

---

## 🎉 You're Ready!

Your app now has enterprise-grade Account Abstraction with:

- ✅ Sponsored gasless transactions
- ✅ Intelligent gas payment selection
- ✅ Per-user daily limits
- ✅ Transaction batching
- ✅ Seamless UX across entire app

Just add your Pimlico API key and start testing! 🚀
