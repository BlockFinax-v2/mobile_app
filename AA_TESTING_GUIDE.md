# Account Abstraction Testing Guide

**Quick Reference for Testing Phase 4 AA Transaction Integration**

## Prerequisites

- Wallet unlocked with credentials
- Test tokens (USDC) on test networks
- Access to Base Sepolia (AA supported) and Lisk Sepolia (EOA fallback)

## Test Scenarios

### Scenario 1: AA Gasless Transfer (Base Sepolia)

**Network:** Base Sepolia (AA Supported ✅)

**Steps:**
1. Open app and unlock wallet
2. Switch to Base Sepolia network
3. Check AA Status Indicator:
   - Should show "Smart Account Active"
   - Smart account address should be visible
4. Navigate to Send Payment
5. Enter:
   - Recipient: `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0` (test address)
   - Amount: `1.0`
   - Token: USDC
6. Check for "Gasless" indicator in UI
7. Submit transaction
8. Verify:
   - Transaction submitted successfully
   - No gas deducted from wallet
   - Transaction appears as UserOp on Base Sepolia explorer
   - Check console logs for "[TransactionService] Sending transaction via Account Abstraction"

**Expected Result:**
- Transaction completes without paying gas
- Single confirmation (~30 seconds)
- UserOp visible on explorer

---

### Scenario 2: EOA Fallback Transfer (Lisk Sepolia)

**Network:** Lisk Sepolia (AA Not Supported ❌)

**Steps:**
1. Switch to Lisk Sepolia network
2. Check AA Status Indicator:
   - Should show "Smart Account Unavailable" or similar
3. Navigate to Send Payment
4. Enter:
   - Recipient: Test address
   - Amount: `1.0`
   - Token: USDC
5. Check for gas fee estimate (should be visible)
6. Submit transaction
7. Verify:
   - Traditional transaction submitted
   - Gas deducted from wallet
   - Console logs show "[TransactionService] AA not supported on Lisk Sepolia, using EOA"

**Expected Result:**
- Transaction completes via traditional EOA
- Gas fee paid by user
- Standard transaction on Lisk Sepolia explorer

---

### Scenario 3: Batch Staking (Future - when Lisk supports AA)

**Network:** Lisk Sepolia (Currently uses EOA, will use AA when supported)

**Current Behavior (EOA - 2 transactions):**
1. Navigate to Treasury Portal → Staking
2. Enter stake amount: `10.0`
3. Submit
4. Observe progress:
   - `checking` - Validating
   - `approving` - Approve USDC transaction
   - Wait for approval confirmation
   - `staking` - Stake transaction
   - Wait for stake confirmation
5. Verify:
   - Two separate transactions in wallet history
   - Gas paid for both transactions
   - Console shows sequential approve + stake

**Future Behavior (AA - 1 batch UserOp):**
1. Same steps to enter stake amount
2. Observe progress:
   - `checking` - Validating
   - `batching` - Preparing batch UserOp
   - Single confirmation
3. Verify:
   - One transaction in wallet history
   - No gas paid (gasless)
   - Console shows "[StakingService] Executing AA batch stake"
   - Both approve + stake executed in one UserOp

---

### Scenario 4: Network Switching AA → EOA

**Test:** Seamless transition between AA and non-AA networks

**Steps:**
1. Start on Base Sepolia (AA supported)
2. Check `isGasless` status: Should be `true`
3. Send a test transaction (gasless)
4. Switch to Lisk Sepolia (AA not supported)
5. Check `isGasless` status: Should be `false`
6. Send a test transaction (pays gas)
7. Switch back to Base Sepolia
8. Check `isGasless` status: Should be `true` again
9. Send a test transaction (gasless)

**Expected Result:**
- Smooth transitions between AA and EOA
- No errors or crashes
- Correct `isGasless` status on each network
- Transactions complete successfully on both networks

---

### Scenario 5: AA Failure Fallback

**Test:** Verify EOA fallback when AA fails

**Simulate AA Failure:**
```typescript
// Temporarily modify shouldUseAA() in transactionService.ts
private shouldUseAA(params: TransactionParams): boolean {
  // Force AA attempt
  return true;
}

// Modify sendViaAA() to throw error
private async sendViaAA(params: TransactionParams): Promise<TransactionResult> {
  throw new Error('Simulated AA failure');
}
```

**Steps:**
1. Submit transaction on Base Sepolia
2. Observe console logs:
   - "[TransactionService] Sending transaction via Account Abstraction"
   - "[TransactionService] AA transaction failed: Simulated AA failure"
   - "[TransactionService] Falling back to EOA transaction"
   - "[TransactionService] Sending transaction via EOA"
3. Verify transaction completes successfully via EOA

**Restore Code:**
Remove simulation code after testing.

**Expected Result:**
- AA failure logged as warning
- Automatic fallback to EOA
- Transaction completes successfully
- No user-facing error

---

## Console Log Checks

### Successful AA Transaction

