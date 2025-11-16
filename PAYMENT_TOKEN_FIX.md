# Payment Token Fix Summary

## Issue Fixed

When clicking "Stake X amount" in the marketplace flow, the payment screen was defaulting to USDC instead of using the native token selected in the marketplace.

## Root Cause

1. **SendPayment Screen Default**: The SendPayment screen was automatically selecting USDC as the preferred token
2. **Missing Parameters**: No way to pass the selected network and token from marketplace to payment screen
3. **Inconsistent Flow**: Marketplace used native tokens but payment defaulted to stablecoins

## Changes Made

### 1. Navigation Types (`navigation/types.ts`)

```typescript
// Added new parameters to SendPayment route
SendPayment: {
  prefilledRecipient?: string;
  prefilledAmount?: string;
  prefilledMessage?: string;
  prefilledNetwork?: string;    // NEW: Pass network ID
  prefilledToken?: string;      // NEW: Pass token symbol
  returnTo?: "MarketplaceFlow";
  returnParams?: any;
} | undefined;
```

### 2. StakingStep Updates (`StakingStep.tsx`)

```typescript
// Now passes network and token information to SendPayment
navigation.navigate("SendPayment", {
  prefilledRecipient: TREASURY_CONTRACT_ADDRESS,
  prefilledAmount: stakeAmountFormatted,
  prefilledMessage: `Marketplace stake for ${data.action} transaction - 20% collateral`,
  prefilledNetwork: selectedNetwork.id, // NEW: Pass network
  prefilledToken: selectedNetwork.primaryCurrency, // NEW: Pass native token
  returnTo: "MarketplaceFlow",
  returnParams: {
    action: data.action,
    step: 3,
  },
});
```

### 3. SendPayment Screen Updates (`SendPaymentScreen.tsx`)

#### A. Network Switching

```typescript
// Handle prefilled network switch
useEffect(() => {
  const prefilledNetwork = route.params?.prefilledNetwork;
  if (prefilledNetwork && prefilledNetwork !== selectedNetwork.id) {
    switchNetwork(prefilledNetwork as SupportedNetworkId).catch((error) => {
      console.warn("Failed to switch to prefilled network:", error);
    });
  }
}, [route.params?.prefilledNetwork, selectedNetwork.id, switchNetwork]);
```

#### B. Smart Token Selection

```typescript
// Updated token selection logic
useEffect(() => {
  if (availableTokens.length > 0) {
    let preferredToken;

    // If a specific token is prefilled (from marketplace), use that
    if (route.params?.prefilledToken) {
      preferredToken = availableTokens.find(
        (t) => t.symbol === route.params?.prefilledToken
      );
    }

    // Otherwise, prefer native token for marketplace flows, or USDC for regular flows
    if (!preferredToken) {
      if (route.params?.returnTo === "MarketplaceFlow") {
        // For marketplace flows, prefer native token
        preferredToken = availableTokens.find(
          (t) => t.address === "0x0000000000000000000000000000000000000000"
        );
      } else {
        // For regular flows, prefer USDC
        preferredToken =
          availableTokens.find((t) => t.symbol === "USDC") ||
          availableTokens.find(
            (t) => t.address !== "0x0000000000000000000000000000000000000000"
          );
      }
    }

    preferredToken = preferredToken || availableTokens[0];
    setSelectedToken(preferredToken);
  }
}, [availableTokens, route.params?.prefilledToken, route.params?.returnTo]);
```

## Benefits Achieved

### ✅ **Consistent Token Usage**

- Marketplace flow now uses the same native token throughout
- ETH on Ethereum, MATIC on Polygon, BNB on BSC, etc.
- No more unexpected switches to USDC

### ✅ **Real-time Price Updates**

- All calculations use `priceService.calculateUSDValue` for live prices
- 5-minute cache ensures fresh data without excessive API calls
- Accurate conversions for staking amounts

### ✅ **Seamless User Experience**

- User selects network → Native token automatically used
- Staking amount calculated in native tokens
- Payment screen respects marketplace token selection
- USD equivalents always shown for transparency

### ✅ **Smart Payment Defaults**

- **Marketplace flows**: Default to native token (ETH, MATIC, etc.)
- **Regular payments**: Default to USDC for stability
- **Prefilled scenarios**: Use exactly what was specified

## Flow Verification

1. **User in ContractUploadStep**: Enters amount in ETH (native token)
2. **Moves to StakingStep**: Shows 20% stake in ETH + USD equivalent
3. **Clicks "Stake X ETH"**: Navigation includes network=ethereum + token=ETH
4. **SendPayment Screen**:
   - Switches to Ethereum network (if not already)
   - Selects ETH token (native)
   - Pre-fills ETH amount
   - Shows real-time USD conversion

## Technical Implementation

- **Type Safety**: All navigation parameters properly typed
- **Error Handling**: Network switching failures handled gracefully
- **Performance**: Leverages existing price cache (5min timeout)
- **Backwards Compatible**: Regular payment flows unchanged

The payment flow now maintains complete consistency with marketplace token selection while providing real-time, accurate pricing throughout the entire transaction process.
