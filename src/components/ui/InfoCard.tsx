import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { cardStyles, layoutStyles, textStyles, colors, spacing } from "@/theme";

interface InfoCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  variant?: "default" | "primary" | "success" | "warning" | "error";
  size?: "small" | "medium" | "large";
  onPress?: () => void;
  loading?: boolean;
}

/**
 * Reusable info/stat card component
 * Replaces all the stat cards and info displays across screens
 */
export const InfoCard: React.FC<InfoCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  variant = "default",
  size = "medium",
  onPress,
  loading = false,
}) => {
  const getCardStyle = () => {
    switch (variant) {
      case "primary":
        return cardStyles.primaryHeader;
      case "success":
        return cardStyles.success;
      case "warning":
        return cardStyles.warning;
      case "error":
        return cardStyles.error;
      default:
        return cardStyles.base;
    }
  };

  const getTextColor = () => {
    return variant === "primary" ? "white" : colors.text;
  };

  const getSubtextColor = () => {
    return variant === "primary"
      ? "rgba(255,255,255,0.8)"
      : colors.textSecondary;
  };

  const getValueSize = () => {
    switch (size) {
      case "small":
        return 16;
      case "large":
        return 28;
      default:
        return 20;
    }
  };

  const CardComponent = onPress ? TouchableOpacity : View;

  return (
    <CardComponent
      style={[
        getCardStyle(),
        size === "small" && { padding: spacing.md },
        size === "large" && { padding: spacing.xl },
      ]}
      onPress={onPress}
      disabled={loading}
    >
      <View style={layoutStyles.rowBetween}>
        <View style={{ flex: 1 }}>
          <Text
            style={[
              textStyles.detailLabel,
              {
                color: getSubtextColor(),
                fontSize: size === "small" ? 10 : 12,
                marginBottom: spacing.xs,
              },
            ]}
          >
            {title}
          </Text>

          {loading ? (
            <Text style={[textStyles.cardTitle, { color: getTextColor() }]}>
              Loading...
            </Text>
          ) : (
            <Text
              style={[
                textStyles.cardTitle,
                {
                  color: getTextColor(),
                  fontSize: getValueSize(),
                  fontWeight: "700",
                  marginBottom: subtitle ? spacing.xs : 0,
                },
              ]}
            >
              {value}
            </Text>
          )}

          {subtitle && (
            <Text
              style={[
                textStyles.detailValue,
                {
                  color: getSubtextColor(),
                  fontSize: size === "small" ? 10 : 11,
                },
              ]}
            >
              {subtitle}
            </Text>
          )}
        </View>

        {icon && (
          <MaterialCommunityIcons
            name={icon as any}
            size={size === "small" ? 20 : size === "large" ? 32 : 24}
            color={getSubtextColor()}
          />
        )}
      </View>
    </CardComponent>
  );
};
