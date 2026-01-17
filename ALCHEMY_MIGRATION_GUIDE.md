# Alchemy Account Abstraction Migration Guide

## Overview

This guide documents the migration from Pimlico/permissionless.js to Alchemy Account Kit SDK for ERC-4337 Account Abstraction in the BlockFinax mobile app.

**Migration Strategy:** Hybrid Approach (Both Systems Coexist)
**Timeline:** Gradual migration over multiple phases
**Status:** Phase 3 Complete ✅ - Testing Phase

---

## Phase 1: Setup & Foundation (COMPLETED ✅)

### What Was Done

1. **Installed Alchemy AA SDK Packages**
   ```json
   "@aa-sdk/core": "^4.82.1",
   "@account-kit/core": "^4.82.1",
   "@account-kit/infra": "^4.82.1",
   "@account-kit/logging": "^4.82.1",
   "@account-kit/react-native-signer": "^4.82.1",
   "@account-kit/smart-contracts": "^4.82.1"
   ```

2. **Maintained Backward Compatibility**
   - Kept `permissionless@^0.3.2` in dependencies
   - Existing Pimlico implementation remains functional
   - Both systems can coexist during migration

3. **Created Core Infrastructure**
   - [src/config/alchemyAccount.ts](src/config/alchemyAccount.ts) - Alchemy configuration
   - [src/services/alchemyAccountService.ts](src/services/alchemyAccountService.ts) - Core service
   - [src/contexts/AlchemySmartAccountContext.tsx](src/contexts/AlchemySmartAccountContext.tsx) - React Context

4. **Updated Environment Variables**
   - Added `EXPO_PUBLIC_ALCHEMY_API_KEY`
   - Added `EXPO_PUBLIC_ALCHEMY_GAS_POLICY_ID` (optional)
   - See [.env.example](.env.example) for details

5. **TypeScript Compilation**
   - All new code passes TypeScript checks ✅
   - No breaking changes to existing code

### Supported Networks

The Alchemy integration currently supports:

- **Ethereum Sepolia** (`ethereum_sepolia`)
- **Base Mainnet** (`base`)
- **Base Sepolia** (`base_sepolia`)
- **Polygon Mainnet** (`polygon`)
- **Polygon Amoy** (`polygon_amoy`)

---

## Phase 2: Context Integration (COMPLETED ✅)

### What Was Done

1. **Created Feature Flag System** - [src/config/featureFlags.ts](src/config/featureFlags.ts)
   - Global toggle: `USE_ALCHEMY_AA` (default: false)
   - Screen-specific rollout: `ALCHEMY_AA_SCREENS` array
   - Debug mode and gas sponsorship flags
   - Environment override support

2. **Integrated AlchemySmartAccountProvider** - [src/providers/AppProviders.tsx](src/providers/AppProviders.tsx)
   - Added to provider tree (nested inside SmartAccountProvider)
   - Both Pimlico and Alchemy now available simultaneously
   - Feature flags logged on app mount

3. **Created Unified Smart Account Hook** - [src/hooks/useSmartAccountProvider.ts](src/hooks/useSmartAccountProvider.ts)
   - `useSmartAccountProvider()` - Main unified interface
   - `useActiveProvider()` - Returns active provider name
   - `useSmartAccountProviders()` - Direct access to both (for testing)
   - Automatic switching based on feature flags
   - Property mapping between different APIs

4. **Created Test Screen** - [src/screens/test/SmartAccountTestScreen.tsx](src/screens/test/SmartAccountTestScreen.tsx)
   - Visual feature flag status
   - Initialize both providers
   - Side-by-side comparison
   - Test result logging

5. **TypeScript Validation**
   - All compilation errors resolved ✅
   - Type-safe property mappings
   - No breaking changes

### Documentation

- [PHASE_2_SUMMARY.md](PHASE_2_SUMMARY.md) - Detailed completion summary
- All Phase 2 objectives achieved

---

## Phase 3: Screen Migration (NEXT)

## Phase 3: Screen-by-Screen Migration (COMPLETE ✅)

### Achievement Summary

**Components Migrated:** 1 / 1 needed (100%)  
**Alchemy Status:** Enabled globally via feature flags  
**Architecture:** Clean - most components use props, not direct context

