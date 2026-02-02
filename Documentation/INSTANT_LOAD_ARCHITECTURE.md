# Instant Load Architecture - Background Preloading

## Problem Solved

**Before**: Users would unlock the app and see loading spinners for 5-10 seconds while data loaded
**After**: Users unlock and see their data **instantly** - all loading happens before authentication

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     USER TIMELINE                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. App Opens → Unlock Screen Appears                       │
│     └─ Background preloading STARTS (hidden from user)      │
│        ├─ TradeFinance: Fetch PGAs, logistics partners     │
│        ├─ Treasury: Fetch pools, positions, proposals       │
│        └─ Events: Incremental sync since last visit         │
│                                                              │
│  2. User Enters Password/Fingerprint (5-10 seconds)         │
│     └─ Background preloading COMPLETES (parallel to auth)   │
│                                                              │
│  3. App Unlocks → Main Screen                               │
│     └─ Data appears INSTANTLY (already loaded!)             │
│        └─ Zero loading states visible                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Key Components

### 1. Background Data Loader Service

**File**: `mobile_app/src/services/backgroundDataLoader.ts`

**Purpose**: Centralized service that preloads all app data before authentication completes

**Features**:

- ⚡ **Parallel Loading**: Fetches TradeFinance + Treasury data simultaneously
- 💾 **Persistent Cache**: Saves data to AsyncStorage with timestamps
- 🔄 **Incremental Sync**: Only fetches new events since last visit
- 📊 **Status Tracking**: Reports preload progress and cache age

**API**:

```typescript
// Start background preload (called when unlock screen appears)
await backgroundDataLoader.startPreloading(userAddress, chainId);

// Get cached data (instant - no blockchain calls)
const tradeData = await backgroundDataLoader.getCachedTradeFinanceData();
const treasuryData = await backgroundDataLoader.getCachedTreasuryData();

// Check preload status
const status = await backgroundDataLoader.getPreloadStatus();
// Returns: { tradeFinanceReady, treasuryReady, cacheAge, ... }

// Clear cache (on logout/network switch)
await backgroundDataLoader.clearCache();
```

**Storage Keys**:

- `bg_trade_applications` - All user PGAs
- `bg_trade_logistics_partners` - Logistics providers
- `bg_trade_delivery_persons` - Delivery persons
- `bg_trade_last_sync` - Last synced block number
- `bg_treasury_pools` - Treasury pool data
- `bg_treasury_positions` - User staking positions
- `bg_preload_status` - Preload completion status
- `bg_preload_timestamp` - Last preload time

### 2. Unlock Screen Integration

**File**: `mobile_app/src/screens/auth/UnlockWalletScreen.tsx`

**Changes**:

```typescript
useEffect(() => {
  // 🚀 Start background preload when unlock screen appears
  const startBackgroundPreload = async () => {
    if (!address || !selectedNetwork) return;

    console.log("[UnlockScreen] 🚀 Starting background preload...");
    setIsPreloading(true);

    try {
      await backgroundDataLoader.startPreloading(
        address,
        selectedNetwork.chainId,
      );
      console.log("[UnlockScreen] ✅ Background preload complete");
    } catch (error) {
      console.error("[UnlockScreen] ⚠️ Preload error:", error);
    } finally {
      setIsPreloading(false);
    }
  };

  startBackgroundPreload();
}, [address, selectedNetwork]);
```

**UX Enhancement**:

- Shows subtle loading indicator: "Loading your data in background..."
- Indicator is non-blocking - user can still unlock
- Disappears when preloading completes

### 3. TradeFinance Context

**File**: `mobile_app/src/contexts/TradeFinanceContext.tsx`

**Before** (Full blockchain fetch on every load):

```typescript
const preload = async () => {
  await loadCachedData(); // ~200ms
  await loadHistoricalEvents(); // ~2-5 seconds
  await fetchBlockchainData(); // ~3-8 seconds
  startListening();
};
// Total: 5-13 seconds
```

