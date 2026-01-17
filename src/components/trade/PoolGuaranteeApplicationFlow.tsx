import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

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
  proformaInvoice: any;
  salesContract: any;
}

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  stepTitles: string[];
}

const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  totalSteps,
  stepTitles,
}) => {
  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressHeader}>
        <Text style={styles.progressTitle}>Application Progress</Text>
        <Text style={styles.progressSubtitle}>
          Step {currentStep} of {totalSteps}
        </Text>
      </View>

      <View style={styles.stepsContainer}>
        {Array.from({ length: totalSteps }).map((_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;

          return (
            <React.Fragment key={stepNumber}>
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.stepCircle,
                    isCompleted && styles.stepCircleCompleted,
                    isCurrent && styles.stepCircleCurrent,
                  ]}
                >
                  {isCompleted ? (
                    <MaterialCommunityIcons
                      name="check"
                      size={16}
                      color="white"
                    />
                  ) : (
                    <Text
                      style={[
                        styles.stepNumber,
                        (isCompleted || isCurrent) && styles.stepNumberActive,
                      ]}
                    >
                      {stepNumber}
                    </Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    (isCompleted || isCurrent) && styles.stepLabelActive,
                  ]}
                  numberOfLines={2}
                >
                  {stepTitles[index]}
                </Text>
              </View>
              {index < totalSteps - 1 && (
                <View
                  style={[
                    styles.stepConnector,
                    isCompleted && styles.stepConnectorCompleted,
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
};

interface PoolGuaranteeApplicationFlowProps {
  onClose: () => void;
  onSubmit: (formData: PoolGuaranteeForm) => void;
  onDocumentPick: (type: "proformaInvoice" | "salesContract") => void;
  onImagePick: (type: "proformaInvoice" | "salesContract") => void;
  initialFormData?: PoolGuaranteeForm;
}

const CACHE_KEY = "@pool_guarantee_draft";

export const PoolGuaranteeApplicationFlow: React.FC<
  PoolGuaranteeApplicationFlowProps
> = ({ onClose, onSubmit, onDocumentPick, onImagePick, initialFormData }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<PoolGuaranteeForm>(
    initialFormData || {
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
      proformaInvoice: null,
      salesContract: null,
    }
  );

  const stepTitles = [
    "Company Info",
    "Trade Details",
    "Financial Info",
    "Documents",
    "Review",
  ];

  // Load cached draft on mount
  useEffect(() => {
    loadDraft();
  }, []);

  // Auto-save draft whenever formData changes
  useEffect(() => {
    saveDraft();
  }, [formData]);

  const loadDraft = async () => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsedData = JSON.parse(cached);
        setFormData(parsedData.formData);
        setCurrentStep(parsedData.currentStep || 1);
      }
    } catch (error) {
      console.log("Error loading draft:", error);
    }
  };

  const saveDraft = async () => {
    try {
      await AsyncStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ formData, currentStep })
      );
    } catch (error) {
      console.log("Error saving draft:", error);
    }
  };

  const clearDraft = async () => {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
    } catch (error) {
      console.log("Error clearing draft:", error);
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (
          !formData.companyName ||
          !formData.registrationNumber ||
          !formData.contactPerson ||
          !formData.email
        ) {
          Alert.alert(
            "Missing Information",
            "Please fill in all required company information fields."
          );
          return false;
        }
        break;
      case 2:
        if (!formData.tradeDescription || !formData.guaranteeAmount) {
          Alert.alert(
            "Missing Information",
            "Please provide trade description and guarantee amount."
          );
          return false;
        }
        break;
      case 3:
        if (!formData.collateralDescription || !formData.sellerWalletAddress) {
          Alert.alert(
            "Missing Information",
            "Please provide collateral details and seller wallet address."
          );
          return false;
        }
        break;
      case 4:
        if (!formData.proformaInvoice || !formData.salesContract) {
          Alert.alert(
            "Missing Documents",
            "Please upload both Proforma Invoice and Sales Contract."
          );
          return false;
        }
        break;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 5));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = () => {
    if (validateStep(4)) {
      clearDraft();
      onSubmit(formData);
    }
  };

  const handleClose = () => {
    Alert.alert(
      "Save Draft?",
      "Your progress has been automatically saved. You can continue later.",
      [
        {
          text: "Discard Draft",
          style: "destructive",
          onPress: () => {
            clearDraft();
            onClose();
          },
        },
        {
          text: "Keep Draft",
          onPress: onClose,
        },
      ]
    );
  };

  const updateField = (field: keyof PoolGuaranteeForm, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Company Information</Text>
            <Text style={styles.stepDescription}>
              Provide your company details for verification
            </Text>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Company Name *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.companyName}
                onChangeText={(text) => updateField("companyName", text)}
                placeholder="ABC Trading Ltd."
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Registration Number *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.registrationNumber}
                onChangeText={(text) => updateField("registrationNumber", text)}
                placeholder="12345678"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Country *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.country}
                onChangeText={(text) => updateField("country", text)}
                placeholder="United States"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Contact Person *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.contactPerson}
                onChangeText={(text) => updateField("contactPerson", text)}
                placeholder="John Doe"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Email *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.email}
                onChangeText={(text) => updateField("email", text)}
                placeholder="contact@company.com"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Phone</Text>
              <TextInput
                style={styles.formInput}
                value={formData.phone}
                onChangeText={(text) => updateField("phone", text)}
                placeholder="+1 234 567 8900"
                keyboardType="phone-pad"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Trade Details</Text>
            <Text style={styles.stepDescription}>
              Describe the trade transaction
            </Text>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Trade Description *</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                value={formData.tradeDescription}
                onChangeText={(text) => updateField("tradeDescription", text)}
                placeholder="e.g., Import of 10,000 units of electronics from China"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Total Trade Value (USDC) *</Text>
              <TextInput
                style={styles.formInput}
                value={formData.totalTradeValue}
                onChangeText={(text) => updateField("totalTradeValue", text)}
                placeholder="100000"
                keyboardType="numeric"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>
                Guarantee Amount Requested (USDC) *
              </Text>
              <TextInput
                style={styles.formInput}
                value={formData.guaranteeAmount}
                onChangeText={(text) => updateField("guaranteeAmount", text)}
                placeholder="50000"
                keyboardType="numeric"
                placeholderTextColor={colors.textSecondary}
              />
              <Text style={styles.fieldHint}>
                Recommended: 30-70% of total trade value
              </Text>
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Financing Duration (days)</Text>
              <TextInput
                style={styles.formInput}
                value={formData.financingDuration}
                onChangeText={(text) => updateField("financingDuration", text)}
                placeholder="90"
                keyboardType="numeric"
                placeholderTextColor={colors.textSecondary}
              />
              <Text style={styles.fieldHint}>Typical range: 30-180 days</Text>
            </View>

            <View style={styles.infoCard}>
              <MaterialCommunityIcons
                name="information"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.infoCardText}>
                Issuance fee (1% of guarantee amount) will be payable after
                seller approval
              </Text>
            </View>
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Financial Information</Text>
            <Text style={styles.stepDescription}>
              Provide collateral and seller details
            </Text>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Collateral Description *</Text>
              <TextInput
                style={[styles.formInput, styles.textArea]}
                value={formData.collateralDescription}
                onChangeText={(text) =>
                  updateField("collateralDescription", text)
                }
                placeholder="e.g., 10,000 units of electronics (goods as collateral)"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Collateral Value (USDC)</Text>
              <TextInput
                style={styles.formInput}
                value={formData.collateralValue}
                onChangeText={(text) => updateField("collateralValue", text)}
                placeholder="100000"
                keyboardType="numeric"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>
                Seller/Beneficiary Wallet Address *
              </Text>
              <TextInput
                style={styles.formInput}
                value={formData.sellerWalletAddress}
                onChangeText={(text) =>
                  updateField("sellerWalletAddress", text)
                }
                placeholder="0x..."
                autoCapitalize="none"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Contract Number</Text>
              <TextInput
                style={styles.formInput}
                value={formData.contractNumber}
                onChangeText={(text) => updateField("contractNumber", text)}
                placeholder="SC-2025-001"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>Contract Date</Text>
              <TextInput
                style={styles.formInput}
                value={formData.contractDate}
                onChangeText={(text) => updateField("contractDate", text)}
                placeholder="MM/DD/YYYY"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Required Documents</Text>
            <Text style={styles.stepDescription}>
              Upload proforma invoice and sales contract
            </Text>

            <View style={styles.documentSection}>
              <Text style={styles.documentLabel}>Proforma Invoice *</Text>
              {formData.proformaInvoice ? (
                <View style={styles.uploadedFile}>
                  <MaterialCommunityIcons
                    name="file-check"
                    size={24}
                    color={colors.primary}
                  />
                  <Text style={styles.uploadedFileName}>
                    {formData.proformaInvoice.name}
                  </Text>
                  <TouchableOpacity
                    onPress={() => updateField("proformaInvoice", null)}
                  >
                    <MaterialCommunityIcons
                      name="close"
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.uploadButtons}>
                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={() => onDocumentPick("proformaInvoice")}
                  >
                    <MaterialCommunityIcons
                      name="file-upload"
                      size={24}
                      color={colors.primary}
                    />
                    <Text style={styles.uploadButtonText}>Choose Document</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={() => onImagePick("proformaInvoice")}
                  >
                    <MaterialCommunityIcons
                      name="camera"
                      size={24}
                      color={colors.primary}
                    />
                    <Text style={styles.uploadButtonText}>Take Photo</Text>
                  </TouchableOpacity>
                </View>
              )}
              <Text style={styles.uploadHint}>
                PDF or Image (PNG, JPG) • Max 10MB
              </Text>
            </View>

            <View style={styles.documentSection}>
              <Text style={styles.documentLabel}>Sales Contract *</Text>
              {formData.salesContract ? (
                <View style={styles.uploadedFile}>
                  <MaterialCommunityIcons
                    name="file-check"
                    size={24}
                    color={colors.primary}
                  />
                  <Text style={styles.uploadedFileName}>
                    {formData.salesContract.name}
                  </Text>
                  <TouchableOpacity
                    onPress={() => updateField("salesContract", null)}
                  >
                    <MaterialCommunityIcons
                      name="close"
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.uploadButtons}>
                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={() => onDocumentPick("salesContract")}
                  >
                    <MaterialCommunityIcons
                      name="file-upload"
                      size={24}
                      color={colors.primary}
                    />
                    <Text style={styles.uploadButtonText}>Choose Document</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={() => onImagePick("salesContract")}
                  >
                    <MaterialCommunityIcons
                      name="camera"
                      size={24}
                      color={colors.primary}
                    />
                    <Text style={styles.uploadButtonText}>Take Photo</Text>
                  </TouchableOpacity>
                </View>
              )}
              <Text style={styles.uploadHint}>
                PDF or Image (PNG, JPG) • Max 10MB
              </Text>
            </View>
          </View>
        );

      case 5:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Review & Submit</Text>
            <Text style={styles.stepDescription}>
              Review your application before submission
            </Text>

            <View style={styles.reviewSection}>
              <Text style={styles.reviewSectionTitle}>Company Information</Text>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Company:</Text>
                <Text style={styles.reviewValue}>{formData.companyName}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Registration:</Text>
                <Text style={styles.reviewValue}>
                  {formData.registrationNumber}
                </Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Contact:</Text>
                <Text style={styles.reviewValue}>{formData.contactPerson}</Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Email:</Text>
                <Text style={styles.reviewValue}>{formData.email}</Text>
              </View>
            </View>

            <View style={styles.reviewSection}>
              <Text style={styles.reviewSectionTitle}>Trade Details</Text>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Description:</Text>
                <Text style={styles.reviewValue} numberOfLines={3}>
                  {formData.tradeDescription}
                </Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Trade Value:</Text>
                <Text style={styles.reviewValue}>
                  {formData.totalTradeValue} USDC
                </Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Guarantee Amount:</Text>
                <Text style={[styles.reviewValue, styles.highlightValue]}>
                  {formData.guaranteeAmount} USDC
                </Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Duration:</Text>
                <Text style={styles.reviewValue}>
                  {formData.financingDuration || "90"} days
                </Text>
              </View>
            </View>

            <View style={styles.reviewSection}>
              <Text style={styles.reviewSectionTitle}>Collateral & Seller</Text>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Collateral:</Text>
                <Text style={styles.reviewValue} numberOfLines={2}>
                  {formData.collateralDescription}
                </Text>
              </View>
              <View style={styles.reviewRow}>
                <Text style={styles.reviewLabel}>Seller Address:</Text>
                <Text
                  style={[styles.reviewValue, styles.addressValue]}
                  numberOfLines={1}
                >
                  {formData.sellerWalletAddress}
                </Text>
              </View>
            </View>

            <View style={styles.reviewSection}>
              <Text style={styles.reviewSectionTitle}>Documents</Text>
              <View style={styles.reviewRow}>
                <MaterialCommunityIcons
                  name="file-check"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.reviewValue}>
                  {formData.proformaInvoice?.name || "No file"}
                </Text>
              </View>
              <View style={styles.reviewRow}>
                <MaterialCommunityIcons
                  name="file-check"
                  size={20}
                  color={colors.primary}
                />
                <Text style={styles.reviewValue}>
                  {formData.salesContract?.name || "No file"}
                </Text>
              </View>
            </View>

            <View style={styles.feeCard}>
              <MaterialCommunityIcons
                name="information"
                size={24}
                color={colors.primary}
              />
              <View style={styles.feeCardContent}>
                <Text style={styles.feeCardTitle}>Issuance Fee</Text>
                <Text style={styles.feeCardValue}>
                  {(parseFloat(formData.guaranteeAmount || "0") * 0.01).toFixed(
                    2
                  )}{" "}
                  USDC (1%)
                </Text>
                <Text style={styles.feeCardDescription}>
                  Payable after seller approves the draft certificate
                </Text>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Apply for Pool Guarantee</Text>
        <TouchableOpacity onPress={handleClose}>
          <MaterialCommunityIcons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <StepIndicator
        currentStep={currentStep}
        totalSteps={5}
        stepTitles={stepTitles}
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {renderStepContent()}
      </ScrollView>

      <View style={styles.footer}>
        {currentStep > 1 && (
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handlePrevious}
          >
            <MaterialCommunityIcons
              name="chevron-left"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.secondaryButtonText}>Previous</Text>
          </TouchableOpacity>
        )}

        {currentStep < 5 ? (
          <TouchableOpacity
            style={[styles.primaryButton, currentStep === 1 && { flex: 1 }]}
            onPress={handleNext}
          >
            <Text style={styles.primaryButtonText}>Next</Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color="white"
            />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.primaryButton, { flex: 1 }]}
            onPress={handleSubmit}
          >
            <MaterialCommunityIcons name="send" size={20} color="white" />
            <Text style={styles.primaryButtonText}>Submit Application</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  progressContainer: {
    backgroundColor: "white",
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
  },
  progressSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  stepsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepItem: {
    alignItems: "center",
    flex: 1,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  stepCircleCompleted: {
    backgroundColor: colors.primary,
  },
  stepCircleCurrent: {
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: "#E0E7FF",
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  stepNumberActive: {
    color: "white",
  },
  stepLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: "center",
  },
  stepLabelActive: {
    color: colors.text,
    fontWeight: "600",
  },
  stepConnector: {
    height: 2,
    flex: 0.3,
    backgroundColor: colors.border,
    marginBottom: spacing.xl,
  },
  stepConnectorCompleted: {
    backgroundColor: colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  stepContent: {
    padding: spacing.lg,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  stepDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  formField: {
    marginBottom: spacing.lg,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
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
    height: 100,
    paddingTop: spacing.sm,
  },
  fieldHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: "#F0F9FF",
    borderRadius: 8,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  infoCardText: {
    flex: 1,
    fontSize: 13,
    color: colors.primary,
    lineHeight: 18,
  },
  documentSection: {
    marginBottom: spacing.xl,
  },
  documentLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  uploadButtons: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  uploadButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: "center",
    backgroundColor: "white",
  },
  uploadButtonText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: "500",
    marginTop: spacing.xs,
  },
  uploadedFile: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  uploadedFileName: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  uploadHint: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
  },
  reviewSection: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reviewSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.md,
  },
  reviewRow: {
    flexDirection: "row",
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  reviewLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 0.4,
  },
  reviewValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "500",
    flex: 0.6,
  },
  highlightValue: {
    color: colors.primary,
    fontWeight: "700",
  },
  addressValue: {
    fontSize: 12,
    fontFamily: "monospace",
  },
  feeCard: {
    flexDirection: "row",
    backgroundColor: "#F5F3FF",
    borderRadius: 12,
    padding: spacing.lg,
    gap: spacing.md,
    marginTop: spacing.md,
  },
  feeCardContent: {
    flex: 1,
  },
  feeCardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs / 2,
  },
  feeCardValue: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  feeCardDescription: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  footer: {
    flexDirection: "row",
    padding: spacing.lg,
    backgroundColor: "white",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  primaryButton: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  primaryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "600",
  },
});
