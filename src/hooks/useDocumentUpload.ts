import { useState, useCallback } from 'react';
import { Alert, Platform, ToastAndroid } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

export interface DocumentFile {
  name: string;
  uri: string;
  size?: number;
  mimeType?: string;
}

/**
 * Document upload hook with common functionality
 * Handles document picking, image picking, and validation
 */
export function useDocumentUpload() {
  const [isUploading, setIsUploading] = useState(false);

  const showToast = useCallback((message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert('Notification', message);
    }
  }, []);

  const pickDocument = useCallback(async (
    allowedTypes: string[] = ['application/pdf', 'image/*']
  ): Promise<DocumentFile | null> => {
    try {
      setIsUploading(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: allowedTypes,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        return {
          name: asset.name || 'Document',
          uri: asset.uri,
          size: asset.size,
          mimeType: asset.mimeType,
        };
      }
      return null;
    } catch (error) {
      console.error('Document picker error:', error);
      showToast('Error selecting document');
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [showToast]);

  const pickImage = useCallback(async (
    options: {
      allowsEditing?: boolean;
      quality?: number;
    } = {}
  ): Promise<DocumentFile | null> => {
    try {
      setIsUploading(true);
      
      // Request permissions
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission Required',
          'Please grant camera roll permissions to upload images.'
        );
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: options.allowsEditing ?? true,
        quality: options.quality ?? 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        return {
          name: `image_${Date.now()}.jpg`,
          uri: asset.uri,
          size: asset.fileSize || 0,
          mimeType: 'image/jpeg',
        };
      }
      return null;
    } catch (error) {
      console.error('Image picker error:', error);
      showToast('Error selecting image');
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [showToast]);

  const takePhoto = useCallback(async (
    options: {
      allowsEditing?: boolean;
      quality?: number;
    } = {}
  ): Promise<DocumentFile | null> => {
    try {
      setIsUploading(true);
      
      // Request camera permissions
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission Required',
          'Please grant camera permissions to take photos.'
        );
        return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: options.allowsEditing ?? true,
        quality: options.quality ?? 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        return {
          name: `photo_${Date.now()}.jpg`,
          uri: asset.uri,
          size: asset.fileSize || 0,
          mimeType: 'image/jpeg',
        };
      }
      return null;
    } catch (error) {
      console.error('Camera error:', error);
      showToast('Error taking photo');
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [showToast]);

  const validateFile = useCallback((
    file: DocumentFile,
    constraints: {
      maxSize?: number; // in bytes
      allowedTypes?: string[];
    } = {}
  ): { isValid: boolean; error?: string } => {
    const { maxSize = 10 * 1024 * 1024, allowedTypes } = constraints; // Default 10MB

    if (file.size && file.size > maxSize) {
      return {
        isValid: false,
        error: `File size must be less than ${Math.round(maxSize / (1024 * 1024))}MB`,
      };
    }

    if (allowedTypes && file.mimeType && !allowedTypes.includes(file.mimeType)) {
      return {
        isValid: false,
        error: 'File type not allowed',
      };
    }

    return { isValid: true };
  }, []);

  return {
    isUploading,
    pickDocument,
    pickImage,
    takePhoto,
    validateFile,
    showToast,
  };
}