✅ **Key Discovery:** The codebase architecture naturally supports this migration. Most components receive smart account data through props rather than directly importing the context. This means minimal migration was needed!

### Completed Migrations

1. ✅ **SmartAccountPaymentOptions** - Migrated to unified hook
   - Removed provider name from UI (users don't see "ALCHEMY" or "PIMLICO")
   - Clean interface focusing on features, not implementation

2. ✅ **SmartAccountTestScreen** - Already using unified hook (created in Phase 2)

### Components Analysis

**No Migration Needed:**
- **WalletTypeSelector** - Uses props
- **PaymentMethodModal** - Uses props  
- **BatchTransactionBuilder** - Pure UI
- **GasPaymentModal** - Uses different service

### Current Configuration

```typescript
// featureFlags.ts
USE_ALCHEMY_AA: true  // ✅ Alchemy enabled globally
ALCHEMY_AA_SCREENS: []  // Empty = all screens use Alchemy
```

### Next Steps

1. **Test with Alchemy** - Verify all smart account features work
2. **Monitor Performance** - Track transaction success and gas costs
3. **Plan Pimlico Removal** - Deprecate once Alchemy proven stable

### Documentation

- [PHASE_3_PROGRESS.md](PHASE_3_PROGRESS.md) - Detailed analysis and deprecation plan

---

## Phase 4: Gas Manager Configuration (NEXT)

### Approach

Migrate screens one at a time, testing thoroughly before moving to the next.

### Migration Order

1. **Low-Risk Screens** (Start Here)
   - Debug screens
   - Test transaction screen ([SmartAccountTestScreen](src/screens/test/SmartAccountTestScreen.tsx) ✅ created)
   - Simple wallet send operations

2. **Medium-Risk Screens**
   - Staking operations
   - Token swaps
   - Marketplace transactions

3. **High-Risk Screens** (Last)
   - Treasury operations
   - Multi-network operations
   - Complex batch transactions

### Migration Checklist Per Screen

- [ ] Identify all smart account operations
- [ ] Switch to unified hook (`useSmartAccountProvider`)
- [ ] Test with feature flag OFF (Pimlico)
- [ ] Test with feature flag ON (Alchemy)
- [ ] Verify gas costs are acceptable
- [ ] Update error handling if needed
- [ ] Document any behavioral differences

---

## Phase 4: Gas Manager Configuration (PLANNED)

### Approach

Migrate screens one at a time, testing thoroughly before moving to the next.

### Migration Order

1. **Low-Risk Screens** (Start Here)
   - Debug screens
   - Test transaction screen
   - Simple wallet send operations

2. **Medium-Risk Screens**
   - Staking operations
   - Token swaps
   - Marketplace transactions

3. **High-Risk Screens** (Last)
   - Treasury operations
   - Multi-network operations
   - Complex batch transactions

### Migration Checklist Per Screen

- [ ] Identify all smart account operations
- [ ] Switch to unified hook (`useSmartAccountProvider`)
- [ ] Test with feature flag OFF (Pimlico)
- [ ] Test with feature flag ON (Alchemy)
- [ ] Verify gas costs are acceptable
- [ ] Update error handling if needed
- [ ] Document any behavioral differences

---

## Phase 4: Gas Manager Configuration (PLANNED)

### Goals

1. Set up Alchemy Gas Manager policies
2. Configure spending limits
3. Monitor gas sponsorship costs

### Steps

1. **Create Gas Policy in Alchemy Dashboard**
   - Go to: https://dashboard.alchemy.com/gas-manager
   - Set daily/monthly spending limits
   - Configure allowed operations
   - Copy Policy ID

2. **Update Environment Variables**
   ```
   EXPO_PUBLIC_ALCHEMY_GAS_POLICY_ID=your_policy_id_here
   ```

3. **Configure Gas Limits**
   ```typescript
   // Per user per day
   EXPO_PUBLIC_PER_USER_DAILY_LIMIT=0.50  // $0.50

   // Global across all users
   EXPO_PUBLIC_GLOBAL_DAILY_LIMIT=50.0    // $50.00
   ```

4. **Monitor Usage**
   - Track via Alchemy Dashboard
   - Set up alerts for approaching limits
   - Adjust policies based on actual usage

---

## Phase 5: Network Expansion (PLANNED)

### Adding New Networks

Currently supported networks are limited to those with Alchemy chain configs:
- Ethereum Sepolia
- Base (Mainnet + Sepolia)
- Polygon (Mainnet + Amoy)

To add more networks:

1. **Check Alchemy Support**
   ```typescript
   // Available in @account-kit/infra:
   import { 
     mainnet, goerli, sepolia,
     base, baseGoerli, baseSepolia,
     polygon, polygonMumbai, polygonAmoy,
     arbitrum, arbitrumGoerli, arbitrumSepolia,
     optimism, optimismGoerli, optimismSepolia,
     // ... many others
   } from '@account-kit/infra';
   ```

2. **Update Configuration**
   ```typescript
   // src/config/alchemyAccount.ts
   export const ALCHEMY_CHAINS = {
     // Add new network
     arbitrum: arbitrum,
     'arbitrum-mainnet': arbitrum, // Map to internal network ID
   };

   export const SUPPORTED_ALCHEMY_NETWORKS = [
     'ethereum_sepolia',
     'base',
     'base_sepolia',
     'polygon',
     'polygon_amoy',
     'arbitrum-mainnet', // New network
   ] as const;
   ```

3. **Update Network Configs**
   ```typescript
   export const NETWORK_CONFIGS = {
     'arbitrum-mainnet': {
       name: 'Arbitrum One',
       chainId: 42161,
       rpcUrl: 'https://arb-mainnet.g.alchemy.com/v2/',
       explorerUrl: 'https://arbiscan.io',
     },
   };
   ```

---

## Phase 6: Remove Pimlico (FINAL)

### Prerequisites

- [ ] All screens migrated to Alchemy
- [ ] All tests passing
- [ ] Gas costs acceptable
- [ ] User acceptance testing complete
- [ ] 2 weeks of production monitoring
- [ ] No critical issues reported

### Removal Steps

1. **Remove Pimlico Dependencies**
   ```bash
   npm uninstall permissionless
   ```

2. **Delete Pimlico Files**
   - `src/services/smartAccountService.ts`
   - `src/config/smartAccount.ts` (Pimlico config)
   - `src/contexts/SmartAccountContext.tsx` (old context)

3. **Update Documentation**
   - Archive this migration guide
   - Update README.md
   - Update ACCOUNT_ABSTRACTION_GUIDE.md

4. **Clean Up Code**
   - Remove feature flags
   - Remove unified provider hook
   - Rename Alchemy context to SmartAccountContext
   - Update all imports

---

## Architecture Comparison

### Before (Pimlico)

```
WalletContext (EOA)
    ↓
SmartAccountContext (Pimlico)
    ↓
smartAccountService
    ↓
permissionless.js + viem
    ↓
Pimlico Bundler + Paymaster
```

### After (Alchemy)

```
WalletContext (EOA)
    ↓
AlchemySmartAccountContext
    ↓
alchemyAccountService
    ↓
@account-kit/smart-contracts
    ↓
Alchemy Bundler + Gas Manager
```

---

## Key Differences

### Account Type
- **Pimlico:** SimpleAccount (ERC-4337 v0.6)
- **Alchemy:** Modular Account V2 (ERC-4337 v0.7)

### SDK Structure
- **Pimlico:** Single package (`permissionless`)
- **Alchemy:** Multiple packages (`@aa-sdk/*`, `@account-kit/*`)

### Gas Sponsorship
- **Pimlico:** Sponsorship policies via dashboard
- **Alchemy:** Gas Manager with detailed spending controls

### Network Support
- **Pimlico:** Custom RPC configuration
- **Alchemy:** Pre-configured chains via `@account-kit/infra`

---

## API Reference

### AlchemyAccountService

```typescript
// Initialize
const service = new AlchemyAccountService(network);
await service.initializeSmartAccount(privateKey, { salt, gasPolicyId });

// Get address
const address = service.getAccountAddress();

// Send transactions
await service.sendUserOperation(call);
await service.sendBatchUserOperation(calls);

// Convenience methods
await service.sendNativeToken(to, amount);
await service.sendERC20Token(tokenAddress, to, amount);
await service.executeContractFunction(address, abi, fn, args, value);

// Check deployment
const isDeployed = await service.isAccountDeployed();

// Cleanup
service.disconnect();
```

### AlchemySmartAccountContext

```typescript
const {
  // State
  alchemyAccountAddress,
  isAlchemyInitialized,
  isAlchemyDeployed,
  
  // Actions
  initializeAlchemyAccount,
  sendAlchemyTransaction,
  sendAlchemyBatchTransactions,
  sendAlchemyNativeToken,
  sendAlchemyERC20Token,
  executeAlchemyContractFunction,
  
  // Loading
  isInitializing,
  isSendingTransaction,
  
  // Error
  error,
} = useAlchemySmartAccount();
```

---

## Troubleshooting

### Issue: "Network not supported by Alchemy"

**Solution:** Check that the network ID maps to a supported Alchemy chain in [src/config/alchemyAccount.ts](src/config/alchemyAccount.ts).

### Issue: "Failed to initialize smart account"

**Possible Causes:**
1. Invalid API key - check `EXPO_PUBLIC_ALCHEMY_API_KEY`
2. Network not supported
3. Private key format incorrect

### Issue: "Account parameter required"

**Solution:** The Alchemy client requires explicit account parameter in sendUserOperation calls. This is handled in the service layer.

### Issue: TypeScript errors with Alchemy SDK

**Note:** The Alchemy SDK has complex type definitions. We use `any` for client config to simplify. Consider adding proper types in production.

---

## Performance Considerations

### Bundle Size
- Alchemy SDK is larger than permissionless
- Consider lazy loading if needed
- Total added: ~210 packages

### RPC Calls
- Alchemy provides faster bundler response
- Built-in caching for better performance
- Monitor via Alchemy Dashboard

### Gas Costs
- Compare gas costs between providers
- Alchemy Gas Manager may offer better rates
- Test thoroughly before full migration

---

## Security Notes

1. **API Keys**
   - Store in environment variables only
   - Never commit to git
   - Rotate regularly

2. **Gas Policies**
   - Set conservative limits initially
   - Monitor for abuse
   - Use per-user limits

3. **Private Keys**
   - Continue using secure storage
   - Same security model as before
   - No changes to key management

---

## Rollback Plan

If issues arise during migration:

1. **Immediate Rollback**
   ```typescript
   // src/config/featureFlags.ts
   export const FEATURE_FLAGS = {
     USE_ALCHEMY_AA: false, // Switch back to Pimlico
   };
   ```

2. **Gradual Rollback**
   - Disable Alchemy for specific screens
   - Keep both systems running
   - Investigate issues without user impact

3. **Full Rollback**
   - Remove AlchemySmartAccountProvider from AppProviders
   - All transactions fall back to Pimlico
   - No data loss or user impact

---

## Success Criteria

Phase 2-6 will be considered successful when:

- [ ] All screens migrated to Alchemy
- [ ] TypeScript compilation clean
- [ ] All tests passing
- [ ] Gas costs ≤ Pimlico
- [ ] No user-reported issues for 2 weeks
- [ ] Gas Manager policies working as expected
- [ ] Performance metrics acceptable
- [ ] Team comfortable with new SDK

---

## Next Steps

1. **Immediate (Week 1)**
   - [ ] Get Alchemy API key
   - [ ] Configure Gas Manager policy
   - [ ] Add AlchemySmartAccountProvider to app
   - [ ] Test on a single debug screen

2. **Short-term (Weeks 2-3)**
   - [ ] Implement feature flag system
   - [ ] Create unified smart account hook
   - [ ] Migrate 2-3 low-risk screens
   - [ ] Gather initial feedback

3. **Medium-term (Month 2)**
   - [ ] Migrate remaining screens
   - [ ] Optimize gas policies
   - [ ] Add additional networks if needed
   - [ ] Performance tuning

4. **Long-term (Month 3+)**
   - [ ] Remove Pimlico completely
   - [ ] Clean up code
   - [ ] Final documentation update
   - [ ] Team training complete

---

## Resources

- [Alchemy AA SDK Documentation](https://accountkit.alchemy.com/react/overview)
- [Alchemy Dashboard](https://dashboard.alchemy.com/)
- [ERC-4337 Specification](https://eips.ethereum.org/EIPS/eip-4337)
- [Account Kit GitHub](https://github.com/alchemyplatform/aa-sdk)

---

**Last Updated:** January 17, 2026
**Phase 1 Status:** ✅ Complete
**Next Phase:** Phase 2 - Context Integration
