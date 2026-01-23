import { palette } from "@/theme/colors";
import { spacing } from "@/theme/spacing";
import React, { useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";

type InputProps = TextInputProps & {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  position?: "right" | "left"
};

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  icon,
  style,
  position="left",
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const focusAnim = React.useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(focusAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.timing(focusAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [palette.neutralLighter, palette.primaryBlue],
  });

  const hasError = Boolean(error);

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={styles.label} accessibilityRole="text">
          {label}
        </Text>
      ) : null}
      <Animated.View
        style={[
          styles.inputContainer,
          { borderColor: hasError ? palette.errorRed : borderColor },
          isFocused && styles.inputContainerFocused,
        ]}
      >
        {icon && position =="left" && <View style={styles.iconContainer}>{icon}</View>}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={palette.neutralLight}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...rest}
        />
        {icon && position == "right" && <View style={styles.iconContainer}>{icon}</View>}
      </Animated.View>
      {hasError ? <Text style={styles.error}>{error}</Text> : null}
      {!hasError && helperText ? (
        <Text style={styles.helper}>{helperText}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  label: {
    marginBottom: spacing.xs,
    color: palette.neutralDark,
    fontWeight: "600",
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 2,
    backgroundColor: palette.white,
    paddingHorizontal: spacing.md,
    shadowColor: palette.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 1,
  },
  inputContainerFocused: {
    shadowOpacity: 0.12,
    elevation: 3,
  },
  iconContainer: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: palette.neutralDark,
    paddingVertical: spacing.md,
  },
  inputError: {
    borderColor: palette.errorRed,
  },
  helper: {
    marginTop: spacing.xs,
    color: palette.neutralMid,
    fontSize: 12,
  },
  error: {
    marginTop: spacing.xs,
    color: palette.errorRed,
    fontSize: 12,
    fontWeight: '500',
  },
});
