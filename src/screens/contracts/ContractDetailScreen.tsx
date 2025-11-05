import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { ContractsStackParamList } from "@/navigation/types";
import { palette } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { RouteProp, useRoute } from "@react-navigation/native";
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

const timelineStages = [
  { id: "created", label: "Created", date: "Oct 12, 2025" },
  { id: "accepted", label: "Accepted", date: "Oct 14, 2025" },
  { id: "funded", label: "Funded", date: "Oct 16, 2025" },
  { id: "active", label: "Active", date: "Oct 17, 2025" },
  { id: "delivered", label: "Delivered", date: "Pending" },
  { id: "completed", label: "Completed", date: "Pending" },
];

const documents = [
  { id: "invoice", name: "Commercial Invoice.pdf", size: "1.2 MB" },
  { id: "bol", name: "Bill of Lading.pdf", size: "860 KB" },
];

export const ContractDetailScreen: React.FC = () => {
  const route =
    useRoute<RouteProp<ContractsStackParamList, "ContractDetail">>();
  const contractId = route.params?.id ?? "CT-1209";

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.headerCard}>
          <View style={styles.rowBetween}>
            <Text variant="subtitle" color={palette.white}>
              Contract ID
            </Text>
            <Button label="Copy" variant="outline" style={styles.copyButton} />
          </View>
          <Text variant="display" color={palette.white}>
            {contractId}
          </Text>
          <View style={styles.badge}>
            <Text color={palette.white}>Active</Text>
          </View>
          <Text color={palette.white}>Counterparty: Kigali Imports Ltd.</Text>
          <Text color={palette.white}>Value: USDC 25,000</Text>
        </View>

        <View style={styles.card}>
          <Text variant="subtitle" color={palette.primaryBlue}>
            Overview
          </Text>
          <Text color={palette.neutralMid}>Delivery Date: Nov 20, 2025</Text>
          <Text color={palette.neutralMid}>Payment Terms: Net 30</Text>
          <Text color={palette.neutralMid}>
            Quality Standards: Grade A Cocoa Beans
          </Text>
          <View style={styles.actionsRow}>
            <Button label="Confirm Receipt" />
            <Button label="Request Changes" variant="outline" />
          </View>
        </View>

        <View style={styles.card}>
          <Text variant="subtitle" color={palette.primaryBlue}>
            Documents
          </Text>
          {documents.map((doc) => (
            <View key={doc.id} style={styles.documentRow}>
              <MaterialCommunityIcons
                name="file-document-outline"
                size={24}
                color={palette.primaryBlue}
              />
              <View style={styles.documentInfo}>
                <Text>{doc.name}</Text>
                <Text variant="small" color={palette.neutralMid}>
                  {doc.size}
                </Text>
              </View>
              <Button
                label="View"
                variant="outline"
                style={styles.smallButton}
              />
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text variant="subtitle" color={palette.primaryBlue}>
            Timeline
          </Text>
          {timelineStages.map((stage, index) => (
            <View key={stage.id} style={styles.timelineRow}>
              <View style={styles.timelineIconWrapper}>
                <View
                  style={[
                    styles.timelineDot,
                    stage.date !== "Pending" ? styles.timelineDotActive : null,
                  ]}
                />
                {index < timelineStages.length - 1 && (
                  <View style={styles.timelineLine} />
                )}
              </View>
              <View style={styles.timelineContent}>
                <Text>{stage.label}</Text>
                <Text variant="small" color={palette.neutralMid}>
                  {stage.date}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text variant="subtitle" color={palette.primaryBlue}>
            Escrow
          </Text>
          <Text>Escrow Amount: USDC 15,000</Text>
          <Text variant="small" color={palette.neutralMid}>
            Release Conditions: Buyer confirmation of delivery, quality
            inspection certificate upload.
          </Text>
          <Button
            label="View Escrow"
            variant="outline"
            style={styles.smallButton}
          />
        </View>

        <View style={styles.card}>
          <Text variant="subtitle" color={palette.primaryBlue}>
            Messages
          </Text>
          <Text color={palette.neutralMid}>
            Discuss contract details and updates with the counterparty.
          </Text>
          <Button
            label="Open Chat"
            variant="outline"
            style={styles.smallButton}
          />
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  headerCard: {
    backgroundColor: palette.primaryBlue,
    borderRadius: 24,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  copyButton: {
    width: 90,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 12,
    backgroundColor: "rgba(0,255,0,0.3)",
  },
  card: {
    backgroundColor: palette.white,
    borderRadius: 24,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  actionsRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  documentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  documentInfo: {
    flex: 1,
  },
  smallButton: {
    width: 110,
  },
  timelineRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  timelineIconWrapper: {
    alignItems: "center",
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: palette.primaryBlue,
    backgroundColor: palette.white,
  },
  timelineDotActive: {
    backgroundColor: palette.primaryBlue,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#E5E7EB",
    marginTop: 2,
  },
  timelineContent: {
    flex: 1,
    gap: spacing.xs,
  },
});
