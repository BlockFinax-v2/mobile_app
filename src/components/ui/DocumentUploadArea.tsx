import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { uploadStyles, colors, spacing } from "@/theme";
import { useDocumentUpload, DocumentFile } from "@/hooks";

interface DocumentUploadAreaProps {
  label?: string;
  description?: string;
  allowedTypes?: string[];
  maxSize?: number; // in bytes
  multiple?: boolean;
  onUpload?: (files: DocumentFile[]) => void;
  onError?: (error: string) => void;
  value?: DocumentFile[];
  disabled?: boolean;
  required?: boolean;
}

/**
 * Reusable document upload area component
 * Replaces all the document upload implementations across screens
 */
export const DocumentUploadArea: React.FC<DocumentUploadAreaProps> = ({
  label = "Upload Document",
  description = "PDF or Image (PNG, JPG) • Max 10MB",
  allowedTypes = ["application/pdf", "image/*"],
  maxSize = 10 * 1024 * 1024, // 10MB
  multiple = false,
  onUpload,
  onError,
  value = [],
  disabled = false,
  required = false,
}) => {
  const { pickDocument, pickImage, takePhoto, validateFile, isUploading } =
    useDocumentUpload();

  const handleDocumentPick = async () => {
    if (disabled) return;

    const file = await pickDocument(allowedTypes);
    if (file) {
      const validation = validateFile(file, { maxSize, allowedTypes });
      if (validation.isValid) {
        const newFiles = multiple ? [...value, file] : [file];
        onUpload?.(newFiles);
      } else {
        onError?.(validation.error || "Invalid file");
      }
    }
  };

  const handleImagePick = async () => {
    if (disabled) return;

    const file = await pickImage();
    if (file) {
      const validation = validateFile(file, { maxSize });
      if (validation.isValid) {
        const newFiles = multiple ? [...value, file] : [file];
        onUpload?.(newFiles);
      } else {
        onError?.(validation.error || "Invalid file");
      }
    }
  };

  const handleTakePhoto = async () => {
    if (disabled) return;

    const file = await takePhoto();
    if (file) {
      const validation = validateFile(file, { maxSize });
      if (validation.isValid) {
        const newFiles = multiple ? [...value, file] : [file];
        onUpload?.(newFiles);
      } else {
        onError?.(validation.error || "Invalid file");
      }
    }
  };

  const removeFile = (index: number) => {
    if (disabled) return;

    const newFiles = value.filter((_, i) => i !== index);
    onUpload?.(newFiles);
  };

  const hasFiles = value.length > 0;

  return (
    <View>
      <Text
        style={[
          uploadStyles.instructions,
          {
            fontWeight: "500",
            fontSize: 14,
            color: colors.text,
            marginBottom: spacing.xs,
          },
        ]}
      >
        {label}
        {required && <Text style={{ color: colors.error }}> *</Text>}
      </Text>

      {!hasFiles || multiple ? (
        <View style={[uploadStyles.area, disabled && { opacity: 0.5 }]}>
          <MaterialCommunityIcons
            name="cloud-upload-outline"
            size={32}
            color={colors.textSecondary}
          />

          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <TouchableOpacity
              style={uploadStyles.button}
              onPress={handleDocumentPick}
              disabled={disabled || isUploading}
            >
              <MaterialCommunityIcons
                name="file-upload"
                size={16}
                color="white"
              />
              <Text style={uploadStyles.buttonText}>Choose File</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={uploadStyles.button}
              onPress={handleImagePick}
              disabled={disabled || isUploading}
            >
              <MaterialCommunityIcons name="image" size={16} color="white" />
              <Text style={uploadStyles.buttonText}>Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={uploadStyles.button}
              onPress={handleTakePhoto}
              disabled={disabled || isUploading}
            >
              <MaterialCommunityIcons name="camera" size={16} color="white" />
              <Text style={uploadStyles.buttonText}>Camera</Text>
            </TouchableOpacity>
          </View>

          <Text style={uploadStyles.instructions}>{description}</Text>
        </View>
      ) : null}

      {/* Display uploaded files */}
      {value.map((file, index) => (
        <View key={index} style={uploadStyles.fileItem}>
          <MaterialCommunityIcons
            name="file-check"
            size={20}
            color={colors.primary}
          />
          <Text style={uploadStyles.fileName} numberOfLines={1}>
            {file.name}
          </Text>
          {file.size && (
            <Text style={[uploadStyles.instructions, { fontSize: 10 }]}>
              {(file.size / 1024).toFixed(1)} KB
            </Text>
          )}
          {!disabled && (
            <TouchableOpacity onPress={() => removeFile(index)}>
              <MaterialCommunityIcons
                name="close"
                size={16}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
      ))}
    </View>
  );
};
