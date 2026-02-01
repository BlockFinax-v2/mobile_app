import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { usePGAHistory } from "@/hooks/usePGAEvents";
import { PGAEvent } from "@/services/tradeFinanceEventService";
import { colors, palette } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

interface EventActivityFeedProps {
  pgaId: string;
  maxEvents?: number;
  compact?: boolean;
}

/**
 * Displays a timeline of all events for a specific PGA
 * Shows event type, timestamp, and transaction hash
 */
export const EventActivityFeed: React.FC<EventActivityFeedProps> = ({
  pgaId,
  maxEvents = 50,
  compact = false,
}) => {
  const { events, loading, error, refetch } = usePGAHistory(pgaId);
  const [expanded, setExpanded] = useState<string[]>([]);

  const toggleExpand = (txHash: string) => {
    setExpanded((prev) =>
      prev.includes(txHash)
        ? prev.filter((hash) => hash !== txHash)
        : [...prev, txHash],
    );
  };

  const getEventIcon = (
    eventType: PGAEvent["eventType"],
  ): keyof typeof MaterialCommunityIcons.glyphMap => {
    const iconMap: Record<
      PGAEvent["eventType"],
      keyof typeof MaterialCommunityIcons.glyphMap
    > = {
      PGACreated: "file-document-plus",
      PGAVoteCast: "vote",
      PGAStatusChanged: "state-machine",
      GuaranteeApproved: "check-decagram",
      SellerApprovalReceived: "account-check",
      CollateralPaid: "cash-check",
      GoodsShipped: "truck-delivery",
      BalancePaymentReceived: "cash-multiple",
      CertificateIssued: "certificate",
      DeliveryAgreementCreated: "file-sign",
      BuyerConsentGiven: "hand-okay",
      PGACompleted: "check-circle",
    };
    return iconMap[eventType] || "information";
  };

  const getEventColor = (eventType: PGAEvent["eventType"]): string => {
    const colorMap: Record<PGAEvent["eventType"], string> = {
      PGACreated: palette.primaryBlueLight,
      PGAVoteCast: colors.warning,
      PGAStatusChanged: palette.primaryBlueLight,
      GuaranteeApproved: colors.success,
      SellerApprovalReceived: colors.success,
      CollateralPaid: colors.primary,
      GoodsShipped: palette.primaryBlueLight,
      BalancePaymentReceived: colors.success,
      CertificateIssued: colors.success,
      DeliveryAgreementCreated: palette.primaryBlueLight,
      BuyerConsentGiven: colors.success,
      PGACompleted: colors.success,
    };
    return colorMap[eventType] || colors.textSecondary;
  };

  const getEventDescription = (event: PGAEvent): string => {
    const { eventType, data } = event;

    switch (eventType) {
      case "PGACreated":
        return `Application created for ${data.guaranteeAmount} USDC`;
      case "PGAVoteCast":
        return `Pool member voted ${data.support ? "✓ Approve" : "✗ Reject"}`;
      case "PGAStatusChanged":
        return `Status changed from ${data.oldStatus} to ${data.newStatus}`;
      case "GuaranteeApproved":
        return `Pool approved guarantee for ${data.companyName}`;
      case "SellerApprovalReceived":
        return `Seller approved the transaction`;
      case "CollateralPaid":
        return `Collateral paid: ${data.collateralAmount} USDC`;
      case "GoodsShipped":
        return `Goods shipped via ${data.logisticPartnerName}`;
      case "BalancePaymentReceived":
        return `Balance payment received: ${data.balanceAmount} USDC`;
      case "CertificateIssued":
        return `Certificate #${data.certificateNumber} issued`;
      case "DeliveryAgreementCreated":
        return `Delivery agreement created`;
      case "BuyerConsentGiven":
        return `Buyer confirmed delivery`;
      case "PGACompleted":
        return `Transaction completed successfully`;
      default:
        return eventType;
    }
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading events...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <MaterialCommunityIcons
          name="alert-circle"
          size={48}
          color={colors.error}
        />
        <Text style={styles.errorText}>Failed to load events</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refetch}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (events.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <MaterialCommunityIcons
          name="calendar-blank"
          size={48}
          color={colors.textSecondary}
        />
        <Text style={styles.emptyText}>No events yet</Text>
      </View>
    );
  }

  const displayEvents = events.slice(0, maxEvents);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Activity Timeline</Text>
        <TouchableOpacity onPress={refetch} style={styles.refreshButton}>
          <MaterialCommunityIcons
            name="refresh"
            size={20}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.timeline}>
        {displayEvents.map((event, index) => {
          const isExpanded = expanded.includes(event.transactionHash);
          const isLast = index === displayEvents.length - 1;

          return (
            <View
              key={`${event.transactionHash}-${index}`}
              style={styles.eventContainer}
            >
              {/* Timeline line */}
              {!isLast && <View style={styles.timelineLine} />}

              {/* Event icon */}
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: getEventColor(event.eventType) },
                ]}
              >
                <MaterialCommunityIcons
                  name={getEventIcon(event.eventType)}
                  size={20}
                  color={palette.white}
                />
              </View>

              {/* Event content */}
              <TouchableOpacity
                style={styles.eventContent}
                onPress={() => toggleExpand(event.transactionHash)}
                activeOpacity={0.7}
              >
                <View style={styles.eventHeader}>
                  <Text style={styles.eventType}>{event.eventType}</Text>
                  <Text style={styles.eventTime}>
                    {formatTimestamp(event.timestamp)}
                  </Text>
                </View>

                <Text style={styles.eventDescription}>
                  {getEventDescription(event)}
                </Text>

                {!compact && (
                  <View style={styles.eventMeta}>
                    <View style={styles.metaItem}>
                      <MaterialCommunityIcons
                        name="cube"
                        size={12}
                        color={colors.textSecondary}
                      />
                      <Text style={styles.metaText}>
                        Block {event.blockNumber.toLocaleString()}
                      </Text>
                    </View>

                    <View style={styles.metaItem}>
                      <MaterialCommunityIcons
                        name="link-variant"
                        size={12}
                        color={colors.textSecondary}
                      />
                      <Text style={styles.metaText}>
                        {event.transactionHash.slice(0, 10)}...
                      </Text>
                    </View>
                  </View>
                )}

                {isExpanded && (
                  <View style={styles.expandedContent}>
                    <Text style={styles.expandedLabel}>Transaction Hash:</Text>
                    <Text style={styles.expandedValue} selectable>
                      {event.transactionHash}
                    </Text>

                    <Text style={styles.expandedLabel}>Block Number:</Text>
                    <Text style={styles.expandedValue}>
                      {event.blockNumber.toLocaleString()}
                    </Text>

                    <Text style={styles.expandedLabel}>Timestamp:</Text>
                    <Text style={styles.expandedValue}>
                      {new Date(event.timestamp * 1000).toLocaleString()}
                    </Text>

                    {Object.keys(event.data).length > 0 && (
                      <>
                        <Text style={styles.expandedLabel}>Event Data:</Text>
                        <Text style={styles.expandedValue} selectable>
                          {JSON.stringify(event.data, null, 2)}
                        </Text>
                      </>
                    )}
                  </View>
                )}
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      {events.length > maxEvents && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Showing {maxEvents} of {events.length} events
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
  },
  refreshButton: {
    padding: spacing.xs,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.textSecondary,
  },
  errorText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.error,
    textAlign: "center",
  },
  retryButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: palette.white,
    fontWeight: "600",
  },
  emptyText: {
    marginTop: spacing.md,
    fontSize: 16,
    color: colors.textSecondary,
  },
  timeline: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  eventContainer: {
    flexDirection: "row",
    marginBottom: spacing.lg,
    position: "relative",
  },
  timelineLine: {
    position: "absolute",
    left: 19,
    top: 40,
    bottom: -spacing.lg,
    width: 2,
    backgroundColor: colors.border,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.md,
    zIndex: 1,
  },
  eventContent: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  eventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  eventType: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.text,
    flex: 1,
  },
  eventTime: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  eventDescription: {
    fontSize: 14,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  eventMeta: {
    flexDirection: "row",
    gap: spacing.md,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  expandedContent: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  expandedLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textSecondary,
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  expandedValue: {
    fontSize: 12,
    color: colors.text,
    fontFamily: "monospace",
  },
  footer: {
    padding: spacing.md,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
