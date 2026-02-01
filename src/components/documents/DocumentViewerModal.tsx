import React, { useMemo } from "react";
import { Modal, View, StyleSheet, TouchableOpacity } from "react-native";
import { WebView } from "react-native-webview";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text } from "@/components/ui/Text";
import { palette } from "@/theme/colors";
import { spacing } from "@/theme/spacing";

interface DocumentViewerModalProps {
  visible: boolean;
  url: string | null;
  title?: string;
  onClose: () => void;
}

const resolveUrl = (rawUrl: string | null): string | null => {
  if (!rawUrl) return null;
  if (rawUrl.startsWith("ipfs://")) {
    const hash = rawUrl.replace("ipfs://", "");
    return `https://gateway.pinata.cloud/ipfs/${hash}`;
  }
  return rawUrl;
};

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  visible,
  url,
  title = "Document Viewer",
  onClose,
}) => {
  const resolvedUrl = useMemo(() => resolveUrl(url), [url]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialCommunityIcons
              name="close"
              size={22}
              color={palette.neutralDark}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.content}>
          {resolvedUrl ? (
            <WebView
              source={{ uri: resolvedUrl }}
              style={styles.webview}
              startInLoadingState
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No document URL</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.surface,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: palette.white,
    borderBottomWidth: 1,
    borderBottomColor: palette.neutralLighter,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: palette.neutralDark,
  },
  closeButton: {
    padding: spacing.xs,
  },
  content: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: palette.surface,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: palette.neutralMid,
  },
});
