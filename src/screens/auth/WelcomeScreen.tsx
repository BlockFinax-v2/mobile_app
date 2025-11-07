import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { DebugTool } from "@/components/ui/DebugTool";
import { gradients, palette } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Animated, ScrollView, StyleSheet, View } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

type WelcomeScreenProps = {
  onCreateWallet: () => void;
  onImportWallet: () => void;
  onUnlockWallet: () => void;
};

const BENEFITS = [
  {
    title: "Multi-sig Security",
    description: "Protect your treasury with multi-signature approvals.",
    icon: "shield-check",
    color: palette.accentGreen,
  },
  {
    title: "Cross-chain Support",
    description: "Operate seamlessly across leading blockchains.",
    icon: "link-variant",
    color: palette.primaryBlue,
  },
  {
    title: "Real-time Settlement",
    description: "Execute international trade in minutes, not days.",
    icon: "clock-fast",
    color: "#7C3AED",
  },
  {
    title: "DeFi Integration",
    description: "Access yield strategies and liquidity providers instantly.",
    icon: "chart-line",
    color: "#10B981",
  },
];

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onCreateWallet,
  onImportWallet,
  onUnlockWallet,
}) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={gradients.hero} style={styles.hero}>
          <Animated.View style={[styles.heroContent, { opacity: fadeAnim }]}>
            <View style={styles.logoContainer}>
              <MaterialCommunityIcons
                name="shield-star"
                size={72}
                color={palette.white}
              />
            </View>
            <Text
              variant="display"
              color={palette.white}
              style={styles.heroTitle}
              accessibilityRole="header"
            >
              BlockFinaX
            </Text>
            <Text
              variant="subtitle"
              color={palette.white}
              style={styles.heroSubtitle}
            >
              Blockchain-powered trade finance for Africa
            </Text>
          </Animated.View>
        </LinearGradient>

        <View style={styles.benefitsCard}>
          <Text
            variant="title"
            color={palette.neutralDark}
            style={styles.benefitsTitle}
          >
            Why Choose BlockFinaX?
          </Text>
          {BENEFITS.map((benefit, index) => (
            <Animated.View
              key={benefit.title}
              style={[
                styles.benefitRow,
                {
                  opacity: fadeAnim,
                  transform: [
                    {
                      translateY: fadeAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [20 * (index + 1), 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View
                style={[
                  styles.benefitIcon,
                  { backgroundColor: benefit.color + "15" },
                ]}
              >
                <MaterialCommunityIcons
                  name={benefit.icon}
                  size={28}
                  color={benefit.color}
                />
              </View>
              <View style={styles.benefitCopy}>
                <Text
                  variant="subtitle"
                  color={palette.neutralDark}
                  style={styles.benefitTitle}
                >
                  {benefit.title}
                </Text>
                <Text
                  color={palette.neutralMid}
                  style={styles.benefitDescription}
                >
                  {benefit.description}
                </Text>
              </View>
            </Animated.View>
          ))}
        </View>

        <View style={styles.actions}>
          <Button
            label="Create New Wallet"
            variant="gradient"
            onPress={onCreateWallet}
            icon={
              <MaterialCommunityIcons
                name="plus-circle"
                size={20}
                color={palette.white}
              />
            }
          />
          <Button
            label="Import Wallet"
            variant="primary"
            onPress={onImportWallet}
            icon={
              <MaterialCommunityIcons
                name="import"
                size={20}
                color={palette.white}
              />
            }
          />
          <Button
            label="Unlock Existing Wallet"
            variant="outline"
            onPress={onUnlockWallet}
            icon={
              <MaterialCommunityIcons
                name="lock-open-outline"
                size={20}
                color={palette.primaryBlue}
              />
            }
          />
        </View>

        <Text style={styles.footer} color={palette.neutralMid}>
          Secure. Fast. Borderless.
        </Text>
      </ScrollView>
      <DebugTool />
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.xxl,
  },
  hero: {
    paddingTop: spacing.xxl * 1.5,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroContent: {
    alignItems: "center",
    gap: spacing.md,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  heroTitle: {
    textAlign: "center",
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  heroSubtitle: {
    textAlign: "center",
    opacity: 0.95,
    fontSize: 16,
  },
  benefitsCard: {
    marginTop: -spacing.xxl,
    marginHorizontal: spacing.lg,
    padding: spacing.xl,
    borderRadius: 28,
    backgroundColor: palette.white,
    shadowColor: palette.shadowColor,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
    gap: spacing.lg,
  },
  benefitsTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  benefitRow: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
  },
  benefitIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  bullet: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: palette.accentGreen,
    marginTop: spacing.xs,
  },
  benefitCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  benefitDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  actions: {
    marginTop: spacing.xl,
    marginHorizontal: spacing.lg,
    gap: spacing.md,
  },
  footer: {
    textAlign: "center",
    marginTop: spacing.xl,
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
