import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { AppTabParamList } from "@/navigation/types";
import { palette } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { useNavigation } from "@react-navigation/native";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import React from "react";
import { StyleSheet, View, Pressable, ScrollView, Alert } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

type NavigationProp = BottomTabNavigationProp<AppTabParamList>;

export const BuySellSelectionScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();

  const handleBuyAction = () => {
    Alert.alert(
      "Redirected",
      "This functionality is now in Trade Finance Portal",
      [
        {
          text: "Go to Trade Finance",
          onPress: () =>
            navigation.navigate("WalletTab", { screen: "TradeFinance" }),
        },
      ]
    );
  };

  const handleSellAction = () => {
    Alert.alert(
      "Redirected",
      "This functionality is now in Trade Finance Portal",
      [
        {
          text: "Go to Trade Finance",
          onPress: () =>
            navigation.navigate("WalletTab", { screen: "TradeFinance" }),
        },
      ]
    );
  };

  return (
    <Screen>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text variant="title" style={styles.title}>
            Buy & Sell Products
          </Text>
          <Text color={palette.neutralMid} style={styles.subtitle}>
            Secure marketplace with escrow protection and smart contracts
          </Text>
        </View>

        {/* Action Cards */}
        <View style={styles.actionContainer}>
          {/* Buy Option */}
          <Pressable
            style={[styles.actionCard, styles.buyCard]}
            onPress={handleBuyAction}
          >
            <View style={styles.cardIcon}>
              <MaterialCommunityIcons
                name="shopping"
                size={48}
                color={palette.primaryBlue}
              />
            </View>
            <View style={styles.cardContent}>
              <Text variant="subtitle" style={styles.cardTitle}>
                Buy Products
              </Text>
              <Text color={palette.neutralMid} style={styles.cardDescription}>
                Browse products, secure with smart contracts, and get delivery
                confirmation
              </Text>

              <View style={styles.featureList}>
                <View style={styles.feature}>
                  <MaterialCommunityIcons
                    name="shield-check"
                    size={16}
                    color={palette.accentGreen}
                  />
                  <Text style={styles.featureText}>Escrow Protection</Text>
                </View>
                <View style={styles.feature}>
                  <MaterialCommunityIcons
                    name="file-document"
                    size={16}
                    color={palette.accentGreen}
                  />
                  <Text style={styles.featureText}>Contract Verification</Text>
                </View>
                <View style={styles.feature}>
                  <MaterialCommunityIcons
                    name="truck-delivery"
                    size={16}
                    color={palette.accentGreen}
                  />
                  <Text style={styles.featureText}>Delivery Confirmation</Text>
                </View>
              </View>

              <Button
                label="Start Buying"
                onPress={handleBuyAction}
                style={styles.actionButton}
              />
            </View>
          </Pressable>

          {/* Sell Option */}
          <Pressable
            style={[styles.actionCard, styles.sellCard]}
            onPress={handleSellAction}
          >
            <View style={styles.cardIcon}>
              <MaterialCommunityIcons
                name="storefront"
                size={48}
                color={palette.accentGreen}
              />
            </View>
            <View style={styles.cardContent}>
              <Text variant="subtitle" style={styles.cardTitle}>
                Sell Products
              </Text>
              <Text color={palette.neutralMid} style={styles.cardDescription}>
                List your products, get secure payments, and manage contracts
              </Text>

              <View style={styles.featureList}>
                <View style={styles.feature}>
                  <MaterialCommunityIcons
                    name="cash-multiple"
                    size={16}
                    color={palette.primaryBlue}
                  />
                  <Text style={styles.featureText}>Guaranteed Payment</Text>
                </View>
                <View style={styles.feature}>
                  <MaterialCommunityIcons
                    name="handshake"
                    size={16}
                    color={palette.primaryBlue}
                  />
                  <Text style={styles.featureText}>Smart Contracts</Text>
                </View>
                <View style={styles.feature}>
                  <MaterialCommunityIcons
                    name="chart-line"
                    size={16}
                    color={palette.primaryBlue}
                  />
                  <Text style={styles.featureText}>Trade Finance</Text>
                </View>
              </View>

              <Button
                label="Start Selling"
                onPress={handleSellAction}
                style={styles.actionButton}
                variant="outline"
              />
            </View>
          </Pressable>
        </View>

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text variant="subtitle" style={styles.infoTitle}>
            How It Works
          </Text>

          <View style={styles.stepsList}>
            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.stepText}>
                Upload contract between buyer and seller
              </Text>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.stepText}>
                Upload or create invoice for the transaction
              </Text>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.stepText}>
                Buyer stakes 20% of agreed amount to treasury
              </Text>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>4</Text>
              </View>
              <Text style={styles.stepText}>
                Buyer sends remaining 80% to treasury
              </Text>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>5</Text>
              </View>
              <Text style={styles.stepText}>
                Receive payment receipt to clear goods
              </Text>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>6</Text>
              </View>
              <Text style={styles.stepText}>
                Buyer confirms receipt of product
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  header: {
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
  title: {
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  subtitle: {
    textAlign: "center",
    fontSize: 16,
    lineHeight: 24,
  },
  actionContainer: {
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  actionCard: {
    backgroundColor: palette.white,
    borderRadius: 16,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  buyCard: {
    borderWidth: 2,
    borderColor: palette.primaryBlue + "20",
  },
  sellCard: {
    borderWidth: 2,
    borderColor: palette.accentGreen + "20",
  },
  cardIcon: {
    alignItems: "center",
    marginBottom: spacing.md,
  },
  cardContent: {
    gap: spacing.md,
  },
  cardTitle: {
    textAlign: "center",
    fontSize: 20,
    fontWeight: "700",
  },
  cardDescription: {
    textAlign: "center",
    fontSize: 16,
    lineHeight: 24,
  },
  featureList: {
    gap: spacing.sm,
  },
  feature: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  featureText: {
    fontSize: 14,
    color: palette.neutralDark,
  },
  actionButton: {
    marginTop: spacing.md,
  },
  infoSection: {
    marginBottom: spacing.xxl,
  },
  infoTitle: {
    textAlign: "center",
    marginBottom: spacing.lg,
  },
  stepsList: {
    gap: spacing.md,
  },
  step: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: palette.primaryBlue,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    color: palette.white,
    fontSize: 14,
    fontWeight: "600",
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: palette.neutralDark,
  },
});
