import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { colors } from "../../theme/colors";
import { spacing } from "../../theme/spacing";

export function RewardsHomeScreen() {
  const [userPoints, setUserPoints] = useState(125); // Example points
  const [referralCode] = useState("BF7X9K2M"); // User's referral code
  const [totalReferrals] = useState(3); // Total successful referrals

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
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Rewards</Text>
          <Text style={styles.subtitle}>Earn points and unlock benefits</Text>
        </View>

        {/* Points Balance */}
        <View style={styles.pointsCard}>
          <View style={styles.pointsHeader}>
            <MaterialCommunityIcons
              name="star-circle"
              size={40}
              color={colors.primary}
            />
            <View style={styles.pointsInfo}>
              <Text style={styles.pointsLabel}>Your Points</Text>
              <Text style={styles.pointsValue}>
                {userPoints.toLocaleString()}
              </Text>
            </View>
          </View>
          <View style={styles.pointsStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalReferrals}</Text>
              <Text style={styles.statLabel}>Referrals</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>Gold</Text>
              <Text style={styles.statLabel}>Tier</Text>
            </View>
          </View>
        </View>

        {/* Referral Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Referral Program</Text>
          <View style={styles.referralCard}>
            <View style={styles.referralHeader}>
              <MaterialCommunityIcons
                name="account-group"
                size={24}
                color={colors.primary}
              />
              <Text style={styles.referralTitle}>Invite Friends & Earn</Text>
            </View>
            <Text style={styles.referralDescription}>
              Share your referral code and earn 50 points for each friend who
              joins!
            </Text>

            <View style={styles.referralCodeContainer}>
              <View style={styles.referralCodeBox}>
                <Text style={styles.referralCodeLabel}>Your Referral Code</Text>
                <Text style={styles.referralCode}>{referralCode}</Text>
              </View>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={handleCopyReferralCode}
              >
                <MaterialCommunityIcons
                  name="content-copy"
                  size={20}
                  color={colors.primary}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.shareButton}
              onPress={handleShareReferral}
            >
              <MaterialCommunityIcons
                name="share-variant"
                size={20}
                color="white"
              />
              <Text style={styles.shareButtonText}>Share Referral Link</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tasks to Earn Points */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ways to Earn Points</Text>
          {rewardTasks.map((task) => (
            <View key={task.id} style={styles.taskCard}>
              <View style={styles.taskHeader}>
                <View style={styles.taskIcon}>
                  <MaterialCommunityIcons
                    name={task.icon as any}
                    size={24}
                    color={task.completed ? colors.success : colors.primary}
                  />
                </View>
                <View style={styles.taskInfo}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <Text style={styles.taskDescription}>{task.description}</Text>
                </View>
                <View style={styles.taskReward}>
                  <Text style={styles.taskPoints}>+{task.points}</Text>
                  {task.completed && (
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={20}
                      color={colors.success}
                    />
                  )}
                </View>
              </View>
              {task.completed && (
                <View style={styles.completedBadge}>
                  <Text style={styles.completedText}>Completed</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Rewards Catalog Preview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Rewards</Text>
          <View style={styles.rewardsGrid}>
            <View style={styles.rewardItem}>
              <MaterialCommunityIcons
                name="gift"
                size={32}
                color={colors.primary}
              />
              <Text style={styles.rewardTitle}>Trading Fee Discount</Text>
              <Text style={styles.rewardCost}>500 points</Text>
            </View>
            <View style={styles.rewardItem}>
              <MaterialCommunityIcons
                name="crown"
                size={32}
                color={colors.warning}
              />
              <Text style={styles.rewardTitle}>Premium Features</Text>
              <Text style={styles.rewardCost}>1,000 points</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.viewAllButton}>
            <Text style={styles.viewAllText}>View All Rewards</Text>
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
  pointsCard: {
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
  pointsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  pointsInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  pointsLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  pointsValue: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.primary,
  },
  pointsStats: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
  },
  section: {
    margin: spacing.lg,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.lg,
  },
  referralCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  referralHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  referralTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginLeft: spacing.md,
  },
  referralDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  referralCodeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  referralCodeBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginRight: spacing.md,
  },
  referralCodeLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  referralCode: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: 2,
  },
  copyButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.primary,
  },
  shareButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  shareButtonText: {
    color: "white",
    fontWeight: "600",
    marginLeft: spacing.sm,
  },
  taskCard: {
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
  taskHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  taskIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  taskInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  taskDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  taskReward: {
    alignItems: "flex-end",
  },
  taskPoints: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  completedBadge: {
    marginTop: spacing.md,
    alignSelf: "flex-start",
    backgroundColor: colors.success + "20",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 16,
  },
  completedText: {
    fontSize: 12,
    color: colors.success,
    fontWeight: "500",
  },
  rewardsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  rewardItem: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: "center",
    flex: 1,
    marginHorizontal: spacing.xs,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  rewardTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
    textAlign: "center",
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  rewardCost: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "600",
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 12,
  },
  viewAllText: {
    color: colors.primary,
    fontWeight: "500",
    marginRight: spacing.sm,
  },
});