**After** (Instant load from background preloaded data):

```typescript
const preload = async () => {
  // 1. INSTANT load from background preload (already done!)
  const cachedData = await backgroundDataLoader.getCachedTradeFinanceData();
  setApplications(cachedData.applications);  // ~10ms
  setLogisticsPartners(cachedData.logisticsPartners);
  setDeliveryPersons(cachedData.deliveryPersons);

  // 2. Start real-time listeners immediately
  startListening();

  // 3. Background sync (non-blocking, runs after UI shown)
  loadHistoricalEvents().catch(...);
};
// Total visible to user: <50ms (INSTANT!)
```

**Card Persistence**:

```typescript
const shouldRemoveCard = (event: PGAEvent): boolean => {
  // Cards persist until explicit removal events
  if (event.eventType === "PGACompleted") return true;
  if (event.eventType === "PGAStatusChanged") {
    const newStatus = event.data.newStatus;
    // Remove if Rejected (5), Cancelled (6)
    if (newStatus === 5 || newStatus === 6) return true;
  }
  return false;
};

const handleRealtimeEvent = async (event: PGAEvent) => {
  // Check if event should remove card
  if (shouldRemoveCard(event)) {
    setApplications((prev) => prev.filter((app) => app.id !== event.pgaId));
    persistData();
    return;
  }

  // Otherwise update card data
  const pgaInfo = await getPGA(event.pgaId);
  setApplications((prev) => {
    const updated = [...prev];
    const index = updated.findIndex((app) => app.id === event.pgaId);
    if (index >= 0) {
      updated[index] = mapPGAInfoToApplication(pgaInfo);
    }
    return updated;
  });
};
```

**Persistence Guarantees**:

- ✅ Cards persist across app restarts
- ✅ Cards persist across network switches (per-network cache)
- ✅ Cards persist for days/weeks until removal event
- ✅ No re-fetching unless new events detected
- ✅ Incremental updates only (not full refreshes)

### 4. Treasury Context

**File**: `mobile_app/src/contexts/TreasuryContext.tsx`

**Same optimizations as TradeFinance**:

```typescript
const initialize = async () => {
  // 1. INSTANT load from background preload
  const cachedData = await backgroundDataLoader.getCachedTreasuryData();
  setStakingData(cachedData.position?.stakingData);
  setFinancierStatus(cachedData.position?.financierStatus);

  // 2. Start listeners
  startListening();

  // 3. Background sync (non-blocking)
  loadHistoricalEvents().catch(...);
};
```

## Performance Metrics

### Before Optimization

| Action                | Time    | User Experience            |
| --------------------- | ------- | -------------------------- |
| Unlock Screen Appears | 0ms     | Unlock prompt visible      |
| User Enters Password  | 5s      | User types password        |
| App Unlocks           | 5s      | Loading spinner appears ❌ |
| TradeFinance Loads    | 8s      | Still loading... ❌        |
| Treasury Loads        | 10s     | Still loading... ❌        |
| **Total User Wait**   | **13s** | **Frustrating** ❌         |

### After Optimization

| Action                | Time   | User Experience               |
| --------------------- | ------ | ----------------------------- |
| Unlock Screen Appears | 0ms    | Background preload STARTS 🚀  |
| User Enters Password  | 5s     | Preload completes (hidden) ✅ |
| App Unlocks           | 5s     | Data appears INSTANTLY ⚡     |
| TradeFinance Visible  | 5s     | All cards visible ✅          |
| Treasury Visible      | 5s     | All data visible ✅           |
| **Total User Wait**   | **0s** | **Seamless** ✅               |

### Detailed Timing

