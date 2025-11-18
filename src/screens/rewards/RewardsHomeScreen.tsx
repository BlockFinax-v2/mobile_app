import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import { Alert, ScrollView, Share, TouchableOpacity, View } from "react-native";
import { Screen } from "../../components/ui/Screen";
import { Text } from "../../components/ui/Text";
import { InfoCard, StatusBadge } from "../../components/ui";
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

// No custom styles needed! Everything uses the reusable theme system
