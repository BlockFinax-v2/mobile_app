import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";

export function TreasuryPortalScreen() {
  const [userStake, setUserStake] = useState(0); // User's staked USDC
  const [votingPower, setVotingPower] = useState(0); // User's voting power
  const [pendingEarnings, setPendingEarnings] = useState(0); // Pending earnings
  const [claimedEarnings, setClaimedEarnings] = useState(0); // Claimed earnings
  const [totalPool, setTotalPool] = useState(100000); // Total treasury pool

  const handleStakeUSDC = () => {
    Alert.alert(
      "Stake USDC",
      "Connect your wallet to stake USDC and gain voting power in treasury decisions.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Connect Wallet", onPress: () => {} },
      ]
    );
  };

  const handleClaimEarnings = () => {
    if (pendingEarnings > 0) {
      Alert.alert(
        "Claim Earnings",
        `Claim ${pendingEarnings.toFixed(2)} USDC in earnings?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Claim",
            onPress: () => {
              setClaimedEarnings((prev) => prev + pendingEarnings);
              setPendingEarnings(0);
            },
          },
        ]
      );
    } else {
      Alert.alert("No Earnings", "You have no pending earnings to claim.");
    }
  };

  const proposals = [
    {
      id: 1,
      title: "Treasury Pool Expansion",
      description:
        "Increase treasury pool allocation by 15% for better yield opportunities",
      status: "Active",
      votesFor: 1250,
      votesAgainst: 320,
      timeLeft: "2d 14h",
      category: "Treasury",
    },
    {
      id: 2,
      title: "New Investment Strategy",
      description:
        "Diversify treasury investments into DeFi protocols for enhanced returns",
      status: "Active",
      votesFor: 980,
      votesAgainst: 180,
      timeLeft: "5d 8h",
      category: "Investment",
    },
    {
      id: 3,
      title: "Pool Guarantee Extension",
      description: "Extend pool guarantee program for 6 more months",
      status: "Passed",
      votesFor: 2100,
      votesAgainst: 150,
      timeLeft: "Ended",
      category: "Guarantee",
    },
  ];

  return (
    <Screen>
      <StatusBar style="dark" />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Treasury Portal</Text>
          <Text style={styles.subtitle}>
            Stake, vote, and earn from treasury operations
          </Text>
        </View>

        {/* Staking Overview */}
        <View style={styles.stakingCard}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons
              name="bank"
              size={32}
              color={colors.primary}
            />
            <Text style={styles.cardTitle}>Your Treasury Position</Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Your Stake</Text>
              <Text style={styles.statValue}>{userStake.toFixed(2)} USDC</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Voting Power</Text>
              <Text style={styles.statValue}>
                {votingPower.toFixed(2)} Votes
              </Text>
            </View>
          </View>

          <View style={styles.poolInfo}>
            <View style={styles.poolStat}>
              <Text style={styles.poolLabel}>Total Pool</Text>
              <Text style={styles.poolValue}>
                ${totalPool.toLocaleString()}
              </Text>
            </View>
            <View style={styles.poolStat}>
              <Text style={styles.poolLabel}>APY</Text>
              <Text style={styles.poolValuePositive}>12.5%</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.stakeButton}
            onPress={handleStakeUSDC}
          >
            <MaterialCommunityIcons
              name="plus-circle"
              size={20}
              color="white"
            />
            <Text style={styles.stakeButtonText}>Stake USDC</Text>
          </TouchableOpacity>
        </View>

        {/* Earnings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Treasury Earnings</Text>
          <View style={styles.earningsCard}>
            <View style={styles.earningsRow}>
              <View style={styles.earningsItem}>
                <Text style={styles.earningsLabel}>Pending</Text>
                <Text style={styles.earningsValue}>
                  {pendingEarnings.toFixed(2)} USDC
                </Text>
              </View>
              <View style={styles.earningsItem}>
                <Text style={styles.earningsLabel}>Claimed</Text>
                <Text style={styles.earningsValue}>
                  {claimedEarnings.toFixed(2)} USDC
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.claimButton,
                pendingEarnings === 0 && styles.claimButtonDisabled,
              ]}
              onPress={handleClaimEarnings}
              disabled={pendingEarnings === 0}
            >
              <MaterialCommunityIcons
                name="cash"
                size={20}
                color={pendingEarnings > 0 ? "white" : colors.textSecondary}
              />
              <Text
                style={[
                  styles.claimButtonText,
                  pendingEarnings === 0 && styles.claimButtonTextDisabled,
                ]}
              >
                Claim Earnings
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Treasury Voting */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Treasury Voting</Text>
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          {proposals.map((proposal) => (
            <View key={proposal.id} style={styles.proposalCard}>
              <View style={styles.proposalHeader}>
                <View style={styles.proposalBadge}>
                  <Text style={styles.proposalCategory}>
                    {proposal.category}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    proposal.status === "Active" && styles.statusBadgeActive,
                    proposal.status === "Passed" && styles.statusBadgePassed,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,
                      proposal.status === "Active" && styles.statusTextActive,
                      proposal.status === "Passed" && styles.statusTextPassed,
                    ]}
                  >
                    {proposal.status}
                  </Text>
                </View>
              </View>

              <Text style={styles.proposalTitle}>{proposal.title}</Text>
              <Text style={styles.proposalDescription}>
                {proposal.description}
              </Text>

              <View style={styles.votingStats}>
                <View style={styles.voteBar}>
                  <View style={styles.voteBarTrack}>
                    <View
                      style={[
                        styles.voteBarFill,
                        {
                          width: `${
                            (proposal.votesFor /
                              (proposal.votesFor + proposal.votesAgainst)) *
                            100
                          }%`,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.voteNumbers}>
                    <Text style={styles.votesFor}>
                      For: {proposal.votesFor}
                    </Text>
                    <Text style={styles.votesAgainst}>
                      Against: {proposal.votesAgainst}
                    </Text>
                  </View>
                </View>

                {proposal.status === "Active" && (
                  <View style={styles.voteActions}>
                    <TouchableOpacity style={styles.voteButton}>
                      <Text style={styles.voteButtonText}>Vote For</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.voteButton, styles.voteButtonAgainst]}
                    >
                      <Text
                        style={[
                          styles.voteButtonText,
                          styles.voteButtonTextAgainst,
                        ]}
                      >
                        Vote Against
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <Text style={styles.timeLeft}>
                Time left: {proposal.timeLeft}
              </Text>
            </View>
          ))}
        </View>

        {/* Pool Guarantee Application */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pool Guarantee</Text>
          <View style={styles.guaranteeCard}>
            <View style={styles.guaranteeHeader}>
              <MaterialCommunityIcons
                name="shield-check"
                size={24}
                color={colors.success}
              />
              <Text style={styles.guaranteeTitle}>
                Apply for Pool Guarantee
              </Text>
            </View>
            <Text style={styles.guaranteeDescription}>
              Secure your investment with our pool guarantee program.
              Applications are reviewed by the treasury committee.
            </Text>
            <TouchableOpacity style={styles.applyButton}>
              <Text style={styles.applyButtonText}>Submit Application</Text>
              <MaterialCommunityIcons
                name="arrow-right"
                size={20}
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  stakingCard: {
    margin: spacing.lg,
    marginTop: 0,
    backgroundColor: "white",
    borderRadius: 16,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginLeft: spacing.md,
  },
  statsGrid: {
    flexDirection: "row",
    marginBottom: spacing.lg,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginRight: spacing.md,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  poolInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  poolStat: {
    alignItems: "center",
  },
  poolLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  poolValue: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
  },
  poolValuePositive: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.success,
  },
  stakeButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  stakeButtonText: {
    color: "white",
    fontWeight: "600",
    marginLeft: spacing.sm,
  },
  section: {
    margin: spacing.lg,
    marginTop: 0,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
  },
  viewAllButton: {
    padding: spacing.sm,
  },
  viewAllText: {
    color: colors.primary,
    fontWeight: "500",
  },
  earningsCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  earningsRow: {
    flexDirection: "row",
    marginBottom: spacing.lg,
  },
  earningsItem: {
    flex: 1,
    alignItems: "center",
  },
  earningsLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  earningsValue: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.primary,
  },
  claimButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  claimButtonDisabled: {
    backgroundColor: colors.surface,
  },
  claimButtonText: {
    color: "white",
    fontWeight: "600",
    marginLeft: spacing.sm,
  },
  claimButtonTextDisabled: {
    color: colors.textSecondary,
  },
  proposalCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  proposalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  proposalBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 16,
  },
  proposalCategory: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 16,
  },
  statusBadgeActive: {
    backgroundColor: colors.warning + "20",
  },
  statusBadgePassed: {
    backgroundColor: colors.success + "20",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  statusTextActive: {
    color: colors.warning,
  },
  statusTextPassed: {
    color: colors.success,
  },
  proposalTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  proposalDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  votingStats: {
    marginBottom: spacing.md,
  },
  voteBar: {
    marginBottom: spacing.md,
  },
  voteBarTrack: {
    height: 8,
    backgroundColor: colors.surface,
    borderRadius: 4,
    marginBottom: spacing.sm,
  },
  voteBarFill: {
    height: "100%",
    backgroundColor: colors.success,
    borderRadius: 4,
  },
  voteNumbers: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  votesFor: {
    fontSize: 12,
    color: colors.success,
    fontWeight: "500",
  },
  votesAgainst: {
    fontSize: 12,
    color: colors.error,
    fontWeight: "500",
  },
  voteActions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  voteButton: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: "center",
  },
  voteButtonAgainst: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: colors.error,
  },
  voteButtonText: {
    color: "white",
    fontWeight: "500",
  },
  voteButtonTextAgainst: {
    color: colors.error,
  },
  timeLeft: {
    fontSize: 12,
    color: colors.textSecondary,
    fontStyle: "italic",
  },
  guaranteeCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  guaranteeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  guaranteeTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginLeft: spacing.md,
  },
  guaranteeDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  applyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
    padding: spacing.md,
  },
  applyButtonText: {
    color: colors.primary,
    fontWeight: "500",
    marginRight: spacing.sm,
  },
});
