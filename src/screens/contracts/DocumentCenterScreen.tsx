import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import React, { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

interface DocumentForm {
  title: string;
  type: string;
  reference: string;
  notes: string;
}

interface StoredDocument {
  id: string;
  title: string;
  type: string;
  reference: string;
  status: "Pending" | "Verified" | "Rejected";
  uploadedAt: string;
}

const initialDocuments: StoredDocument[] = [
  {
    id: "doc-1",
    title: "Commercial Invoice",
    type: "Invoice",
    reference: "CT-1209",
    status: "Verified",
    uploadedAt: "Oct 24, 2025",
  },
  {
    id: "doc-2",
    title: "Bill of Lading",
    type: "Shipping",
    reference: "CT-1188",
    status: "Pending",
    uploadedAt: "Oct 21, 2025",
  },
];

export const DocumentCenterScreen: React.FC = () => {
  const navigation = useNavigation();
  const [documents, setDocuments] = useState(initialDocuments);

  const { control, handleSubmit, reset, watch } = useForm<DocumentForm>({
    defaultValues: {
      title: "",
      type: "",
      reference: "",
      notes: "",
    },
  });

  const pendingCount = useMemo(
    () => documents.filter((doc) => doc.status === "Pending").length,
    [documents]
  );

  const onSubmit = handleSubmit((values) => {
    const now = new Date();
    const nextDocument: StoredDocument = {
      id: `doc-${Date.now()}`,
      title: values.title.trim(),
      type: values.type.trim() || "General",
      reference: values.reference.trim() || "N/A",
      status: "Pending",
      uploadedAt: now.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    };

    setDocuments((prev) => [nextDocument, ...prev]);
    reset();
    Alert.alert(
      "Document Submitted",
      "We will notify you once verification completes."
    );
  });

  return (
    <Screen>
      <StatusBar style="dark" />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Document Center</Text>
          <Text style={styles.subtitle}>
            {documents.length} total • {pendingCount} awaiting review
          </Text>
        </View>

        {/* Upload Document Form */}
        <View style={styles.section}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons
                name="cloud-upload"
                size={24}
                color={colors.primary}
              />
              <Text style={styles.cardTitle}>Upload Supporting Document</Text>
            </View>

            <Controller
              control={control}
              name="title"
              rules={{ required: "Document title is required" }}
              render={({ field: { onChange, value }, fieldState }) => (
                <Input
                  label="Document Title"
                  value={value}
                  onChangeText={onChange}
                  placeholder="e.g. Certificate of Origin"
                  error={fieldState.error?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="type"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Document Type"
                  value={value}
                  onChangeText={onChange}
                  placeholder="Invoice, Shipping, Compliance..."
                />
              )}
            />

            <Controller
              control={control}
              name="reference"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Contract Reference"
                  value={value}
                  onChangeText={onChange}
                  placeholder="Link to contract or trade ID"
                />
              )}
            />

            <Controller
              control={control}
              name="notes"
              render={({ field: { onChange, value } }) => (
                <Input
                  label="Notes"
                  value={value}
                  onChangeText={onChange}
                  placeholder="Add any verification context"
                  multiline
                  numberOfLines={3}
                  helperText={`${value.length}/200 characters`}
                  maxLength={200}
                />
              )}
            />

            <TouchableOpacity
              style={[
                styles.uploadButton,
                !watch("title").trim() && styles.uploadButtonDisabled,
              ]}
              onPress={onSubmit}
              disabled={!watch("title").trim()}
            >
              <MaterialCommunityIcons name="upload" size={20} color="white" />
              <Text style={styles.uploadButtonText}>
                Submit for Verification
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Documents */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Documents</Text>
          {documents.map((doc) => (
            <View key={doc.id} style={styles.documentCard}>
              <View style={styles.documentHeader}>
                <View style={styles.documentIcon}>
                  <MaterialCommunityIcons
                    name="file-document"
                    size={24}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.documentInfo}>
                  <Text style={styles.documentTitle}>{doc.title}</Text>
                  <Text style={styles.documentMeta}>
                    {doc.type} • Ref {doc.reference}
                  </Text>
                </View>
                <View style={styles.documentStatus}>
                  <View
                    style={[
                      styles.statusBadge,
                      doc.status === "Verified" && styles.statusVerified,
                      doc.status === "Rejected" && styles.statusRejected,
                      doc.status === "Pending" && styles.statusPending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        doc.status === "Verified" && styles.statusTextVerified,
                        doc.status === "Rejected" && styles.statusTextRejected,
                        doc.status === "Pending" && styles.statusTextPending,
                      ]}
                    >
                      {doc.status}
                    </Text>
                  </View>
                  <Text style={styles.documentDate}>{doc.uploadedAt}</Text>
                </View>
              </View>
            </View>
          ))}

          {documents.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="file-outline"
                size={48}
                color={colors.textSecondary}
              />
              <Text style={styles.emptyStateText}>
                No documents uploaded yet
              </Text>
              <Text style={styles.emptyStateSubtext}>
                Upload your first document to get started
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
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
    paddingTop: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  section: {
    margin: spacing.lg,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: spacing.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.text,
    marginLeft: spacing.md,
  },
  uploadButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.md,
  },
  uploadButtonDisabled: {
    backgroundColor: colors.border,
  },
  uploadButtonText: {
    color: "white",
    fontWeight: "600",
    marginLeft: spacing.sm,
  },
  documentCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  documentHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  documentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.md,
  },
  documentInfo: {
    flex: 1,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginBottom: spacing.xs,
  },
  documentMeta: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  documentStatus: {
    alignItems: "flex-end",
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 16,
    marginBottom: spacing.xs,
  },
  statusVerified: {
    backgroundColor: colors.success + "20",
  },
  statusRejected: {
    backgroundColor: colors.error + "20",
  },
  statusPending: {
    backgroundColor: colors.warning + "20",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  statusTextVerified: {
    color: colors.success,
  },
  statusTextRejected: {
    color: colors.error,
  },
  statusTextPending: {
    color: colors.warning,
  },
  documentDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  emptyState: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: spacing.xxl,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.text,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
