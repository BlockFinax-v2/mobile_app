import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { palette } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { useNavigation } from "@react-navigation/native";
import React, { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

const mockInvoices = [
  {
    id: "inv-1",
    title: "Digital Marketing Services",
    recipient: "Acme Corp",
    amount: "2,500.00 USDC",
    status: "Paid",
    date: "Oct 28, 2025",
    dueDate: "Nov 15, 2025",
  },
  {
    id: "inv-2",
    title: "Website Development",
    recipient: "StartupXYZ",
    amount: "5,000.00 USDC",
    status: "Pending",
    date: "Oct 25, 2025",
    dueDate: "Nov 10, 2025",
  },
];

export const InvoiceHomeScreen: React.FC = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<"sent" | "received">("sent");

  const handleCreateInvoice = () => {
    // This screen is not currently in navigation - show alert instead
    alert("Invoice creation is available through the Dashboard Quick Actions");
  };

  return (
    <Screen preset="scroll">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text variant="title">Invoice Management</Text>
            <Text color={palette.neutralMid} style={styles.subtitle}>
              Create, send, and manage smart invoices with crypto payments
            </Text>
          </View>
          <Button
            label="Create Invoice"
            onPress={handleCreateInvoice}
            style={styles.createButton}
          />
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "sent" && styles.activeTab]}
            onPress={() => setActiveTab("sent")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "sent" && styles.activeTabText,
              ]}
            >
              Sent Invoices
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "received" && styles.activeTab]}
            onPress={() => setActiveTab("received")}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === "received" && styles.activeTabText,
              ]}
            >
              Received Invoices
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {activeTab === "sent" ? (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons
                  name="send"
                  size={24}
                  color={palette.primaryBlue}
                />
                <View style={styles.sectionHeaderText}>
                  <Text variant="subtitle">Sent Invoices</Text>
                  <Text
                    color={palette.neutralMid}
                    style={styles.sectionSubtitle}
                  >
                    Invoices you've sent to clients and partners
                  </Text>
                </View>
              </View>

              {mockInvoices.length > 0 ? (
                <View style={styles.invoicesList}>
                  {mockInvoices.map((invoice) => (
                    <View key={invoice.id} style={styles.invoiceCard}>
                      <View style={styles.invoiceHeader}>
                        <Text style={styles.invoiceTitle}>{invoice.title}</Text>
                        <View
                          style={[
                            styles.statusBadge,
                            invoice.status === "Paid"
                              ? styles.statusPaid
                              : styles.statusPending,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusText,
                              invoice.status === "Paid"
                                ? styles.statusTextPaid
                                : styles.statusTextPending,
                            ]}
                          >
                            {invoice.status}
                          </Text>
                        </View>
                      </View>
                      <Text
                        color={palette.neutralMid}
                        style={styles.invoiceRecipient}
                      >
                        To: {invoice.recipient}
                      </Text>
                      <View style={styles.invoiceFooter}>
                        <Text style={styles.invoiceAmount}>
                          {invoice.amount}
                        </Text>
                        <Text
                          color={palette.neutralMid}
                          style={styles.invoiceDate}
                        >
                          Due: {invoice.dueDate}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons
                    name="invoice-text-outline"
                    size={64}
                    color={palette.neutralMid}
                  />
                  <Text variant="subtitle" color={palette.neutralDark}>
                    No invoices sent
                  </Text>
                  <Text color={palette.neutralMid} style={styles.emptyText}>
                    Get started by creating your first invoice.
                  </Text>
                  <Button
                    label="Create Invoice"
                    onPress={handleCreateInvoice}
                    style={styles.emptyButton}
                  />
                </View>
              )}
            </View>
          ) : (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <MaterialCommunityIcons
                  name="inbox"
                  size={24}
                  color={palette.primaryBlue}
                />
                <View style={styles.sectionHeaderText}>
                  <Text variant="subtitle">Received Invoices</Text>
                  <Text
                    color={palette.neutralMid}
                    style={styles.sectionSubtitle}
                  >
                    Invoices received from vendors and partners
                  </Text>
                </View>
              </View>

              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="inbox-outline"
                  size={64}
                  color={palette.neutralMid}
                />
                <Text variant="subtitle" color={palette.neutralDark}>
                  No received invoices
                </Text>
                <Text color={palette.neutralMid} style={styles.emptyText}>
                  Invoices sent to you will appear here.
                </Text>
              </View>
            </View>
          )}
        </View>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  headerContent: {
    flex: 1,
    gap: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  createButton: {
    width: 140,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    alignItems: "center",
  },
  activeTab: {
    backgroundColor: palette.white,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.neutralMid,
  },
  activeTabText: {
    color: palette.primaryBlue,
  },
  content: {
    flex: 1,
  },
  sectionCard: {
    backgroundColor: palette.white,
    borderRadius: 16,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  sectionHeaderText: {
    flex: 1,
    gap: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  invoicesList: {
    gap: spacing.md,
  },
  invoiceCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  invoiceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  invoiceTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: palette.neutralDark,
    flex: 1,
    marginRight: spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusPaid: {
    backgroundColor: "#ECFDF3",
  },
  statusPending: {
    backgroundColor: "#FEF3C7",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  statusTextPaid: {
    color: "#059669",
  },
  statusTextPending: {
    color: "#D97706",
  },
  invoiceRecipient: {
    fontSize: 14,
  },
  invoiceFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  invoiceAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: palette.primaryBlue,
  },
  invoiceDate: {
    fontSize: 12,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
  },
  emptyButton: {
    marginTop: spacing.md,
    width: 160,
  },
});
