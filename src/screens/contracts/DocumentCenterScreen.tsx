import { Input } from "@/components/ui/Input";
import { Screen } from "@/components/ui/Screen";
import { Text } from "@/components/ui/Text";
import { colors } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import { uploadToIPFS } from "@/config/ipfs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import * as DocumentPicker from "expo-document-picker";
import * as Clipboard from "expo-clipboard";
import { Storage } from "@/utils/storage";
import React, { useState, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { DocumentViewerModal } from "@/components/documents/DocumentViewerModal";

interface DocumentForm {
  title: string;
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

export const DocumentCenterScreen: React.FC = () => {
  const navigation = useNavigation();
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{
    uri: string;
    name: string;
    type: string;
    size: number;
  } | null>(null);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerTitle, setViewerTitle] = useState<string | null>(null);

  const { control, handleSubmit, reset, watch } = useForm<DocumentForm>({
    defaultValues: {
      title: "",
    },
  });

  // Load documents from AsyncStorage on mount
  useEffect(() => {
    loadDocuments();
  }, []);

  // Save documents to AsyncStorage whenever they change
  useEffect(() => {
    if (documents.length > 0) {
      saveDocuments();
    }
  }, [documents]);

  const loadDocuments = async () => {
    try {
      const stored = await Storage.getJSON<StoredDocument[]>(
        DOCUMENTS_STORAGE_KEY,
      );
      if (stored) {
        setDocuments(stored);
      }
    } catch (error) {
      console.error("Failed to load documents:", error);
    }
  };

  const saveDocuments = async () => {
    try {
      await Storage.setJSON(DOCUMENTS_STORAGE_KEY, documents);
    } catch (error) {
      console.error("Failed to save documents:", error);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const file = result.assets[0];
        setSelectedFile({
          uri: file.uri,
          name: file.name,
          type: file.mimeType || "application/octet-stream",
          size: file.size || 0,
        });
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick document");
    }
  };

  const viewDocument = async (doc: StoredDocument) => {
    try {
      setViewerTitle(doc.title);
      setViewerUrl(doc.ipfsUrl);
      setViewerVisible(true);
    } catch (error) {
      Alert.alert("Error", "Failed to open document from IPFS");
    }
  };

  const copyShareLink = async (doc: StoredDocument) => {
    try {
      await Clipboard.setStringAsync(doc.ipfsUrl);
      Alert.alert(
        "Link Copied!",
        `The shareable IPFS link for "${doc.title}" has been copied to your clipboard. Anyone with this link can view the document.`,
      );
    } catch (error) {
      Alert.alert("Error", "Failed to copy link to clipboard");
    }
  };

  const deleteDocument = (doc: StoredDocument) => {
    Alert.alert(
      "Delete Document",
      `Are you sure you want to delete "${doc.title}"? This action cannot be undone.\n\nNote: The document will still exist on IPFS and can be accessed via the IPFS link.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const updatedDocs = documents.filter((d) => d.id !== doc.id);
            setDocuments(updatedDocs);
            await Storage.setJSON(DOCUMENTS_STORAGE_KEY, updatedDocs);
            Alert.alert(
              "Deleted",
              `"${doc.title}" has been removed from your documents.`,
            );
          },
        },
      ],
    );
  };

  const onSubmit = handleSubmit(async (values) => {
    if (!selectedFile) {
      Alert.alert("No File Selected", "Please select a document to upload");
      return;
    }

    setUploading(true);
    try {
      // Upload to IPFS
      const { ipfsHash, ipfsUrl } = await uploadToIPFS(
        selectedFile.uri,
        selectedFile.name,
        selectedFile.type,
      );

      const now = new Date();
      const nextDocument: StoredDocument = {
        id: `doc-${Date.now()}`,
        title: values.title.trim(),
        fileName: selectedFile.name,
        fileUri: selectedFile.uri,
        ipfsHash,
        ipfsUrl,
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
        uploadedAt: now.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      };

      setDocuments((prev) => [nextDocument, ...prev]);
      reset();
      setSelectedFile(null);
      Alert.alert(
        "Document Uploaded",
        `Your document has been uploaded to IPFS and is ready to use.\n\nIPFS: ${ipfsHash}`,
      );
    } catch (error) {
      Alert.alert(
        "Upload Failed",
        "Failed to upload document to IPFS. Please try again.",
      );
    } finally {
      setUploading(false);
    }
  });

  return (
    <Screen>
      <StatusBar style="dark" />
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Document Center</Text>
          <Text style={styles.subtitle}>
            {documents.length}{" "}
            {documents.length === 1 ? "document" : "documents"} stored
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
              <Text style={styles.cardTitle}>Upload Document</Text>
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

            {/* File Picker */}
            <View>
              <Text style={styles.inputLabel}>Select File</Text>
              <TouchableOpacity
                style={styles.filePickerButton}
                onPress={pickDocument}
              >
                <MaterialCommunityIcons
                  name={selectedFile ? "file-check" : "file-upload"}
                  size={24}
                  color={selectedFile ? colors.success : colors.textSecondary}
                />
                <View style={styles.filePickerContent}>
                  <Text style={styles.filePickerText}>
                    {selectedFile
                      ? selectedFile.name
                      : "Choose a file to upload"}
                  </Text>
                  {selectedFile && (
                    <Text style={styles.filePickerSize}>
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </Text>
                  )}
                </View>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={24}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.uploadButton,
                (!watch("title").trim() || !selectedFile || uploading) &&
                  styles.uploadButtonDisabled,
              ]}
              onPress={onSubmit}
              disabled={!watch("title").trim() || !selectedFile || uploading}
            >
              {uploading ? (
                <>
                  <ActivityIndicator size="small" color="white" />
                  <Text style={styles.uploadButtonText}>
                    Uploading to IPFS...
                  </Text>
                </>
              ) : (
                <>
                  <MaterialCommunityIcons
                    name="upload"
                    size={20}
                    color="white"
                  />
                  <Text style={styles.uploadButtonText}>Upload Document</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Stored Documents */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Documents</Text>
          {documents.map((doc) => (
            <View key={doc.id} style={styles.documentCard}>
              <TouchableOpacity
                style={styles.documentMainContent}
                onPress={() => viewDocument(doc)}
                activeOpacity={0.7}
              >
                <View style={styles.documentIcon}>
                  <MaterialCommunityIcons
                    name={
                      doc.fileType.startsWith("image/")
                        ? "file-image"
                        : doc.fileType === "application/pdf"
                          ? "file-pdf-box"
                          : "file-document"
                    }
                    size={24}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.documentInfo}>
                  <Text style={styles.documentTitle}>{doc.title}</Text>
                  <Text style={styles.documentMeta}>
                    {doc.fileName} • {(doc.fileSize / 1024).toFixed(1)} KB
                  </Text>
                  <Text style={styles.ipfsHash} numberOfLines={1}>
                    IPFS: {doc.ipfsHash}
                  </Text>
                </View>
                <View style={styles.documentStatus}>
                  <View style={styles.statusBadge}>
                    <MaterialCommunityIcons
                      name="eye"
                      size={16}
                      color={colors.primary}
                    />
                  </View>
                  <Text style={styles.documentDate}>{doc.uploadedAt}</Text>
                </View>
              </TouchableOpacity>

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={styles.shareButton}
                  onPress={() => copyShareLink(doc)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name="share-variant"
                    size={18}
                    color={colors.primary}
                  />
                  <Text style={styles.shareButtonText}>Copy Link</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => deleteDocument(doc)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name="delete-outline"
                    size={18}
                    color={colors.error}
                  />
                  <Text style={styles.deleteButtonText}>Delete</Text>
                </TouchableOpacity>
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
      <DocumentViewerModal
        visible={viewerVisible}
        url={viewerUrl}
        title={viewerTitle ?? "Document"}
        onClose={() => setViewerVisible(false)}
      />
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
  documentMainContent: {
    flexDirection: "row",
    alignItems: "center",
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
  ipfsHash: {
    fontSize: 12,
    color: colors.primary,
    marginTop: spacing.xs,
    fontFamily: "monospace",
  },
  documentStatus: {
    alignItems: "flex-end",
  },
  statusBadge: {
    marginBottom: spacing.xs,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.text,
    marginBottom: spacing.sm,
  },
  filePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    gap: spacing.md,
  },
  filePickerContent: {
    flex: 1,
  },
  filePickerText: {
    fontSize: 15,
    color: colors.text,
    marginBottom: 2,
  },
  filePickerSize: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  documentDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  actionButtons: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  shareButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary + "10",
    borderRadius: 8,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.primary,
  },
  deleteButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.error + "10",
    borderRadius: 8,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.error,
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
