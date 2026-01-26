import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import React, { useState, useCallback, useEffect } from "react";
import {
  Alert,
  ScrollView,
  Share,
  TouchableOpacity,
  View,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { InfoCard, StatusBadge } from "../../components/ui";
import { useWallet } from "../../contexts/WalletContext";
import { stakingService } from "../../services/stakingService";
import { getSupportedStablecoins } from "../../config/stablecoinPrices";
import { convertToUSD } from "../../config/stablecoinPrices";
import {
  colors,
  spacing,
  cardStyles,
  layoutStyles,
  textStyles,
  buttonStyles,
  listStyles,
  utilityStyles,
} from "../../theme";

interface StakeInfo {
  amount: string;
  timestamp: number;
  pendingRewards: string;
  active: boolean;
}

interface PoolStats {
  totalLiquidityProviders: string;
  contractBalance: string;
}

export function RewardsHomeScreen() {
  const { isUnlocked, address, selectedNetwork } = useWallet();
  const [userPoints, setUserPoints] = useState(125); // Example points
  const [referralCode] = useState("BF7X9K2M"); // User's referral code
  const [totalReferrals] = useState(3); // Total successful referrals

  // Treasury Earnings State
  const [isLoadingEarnings, setIsLoadingEarnings] = useState(false);
  const [isTransacting, setIsTransacting] = useState(false);
  const [stakeInfo, setStakeInfo] = useState<StakeInfo | null>(null);
  const [poolStats, setPoolStats] = useState<PoolStats | null>(null);
  const [supportedTokens, setSupportedTokens] = useState<any[]>([]);
  const [poolTokenStats, setPoolTokenStats] = useState<{
    [tokenAddress: string]: { amount: string; usdValue: number };
  }>({});
  const [totalPoolUSD, setTotalPoolUSD] = useState<number>(0);

  // Load Treasury Earnings Data
  const loadEarningsData = useCallback(async () => {
    if (!isUnlocked || !address) {
      return;
    }

    setIsLoadingEarnings(true);
    try {
      // Configure stakingService for current network
      console.log(
        "[RewardsHomeScreen] Configuring stakingService for network:",
        {
          chainId: selectedNetwork.chainId,
          name: selectedNetwork.name,
        },
      );
      stakingService.setNetwork(selectedNetwork.chainId, selectedNetwork);

      // Get supported tokens for current network
      const tokens = getSupportedStablecoins(selectedNetwork.chainId);
      setSupportedTokens(tokens);

      // Load user stakes using unified stakingService
      const stakes = await stakingService.getAllStakesForUser(address);

      // Set stake info from first active stake (for backward compatibility)
      if (
        stakes.amounts &&
        stakes.amounts.length > 0 &&
        parseFloat(stakes.amounts[0]) > 0
      ) {
        setStakeInfo({
          amount: stakes.amounts[0],
          timestamp: Date.now() / 1000, // AllStakesInfo doesn't have timestamp
          pendingRewards: stakes.pendingRewards[0],
          active: parseFloat(stakes.amounts[0]) > 0,
        });
      }

      // Pool statistics - using staking config for current APR data
      // getPoolStats removed - set default values
      setPoolStats({
        totalLiquidityProviders: "0", // Not available without getPoolStats
        contractBalance: "0", // Will be calculated from user stakes
      });

      // Load pool-wide token statistics
      const poolStatsMap: {
        [tokenAddress: string]: { amount: string; usdValue: number };
      } = {};
      let totalUSD = 0;

      // Use pool stats for each token (simplified - using same totalStaked for all)
      tokens.forEach((token) => {
        try {
          const totalStaked = "0"; // poolStatsData removed
          const usdValue = parseFloat(totalStaked);

          poolStatsMap[token.address] = {
            amount: totalStaked,
            usdValue: usdValue,
          };
          totalUSD += usdValue;
        } catch (error) {
          console.error(
            `Failed to load pool stats for ${token.symbol}:`,
            error,
          );
          poolStatsMap[token.address] = { amount: "0", usdValue: 0 };
        }
      });

      setPoolTokenStats(poolStatsMap);
      setTotalPoolUSD(totalUSD);
    } catch (error) {
      console.error("Failed to load earnings data:", error);
    } finally {
      setIsLoadingEarnings(false);
    }
  }, [isUnlocked, address, selectedNetwork]);

  // Load earnings data on mount and when wallet/network changes
  useEffect(() => {
    loadEarningsData();
  }, [loadEarningsData]);

  const handleClaimRewards = async () => {
    if (
      !stakeInfo?.pendingRewards ||
      parseFloat(stakeInfo.pendingRewards) <= 0
    ) {
      return;
    }

    setIsTransacting(true);
    try {
      // Implement claim rewards logic here
      Alert.alert("Success", "Rewards claimed successfully!");
      await loadEarningsData(); // Reload data
    } catch (error) {
      console.error("Failed to claim rewards:", error);
      Alert.alert("Error", "Failed to claim rewards. Please try again.");
    } finally {
      setIsTransacting(false);
    }
  };

  const handleShareReferral = async () => {
    try {
      await Share.share({
        message: `Join BlockFinaX with my referral code ${referralCode} and get 50 bonus points! Download the app and start earning rewards.`,
        title: "Join BlockFinaX - Earn Rewards",
      });
    } catch (error) {
      Alert.alert("Error", "Unable to share referral code");
    }
  };

  const handleCopyReferralCode = () => {
    // In a real app, you'd copy to clipboard
    Alert.alert("Copied!", `Referral code ${referralCode} copied to clipboard`);
  };

  const rewardTasks = [
    {
      id: 1,
      title: "Create Wallet",
      description: "Set up your BlockFinaX wallet",
      points: 100,
      completed: true,
      icon: "wallet",
    },
    {
      id: 2,
      title: "First Transaction",
      description: "Complete your first transaction",
      points: 25,
      completed: true,
      icon: "swap-horizontal",
    },
    {
      id: 3,
      title: "Refer a Friend",
      description: "Invite friends using your referral code",
      points: 50,
      completed: false,
      icon: "account-plus",
    },
    {
      id: 4,
      title: "Daily Check-in",
      description: "Open the app daily for 7 days",
      points: 35,
      completed: false,
      icon: "calendar-check",
    },
    {
      id: 5,
      title: "Complete KYC",
      description: "Verify your identity",
      points: 75,
      completed: false,
      icon: "account-check",
    },
  ];

  return (
    <Screen>
      <StatusBar style="dark" />
      <ScrollView
        style={layoutStyles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={layoutStyles.header}>
          <Text style={textStyles.pageTitle}>Rewards</Text>
          <Text style={textStyles.pageSubtitle}>
            Earn points and unlock benefits
          </Text>
        </View>

        {/* Points Balance */}
        <View style={[cardStyles.base, utilityStyles.marginLG]}>
          <View style={[layoutStyles.rowWithGap, utilityStyles.mbLG]}>
            <MaterialCommunityIcons
              name="star-circle"
              size={40}
              color={colors.primary}
            />
            <View style={utilityStyles.flex1}>
              <Text style={textStyles.detailLabel}>Your Points</Text>
              <Text style={[textStyles.cardTitle, textStyles.primary]}>
                {userPoints.toLocaleString()}
              </Text>
            </View>
          </View>
          <View
            style={[
              layoutStyles.rowBetween,
              utilityStyles.borderTop,
              { paddingTop: spacing.lg },
            ]}
          >
            <View style={utilityStyles.alignCenter}>
              <Text style={[textStyles.cardTitle, utilityStyles.mbXS]}>
                {totalReferrals}
              </Text>
              <Text style={textStyles.detailLabel}>Referrals</Text>
            </View>
            <View style={[utilityStyles.alignCenter]}>
              <Text style={[textStyles.cardTitle, utilityStyles.mbXS]}>
                Gold
              </Text>
              <Text style={textStyles.detailLabel}>Tier</Text>
            </View>
          </View>
        </View>

        {/* Treasury Earnings Section */}
        {isUnlocked && (
          <View style={[layoutStyles.section, utilityStyles.phLG]}>
            <View style={[layoutStyles.rowBetween, utilityStyles.mbMD]}>
              <Text style={textStyles.sectionTitle}>Treasury Earnings</Text>
              <TouchableOpacity
                onPress={loadEarningsData}
                disabled={isLoadingEarnings}
              >
                <MaterialCommunityIcons
                  name="refresh"
                  size={20}
                  color={colors.primary}
                />
              </TouchableOpacity>
            </View>

            {isLoadingEarnings ? (
              <View
                style={[
                  cardStyles.base,
                  { padding: spacing.xl, alignItems: "center" },
                ]}
              >
                <ActivityIndicator size="large" color={colors.primary} />
                <Text
                  style={[textStyles.detailLabel, { marginTop: spacing.md }]}
                >
                  Loading earnings...
                </Text>
              </View>
            ) : (
              <View style={cardStyles.base}>
                {/* Earnings Summary */}
                <View style={styles.earningsRow}>
                  <View style={styles.earningsItem}>
                    <Text style={textStyles.detailLabel}>Pending Rewards</Text>
                    <Text style={[textStyles.cardTitle, textStyles.primary]}>
                      {stakeInfo?.pendingRewards
                        ? parseFloat(stakeInfo.pendingRewards).toFixed(4)
                        : "0.0000"}{" "}
                      USDC
                    </Text>
                  </View>
                  <View style={styles.earningsItem}>
                    <Text style={textStyles.detailLabel}>Stake Duration</Text>
                    <Text style={[textStyles.cardTitle, textStyles.primary]}>
                      {stakeInfo?.timestamp
                        ? Math.floor(
                            (Date.now() / 1000 - stakeInfo.timestamp) / 86400,
                          )
                        : "0"}{" "}
                      days
                    </Text>
                  </View>
                </View>

                {/* Multi-Token Pool Statistics */}
                <View style={styles.multiTokenPoolSection}>
                  <View style={styles.poolSectionHeader}>
                    <MaterialCommunityIcons
                      name="chart-pie"
                      size={20}
                      color={colors.primary}
                    />
                    <Text
                      style={[textStyles.cardTitle, { marginLeft: spacing.sm }]}
                    >
                      Pool Breakdown by Token
                    </Text>
                  </View>

                  {/* Total Pool USD Value */}
                  <View style={styles.totalPoolCard}>
                    <Text style={textStyles.detailLabel}>
                      Total Pool Value (USD)
                    </Text>
                    <Text
                      style={[
                        textStyles.cardTitle,
                        textStyles.primary,
                        { fontSize: 24 },
                      ]}
                    >
                      $
                      {totalPoolUSD.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </Text>
                  </View>

                  {/* Token Breakdown */}
                  <View style={styles.tokenBreakdownList}>
                    {supportedTokens.map((token) => {
                      const stats = poolTokenStats[token.address] || {
                        amount: "0",
                        usdValue: 0,
                      };
                      const percentage =
                        totalPoolUSD > 0
                          ? (stats.usdValue / totalPoolUSD) * 100
                          : 0;

                      return (
                        <View
                          key={token.address}
                          style={styles.tokenBreakdownCard}
                        >
                          <View style={styles.tokenBreakdownHeader}>
                            <View style={styles.tokenBreakdownInfo}>
                              <Text style={textStyles.cardTitle}>
                                {token.symbol}
                              </Text>
                              <Text style={textStyles.detailLabel}>
                                {token.name}
                              </Text>
                            </View>
                            <View style={styles.tokenBreakdownStats}>
                              <Text style={textStyles.cardTitle}>
                                {parseFloat(stats.amount).toLocaleString(
                                  undefined,
                                  {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  },
                                )}
                              </Text>
                              <Text style={textStyles.detailValue}>
                                $
                                {stats.usdValue.toLocaleString(undefined, {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </Text>
                            </View>
                          </View>
                          {/* Progress bar showing percentage */}
                          <View style={styles.tokenProgressBar}>
                            <View
                              style={[
                                styles.tokenProgressFill,
                                { width: `${percentage}%` },
                              ]}
                            />
                          </View>
                          <Text style={textStyles.detailLabel}>
                            {percentage.toFixed(1)}% of total pool
                          </Text>
                        </View>
                      );
                    })}
                  </View>

                  {/* Legacy Pool Statistics */}
                  {poolStats && (
                    <View style={styles.poolStatsRow}>
                      <View style={styles.poolStatItem}>
                        <Text style={textStyles.detailLabel}>
                          Total Stakers
                        </Text>
                        <Text style={textStyles.cardTitle}>
                          {poolStats.totalLiquidityProviders}
                        </Text>
                      </View>
                      <View style={styles.poolStatItem}>
                        <Text style={textStyles.detailLabel}>
                          Contract Balance
                        </Text>
                        <Text style={textStyles.cardTitle}>
                          {parseFloat(poolStats.contractBalance).toFixed(0)}{" "}
                          USDC
                        </Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Claim Button */}
                <TouchableOpacity
                  style={[
                    buttonStyles.primaryAction,
                    (!stakeInfo?.pendingRewards ||
                      parseFloat(stakeInfo.pendingRewards) <= 0 ||
                      isTransacting) &&
                      styles.claimButtonDisabled,
                  ]}
                  onPress={handleClaimRewards}
                  disabled={
                    !stakeInfo?.pendingRewards ||
                    parseFloat(stakeInfo.pendingRewards) <= 0 ||
                    isTransacting
                  }
                >
                  {isTransacting ? (
                    <ActivityIndicator
                      size="small"
                      color={colors.textSecondary}
                    />
                  ) : (
                    <MaterialCommunityIcons
                      name="cash"
                      size={20}
                      color={
                        stakeInfo?.pendingRewards &&
                        parseFloat(stakeInfo.pendingRewards) > 0
                          ? "white"
                          : colors.textSecondary
                      }
                    />
                  )}
                  <Text
                    style={[
                      textStyles.white,
                      { fontWeight: "600" },
                      (!stakeInfo?.pendingRewards ||
                        parseFloat(stakeInfo.pendingRewards) <= 0 ||
                        isTransacting) && { color: colors.textSecondary },
                    ]}
                  >
                    {isTransacting ? "Processing..." : "Claim Rewards"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Referral Section */}
        <View style={[layoutStyles.section, utilityStyles.phLG]}>
          <Text style={textStyles.sectionTitle}>Referral Program</Text>
          <View style={cardStyles.base}>
            <View style={[layoutStyles.rowWithGap, utilityStyles.mbMD]}>
              <MaterialCommunityIcons
                name="account-group"
                size={24}
                color={colors.primary}
              />
              <Text style={textStyles.cardTitle}>Invite Friends & Earn</Text>
            </View>
            <Text
              style={[
                textStyles.detailValue,
                { lineHeight: 20, marginBottom: spacing.lg },
              ]}
            >
              Share your referral code and earn 50 points for each friend who
              joins!
            </Text>

            <View style={[layoutStyles.rowWithGap, utilityStyles.mbLG]}>
              <View
                style={[
                  utilityStyles.flex1,
                  {
                    backgroundColor: colors.surface,
                    borderRadius: 12,
                    padding: spacing.md,
                  },
                ]}
              >
                <Text style={textStyles.detailLabel}>Your Referral Code</Text>
                <Text style={[textStyles.cardTitle, { letterSpacing: 2 }]}>
                  {referralCode}
                </Text>
              </View>
              <TouchableOpacity
                style={buttonStyles.icon}
                onPress={handleCopyReferralCode}
              >
                <MaterialCommunityIcons
                  name="content-copy"
                  size={20}
                  color="white"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={buttonStyles.primaryAction}
              onPress={handleShareReferral}
            >
              <MaterialCommunityIcons
                name="share-variant"
                size={20}
                color="white"
              />
              <Text style={[textStyles.white, { fontWeight: "600" }]}>
                Share Referral Link
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tasks to Earn Points */}
        <View style={[layoutStyles.section, utilityStyles.phLG]}>
          <Text style={textStyles.sectionTitle}>Ways to Earn Points</Text>
          <View style={listStyles.container}>
            {rewardTasks.map((task) => (
              <View key={task.id} style={listStyles.item}>
                <View style={layoutStyles.row}>
                  <View
                    style={[
                      buttonStyles.icon,
                      {
                        backgroundColor: task.completed
                          ? colors.success + "20"
                          : colors.surface,
                      },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={task.icon as any}
                      size={24}
                      color={task.completed ? colors.success : colors.primary}
                    />
                  </View>
                  <View
                    style={[utilityStyles.flex1, { marginLeft: spacing.md }]}
                  >
                    <Text style={textStyles.cardTitle}>{task.title}</Text>
                    <Text style={textStyles.detailValue}>
                      {task.description}
                    </Text>
                    {task.completed && (
                      <StatusBadge status="Completed" size="small" />
                    )}
                  </View>
                  <View style={utilityStyles.alignEnd}>
                    <Text style={[textStyles.primary, { fontWeight: "600" }]}>
                      +{task.points}
                    </Text>
                    {task.completed && (
                      <MaterialCommunityIcons
                        name="check-circle"
                        size={20}
                        color={colors.success}
                      />
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Rewards Catalog Preview */}
        <View style={[layoutStyles.section, utilityStyles.phLG]}>
          <Text style={textStyles.sectionTitle}>Available Rewards</Text>
          <View
            style={[
              layoutStyles.row,
              { gap: spacing.md, marginBottom: spacing.lg },
            ]}
          >
            <InfoCard
              title="Trading Fee Discount"
              value="500 points"
              icon="gift"
              size="small"
            />
            <InfoCard
              title="Premium Features"
              value="1,000 points"
              icon="crown"
              size="small"
            />
          </View>
          <TouchableOpacity style={buttonStyles.secondary}>
            <Text style={textStyles.primary}>View All Rewards</Text>
            <MaterialCommunityIcons
              name="arrow-right"
              size={20}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </Screen>
  );
}

// Custom styles for Treasury Earnings section
const styles = StyleSheet.create({
  earningsRow: {
    flexDirection: "row",
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  earningsItem: {
    flex: 1,
    alignItems: "center",
  },
  multiTokenPoolSection: {
    marginTop: spacing.md,
  },
  poolSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  totalPoolCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    alignItems: "center",
  },
  tokenBreakdownList: {
    gap: spacing.md,
  },
  tokenBreakdownCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
  },
  tokenBreakdownHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  tokenBreakdownInfo: {
    flex: 1,
  },
  tokenBreakdownStats: {
    alignItems: "flex-end",
  },
  tokenProgressBar: {
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    marginVertical: spacing.sm,
    overflow: "hidden",
  },
  tokenProgressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  poolStatsRow: {
    flexDirection: "row",
    marginTop: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  poolStatItem: {
    flex: 1,
    alignItems: "center",
  },
  claimButtonDisabled: {
    backgroundColor: colors.surface,
    opacity: 0.6,
  },
});
