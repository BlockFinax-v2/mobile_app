/**
 * High-performance button wrapper that provides instant feedback
 * Separates UI response from heavy operations for better UX
 */

import React, { useRef, useState, useCallback } from "react";
import {
  Pressable,
  Animated,
  PressableProps,
  ViewStyle,
  View,
  Text,
  ActivityIndicator,
} from "react-native";
import * as Haptics from "expo-haptics";
import { palette } from "@/theme/colors";

interface InstantButtonProps extends Omit<PressableProps, "onPress"> {
  onPress?: () => void | Promise<void>;
  onInstantPress?: () => void; // Immediate UI feedback
  children: React.ReactNode;
  style?: ViewStyle | ((state: { pressed: boolean }) => ViewStyle);
  hapticFeedback?: boolean;
  scaleEffect?: boolean;
  disabled?: boolean;
}

export const InstantButton: React.FC<InstantButtonProps> = ({
  onPress,
  onInstantPress,
  children,
  style,
  hapticFeedback = true,
  scaleEffect = true,
  disabled = false,
  ...rest
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePressIn = useCallback(() => {
    if (disabled || isProcessing) return;

    // Immediate haptic feedback
    if (hapticFeedback) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Immediate visual feedback
    if (scaleEffect) {
      Animated.spring(scaleAnim, {
        toValue: 0.95,
        useNativeDriver: true,
        speed: 100, // Very fast response
        bounciness: 2,
      }).start();
    }

    // Immediate UI callback (navigation, state changes)
    if (onInstantPress) {
      try {
        onInstantPress();
      } catch (error) {
        console.warn("InstantPress callback failed:", error);
      }
    }
  }, [
    disabled,
    isProcessing,
    hapticFeedback,
    scaleEffect,
    onInstantPress,
    scaleAnim,
  ]);

  const handlePressOut = useCallback(() => {
    if (scaleEffect) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 100,
        bounciness: 2,
      }).start();
    }
  }, [scaleEffect, scaleAnim]);

  const handlePress = useCallback(async () => {
    if (disabled || isProcessing || !onPress) return;

    setIsProcessing(true);

    try {
      // Heavy operations run after UI feedback
      const result = onPress();
      if (result instanceof Promise) {
        await result;
      }
    } catch (error) {
      console.error("Button press failed:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [disabled, isProcessing, onPress]);

  const animatedStyle = scaleEffect
    ? { transform: [{ scale: scaleAnim }] }
    : {};

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={handlePress}
        disabled={disabled || isProcessing}
        style={({ pressed }) => [
          typeof style === "function" ? style({ pressed }) : style,
          (disabled || isProcessing) && {
            opacity: 0.5,
          },
        ]}
        {...rest}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
};

// Enhanced Button component with instant feedback
interface EnhancedButtonProps {
  label: string;
  onPress?: () => void | Promise<void>;
  onInstantPress?: () => void; // For immediate navigation/UI changes
  variant?: "primary" | "secondary" | "outline";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  icon?: React.ReactNode;
}

export const PerformantButton: React.FC<EnhancedButtonProps> = ({
  label,
  onPress,
  onInstantPress,
  variant = "primary",
  loading = false,
  disabled = false,
  style,
  icon,
}) => {
  const buttonStyle = {
    ...styles.base,
    ...styles[variant],
    ...(style as ViewStyle),
  };

  const textColor = variant === "outline" ? palette.primaryBlue : palette.white;

  return (
    <InstantButton
      onPress={onPress}
      onInstantPress={onInstantPress}
      style={buttonStyle}
      disabled={disabled || loading}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={textColor} size="small" />
        ) : (
          <>
            {icon && <View style={styles.icon}>{icon}</View>}
            <Text style={[styles.label, { color: textColor }]}>{label}</Text>
          </>
        )}
      </View>
    </InstantButton>
  );
};

const styles = {
  base: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  primary: {
    backgroundColor: palette.primaryBlue,
  },
  secondary: {
    backgroundColor: palette.primaryBlueLight,
  },
  outline: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: palette.primaryBlue,
  },
  content: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  icon: {
    marginRight: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: "600" as const,
    letterSpacing: 0.3,
  },
};
