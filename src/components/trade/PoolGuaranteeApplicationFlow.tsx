import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
  Platform,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as WebBrowser from "expo-web-browser";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { uploadToIPFS } from "@/config/ipfs";

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
  proformaInvoiceIpfs?: { hash: string; url: string };
  salesContractIpfs?: { hash: string; url: string };
}

interface StoredDocument {
  id: string;
  title: string;
  fileName: string;
  fileUri: string;
  ipfsHash: string;
  ipfsUrl: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
}

const DOCUMENTS_STORAGE_KEY = "@stored_documents";

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
  initialFormData?: PoolGuaranteeForm;
}

const CACHE_KEY = "@pool_guarantee_draft";

export const PoolGuaranteeApplicationFlow: React.FC<
  PoolGuaranteeApplicationFlowProps
> = ({ onClose, onSubmit, initialFormData }) => {
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
    },
  );

  const [storedDocuments, setStoredDocuments] = useState<StoredDocument[]>([]);
  const [showDocumentSelector, setShowDocumentSelector] = useState(false);
  const [activeDocumentType, setActiveDocumentType] = useState<
    "proformaInvoice" | "salesContract" | null
  >(null);
  const [isUploading, setIsUploading] = useState(false);

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
    loadStoredDocuments();
  }, []);

  // Auto-save draft whenever formData changes
  useEffect(() => {
    saveDraft();
  }, [formData]);

  const loadStoredDocuments = async () => {
    try {
      const stored = await AsyncStorage.getItem(DOCUMENTS_STORAGE_KEY);
      if (stored) {
        setStoredDocuments(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Failed to load stored documents:", error);
    }
  };

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
        JSON.stringify({ formData, currentStep }),
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
            "Please fill in all required company information fields.",
          );
          return false;
        }
        break;
      case 2:
        if (!formData.tradeDescription || !formData.guaranteeAmount) {
          Alert.alert(
            "Missing Information",
            "Please provide trade description and guarantee amount.",
          );
          return false;
        }
        break;
      case 3:
        if (!formData.collateralDescription || !formData.sellerWalletAddress) {
          Alert.alert(
            "Missing Information",
            "Please provide collateral details and seller wallet address.",
          );
          return false;
        }
        break;
      case 4:
        if (!formData.proformaInvoice || !formData.salesContract) {
          Alert.alert(
            "Missing Documents",
            "Please upload both Proforma Invoice and Sales Contract.",
          );
          return false;
        }
        if (!formData.proformaInvoiceIpfs || !formData.salesContractIpfs) {
          Alert.alert(
            "Upload Required",
            "Documents must be uploaded to IPFS. Please upload or select documents with IPFS links.",
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
      ],
    );
  };

  const updateField = (field: keyof PoolGuaranteeForm, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Document upload and selection functions
  const handleNewDocumentUpload = async (
    type: "proformaInvoice" | "salesContract",
  ) => {
    setActiveDocumentType(type);
    Alert.alert("Upload Document", "Choose upload method", [
      {
        text: "Choose File",
        onPress: () => pickDocument(type),
      },
      {
        text: "Take Photo",
        onPress: () => pickImage(type),
      },
      {
        text: "Cancel",
        style: "cancel",
      },
    ]);
  };

  const pickDocument = async (type: "proformaInvoice" | "salesContract") => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        await uploadDocumentToIPFS(type, {
          name: asset.name,
          uri: asset.uri,
          size: asset.size || 0,
          mimeType: asset.mimeType || "application/octet-stream",
        });
      }
    } catch (error) {
      console.error("Document picker error:", error);
      Alert.alert("Error", "Failed to pick document");
    }
  };

  const pickImage = async (type: "proformaInvoice" | "salesContract") => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "Please grant camera roll permissions to upload images.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        await uploadDocumentToIPFS(type, {
          name: `image_${Date.now()}.jpg`,
          uri: asset.uri,
          size: asset.fileSize || 0,
          mimeType: "image/jpeg",
        });
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const uploadDocumentToIPFS = async (
    type: "proformaInvoice" | "salesContract",
    file: { name: string; uri: string; size: number; mimeType: string },
  ) => {
    setIsUploading(true);
    try {
      // Use original URI from picker
      const uploadUri = file.uri;

      // Upload to IPFS
      const { ipfsHash, ipfsUrl } = await uploadToIPFS(
        uploadUri,
        file.name,
        file.mimeType,
      );

      // Create document object for storage
      const newDoc: StoredDocument = {
        id: `doc_${Date.now()}`,
        title: type === 'proformaInvoice' ? 'Proforma Invoice' : 'Sales Contract',
        fileName: file.name,
        fileUri: uploadUri,
        ipfsHash,
        ipfsUrl,
        fileType: file.mimeType,
        fileSize: file.size,
        uploadedAt: new Date().toISOString(),
      };

      // Save to local stored documents
      const updatedStoredDocs = [newDoc, ...storedDocuments];
      setStoredDocuments(updatedStoredDocs);
      await AsyncStorage.setItem(DOCUMENTS_STORAGE_KEY, JSON.stringify(updatedStoredDocs));

      // Update form data with document info and IPFS data
      setFormData((prev) => ({
        ...prev,
        [type]: {
          name: file.name,
          uri: uploadUri,
          size: file.size,
          mimeType: file.mimeType,
        },
        [`${type}Ipfs`]: {
          hash: ipfsHash,
          url: ipfsUrl,
        },
      }));

      Alert.alert(
        "Upload Successful",
        `Document uploaded to IPFS successfully!\n\nIPFS Hash: ${ipfsHash}`,
      );
    } catch (error: any) {
      console.error("IPFS upload error:", error);
      Alert.alert(
        "Upload Failed",
        `Failed to upload document to IPFS: ${error.message || 'Please try again.'}`,
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectExistingDocument = (
    type: "proformaInvoice" | "salesContract",
  ) => {
    setActiveDocumentType(type);
    setShowDocumentSelector(true);
  };

  const handleDocumentSelected = (doc: StoredDocument) => {
    if (!activeDocumentType) return;

    // Use existing document's IPFS data
    setFormData((prev) => ({
      ...prev,
      [activeDocumentType]: {
        name: doc.fileName,
        uri: doc.fileUri,
        size: doc.fileSize,
        mimeType: doc.fileType,
      },
      [`${activeDocumentType}Ipfs`]: {
        hash: doc.ipfsHash,
        url: doc.ipfsUrl,
      },
    }));

    setShowDocumentSelector(false);
    setActiveDocumentType(null);
    Alert.alert(
      "Document Selected",
      `${doc.title} has been added to your application.`,
    );
  };

  const viewDocument = async (ipfsUrl: string) => {
    try {
      await WebBrowser.openBrowserAsync(ipfsUrl);
    } catch (error) {
      Alert.alert("Error", "Failed to open document");
    }
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
              Upload or select proforma invoice and sales contract
            </Text>

            {/* Proforma Invoice Section */}
            <View style={styles.documentSection}>
              <Text style={styles.documentLabel}>Proforma Invoice *</Text>
              {formData.proformaInvoice && formData.proformaInvoiceIpfs ? (
                <View style={styles.uploadedFile}>
                  <MaterialCommunityIcons
                    name="file-check"
                    size={24}
                    color={colors.success}
                  />
                  <View style={styles.uploadedFileInfo}>
                    <Text style={styles.uploadedFileName}>
                      {formData.proformaInvoice.name}
                    </Text>
                    <Text style={styles.uploadedFileHash} numberOfLines={1}>
                      IPFS: {formData.proformaInvoiceIpfs.hash}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      viewDocument(formData.proformaInvoiceIpfs!.url)
                    }
                    style={styles.viewDocButton}
                  >
                    <MaterialCommunityIcons
                      name="eye"
                      size={20}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      updateField("proformaInvoice", null);
                      updateField("proformaInvoiceIpfs", undefined);
                    }}
                  >
                    <MaterialCommunityIcons
                      name="close"
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.uploadOptionsContainer}>
                  <TouchableOpacity
                    style={styles.uploadOptionButton}
                    onPress={() => handleNewDocumentUpload("proformaInvoice")}
                    disabled={isUploading}
                  >
                    <MaterialCommunityIcons
                      name="cloud-upload"
                      size={32}
                      color={colors.primary}
                    />
                    <Text style={styles.uploadOptionTitle}>Upload New</Text>
                    <Text style={styles.uploadOptionDescription}>
                      Choose file or take photo
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.uploadOptionButton}
                    onPress={() =>
                      handleSelectExistingDocument("proformaInvoice")
                    }
                    disabled={isUploading}
                  >
                    <MaterialCommunityIcons
                      name="folder-open"
                      size={32}
                      color={colors.primary}
                    />
                    <Text style={styles.uploadOptionTitle}>
                      Select Existing
                    </Text>
                    <Text style={styles.uploadOptionDescription}>
                      From Document Center
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              <Text style={styles.uploadHint}>
                PDF or Image (PNG, JPG) • Max 10MB
              </Text>
            </View>

            {/* Sales Contract Section */}
            <View style={styles.documentSection}>
              <Text style={styles.documentLabel}>Sales Contract *</Text>
              {formData.salesContract && formData.salesContractIpfs ? (
                <View style={styles.uploadedFile}>
                  <MaterialCommunityIcons
                    name="file-check"
                    size={24}
                    color={colors.success}
                  />
                  <View style={styles.uploadedFileInfo}>
                    <Text style={styles.uploadedFileName}>
                      {formData.salesContract.name}
                    </Text>
                    <Text style={styles.uploadedFileHash} numberOfLines={1}>
                      IPFS: {formData.salesContractIpfs.hash}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      viewDocument(formData.salesContractIpfs!.url)
                    }
                    style={styles.viewDocButton}
                  >
                    <MaterialCommunityIcons
                      name="eye"
                      size={20}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      updateField("salesContract", null);
                      updateField("salesContractIpfs", undefined);
                    }}
                  >
                    <MaterialCommunityIcons
                      name="close"
                      size={20}
                      color={colors.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.uploadOptionsContainer}>
                  <TouchableOpacity
                    style={styles.uploadOptionButton}
                    onPress={() => handleNewDocumentUpload("salesContract")}
                    disabled={isUploading}
                  >
                    <MaterialCommunityIcons
                      name="cloud-upload"
                      size={32}
                      color={colors.primary}
                    />
                    <Text style={styles.uploadOptionTitle}>Upload New</Text>
                    <Text style={styles.uploadOptionDescription}>
                      Choose file or take photo
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.uploadOptionButton}
                    onPress={() =>
                      handleSelectExistingDocument("salesContract")
                    }
                    disabled={isUploading}
                  >
                    <MaterialCommunityIcons
                      name="folder-open"
                      size={32}
                      color={colors.primary}
                    />
                    <Text style={styles.uploadOptionTitle}>
                      Select Existing
                    </Text>
                    <Text style={styles.uploadOptionDescription}>
                      From Document Center
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              <Text style={styles.uploadHint}>
                PDF or Image (PNG, JPG) • Max 10MB
              </Text>
            </View>

            {isUploading && (
              <View style={styles.uploadingIndicator}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.uploadingText}>Uploading to IPFS...</Text>
              </View>
            )}
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
              <View style={styles.reviewSectionHeader}>
                <Text style={styles.reviewSectionTitle}>
                  Company Information
                </Text>
                <TouchableOpacity onPress={() => setCurrentStep(1)}>
                  <MaterialCommunityIcons
                    name="pencil"
                    size={18}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              </View>
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
              <View style={styles.reviewSectionHeader}>
                <Text style={styles.reviewSectionTitle}>Trade Details</Text>
                <TouchableOpacity onPress={() => setCurrentStep(2)}>
                  <MaterialCommunityIcons
                    name="pencil"
                    size={18}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              </View>
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
              <View style={styles.reviewSectionHeader}>
                <Text style={styles.reviewSectionTitle}>
                  Collateral & Seller
                </Text>
                <TouchableOpacity onPress={() => setCurrentStep(3)}>
                  <MaterialCommunityIcons
                    name="pencil"
                    size={18}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              </View>
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
              <View style={styles.reviewSectionHeader}>
                <Text style={styles.reviewSectionTitle}>Documents</Text>
                <TouchableOpacity onPress={() => setCurrentStep(4)}>
                  <MaterialCommunityIcons
                    name="pencil"
                    size={18}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              </View>

              {/* Proforma Invoice */}
              <View style={styles.documentReviewCard}>
                <MaterialCommunityIcons
                  name="file-check"
                  size={24}
                  color={colors.success}
                />
                <View style={styles.documentReviewInfo}>
                  <Text style={styles.documentReviewName}>
                    {formData.proformaInvoice?.name || "No file"}
                  </Text>
                  {formData.proformaInvoiceIpfs && (
                    <Text style={styles.documentReviewHash} numberOfLines={1}>
                      IPFS: {formData.proformaInvoiceIpfs.hash}
                    </Text>
                  )}
                </View>
                {formData.proformaInvoiceIpfs && (
                  <TouchableOpacity
                    onPress={() =>
                      viewDocument(formData.proformaInvoiceIpfs!.url)
                    }
                    style={styles.viewDocIconButton}
                  >
                    <MaterialCommunityIcons
                      name="eye"
                      size={20}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                )}
              </View>

              {/* Sales Contract */}
              <View style={styles.documentReviewCard}>
                <MaterialCommunityIcons
                  name="file-check"
                  size={24}
                  color={colors.success}
                />
                <View style={styles.documentReviewInfo}>
                  <Text style={styles.documentReviewName}>
                    {formData.salesContract?.name || "No file"}
                  </Text>
                  {formData.salesContractIpfs && (
                    <Text style={styles.documentReviewHash} numberOfLines={1}>
                      IPFS: {formData.salesContractIpfs.hash}
                    </Text>
                  )}
                </View>
                {formData.salesContractIpfs && (
                  <TouchableOpacity
                    onPress={() =>
                      viewDocument(formData.salesContractIpfs!.url)
                    }
                    style={styles.viewDocIconButton}
                  >
                    <MaterialCommunityIcons
                      name="eye"
                      size={20}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                )}
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
                    2,
                  )}{" "}
                  USDC (1%)
                </Text>
                <Text style={styles.feeCardDescription}>
                  Payable after seller approves the draft certificate
                </Text>
              </View>
            </View>

            <View style={styles.submissionNotice}>
              <MaterialCommunityIcons
                name="shield-check"
                size={24}
                color={colors.success}
              />
              <Text style={styles.submissionNoticeText}>
                Your application will be submitted with IPFS document links for
                review by treasury financiers. The seller can immediately view
                documents using the eye icon.
              </Text>
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

      {/* Document Selector Modal */}
      <Modal
        visible={showDocumentSelector}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDocumentSelector(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Document</Text>
            <TouchableOpacity onPress={() => setShowDocumentSelector(false)}>
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={colors.text}
              />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {storedDocuments.length === 0 ? (
              <View style={styles.emptyDocuments}>
                <MaterialCommunityIcons
                  name="file-outline"
                  size={64}
                  color={colors.textSecondary}
                />
                <Text style={styles.emptyDocumentsText}>
                  No documents found
                </Text>
                <Text style={styles.emptyDocumentsSubtext}>
                  Upload documents in Document Center first
                </Text>
              </View>
            ) : (
              storedDocuments.map((doc) => (
                <TouchableOpacity
                  key={doc.id}
                  style={styles.documentSelectorCard}
                  onPress={() => handleDocumentSelected(doc)}
                >
                  <MaterialCommunityIcons
                    name={
                      doc.fileType.startsWith("image/")
                        ? "file-image"
                        : doc.fileType === "application/pdf"
                          ? "file-pdf-box"
                          : "file-document"
                    }
                    size={32}
                    color={colors.primary}
                  />
                  <View style={styles.documentSelectorInfo}>
                    <Text style={styles.documentSelectorTitle}>
                      {doc.title}
                    </Text>
                    <Text style={styles.documentSelectorFileName}>
                      {doc.fileName}
                    </Text>
                    <Text style={styles.documentSelectorHash} numberOfLines={1}>
                      IPFS: {doc.ipfsHash}
                    </Text>
                    <Text style={styles.documentSelectorDate}>
                      Uploaded: {doc.uploadedAt}
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={24}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
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
  uploadOptionsContainer: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  uploadOptionButton: {
    flex: 1,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: "center",
    backgroundColor: "white",
  },
  uploadOptionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.text,
    marginTop: spacing.sm,
  },
  uploadOptionDescription: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: spacing.xs / 2,
    textAlign: "center",
  },
  uploadedFileInfo: {
    flex: 1,
    marginLeft: spacing.sm,
  },
  uploadedFileHash: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: "monospace",
    marginTop: spacing.xs / 2,
  },
  viewDocButton: {
    padding: spacing.xs,
    marginRight: spacing.xs,
  },
  uploadingIndicator: {
    alignItems: "center",
    padding: spacing.xl,
    backgroundColor: "#F0F9FF",
    borderRadius: 12,
    marginTop: spacing.lg,
  },
  uploadingText: {
    fontSize: 14,
    color: colors.primary,
    marginTop: spacing.md,
    fontWeight: "500",
  },
  reviewSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  documentReviewCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  documentReviewInfo: {
    flex: 1,
  },
  documentReviewName: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
  },
  documentReviewHash: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: "monospace",
    marginTop: spacing.xs / 2,
  },
  viewDocIconButton: {
    padding: spacing.xs,
  },
  submissionNotice: {
    flexDirection: "row",
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  submissionNoticeText: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    lineHeight: 18,
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
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  emptyDocuments: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl * 2,
  },
  emptyDocumentsText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginTop: spacing.md,
  },
  emptyDocumentsSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  documentSelectorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  documentSelectorInfo: {
    flex: 1,
  },
  documentSelectorTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs / 2,
  },
  documentSelectorFileName: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.xs / 2,
  },
  documentSelectorHash: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: "monospace",
    marginBottom: spacing.xs / 2,
  },
  documentSelectorDate: {
    fontSize: 11,
    color: colors.textSecondary,
  },
});
