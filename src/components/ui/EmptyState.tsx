import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { listStyles, textStyles, colors } from "@/theme";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  iconSize?: number;
  variant?: "default" | "search" | "error";
}

/**
 * Reusable empty state component
 * Replaces all the empty state implementations across screens
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = "inbox-outline",
  title,
  description,
  actionLabel,
  onAction,
  iconSize = 48,
  variant = "default",
}) => {
  const getIconColor = () => {
    switch (variant) {
      case "error":
        return colors.error;
      case "search":
        return colors.textSecondary;
      default:
        return colors.textSecondary + "40";
    }
  };

  return (
    <View style={listStyles.emptyState}>
      <MaterialCommunityIcons
        name={icon as any}
        size={iconSize}
        color={getIconColor()}
      />
      <Text style={listStyles.emptyStateText}>{title}</Text>
      {description && (
        <Text style={listStyles.emptyStateSubtext}>{description}</Text>
      )}
      {actionLabel && onAction && (
        <TouchableOpacity
          onPress={onAction}
          style={{
            backgroundColor: colors.primary,
            paddingHorizontal: 20,
            paddingVertical: 12,
            borderRadius: 8,
            marginTop: 16,
          }}
        >
          <Text style={[textStyles.white, { fontWeight: "600" }]}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};
