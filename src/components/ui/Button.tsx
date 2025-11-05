import { palette } from "@/theme/colors";
import React from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  PressableProps,
  StyleSheet,
  Text,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export type ButtonVariant = "primary" | "secondary" | "outline" | "success" | "gradient";

type ButtonProps = PressableProps & {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
};

export const Button: React.FC<ButtonProps> = ({
  label,
  variant = "primary",
  loading = false,
  icon,
  fullWidth = false,
  style,
  disabled,
  ...rest
}) => {
  const scaleAnim = React.useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const themedStyle = [
    styles.base,
    styles[variant],
    fullWidth && styles.fullWidth,
    disabled && styles.disabled,
  ];
  
  // Extract static styles only for LinearGradient
  const gradientStaticStyle = StyleSheet.flatten([
    themedStyle,
    typeof style !== 'function' ? style : undefined,
  ]);
  
  const labelColor =
    variant === "outline" ? palette.primaryBlue : palette.white;

  const content = (
    <>
      {loading ? (
        <ActivityIndicator color={labelColor} size="small" />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
        </>
      )}
    </>
  );

  if (variant === "gradient") {
    return (
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Pressable
          accessibilityRole="button"
          disabled={disabled || loading}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          {...rest}
        >
          <LinearGradient
            colors={['#4F46E5', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={gradientStaticStyle}
          >
            {content}
          </LinearGradient>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        accessibilityRole="button"
        style={typeof style === 'function' ? (state) => [themedStyle, style(state)] : [themedStyle, style]}
        disabled={disabled || loading}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        {...rest}
      >
        {content}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 14,
    shadowColor: palette.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.3,
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
    shadowOpacity: 0,
    elevation: 0,
  },
  success: {
    backgroundColor: palette.accentGreen,
  },
  gradient: {
    backgroundColor: "transparent",
  },
  disabled: {
    opacity: 0.5,
  },
  fullWidth: {
    width: '100%',
  },
});

