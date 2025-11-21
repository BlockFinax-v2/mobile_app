#!/usr/bin/env node

/**
 * Test Script: Direct Diamond Contract Reward Claiming
 * 
 * This script directly tests the claimRewards functionality on your diamond contract
 * to isolate whether the issue is in the contract or frontend integration.
 */

const { ethers } = require('ethers');

// Configuration
const DIAMOND_CONTRACT_ADDRESS = "0x65C4ce15C9DFA916db081A41340C3c862F0a3343";
const LIQUIDITY_POOL_FACET_ADDRESS = "0x3a66e490BA9AE32D7AbC1c1F802df1a0ed78F64B";
const USDC_ADDRESS = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const RPC_URL = "https://base-sepolia.publicnode.com";
const PRIVATE_KEY = "9d21be91c0bc185640bab43ad7e9a614350c765ee0232efbf7dcb193a0f8baf1";

// LiquidityPoolFacet ABI (minimal for testing)
const LIQUIDITY_POOL_ABI = [
  "function getStake(address staker) external view returns (uint256 amount, bool active, uint256 timestamp, uint256 timeUntilUnlock, uint256 votingPower)",
  "function getPendingRewards(address staker) external view returns (uint256)",
  "function claimRewards() external",
  "function calculateRewards(address staker) external view returns (uint256)",
];

// USDC ABI (minimal)
const USDC_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
];

