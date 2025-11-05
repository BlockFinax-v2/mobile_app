import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface PoolGuaranteeForm {
  companyName: string;
  registrationNumber: string;
  country: string;
  contactPerson: string;
  email: string;
  phone: string;
  tradeDescription: string;
  totalTradeValue: string;
  guaranteeAmount: string;
  collateralDescription: string;
  collateralValue: string;
  sellerWalletAddress: string;
  financingDuration: string;
  contractNumber: string;
  contractDate: string;
  proformaInvoiceUploaded: boolean;
  salesContractUploaded: boolean;
}

export const TradeFinanceScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"overview" | "workflow">(
    "overview"
  );
  const [userRole, setUserRole] = useState<"buyer" | "seller">("buyer");
  const [showApplicationModal, setShowApplicationModal] = useState(false);

  const [poolBalance] = useState({
    balance: "223.60 USDC",
    liveBalance: "Live blockchain balance",
    stakedInDB: "Staked in DB: 100.00 USDC",
  });

  const [guaranteeStats] = useState({
    pending: 0,
    totalGuaranteed: "200.00 USDC",
    approved: 0,
    inProgress: 0,
    totalApproved: 0,
  });

  const [applicationForm, setApplicationForm] = useState<PoolGuaranteeForm>({
    companyName: "",
    registrationNumber: "",
    country: "",
    contactPerson: "",
    email: "",
    phone: "",
    tradeDescription: "",
    totalTradeValue: "",
    guaranteeAmount: "",
    collateralDescription: "",
    collateralValue: "",
    sellerWalletAddress: "",
    financingDuration: "",
    contractNumber: "",
    contractDate: "",
    proformaInvoiceUploaded: false,
    salesContractUploaded: false,
  });

  const [drafts] = useState([]);
  const [applications, setApplications] = useState([
    {
      id: "app-001",
      companyName: "Tech Solutions Ltd",
      guaranteeAmount: "25,000 USDC",
      tradeValue: "50,000 USDC",
      status: "In Progress",
      submittedDate: "Oct 28, 2025",
      contractNumber: "SC-2025-001",
    },
    {
      id: "app-002",
      companyName: "Global Trade Corp",
      guaranteeAmount: "15,000 USDC",
      tradeValue: "30,000 USDC",
      status: "Approved",
      submittedDate: "Oct 25, 2025",
      contractNumber: "SC-2025-002",
    },
  ]);

  const handleSubmitApplication = () => {
    const requiredFields = [
      "companyName",
      "registrationNumber",
      "contactPerson",
      "email",
      "tradeDescription",
      "totalTradeValue",
      "guaranteeAmount",
    ];
    const missingFields = requiredFields.filter(
      (field) => !applicationForm[field as keyof PoolGuaranteeForm]
    );

    if (missingFields.length > 0) {
      Alert.alert("Missing Information", "Please fill in all required fields.");
      return;
    }

    Alert.alert(
      "Application Submitted",
      "Your pool guarantee application has been submitted for review.",
      [
        {
          text: "OK",
          onPress: () => {
            setShowApplicationModal(false);
            setApplicationForm({
              companyName: "",
              registrationNumber: "",
              country: "",
              contactPerson: "",
              email: "",
              phone: "",
              tradeDescription: "",
              totalTradeValue: "",
              guaranteeAmount: "",
              collateralDescription: "",
              collateralValue: "",
              sellerWalletAddress: "",
              financingDuration: "",
              contractNumber: "",
              contractDate: "",
              proformaInvoiceUploaded: false,
              salesContractUploaded: false,
            });
          },
        },
      ]
    );
  };

  const renderOverviewTab = () => (
    <View style={styles.content}>
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Treasury Pool Balance</Text>
          <Text style={styles.statValue}>{poolBalance.balance}</Text>
          <Text style={styles.statSubtext}>{poolBalance.liveBalance}</Text>
          <Text style={styles.statSubtext}>{poolBalance.stakedInDB}</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Pending Guarantees</Text>
          <Text style={styles.statValue}>{guaranteeStats.pending}</Text>
          <Text style={styles.statSubtext}>Being processed</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Guaranteed</Text>
          <Text style={styles.statValue}>{guaranteeStats.totalGuaranteed}</Text>
          <Text style={styles.statSubtext}>Active guarantees</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons
            name="shield-check-outline"
            size={24}
            color={colors.primary}
          />
          <Text style={styles.sectionTitle}>My Pool Guarantees</Text>
        </View>
        <Text style={styles.sectionSubtitle}>
          Multi-step pool guarantee applications
        </Text>

        <View style={styles.guaranteeStatsGrid}>
          <View style={styles.guaranteeStatItem}>
            <Text style={styles.guaranteeStatValue}>
              {guaranteeStats.approved}
            </Text>
            <Text style={styles.guaranteeStatLabel}>Approved</Text>
          </View>
          <View style={styles.guaranteeStatItem}>
            <Text style={styles.guaranteeStatValue}>
              {guaranteeStats.inProgress}
            </Text>
            <Text style={styles.guaranteeStatLabel}>In Progress</Text>
          </View>
          <View style={styles.guaranteeStatItem}>
            <Text style={styles.guaranteeStatValue}>
              {guaranteeStats.totalApproved}
            </Text>
            <Text style={styles.guaranteeStatLabel}>Total Approved (USDC)</Text>
          </View>
        </View>

        <Text style={styles.emptyMessage}>
          No pool guarantees yet. Apply in the Pool Guarantee tab.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>I am a...</Text>
        <Text style={styles.sectionSubtitle}>
          Select your role in the trade finance process
        </Text>

        <View style={styles.roleSelection}>
          <TouchableOpacity
            style={[
              styles.roleButton,
              userRole === "buyer" && styles.roleButtonActive,
            ]}
            onPress={() => setUserRole("buyer")}
          >
            <MaterialCommunityIcons
              name="account"
              size={20}
              color={userRole === "buyer" ? "white" : colors.primary}
            />
            <Text
              style={[
                styles.roleButtonText,
                userRole === "buyer" && styles.roleButtonTextActive,
              ]}
            >
              Buyer
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.roleButton,
              userRole === "seller" && styles.roleButtonActive,
            ]}
            onPress={() => setUserRole("seller")}
          >
            <MaterialCommunityIcons
              name="store"
              size={20}
              color={userRole === "seller" ? "white" : colors.primary}
            />
            <Text
              style={[
                styles.roleButtonText,
                userRole === "seller" && styles.roleButtonTextActive,
              ]}
            >
              Seller
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        {/* Centered Apply Button */}
        <View style={styles.centeredButtonContainer}>
          <TouchableOpacity
            style={styles.applyButton}
            onPress={() => setShowApplicationModal(true)}
          >
            <MaterialCommunityIcons
              name="plus-circle"
              size={18}
              color="white"
            />
            <Text style={styles.applyButtonText}>Apply for Pool Guarantee</Text>
          </TouchableOpacity>
        </View>

        {/* Section Header */}
        <View style={styles.sectionHeaderCentered}>
          <Text style={styles.sectionTitle}>
            My Pool Guarantee Applications
          </Text>
          <Text style={styles.sectionSubtitle}>
            Apply for new guarantees and track your applications
          </Text>
        </View>

        {/* Application History */}
        {applications.length > 0 ? (
          <View style={styles.applicationsContainer}>
            {applications.map((app) => (
              <View key={app.id} style={styles.applicationCard}>
                <View style={styles.applicationHeader}>
                  <Text style={styles.companyName}>{app.companyName}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          app.status === "Approved"
                            ? "#4CAF50"
                            : app.status === "In Progress"
                            ? "#FF9800"
                            : "#f44336",
                      },
                    ]}
                  >
                    <Text style={styles.statusText}>{app.status}</Text>
                  </View>
                </View>

                <View style={styles.applicationDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Contract Number:</Text>
                    <Text style={styles.detailValue}>{app.contractNumber}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Trade Value:</Text>
                    <Text style={styles.detailValue}>{app.tradeValue}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Guarantee Amount:</Text>
                    <Text style={styles.detailValue}>
                      {app.guaranteeAmount}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Submitted:</Text>
                    <Text style={styles.detailValue}>{app.submittedDate}</Text>
                  </View>
                </View>

                <TouchableOpacity style={styles.viewDetailsButton}>
                  <Text style={styles.viewDetailsText}>View Details</Text>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={16}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyApplicationsState}>
            <MaterialCommunityIcons
              name="file-document-outline"
              size={48}
              color={colors.text + "40"}
            />
            <Text style={styles.emptyStateText}>No applications yet</Text>
            <Text style={styles.emptyStateSubtext}>
              Apply for your first pool guarantee to get started
            </Text>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Drafts Awaiting Your Approval</Text>

        {drafts.length === 0 ? (
          <Text style={styles.emptyMessage}>
            No pending draft approvals at this time.
          </Text>
        ) : (
          <View>
            {drafts.map((draft, index) => (
              <View key={index} style={styles.draftCard}></View>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  const renderWorkflowTab = () => (
    <View style={styles.content}>
      <View style={styles.workflowContainer}>
        <MaterialCommunityIcons
          name="cog-outline"
          size={64}
          color={colors.primary}
        />
        <Text style={styles.workflowTitle}>Pool Guarantee Workflow</Text>
        <Text style={styles.workflowDescription}>
          Detailed workflow steps and documentation will be displayed here
        </Text>
      </View>
    </View>
  );

  return (
    <Screen>
      <StatusBar style="dark" />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Trade Finance Portal</Text>
          <Text style={styles.subtitle}>
            Decentralized liquidity pool for trade financing - replacing
            traditional LC/DLC bank guarantees
          </Text>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "overview" && styles.activeTab]}
            onPress={() => setActiveTab("overview")}
          >
            <MaterialCommunityIcons
              name="chart-line"
              size={20}
              color={
                activeTab === "overview" ? colors.primary : colors.textSecondary
              }
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "overview" && styles.activeTabText,
              ]}
            >
              Overview
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === "workflow" && styles.activeTab]}
            onPress={() => setActiveTab("workflow")}
          >
            <MaterialCommunityIcons
              name="cog-outline"
              size={20}
              color={
                activeTab === "workflow" ? colors.primary : colors.textSecondary
              }
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "workflow" && styles.activeTabText,
              ]}
            >
              Pool Guarantee Workflow
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === "overview" ? renderOverviewTab() : renderWorkflowTab()}
      </ScrollView>

      <Modal
        visible={showApplicationModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Apply for Pool Guarantee</Text>
            <TouchableOpacity onPress={() => setShowApplicationModal(false)}>
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.modalSubtitle}>
              Submit application with proforma invoice and sales contract.
              Replaces traditional Letter of Credit.
            </Text>

            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>
                Customer Identity (Required)
              </Text>

              <View style={styles.formRow}>
                <View style={styles.formFieldHalf}>
                  <Text style={styles.formLabel}>Company Name *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={applicationForm.companyName}
                    onChangeText={(text) =>
                      setApplicationForm({
                        ...applicationForm,
                        companyName: text,
                      })
                    }
                    placeholder="ABC Trading Ltd."
                  />
                </View>
                <View style={styles.formFieldHalf}>
                  <Text style={styles.formLabel}>Registration Number *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={applicationForm.registrationNumber}
                    onChangeText={(text) =>
                      setApplicationForm({
                        ...applicationForm,
                        registrationNumber: text,
                      })
                    }
                    placeholder="12345678"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formFieldHalf}>
                  <Text style={styles.formLabel}>Country *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={applicationForm.country}
                    onChangeText={(text) =>
                      setApplicationForm({ ...applicationForm, country: text })
                    }
                    placeholder="United States"
                  />
                </View>
                <View style={styles.formFieldHalf}>
                  <Text style={styles.formLabel}>Contact Person *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={applicationForm.contactPerson}
                    onChangeText={(text) =>
                      setApplicationForm({
                        ...applicationForm,
                        contactPerson: text,
                      })
                    }
                    placeholder="John Doe"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formFieldHalf}>
                  <Text style={styles.formLabel}>Email *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={applicationForm.email}
                    onChangeText={(text) =>
                      setApplicationForm({ ...applicationForm, email: text })
                    }
                    placeholder="contact@company.com"
                    keyboardType="email-address"
                  />
                </View>
                <View style={styles.formFieldHalf}>
                  <Text style={styles.formLabel}>Phone *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={applicationForm.phone}
                    onChangeText={(text) =>
                      setApplicationForm({ ...applicationForm, phone: text })
                    }
                    placeholder="+1 234 567 8900"
                    keyboardType="phone-pad"
                  />
                </View>
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Trade Details</Text>

              <View style={styles.formField}>
                <Text style={styles.formLabel}>Trade Description *</Text>
                <TextInput
                  style={[styles.formInput, styles.textArea]}
                  value={applicationForm.tradeDescription}
                  onChangeText={(text) =>
                    setApplicationForm({
                      ...applicationForm,
                      tradeDescription: text,
                    })
                  }
                  placeholder="e.g., Import of 10,000 units of electronics from China"
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formRow}>
                <View style={styles.formFieldHalf}>
                  <Text style={styles.formLabel}>Total Trade Value (USDC)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={applicationForm.totalTradeValue}
                    onChangeText={(text) =>
                      setApplicationForm({
                        ...applicationForm,
                        totalTradeValue: text,
                      })
                    }
                    placeholder="100000"
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.formFieldHalf}>
                  <Text style={styles.formLabel}>
                    Guarantee Amount Requested (USDC) *
                  </Text>
                  <TextInput
                    style={styles.formInput}
                    value={applicationForm.guaranteeAmount}
                    onChangeText={(text) =>
                      setApplicationForm({
                        ...applicationForm,
                        guaranteeAmount: text,
                      })
                    }
                    placeholder="50000"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formFieldHalf}>
                  <Text style={styles.formLabel}>Collateral Description *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={applicationForm.collateralDescription}
                    onChangeText={(text) =>
                      setApplicationForm({
                        ...applicationForm,
                        collateralDescription: text,
                      })
                    }
                    placeholder="e.g., 10,000 units of electronics (goods as collateral)"
                  />
                </View>
                <View style={styles.formFieldHalf}>
                  <Text style={styles.formLabel}>Collateral Value (USDC)</Text>
                  <TextInput
                    style={styles.formInput}
                    value={applicationForm.collateralValue}
                    onChangeText={(text) =>
                      setApplicationForm({
                        ...applicationForm,
                        collateralValue: text,
                      })
                    }
                    placeholder="100000"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={styles.formFieldHalf}>
                  <Text style={styles.formLabel}>
                    Seller/Beneficiary Wallet Address *
                  </Text>
                  <TextInput
                    style={styles.formInput}
                    value={applicationForm.sellerWalletAddress}
                    onChangeText={(text) =>
                      setApplicationForm({
                        ...applicationForm,
                        sellerWalletAddress: text,
                      })
                    }
                    placeholder="0x..."
                  />
                </View>
                <View style={styles.formFieldHalf}>
                  <Text style={styles.formLabel}>
                    Financing Duration (days)
                  </Text>
                  <TextInput
                    style={styles.formInput}
                    value={applicationForm.financingDuration}
                    onChangeText={(text) =>
                      setApplicationForm({
                        ...applicationForm,
                        financingDuration: text,
                      })
                    }
                    placeholder="90"
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>
                Sales Contract Reference
              </Text>

              <View style={styles.formRow}>
                <View style={styles.formFieldHalf}>
                  <Text style={styles.formLabel}>Contract Number</Text>
                  <TextInput
                    style={styles.formInput}
                    value={applicationForm.contractNumber}
                    onChangeText={(text) =>
                      setApplicationForm({
                        ...applicationForm,
                        contractNumber: text,
                      })
                    }
                    placeholder="SC-2025-001"
                  />
                </View>
                <View style={styles.formFieldHalf}>
                  <Text style={styles.formLabel}>Contract Date</Text>
                  <TextInput
                    style={styles.formInput}
                    value={applicationForm.contractDate}
                    onChangeText={(text) =>
                      setApplicationForm({
                        ...applicationForm,
                        contractDate: text,
                      })
                    }
                    placeholder="mm/dd/yyyy"
                  />
                </View>
              </View>
            </View>

            <View style={styles.formSection}>
              <Text style={styles.formSectionTitle}>Required Documents</Text>

              <View style={styles.documentUpload}>
                <Text style={styles.formLabel}>Proforma Invoice *</Text>
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={() => {
                    Alert.alert(
                      "File Upload",
                      "File upload functionality will be implemented"
                    );
                    setApplicationForm({
                      ...applicationForm,
                      proformaInvoiceUploaded: true,
                    });
                  }}
                >
                  <MaterialCommunityIcons
                    name="cloud-upload"
                    size={24}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.uploadText}>
                    {applicationForm.proformaInvoiceUploaded
                      ? "Proforma Invoice Uploaded"
                      : "Drag & drop proforma invoice here, or click to select"}
                  </Text>
                  <Text style={styles.uploadSubtext}>
                    PDF or Image (PNG, JPG) • Max 10MB
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.documentUpload}>
                <Text style={styles.formLabel}>Sales Contract *</Text>
                <TouchableOpacity
                  style={styles.uploadButton}
                  onPress={() => {
                    Alert.alert(
                      "File Upload",
                      "File upload functionality will be implemented"
                    );
                    setApplicationForm({
                      ...applicationForm,
                      salesContractUploaded: true,
                    });
                  }}
                >
                  <MaterialCommunityIcons
                    name="cloud-upload"
                    size={24}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.uploadText}>
                    {applicationForm.salesContractUploaded
                      ? "Sales Contract Uploaded"
                      : "Drag & drop sales contract here, or click to select"}
                  </Text>
                  <Text style={styles.uploadSubtext}>
                    PDF or Image (PNG, JPG) • Max 10MB
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmitApplication}
            >
              <MaterialCommunityIcons name="send" size={20} color="white" />
              <Text style={styles.submitButtonText}>
                Submit Pool Guarantee Application
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  activeTabText: {
    color: colors.primary,
  },
  content: {
    padding: spacing.lg,
  },
  statsContainer: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: "white",
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontWeight: "500",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  statSubtext: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  section: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  sectionHeaderWithButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: spacing.md,
  },
  centeredButtonContainer: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  sectionHeaderCentered: {
    alignItems: "center",
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  guaranteeStatsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  guaranteeStatItem: {
    alignItems: "center",
    flex: 1,
  },
  guaranteeStatValue: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  guaranteeStatLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
  },
  emptyMessage: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    fontStyle: "italic",
    paddingVertical: spacing.lg,
  },
  roleSelection: {
    flexDirection: "row",
    gap: spacing.md,
  },
  roleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    gap: spacing.xs,
  },
  roleButtonActive: {
    backgroundColor: colors.primary,
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
  roleButtonTextActive: {
    color: "white",
  },
  applyButton: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 12,
    flexShrink: 1,
    gap: spacing.xs,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 180,
  },
  applyButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  workflowContainer: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  workflowTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  workflowDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: "white",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  formSection: {
    marginBottom: spacing.lg,
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.md,
  },
  formRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  formField: {
    marginBottom: spacing.md,
  },
  formFieldHalf: {
    flex: 1,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  formInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.text,
    backgroundColor: "white",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  documentUpload: {
    marginBottom: spacing.md,
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: "dashed",
    borderRadius: 8,
    padding: spacing.lg,
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  uploadText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  uploadSubtext: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  submitButton: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.md,
    borderRadius: 8,
    gap: spacing.xs,
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  submitButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  draftCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  // Application tracking styles
  applicationsContainer: {
    marginTop: spacing.md,
  },
  applicationCard: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  applicationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  companyName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    marginLeft: spacing.sm,
  },
  statusText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  applicationDetails: {
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "500",
    flex: 1,
    textAlign: "right",
  },
  viewDetailsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.sm,
  },
  viewDetailsText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: "500",
    marginRight: spacing.xs,
  },
  emptyApplicationsState: {
    alignItems: "center",
    padding: spacing.xl,
    marginTop: spacing.lg,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "500",
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: "center",
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: "center",
    opacity: 0.7,
  },
});
