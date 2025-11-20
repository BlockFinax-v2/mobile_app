import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import React, { useState, useEffect } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  TextInput,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { WalletStackParamList } from "@/navigation/types";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";

type NavigationProp = StackNavigationProp<
  WalletStackParamList,
  "TreasuryPortal"
>;
type RouteProps = RouteProp<WalletStackParamList, "TreasuryPortal">;

export function TreasuryPortalScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();

  const [userStake, setUserStake] = useState(0); // User's staked USDC
  const [votingPower, setVotingPower] = useState(0); // User's voting power
  const [pendingEarnings, setPendingEarnings] = useState(0); // Pending earnings
  const [claimedEarnings, setClaimedEarnings] = useState(0); // Claimed earnings
  const [totalPool, setTotalPool] = useState(100000); // Total treasury pool

  // Handle payment results when returning from payment screens
  useEffect(() => {
    if (route.params?.paymentResult) {
      const { success, paymentType, transactionHash, stakeAmount } =
        route.params.paymentResult;

      if (success) {
        switch (paymentType) {
          case "stake":
            if (stakeAmount) {
              // Update user's stake after successful staking
              setUserStake((prev) => prev + stakeAmount);
              setVotingPower((prev) => prev + stakeAmount); // 1:1 ratio for voting power
              Alert.alert(
                "Staking Successful! 🎉",
                `You have successfully staked ${stakeAmount} USDC!\n\nTransaction Hash: ${transactionHash}\n\nYour voting power has increased and you'll start earning rewards immediately.`,
                [{ text: "OK" }]
              );
            }
            break;

          case "deposit":
            Alert.alert(
              "Deposit Successful! 🎉",
              `Your treasury deposit has been processed successfully!\n\nTransaction Hash: ${transactionHash}`,
              [{ text: "OK" }]
            );
            break;

          case "governance":
            Alert.alert(
              "Governance Payment Successful! 🎉",
              `Your governance payment has been recorded!\n\nTransaction Hash: ${transactionHash}`,
              [{ text: "OK" }]
            );
            break;
        }
      }

      // Clear the payment result params
      navigation.setParams({ paymentResult: undefined } as any);
    }
  }, [route.params?.paymentResult, navigation]);

  const handleStakeUSDC = () => {
    // Navigate to payment screen for staking
    navigation.navigate("TreasuryPayment", {
      paymentType: "stake",
      stakeAmount: 100, // Default amount, user can change
      stakingContract: "0x1234567890123456789012345678901234567890", // Staking contract address
      stakingPeriod: "30 days",
      apy: 12, // 12% APY
      lockPeriod: 30,
      preferredToken: "USDC",
      preferredNetwork: "polygon",
    });
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

        {/* Pool Guarantee Applications for Review */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pool Guarantee Applications</Text>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <MaterialCommunityIcons
              name="magnify"
              size={20}
              color={colors.textSecondary}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by ID, buyer, seller, or description..."
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          {/* Filter Tabs */}
          <View style={styles.filterTabs}>
            <TouchableOpacity
              style={[styles.filterTab, styles.filterTabActive]}
            >
              <Text style={[styles.filterTabText, styles.filterTabTextActive]}>
                Pending (5)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterTab}>
              <Text style={styles.filterTabText}>Approved (0)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterTab}>
              <Text style={styles.filterTabText}>Certificate Issuance (1)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterTab}>
              <Text style={styles.filterTabText}>Issued (5)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterTab}>
              <Text style={styles.filterTabText}>Rejected (0)</Text>
            </TouchableOpacity>
          </View>

          {/* Application Card */}
          <View style={styles.applicationReviewCard}>
            <View style={styles.applicationReviewHeader}>
              <View style={styles.applicationTitleRow}>
                <MaterialCommunityIcons
                  name="file-document"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.applicationId}>
                  PG-1763321117688-OWSX869
                </Text>
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>PENDING VOTE</Text>
                </View>
              </View>
              <Text style={styles.applicationDate}>
                Applied on Nov 16, 2025
              </Text>
            </View>

            <View style={styles.applicationInfo}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Buyer (Applicant)</Text>
                <Text style={styles.infoValue}>0x759ed3d2...fe5e5582a</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Seller (Beneficiary)</Text>
                <Text style={styles.infoValue}>0x324ffda4...b9f141</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Goods Description</Text>
                <Text style={styles.infoValue}>Import of Cloth from Ghana</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Guarantee Amount</Text>
                <Text style={styles.infoValue}>$4.00</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Collateral Posted</Text>
                <Text style={styles.infoValue}>$0.40</Text>
              </View>
            </View>

            <View style={styles.votingSection}>
              <View style={styles.votingHeader}>
                <Text style={styles.votingTitle}>Current Votes</Text>
                <Text style={styles.approvalThreshold}>
                  60% approval threshold required
                </Text>
              </View>

              <View style={styles.voteProgressBar}>
                <View style={styles.voteProgress}>
                  <View style={[styles.voteProgressFill, { width: "0%" }]} />
                </View>
                <Text style={styles.voteProgressText}>For: 0 Against: 0</Text>
              </View>

              <View style={styles.voteActions}>
                <TouchableOpacity style={styles.approveVoteButton}>
                  <MaterialCommunityIcons
                    name="thumb-up"
                    size={16}
                    color="white"
                  />
                  <Text style={styles.voteButtonText}>Approve</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.rejectVoteButton}>
                  <MaterialCommunityIcons
                    name="thumb-down"
                    size={16}
                    color="white"
                  />
                  <Text style={styles.voteButtonText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.applicationActions}>
              <TouchableOpacity style={styles.viewDocumentsButton}>
                <MaterialCommunityIcons
                  name="file-multiple"
                  size={16}
                  color={colors.primary}
                />
                <Text style={styles.viewDocumentsText}>View Documents</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.viewDraftButton}>
                <MaterialCommunityIcons
                  name="eye"
                  size={16}
                  color={colors.primary}
                />
                <Text style={styles.viewDraftText}>View Draft</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Certificate Issuance Card */}
          <View style={styles.certificateIssuanceCard}>
            <View style={styles.applicationReviewHeader}>
              <View style={styles.applicationTitleRow}>
                <MaterialCommunityIcons
                  name="certificate"
                  size={20}
                  color={colors.success}
                />
                <Text style={styles.applicationId}>
                  PG-1763321117688-OWSX869
                </Text>
                <View style={styles.issuanceBadge}>
                  <Text style={styles.issuanceBadgeText}>
                    READY FOR ISSUANCE
                  </Text>
                </View>
              </View>
              <Text style={styles.applicationDate}>
                Invoice Settled on Nov 16, 2025
              </Text>
            </View>

            <View style={styles.applicationInfo}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Buyer (Applicant)</Text>
                <Text style={styles.infoValue}>BILAL LTD</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Trade Description</Text>
                <Text style={styles.infoValue}>Import of Cloth from Ghana</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Guarantee Amount</Text>
                <Text style={styles.infoValue}>4.00 USDC</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Invoice Settlement</Text>
                <Text style={[styles.infoValue, { color: colors.success }]}>
                  ✓ Paid in Full
                </Text>
              </View>
            </View>

            <View style={styles.issuanceSection}>
              <View style={styles.issuanceHeader}>
                <MaterialCommunityIcons
                  name="information"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.issuanceTitle}>
                  Ready for Certificate Issuance
                </Text>
              </View>

              <Text style={styles.issuanceDescription}>
                All requirements met. Invoice has been settled. Treasury
                delegates can now issue the pool guarantee certificate.
              </Text>

              <View style={styles.certificateActions}>
                <TouchableOpacity style={styles.issueCertificateButton}>
                  <MaterialCommunityIcons
                    name="certificate"
                    size={16}
                    color="white"
                  />
                  <Text style={styles.issueCertificateButtonText}>
                    Issue Certificate
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.viewDetailsButton}>
                  <MaterialCommunityIcons
                    name="eye"
                    size={16}
                    color={colors.primary}
                  />
                  <Text style={styles.viewDetailsButtonText}>View Details</Text>
                </TouchableOpacity>
              </View>
            </View>
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
  // Pool Guarantee Review Styles
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  filterTabs: {
    flexDirection: "row",
    marginBottom: spacing.lg,
  },
  filterTab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  filterTabActive: {
    borderBottomColor: colors.primary,
  },
  filterTabText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  filterTabTextActive: {
    color: colors.primary,
  },
  applicationReviewCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  applicationReviewHeader: {
    marginBottom: spacing.lg,
  },
  applicationTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  applicationId: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginLeft: spacing.sm,
    flex: 1,
  },
  pendingBadge: {
    backgroundColor: "#FF9800",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  pendingBadgeText: {
    fontSize: 10,
    color: "white",
    fontWeight: "600",
  },
  applicationDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  applicationInfo: {
    marginBottom: spacing.lg,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "500",
    flex: 1,
    textAlign: "right",
  },
  votingSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  votingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  votingTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  approvalThreshold: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  voteProgressBar: {
    marginBottom: spacing.lg,
  },
  voteProgress: {
    height: 6,
    backgroundColor: colors.surface,
    borderRadius: 3,
    marginBottom: spacing.sm,
  },
  voteProgressFill: {
    height: "100%",
    backgroundColor: colors.success,
    borderRadius: 3,
  },
  voteProgressText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
  },
  applicationActions: {
    flexDirection: "row",
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.lg,
  },
  viewDocumentsButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    gap: spacing.xs,
  },
  viewDocumentsText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "500",
  },
  viewDraftButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    gap: spacing.xs,
  },
  viewDraftText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "500",
  },
  approveVoteButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    backgroundColor: colors.success,
    borderRadius: 8,
    gap: spacing.xs,
  },
  rejectVoteButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    backgroundColor: colors.error,
    borderRadius: 8,
    gap: spacing.xs,
  },
  // Certificate Issuance Styles
  certificateIssuanceCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: spacing.lg,
    marginTop: spacing.lg,
    borderWidth: 2,
    borderColor: colors.success + "30",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  issuanceBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  issuanceBadgeText: {
    color: "white",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  issuanceSection: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  issuanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  issuanceTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginLeft: spacing.sm,
  },
  issuanceDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  certificateActions: {
    flexDirection: "row",
    gap: spacing.md,
  },
  issueCertificateButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.success,
    borderRadius: 8,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  issueCertificateButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  viewDetailsButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  viewDetailsButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "500",
  },
});