Look for these logs:
```
[TransactionService] Sending transaction via Account Abstraction
[TransactionService] Network: Base Sepolia, Token: 0x..., Amount: 1.0
[AlchemyAccountService] Initialized Modular Account V2
[AlchemyAccountService] Account address: 0x...
[TransactionService] AA transaction sent: 0x...
```

### EOA Fallback

Look for these logs:
```
[TransactionService] Sending transaction via EOA
[TransactionService] AA not supported on Lisk Sepolia
```

### Batch Staking (when supported)

Look for these logs:
```
[StakingService] Executing AA batch stake: amount: 10.0, amountInWei: 10000000
[AlchemyAccountService] Sending batch UserOp with 2 operations
[StakingService] AA batch stake submitted: 0x...
```

---

## Debug Tools

### AA Status Indicator Component

**Location:** `/src/components/ui/AAStatusIndicator.tsx`

**Usage:**
```typescript
import { AAStatusIndicator } from '@/components/ui/AAStatusIndicator';

// Add to any screen for debugging
<AAStatusIndicator />
```

**Shows:**
- Smart Account address
- Deployment status
- AA availability per network
- Real-time status updates

### Manual AA Check

```typescript
import { FEATURE_FLAGS } from '@/config/featureFlags';
import { isAlchemyNetworkSupported } from '@/config/alchemyAccount';

// Check if AA should be available
const checkAA = (networkId: string, smartAccountAddress?: string) => {
  console.log('Feature Flag:', FEATURE_FLAGS.USE_ALCHEMY_AA);
  console.log('Network Supported:', isAlchemyNetworkSupported(networkId));
  console.log('Smart Account:', smartAccountAddress);
  console.log('AA Available:', 
    FEATURE_FLAGS.USE_ALCHEMY_AA && 
    isAlchemyNetworkSupported(networkId) && 
    !!smartAccountAddress
  );
};
```

---

## Common Issues

### Issue 1: Smart Account Not Initializing

**Symptoms:**
- `smartAccountAddress` is null/undefined
- AA always falls back to EOA
- Console shows "Failed to initialize smart account"

**Solutions:**
1. Ensure wallet is unlocked
2. Check private key exists in secure storage
3. Verify Alchemy API key is valid
4. Check network connectivity

### Issue 2: Transactions Always Use EOA

**Symptoms:**
- Always see "[TransactionService] Sending transaction via EOA"
- Never see AA logs

**Diagnosis:**
```typescript
// Check in console
console.log('USE_ALCHEMY_AA:', FEATURE_FLAGS.USE_ALCHEMY_AA);
console.log('Network:', selectedNetwork.id);
console.log('AA Supported:', isAlchemyNetworkSupported(selectedNetwork.id));
console.log('Smart Account:', smartAccountAddress);
```

**Solutions:**
1. Verify `USE_ALCHEMY_AA` is `true` in `/src/config/featureFlags.ts`
2. Ensure network is in Alchemy supported list
3. Check smart account initialized (unlock wallet)

### Issue 3: Batch Staking Not Working

**Expected:** Batch staking only works when Lisk Sepolia is supported by Alchemy

**Current Status:** Lisk Sepolia NOT supported → uses EOA

**Workaround:** Test batch operations on Base Sepolia when Alchemy adds Lisk support

---

## Success Criteria

### Phase 4 Complete When:

✅ **AA Transfers:**
- [ ] Gasless USDC transfer on Base Sepolia successful
- [ ] Transaction shows as UserOp on explorer
- [ ] No gas deducted from wallet

✅ **EOA Fallback:**
- [ ] Transfers on Lisk Sepolia use EOA
- [ ] Gas correctly deducted
- [ ] No errors or crashes

✅ **Network Switching:**
- [ ] Smooth transitions between AA and EOA networks
- [ ] Correct `isGasless` status on each network
- [ ] Transactions work on both network types

✅ **Error Handling:**
- [ ] AA failures automatically fallback to EOA
- [ ] No user-facing errors from AA failures
- [ ] Transactions complete successfully

✅ **Staking:**
- [ ] Staking works on Lisk Sepolia (EOA)
- [ ] Approve + stake transactions complete
- [ ] Ready for batch AA when network supported

✅ **UI/UX:**
- [ ] Gasless indicator visible when AA active
- [ ] Gas fee shown when using EOA
- [ ] AA status indicator shows correct state
- [ ] No confusing error messages

---

## Next Steps After Testing

1. **Gather Metrics:**
   - Transaction success rate (AA vs EOA)
   - Gas savings (total cost avoided)
   - Transaction speed (confirmation time)
   - User feedback

2. **Optimize:**
   - Fine-tune gas policies
   - Improve error messages
   - Add more networks to AA support
   - Enhance UI feedback

3. **Plan Phase 5:**
   - Session keys for dApp interactions
   - Social recovery options
   - Multi-sig operations
   - Scheduled transactions

---

**Testing Version:** 1.0  
**Last Updated:** December 2024  
**Status:** Ready for manual testing
