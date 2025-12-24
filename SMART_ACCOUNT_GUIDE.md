# ERC-4337 Account Abstraction Integration Guide

## Overview

BlockFinax now supports **ERC-4337 Account Abstraction** powered by **Pimlico**, enabling:

- ✅ **Gasless Transactions** - Users don't pay gas fees (sponsored by paymaster)
- ✅ **Batch Transactions** - Multiple operations in a single transaction
- ✅ **Programmable Accounts** - Custom validation logic and session keys
- ✅ **Universal Compatibility** - Works with ALL login methods (seed phrase, private key, social login)
- ✅ **Cross-Chain Support** - Ethereum, Base, Lisk, Polygon, BSC

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture](#architecture)
3. [Setup Instructions](#setup-instructions)
4. [Usage Guide](#usage-guide)
5. [API Reference](#api-reference)
6. [Smart Account vs EOA](#smart-account-vs-eoa)
7. [Supported Networks](#supported-networks)
8. [Troubleshooting](#troubleshooting)

---

## Quick Start

### 1. Get Pimlico API Key

1. Visit [https://dashboard.pimlico.io/](https://dashboard.pimlico.io/)
2. Sign up for a free account
3. Create a new project
4. Copy your API key

### 2. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Add your Pimlico API key
EXPO_PUBLIC_PIMLICO_API_KEY=your_api_key_here
```

### 3. Install Dependencies

Already installed:

- `permissionless` - Pimlico's TypeScript SDK
- `viem` - Ethereum library (peer dependency)
- `@account-abstraction/contracts` - ERC-4337 contract interfaces

### 4. Use Smart Accounts in Your Code

```typescript
import { useSmartAccount } from "@/contexts/SmartAccountContext";

function MyComponent() {
  const { smartAccount, isEnabled, sendTransaction } = useSmartAccount();

  const handleGaslessPayment = async () => {
    const txHash = await sendTransaction({
      to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
      value: "0.01", // 0.01 ETH
      gasless: true, // Enable gas sponsorship
    });

    console.log("Transaction hash:", txHash);
  };
}
```

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                     App Component                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │             SmartAccountProvider                     │   │
│  │  ┌──────────────────────────────────────────────┐    │   │
│  │  │        SmartAccountContext                   │    │   │
│  │  │  - Smart Account State                       │    │   │
│  │  │  - Transaction Methods                       │    │   │
│  │  │  - Batch Operations                          │    │   │
│  │  └──────────────────────────────────────────────┘    │   │
│  │              ↓                                       │   │
│  │  ┌──────────────────────────────────────────────┐    │   │
│  │  │      SmartAccountService                     │    │   │
│  │  │  - Pimlico Integration                       │    │   │
│  │  │  - Account Creation                          │    │   │
│  │  │  - Transaction Execution                     │    │   │
│  │  └──────────────────────────────────────────────┘    │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Your Components                         │   │
│  │  - SendPayment                                       │   │
│  │  - TreasuryPortal                                    │   │
│  │  - TradeFinance                                      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                          ↓
          ┌──────────────────────────────┐
          │     Pimlico Infrastructure    │
          │  - Bundler (UserOp relay)    │
          │  - Paymaster (Gas sponsor)   │
          │  - EntryPoint (ERC-4337)     │
          └──────────────────────────────┘
```

### Key Files

| File                                                          | Description                                             |
| ------------------------------------------------------------- | ------------------------------------------------------- |
| `src/contexts/SmartAccountContext.tsx`                        | React context providing smart account state and methods |
| `src/services/smartAccountService.ts`                         | Core service handling Pimlico integration               |
| `src/config/smartAccount.ts`                                  | Configuration and network mappings                      |
| `src/components/smart-account/SmartAccountPaymentOptions.tsx` | UI component for smart account features                 |

---

## Setup Instructions

### Step 1: Pimlico Dashboard Setup

1. **Create Account**

   - Go to [https://dashboard.pimlico.io/](https://dashboard.pimlico.io/)
   - Sign up with your email or GitHub

2. **Create Project**

   - Click "New Project"
   - Name it "BlockFinax"
   - Select your desired networks

3. **Get API Key**

   - Copy the API key from the dashboard
   - Store it securely in your `.env` file

4. **Configure Sponsorship (Optional)**
   - Navigate to "Sponsorship Policies"
   - Click "Create Policy"
   - Set spending limits:
     - Max gas per UserOp
     - Max UserOps per user
     - Total budget
   - Copy the policy ID (starts with `sp_`)

### Step 2: Environment Configuration

Create `.env` file in the mobile_app directory:

```env
# Required: Pimlico API Key
EXPO_PUBLIC_PIMLICO_API_KEY=your_api_key_here

# Optional: Sponsorship Policy ID
# EXPO_PUBLIC_PIMLICO_SPONSORSHIP_POLICY_ID=sp_your_policy_id
```

### Step 3: Verify Integration

Run the app and check console logs for:

```
🔐 Initializing smart account...
📍 Smart Account Address: 0x...
✅ Smart account initialized
```

---

## Usage Guide

### Basic Transaction (Gasless)

```typescript
import { useSmartAccount } from "@/contexts/SmartAccountContext";

function SendPayment() {
  const { sendTransaction, isInitialized } = useSmartAccount();

  const send = async () => {
    if (!isInitialized) {
      alert("Smart account not ready");
      return;
    }

    try {
      const txHash = await sendTransaction({
        to: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
        value: "0.01", // 0.01 ETH
        gasless: true,
      });

      console.log("✅ Transaction sent:", txHash);
    } catch (error) {
      console.error("❌ Failed:", error);
    }
  };
}
```

### Token Transfer (ERC-20)

```typescript
const { sendTokenTransfer } = useSmartAccount();

await sendTokenTransfer(
  "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
  "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb", // Recipient
  "10.50", // Amount
  6 // Decimals
);
```

### Batch Transactions

```typescript
const { sendBatchTransactions } = useSmartAccount();

await sendBatchTransactions({
  transactions: [
    {
      to: "0x...",
      value: parseEther("0.01"),
    },
    {
      to: "0x...",
      value: parseEther("0.02"),
    },
  ],
  gasless: true,
});
```

### Check Smart Account Status

```typescript
const { smartAccount, isEnabled, isInitialized } = useSmartAccount();

if (isEnabled && isInitialized) {
  console.log("Smart Account Address:", smartAccount?.address);
  console.log("EOA Address:", smartAccount?.eoaAddress);
  console.log("Is Deployed:", smartAccount?.isDeployed);
}
```

---

## API Reference

### SmartAccountContext

#### State

```typescript
interface SmartAccountInfo {
  address: Address; // Smart account address
  eoaAddress: Address; // Owner EOA address
  isDeployed: boolean; // Whether account is deployed on-chain
  network: WalletNetwork; // Current network
}
```

#### Methods

##### `sendTransaction(params)`

Send a single transaction.

**Parameters:**

```typescript
{
  to: Address;              // Recipient address
  value?: string;           // Amount in ETH (e.g., "0.1")
  data?: Hex;              // Call data (optional)
  gasless?: boolean;       // Use paymaster sponsorship
}
```

**Returns:** `Promise<Hash | null>`

---

##### `sendBatchTransactions(params)`

Send multiple transactions in one operation.

**Parameters:**

```typescript
{
  transactions: BatchTransaction[];
  gasless?: boolean;
}
```

**Returns:** `Promise<Hash | null>`

---

##### `sendTokenTransfer(tokenAddress, recipientAddress, amount, decimals?)`

Transfer ERC-20 tokens.

**Parameters:**

- `tokenAddress: Address` - Token contract address
- `recipientAddress: Address` - Recipient
- `amount: string` - Amount to send
- `decimals?: number` - Token decimals (default: 18)

**Returns:** `Promise<Hash | null>`

---

##### `estimateGas(params)`

Estimate gas for a transaction.

**Returns:** UserOperation gas estimation

---

## Smart Account vs EOA

| Feature             | EOA (Traditional)         | Smart Account (ERC-4337)                      |
| ------------------- | ------------------------- | --------------------------------------------- |
| **Gas Fees**        | User pays                 | Can be sponsored (gasless)                    |
| **Batch Tx**        | No                        | Yes - multiple operations in one              |
| **Programmable**    | No                        | Yes - custom validation logic                 |
| **Session Keys**    | No                        | Yes - temporary permissions                   |
| **Social Recovery** | No                        | Yes - recover without seed phrase             |
| **Address**         | Directly from private key | Deterministic (same EOA = same smart account) |
| **Setup Cost**      | Free                      | First tx deploys account (~$1-5 gas)          |

### Address Relationship

Your smart account address is **deterministic** based on your EOA:

```
EOA Address (your wallet): 0xABC...123
Smart Account Address:     0xDEF...456  (always the same for this EOA)
```

This means:

- ✅ Same EOA on different devices = same smart account address
- ✅ Works with seed phrase, private key, or social login
- ✅ Can use BOTH addresses (EOA for some txs, smart account for gasless)

---

## Supported Networks

| Network          | Status | Chain ID | Gasless Support |
| ---------------- | ------ | -------- | --------------- |
| Ethereum Mainnet | ✅     | 1        | Yes             |
| Base Mainnet     | ✅     | 8453     | Yes             |
| Lisk Mainnet     | ✅     | 1135     | Yes             |
| Polygon Mainnet  | ✅     | 137      | Yes             |
| BSC Mainnet      | ✅     | 56       | Yes             |
| Ethereum Sepolia | ✅     | 11155111 | Yes (Testnet)   |
| Base Sepolia     | ✅     | 84532    | Yes (Testnet)   |
| Lisk Sepolia     | ✅     | 4202     | Yes (Testnet)   |
| BSC Testnet      | ✅     | 97       | Yes (Testnet)   |

---

## Troubleshooting

### Smart Account Not Initializing

**Symptom:** Console shows "Smart account not ready"

**Solutions:**

1. Check API key is set in `.env`
2. Verify network is supported
3. Check console for Pimlico errors
4. Ensure wallet is connected

---

### Transaction Fails with "AA21"

**Error:** `AA21 didn't pay prefund`

**Cause:** Paymaster rejected sponsorship

**Solutions:**

1. Check sponsorship policy limits
2. Verify paymaster has sufficient funds
3. Try without gasless (`gasless: false`)

---

### Different Smart Account Address

**Symptom:** Smart account address changes

**Causes:**

- Different EOA (different private key/seed)
- Different salt nonce (shouldn't happen in this implementation)

**Solution:** Use same seed phrase/private key for consistent address

---

### Gas Estimation Fails

**Error:** Failed to estimate gas

**Solutions:**

1. Check recipient address is valid
2. Ensure sufficient balance for non-gasless tx
3. Verify contract call data is correct
4. Try increasing gas limits manually

---

## Best Practices

### 1. Always Check Initialization

```typescript
const { isInitialized } = useSmartAccount();

if (!isInitialized) {
  return <Loading />;
}
```

### 2. Handle Errors Gracefully

```typescript
try {
  await sendTransaction(params);
} catch (error) {
  if (error.message.includes("AA21")) {
    // Paymaster rejected - fallback to user-paid gas
  }
  // Show user-friendly error
}
```

### 3. Show Smart Account Status

Use `SmartAccountPaymentOptions` component to inform users:

```typescript
<SmartAccountPaymentOptions
  gaslessEnabled={gasless}
  onGaslessChange={setGasless}
/>
```

### 4. Test on Testnets First

Always test gasless transactions on Sepolia/testnet before mainnet.

---

## Advanced Features (Coming Soon)

- **Session Keys** - Temporary permissions for dApps
- **Social Recovery** - Recover account without seed phrase
- **Spending Limits** - Daily/weekly spending caps
- **Multi-Sig** - Require multiple approvals
- **Scheduled Transactions** - Time-based execution

---

## Support

- **Pimlico Docs:** https://docs.pimlico.io/
- **Discord:** https://t.me/pimlicoHQ
- **GitHub:** https://github.com/pimlicolabs/permissionless.js

---

## License

This integration is part of BlockFinax and follows the same license.
