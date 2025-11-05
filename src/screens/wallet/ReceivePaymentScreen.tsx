import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { useWallet } from "@/contexts/WalletContext";
import { palette } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import React, { useState } from "react";
import { Alert, Clipboard, Share, StyleSheet, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

const mockRequests = [
  {
    id: "req-1",
    amount: "1,200 USDC",
    status: "Completed",
    date: "Oct 27, 2025",
  },
  {
    id: "req-2",
    amount: "500 USDC",
    status: "Pending",
    date: "Oct 26, 2025",
  },
];

export const ReceivePaymentScreen: React.FC = () => {
  const { address } = useWallet();
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");

  const handleCopyAddress = () => {
    if (address) {
      Clipboard.setString(address);
      Alert.alert("Success", "Address copied to clipboard");
    }
  };

  const handleShareAddress = async () => {
    if (address) {
      try {
        await Share.share({
          message: `My BlockFinaX Wallet Address: ${address}`,
        });
      } catch (error) {
        console.error(error);
      }
    }
  };

  const handleGenerateRequest = () => {
    Alert.alert("Success", "Payment request generated successfully");
    setPaymentAmount("");
    setPaymentMessage("");
  };

  return (
    <Screen preset="scroll">
      <View style={styles.container}>
        {/* QR Code Card */}
        <View style={styles.qrCard}>
          <View style={styles.qrHeader}>
            <MaterialCommunityIcons
              name="qrcode-scan"
              size={24}
              color={palette.primaryBlue}
            />
            <Text variant="subtitle">Scan to Pay</Text>
          </View>
          <Text color={palette.neutralMid} style={styles.qrSubtitle}>
            Share this QR code to receive payments
          </Text>

          <View style={styles.qrWrapper}>
            {address ? (
              <QRCode value={address} size={200} backgroundColor="white" />
            ) : null}
          </View>

          <View style={styles.addressContainer}>
            <Text color={palette.neutralMid} style={styles.addressLabel}>
              Your Wallet Address
            </Text>
            <Text
              style={styles.address}
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {address}
            </Text>
          </View>

          <View style={styles.actionButtons}>
            <Button
              label="Copy Address"
              variant="outline"
              onPress={handleCopyAddress}
              style={styles.actionButton}
            />
            <Button
              label="Share Address"
              onPress={handleShareAddress}
              style={styles.actionButton}
            />
          </View>
        </View>

        {/* Request Payment Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons
              name="cash-plus"
              size={24}
              color={palette.primaryBlue}
            />
            <Text variant="subtitle">Request Payment</Text>
          </View>
          <Text color={palette.neutralMid} style={styles.cardSubtitle}>
            Generate a payment request with specific amount
          </Text>

          <Input
            label="Amount"
            placeholder="0.00"
            keyboardType="numeric"
            value={paymentAmount}
            onChangeText={setPaymentAmount}
          />
          <Input
            label="Message (Optional)"
            placeholder="What is this payment for?"
            value={paymentMessage}
            onChangeText={setPaymentMessage}
            multiline
            numberOfLines={2}
          />
          <Button
            label="Generate Payment Request"
            onPress={handleGenerateRequest}
            disabled={!paymentAmount}
          />
        </View>

        {/* Recent Requests Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons
              name="history"
              size={24}
              color={palette.primaryBlue}
            />
            <Text variant="subtitle">Recent Requests</Text>
          </View>

          {mockRequests.length > 0 ? (
            <View style={styles.requestsList}>
              {mockRequests.map((request, index) => (
                <View
                  key={request.id}
                  style={[
                    styles.requestRow,
                    index !== mockRequests.length - 1 && styles.requestBorder,
                  ]}
                >
                  <View style={styles.requestInfo}>
                    <Text style={styles.requestAmount}>{request.amount}</Text>
                    <Text color={palette.neutralMid} style={styles.requestDate}>
                      {request.date}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      request.status === "Completed"
                        ? styles.statusCompleted
                        : styles.statusPending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        request.status === "Completed"
                          ? styles.statusTextCompleted
                          : styles.statusTextPending,
                      ]}
                    >
                      {request.status}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="inbox-outline"
                size={48}
                color={palette.neutralMid}
              />
              <Text color={palette.neutralMid}>No payment requests yet</Text>
            </View>
          )}
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  qrCard: {
    backgroundColor: palette.white,
    borderRadius: 20,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    gap: spacing.md,
  },
  qrHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  qrSubtitle: {
    fontSize: 14,
    textAlign: "center",
  },
  qrWrapper: {
    padding: spacing.lg,
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    marginVertical: spacing.md,
  },
  addressContainer: {
    width: "100%",
    gap: spacing.xs,
    alignItems: "center",
  },
  addressLabel: {
    fontSize: 12,
  },
  address: {
    fontSize: 14,
    fontFamily: "monospace",
    color: palette.neutralDark,
    textAlign: "center",
  },
  actionButtons: {
    flexDirection: "row",
    gap: spacing.md,
    width: "100%",
  },
  actionButton: {
    flex: 1,
  },
  card: {
    backgroundColor: palette.white,
    borderRadius: 20,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  cardSubtitle: {
    fontSize: 14,
    marginTop: -spacing.xs,
  },
  requestsList: {
    gap: 0,
  },
  requestRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  requestBorder: {
    borderBottomWidth: 1,
    borderColor: "#F3F4F6",
  },
  requestInfo: {
    gap: spacing.xs,
  },
  requestAmount: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.neutralDark,
  },
  requestDate: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  statusCompleted: {
    backgroundColor: "#ECFDF3",
  },
  statusPending: {
    backgroundColor: "#FEF3C7",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statusTextCompleted: {
    color: "#059669",
  },
  statusTextPending: {
    color: "#D97706",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
});