async function main() {
  try {
    console.log("🧪 Testing Diamond Contract Reward Claiming");
    console.log("=" .repeat(50));
    
    // Setup provider and signer
    const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const address = await signer.getAddress();
    
    console.log("📍 Test Configuration:");
    console.log("  Address:", address);
    console.log("  Diamond Contract:", DIAMOND_CONTRACT_ADDRESS);
    console.log("  LiquidityPool Facet:", LIQUIDITY_POOL_FACET_ADDRESS);
    console.log("  USDC Token:", USDC_ADDRESS);
    console.log("  RPC:", RPC_URL);
    console.log("");

    // Create contract instances
    const liquidityPool = new ethers.Contract(DIAMOND_CONTRACT_ADDRESS, LIQUIDITY_POOL_ABI, signer);
    const usdc = new ethers.Contract(USDC_ADDRESS, USDC_ABI, provider);
    
    // Get current network info
    const network = await provider.getNetwork();
    const gasPrice = await provider.getGasPrice();
    const balance = await signer.getBalance();
    
    console.log("🌐 Network Information:");
    console.log("  Chain ID:", network.chainId);
    console.log("  ETH Balance:", ethers.utils.formatEther(balance), "ETH");
    console.log("  Gas Price:", ethers.utils.formatUnits(gasPrice, "gwei"), "gwei");
    console.log("");

    // Check USDC balance
    const usdcBalance = await usdc.balanceOf(address);
    console.log("💰 USDC Balance:", ethers.utils.formatUnits(usdcBalance, 6), "USDC");
    console.log("");

    console.log("📊 Checking Stake Status...");
    console.log("-".repeat(30));
    
    // Get stake information for connected wallet
    const stakeData = await liquidityPool.getStake(address);
    const [amount, active, timestamp, timeUntilUnlock, votingPower] = stakeData;
    
    // ALSO CHECK THE ADDRESS FROM YOUR LOGS THAT HAS REWARDS
    const addressWithRewards = "0x759eD3d2Cc67a0de53a0ccE270a9E0fEf5e5582A";
    console.log("\n🔍 Checking the address that showed rewards in your frontend logs...");
    const stakeDataWithRewards = await liquidityPool.getStake(addressWithRewards);
    const [amountWR, activeWR, timestampWR, timeUntilUnlockWR, votingPowerWR] = stakeDataWithRewards;
    
    console.log("Address with rewards:", addressWithRewards);
    console.log("  Staked Amount:", ethers.utils.formatUnits(amountWR, 6), "USDC");
    console.log("  Active:", activeWR);
    console.log("  Time Until Unlock:", timeUntilUnlockWR.toString(), "seconds");
    const pendingRewardsWR = await liquidityPool.getPendingRewards(addressWithRewards);
    console.log("  Pending Rewards:", ethers.utils.formatUnits(pendingRewardsWR, 6), "USDC");
    console.log("");
    
    console.log("  Staked Amount:", ethers.utils.formatUnits(amount, 6), "USDC");
    console.log("  Active:", active);
    console.log("  Stake Timestamp:", new Date(timestamp.toNumber() * 1000).toISOString());
    console.log("  Time Until Unlock:", timeUntilUnlock.toString(), "seconds");
    console.log("  Time Until Unlock:", Math.ceil(timeUntilUnlock.toNumber() / 86400), "days");
    console.log("  Voting Power:", ethers.utils.formatEther(votingPower));
    console.log("  Is Unlocked:", timeUntilUnlock.eq(0));
    console.log("");

    // Check pending rewards using different methods
    console.log("🎁 Checking Reward Status...");
    console.log("-".repeat(30));
    
    try {
      const pendingRewards = await liquidityPool.getPendingRewards(address);
      console.log("  getPendingRewards():", ethers.utils.formatUnits(pendingRewards, 6), "USDC");
      console.log("  Raw Pending Rewards:", pendingRewards.toString(), "wei");
    } catch (error) {
      console.log("  ❌ Error calling getPendingRewards():", error.message);
    }
    
    try {
      const calculatedRewards = await liquidityPool.calculateRewards(address);
      console.log("  calculateRewards():", ethers.utils.formatUnits(calculatedRewards, 6), "USDC");
      console.log("  Raw Calculated Rewards:", calculatedRewards.toString(), "wei");
    } catch (error) {
      console.log("  ⚠️  calculateRewards() not available or failed:", error.message);
    }
    console.log("");

    // Get current USDC balance before claim
    const usdcBalanceBefore = await usdc.balanceOf(address);
    console.log("📋 Pre-Claim Status:");
    console.log("  USDC Balance Before:", ethers.utils.formatUnits(usdcBalanceBefore, 6), "USDC");
    console.log("");

    // Test claimRewards function call (simulation first)
    console.log("🧾 Testing claimRewards() Call...");
    console.log("-".repeat(30));
    
    try {
      // First try to estimate gas
      console.log("  Estimating gas for claimRewards()...");
      const gasEstimate = await liquidityPool.estimateGas.claimRewards();
      console.log("  ✅ Gas Estimate:", gasEstimate.toString());
      
      // Try static call first (simulation)
      console.log("  Simulating claimRewards() call...");
      await liquidityPool.callStatic.claimRewards();
      console.log("  ✅ Static call succeeded - transaction should work");
      
      // Now execute the actual transaction
      console.log("  Executing claimRewards() transaction...");
      const tx = await liquidityPool.claimRewards({
        gasLimit: gasEstimate.mul(120).div(100), // 20% buffer
      });
      
      console.log("  📝 Transaction Hash:", tx.hash);
      console.log("  ⏳ Waiting for confirmation...");
      
      const receipt = await tx.wait(1);
      
      console.log("  ✅ Transaction Status:", receipt.status === 1 ? "SUCCESS" : "FAILED");
      console.log("  ⛽ Gas Used:", receipt.gasUsed.toString());
      console.log("  📋 Logs Count:", receipt.logs.length);
      
      if (receipt.logs.length > 0) {
        console.log("  📜 Transaction emitted", receipt.logs.length, "events");
      }
      
      // Check balance after
      const usdcBalanceAfter = await usdc.balanceOf(address);
      const balanceDiff = usdcBalanceAfter.sub(usdcBalanceBefore);
      
      console.log("");
      console.log("📊 Post-Claim Status:");
      console.log("  USDC Balance After:", ethers.utils.formatUnits(usdcBalanceAfter, 6), "USDC");
      console.log("  USDC Claimed:", ethers.utils.formatUnits(balanceDiff, 6), "USDC");
      
      if (balanceDiff.gt(0)) {
        console.log("  🎉 SUCCESS! Rewards claimed successfully!");
      } else {
        console.log("  ⚠️  No USDC received - check if rewards were actually available");
      }
      
    } catch (error) {
      console.log("  ❌ claimRewards() failed:");
      console.log("    Error Code:", error.code);
      console.log("    Error Message:", error.message);
      
      if (error.reason) {
        console.log("    Reason:", error.reason);
      }
      
      if (error.error && error.error.data) {
        console.log("    Error Data:", error.error.data);
      }
      
      if (error.transaction) {
        console.log("    Transaction Data:", error.transaction.data);
      }
      
      // Try to get more specific error information
      console.log("\n  🔍 Detailed Error Analysis:");
      
      if (error.message.includes("execution reverted")) {
        console.log("    - Contract execution reverted");
        console.log("    - This usually means a require() statement failed");
      }
      
      if (error.code === "UNPREDICTABLE_GAS_LIMIT") {
        console.log("    - Gas estimation failed");
        console.log("    - Transaction would likely revert");
      }
      
      if (error.message.includes("insufficient funds")) {
        console.log("    - Insufficient ETH for gas");
      }
      
      // Common contract-specific reasons based on timeUntilUnlock
      if (!timeUntilUnlock.eq(0)) {
        console.log("    - Possible reason: Tokens are still locked");
        console.log("    - Some contracts require unlock before claiming rewards");
      }
      
      if (amount.eq(0) || !active) {
        console.log("    - Possible reason: No active stake found");
      }
    }
    
    console.log("");
    console.log("🏁 Test Complete!");
    console.log("=" .repeat(50));
    
  } catch (error) {
    console.error("💥 Test script failed:", error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { main };