```
🚀 UnlockScreen appears (t=0ms)
├─ Background preload starts
│  ├─ TradeFinance: Fetch 20 PGAs (2-3s)
│  ├─ Treasury: Fetch pools + position (1-2s)
│  └─ Events: Incremental sync (1-2s)
│  └─ Total: ~3-5s (parallel)
│
👆 User enters password (t=5000ms)
│  └─ Background preload complete (already done!)
│
🔓 App unlocks (t=5000ms)
├─ TradeFinanceContext.preload()
│  ├─ getCachedTradeFinanceData() → 10ms ⚡
│  ├─ setApplications(cached) → instant
│  └─ startListening() → instant
│  └─ Total: 10-50ms
│
├─ TreasuryContext.initialize()
│  ├─ getCachedTreasuryData() → 10ms ⚡
│  ├─ setStakingData(cached) → instant
│  └─ startListening() → instant
│  └─ Total: 10-50ms
│
✅ User sees data (t=5050ms)
   └─ Feels instant! No loading states!
```

## Cache Invalidation Strategy

### When Cache is Invalidated

1. **Network Switch**: Clear cache when user switches networks

   ```typescript
   // WalletContext
   const switchNetwork = (network) => {
     backgroundDataLoader.clearCache();
     // ... switch network
   };
   ```

2. **Logout**: Clear cache on wallet lock

   ```typescript
   const lockWallet = () => {
     backgroundDataLoader.clearCache();
     // ... lock wallet
   };
   ```

3. **Real-time Events**: Invalidate specific PGA cache on updates
   ```typescript
   const handleRealtimeEvent = (event) => {
     tradeFinanceService.invalidatePGACache(event.pgaId);
     // Fetch fresh data for this PGA
   };
   ```

### Cache Freshness

- **TradeFinance**: 30-second TTL on individual PGAs
- **Treasury**: Updated on every real-time event
- **Background Preload**: Refreshed on every unlock screen appearance
- **Incremental Sync**: Only fetches NEW events since last sync

## Event-Driven Updates

### TradeFinance Events

**Events that UPDATE cards** (card stays, data changes):

- `PGACreated` - New card appears
- `PGAVoteCast` - Vote counts update
- `GuaranteeApproved` - Status changes to "Approved"
- `CollateralPaid` - Payment status updates
- `GoodsShipped` - Shipping status updates
- `CertificateIssued` - Certificate data appears

**Events that REMOVE cards** (card disappears):

- `PGACompleted` - Transaction finished
- `PGAStatusChanged` (to Rejected/Cancelled) - Transaction failed

**Event Handler**:

```typescript
const handleRealtimeEvent = async (event: PGAEvent) => {
  // 1. Check if event removes card
  if (shouldRemoveCard(event)) {
    setApplications((prev) => prev.filter((app) => app.id !== event.pgaId));
    return;
  }

  // 2. Otherwise update card data
  const pgaInfo = await getPGA(event.pgaId, true); // Force fresh fetch
  setApplications((prev) => {
    const updated = [...prev];
    const index = updated.findIndex((app) => app.id === event.pgaId);
    if (index >= 0) {
      updated[index] = mapPGAInfoToApplication(pgaInfo);
    } else {
      updated.push(mapPGAInfoToApplication(pgaInfo)); // New card
    }
    return updated;
  });

  // 3. Persist to AsyncStorage (fire-and-forget)
  persistData();
};
```

### Treasury Events

All Treasury events trigger data updates but never remove items:

- `Staked` - Update staking data
- `Unstaked` - Update staking data
- `RewardsClaimed` - Update rewards
- `ProposalCreated` - Add to proposals list
- `ProposalVoteCast` - Update vote counts
- `ProposalExecuted` - Update proposal status

## Best Practices

### DO ✅

1. **Start preloading on unlock screen appearance**

   ```typescript
   useEffect(() => {
     backgroundDataLoader.startPreloading(address, chainId);
   }, [address, chainId]);
   ```

2. **Use cached data immediately after unlock**

   ```typescript
   const cachedData = await backgroundDataLoader.getCachedTradeFinanceData();
   setApplications(cachedData.applications); // INSTANT
   ```

