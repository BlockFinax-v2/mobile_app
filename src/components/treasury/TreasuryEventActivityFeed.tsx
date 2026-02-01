import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { useTreasuryEvents } from "@/hooks/useTreasuryEvents";
import { TreasuryEvent } from "@/services/treasuryEventService";

export const TreasuryEventActivityFeed: React.FC<{
  limit?: number;
  eventTypes?: TreasuryEvent["eventType"][];
}> = ({ limit = 20, eventTypes }) => {
  const events = useTreasuryEvents({ limit, eventTypes });
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  const formatTimestamp = (timestamp: number) => {
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

  const getEventIcon = (eventType: TreasuryEvent["eventType"]) => {
    switch (eventType) {
      case "Staked":
        return "📈";
      case "Unstaked":
        return "📉";
      case "RewardsClaimed":
        return "💰";
      case "ProposalCreated":
        return "📝";
      case "ProposalVoteCast":
        return "🗳️";
      case "FinancierStatusChanged":
        return "👤";
      case "FinancierRevocationRequested":
        return "⚠️";
      case "FinancierRevocationCompleted":
        return "✅";
      case "FinancierRevocationCancelled":
        return "❌";
      case "EmergencyWithdrawn":
        return "🚨";
      default:
        return "📊";
    }
  };

  const getEventColor = (eventType: TreasuryEvent["eventType"]) => {
    switch (eventType) {
      case "Staked":
      case "RewardsClaimed":
      case "ProposalCreated":
        return "#10B981";
      case "Unstaked":
      case "EmergencyWithdrawn":
        return "#F59E0B";
      case "FinancierRevocationRequested":
      case "FinancierRevocationCancelled":
        return "#EF4444";
      default:
        return "#3B82F6";
    }
  };

  const renderEventDetails = (event: TreasuryEvent) => {
    const data = event.data;
    const details: Array<{ label: string; value: string }> = [];

    switch (event.eventType) {
      case "Staked":
        if (data.amount)
          details.push({
            label: "Amount",
            value: `${parseFloat(data.amount.toString()) / 1e18} BFXT`,
          });
        if (data.votingPower)
          details.push({
            label: "Voting Power",
            value: data.votingPower.toString(),
          });
        if (data.currentApr)
          details.push({ label: "APR", value: `${data.currentApr}%` });
        break;

      case "Unstaked":
        if (data.amount)
          details.push({
            label: "Amount",
            value: `${parseFloat(data.amount.toString()) / 1e18} BFXT`,
          });
        if (data.rewards)
          details.push({
            label: "Rewards",
            value: `${parseFloat(data.rewards.toString()) / 1e18} BFXT`,
          });
        break;

      case "RewardsClaimed":
      case "RewardsDistributed":
        if (data.amount)
          details.push({
            label: "Amount",
            value: `${parseFloat(data.amount.toString()) / 1e18} BFXT`,
          });
        break;

      case "ProposalCreated":
        if (data.category)
          details.push({ label: "Category", value: data.category });
        if (data.title) details.push({ label: "Title", value: data.title });
        break;

      case "ProposalVoteCast":
        if (data.proposalId)
          details.push({
            label: "Proposal",
            value: data.proposalId.substring(0, 10) + "...",
          });
        if (data.support !== undefined)
          details.push({
            label: "Vote",
            value: data.support ? "For" : "Against",
          });
        if (data.votingPower)
          details.push({
            label: "Voting Power",
            value: data.votingPower.toString(),
          });
        break;

      case "FinancierStatusChanged":
        if (data.isFinancier !== undefined)
          details.push({
            label: "Status",
            value: data.isFinancier ? "Financier" : "Regular",
          });
        break;

      case "EmergencyWithdrawn":
        if (data.amount)
          details.push({
            label: "Amount",
            value: `${parseFloat(data.amount.toString()) / 1e18} BFXT`,
          });
        if (data.penalty)
          details.push({
            label: "Penalty",
            value: `${parseFloat(data.penalty.toString()) / 1e18} BFXT`,
          });
        break;
    }

    return details;
  };

  const toggleExpand = (txHash: string) => {
    setExpandedEvent(expandedEvent === txHash ? null : txHash);
  };

  if (events.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No recent activity</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {events.map((event, index) => {
        const isExpanded = expandedEvent === event.transactionHash;
        const eventColor = getEventColor(event.eventType);
        const eventDetails = renderEventDetails(event);

        return (
          <TouchableOpacity
            key={`${event.transactionHash}-${index}`}
            style={styles.eventCard}
            onPress={() => toggleExpand(event.transactionHash)}
            activeOpacity={0.7}
          >
            <View style={styles.eventHeader}>
              <View style={styles.eventIcon}>
                <Text style={styles.iconText}>
                  {getEventIcon(event.eventType)}
                </Text>
              </View>
              <View style={styles.eventInfo}>
                <Text style={[styles.eventType, { color: eventColor }]}>
                  {event.eventType}
                </Text>
                <Text style={styles.timestamp}>
                  {formatTimestamp(event.timestamp)}
                </Text>
              </View>
              <View
                style={[styles.statusDot, { backgroundColor: eventColor }]}
              />
            </View>

            {isExpanded && (
              <View style={styles.eventDetails}>
                <View style={styles.divider} />

                {eventDetails.map((detail, idx) => (
                  <View key={idx} style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{detail.label}:</Text>
                    <Text style={styles.detailValue}>{detail.value}</Text>
                  </View>
                ))}

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Block:</Text>
                  <Text style={styles.detailValue}>{event.blockNumber}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Tx Hash:</Text>
                  <Text style={styles.detailValue} numberOfLines={1}>
                    {event.transactionHash}
                  </Text>
                </View>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  eventCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  eventHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  eventIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  iconText: {
    fontSize: 20,
  },
  eventInfo: {
    flex: 1,
  },
  eventType: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: "#6B7280",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  eventDetails: {
    marginTop: 12,
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
    width: 80,
  },
  detailValue: {
    fontSize: 12,
    color: "#111827",
    flex: 1,
    fontWeight: "400",
  },
});
