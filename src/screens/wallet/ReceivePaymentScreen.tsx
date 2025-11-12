import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { NetworkSelector } from "@/components/ui/NetworkSelector";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { TokenInfo, TokenSelector } from "@/components/ui/TokenSelector";
import {
  getAllSupportedTokens,
  SupportedNetworkId,
  useWallet,
} from "@/contexts/WalletContext";
import {
  PaymentRequest,
  paymentRequestService,
} from "@/services/paymentRequestService";
import { palette } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  Alert,
  Clipboard,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  View,
  Vibration,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

export const ReceivePaymentScreen: React.FC = () => {
  const { address, selectedNetwork, switchNetwork } = useWallet();

  // State management
  const [showNetworkSelector, setShowNetworkSelector] = useState(false);
  const [showTokenSelector, setShowTokenSelector] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [currentNetworkId, setCurrentNetworkId] = useState<SupportedNetworkId>(
    selectedNetwork.id
  );
  const [selectedToken, setSelectedToken] = useState<TokenInfo | null>(null);
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingRequest, setIsCreatingRequest] = useState(false);

  // Initialize available tokens and default selection
  const availableTokens = useMemo(() => {
    return getAllSupportedTokens(currentNetworkId);
  }, [currentNetworkId]);

  // Load payment requests on component mount
  const loadPaymentRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      // Update expired requests first
      await paymentRequestService.updateExpiredRequests();

      // Load all requests
      const requests = await paymentRequestService.getPaymentRequests();
      setPaymentRequests(requests);
    } catch (error) {
      console.error("Failed to load payment requests:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Set default token when network changes (prefer USDC)
  React.useEffect(() => {
    if (availableTokens.length > 0) {
      const preferredToken =
        availableTokens.find((t) => t.symbol === "USDC") ||
        availableTokens.find(
          (t) => t.address !== "0x0000000000000000000000000000000000000000"
        ) ||
        availableTokens[0];

      setSelectedToken(preferredToken);
    }
  }, [availableTokens]);

  // Load payment requests on mount
  useEffect(() => {
    loadPaymentRequests();
  }, [loadPaymentRequests]);

  // Generate payment URL/QR data
  const paymentData = useMemo(() => {
    if (!address) return address;

    // Basic address for simple QR
    let qrData = address;

    // Enhanced QR data with payment request info
    if (paymentAmount && selectedToken) {
      // EIP-681 standard for payment requests
      const params = new URLSearchParams();
      if (paymentAmount) params.append("value", paymentAmount);
      if (paymentMessage) params.append("message", paymentMessage);

      if (
        selectedToken.address === "0x0000000000000000000000000000000000000000"
      ) {
        // Native token payment
        qrData = `ethereum:${address}?${params.toString()}`;
      } else {
        // ERC-20 token payment
        params.append("address", selectedToken.address);
        params.append("uint256", paymentAmount);
        qrData = `ethereum:${
          selectedToken.address
        }/transfer?${params.toString()}`;
      }
    }

    return qrData;
  }, [address, paymentAmount, selectedToken, paymentMessage]);

  // Handle network selection
  const handleNetworkSelect = async (networkId: SupportedNetworkId) => {
    setCurrentNetworkId(networkId);
    if (networkId !== selectedNetwork.id) {
      try {
        await switchNetwork(networkId);
      } catch (error) {
        console.error("Failed to switch network:", error);
        Alert.alert("Network Switch Failed", "Please try again");
      }
    }
  };

  // Handle token selection
  const handleTokenSelect = (token: TokenInfo) => {
    setSelectedToken(token);
  };

  // Handle copying address
  const handleCopyAddress = () => {
    if (address) {
      Clipboard.setString(address);
      Vibration.vibrate(50);
      Alert.alert("✅ Copied!", "Wallet address copied to clipboard");
    }
  };

  // Handle copying payment data
  const handleCopyPaymentData = () => {
    if (paymentData) {
      Clipboard.setString(paymentData);
      Vibration.vibrate(50);
      Alert.alert("✅ Copied!", "Payment request copied to clipboard");
    }
  };

  // Handle sharing address
  const handleShareAddress = async () => {
    if (address) {
      try {
        await Share.share({
          message: `Send crypto to my BlockFinaX wallet:\n\n${address}\n\nNetwork: ${selectedNetwork.name}`,
          title: "My Wallet Address",
        });
      } catch (error) {
        console.error("Share failed:", error);
      }
    }
  };

  // Handle sharing payment request
  const handleSharePaymentRequest = async () => {
    if (!paymentAmount || !selectedToken) {
      Alert.alert(
        "Missing Information",
        "Please enter an amount and select a token"
      );
      return;
    }

    try {
      const message = `Payment Request\n\nAmount: ${paymentAmount} ${
        selectedToken.symbol
      }\nNetwork: ${selectedNetwork.name}\nAddress: ${address}${
        paymentMessage ? `\nMessage: ${paymentMessage}` : ""
      }`;

      await Share.share({
        message,
        title: "Payment Request",
      });
    } catch (error) {
      console.error("Share failed:", error);
    }
  };

  // Handle generating payment request
  const handleGenerateRequest = async () => {
    if (!paymentAmount) {
      Alert.alert("Missing Amount", "Please enter an amount");
      return;
    }

    if (!selectedToken) {
      Alert.alert("Missing Token", "Please select a token");
      return;
    }

    if (!address) {
      Alert.alert("No Address", "Wallet address not found");
      return;
    }

    setIsCreatingRequest(true);
    try {
      await paymentRequestService.createPaymentRequest({
        amount: paymentAmount,
        token: selectedToken.symbol,
        networkId: currentNetworkId,
        network: selectedNetwork.name,
        address,
        message: paymentMessage || undefined,
        expiresInHours: 24, // Expire in 24 hours
      });

      // Clear form
      setPaymentAmount("");
      setPaymentMessage("");

      // Reload requests
      await loadPaymentRequests();

      Vibration.vibrate(100);
      Alert.alert(
        "✅ Payment Request Created!",
        `Request for ${paymentAmount} ${selectedToken.symbol} on ${selectedNetwork.name} has been created and will expire in 24 hours.`
      );
    } catch (error) {
      console.error("Failed to create payment request:", error);
      Alert.alert(
        "Error",
        "Failed to create payment request. Please try again."
      );
    } finally {
      setIsCreatingRequest(false);
    }
  };

  // Handle deleting payment request
  const handleDeleteRequest = async (requestId: string) => {
    try {
      await paymentRequestService.deletePaymentRequest(requestId);
      await loadPaymentRequests();
      Vibration.vibrate(50);
    } catch (error) {
      console.error("Failed to delete payment request:", error);
      Alert.alert("Error", "Failed to delete payment request");
    }
  };

  // Get network icon and color
  const getNetworkIcon = () => {
    if (currentNetworkId.includes("ethereum")) return "ethereum";
    if (currentNetworkId.includes("base")) return "alpha-b-circle-outline";
    if (currentNetworkId.includes("lisk")) return "alpha-l-circle";
    if (currentNetworkId.includes("polygon")) return "triangle";
    if (currentNetworkId.includes("bsc")) return "alpha-b-circle";
    return "earth";
  };

  const getNetworkColor = () => {
    if (currentNetworkId.includes("ethereum")) return "#627EEA";
    if (currentNetworkId.includes("base")) return "#0052FF";
    if (currentNetworkId.includes("lisk")) return "#4070F4";
    if (currentNetworkId.includes("polygon")) return "#8247E5";
    if (currentNetworkId.includes("bsc")) return "#F3BA2F";
    return palette.primaryBlue;
  };

  const getTokenIcon = (symbol: string) => {
    switch (symbol?.toUpperCase()) {
      case "ETH":
        return "ethereum";
      case "MATIC":
        return "triangle";
      case "BNB":
        return "alpha-b-circle";
      case "USDC":
        return "currency-usd-circle";
      case "USDT":
        return "currency-usd";
      case "DAI":
        return "alpha-d-circle";
      default:
        return "currency-usd-circle-outline";
    }
  };

  const getTokenColor = (symbol: string) => {
    switch (symbol?.toUpperCase()) {
      case "ETH":
        return "#627EEA";
      case "MATIC":
        return "#8247E5";
      case "BNB":
        return "#F3BA2F";
      case "USDC":
        return "#2775CA";
      case "USDT":
        return "#26A17B";
      case "DAI":
        return "#F5AC37";
      default:
        return palette.neutralMid;
    }
  };

  const getStatusColor = (status: PaymentRequest["status"]) => {
    switch (status) {
      case "completed":
        return palette.successGreen;
      case "pending":
        return palette.warningYellow;
      case "expired":
        return palette.neutralMid;
      default:
        return palette.neutralMid;
    }
  };

  const getStatusIcon = (status: PaymentRequest["status"]) => {
    switch (status) {
      case "completed":
        return "check-circle";
      case "pending":
        return "clock-outline";
      case "expired":
        return "close-circle-outline";
      default:
        return "help-circle-outline";
    }
  };

  return (
    <Screen preset="scroll">
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={loadPaymentRequests}
            colors={[palette.primaryBlue]}
            tintColor={palette.primaryBlue}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <MaterialCommunityIcons
            name="qrcode-scan"
            size={28}
            color={palette.primaryBlue}
          />
          <View style={styles.headerText}>
            <Text variant="title" style={styles.headerTitle}>
              Receive Payment
            </Text>
            <Text color={palette.neutralMid} style={styles.subtitle}>
              Share your address or generate a payment request
            </Text>
          </View>
        </View>

        {/* Network & Token Selection */}
        <View style={styles.selectionCard}>
          <Text style={styles.selectionLabel}>Network & Token</Text>

          {/* Network Selector */}
          <Pressable
            style={styles.selectorButton}
            onPress={() => setShowNetworkSelector(true)}
          >
            <View style={styles.selectorLeft}>
              <View
                style={[
                  styles.networkIcon,
                  { backgroundColor: getNetworkColor() },
                ]}
              >
                <MaterialCommunityIcons
                  name={getNetworkIcon() as any}
                  size={20}
                  color={palette.white}
                />
              </View>
              <View>
                <Text style={styles.selectorTitle}>{selectedNetwork.name}</Text>
                <Text style={styles.selectorSubtitle}>
                  Chain ID: {selectedNetwork.chainId}
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons
              name="chevron-down"
              size={20}
              color={palette.neutralMid}
            />
          </Pressable>

          {/* Token Selector */}
          <Pressable
            style={styles.selectorButton}
            onPress={() => setShowTokenSelector(true)}
          >
            <View style={styles.selectorLeft}>
              <View
                style={[
                  styles.tokenIcon,
                  {
                    backgroundColor: selectedToken
                      ? getTokenColor(selectedToken.symbol)
                      : palette.neutralMid,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={
                    selectedToken
                      ? (getTokenIcon(selectedToken.symbol) as any)
                      : "help"
                  }
                  size={20}
                  color={palette.white}
                />
              </View>
              <View>
                <Text style={styles.selectorTitle}>
                  {selectedToken ? selectedToken.symbol : "Select Token"}
                </Text>
                <Text style={styles.selectorSubtitle}>
                  {selectedToken
                    ? selectedToken.name
                    : "Choose token to receive"}
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons
              name="chevron-down"
              size={20}
              color={palette.neutralMid}
            />
          </Pressable>
        </View>

        {/* QR Code Card */}
        <View style={styles.qrCard}>
          <View style={styles.qrHeader}>
            <MaterialCommunityIcons
              name="qrcode"
              size={20}
              color={palette.primaryBlue}
            />
            <Text style={styles.qrTitle}>
              {paymentAmount && selectedToken
                ? "Payment Request QR"
                : "Wallet Address QR"}
            </Text>
          </View>

          <View style={styles.qrWrapper}>
            {paymentData ? (
              <QRCode
                value={paymentData}
                size={180}
                backgroundColor="white"
                color={palette.neutralDark}
              />
            ) : null}
          </View>

          {paymentAmount && selectedToken && (
            <View style={styles.paymentInfo}>
              <Text style={styles.paymentAmount}>
                {paymentAmount} {selectedToken.symbol}
              </Text>
              <Text style={styles.paymentNetwork}>
                on {selectedNetwork.name}
              </Text>
              {paymentMessage && (
                <Text style={styles.paymentMessage}>"{paymentMessage}"</Text>
              )}
            </View>
          )}

          <View style={styles.addressContainer}>
            <Text color={palette.neutralMid} style={styles.addressLabel}>
              Your Wallet Address
            </Text>
            <Text
              style={styles.address}
              numberOfLines={2}
              ellipsizeMode="middle"
            >
              {address}
            </Text>
          </View>

          <View style={styles.actionButtons}>
            <Button
              label="Copy"
              variant="outline"
              onPress={
                paymentAmount ? handleCopyPaymentData : handleCopyAddress
              }
              style={styles.actionButton}
            />
            <Button
              label="Share"
              onPress={
                paymentAmount ? handleSharePaymentRequest : handleShareAddress
              }
              style={styles.actionButton}
            />
          </View>
        </View>

        {/* Payment Request Form */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons
              name="cash-plus"
              size={20}
              color={palette.primaryBlue}
            />
            <Text style={styles.cardTitle}>Create Payment Request</Text>
          </View>
          <Text color={palette.neutralMid} style={styles.cardSubtitle}>
            Generate a specific payment request with amount
          </Text>

          <Input
            label={`Amount (${selectedToken?.symbol || "Token"})`}
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
            maxLength={100}
            helperText={`${paymentMessage.length}/100`}
          />

          <Button
            label={isCreatingRequest ? "Creating..." : "Generate Request"}
            onPress={handleGenerateRequest}
            disabled={!paymentAmount || !selectedToken || isCreatingRequest}
          />
        </View>

        {/* Recent Payment Requests */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons
              name="history"
              size={20}
              color={palette.primaryBlue}
            />
            <Text style={styles.cardTitle}>Recent Requests</Text>
          </View>

          {paymentRequests.length > 0 ? (
            <View style={styles.requestsList}>
              {paymentRequests.map((request, index) => {
                const createdDate = request.createdAt.toLocaleDateString(
                  "en-US",
                  {
                    month: "short",
                    day: "numeric",
                  }
                );

                return (
                  <Pressable
                    key={request.id}
                    style={[
                      styles.requestRow,
                      index !== paymentRequests.length - 1 &&
                        styles.requestBorder,
                    ]}
                    onLongPress={() => {
                      Alert.alert(
                        "Payment Request Options",
                        `${request.amount} ${request.token} request`,
                        [
                          {
                            text: "Delete",
                            style: "destructive",
                            onPress: () => handleDeleteRequest(request.id),
                          },
                          {
                            text: "Copy QR Data",
                            onPress: () => {
                              Clipboard.setString(request.qrData);
                              Vibration.vibrate(50);
                              Alert.alert(
                                "Copied!",
                                "Payment data copied to clipboard"
                              );
                            },
                          },
                          { text: "Cancel", style: "cancel" },
                        ]
                      );
                    }}
                  >
                    <View style={styles.requestLeft}>
                      <View
                        style={[
                          styles.requestIcon,
                          { backgroundColor: getTokenColor(request.token) },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={getTokenIcon(request.token) as any}
                          size={16}
                          color={palette.white}
                        />
                      </View>
                      <View style={styles.requestInfo}>
                        <Text style={styles.requestAmount}>
                          {request.amount} {request.token}
                        </Text>
                        <Text
                          color={palette.neutralMid}
                          style={styles.requestMeta}
                        >
                          {request.network} • {createdDate}
                        </Text>
                        {request.message && (
                          <Text
                            color={palette.neutralMid}
                            style={styles.requestMessageText}
                          >
                            {request.message}
                          </Text>
                        )}
                        {request.status === "pending" && (
                          <Text
                            color={palette.neutralMid}
                            style={styles.expiryText}
                          >
                            Expires: {request.expiresAt.toLocaleDateString()}
                          </Text>
                        )}
                      </View>
                    </View>

                    <View style={styles.requestRight}>
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor:
                              getStatusColor(request.status) + "20",
                          },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={getStatusIcon(request.status) as any}
                          size={12}
                          color={getStatusColor(request.status)}
                        />
                        <Text
                          style={[
                            styles.statusText,
                            { color: getStatusColor(request.status) },
                          ]}
                        >
                          {request.status.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="inbox-outline"
                size={48}
                color={palette.neutralMid}
              />
              <Text color={palette.neutralMid} style={styles.emptyStateText}>
                No payment requests yet
              </Text>
              <Text color={palette.neutralMid} style={styles.emptyStateSubtext}>
                Create your first payment request above
              </Text>
            </View>
          )}
        </View>

        {/* Bottom spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Network Selector Modal */}
      <NetworkSelector
        visible={showNetworkSelector}
        onClose={() => setShowNetworkSelector(false)}
        onSelectNetwork={handleNetworkSelect}
        selectedNetworkId={currentNetworkId}
      />

      {/* Token Selector Modal */}
      <TokenSelector
        visible={showTokenSelector}
        onClose={() => setShowTokenSelector(false)}
        onSelectToken={handleTokenSelect}
        selectedToken={selectedToken || undefined}
        networkId={currentNetworkId}
        showBalances={false}
      />
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  headerText: {
    flex: 1,
    gap: spacing.xs,
  },
  headerTitle: {
    fontSize: 24,
  },
  subtitle: {
    fontSize: 16,
  },
  selectionCard: {
    backgroundColor: palette.white,
    padding: spacing.lg,
    borderRadius: 16,
    gap: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: spacing.lg,
  },
  selectionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.neutralDark,
  },
  selectorButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: palette.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: palette.neutralLighter,
  },
  selectorLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  networkIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  tokenIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  selectorTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.neutralDark,
  },
  selectorSubtitle: {
    fontSize: 12,
    color: palette.neutralMid,
    marginTop: 2,
  },
  qrCard: {
    backgroundColor: palette.white,
    borderRadius: 20,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  qrHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  qrTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.neutralDark,
  },
  qrWrapper: {
    padding: spacing.lg,
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    marginVertical: spacing.md,
  },
  paymentInfo: {
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  paymentAmount: {
    fontSize: 20,
    fontWeight: "700",
    color: palette.primaryBlue,
  },
  paymentNetwork: {
    fontSize: 14,
    color: palette.neutralMid,
  },
  paymentMessage: {
    fontSize: 12,
    color: palette.neutralMid,
    fontStyle: "italic",
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
    borderRadius: 16,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: spacing.lg,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.neutralDark,
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
  requestLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  requestIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  requestInfo: {
    flex: 1,
    gap: 2,
  },
  requestAmount: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.neutralDark,
  },
  requestMeta: {
    fontSize: 12,
  },
  requestMessageText: {
    fontSize: 11,
    fontStyle: "italic",
  },
  requestRight: {
    alignItems: "flex-end",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    gap: spacing.sm,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "500",
  },
  emptyStateSubtext: {
    fontSize: 14,
  },
  bottomSpacing: {
    height: spacing.xxl,
  },
  expiryText: {
    fontSize: 10,
    fontStyle: "italic",
  },
});
