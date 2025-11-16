import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { palette } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import * as DocumentPicker from "expo-document-picker";

interface MarketplaceData {
  action: "buy" | "sell";
  invoiceData?: any;
  agreedAmount?: string;
  [key: string]: any;
}

interface Props {
  data: MarketplaceData;
  updateData: (newData: Partial<MarketplaceData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const InvoiceHandlingStep: React.FC<Props> = ({
  data,
  updateData,
  onNext,
  onBack,
}) => {
  const [selectedOption, setSelectedOption] = useState<
    "upload" | "create" | null
  >(null);
  const [invoiceFile, setInvoiceFile] = useState<any>(null);
  const [showCreateInvoice, setShowCreateInvoice] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleDocumentPick = async () => {
    try {
      setUploading(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/*"],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        setInvoiceFile({
          name: file.name,
          uri: file.uri,
          size: file.size,
          type: file.mimeType,
        });
        updateData({ invoiceData: file });
        Alert.alert("Success", "Invoice uploaded successfully!");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to upload invoice");
    } finally {
      setUploading(false);
    }
  };

  const handleCreateInvoice = () => {
    setSelectedOption("create");
    setShowCreateInvoice(true);
  };

  const handleInvoiceCreated = (invoiceData: any) => {
    updateData({ invoiceData });
    setShowCreateInvoice(false);
    setSelectedOption("create");
  };

  const handleNext = () => {
    if (!selectedOption || (!invoiceFile && !data.invoiceData)) {
      Alert.alert(
        "Required",
        "Please upload an existing invoice or create a new one"
      );
      return;
    }
    onNext();
  };

  const handleSkipInvoice = () => {
    Alert.alert(
      "Skip Invoice",
      "Are you sure you want to continue without an invoice? This may affect the transaction record.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          onPress: () => {
            updateData({ invoiceData: null });
            onNext();
          },
        },
      ]
    );
  };

  if (showCreateInvoice) {
    // For now, just simulate invoice creation
    // In future, you can integrate with the actual CreateInvoiceScreen
    return (
      <Screen>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setShowCreateInvoice(false)}
            >
              <MaterialCommunityIcons
                name="arrow-left"
                size={24}
                color={palette.primaryBlue}
              />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <Text variant="title">Create Invoice</Text>
              <Text color={palette.neutralMid} style={styles.subtitle}>
                Creating invoice for {data.agreedAmount} {data.currency}
              </Text>
            </View>
          </View>

          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              gap: spacing.lg,
            }}
          >
            <MaterialCommunityIcons
              name="file-document-plus-outline"
              size={64}
              color={palette.primaryBlue}
            />
            <Text variant="subtitle">Invoice Creation</Text>
            <Text style={{ textAlign: "center", color: palette.neutralMid }}>
              This will integrate with the full invoice creation system
            </Text>
            <Button
              label="Create Invoice"
              onPress={() => {
                handleInvoiceCreated({
                  amount: data.agreedAmount,
                  currency: data.currency,
                  created: true,
                });
              }}
            />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <MaterialCommunityIcons
              name="arrow-left"
              size={24}
              color={palette.primaryBlue}
            />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text variant="title">Invoice Handling</Text>
            <Text color={palette.neutralMid} style={styles.subtitle}>
              Upload an existing invoice or create a new one for this
              transaction
            </Text>
          </View>
        </View>

        {/* Progress */}
        <View style={styles.progressContainer}>
          <Text style={styles.stepText}>Step 2 of 6</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: "33.33%" }]} />
          </View>
        </View>

        {/* Options */}
        <View style={styles.section}>
          <Text variant="subtitle" style={styles.sectionTitle}>
            Choose an Option
          </Text>

          {/* Upload Invoice */}
          <TouchableOpacity
            style={[
              styles.optionCard,
              selectedOption === "upload" && styles.selectedOption,
            ]}
            onPress={() => setSelectedOption("upload")}
          >
            <View style={styles.optionHeader}>
              <MaterialCommunityIcons
                name="file-upload-outline"
                size={32}
                color={palette.primaryBlue}
              />
              <Text variant="subtitle">Upload Existing Invoice</Text>
            </View>
            <Text color={palette.neutralMid} style={styles.optionDescription}>
              Upload a PDF or image of an existing invoice for this transaction
            </Text>

            {selectedOption === "upload" && (
              <View style={styles.uploadSection}>
                <TouchableOpacity
                  style={styles.uploadArea}
                  onPress={handleDocumentPick}
                  disabled={uploading}
                >
                  <MaterialCommunityIcons
                    name="file-document-plus-outline"
                    size={32}
                    color={
                      invoiceFile ? palette.accentGreen : palette.neutralMid
                    }
                  />
                  <Text style={styles.uploadText}>
                    {uploading
                      ? "Uploading..."
                      : invoiceFile
                      ? invoiceFile.name
                      : "Tap to upload invoice (PDF, JPG, PNG)"}
                  </Text>
                  {invoiceFile && (
                    <Text style={styles.fileSize}>
                      {(invoiceFile.size / 1024 / 1024).toFixed(2)} MB
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </TouchableOpacity>

          {/* Create Invoice */}
          <TouchableOpacity
            style={[
              styles.optionCard,
              selectedOption === "create" && styles.selectedOption,
            ]}
            onPress={handleCreateInvoice}
          >
            <View style={styles.optionHeader}>
              <MaterialCommunityIcons
                name="file-plus-outline"
                size={32}
                color={palette.accentGreen}
              />
              <Text variant="subtitle">Create New Invoice</Text>
            </View>
            <Text color={palette.neutralMid} style={styles.optionDescription}>
              Create a professional invoice using our built-in invoice generator
            </Text>

            {data.invoiceData && selectedOption === "create" && (
              <View style={styles.createdIndicator}>
                <MaterialCommunityIcons
                  name="check-circle"
                  size={20}
                  color={palette.accentGreen}
                />
                <Text style={styles.createdText}>
                  Invoice created successfully
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Transaction Summary */}
        <View style={styles.summaryCard}>
          <Text variant="subtitle" style={styles.summaryTitle}>
            Transaction Summary
          </Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Product:</Text>
            <Text style={styles.summaryValue}>
              {data.productDescription || "N/A"}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Amount:</Text>
            <Text style={styles.summaryValue}>
              {data.agreedAmount} {data.currency}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Your Role:</Text>
            <Text style={styles.summaryValue}>
              {data.action === "buy" ? "Buyer" : "Seller"}
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            label="Back"
            variant="outline"
            onPress={onBack}
            style={styles.backButtonAction}
          />
          <Button
            label="Skip"
            onPress={handleSkipInvoice}
            style={styles.skipButton}
          />
          <Button
            label="Continue"
            onPress={handleNext}
            style={styles.continueButton}
          />
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
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  backButton: {
    padding: spacing.sm,
    marginTop: -spacing.sm,
  },
  headerContent: {
    flex: 1,
    gap: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  progressContainer: {
    marginBottom: spacing.lg,
  },
  stepText: {
    fontSize: 14,
    color: palette.neutralMid,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  progressBar: {
    height: 4,
    backgroundColor: palette.neutralLight,
    borderRadius: 2,
  },
  progressFill: {
    height: "100%",
    backgroundColor: palette.primaryBlue,
    borderRadius: 2,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    marginBottom: spacing.md,
  },
  optionCard: {
    backgroundColor: palette.white,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: palette.neutralLight,
  },
  selectedOption: {
    borderColor: palette.primaryBlue,
    backgroundColor: palette.primaryBlue + "05",
  },
  optionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  optionDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  uploadSection: {
    marginTop: spacing.md,
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: palette.neutralLight,
    borderStyle: "dashed",
    borderRadius: 8,
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.sm,
  },
  uploadText: {
    fontSize: 14,
    color: palette.neutralMid,
    textAlign: "center",
  },
  fileSize: {
    fontSize: 12,
    color: palette.neutralMid,
  },
  createdIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: palette.accentGreen + "10",
    borderRadius: 8,
  },
  createdText: {
    fontSize: 14,
    color: palette.accentGreen,
    fontWeight: "600",
  },
  summaryCard: {
    backgroundColor: palette.neutralLight,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  summaryTitle: {
    marginBottom: spacing.md,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  summaryLabel: {
    fontSize: 14,
    color: palette.neutralMid,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.neutralDark,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
    marginBottom: spacing.xxl,
  },
  backButtonAction: {
    flex: 1,
  },
  skipButton: {
    flex: 1,
  },
  continueButton: {
    flex: 2,
  },
});
