import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleProp,
  TextStyle,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { formStyles, colors, spacing } from "@/theme";

interface FormFieldProps {
  label?: string;
  value?: string;
  onChangeText?: (text: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad" | "url";
  secureTextEntry?: boolean;
  maxLength?: number;
  editable?: boolean;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  variant?: "default" | "outline" | "filled";
}

/**
 * Reusable form field component
 * Replaces all the form field implementations across screens
 */
export const FormField: React.FC<FormFieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  required = false,
  error,
  helperText,
  multiline = false,
  numberOfLines = 1,
  keyboardType = "default",
  secureTextEntry = false,
  maxLength,
  editable = true,
  leftIcon,
  rightIcon,
  onRightIconPress,
}) => {
  const hasError = !!error;

  const getInputStyle = (): StyleProp<TextStyle> => {
    const baseStyle: Array<StyleProp<TextStyle>> = [formStyles.input];

    if (multiline) {
      baseStyle.push(formStyles.textArea);
    }

    if (hasError) {
      baseStyle.push({ borderColor: colors.error });
    }

    if (!editable) {
      baseStyle.push({
        backgroundColor: colors.background,
        color: colors.textSecondary,
      });
    }

    if (leftIcon) {
      baseStyle.push({ paddingLeft: spacing.xl + spacing.sm });
    }

    if (rightIcon) {
      baseStyle.push({ paddingRight: spacing.xl + spacing.sm });
    }

    return baseStyle;
  };

  return (
    <View style={formStyles.field}>
      {label && (
        <Text style={formStyles.label}>
          {label}
          {required && <Text style={{ color: colors.error }}> *</Text>}
        </Text>
      )}

      <View style={{ position: "relative" }}>
        {leftIcon && (
          <View
            style={{
              position: "absolute",
              left: spacing.md,
              top: 0,
              bottom: 0,
              justifyContent: "center",
              zIndex: 1,
            }}
          >
            <MaterialCommunityIcons
              name={leftIcon as any}
              size={20}
              color={colors.textSecondary}
            />
          </View>
        )}

        <TextInput
          style={getInputStyle()}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          multiline={multiline}
          numberOfLines={numberOfLines}
          keyboardType={keyboardType}
          secureTextEntry={secureTextEntry}
          maxLength={maxLength}
          editable={editable}
        />

        {rightIcon && (
          <TouchableOpacity
            style={{
              position: "absolute",
              right: spacing.md,
              top: 0,
              bottom: 0,
              justifyContent: "center",
              zIndex: 1,
            }}
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
          >
            <MaterialCommunityIcons
              name={rightIcon as any}
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>

      {error && <Text style={formStyles.errorText}>{error}</Text>}

      {helperText && !error && (
        <Text style={formStyles.helperText}>{helperText}</Text>
      )}
    </View>
  );
};

interface FormRowProps {
  children: React.ReactNode;
  gap?: number;
}

/**
 * Form row component for side-by-side fields
 */
export const FormRow: React.FC<FormRowProps> = ({
  children,
  gap = spacing.md,
}) => {
  return <View style={[formStyles.row, { gap }]}>{children}</View>;
};

interface FormSectionProps {
  title?: string;
  children: React.ReactNode;
}

/**
 * Form section component with optional title
 */
export const FormSection: React.FC<FormSectionProps> = ({
  title,
  children,
}) => {
  return (
    <View style={formStyles.section}>
      {title && (
        <Text
          style={[
            formStyles.label,
            { fontSize: 18, fontWeight: "600", marginBottom: spacing.md },
          ]}
        >
          {title}
        </Text>
      )}
      {children}
    </View>
  );
};