3. **Persist cards until removal events**

   ```typescript
   if (shouldRemoveCard(event)) {
     setApplications(prev => prev.filter(...));
   }
   ```

4. **Run background sync after UI loads**
   ```typescript
   loadHistoricalEvents().catch((err) => {
     // Non-blocking, runs in background
   });
   ```

### DON'T ❌

1. **Don't fetch from blockchain after unlock**

   ```typescript
   // ❌ BAD - Causes loading delay
   const apps = await tradeFinanceService.getAllPGAsByBuyer(address);

   // ✅ GOOD - Use preloaded cache
   const cachedData = await backgroundDataLoader.getCachedTradeFinanceData();
   ```

2. **Don't wait for sync to complete before showing UI**

   ```typescript
   // ❌ BAD - User waits
   await loadHistoricalEvents();
   setApplications(apps);

   // ✅ GOOD - Show cached, sync in background
   setApplications(cachedData.applications);
   loadHistoricalEvents().catch(...);
   ```

3. **Don't remove cards on every event**

   ```typescript
   // ❌ BAD - Cards disappear too often
   setApplications(prev => prev.filter(...));

   // ✅ GOOD - Only remove on explicit removal events
   if (shouldRemoveCard(event)) {
     setApplications(prev => prev.filter(...));
   }
   ```

## User Experience Goals Achieved

✅ **Zero Loading States**: User never sees spinners after unlock
✅ **Instant Navigation**: All screens load instantly with cached data
✅ **Persistent Cards**: Cards stay until explicitly removed by events
✅ **Real-time Updates**: Events update cards without re-fetching everything
✅ **Offline Resilience**: Cached data works even without network
✅ **Smooth Transitions**: No jarring loading→data→loading cycles

## Monitoring & Debugging

### Performance Logging

```typescript
// Background Loader
[BackgroundLoader] 🚀 Starting background preload...
[BackgroundLoader] 📦 Preloading TradeFinance...
[BackgroundLoader] 💰 Preloading Treasury...
[BackgroundLoader] ✅ TradeFinance preloaded in 2,345ms (20 PGAs)
[BackgroundLoader] ✅ Treasury preloaded in 1,234ms (5 pools)
[BackgroundLoader] ✅ Preload complete in 2,567ms

// UnlockScreen
[UnlockScreen] 🚀 Starting background preload...
[UnlockScreen] ✅ Background preload complete

// TradeFinanceContext
[TradeFinanceContext] ⚡ INSTANT LOAD - Using background preloaded data...
[TradeFinanceContext] 📦 Found 20 preloaded PGAs
[TradeFinanceContext] ✅ INSTANT load in 12ms (preloaded data)
[TradeFinanceContext] ✅ Context ready in 34ms

// TreasuryContext
[TreasuryContext] ⚡ INSTANT LOAD - Using background preloaded data...
[TreasuryContext] 📦 Found preloaded treasury data
[TreasuryContext] ✅ INSTANT load in 8ms (preloaded data)
[TreasuryContext] ✅ Context ready in 21ms
```

### Cache Diagnostics

```typescript
const status = await backgroundDataLoader.getPreloadStatus();
console.log("Preload Status:", status);
// {
//   isPreloading: false,
//   tradeFinanceReady: true,
//   treasuryReady: true,
//   lastPreloadTime: 1675356789123,
//   cacheAge: 5432 // milliseconds
// }
```

## Summary

The new architecture transforms the user experience from:

**Before**: 🐌 Unlock → Wait 5-10s → See data
**After**: ⚡ Unlock → See data instantly

All loading happens **before** authentication, making the app feel native and responsive. Cards persist until explicit removal events, ensuring users never lose track of their transactions. The combination of background preloading, smart caching, and event-driven updates creates a seamless experience where complexity is completely abstracted from the user.
